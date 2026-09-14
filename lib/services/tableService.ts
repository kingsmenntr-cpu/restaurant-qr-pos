import { v4 as uuidv4 } from "uuid";
import { getDb, emitEvent } from "../db";
import { generateSecureToken, hashToken } from "../utils";
import { AppError } from "../types";
import { isSupabaseEnabled, getSupabaseService, getSupabaseAnon } from "../supabase/server";

async function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  return getSupabaseService() || getSupabaseAnon();
}

export const TableService = {
  getAll() {
    const db = getDb();
    return db.tables.filter(t => t.is_active);
  },
  async getAllAsync() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: tables } = await supabase.from('tables').select('*').eq('is_active', true).order('name');
      return tables || [];
    }
    return this.getAll();
  },
  getById(id: string) {
    const db = getDb();
    return db.tables.find(t => t.id === id) || null;
  },
  async create(data: { name: string; capacity: number; section?: string; is_active?: boolean }) {
    const supabase = await getSupabase();
    if (supabase) {
      try {
        // Get restaurant and branch from Supabase
        const { data: restaurant } = await supabase.from('restaurants').select('id').limit(1).single();
        const { data: branch } = await supabase.from('branches').select('id').limit(1).single();
        const restaurantId = restaurant?.id || '11111111-1111-1111-1111-111111111111';
        const branchId = branch?.id || '22222222-2222-2222-2222-222222222222';

        const table = {
          id: uuidv4(),
          restaurant_id: restaurantId,
          branch_id: branchId,
          name: data.name,
          capacity: data.capacity,
          section: data.section || 'Indoor',
          status: 'AVAILABLE',
          is_active: data.is_active ?? true,
          current_session_id: null,
        };
        const { data: createdTable, error } = await supabase.from('tables').insert(table).select().single();
        if (error) throw new AppError("CREATE_ERROR", error.message, 500);

        const token = generateSecureToken();
        const qr = {
          id: uuidv4(),
          table_id: createdTable.id,
          token,
          token_hash: hashToken(token),
          version: 1,
          is_active: true,
        };
        const { data: createdQr, error: qrError } = await supabase.from('qr_tokens').insert(qr).select().single();
        if (qrError) throw new AppError("QR_ERROR", qrError.message, 500);

        // Sync to in-memory
        try {
          const db = getDb();
          db.tables.push(createdTable as any);
          db.qr_tokens.push(createdQr as any);
        } catch {}

        emitEvent("table.status_changed", { table_id: createdTable.id, status: createdTable.status, restaurant_id: restaurantId, branch_id: branchId });
        return { table: createdTable, qr: createdQr };
      } catch (e: any) {
        if (e instanceof AppError) throw e;
        console.error("Supabase create table error, falling back:", e);
      }
    }

    // In-memory fallback
    const db = getDb();
    const now = new Date().toISOString();
    const restaurant = db.restaurants[0];
    const branch = db.branches[0];
    const table = {
      id: uuidv4(),
      restaurant_id: restaurant.id,
      branch_id: branch.id,
      name: data.name,
      capacity: data.capacity,
      section: data.section,
      status: "AVAILABLE" as const,
      is_active: data.is_active ?? true,
      current_session_id: null,
      created_at: now,
    };
    db.tables.push(table);
    const token = generateSecureToken();
    const qr = {
      id: uuidv4(),
      table_id: table.id,
      token,
      token_hash: hashToken(token),
      version: 1,
      is_active: true,
      created_at: now,
      revoked_at: null,
    };
    db.qr_tokens.push(qr);
    emitEvent("table.status_changed", { table_id: table.id, status: table.status, restaurant_id: restaurant.id, branch_id: branch.id });
    return { table, qr };
  },
  update(id: string, data: Partial<{ name: string; capacity: number; section: string; is_active: boolean; status: any }>) {
    const db = getDb();
    const table = db.tables.find(t => t.id === id);
    if (!table) throw new AppError("NOT_FOUND", "Table not found", 404);
    Object.assign(table, data);
    emitEvent("table.status_changed", { table_id: table.id, status: table.status });
    return table;
  },
  async regenerateQr(tableId: string) {
    const supabase = await getSupabase();
    if (supabase) {
      try {
        await supabase.from('qr_tokens').update({ is_active: false, revoked_at: new Date().toISOString() }).eq('table_id', tableId).eq('is_active', true);
        const token = generateSecureToken();
        const { data: existing } = await supabase.from('qr_tokens').select('version').eq('table_id', tableId).order('version', { ascending: false }).limit(1).single();
        const prevVersion = existing?.version || 0;
        const qr = {
          id: uuidv4(),
          table_id: tableId,
          token,
          token_hash: hashToken(token),
          version: prevVersion + 1,
          is_active: true,
        };
        const { data: createdQr, error } = await supabase.from('qr_tokens').insert(qr).select().single();
        if (error) throw new AppError("QR_ERROR", error.message, 500);
        // Sync to in-memory
        try {
          const db = getDb();
          db.qr_tokens.forEach(q => { if (q.table_id === tableId && q.is_active) { q.is_active = false; q.revoked_at = new Date().toISOString(); } });
          db.qr_tokens.push(createdQr as any);
        } catch {}
        return createdQr;
      } catch (e: any) {
        if (e instanceof AppError) throw e;
        console.error("Supabase regen QR error:", e);
      }
    }

    const db = getDb();
    const table = db.tables.find(t => t.id === tableId);
    if (!table) throw new AppError("NOT_FOUND", "Table not found", 404);
    db.qr_tokens.forEach(q => {
      if (q.table_id === tableId && q.is_active) {
        q.is_active = false;
        q.revoked_at = new Date().toISOString();
      }
    });
    const token = generateSecureToken();
    const now = new Date().toISOString();
    const prevVersion = Math.max(0, ...db.qr_tokens.filter(q => q.table_id === tableId).map(q => q.version));
    const qr = {
      id: uuidv4(),
      table_id: tableId,
      token,
      token_hash: hashToken(token),
      version: prevVersion + 1,
      is_active: true,
      created_at: now,
      revoked_at: null,
    };
    db.qr_tokens.push(qr);
    return qr;
  },
  getQr(tableId: string) {
    const db = getDb();
    return db.qr_tokens.find(q => q.table_id === tableId && q.is_active) || null;
  },
  getAllWithQr() {
    const db = getDb();
    return db.tables.map(t => {
      const qr = db.qr_tokens.find(q => q.table_id === t.id && q.is_active);
      const session = t.current_session_id ? db.table_sessions.find(s => s.id === t.current_session_id) : null;
      return { table: t, qr, session };
    });
  },
  async getAllWithQrAsync() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: tables } = await supabase.from('tables').select('*').order('name');
      if (!tables) return [];
      const result = [];
      for (const t of tables) {
        const { data: qr } = await supabase.from('qr_tokens').select('*').eq('table_id', t.id).eq('is_active', true).single();
        result.push({ table: t, qr: qr || null, session: null });
      }
      return result;
    }
    return this.getAllWithQr();
  },
  setStatus(tableId: string, status: "AVAILABLE" | "OCCUPIED" | "BILL_PENDING") {
    const db = getDb();
    const table = db.tables.find(t => t.id === tableId);
    if (!table) throw new AppError("NOT_FOUND", "Table not found", 404);
    table.status = status as any;
    emitEvent("table.status_changed", { table_id: tableId, status });
    return table;
  },
};
