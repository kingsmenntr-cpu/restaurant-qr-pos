"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export default function CashierOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders||[]);
  };
  useEffect(()=>{ fetchOrders(); const id=setInterval(fetchOrders,3000); return()=>clearInterval(id); },[]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-black">Cashier • Live Orders</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.slice(0,12).map(({ order, items, table }: any)=>(
          <GlassCard key={order.id} className="p-4">
            <p className="font-mono font-bold">{order.order_number} • {table?.name}</p>
            <p className="text-xs text-white/50">{order.status} • {formatINR(order.total_amount)}</p>
            <div className="mt-2 text-sm">{items.map((i:any)=>`${i.item_name_snapshot} x${i.quantity}`).join(", ")}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
