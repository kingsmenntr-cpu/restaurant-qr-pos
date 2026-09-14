"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [payment, setPayment] = useState<any>({ upi_enabled:true, upi_id:"", merchant_name:"" });
  const [tax, setTax] = useState<any>({ enabled:true, cgst_rate:2.5, sgst_rate:2.5, igst_rate:0 });
  const [restaurant, setRestaurant] = useState<any>({ name:"", address:"", phone:"" });

  const fetchData = async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setPayment(data.payment); setTax(data.tax); setRestaurant(data.restaurant);
  };
  useEffect(()=>{ fetchData(); },[]);

  const savePayment = async () => {
    await fetch("/api/settings/payment", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payment) });
    alert("Payment settings saved");
  };
  const saveTax = async () => {
    await fetch("/api/settings/tax", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(tax) });
    alert("Tax settings saved");
  };
  const saveRestaurant = async () => {
    await fetch("/api/settings/restaurant", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(restaurant) });
    alert("Restaurant settings saved");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-black">Settings</h1>

      <GlassCard className="p-5">
        <h3 className="font-bold mb-4">Restaurant</h3>
        <div className="space-y-3">
          <input value={restaurant.name} onChange={e=>setRestaurant({...restaurant,name:e.target.value})} placeholder="Restaurant Name" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          <input value={restaurant.address} onChange={e=>setRestaurant({...restaurant,address:e.target.value})} placeholder="Address" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          <input value={restaurant.phone} onChange={e=>setRestaurant({...restaurant,phone:e.target.value})} placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          <Button onClick={saveRestaurant}>Save Restaurant</Button>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="font-bold mb-4">UPI Payment Settings • BR-021</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={payment.upi_enabled} onChange={e=>setPayment({...payment,upi_enabled:e.target.checked})} /> UPI Enabled</label>
          <input value={payment.upi_id} onChange={e=>setPayment({...payment,upi_id:e.target.value})} placeholder="UPI ID e.g. agrafoods@upi" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          <input value={payment.merchant_name} onChange={e=>setPayment({...payment,merchant_name:e.target.value})} placeholder="Merchant Name" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          <p className="text-xs text-white/40">UPI QR Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR</p>
          <Button onClick={savePayment}>Save UPI</Button>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="font-bold mb-4">GST / Tax Settings • BR-015</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={tax.enabled} onChange={e=>setTax({...tax,enabled:e.target.checked})} /> Tax Enabled</label>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-white/50">CGST %</label><input type="number" value={tax.cgst_rate} onChange={e=>setTax({...tax,cgst_rate:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" /></div>
            <div><label className="text-xs text-white/50">SGST %</label><input type="number" value={tax.sgst_rate} onChange={e=>setTax({...tax,sgst_rate:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" /></div>
            <div><label className="text-xs text-white/50">IGST %</label><input type="number" value={tax.igst_rate} onChange={e=>setTax({...tax,igst_rate:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" /></div>
          </div>
          <Button onClick={saveTax}>Save Tax</Button>
        </div>
      </GlassCard>
    </div>
  );
}
