"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";

export default function CashierTables() {
  const [tables, setTables] = useState<any[]>([]);
  useEffect(()=>{ fetch("/api/tables").then(r=>r.json()).then(d=>setTables(d.tables||[])); const id=setInterval(()=>fetch("/api/tables").then(r=>r.json()).then(d=>setTables(d.tables||[])),3000); return()=>clearInterval(id); },[]);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-black">Tables Overview</h1>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {tables.map((t:any)=><GlassCard key={t.table.id} className="p-3 text-center"><p className="font-bold">{t.table.name}</p><p className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${t.table.status==="AVAILABLE" ? "bg-emerald-500/20 text-emerald-300" : t.table.status==="OCCUPIED" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}`}>{t.table.status}</p></GlassCard>)}
      </div>
    </div>
  );
}
