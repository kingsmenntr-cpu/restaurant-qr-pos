"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

const STATUS_FLOW = ["NEW", "CONFIRMED", "PREPARING", "READY", "SERVED"] as const;
const VALID_NEXT: Record<string, string[]> = {
  NEW: ["CONFIRMED", "PREPARING"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["SERVED"],
  SERVED: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  };
  useEffect(()=>{ fetchOrders(); const id=setInterval(fetchOrders,3000); const bc=new BroadcastChannel("restaurant-pos-realtime"); bc.onmessage=()=>fetchOrders(); return()=>{clearInterval(id); bc.close();} },[]);

  const updateStatus = async (id:string, status:string) => {
    if (updating) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/orders/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
      if (res.ok) { 
        fetchOrders(); 
        try{new BroadcastChannel("restaurant-pos-realtime").postMessage({ type:`order.${status.toLowerCase()}` })}catch{} 
      } else { 
        const d=await res.json(); 
        alert(`❌ ${d.error?.message}\n\nValid flow: NEW → CONFIRMED → PREPARING → READY → SERVED\nYou cannot go backwards!`);
      }
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter==="ALL" ? orders : orders.filter(o=>o.order.status===filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">Orders • Live</h1>
          <p className="text-white/50 text-sm">Flow: NEW → CONFIRMED → PREPARING → READY → SERVED (one-way, no backwards)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL","NEW","CONFIRMED","PREPARING","READY","SERVED"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs border ${filter===s ? "bg-white text-black" : "bg-white/5 border-white/10 text-white/60"}`}>{s}</button>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ order, items, table }: any)=>{
          const currentIdx = STATUS_FLOW.indexOf(order.status);
          return (
          <GlassCard key={order.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-bold">{order.order_number}</p>
                <p className="text-xs text-white/50">{table?.name} • {new Date(order.created_at).toLocaleTimeString()} • {order.table_session_id.slice(0,6)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${order.status==="NEW" ? "bg-blue-500/20 text-blue-300 animate-pulse" : order.status==="PREPARING" ? "bg-amber-500/20 text-amber-300" : order.status==="READY" ? "bg-emerald-500/20 text-emerald-300" : order.status==="CONFIRMED" ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-white/60"}`}>{order.status}</span>
            </div>
            <div className="mt-2 flex gap-1">
              {STATUS_FLOW.map((s, idx) => {
                const active = idx <= currentIdx;
                return <div key={s} className={`h-1 flex-1 rounded-full ${active ? "bg-violet-500" : "bg-white/10"}`} title={s} />;
              })}
            </div>
            <div className="mt-3 space-y-1 bg-black/20 rounded-xl p-3">
              {items.map((it:any)=><div key={it.id} className="flex justify-between text-sm"><span>{it.item_name_snapshot} x{it.quantity}</span><span>{formatINR(it.line_total)}</span></div>)}
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm"><span>Total</span><span>{formatINR(order.total_amount)}</span></div>
            </div>
            {order.notes && <p className="text-xs text-amber-200 bg-amber-500/10 p-2 rounded-lg mt-2">Note: {order.notes}</p>}
            <div className="mt-3">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Next: {VALID_NEXT[order.status]?.join(" or ") || "Completed"}</p>
              <div className="flex gap-2">
                {order.status==="NEW" && <>
                  <Button size="sm" disabled={!!updating} onClick={()=>updateStatus(order.id,"CONFIRMED")}>{updating===order.id ? "..." : "✓ Confirm"}</Button>
                  <Button size="sm" variant="secondary" disabled={!!updating} onClick={()=>updateStatus(order.id,"PREPARING")}>Start Prep</Button>
                </>}
                {order.status==="CONFIRMED" && <Button size="sm" disabled={!!updating} onClick={()=>updateStatus(order.id,"PREPARING")}>{updating===order.id ? "..." : "👨‍🍳 Start Preparing"}</Button>}
                {order.status==="PREPARING" && <Button size="sm" disabled={!!updating} onClick={()=>updateStatus(order.id,"READY")}>{updating===order.id ? "..." : "✅ Mark Ready"}</Button>}
                {order.status==="READY" && <Button size="sm" variant="secondary" disabled={!!updating} onClick={()=>updateStatus(order.id,"SERVED")}>{updating===order.id ? "..." : "🍽️ Served"}</Button>}
                {order.status==="SERVED" && <span className="text-xs text-emerald-300">✓ Completed</span>}
              </div>
            </div>
          </GlassCard>
        )})}
      </div>
    </div>
  );
}
