"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/owner", label: "Dashboard", icon: "📊" },
  { href: "/owner/orders", label: "Orders", icon: "🧾" },
  { href: "/owner/tables", label: "Tables & QR", icon: "🪑" },
  { href: "/owner/menu", label: "Menu", icon: "📋" },
  { href: "/owner/billing", label: "Billing", icon: "💳" },
  { href: "/owner/waiter", label: "Waiter", icon: "🔔" },
  { href: "/owner/kitchen", label: "Kitchen", icon: "👨‍🍳" },
  { href: "/owner/settings", label: "Settings", icon: "⚙️" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const fetchNotif = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        setNotifCount(data.unread || 0);
      } catch {}
    };
    fetchNotif();
    const id = setInterval(fetchNotif, 3000);
    return () => clearInterval(id);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-[280px] hidden md:flex flex-col p-4 gap-4 sticky top-0 h-screen">
        <div className="glass-strong rounded-[20px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-black">A</div>
            <div>
              <p className="font-bold">Agra Foods</p>
              <p className="text-xs text-white/50">Owner Panel</p>
            </div>
          </div>
        </div>
        <div className="glass-strong rounded-[20px] p-3 flex-1 overflow-y-auto scrollbar-thin">
          <nav className="space-y-1">
            {nav.map(item => {
              const active = pathname === item.href || (item.href !== "/owner" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${active ? "bg-white text-black font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                  <span>{item.icon}</span>{item.label}
                  {item.label === "Waiter" && notifCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifCount}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={logout} className="glass-strong rounded-xl p-3 text-sm text-white/60 hover:text-white">Logout</button>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-20 backdrop-blur-2xl bg-black/30 border-b border-white/10 p-3 flex items-center justify-between">
          <span className="font-bold">Agra Foods Owner</span>
          <div className="flex gap-2 overflow-x-auto">
            {nav.slice(0,4).map(n=><Link key={n.href} href={n.href} className="text-xs px-2 py-1 bg-white/10 rounded-full">{n.icon}</Link>)}
          </div>
        </div>
        <main className="p-4 md:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
