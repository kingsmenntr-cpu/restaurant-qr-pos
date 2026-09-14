"use client";
import { useEffect, useState } from "react";
import { GlassCard, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import Link from "next/link";

export default function OwnerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      setStats(data.stats);
      setOrders(data.recentOrders || []);
      setTables(data.tables || []);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 3000);
    const bc = new BroadcastChannel("restaurant-pos-realtime");
    bc.onmessage = () => fetchData();
    return () => { clearInterval(id); bc.close(); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-white/50">Live restaurant overview • Auto-refresh every 3s</p>
        </div>
        <div className="flex gap-2">
          <Link href="/owner/tables"><Button variant="secondary">Tables</Button></Link>
          <Link href="/owner/billing"><Button>Billing</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Active Tables" value={stats?.activeTables ?? "-"} icon="🪑" />
        <StatCard title="Available" value={stats?.availableTables ?? "-"} icon="✅" />
        <StatCard title="New Orders" value={stats?.newOrders ?? "-"} icon="🔥" />
        <StatCard title="Waiter Calls" value={stats?.waiterOpen ?? "-"} icon="🔔" />
        <StatCard title="Preparing" value={stats?.preparing ?? "-"} icon="👨‍🍳" />
        <StatCard title="Ready" value={stats?.ready ?? "-"} icon="✅" />
        <StatCard title="Today Revenue" value={stats?.revenue ? formatINR(stats.revenue) : "-"} icon="💰" />
        <StatCard title="Total Orders" value={stats?.totalOrders ?? "-"} icon="🧾" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-5">
          <h3 className="font-bold mb-4">Live Orders</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {orders.length===0 && <p className="text-white/40 text-sm">No recent orders</p>}
            {orders.map((o:any)=>(
              <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="font-mono text-sm font-bold">{o.order_number} • {o.table_name}</p>
                  <p className="text-xs text-white/50">{o.items_count} items • {formatINR(o.total_amount)} • {o.status}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${o.status==="NEW" ? "bg-blue-500/20 text-blue-300" : o.status==="PREPARING" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>{o.status}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="font-bold mb-4">Table Status</h3>
          <div className="grid grid-cols-3 gap-3">
            {tables.map((t:any)=>(
              <div key={t.table.id} className={`p-3 rounded-xl border text-center ${t.table.status==="AVAILABLE" ? "bg-emerald-500/10 border-emerald-500/20" : t.table.status==="OCCUPIED" ? "bg-blue-500/10 border-blue-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                <p className="font-bold">{t.table.name}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-60">{t.table.status}</p>
                <p className="text-xs mt-1">{t.table.capacity} seats</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
