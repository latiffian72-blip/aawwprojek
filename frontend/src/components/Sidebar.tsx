import React from "react";
import Link from "next/link";
import { LayoutDashboard, Wind, Flame, Droplets, Fan, Settings, Cpu, ScrollText } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar hidden md:flex w-52 min-h-screen flex-col fixed top-0 left-0 z-20 py-6 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
            <Cpu size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-accent tracking-widest leading-none">ASAP</p>
            <p className="font-mono text-[8px] text-dim tracking-widest leading-none mt-0.5">MONITOR</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors mb-1 group">
          <LayoutDashboard size={16} className="text-soft group-hover:text-accent transition-colors" />
          <span className="text-xs font-medium text-soft group-hover:text-accent transition-colors">Dashboard</span>
        </Link>
        
        <Link href="/logs" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors mb-4 group">
          <ScrollText size={16} className="text-soft group-hover:text-accent transition-colors" />
          <span className="text-xs font-medium text-soft group-hover:text-accent transition-colors">Log Aktivitas</span>
        </Link>

        <p className="font-mono text-[8px] text-muted uppercase tracking-widest px-3 py-1">Sensor</p>
        <SidebarItem icon={<Wind size={14} />} label="Kualitas Udara" color="bg-accent" />
        <SidebarItem icon={<Flame size={14} />} label="Kadar CO" color="bg-purple-400" delay="0.5s" />
        <SidebarItem icon={<Droplets size={14} />} label="Partikel PM2.5" color="bg-amber" delay="0.9s" />
        <SidebarItem icon={<Droplets size={14} />} label="Kekeruhan Air" color="bg-blue" delay="0.3s" />

        <p className="font-mono text-[8px] text-muted uppercase tracking-widest px-3 py-1 pt-4">Perangkat</p>
        <SidebarItem icon={<Fan size={14} />} label="Pompa & Blower" color="bg-success" delay="0.7s" />
        <SidebarItem icon={<Settings size={14} />} label="Pengaturan" color="bg-dim" delay="0s" />
      </nav>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success blink"></div>
          <span className="font-mono text-[9px] text-success tracking-wider">SISTEM ONLINE</span>
        </div>
        <p className="font-mono text-[8px] text-muted">v2.0.0 · Next.js</p>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, color, delay = "0s" }: { icon: React.ReactNode; label: string; color: string; delay?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0 blink`} style={{ animationDelay: delay }}></div>
      <span className="text-[11px] text-soft flex items-center gap-2">
        <span className="opacity-50">{icon}</span>
        {label}
      </span>
    </div>
  );
}
