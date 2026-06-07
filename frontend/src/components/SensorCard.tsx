import React from "react";

interface SensorCardProps {
  id: string;
  name: string;
  label: string;
  value: number;
  unit: string;
  color: "teal" | "purple" | "amber" | "blue";
  maxValue: number;
  goodThreshold: number;
  warnThreshold: number;
  goodLabel: string;
  warnLabel: string;
  badLabel: string;
  invertThreshold?: boolean;
}

const colorMap = {
  teal:   { card: "card-teal",   ring: "#14B8A6", bar: "bg-teal-500",   statusGood: "text-teal-600",   dotGood: "bg-teal-500" },
  purple: { card: "card-purple", ring: "#8B5CF6", bar: "bg-purple-500", statusGood: "text-purple-600", dotGood: "bg-purple-500" },
  amber:  { card: "card-amber",  ring: "#F59E0B", bar: "bg-amber",      statusGood: "text-success",    dotGood: "bg-success" },
  blue:   { card: "card-blue",   ring: "#0EA5E9", bar: "bg-blue",       statusGood: "text-blue",       dotGood: "bg-blue" },
};

const statusBadge = {
  good: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  warn: "bg-amber-50 text-amber-600 border border-amber-200",
  bad:  "bg-red-50 text-red-500 border border-red-200",
};

export default function SensorCard({
  id, name, label, value, unit, color, maxValue, goodThreshold, warnThreshold,
  goodLabel, warnLabel, badLabel, invertThreshold = false
}: SensorCardProps) {
  const c = colorMap[color];
  const pct = Math.min((value / maxValue) * 100, 100);
  const ringOffset = 94.2 * (1 - pct / 100);

  let statusText = goodLabel;
  let badgeClass = statusBadge.good;
  let barColor = c.bar;
  let ringColor = c.ring;

  if (invertThreshold) {
    if (value <= warnThreshold) {
      statusText = badLabel;
      badgeClass = statusBadge.bad;
      barColor = "bg-danger";
      ringColor = "#EF4444";
    } else if (value <= goodThreshold) {
      statusText = warnLabel;
      badgeClass = statusBadge.warn;
      barColor = "bg-amber";
      ringColor = "#F59E0B";
    }
  } else {
    if (value >= warnThreshold) {
      statusText = badLabel;
      badgeClass = statusBadge.bad;
      barColor = "bg-danger";
      ringColor = "#EF4444";
    } else if (value >= goodThreshold) {
      statusText = warnLabel;
      badgeClass = statusBadge.warn;
      barColor = "bg-amber";
      ringColor = "#F59E0B";
    }
  }

  return (
    <div className={`sensor-card ${color} card-accent ${c.card} bg-card border border-border rounded-2xl p-4 relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-sans text-[9px] text-dim tracking-widest uppercase font-semibold">{name}</p>
          <p className="text-[11px] font-medium text-soft mt-0.5">{label}</p>
        </div>
        <svg viewBox="0 0 40 40" className="gauge-ring w-9 h-9 flex-shrink-0">
          <circle cx="20" cy="20" r="15" fill="none" stroke="#E2E6F0" strokeWidth="3.5"/>
          <circle cx="20" cy="20" r="15" fill="none" stroke={ringColor} strokeWidth="3.5"
            strokeDasharray="94.2" strokeDashoffset={ringOffset} strokeLinecap="round"/>
        </svg>
      </div>

      <div className="mb-2">
        <span className="font-mono text-3xl font-semibold text-text">{value % 1 === 0 ? Math.round(value) : value.toFixed(1)}</span>
        <span className="font-mono text-[10px] text-muted ml-1.5">{unit}</span>
      </div>

      <div className="h-1.5 bg-surface rounded-full mb-1.5 overflow-hidden">
        <div className={`bar-fill h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
      </div>

      <div className="flex justify-between text-[7px] font-mono text-muted mb-3">
        <span>0</span><span>{maxValue / 2}</span><span>{maxValue}</span>
      </div>

      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-sans font-semibold uppercase tracking-wide ${badgeClass}`}>
        {statusText}
      </span>
    </div>
  );
}
