import { v4 as uuidv4 } from "uuid";
import { getDb, emitEvent } from "../db";
import { generateSecureToken, hashToken } from "../utils";
import { AppError } from "../types";

export const TableService = {
  getAll() {
    const db = getDb();
    return db.tables.filter(t => t.is_active);
  },
  getById(id: string) {
    const db = getDb();
    return db.tables.find(t => t.id === id) || null;
  },
  create(data: { name: string; capacity: number; section?: string; is_active?: boolean }) {
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
    // create QR
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
  regenerateQr(tableId: string) {
    const db = getDb();
    const table = db.tables.find(t => t.id === tableId);
    if (!table) throw new AppError("NOT_FOUND", "Table not found", 404);
    // revoke old
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
  setStatus(tableId: string, status: "AVAILABLE" | "OCCUPIED" | "BILL_PENDING") {
    const db = getDb();
    const table = db.tables.find(t => t.id === tableId);
    if (!table) throw new AppError("NOT_FOUND", "Table not found", 404);
    table.status = status as any;
    emitEvent("table.status_changed", { table_id: tableId, status });
    return table;
  },
};
