import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { OrderService } from "@/lib/services/orderService";

export async function GET() {
  const db = getDb();
  const orders = db.orders.slice().sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(o=>{
    const items = db.order_items.filter(oi=>oi.order_id===o.id);
    const table = db.tables.find(t=>t.id===o.table_id);
    return { order: o, items, table };
  });
  return NextResponse.json({ orders });
}
