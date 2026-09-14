import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { WaiterService } from "@/lib/services/waiterService";

export async function GET() {
  const db = getDb();
  const requests = WaiterService.getAll().map(r=>{
    const table = db.tables.find(t=>t.id===r.table_id);
    return { ...r, table };
  });
  return NextResponse.json({ requests });
}
