"use client";
import { useEffect, useState } from "react";
import { GlassCard, StatCard } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ fetch("/api/reports").then(r=>r.json()).then(setData); },[]);
  if (!data) return <div className="p-6 text-white/50">Loading reports...</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Reports</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatINR(data.totalRevenue)} icon="💰" />
        <StatCard title="Total Bills" value={data.totalBills} icon="🧾" />
        <StatCard title="Avg Bill" value={formatINR(data.avgBill)} icon="📊" />
        <StatCard title="Total Orders" value={data.totalOrders} icon="🍽️" />
      </div>
      <GlassCard className="p-5">
        <h3 className="font-bold mb-3">Recent Bills</h3>
        <div className="space-y-2">
          {data.bills.slice(0,20).map((b:any)=><div key={b.id} className="flex justify-between bg-white/5 p-3 rounded-xl text-sm"><span>{b.bill_number} • {new Date(b.created_at).toLocaleDateString()}</span><span>{formatINR(b.grand_total)} • {b.status}</span></div>)}
        </div>
      </GlassCard>
    </div>
  );
}
