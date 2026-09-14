"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  };
  useEffect(()=>{ fetchOrders(); const id=setInterval(fetchOrders,3000); const bc=new BroadcastChannel("restaurant-pos-realtime"); bc.onmessage=()=>fetchOrders(); return()=>{clearInterval(id); bc.close();} },[]);

  const updateStatus = async (id:string, status:string) => {
    const res = await fetch(`/api/orders/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
    if (res.ok) { fetchOrders(); try{new BroadcastChannel("restaurant-pos-realtime").postMessage({ type:`order.${status.toLowerCase()}` })}catch{} }
    else { const d=await res.json(); alert(d.error?.message); }
  };

  const filtered = filter==="ALL" ? orders : orders.filter(o=>o.order.status===filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Orders • Live</h1>
        <div className="flex gap-2">
          {["ALL","NEW","CONFIRMED","PREPARING","READY","SERVED"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs border ${filter===s ? "bg-white text-black" : "bg-white/5 border-white/10 text-white/60"}`}>{s}</button>)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ order, items, table }: any)=>(
          <GlassCard key={order.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-bold">{order.order_number}</p>
                <p className="text-xs text-white/50">{table?.name} • {new Date(order.created_at).toLocaleTimeString()} • {order.table_session_id.slice(0,6)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${order.status==="NEW" ? "bg-blue-500/20 text-blue-300 animate-pulse" : order.status==="PREPARING" ? "bg-amber-500/20 text-amber-300" : order.status==="READY" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>{order.status}</span>
            </div>
            <div className="mt-3 space-y-1 bg-black/20 rounded-xl p-3">
              {items.map((it:any)=><div key={it.id} className="flex justify-between text-sm"><span>{it.item_name_snapshot} x{it.quantity}</span><span>{formatINR(it.line_total)}</span></div>)}
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm"><span>Total</span><span>{formatINR(order.total_amount)}</span></div>
            </div>
            {order.notes && <p className="text-xs text-amber-200 bg-amber-500/10 p-2 rounded-lg mt-2">Note: {order.notes}</p>}
            <div className="mt-3 flex gap-2">
              {order.status==="NEW" && <><Button size="sm" onClick={()=>updateStatus(order.id,"CONFIRMED")}>Confirm</Button><Button size="sm" variant="secondary" onClick={()=>updateStatus(order.id,"PREPARING")}>Start Prep</Button></>}
              {order.status==="CONFIRMED" && <Button size="sm" onClick={()=>updateStatus(order.id,"PREPARING")}>Start Preparing</Button>}
              {order.status==="PREPARING" && <Button size="sm" onClick={()=>updateStatus(order.id,"READY")}>Mark Ready</Button>}
              {order.status==="READY" && <Button size="sm" variant="secondary" onClick={()=>updateStatus(order.id,"SERVED")}>Served</Button>}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
