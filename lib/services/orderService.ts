import { v4 as uuidv4 } from "uuid";
import { getDb, findTableByToken, getActiveSessionForTable, emitEvent } from "../db";
import { AppError } from "../types";
import { generateOrderNumber, safeAdd, safeMul, toPaise } from "../utils";

export const OrderService = {
  async createOrder(input: {
    token: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
    notes?: string;
    client_request_id: string;
  }) {
    const db = getDb();
    const resolved = findTableByToken(input.token);
    if (!resolved) throw new AppError("INVALID_TOKEN", "Invalid or expired QR token", 400);
    const { table } = resolved;
    if (!table.is_active) throw new AppError("TABLE_DISABLED", "Table is disabled", 422);
    // BR-006: if BILL_PENDING, prevent new orders
    if (table.status === "BILL_PENDING") throw new AppError("BILL_PENDING", "Billing in progress, cannot accept new orders", 409);

    // Idempotency check
    const existing = db.orders.find(o => o.client_request_id === input.client_request_id && o.table_id === table.id);
    if (existing) {
      return existing;
    }

    // Validate menu items and calculate price server-side (BR-024)
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

    // Tax calculation
    const taxSettings = db.tax_settings[0];
    let taxAmount = 0;
    if (taxSettings.enabled) {
      const totalRate = (taxSettings.cgst_rate + taxSettings.sgst_rate + taxSettings.igst_rate) / 100;
      taxAmount = parseFloat((subtotal * totalRate).toFixed(2));
    }
    const totalAmount = safeAdd(subtotal, taxAmount);

    // Handle table session: first order activates session (BR-003)
    let session = getActiveSessionForTable(table.id);
    const now = new Date().toISOString();
    if (!session) {
      // Create new session
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

    // Create order
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

    // Create order items with snapshot (BR-009)
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

    // Emit realtime events
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

  getBySession(sessionId: string) {
    const db = getDb();
    const orders = db.orders.filter(o => o.table_session_id === sessionId).sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return orders.map(o => ({
      order: o,
      items: db.order_items.filter(oi => oi.order_id === o.id),
    }));
  },

  getAllForBranch(branchId?: string) {
    const db = getDb();
    const bid = branchId || db.branches[0].id;
    return db.orders.filter(o => o.branch_id === bid).sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  updateStatus(orderId: string, newStatus: "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "SERVED", changedBy?: string) {
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

    // Emit events for each status
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

  getKitchenOrders() {
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
