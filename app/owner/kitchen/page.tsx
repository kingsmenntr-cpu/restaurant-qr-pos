"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const fetchOrders = async () => {
    const res = await fetch("/api/kitchen/orders");
    const data = await res.json();
    setOrders(data.orders||[]);
  };
  useEffect(()=>{ fetchOrders(); const id=setInterval(fetchOrders,3000); const bc=new BroadcastChannel("restaurant-pos-realtime"); bc.onmessage=()=>fetchOrders(); return()=>{clearInterval(id); bc.close();} },[]);

  const update = async (id:string, status:string) => {
    await fetch(`/api/orders/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
    fetchOrders();
    try{new BroadcastChannel("restaurant-pos-realtime").postMessage({ type:`order.${status.toLowerCase()}` })}catch{}
  };

  const columns = {
    NEW: orders.filter(o=>["NEW","CONFIRMED"].includes(o.order.status)),
    PREPARING: orders.filter(o=>o.order.status==="PREPARING"),
    READY: orders.filter(o=>o.order.status==="READY"),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Kitchen • KDS</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {(Object.keys(columns) as Array<keyof typeof columns>).map(col=>(
          <div key={col} className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-widest text-white/60">{col} • {columns[col].length}</h3>
            {columns[col].map(({ order, items, table }: any)=>(
              <GlassCard key={order.id} className="p-4">
                <div className="flex justify-between">
                  <p className="font-mono font-bold">{order.order_number}</p>
                  <p className="text-xs bg-white/10 px-2 py-1 rounded-full">{table?.name}</p>
                </div>
                <p className="text-xs text-white/40 mt-1">{new Date(order.created_at).toLocaleTimeString()} • {Math.floor((Date.now()-new Date(order.created_at).getTime())/60000)}m ago</p>
                <div className="mt-3 space-y-1 bg-black/20 p-2 rounded-xl">
                  {items.map((it:any)=><div key={it.id} className="text-sm"><span className="font-bold">{it.quantity}x</span> {it.item_name_snapshot} {it.notes && <span className="text-amber-300 text-xs">({it.notes})</span>}</div>)}
                </div>
                {order.notes && <p className="text-xs bg-amber-500/10 text-amber-200 p-2 rounded mt-2">{order.notes}</p>}
                <div className="mt-3 flex gap-2">
                  {col==="NEW" && <Button size="sm" className="w-full" onClick={()=>update(order.id,"PREPARING")}>Start Preparing</Button>}
                  {col==="PREPARING" && <Button size="sm" className="w-full" onClick={()=>update(order.id,"READY")}>Mark Ready</Button>}
                  {col==="READY" && <Button size="sm" variant="secondary" className="w-full" onClick={()=>update(order.id,"SERVED")}>Served</Button>}
                </div>
              </GlassCard>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
