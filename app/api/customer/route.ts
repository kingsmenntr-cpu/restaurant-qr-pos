import { NextRequest, NextResponse } from "next/server";
import { findTableByToken, getDb } from "@/lib/db";
import { MenuService } from "@/lib/services/menuService";
import { OrderService } from "@/lib/services/orderService";
import { WaiterService } from "@/lib/services/waiterService";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: { message: "Token required" } }, { status: 400 });

  const resolved = findTableByToken(token);
  if (!resolved) return NextResponse.json({ error: { message: "Invalid QR token" } }, { status: 404 });

  const db = getDb();
  const table = resolved.table;
  const session = table.current_session_id ? db.table_sessions.find(s=>s.id===table.current_session_id && s.status==="ACTIVE") : null;

  const categories = MenuService.getCategories();
  const menuItems = MenuService.getAvailableItems();

  let orders: any[] = [];
  let waiterStatus = "NONE";
  if (session) {
    orders = OrderService.getBySession(session.id);
    const wr = WaiterService.getForSession(session.id).find(w=>w.status==="OPEN");
    if (wr) waiterStatus = "OPEN";
  }

  return NextResponse.json({ table, session, categories, menuItems, orders, waiterStatus, qr: resolved.qr });
}
