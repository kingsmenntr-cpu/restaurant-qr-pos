import { v4 as uuidv4 } from "uuid";
import { getDb, emitEvent } from "../db";
import { AppError } from "../types";
import { safeAdd, generateBillNumber, calculateUpiQrAmount } from "../utils";

export const BillingService = {
  getActiveSessionBillData(sessionId: string) {
    const db = getDb();
    const session = db.table_sessions.find(s=>s.id===sessionId);
    if (!session) throw new AppError("NOT_FOUND","Session not found",404);
    const orders = db.orders.filter(o=>o.table_session_id===sessionId);
    // unpaid orders = not already billed with PAID/COMPLETED bill
    const billedOrderIds = db.bill_orders.filter(bo=>{
      const bill = db.bills.find(b=>b.id===bo.bill_id && ["PAID","COMPLETED"].includes(b.status));
      return !!bill;
    }).map(bo=>bo.order_id);
    const unpaidOrders = orders.filter(o=>!billedOrderIds.includes(o.id));

    const subtotal = unpaidOrders.reduce((sum,o)=> safeAdd(sum, o.subtotal), 0);
    const tax = unpaidOrders.reduce((sum,o)=> safeAdd(sum, o.tax_amount), 0);
    const grandTotal = safeAdd(subtotal, tax);

    const table = db.tables.find(t=>t.id===session.table_id);

    return { session, orders, unpaidOrders, subtotal, tax, grandTotal, table };
  },

  createBill(sessionId: string, createdBy?: string) {
    const db = getDb();
    const session = db.table_sessions.find(s=>s.id===sessionId);
    if (!session) throw new AppError("NOT_FOUND","Session not found",404);
    if (session.status !== "ACTIVE") throw new AppError("INVALID_SESSION","Session not active for billing",409);

    const { unpaidOrders, subtotal, tax, grandTotal } = this.getActiveSessionBillData(sessionId);
    if (unpaidOrders.length===0) throw new AppError("NO_ORDERS","No unpaid orders",422);

    const now = new Date().toISOString();
    const bill = {
      id: uuidv4(),
      restaurant_id: session.restaurant_id,
      branch_id: session.branch_id,
      table_id: session.table_id,
      table_session_id: sessionId,
      bill_number: generateBillNumber(),
      subtotal,
      tax_amount: tax,
      grand_total: grandTotal,
      status: "PENDING" as const,
      created_at: now,
      completed_at: null,
    };
    db.bills.push(bill as any);
    // link orders
    for (const o of unpaidOrders) {
      db.bill_orders.push({ bill_id: bill.id, order_id: o.id });
    }

    // update session & table to BILL_PENDING (BR-006)
    session.status = "BILL_PENDING";
    const table = db.tables.find(t=>t.id===session.table_id);
    if (table) table.status = "BILL_PENDING";

    emitEvent("bill.created", { entity_id: bill.id, table_id: session.table_id, restaurant_id: session.restaurant_id, branch_id: session.branch_id });

    return bill;
  },

  addPayment(billId: string, payment: { cash: number; upi: number }, createdBy?: string) {
    const db = getDb();
    const bill = db.bills.find(b=>b.id===billId);
    if (!bill) throw new AppError("NOT_FOUND","Bill not found",404);
    if (bill.status !== "PENDING" && bill.status !== "DRAFT") throw new AppError("INVALID_BILL","Bill not pending",409);

    const totalPaid = safeAdd(payment.cash, payment.upi);
    if (totalPaid !== bill.grand_total) {
      throw new AppError("PAYMENT_MISMATCH", `Payment total ${totalPaid} does not match bill total ${bill.grand_total}`, 422);
    }

    const now = new Date().toISOString();
    // clear existing payments for this bill (idempotent replace)
    db.payments = db.payments.filter(p=>p.bill_id!==billId);

    if (payment.cash > 0) {
      db.payments.push({
        id: uuidv4(),
        bill_id: billId,
        method: "CASH",
        amount: payment.cash,
        status: "COMPLETED",
        created_at: now,
      } as any);
    }
    if (payment.upi > 0) {
      db.payments.push({
        id: uuidv4(),
        bill_id: billId,
        method: "UPI",
        amount: payment.upi,
        status: "COMPLETED",
        created_at: now,
      } as any);
    }

    // Calculate QR amount for preview
    const qrAmount = calculateUpiQrAmount(payment, bill.grand_total);

    return { bill, payments: db.payments.filter(p=>p.bill_id===billId), qrAmount };
  },

  completeBill(billId: string) {
    const db = getDb();
    const bill = db.bills.find(b=>b.id===billId);
    if (!bill) throw new AppError("NOT_FOUND","Bill not found",404);
    const payments = db.payments.filter(p=>p.bill_id===billId);
    const totalPaid = payments.reduce((s,p)=> safeAdd(s, p.amount), 0);
    if (totalPaid !== bill.grand_total) throw new AppError("PAYMENT_INCOMPLETE","Payments do not match bill total",422);

    bill.status = "COMPLETED";
    bill.completed_at = new Date().toISOString();

    const session = db.table_sessions.find(s=>s.id===bill.table_session_id);
    if (session) {
      session.status = "COMPLETED";
      session.closed_at = new Date().toISOString();
    }
    const table = db.tables.find(t=>t.id===bill.table_id);
    if (table) {
      table.status = "AVAILABLE";
      table.current_session_id = null;
    }

    emitEvent("bill.completed", { entity_id: bill.id, table_id: bill.table_id });
    emitEvent("table.status_changed", { table_id: bill.table_id, status: "AVAILABLE" });

    return bill;
  },

  getBillWithDetails(billId: string) {
    const db = getDb();
    const bill = db.bills.find(b=>b.id===billId);
    if (!bill) return null;
    const billOrders = db.bill_orders.filter(bo=>bo.bill_id===billId);
    const orders = billOrders.map(bo=>{
      const order = db.orders.find(o=>o.id===bo.order_id);
      const items = order ? db.order_items.filter(oi=>oi.order_id===order.id) : [];
      return { order, items };
    });
    const payments = db.payments.filter(p=>p.bill_id===billId);
    const table = db.tables.find(t=>t.id===bill.table_id);
    const session = db.table_sessions.find(s=>s.id===bill.table_session_id);
    return { bill, orders, payments, table, session };
  },

  getAllBills() {
    const db = getDb();
    return db.bills.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};
