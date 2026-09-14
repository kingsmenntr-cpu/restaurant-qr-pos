import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const unread = db.notifications.filter(n=>n.status==="UNREAD").length;
  return NextResponse.json({ notifications: db.notifications.slice(0,20), unread });
}
