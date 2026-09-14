"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function GlassCard({ className, children, hover=false, ...props }: { className?: string; children: React.ReactNode; hover?: boolean } & any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-[20px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12] shadow-glass overflow-hidden",
        "before:absolute before:inset-0 before:rounded-[20px] before:bg-gradient-to-br before:from-white/[0.12] before:to-transparent before:pointer-events-none",
        hover && "hover:bg-white/[0.09] hover:shadow-glassHover hover:border-white/[0.18] transition-all duration-300",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function StatCard({ title, value, icon, trend, className }: { title: string; value: string | number; icon?: string; trend?: string; className?: string }) {
  return (
    <GlassCard className={cn("p-5", className)} hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-xs uppercase tracking-widest font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {trend && <p className="text-xs text-emerald-300 mt-1">{trend}</p>}
        </div>
        {icon && <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">{icon}</div>}
      </div>
    </GlassCard>
  );
}
