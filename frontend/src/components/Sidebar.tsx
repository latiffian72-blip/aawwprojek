"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wind,
  Flame,
  Droplets,
  Fan,
  Cpu,
  ScrollText,
  Menu,
  X,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-20 p-2.5 bg-card border border-border rounded-xl shadow-sm text-text hover:bg-surface transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-text/20 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar w-64 md:w-52 min-h-screen flex flex-col fixed top-0 left-0 z-40 py-6 px-4 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-5 right-4 p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

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

        <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mb-1 group ${pathname === '/' ? 'bg-accent/10 text-accent' : 'hover:bg-accent/8 text-soft'}`}
          >
            <LayoutDashboard
              size={16}
              className={`${pathname === '/' ? 'text-accent' : 'text-dim group-hover:text-accent'} transition-colors`}
            />
            <span className={`text-xs font-semibold transition-colors ${pathname === '/' ? 'text-accent' : 'group-hover:text-accent'}`}>
              Dashboard
            </span>
          </Link>

          <Link
            href="/logs"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mb-4 group ${pathname === '/logs' ? 'bg-accent/10 text-accent' : 'hover:bg-accent/8 text-soft'}`}
          >
            <ScrollText
              size={16}
              className={`${pathname === '/logs' ? 'text-accent' : 'text-dim group-hover:text-accent'} transition-colors`}
            />
            <span className={`text-xs font-semibold transition-colors ${pathname === '/logs' ? 'text-accent' : 'group-hover:text-accent'}`}>
              Log Aktivitas
            </span>
          </Link>

          <p className="font-sans text-[9px] text-muted uppercase tracking-widest px-3 py-1 font-semibold">
            Sensor
          </p>
          <SidebarItem icon={<Wind size={14} />} label="BME680 (VOC)" color="bg-accent" />
          <SidebarItem icon={<Flame size={14} />} label="Kadar CO" color="bg-purple-400" delay="0.5s" />
          <SidebarItem icon={<Droplets size={14} />} label="Dust 1 (Kontrol)" color="bg-amber" delay="0.9s" />
          <SidebarItem icon={<Droplets size={14} />} label="Dust 2 (Monitor)" color="bg-orange" delay="0.6s" />
          <SidebarItem icon={<Droplets size={14} />} label="Kekeruhan Air" color="bg-blue" delay="0.3s" />

          <p className="font-sans text-[9px] text-muted uppercase tracking-widest px-3 py-1 pt-4 font-semibold">
            Perangkat
          </p>
          <SidebarItem icon={<Fan size={14} />} label="Pompa & Blower" color="bg-success" delay="0.7s" />
        </nav>

        {/* Logout Button */}
        <div className="pt-4 mt-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-soft hover:text-red-600 transition-colors group"
          >
            <LogOut size={16} className="text-dim group-hover:text-red-500 transition-colors" />
            <span className="text-xs font-semibold transition-colors">Logout Keluar</span>
          </button>
        </div>
      </aside>
    </>
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
