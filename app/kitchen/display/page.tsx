"use client";
import { useEffect, useState } from "react";
import { useSound } from "@/hooks/useRealtime";

export default function KDSPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const { playBeep } = useSound(true);
  const [prevCount, setPrevCount] = useState(0);

  const fetchOrders = async () => {
    const res = await fetch("/api/kitchen/orders");
    const data = await res.json();
    const newOrders = data.orders||[];
    if (newOrders.length > prevCount) playBeep();
    setPrevCount(newOrders.length);
    setOrders(newOrders);
  };
  useEffect(()=>{ fetchOrders(); const id=setInterval(fetchOrders,2500); const bc=new BroadcastChannel("restaurant-pos-realtime"); bc.onmessage=()=>fetchOrders(); return()=>{clearInterval(id); bc.close();} },[]);

  const update = async (id:string, status:string) => {
    await fetch(`/api/orders/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) });
    fetchOrders();
    try{new BroadcastChannel("restaurant-pos-realtime").postMessage({ type:`order.${status.toLowerCase()}` })}catch{}
  };

  const cols = {
    NEW: orders.filter(o=>["NEW","CONFIRMED"].includes(o.order.status)),
    PREPARING: orders.filter(o=>o.order.status==="PREPARING"),
    READY: orders.filter(o=>o.order.status==="READY"),
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tight">KITCHEN DISPLAY SYSTEM</h1>
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1 bg-blue-600 rounded-full">NEW: {cols.NEW.length}</span>
          <span className="px-3 py-1 bg-amber-600 rounded-full">PREP: {cols.PREPARING.length}</span>
          <span className="px-3 py-1 bg-emerald-600 rounded-full">READY: {cols.READY.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(cols).map(([colName, colOrders])=>(
          <div key={colName} className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <h2 className="font-black text-lg mb-3 tracking-widest">{colName}</h2>
            <div className="space-y-3">
              {colOrders.map(({ order, items, table }: any)=>(
                <div key={order.id} className="bg-white text-black rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-black text-lg">{order.order_number}</p>
                      <p className="text-sm font-bold">{table?.name} • {table?.section}</p>
                    </div>
                    <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{Math.floor((Date.now()-new Date(order.created_at).getTime())/60000)}m</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.map((it:any)=><div key={it.id} className="flex gap-2 text-lg font-bold"><span className="bg-black text-white w-8 h-8 rounded flex items-center justify-center text-sm">{it.quantity}</span><span>{it.item_name_snapshot}</span></div>)}
                  </div>
                  {order.notes && <p className="mt-2 text-sm bg-amber-100 p-2 rounded font-medium">NOTE: {order.notes}</p>}
                  <div className="mt-4">
                    {colName==="NEW" && <button onClick={()=>update(order.id,"PREPARING")} className="w-full bg-amber-500 text-black font-black py-3 rounded-xl text-lg">START PREPARING</button>}
                    {colName==="PREPARING" && <button onClick={()=>update(order.id,"READY")} className="w-full bg-emerald-500 text-white font-black py-3 rounded-xl text-lg">MARK READY</button>}
                    {colName==="READY" && <button onClick={()=>update(order.id,"SERVED")} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl text-lg">SERVED</button>}
                  </div>
                </div>
              ))}
              {colOrders.length===0 && <p className="text-white/30 text-center py-8 text-sm">No orders</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
