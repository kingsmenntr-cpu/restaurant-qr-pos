import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSupabaseEnabled, getSupabaseService, getSupabaseAnon } from "@/lib/supabase/server";

export async function GET() {
  // Try Supabase first
  if (isSupabaseEnabled()) {
    try {
      const supabase = getSupabaseService() || getSupabaseAnon();
      if (supabase) {
        const { data: tables } = await supabase.from('tables').select('*').eq('is_active', true);
        const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
        const { data: waiter } = await supabase.from('waiter_requests').select('*').eq('status', 'OPEN');
        const { data: bills } = await supabase.from('bills').select('*').eq('status', 'COMPLETED');
        const { data: activeSessions } = await supabase.from('table_sessions').select('*').eq('status', 'ACTIVE');
        
        // Active tables = tables with ACTIVE session OR status OCCUPIED
        const activeSessionTableIds = new Set((activeSessions || []).map((s:any)=>s.table_id));
        const activeTables = (tables || []).filter((t:any)=> t.status==="OCCUPIED" || activeSessionTableIds.has(t.id)).length;
        const availableTables = (tables || []).filter((t:any)=> t.status==="AVAILABLE" && !activeSessionTableIds.has(t.id)).length;
        const newOrders = (orders || []).filter((o:any)=>o.status==="NEW").length;
        const preparing = (orders || []).filter((o:any)=>o.status==="PREPARING").length;
        const ready = (orders || []).filter((o:any)=>o.status==="READY").length;
        const waiterOpen = (waiter || []).length;
        const revenue = (bills || []).reduce((s:any,b:any)=>s+parseFloat(b.grand_total),0);

        const recentOrders = await Promise.all((orders || []).slice(0,10).map(async (o:any)=>{
          const { data: table } = await supabase.from('tables').select('name').eq('id', o.table_id).single();
          const { data: items } = await supabase.from('order_items').select('id').eq('order_id', o.id);
          return { id: o.id, order_number: o.order_number, table_name: table?.name, status: o.status, total_amount: o.total_amount, items_count: items?.length || 0, created_at: o.created_at };
        }));

        const tablesWithQr = await Promise.all((tables || []).map(async (t:any)=>{
          const { data: qr } = await supabase.from('qr_tokens').select('*').eq('table_id', t.id).eq('is_active', true).single();
          // Determine real status based on active session
          let realStatus = t.status;
          if (activeSessionTableIds.has(t.id) && t.status==="AVAILABLE") realStatus = "OCCUPIED";
          return { table: { ...t, status: realStatus }, qr, session: null };
        }));

        return NextResponse.json({
          stats: { activeTables, availableTables, billPending: (tables || []).filter((t:any)=>t.status==="BILL_PENDING").length, newOrders, preparing, ready, waiterOpen, revenue, totalOrders: orders?.length || 0 },
          recentOrders,
          tables: tablesWithQr,
        });
      }
    } catch (e) {
      console.error("Supabase stats error:", e);
    }
  }

  // In-memory fallback
  const { TableService } = await import("@/lib/services/tableService");
  const { WaiterService } = await import("@/lib/services/waiterService");
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
