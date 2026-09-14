import { v4 as uuidv4 } from "uuid";
import { getDb, findTableByToken, findTableByTokenAsync, emitEvent } from "../db";
import { AppError } from "../types";
import { isSupabaseEnabled, getSupabaseService, getSupabaseAnon } from "../supabase/server";

async function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  return getSupabaseService() || getSupabaseAnon();
}

export const WaiterService = {
  async createRequest(token: string) {
    const supabase = await getSupabase();
    if (supabase) {
      try {
        // Find table by token via Supabase
        const { data: qr } = await supabase.from('qr_tokens').select('*').eq('token', token).eq('is_active', true).single();
        if (!qr) throw new AppError("INVALID_TOKEN","Invalid QR token",400);
        const { data: table } = await supabase.from('tables').select('*').eq('id', qr.table_id).single();
        if (!table) throw new AppError("INVALID_TOKEN","Table not found",404);
        if (!table.current_session_id) {
          // Try to get active session
          const { data: activeSession } = await supabase.from('table_sessions').select('*').eq('table_id', table.id).eq('status', 'ACTIVE').single();
          if (!activeSession) throw new AppError("NO_SESSION","No active session for table",422);
          table.current_session_id = activeSession.id;
        }
        const sessionId = table.current_session_id;

        // Check duplicate OPEN
        const { data: existingOpen } = await supabase.from('waiter_requests').select('*').eq('table_session_id', sessionId).eq('status', 'OPEN').single();
        if (existingOpen) throw new AppError("DUPLICATE_REQUEST","Waiter request already open for this table",409);

        const req = {
          id: uuidv4(),
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          table_id: table.id,
          table_session_id: sessionId,
          status: 'OPEN',
          requested_at: new Date().toISOString(),
        };
        const { data: created, error } = await supabase.from('waiter_requests').insert(req).select().single();
        if (error) throw new AppError("CREATE_ERROR", error.message, 500);

        // Sync to in-memory
        try {
          const db = getDb();
          db.waiter_requests.push(created as any);
        } catch {}

        emitEvent("waiter_request.created", {
          entity_id: created.id,
          table_id: table.id,
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          entity_type: "waiter_request",
          recipient_role: "ALL",
        });
        return created;
      } catch (e: any) {
        if (e instanceof AppError) throw e;
        console.error("Supabase waiter error, falling back:", e);
      }
    }

    // In-memory fallback
    const db = getDb();
    const resolved = await findTableByTokenAsync(token);
    if (!resolved) throw new AppError("INVALID_TOKEN","Invalid QR token",400);
    const { table } = resolved;
    if (!table.current_session_id) {
      const active = db.table_sessions.find(s=>s.table_id===table.id && s.status==="ACTIVE");
      if (!active) throw new AppError("NO_SESSION","No active session for table",422);
      table.current_session_id = active.id;
    }
    const sessionId = table.current_session_id;
    const existingOpen = db.waiter_requests.find(w => w.table_session_id === sessionId && w.status === "OPEN");
    if (existingOpen) throw new AppError("DUPLICATE_REQUEST","Waiter request already open for this table",409);

    const now = new Date().toISOString();
    const req = {
      id: uuidv4(),
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      table_id: table.id,
      table_session_id: sessionId,
      status: "OPEN" as const,
      requested_at: now,
      acknowledged_at: null,
      resolved_at: null,
    };
    db.waiter_requests.push(req as any);
    emitEvent("waiter_request.created", {
      entity_id: req.id,
      table_id: table.id,
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      entity_type: "waiter_request",
      recipient_role: "ALL",
    });
    return req;
  },

  getAll() {
    const db = getDb();
    return db.waiter_requests.sort((a,b)=> new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  },

  async getAllAsync() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data } = await supabase.from('waiter_requests').select('*').order('requested_at', { ascending: false }).limit(50);
      if (data) {
        // Enrich with table
        const enriched = await Promise.all(data.map(async (r:any)=>{
          const { data: table } = await supabase.from('tables').select('*').eq('id', r.table_id).single();
          return { ...r, table };
        }));
        return enriched;
      }
    }
    return this.getAll().map(r=>{
      const db = getDb();
      const table = db.tables.find(t=>t.id===r.table_id);
      return { ...r, table };
    });
  },

  getOpen() {
    const db = getDb();
    return db.waiter_requests.filter(w=>w.status==="OPEN");
  },

  async acknowledge(id: string) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('waiter_requests').update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw new AppError("UPDATE_ERROR", error.message, 500);
      try { const db=getDb(); const r=db.waiter_requests.find(w=>w.id===id); if(r){ r.status="ACKNOWLEDGED" as any; r.acknowledged_at=new Date().toISOString(); } } catch {}
      emitEvent("waiter_request.acknowledged", { entity_id: id, table_id: data.table_id });
      return data;
    }
    const db = getDb();
    const req = db.waiter_requests.find(w=>w.id===id);
    if (!req) throw new AppError("NOT_FOUND","Request not found",404);
    if (req.status !== "OPEN") throw new AppError("INVALID_STATE","Request not open",422);
    req.status = "ACKNOWLEDGED";
    req.acknowledged_at = new Date().toISOString();
    emitEvent("waiter_request.acknowledged", { entity_id: req.id, table_id: req.table_id });
    return req;
  },

  async resolve(id: string) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('waiter_requests').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw new AppError("UPDATE_ERROR", error.message, 500);
      try { const db=getDb(); const r=db.waiter_requests.find(w=>w.id===id); if(r){ r.status="RESOLVED" as any; r.resolved_at=new Date().toISOString(); } } catch {}
      emitEvent("waiter_request.resolved", { entity_id: id, table_id: data.table_id });
      return data;
    }
    const db = getDb();
    const req = db.waiter_requests.find(w=>w.id===id);
    if (!req) throw new AppError("NOT_FOUND","Request not found",404);
    req.status = "RESOLVED";
    req.resolved_at = new Date().toISOString();
    emitEvent("waiter_request.resolved", { entity_id: req.id, table_id: req.table_id });
    return req;
  },

  getForSession(sessionId: string) {
    const db = getDb();
    return db.waiter_requests.filter(w=>w.table_session_id===sessionId);
  }
};
