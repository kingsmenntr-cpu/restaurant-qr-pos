import { NextResponse } from "next/server";
import { createSeedData } from "@/lib/db";
import { getSupabaseService, isSupabaseEnabled } from "@/lib/supabase/server";

export async function POST() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json({ error: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY in Vercel env" }, { status: 400 });
  }
  const supabase = getSupabaseService();
  if (!supabase) return NextResponse.json({ error: "Service role key missing" }, { status: 400 });

  try {
    const seed = createSeedData();

    // Clear existing (optional, comment if you don't want to clear)
    // await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // ... etc

    // Insert restaurants
    await supabase.from('restaurants').upsert(seed.restaurants, { onConflict: 'id' });
    await supabase.from('branches').upsert(seed.branches, { onConflict: 'id' });
    await supabase.from('users').upsert(seed.users, { onConflict: 'email' });
    await supabase.from('restaurant_settings').upsert(seed.restaurant_settings.map(s=>({ restaurant_id: s.restaurant_id, timezone: s.timezone, currency: s.currency })), { onConflict: 'restaurant_id' });
    await supabase.from('payment_settings').upsert(seed.payment_settings.map(s=>({ restaurant_id: s.restaurant_id, upi_enabled: s.upi_enabled, upi_id: s.upi_id, merchant_name: s.merchant_name })), { onConflict: 'restaurant_id' });
    await supabase.from('tax_settings').upsert(seed.tax_settings.map(s=>({ restaurant_id: s.restaurant_id, enabled: s.enabled, cgst_rate: s.cgst_rate, sgst_rate: s.sgst_rate, igst_rate: s.igst_rate })), { onConflict: 'restaurant_id' });
    await supabase.from('categories').upsert(seed.categories, { onConflict: 'id' });
    await supabase.from('menu_items').upsert(seed.menu_items, { onConflict: 'id' });
    await supabase.from('tables').upsert(seed.tables.map(t=>({ id: t.id, restaurant_id: t.restaurant_id, branch_id: t.branch_id, name: t.name, capacity: t.capacity, section: t.section, status: t.status, is_active: t.is_active, current_session_id: t.current_session_id })), { onConflict: 'id' });
    await supabase.from('qr_tokens').upsert(seed.qr_tokens.map(q=>({ id: q.id, table_id: q.table_id, token: q.token, token_hash: q.token_hash, version: q.version, is_active: q.is_active })), { onConflict: 'token' });

    return NextResponse.json({ success: true, message: "Seeded Supabase with 12 tables, 5 categories, 16 menu items, 3 users", counts: { tables: seed.tables.length, categories: seed.categories.length, menu_items: seed.menu_items.length } });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
