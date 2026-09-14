import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TableService } from "@/lib/services/tableService";
import { OrderService } from "@/lib/services/orderService";
import { WaiterService } from "@/lib/services/waiterService";

export async function GET() {
  const db = getDb();
  const tables = TableService.getAllWithQr();
  const activeTables = tables.filter(t=>t.table.status==="OCCUPIED").length;
  const availableTables = tables.filter(t=>t.table.status==="AVAILABLE").length;
  const billPending = tables.filter(t=>t.table.status==="BILL_PENDING").length;

  const allOrders = db.orders;
  const newOrders = allOrders.filter(o=>o.status==="NEW").length;
  const preparing = allOrders.filter(o=>o.status==="PREPARING").length;
  const ready = allOrders.filter(o=>o.status==="READY").length;
  const waiterOpen = WaiterService.getOpen().length;
  const revenue = db.bills.filter(b=>b.status==="COMPLETED").reduce((s,b)=>s+b.grand_total,0);

  const recentOrders = allOrders.slice(-10).reverse().map(o=>{
    const table = db.tables.find(t=>t.id===o.table_id);
    const items = db.order_items.filter(oi=>oi.order_id===o.id);
    return { id: o.id, order_number: o.order_number, table_name: table?.name, status: o.status, total_amount: o.total_amount, items_count: items.length, created_at: o.created_at };
  });

  return NextResponse.json({
    stats: { activeTables, availableTables, billPending, newOrders, preparing, ready, waiterOpen, revenue, totalOrders: allOrders.length },
    recentOrders,
    tables,
  });
}
