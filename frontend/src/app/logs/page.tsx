"use client";

import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useSocket, LogEntry } from "../../hooks/useSocket";
import { Filter, ScrollText, Search } from "lucide-react";

export default function LogsPage() {
  const { logs } = useSocket();
  const [filter, setFilter] = useState<string>("Semua");
  const [search, setSearch] = useState("");

  const categories = [
    "Semua",
    "BME680",
    "MQ7",
    "DUST1",
    "DUST2",
    "TURBIDITY",
    "Sistem",
  ];

  // Menentukan kategori setiap log berdasarkan isinya
  const getLogCategory = (log: LogEntry) => {
    const msg = log.msg.toUpperCase();
    if (msg.includes("BME680")) return "BME680";
    if (msg.includes("MQ7")) return "MQ7";
    if (msg.includes("DUST1")) return "DUST1";
    if (msg.includes("DUST2")) return "DUST2";
    if (msg.includes("TURBIDITY")) return "TURBIDITY";
    if (
      msg.includes("POMPA") ||
      msg.includes("BLOWER") ||
      msg.includes("SERVER") ||
      msg.includes("MENGIRIM")
    )
      return "Sistem";
    return "Lainnya";
  };

  const filteredLogs = logs.filter((log) => {
    // 1. Filter Kategori
    const categoryMatch = filter === "Semua" || getLogCategory(log) === filter;

    // 2. Filter Pencarian Teks
    const searchMatch = log.msg.toLowerCase().includes(search.toLowerCase());

    return categoryMatch && searchMatch;
  });

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar />
      <main className="ml-0 md:ml-52 flex-1 min-h-screen p-5 flex flex-col">
        <div className="mb-6 pt-14 md:pt-0">
          <h1 className="font-mono text-lg font-semibold text-text tracking-wide">
            Riwayat <span className="text-accent">Log Aktivitas</span>
          </h1>
          <p className="text-[11px] text-dim mt-0.5">
            Memantau seluruh perubahan sensor dan status perangkat
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-dim mr-2" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  filter === cat
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-surface border border-border text-soft hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
            />
            <input
              type="text"
              placeholder="Cari log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-mono text-text focus:outline-none focus:border-accent w-48"
            />
          </div>
        </div>

        {/* Tabel Log */}
        <div className="bg-card border border-border rounded-xl flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border bg-surface/50 font-mono text-[10px] text-dim uppercase tracking-widest">
            <div className="col-span-2">Waktu</div>
            <div className="col-span-2">Kategori</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-7">Pesan Aktivitas</div>
          </div>

          <div className="overflow-y-auto p-2 flex-1 max-h-[60vh]">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const isError = log.type === "error";
                const isWarn = log.type === "warn";
                const statusColor = isError
                  ? "text-danger bg-danger/10 border-danger/20"
                  : isWarn
                    ? "text-amber bg-amber/10 border-amber/20"
                    : "text-success bg-success/10 border-success/20";

                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border/50 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <div className="col-span-2 font-mono text-[11px] text-soft">
                      {log.time}
                    </div>
                    <div className="col-span-2 font-mono text-[10px] text-muted">
                      {getLogCategory(log)}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono border ${statusColor} uppercase tracking-wider`}
                      >
                        {log.type}
                      </span>
                    </div>
                    <div
                      className={`col-span-7 font-mono text-[11px] ${isError ? "text-danger" : isWarn ? "text-amber" : "text-text"}`}
                    >
                      {log.msg}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-dim">
                <ScrollText size={32} className="mb-3 opacity-20" />
                <p className="font-mono text-xs">
                  Tidak ada log yang sesuai dengan filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
