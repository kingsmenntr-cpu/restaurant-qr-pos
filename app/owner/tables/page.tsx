"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { formatINR } from "@/lib/utils";

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: 2, section: "Indoor" });

  const fetchTables = async () => {
    const res = await fetch("/api/tables");
    const data = await res.json();
    setTables(data.tables || []);
  };
  useEffect(()=>{ fetchTables(); const id=setInterval(fetchTables,3000); return()=>clearInterval(id); },[]);

  const createTable = async () => {
    const res = await fetch("/api/tables", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
    if (res.ok) { setShowCreate(false); setForm({ name:"", capacity:2, section:"Indoor" }); fetchTables(); }
    else { const d=await res.json(); alert(d.error?.message); }
  };

  const regenQr = async (id:string) => {
    const res = await fetch(`/api/tables/${id}/qr/regenerate`, { method:"POST" });
    if (res.ok) fetchTables();
  };

  const downloadQr = async (table:any) => {
    if (!table.qr) return;
    const url = `${window.location.origin}/t/${table.qr.token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400 });
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-${table.table.name}.png`;
    a.click();
  };

  const printQr = async (table:any) => {
    if (!table.qr) return;
    const url = `${window.location.origin}/t/${table.qr.token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300 });
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><style>
        body{font-family:monospace; text-align:center; padding:10mm}
        .box{width:58mm; margin:auto; border:1px dashed #000; padding:5mm}
        img{width:50mm; height:50mm}
      </style></head><body>
        <div class="box">
          <h2>${table.table.name}</h2>
          <p>Section: ${table.table.section} | Capacity: ${table.table.capacity}</p>
          <img src="${qrDataUrl}" />
          <p style="font-size:10px; word-break:break-all">${url}</p>
          <p>Scan to Order</p>
        </div>
        <script>window.print()</script>
      </body></html>
    `);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Tables & QR</h1>
        <Button onClick={()=>setShowCreate(!showCreate)}>+ New Table</Button>
      </div>

      {showCreate && (
        <GlassCard className="p-5">
          <h3 className="font-bold mb-3">Create Table</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Table Name e.g. T-13" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
            <input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:parseInt(e.target.value)||1})} placeholder="Capacity" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
            <input value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="Section" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          </div>
          <div className="mt-3 flex gap-2"><Button onClick={createTable}>Create</Button><Button variant="ghost" onClick={()=>setShowCreate(false)}>Cancel</Button></div>
        </GlassCard>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((t:any)=>(
          <GlassCard key={t.table.id} className="p-4" hover>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{t.table.name}</p>
                <p className="text-xs text-white/50">{t.table.section} • {t.table.capacity} seats</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${t.table.status==="AVAILABLE" ? "bg-emerald-500/20 text-emerald-300" : t.table.status==="OCCUPIED" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}`}>{t.table.status}</span>
            </div>
            <div className="mt-3 bg-white p-2 rounded-xl flex justify-center">
              {t.qr ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${typeof window!=="undefined" ? window.location.origin : ""}/t/${t.qr.token}`)}`} alt="QR" className="w-32 h-32" /> : <span className="text-black text-xs">No QR</span>}
            </div>
            <p className="text-[10px] text-white/30 mt-2 truncate">{t.qr?.token.slice(0,24)}...</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" onClick={()=>downloadQr(t)}>Download</Button>
              <Button size="sm" variant="glass" onClick={()=>printQr(t)}>Print 58mm</Button>
              <Button size="sm" variant="ghost" onClick={()=>regenQr(t.table.id)}>Regen</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
