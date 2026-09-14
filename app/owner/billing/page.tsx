"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR, calculateUpiQrAmount, generateUpiPayload } from "@/lib/utils";

export default function BillingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [payments, setPayments] = useState({ cash: 0, upi: 0 });
  const [qrData, setQrData] = useState<any>(null);

  const fetchSessions = async () => {
    const res = await fetch("/api/billing/sessions");
    const data = await res.json();
    setSessions(data.sessions||[]);
  };
  useEffect(()=>{ fetchSessions(); const id=setInterval(fetchSessions,3000); return()=>clearInterval(id); },[]);

  const loadBillData = async (sessionId:string) => {
    const res = await fetch(`/api/billing/session/${sessionId}`);
    const data = await res.json();
    setSelected(data);
    setBill(null);
    setQrData(null);
    setPayments({ cash:0, upi:0 });
  };

  const createBill = async () => {
    if (!selected) return;
    const res = await fetch("/api/billing/create", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ table_session_id: selected.session.id }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error?.message); return; }
    setBill(data.bill);
    setSelected({ ...selected, grandTotal: data.bill.grand_total });
    fetchSessions();
  };

  const applyPayments = async () => {
    if (!bill) return;
    const res = await fetch(`/api/billing/${bill.id}/payments`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payments) });
    const data = await res.json();
    if (!res.ok) { alert(data.error?.message); return; }
    setQrData(data);
  };

  const completeBill = async () => {
    if (!bill) return;
    const res = await fetch(`/api/billing/${bill.id}/complete`, { method:"POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error?.message); return; }
    alert("Bill completed, table released!");
    setBill(null); setSelected(null); setQrData(null); fetchSessions();
  };

  const printBill = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Billing • Cash / UPI / Split</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-4">
            <h3 className="font-bold mb-3">Occupied Tables</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {sessions.map((s:any)=>(
                <button key={s.session.id} onClick={()=>loadBillData(s.session.id)} className={`w-full text-left p-3 rounded-xl border transition ${selected?.session.id===s.session.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <p className="font-bold">{s.table?.name} • {s.session.id.slice(0,6)}</p>
                  <p className="text-xs opacity-70">{s.unpaidOrders.length} orders • {formatINR(s.grandTotal)}</p>
                  <p className={`text-[10px] mt-1 px-1.5 py-0.5 rounded-full inline-block ${s.session.status==="BILL_PENDING" ? "bg-amber-500/20 text-amber-700" : "bg-blue-500/20 text-blue-700"}`}>{s.session.status}</p>
                </button>
              ))}
              {sessions.length===0 && <p className="text-white/40 text-sm">No active sessions</p>}
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected && <GlassCard className="p-8 text-center text-white/50">Select a table session to start billing</GlassCard>}

          {selected && (
            <>
              <GlassCard className="p-5">
                <h3 className="font-bold">Session • {selected.table?.name} • {selected.session.id.slice(0,8)}</h3>
                <div className="mt-3 space-y-2">
                  {selected.orders.map((o:any)=>(
                    <div key={o.order.id} className="bg-white/5 p-3 rounded-xl flex justify-between text-sm">
                      <span>{o.order.order_number} • {o.items.map((i:any)=>`${i.item_name_snapshot} x${i.quantity}`).join(", ")}</span>
                      <span>{formatINR(o.order.total_amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t border-white/10 pt-3">
                    <span>Subtotal</span><span>{formatINR(selected.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/60"><span>Tax</span><span>{formatINR(selected.tax)}</span></div>
                  <div className="flex justify-between font-black text-lg"><span>Grand Total</span><span>{formatINR(selected.grandTotal)}</span></div>
                </div>
                {!bill && <Button onClick={createBill} className="mt-4 w-full">Create Bill • {formatINR(selected.grandTotal)}</Button>}
              </GlassCard>

              {bill && (
                <GlassCard className="p-5">
                  <h3 className="font-bold">Bill {bill.bill_number} • {formatINR(bill.grand_total)}</h3>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/50">Cash Amount</label>
                      <input type="number" value={payments.cash} onChange={e=>setPayments({...payments,cash:parseFloat(e.target.value)||0})} className="mt-1 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/50">UPI Amount</label>
                      <input type="number" value={payments.upi} onChange={e=>setPayments({...payments,upi:parseFloat(e.target.value)||0})} className="mt-1 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" placeholder="0" />
                    </div>
                  </div>
                  <p className="text-xs mt-2 text-white/50">Total: {formatINR(payments.cash + payments.upi)} / {formatINR(bill.grand_total)} {payments.cash+payments.upi!==bill.grand_total && <span className="text-red-300">• Mismatch!</span>}</p>
                  <p className="text-xs mt-1 text-amber-200">UPI QR will be: {formatINR(calculateUpiQrAmount(payments, bill.grand_total))} (Rule: split→UPI portion, otherwise→full)</p>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={applyPayments}>Apply Payments & Generate QR</Button>
                    <Button variant="secondary" onClick={printBill}>Print Preview</Button>
                  </div>

                  {qrData && (
                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                      <div className="bg-white text-black p-4 rounded-xl print-area">
                        <div className="text-center border-b border-dashed border-black pb-2">
                          <h2 className="font-black">Agra Foods</h2>
                          <p className="text-[10px]">Near Taj Mahal, Agra</p>
                          <p className="text-[10px]">Bill: {bill.bill_number}</p>
                          <p className="text-[10px]">Table: {selected.table?.name}</p>
                        </div>
                        <div className="py-2 space-y-1 text-[11px]">
                          {selected.orders.map((o:any)=>o.items.map((it:any)=><div key={it.id} className="flex justify-between"><span>{it.item_name_snapshot} x{it.quantity}</span><span>{formatINR(it.line_total)}</span></div>))}
                          <div className="flex justify-between border-t border-dashed pt-1"><span>Subtotal</span><span>{formatINR(selected.subtotal)}</span></div>
                          <div className="flex justify-between"><span>Tax</span><span>{formatINR(selected.tax)}</span></div>
                          <div className="flex justify-between font-bold"><span>Grand Total</span><span>{formatINR(bill.grand_total)}</span></div>
                          <div className="flex justify-between"><span>Cash</span><span>{formatINR(payments.cash)}</span></div>
                          <div className="flex justify-between"><span>UPI</span><span>{formatINR(payments.upi)}</span></div>
                        </div>
                        <div className="text-center border-t border-dashed pt-2">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.upiPayload || "")}`} alt="UPI QR" className="w-32 h-32 mx-auto" />
                          <p className="text-[10px] mt-1">UPI QR Amount: {formatINR(qrData.qrAmount)}</p>
                          <p className="text-[8px] break-all">{qrData.upiPayload}</p>
                          <p className="text-[10px] mt-2">Thank You! Visit Again</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold mb-2">UPI QR Preview</p>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.upiPayload || "")}`} alt="QR" className="bg-white p-2 rounded-xl" />
                        <p className="text-xs mt-2">Amount: {formatINR(qrData.qrAmount)}</p>
                        <p className="text-[10px] text-white/40 break-all mt-1">{qrData.upiPayload}</p>
                        <Button onClick={completeBill} className="mt-4 w-full" variant="primary">Complete Bill & Release Table</Button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
