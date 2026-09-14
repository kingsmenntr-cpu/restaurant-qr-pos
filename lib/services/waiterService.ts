import { v4 as uuidv4 } from "uuid";
import { getDb, findTableByToken, emitEvent } from "../db";
import { AppError } from "../types";

export const WaiterService = {
  createRequest(token: string) {
    const db = getDb();
    const resolved = findTableByToken(token);
    if (!resolved) throw new AppError("INVALID_TOKEN","Invalid QR token",400);
    const { table } = resolved;
    if (!table.current_session_id) throw new AppError("NO_SESSION","No active session for table",422);
    const sessionId = table.current_session_id;
    // BR-012: only one OPEN request per active session
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

  getOpen() {
    const db = getDb();
    return db.waiter_requests.filter(w=>w.status==="OPEN");
  },

  acknowledge(id: string) {
    const db = getDb();
    const req = db.waiter_requests.find(w=>w.id===id);
    if (!req) throw new AppError("NOT_FOUND","Request not found",404);
    if (req.status !== "OPEN") throw new AppError("INVALID_STATE","Request not open",422);
    req.status = "ACKNOWLEDGED";
    req.acknowledged_at = new Date().toISOString();
    emitEvent("waiter_request.acknowledged", { entity_id: req.id, table_id: req.table_id });
    return req;
  },

  resolve(id: string) {
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
