import { v4 as uuidv4 } from "uuid";
import type {
  Table, QrToken, TableSession, Category, MenuItem, Order, OrderItem,
  WaiterRequest, Bill, Payment, Notification, User, Restaurant, Branch,
  PaymentSettings, TaxSettings, RestaurantSettings
} from "./types";
import { generateSecureToken, hashToken, generateOrderNumber, generateBillNumber } from "./utils";
import { getSupabaseService, getSupabaseAnon, isSupabaseEnabled } from "./supabase/server";

// In-memory DB type
type DB = {
  restaurants: Restaurant[];
  branches: Branch[];
  users: User[];
  restaurant_settings: RestaurantSettings[];
  payment_settings: PaymentSettings[];
  tax_settings: TaxSettings[];
  tables: Table[];
  qr_tokens: QrToken[];
  table_sessions: TableSession[];
  categories: Category[];
  menu_items: MenuItem[];
  orders: Order[];
  order_items: OrderItem[];
  waiter_requests: WaiterRequest[];
  bills: Bill[];
  bill_orders: { bill_id: string; order_id: string }[];
  payments: Payment[];
  notifications: Notification[];
};

function createSeedData(): DB {
  const restaurantId = "11111111-1111-1111-1111-111111111111";
  const branchId = "22222222-2222-2222-2222-222222222222";
  const now = new Date().toISOString();

  const restaurant: Restaurant = {
    id: restaurantId,
    name: "Agra Foods - Royal Taste",
    slug: "agra-foods",
    address: "Near Taj Mahal, Agra, UP",
    phone: "+91 98765 43210",
    created_at: now,
  };
  const branch: Branch = {
    id: branchId,
    restaurant_id: restaurantId,
    name: "Main Branch",
    code: "MAIN",
    is_active: true,
  };
  const users: User[] = [
    { id: "u-owner-1", restaurant_id: restaurantId, branch_id: branchId, role: "OWNER", name: "Owner", email: "owner@restaurant.com", is_active: true },
    { id: "u-cashier-1", restaurant_id: restaurantId, branch_id: branchId, role: "CASHIER", name: "Cashier", email: "cashier@restaurant.com", is_active: true },
    { id: "u-kitchen-1", restaurant_id: restaurantId, branch_id: branchId, role: "KITCHEN", name: "Kitchen", email: "kitchen@restaurant.com", is_active: true },
  ];

  const tables: Table[] = Array.from({ length: 12 }).map((_, i) => {
    const id = uuidv4();
    return {
      id,
      restaurant_id: restaurantId,
      branch_id: branchId,
      name: `T-${String(i + 1).padStart(2, "0")}`,
      capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      section: i < 6 ? "Indoor" : "Outdoor",
      status: "AVAILABLE" as const,
      is_active: true,
      current_session_id: null,
      created_at: now,
    };
  });

  const qr_tokens: QrToken[] = tables.map((t) => {
    const token = `table-token-${t.id.slice(0, 8)}-${generateSecureToken().slice(0, 24)}`;
    return {
      id: uuidv4(),
      table_id: t.id,
      token,
      token_hash: hashToken(token),
      version: 1,
      is_active: true,
      created_at: now,
      revoked_at: null,
    };
  });

  const categories: Category[] = [
    { id: uuidv4(), restaurant_id: restaurantId, branch_id: branchId, name: "Starters", sort_order: 1, is_active: true },
    { id: uuidv4(), restaurant_id: restaurantId, branch_id: branchId, name: "Main Course", sort_order: 2, is_active: true },
    { id: uuidv4(), restaurant_id: restaurantId, branch_id: branchId, name: "Breads", sort_order: 3, is_active: true },
    { id: uuidv4(), restaurant_id: restaurantId, branch_id: branchId, name: "Beverages", sort_order: 4, is_active: true },
    { id: uuidv4(), restaurant_id: restaurantId, branch_id: branchId, name: "Desserts", sort_order: 5, is_active: true },
  ];

  const menuItemsData = [
    { name: "Paneer Tikka", price: 280, cat: 0, veg: "VEG", best: true, desc: "Cottage cheese marinated in spices, grilled to perfection" },
    { name: "Chicken Tikka", price: 350, cat: 0, veg: "NON_VEG", best: true, desc: "Juicy chicken pieces with authentic tandoor flavor" },
    { name: "Veg Spring Roll", price: 180, cat: 0, veg: "VEG", desc: "Crispy rolls stuffed with veggies" },
    { name: "Dal Makhani", price: 220, cat: 1, veg: "VEG", best: true, desc: "Creamy black lentils slow-cooked overnight" },
    { name: "Butter Chicken", price: 380, cat: 1, veg: "NON_VEG", best: true, desc: "Rich tomato gravy with tender chicken" },
    { name: "Paneer Butter Masala", price: 300, cat: 1, veg: "VEG", desc: "Cottage cheese in buttery tomato gravy" },
    { name: "Biryani Veg", price: 320, cat: 1, veg: "VEG", desc: "Aromatic basmati rice with mixed vegetables" },
    { name: "Biryani Chicken", price: 420, cat: 1, veg: "NON_VEG", desc: "Hyderabadi style chicken biryani" },
    { name: "Butter Naan", price: 50, cat: 2, veg: "VEG", desc: "Soft leavened bread with butter" },
    { name: "Garlic Naan", price: 70, cat: 2, veg: "VEG", desc: "Naan topped with garlic butter" },
    { name: "Tandoori Roti", price: 35, cat: 2, veg: "VEG", desc: "Whole wheat bread from tandoor" },
    { name: "Masala Chai", price: 40, cat: 3, veg: "VEG", desc: "Traditional Indian spiced tea" },
    { name: "Cold Coffee", price: 120, cat: 3, veg: "VEG", desc: "Chilled coffee with ice cream" },
    { name: "Fresh Lime Soda", price: 80, cat: 3, veg: "VEG", desc: "Refreshing lime with soda" },
    { name: "Gulab Jamun", price: 120, cat: 4, veg: "VEG", best: true, desc: "Soft milk balls in sugar syrup" },
    { name: "Kulfi", price: 100, cat: 4, veg: "VEG", desc: "Traditional Indian ice cream" },
  ];

  const menu_items: MenuItem[] = menuItemsData.map((m) => ({
    id: uuidv4(),
    restaurant_id: restaurantId,
    branch_id: branchId,
    category_id: categories[m.cat].id,
    name: m.name,
    description: m.desc,
    price: m.price,
    veg_type: m.veg as any,
    available: true,
    recommended: false,
    bestseller: (m as any).best || false,
    image_url: `https://source.unsplash.com/400x300/?${encodeURIComponent(m.name)},food`,
  }));

  return {
    restaurants: [restaurant],
    branches: [branch],
    users,
    restaurant_settings: [{ restaurant_id: restaurantId, timezone: "Asia/Kolkata", currency: "INR" }],
    payment_settings: [{ restaurant_id: restaurantId, upi_enabled: true, upi_id: "agrafoods@upi", merchant_name: "Agra Foods" }],
    tax_settings: [{ restaurant_id: restaurantId, enabled: true, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 0 }],
    tables,
    qr_tokens,
    table_sessions: [],
    categories,
    menu_items,
    orders: [],
    order_items: [],
    waiter_requests: [],
    bills: [],
    bill_orders: [],
    payments: [],
    notifications: [],
  };
}

const globalForDb = globalThis as unknown as { __RESTAURANT_DB__: DB | undefined };

export function getDb(): DB {
  if (!globalForDb.__RESTAURANT_DB__) {
    globalForDb.__RESTAURANT_DB__ = createSeedData();
    console.log("🍽️ Seeded Restaurant DB with", globalForDb.__RESTAURANT_DB__.tables.length, "tables");
  }
  return globalForDb.__RESTAURANT_DB__!;
}

export function resetDb() {
  globalForDb.__RESTAURANT_DB__ = createSeedData();
}

// Supabase helpers
async function supabaseFindTableByToken(token: string) {
  if (!isSupabaseEnabled()) return null;
  try {
    const supabase = getSupabaseService() || getSupabaseAnon();
    if (!supabase) return null;
    const { data: qr, error } = await supabase.from('qr_tokens').select('*').eq('token', token).eq('is_active', true).single();
    if (error || !qr) return null;
    const { data: table } = await supabase.from('tables').select('*').eq('id', qr.table_id).single();
    if (!table) return null;
    return { table, qr };
  } catch { return null; }
}

// Helpers - now support both in-memory and Supabase
export function findTableByToken(token: string) {
  const db = getDb();
  const qr = db.qr_tokens.find(q => q.token === token && q.is_active);
  if (!qr) return null;
  const table = db.tables.find(t => t.id === qr.table_id);
  if (!table) return null;
  return { table, qr };
}

export async function findTableByTokenAsync(token: string) {
  // Try Supabase first if enabled, else in-memory
  if (isSupabaseEnabled()) {
    const sb = await supabaseFindTableByToken(token);
    if (sb) return sb;
  }
  return findTableByToken(token);
}

export function getActiveSessionForTable(tableId: string) {
  const db = getDb();
  return db.table_sessions.find(s => s.table_id === tableId && s.status === "ACTIVE") || null;
}

export function getActiveSessionById(sessionId: string) {
  const db = getDb();
  return db.table_sessions.find(s => s.id === sessionId) || null;
}

export function emitEvent(type: string, payload: any) {
  const db = getDb();
  const now = new Date().toISOString();
  const notif: Notification = {
    id: uuidv4(),
    restaurant_id: payload.restaurant_id || db.restaurants[0]?.id || '11111111-1111-1111-1111-111111111111',
    branch_id: payload.branch_id || db.branches[0]?.id || '22222222-2222-2222-2222-222222222222',
    type,
    entity_type: payload.entity_type || "order",
    entity_id: payload.entity_id || uuidv4(),
    table_id: payload.table_id,
    recipient_role: payload.recipient_role || "ALL",
    status: "UNREAD",
    created_at: now,
  };
  db.notifications.unshift(notif);
  if (db.notifications.length > 100) db.notifications.pop();

  // Try Supabase Realtime emit
  if (isSupabaseEnabled()) {
    try {
      const supabase = getSupabaseService() || getSupabaseAnon();
      if (supabase) {
        (supabase.from('notifications').insert({
          restaurant_id: notif.restaurant_id,
          branch_id: notif.branch_id,
          type,
          entity_type: notif.entity_type,
          entity_id: notif.entity_id,
          table_id: notif.table_id,
          recipient_role: notif.recipient_role,
          status: 'UNREAD'
        }) as any).then(()=>{}).catch(()=>{});
      }
    } catch {}
  }

  const g = globalThis as any;
  if (!g.__EVENT_LISTENERS__) g.__EVENT_LISTENERS__ = [];
  g.__EVENT_LISTENERS__.forEach((cb: any) => {
    try { cb({ type, payload, notification: notif }); } catch {}
  });
}

export function subscribeToEvents(callback: (e: any) => void) {
  const g = globalThis as any;
  if (!g.__EVENT_LISTENERS__) g.__EVENT_LISTENERS__ = [];
  g.__EVENT_LISTENERS__.push(callback);
  return () => {
    g.__EVENT_LISTENERS__ = g.__EVENT_LISTENERS__.filter((c: any) => c !== callback);
  };
}

// Export seed for Supabase setup
export { createSeedData };
