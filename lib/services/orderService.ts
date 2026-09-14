import { v4 as uuidv4 } from "uuid";
import { getDb, findTableByToken, findTableByTokenAsync, getActiveSessionForTable, emitEvent } from "../db";
import { AppError } from "../types";
import { generateOrderNumber, safeAdd, safeMul } from "../utils";
import { isSupabaseEnabled, getSupabaseService, getSupabaseAnon } from "../supabase/server";

async function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  return getSupabaseService() || getSupabaseAnon();
}

export const OrderService = {
  async createOrder(input: {
    token: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
    notes?: string;
    client_request_id: string;
  }) {
    // Try Supabase path first for Vercel persistence
    const supabase = await getSupabase();
    if (supabase) {
      try {
        // Find table by token via Supabase
        const { data: qr } = await supabase.from('qr_tokens').select('*').eq('token', input.token).eq('is_active', true).single();
        if (!qr) throw new AppError("INVALID_TOKEN", "Invalid or expired QR token", 400);
        const { data: table } = await supabase.from('tables').select('*').eq('id', qr.table_id).single();
        if (!table) throw new AppError("INVALID_TOKEN", "Table not found", 404);
        if (!table.is_active) throw new AppError("TABLE_DISABLED", "Table is disabled", 422);
        if (table.status === "BILL_PENDING") throw new AppError("BILL_PENDING", "Billing in progress", 409);

        // Idempotency
        const { data: existing } = await supabase.from('orders').select('*').eq('client_request_id', input.client_request_id).eq('table_id', table.id).single();
        if (existing) return { order: existing, session: null, table };

        // Get menu items for price calc
        const menuItemIds = input.items.map(i => i.menu_item_id);
        const { data: menuItems } = await supabase.from('menu_items').select('*').in('id', menuItemIds);
        if (!menuItems || menuItems.length !== menuItemIds.length) throw new AppError("ITEM_NOT_FOUND", "Some menu items not found", 404);

        let subtotal = 0;
        const orderItemsData: any[] = [];
        for (const it of input.items) {
          const menuItem = menuItems.find((m: any) => m.id === it.menu_item_id);
          if (!menuItem) throw new AppError("ITEM_NOT_FOUND", `Menu item ${it.menu_item_id} not found`, 404);
          if (!menuItem.available) throw new AppError("ITEM_UNAVAILABLE", `${menuItem.name} is unavailable`, 422);
          const lineTotal = safeMul(menuItem.price, it.quantity);
          subtotal = safeAdd(subtotal, lineTotal);
          orderItemsData.push({
            menu_item_id: menuItem.id,
            item_name_snapshot: menuItem.name,
            unit_price_snapshot: menuItem.price,
            quantity: it.quantity,
            line_total: lineTotal,
            notes: it.notes,
          });
        }

        const { data: taxSettings } = await supabase.from('tax_settings').select('*').eq('restaurant_id', table.restaurant_id).single();
        let taxAmount = 0;
        if (taxSettings?.enabled) {
          const totalRate = (taxSettings.cgst_rate + taxSettings.sgst_rate + taxSettings.igst_rate) / 100;
          taxAmount = parseFloat((subtotal * totalRate).toFixed(2));
        }
        const totalAmount = safeAdd(subtotal, taxAmount);

        // Handle session
        let session;
        const { data: activeSession } = await supabase.from('table_sessions').select('*').eq('table_id', table.id).eq('status', 'ACTIVE').single();
        if (!activeSession) {
          const newSession = {
            id: uuidv4(),
            restaurant_id: table.restaurant_id,
            branch_id: table.branch_id,
            table_id: table.id,
            status: 'ACTIVE',
            opened_at: new Date().toISOString(),
          };
          const { data: created, error } = await supabase.from('table_sessions').insert(newSession).select().single();
          if (error) throw new AppError("SESSION_ERROR", error.message, 500);
          session = created;
          await supabase.from('tables').update({ status: 'OCCUPIED', current_session_id: session.id, updated_at: new Date().toISOString() }).eq('id', table.id);
        } else {
          session = activeSession;
        }

        // Create order
        const order = {
          id: uuidv4(),
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          table_id: table.id,
          table_session_id: session.id,
          order_number: generateOrderNumber(),
          status: 'NEW',
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: input.notes,
          client_request_id: input.client_request_id,
          created_at: new Date().toISOString(),
        };
        const { data: createdOrder, error: orderError } = await supabase.from('orders').insert(order).select().single();
        if (orderError) {
          if (orderError.message.includes('duplicate') || orderError.code === '23505') {
            const { data: dup } = await supabase.from('orders').select('*').eq('client_request_id', input.client_request_id).single();
            if (dup) return { order: dup, session, table };
          }
          throw new AppError("ORDER_ERROR", orderError.message, 500);
        }

        // Order items
        const itemsToInsert = orderItemsData.map(oi => ({
          id: uuidv4(),
          order_id: createdOrder.id,
          menu_item_id: oi.menu_item_id,
          item_name_snapshot: oi.item_name_snapshot,
          unit_price_snapshot: oi.unit_price_snapshot,
          quantity: oi.quantity,
          line_total: oi.line_total,
          notes: oi.notes,
        }));
        await supabase.from('order_items').insert(itemsToInsert);

        emitEvent("order.created", {
          entity_id: createdOrder.id,
          table_id: table.id,
          restaurant_id: table.restaurant_id,
          branch_id: table.branch_id,
          entity_type: "order",
          recipient_role: "ALL",
        });

        // Also update in-memory for local dev
        try {
          const db = getDb();
          db.orders.push(createdOrder as any);
          db.order_items.push(...itemsToInsert as any);
          if (!db.table_sessions.find(s => s.id === session.id)) db.table_sessions.push(session as any);
        } catch {}

        return { order: createdOrder, session, table };
      } catch (e: any) {
        if (e instanceof AppError) throw e;
        console.error("Supabase order error, falling back to in-memory:", e);
        // Fall through to in-memory
      }
    }

    // In-memory fallback (for local dev without Supabase)
    const db = getDb();
    const resolved = await findTableByTokenAsync(input.token);
    if (!resolved) throw new AppError("INVALID_TOKEN", "Invalid or expired QR token", 400);
    const { table } = resolved;
    if (!table.is_active) throw new AppError("TABLE_DISABLED", "Table is disabled", 422);
    if (table.status === "BILL_PENDING") throw new AppError("BILL_PENDING", "Billing in progress, cannot accept new orders", 409);

    const existing = db.orders.find(o => o.client_request_id === input.client_request_id && o.table_id === table.id);
    if (existing) return existing as any;

    let subtotal = 0;
    const orderItemsData: any[] = [];
    for (const it of input.items) {
      const menuItem = db.menu_items.find(m => m.id === it.menu_item_id);
      if (!menuItem) throw new AppError("ITEM_NOT_FOUND", `Menu item ${it.menu_item_id} not found`, 404);
      if (!menuItem.available) throw new AppError("ITEM_UNAVAILABLE", `${menuItem.name} is unavailable`, 422);
      if (it.quantity <= 0) throw new AppError("INVALID_QTY", "Quantity must be >0", 400);
      const lineTotal = safeMul(menuItem.price, it.quantity);
      subtotal = safeAdd(subtotal, lineTotal);
      orderItemsData.push({
        menu_item_id: menuItem.id,
        item_name_snapshot: menuItem.name,
        unit_price_snapshot: menuItem.price,
        quantity: it.quantity,
        line_total: lineTotal,
        notes: it.notes,
      });
    }

    const taxSettings = db.tax_settings[0];
    let taxAmount = 0;
    if (taxSettings.enabled) {
      const totalRate = (taxSettings.cgst_rate + taxSettings.sgst_rate + taxSettings.igst_rate) / 100;
      taxAmount = parseFloat((subtotal * totalRate).toFixed(2));
    }
    const totalAmount = safeAdd(subtotal, taxAmount);

    let session = getActiveSessionForTable(table.id);
    const now = new Date().toISOString();
    if (!session) {
      session = {
        id: uuidv4(),
        restaurant_id: table.restaurant_id,
        branch_id: table.branch_id,
        table_id: table.id,
        status: "ACTIVE",
        opened_at: now,
        closed_at: null,
      };
      db.table_sessions.push(session);
      table.current_session_id = session.id;
      table.status = "OCCUPIED";
    } else if (session.status !== "ACTIVE") {
      throw new AppError("SESSION_NOT_ACTIVE", "Table session not active", 409);
    }

    const order = {
      id: uuidv4(),
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      table_id: table.id,
      table_session_id: session.id,
      order_number: generateOrderNumber(),
      status: "NEW" as const,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: input.notes,
      client_request_id: input.client_request_id,
      created_at: now,
    };
    db.orders.push(order as any);

    for (const oi of orderItemsData) {
      db.order_items.push({
        id: uuidv4(),
        order_id: order.id,
        menu_item_id: oi.menu_item_id,
        item_name_snapshot: oi.item_name_snapshot,
        unit_price_snapshot: oi.unit_price_snapshot,
        quantity: oi.quantity,
        line_total: oi.line_total,
        notes: oi.notes,
        created_at: now,
      } as any);
    }

    emitEvent("order.created", {
      entity_id: order.id,
      table_id: table.id,
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      entity_type: "order",
      recipient_role: "ALL",
    });

    return { order, session, table };
  },

  getById(orderId: string) {
    const db = getDb();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return null;
    const items = db.order_items.filter(oi => oi.order_id === orderId);
    return { order, items };
  },

  async getByIdAsync(orderId: string) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (!order) return null;
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      return { order, items: items || [] };
    }
    return this.getById(orderId);
  },

  getBySession(sessionId: string) {
    const db = getDb();
    const orders = db.orders.filter(o => o.table_session_id === sessionId).sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return orders.map(o => ({
      order: o,
      items: db.order_items.filter(oi => oi.order_id === o.id),
    }));
  },

  async getBySessionAsync(sessionId: string) {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: orders } = await supabase.from('orders').select('*').eq('table_session_id', sessionId).order('created_at', { ascending: true });
      if (!orders) return [];
      const result = [];
      for (const o of orders) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
        result.push({ order: o, items: items || [] });
      }
      return result;
    }
    return this.getBySession(sessionId);
  },

  getAllForBranch(branchId?: string) {
    const db = getDb();
    const bid = branchId || db.branches[0].id;
    return db.orders.filter(o => o.branch_id === bid).sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAllForBranchAsync() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      if (!orders) return [];
      const result = [];
      for (const o of orders) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
        const { data: table } = await supabase.from('tables').select('*').eq('id', o.table_id).single();
        result.push({ order: o, items: items || [], table });
      }
      return result;
    }
    const db = getDb();
    return db.orders.slice().sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(o=>{
      const items = db.order_items.filter(oi=>oi.order_id===o.id);
      const table = db.tables.find(t=>t.id===o.table_id);
      return { order: o, items, table };
    });
  },

  async updateStatus(orderId: string, newStatus: "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED") {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (error || !order) throw new AppError("NOT_FOUND", "Order not found", 404);
      const validTransitions: Record<string, string[]> = {
        NEW: ["CONFIRMED", "PREPARING"],
        CONFIRMED: ["PREPARING"],
        PREPARING: ["READY"],
        READY: ["SERVED"],
        SERVED: [],
      };
      if (order.status !== newStatus && !validTransitions[order.status]?.includes(newStatus)) {
        throw new AppError("INVALID_TRANSITION", `Cannot transition from ${order.status} to ${newStatus}`, 422);
      }
      const { data: updated, error: updErr } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId).select().single();
      if (updErr) throw new AppError("UPDATE_ERROR", updErr.message, 500);
      
      // Sync to in-memory
      try {
        const db = getDb();
        const memOrder = db.orders.find(o=>o.id===orderId);
        if (memOrder) memOrder.status = newStatus as any;
      } catch {}

      const eventMap: Record<string, string> = {
        CONFIRMED: "order.confirmed",
        PREPARING: "order.preparing",
        READY: "order.ready",
        SERVED: "order.served",
      };
      if (eventMap[newStatus]) {
        emitEvent(eventMap[newStatus], {
          entity_id: order.id,
          table_id: order.table_id,
          restaurant_id: order.restaurant_id,
          branch_id: order.branch_id,
          entity_type: "order",
        });
      }
      return { order: updated, oldStatus: order.status };
    }

    // In-memory fallback
    const db = getDb();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found", 404);
    const validTransitions: Record<string, string[]> = {
      NEW: ["CONFIRMED", "PREPARING"],
      CONFIRMED: ["PREPARING"],
      PREPARING: ["READY"],
      READY: ["SERVED"],
      SERVED: [],
    };
    if (order.status !== newStatus && !validTransitions[order.status]?.includes(newStatus)) {
      throw new AppError("INVALID_TRANSITION", `Cannot transition from ${order.status} to ${newStatus}`, 422);
    }
    const oldStatus = order.status;
    order.status = newStatus as any;
    const eventMap: Record<string, string> = {
      CONFIRMED: "order.confirmed",
      PREPARING: "order.preparing",
      READY: "order.ready",
      SERVED: "order.served",
    };
    if (eventMap[newStatus]) {
      emitEvent(eventMap[newStatus], {
        entity_id: order.id,
        table_id: order.table_id,
        restaurant_id: order.restaurant_id,
        branch_id: order.branch_id,
        entity_type: "order",
      });
    }
    return { order, oldStatus };
  },

  async getKitchenOrders() {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: activeSessions } = await supabase.from('table_sessions').select('id').eq('status', 'ACTIVE');
      const sessionIds = (activeSessions || []).map((s:any)=>s.id);
      if (sessionIds.length===0) return [];
      const { data: orders } = await supabase.from('orders').select('*').in('table_session_id', sessionIds).in('status', ['NEW','CONFIRMED','PREPARING','READY']).order('created_at', { ascending: true });
      if (!orders) return [];
      const result = [];
      for (const o of orders) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', o.id);
        const { data: table } = await supabase.from('tables').select('*').eq('id', o.table_id).single();
        const { data: session } = await supabase.from('table_sessions').select('*').eq('id', o.table_session_id).single();
        result.push({ order: o, items: items || [], table, session });
      }
      return result;
    }

    const db = getDb();
    const activeSessionIds = db.table_sessions.filter(s => s.status === "ACTIVE").map(s => s.id);
    return db.orders
      .filter(o => activeSessionIds.includes(o.table_session_id) && ["NEW","CONFIRMED","PREPARING","READY"].includes(o.status))
      .sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(o => ({
        order: o,
        items: db.order_items.filter(oi => oi.order_id === o.id),
        table: db.tables.find(t=>t.id===o.table_id),
        session: db.table_sessions.find(s=>s.id===o.table_session_id),
      }));
  },

  getKitchenOrdersSync() {
    const db = getDb();
    const activeSessionIds = db.table_sessions.filter(s => s.status === "ACTIVE").map(s => s.id);
    return db.orders
      .filter(o => activeSessionIds.includes(o.table_session_id) && ["NEW","CONFIRMED","PREPARING","READY"].includes(o.status))
      .sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(o => ({
        order: o,
        items: db.order_items.filter(oi => oi.order_id === o.id),
        table: db.tables.find(t=>t.id===o.table_id),
        session: db.table_sessions.find(s=>s.id===o.table_session_id),
      }));
  }
};
