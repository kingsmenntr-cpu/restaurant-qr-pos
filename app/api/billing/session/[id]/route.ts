import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billingService";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = BillingService.getActiveSessionBillData(params.id);
    // get orders with items
    const db = (await import("@/lib/db")).getDb();
    const orders = data.unpaidOrders.map(o=>({
      order: o,
      items: db.order_items.filter(oi=>oi.order_id===o.id)
    }));
    return NextResponse.json({ ...data, orders });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e.status || 500 });
  }
}
