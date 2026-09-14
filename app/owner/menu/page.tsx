"use client";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [newCat, setNewCat] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<any>({ name:"", price:0, category_id:"", description:"", veg_type:"VEG", available:true });

  const fetchData = async () => {
    const res = await fetch("/api/menu");
    const data = await res.json();
    setCategories(data.categories||[]);
    setItems(data.items||[]);
    if (data.categories?.[0] && !itemForm.category_id) setItemForm((f:any)=>({...f, category_id: data.categories[0].id}));
  };
  useEffect(()=>{ fetchData(); },[]);

  const createCategory = async () => {
    if (!newCat) return;
    await fetch("/api/menu/categories", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name:newCat }) });
    setNewCat(""); fetchData();
  };
  const createItem = async () => {
    const res = await fetch("/api/menu/items", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(itemForm) });
    if (res.ok) { setShowItemForm(false); setItemForm({ name:"", price:0, category_id:categories[0]?.id||"", description:"", veg_type:"VEG", available:true }); fetchData(); }
    else { const d=await res.json(); alert(d.error?.message); }
  };
  const toggleAvail = async (id:string) => {
    await fetch(`/api/menu/items/${id}/toggle`, { method:"POST" });
    fetchData();
  };
  const deleteItem = async (id:string) => {
    if (!confirm("Delete item?")) return;
    await fetch(`/api/menu/items/${id}`, { method:"DELETE" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Menu Management</h1>
        <Button onClick={()=>setShowItemForm(!showItemForm)}>+ New Item</Button>
      </div>

      <GlassCard className="p-5">
        <h3 className="font-bold mb-3">Categories</h3>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c=><span key={c.id} className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-sm">{c.name}</span>)}
        </div>
        <div className="flex gap-2 mt-4">
          <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="New category" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10" />
          <Button size="sm" onClick={createCategory}>Add</Button>
        </div>
      </GlassCard>

      {showItemForm && (
        <GlassCard className="p-5">
          <h3 className="font-bold mb-3">New Menu Item</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})} placeholder="Name" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
            <input type="number" value={itemForm.price} onChange={e=>setItemForm({...itemForm,price:parseFloat(e.target.value)||0})} placeholder="Price" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
            <select value={itemForm.category_id} onChange={e=>setItemForm({...itemForm,category_id:e.target.value})} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
              {categories.map(c=><option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
            </select>
            <select value={itemForm.veg_type} onChange={e=>setItemForm({...itemForm,veg_type:e.target.value})} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <option value="VEG">VEG</option><option value="NON_VEG">NON_VEG</option><option value="EGG">EGG</option>
            </select>
            <input value={itemForm.description} onChange={e=>setItemForm({...itemForm,description:e.target.value})} placeholder="Description" className="md:col-span-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10" />
          </div>
          <div className="mt-3 flex gap-2"><Button onClick={createItem}>Create</Button><Button variant="ghost" onClick={()=>setShowItemForm(false)}>Cancel</Button></div>
        </GlassCard>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item=>(
          <GlassCard key={item.id} className="p-4">
            <div className="flex gap-3">
              <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-bold text-sm">{item.name} {item.bestseller && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">BEST</span>}</p>
                <p className="text-xs text-white/50">{categories.find(c=>c.id===item.category_id)?.name} • {item.veg_type}</p>
                <p className="font-bold mt-1">{formatINR(item.price)}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant={item.available ? "secondary" : "danger"} onClick={()=>toggleAvail(item.id)}>{item.available ? "Available" : "Unavailable"}</Button>
              <Button size="sm" variant="ghost" onClick={()=>deleteItem(item.id)}>Delete</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
