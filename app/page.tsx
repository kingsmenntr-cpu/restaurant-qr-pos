"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <motion.h1 initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-5xl md:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Agra Foods</span>
            <span className="block text-2xl md:text-3xl font-light mt-2 text-white/60">Royal Taste • QR POS</span>
          </motion.h1>
          <p className="mt-6 text-white/50 max-w-2xl mx-auto text-lg">Scan • Order • Track • Pay — Real-time restaurant operating system with glassmorphism design, 58mm thermal printing & dynamic UPI QR</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard className="p-6" hover>
            <div className="text-4xl mb-4">🍽️</div>
            <h3 className="font-bold text-lg">Owner Dashboard</h3>
            <p className="text-white/50 text-sm mt-2">Full control: tables, menu, orders, billing, KDS, reports, settings</p>
            <Link href="/login?role=OWNER" className="mt-4 block"><Button className="w-full">Login as Owner</Button></Link>
            <p className="text-xs text-white/30 mt-2">owner@restaurant.com / owner123</p>
          </GlassCard>
          <GlassCard className="p-6" hover>
            <div className="text-4xl mb-4">💳</div>
            <h3 className="font-bold text-lg">Cashier</h3>
            <p className="text-white/50 text-sm mt-2">Billing, Cash/UPI/Split, printing, live orders, waiter requests</p>
            <Link href="/login?role=CASHIER" className="mt-4 block"><Button variant="secondary" className="w-full">Login as Cashier</Button></Link>
            <p className="text-xs text-white/30 mt-2">cashier@restaurant.com / cashier123</p>
          </GlassCard>
          <GlassCard className="p-6" hover>
            <div className="text-4xl mb-4">👨‍🍳</div>
            <h3 className="font-bold text-lg">Kitchen Display</h3>
            <p className="text-white/50 text-sm mt-2">NEW → PREPARING → READY, sound alerts, large cards</p>
            <Link href="/login?role=KITCHEN" className="mt-4 block"><Button variant="glass" className="w-full">Kitchen Login</Button></Link>
            <p className="text-xs text-white/30 mt-2">kitchen@restaurant.com / kitchen123</p>
          </GlassCard>
        </div>

        <GlassCard className="mt-8 p-6">
          <h4 className="font-semibold">📱 Customer Demo QR</h4>
          <p className="text-white/50 text-sm mt-1">Scan a table QR to experience customer flow. Go to Owner → Tables to download/print QR.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/owner/tables"><Button variant="secondary">View Tables & QR</Button></Link>
            <Link href="/kitchen/display"><Button variant="ghost">Open KDS</Button></Link>
          </div>
        </GlassCard>

        <div className="mt-8 text-center text-white/20 text-xs">
          V1 • Modular Monolith • Next.js • Supabase Ready • 58mm Thermal • UPI Dynamic QR • BR-001 to BR-030 Implemented
        </div>
      </motion.div>
    </div>
  );
}
