"use client";
import { GlassCard } from "@/components/ui/card";

export default function StaffPage() {
  const staff = [
    { name:"Owner", email:"owner@restaurant.com", role:"OWNER", active:true },
    { name:"Cashier", email:"cashier@restaurant.com", role:"CASHIER", active:true },
    { name:"Kitchen", email:"kitchen@restaurant.com", role:"KITCHEN", active:true },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Staff Management</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {staff.map(s=><GlassCard key={s.email} className="p-5"><p className="font-bold">{s.name}</p><p className="text-sm text-white/50">{s.email}</p><p className="text-xs mt-2 px-2 py-1 bg-white/10 rounded-full inline-block">{s.role}</p></GlassCard>)}
      </div>
      <GlassCard className="p-5"><p className="text-sm text-white/50">V1: Staff management is seeded. Add/edit staff UI can be added later. RLS ensures tenant isolation.</p></GlassCard>
    </div>
  );
}
