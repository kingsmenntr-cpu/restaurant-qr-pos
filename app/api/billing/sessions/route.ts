import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { BillingService } from "@/lib/services/billingService";

export async function GET() {
  const db = getDb();
  const activeSessions = db.table_sessions.filter(s=>["ACTIVE","BILL_PENDING"].includes(s.status));
  const sessions = activeSessions.map(s=>{
    try {
      const data = BillingService.getActiveSessionBillData(s.id);
      return data;
    } catch { return null; }
  }).filter(Boolean);
  return NextResponse.json({ sessions });
}
