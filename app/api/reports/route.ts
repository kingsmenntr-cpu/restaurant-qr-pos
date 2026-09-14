import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const bills = db.bills.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalRevenue = bills.filter(b=>b.status==="COMPLETED").reduce((s,b)=>s+b.grand_total,0);
  const totalBills = bills.length;
  const avgBill = totalBills ? totalRevenue/totalBills : 0;
  const totalOrders = db.orders.length;
  return NextResponse.json({ bills, totalRevenue, totalBills, avgBill, totalOrders });
}
