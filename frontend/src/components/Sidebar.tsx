import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Wind,
  Flame,
  Droplets,
  Fan,
  Settings,
  Cpu,
  ScrollText,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar hidden md:flex w-52 min-h-screen flex-col fixed top-0 left-0 z-20 py-6 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Cpu size={18} className="text-accent" />
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-accent tracking-widest leading-none">
              ASAP
            </p>
            <p className="font-sans text-[9px] text-dim tracking-widest leading-none mt-0.5 font-medium">
              MONITOR
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/8 transition-colors mb-1 group"
        >
          <LayoutDashboard
            size={16}
            className="text-dim group-hover:text-accent transition-colors"
          />
          <span className="text-xs font-semibold text-soft group-hover:text-accent transition-colors">
            Dashboard
          </span>
        </Link>

        <Link
          href="/logs"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/8 transition-colors mb-4 group"
        >
          <ScrollText
            size={16}
            className="text-dim group-hover:text-accent transition-colors"
          />
          <span className="text-xs font-semibold text-soft group-hover:text-accent transition-colors">
            Log Aktivitas
          </span>
        </Link>

        <p className="font-sans text-[9px] text-muted uppercase tracking-widest px-3 py-1 font-semibold">
          Sensor
        </p>
        <SidebarItem
          icon={<Wind size={14} />}
          label="Kualitas Udara"
          color="bg-accent"
        />
        <SidebarItem
          icon={<Flame size={14} />}
          label="Kadar CO"
          color="bg-purple-400"
          delay="0.5s"
        />
        <SidebarItem
          icon={<Droplets size={14} />}
          label="Partikel PM2.5"
          color="bg-amber"
          delay="0.9s"
        />
        <SidebarItem
          icon={<Droplets size={14} />}
          label="Kekeruhan Air"
          color="bg-blue"
          delay="0.3s"
        />

        <p className="font-sans text-[9px] text-muted uppercase tracking-widest px-3 py-1 pt-4 font-semibold">
          Perangkat
        </p>
        <SidebarItem
          icon={<Fan size={14} />}
          label="Pompa & Blower"
          color="bg-success"
          delay="0.7s"
        />
      </nav>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  color,
  delay = "0s",
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  delay?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent/8 cursor-pointer transition-colors">
      <div
        className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0 blink`}
        style={{ animationDelay: delay }}
      ></div>
      <span className="text-[11px] text-soft flex items-center gap-2 font-medium">
        <span className="opacity-40">{icon}</span>
        {label}
      </span>
    </div>
  );
}
