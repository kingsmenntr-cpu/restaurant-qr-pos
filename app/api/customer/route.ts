import { NextRequest, NextResponse } from "next/server";
import { findTableByTokenAsync } from "@/lib/db";
import { MenuService } from "@/lib/services/menuService";
import { OrderService } from "@/lib/services/orderService";
import { isSupabaseEnabled, getSupabaseService, getSupabaseAnon } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: { message: "Token required" } }, { status: 400 });

  // Try Supabase first
  if (isSupabaseEnabled()) {
    try {
      const supabase = getSupabaseService() || getSupabaseAnon();
      if (supabase) {
        const { data: qr } = await supabase.from('qr_tokens').select('*').eq('token', token).eq('is_active', true).single();
        if (!qr) return NextResponse.json({ error: { message: "Invalid QR token" } }, { status: 404 });
        const { data: table } = await supabase.from('tables').select('*').eq('id', qr.table_id).single();
        if (!table) return NextResponse.json({ error: { message: "Table not found" } }, { status: 404 });

        const { data: session } = await supabase.from('table_sessions').select('*').eq('table_id', table.id).eq('status', 'ACTIVE').single();
        const { data: categories } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
        const { data: menuItems } = await supabase.from('menu_items').select('*').eq('available', true);

        let orders: any[] = [];
        let waiterStatus = "NONE";
        if (session) {
          orders = await OrderService.getBySessionAsync(session.id);
          const { data: wr } = await supabase.from('waiter_requests').select('*').eq('table_session_id', session.id).eq('status', 'OPEN').single();
          if (wr) waiterStatus = "OPEN";
        }

        return NextResponse.json({ table, session: session || null, categories: categories || [], menuItems: menuItems || [], orders, waiterStatus, qr });
      }
    } catch (e) {
      console.error("Supabase customer error, falling back:", e);
    }
  }

  // In-memory fallback
  const resolved = await findTableByTokenAsync(token);
  if (!resolved) return NextResponse.json({ error: { message: "Invalid QR token" } }, { status: 404 });

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const table = resolved.table;
  const session = table.current_session_id ? db.table_sessions.find(s=>s.id===table.current_session_id && s.status==="ACTIVE") : null;

  const categories = MenuService.getCategories();
  const menuItems = MenuService.getAvailableItems();

  let orders: any[] = [];
  let waiterStatus = "NONE";
  if (session) {
    orders = await OrderService.getBySessionAsync(session.id);
    const { WaiterService } = await import("@/lib/services/waiterService");
    const wr = WaiterService.getForSession(session.id).find(w=>w.status==="OPEN");
    if (wr) waiterStatus = "OPEN";
  }

  return NextResponse.json({ table, session, categories, menuItems, orders, waiterStatus, qr: resolved.qr });
}
