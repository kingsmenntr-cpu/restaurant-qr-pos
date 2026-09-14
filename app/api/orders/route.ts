import { NextResponse } from "next/server";
import { OrderService } from "@/lib/services/orderService";

export async function GET() {
  try {
    const orders = await OrderService.getAllForBranchAsync();
    return NextResponse.json({ orders });
  } catch (e) {
    // Fallback to sync
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const orders = db.orders.slice().sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(o=>{
      const items = db.order_items.filter(oi=>oi.order_id===o.id);
      const table = db.tables.find(t=>t.id===o.table_id);
      return { order: o, items, table };
    });
    return NextResponse.json({ orders });
  }
}
