"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useRealtime";

export default function WaiterPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const { playBeep } = useSound(true);

  const fetchData = async () => {
    const res = await fetch("/api/waiter-requests");
    const data = await res.json();
    const prevOpen = requests.filter(r=>r.status==="OPEN").length;
    setRequests(data.requests||[]);
    const newOpen = (data.requests||[]).filter((r:any)=>r.status==="OPEN").length;
    if (newOpen > prevOpen) playBeep();
  };
  useEffect(()=>{ fetchData(); const id=setInterval(fetchData,3000); const bc=new BroadcastChannel("restaurant-pos-realtime"); bc.onmessage=()=>fetchData(); return()=>{clearInterval(id); bc.close();} },[]);

  const ack = async (id:string) => {
    await fetch(`/api/waiter-requests/${id}/ack`, { method:"POST" });
    fetchData();
  };
  const resolve = async (id:string) => {
    await fetch(`/api/waiter-requests/${id}/resolve`, { method:"POST" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Waiter Requests 🔔</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((r:any)=>(
          <GlassCard key={r.id} className={`p-4 ${r.status==="OPEN" ? "border-amber-500/30 bg-amber-500/5" : "opacity-60"}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{r.table?.name} • {r.table?.section}</p>
                <p className="text-xs text-white/50">{new Date(r.requested_at).toLocaleString()}</p>
                <p className="text-xs mt-1">Session: {r.table_session_id.slice(0,8)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${r.status==="OPEN" ? "bg-amber-500/20 text-amber-300 animate-pulse" : r.status==="ACKNOWLEDGED" ? "bg-blue-500/20 text-blue-300" : "bg-emerald-500/20 text-emerald-300"}`}>{r.status}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {r.status==="OPEN" && <Button size="sm" onClick={()=>ack(r.id)}>Acknowledge</Button>}
              {r.status!=="RESOLVED" && <Button size="sm" variant="secondary" onClick={()=>resolve(r.id)}>Resolve</Button>}
            </div>
          </GlassCard>
        ))}
        {requests.length===0 && <p className="text-white/40">No waiter requests</p>}
      </div>
    </div>
  );
}
