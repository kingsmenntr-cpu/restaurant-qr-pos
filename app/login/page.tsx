"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") || "OWNER";
  const [email, setEmail] = useState(role === "OWNER" ? "owner@restaurant.com" : role === "CASHIER" ? "cashier@restaurant.com" : "kitchen@restaurant.com");
  const [password, setPassword] = useState(role === "OWNER" ? "owner123" : role === "CASHIER" ? "cashier123" : "kitchen123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Login failed");
      const userRole = data.user.role;
      if (userRole === "OWNER") router.push("/owner");
      else if (userRole === "CASHIER") router.push("/cashier/orders");
      else if (userRole === "KITCHEN") router.push("/kitchen/display");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-md p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-bold">Staff Login</h1>
        <p className="text-white/50 text-sm mt-1">Role: {role}</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-sm mb-4">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/60 uppercase tracking-widest">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50" placeholder="email" />
        </div>
        <div>
          <label className="text-xs text-white/60 uppercase tracking-widest">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50" placeholder="password" />
        </div>
        <Button onClick={handleLogin} disabled={loading} className="w-full" size="lg">{loading ? "Signing in..." : "Sign In"}</Button>
        <div className="text-xs text-white/30 space-y-1">
          <p>Demo Accounts:</p>
          <p>Owner: owner@restaurant.com / owner123</p>
          <p>Cashier: cashier@restaurant.com / cashier123</p>
          <p>Kitchen: kitchen@restaurant.com / kitchen123</p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-white/50">Loading...</div>}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
