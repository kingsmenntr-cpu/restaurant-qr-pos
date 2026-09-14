"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type MenuItem = any;
type Category = any;
type CartItem = { menuItem: MenuItem; qty: number; notes?: string };

export default function CustomerPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [waiterStatus, setWaiterStatus] = useState<string>("NONE");
  const [placing, setPlacing] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/customer?token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Invalid QR");
      setTable(data.table);
      setCategories(data.categories);
      setItems(data.menuItems);
      setSession(data.session);
      setOrders(data.orders || []);
      setWaiterStatus(data.waiterStatus || "NONE");
    } catch (e: any) {
      console.error(e);
      setTable(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === menuItem.id);
      if (existing) return prev.map(c => c.menuItem.id === menuItem.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menuItem, qty: 1 }];
    });
  };
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.menuItem.id !== id));
    else setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, qty } : c));
  };

  const cartTotal = cart.reduce((s, c) => s + c.menuItem.price * c.qty, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const client_request_id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const res = await fetch("/api/customer/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          items: cart.map(c => ({ menu_item_id: c.menuItem.id, quantity: c.qty, notes: c.notes })),
          notes: orderNote,
          client_request_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Order failed");
      setCart([]);
      setOrderNote("");
      fetchData();
      // broadcast
      try { new BroadcastChannel("restaurant-pos-realtime").postMessage({ type: "order.created" }); } catch {}
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const callWaiter = async () => {
    try {
      const res = await fetch("/api/customer/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setWaiterStatus("OPEN");
      try { new BroadcastChannel("restaurant-pos-realtime").postMessage({ type: "waiter_request.created" }); } catch {}
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredItems = items.filter(i => {
    if (activeCat !== "all" && i.category_id !== activeCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading table...</div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold">Invalid QR Code</h2>
          <p className="text-white/50 text-sm mt-2">This QR code is invalid or expired. Please ask staff for a new QR.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl bg-black/20 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold">A</div>
            <div>
              <p className="font-bold leading-none">Agra Foods</p>
              <p className="text-xs text-white/50">Table {table.name} • {table.section} • {table.capacity} seats</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">Active Session</span>}
            <button onClick={callWaiter} disabled={waiterStatus==="OPEN"} className={`w-10 h-10 rounded-full flex items-center justify-center border ${waiterStatus==="OPEN" ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-white/10 border-white/10 hover:bg-white/15"}`}>
              🔔
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {/* Waiter status */}
        {waiterStatus === "OPEN" && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-3 rounded-xl text-sm">Waiter Requested - Staff will arrive shortly</div>
        )}

        {/* Session orders tracking */}
        {orders.length > 0 && (
          <GlassCard className="p-4">
            <h3 className="font-semibold mb-3">Your Orders - Live Tracking</h3>
            <div className="space-y-3">
              {orders.map((o: any) => (
                <div key={o.order.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-bold">{o.order.order_number}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      o.order.status==="NEW" ? "bg-blue-500/20 text-blue-300" :
                      o.order.status==="PREPARING" ? "bg-amber-500/20 text-amber-300" :
                      o.order.status==="READY" ? "bg-emerald-500/20 text-emerald-300" :
                      "bg-white/10 text-white/60"
                    }`}>{o.order.status}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {["NEW","CONFIRMED","PREPARING","READY","SERVED"].map((s, idx) => {
                      const currentIdx = ["NEW","CONFIRMED","PREPARING","READY","SERVED"].indexOf(o.order.status);
                      const active = idx <= currentIdx;
                      return <div key={s} className={`h-1 flex-1 rounded-full ${active ? "bg-violet-500" : "bg-white/10"}`} />;
                    })}
                  </div>
                  <p className="text-xs text-white/40 mt-2">{o.items.map((i:any)=>`${i.item_name_snapshot} x${i.quantity}`).join(", ")} • {formatINR(o.order.total_amount)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Search & Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
          <button onClick={()=>setActiveCat("all")} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border ${activeCat==="all" ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/70"}`}>All</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={()=>setActiveCat(cat.id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border ${activeCat===cat.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/70"}`}>{cat.name}</button>
          ))}
        </div>

        <div className="relative">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search dishes..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" />
        </div>

        {/* Menu */}
        <div className="grid md:grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex gap-3 hover:bg-white/[0.08] transition">
              <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover bg-white/5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight">{item.name} {item.bestseller && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded ml-1">BEST</span>}</h4>
                  <span className={`w-3 h-3 rounded-[2px] border flex-shrink-0 mt-0.5 ${item.veg_type==="VEG" ? "border-green-500" : "border-red-500"}`}><span className={`block w-1.5 h-1.5 rounded-full m-[2px] ${item.veg_type==="VEG" ? "bg-green-500" : "bg-red-500"}`} /></span>
                </div>
                <p className="text-xs text-white/50 line-clamp-2 mt-1">{item.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-sm">{formatINR(item.price)}</span>
                  <Button size="sm" variant="secondary" onClick={()=>addToCart(item)} disabled={!item.available}>{item.available ? "Add" : "Unavailable"}</Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-5xl mx-auto p-4">
              <GlassCard className="p-4 bg-black/40 backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Cart • {cart.length} items</h3>
                  <span className="font-bold">{formatINR(cartTotal)}</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin mb-3">
                  {cart.map(c => (
                    <div key={c.menuItem.id} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                      <span className="truncate flex-1">{c.menuItem.name}</span>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={()=>updateQty(c.menuItem.id, c.qty-1)} className="w-7 h-7 rounded-full bg-white/10">-</button>
                        <span className="w-5 text-center">{c.qty}</span>
                        <button onClick={()=>updateQty(c.menuItem.id, c.qty+1)} className="w-7 h-7 rounded-full bg-white/10">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Order notes (optional)" className="w-full mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm" />
                <Button onClick={placeOrder} disabled={placing} className="w-full" size="lg">{placing ? "Placing..." : `Place Order • ${formatINR(cartTotal)}`}</Button>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
