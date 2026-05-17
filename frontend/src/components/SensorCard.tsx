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
}

const colorMap = {
  teal: { card: "card-teal", ring: "#00d4aa", bar: "bg-accent", status: "text-success", dot: "bg-success" },
  purple: { card: "card-purple", ring: "#8b5cf6", bar: "bg-purple-500", status: "text-success", dot: "bg-success" },
  amber: { card: "card-amber", ring: "#f59e0b", bar: "bg-amber", status: "text-amber", dot: "bg-amber" },
  blue: { card: "card-blue", ring: "#3b82f6", bar: "bg-blue", status: "text-success", dot: "bg-success" }
};

export default function SensorCard({
  id, name, label, value, unit, color, maxValue, goodThreshold, warnThreshold, goodLabel, warnLabel, badLabel
}: SensorCardProps) {
  const c = colorMap[color];
  const pct = Math.min((value / maxValue) * 100, 100);
  const ringOffset = 94.2 * (1 - pct / 100);
  
  let statusText = goodLabel;
  let statusColorClass = c.status;
  let dotClass = c.dot;
  let barColor = c.bar;

  if (value >= warnThreshold) {
    statusText = badLabel;
    statusColorClass = "text-danger";
    dotClass = "bg-danger";
    barColor = "bg-danger";
  } else if (value >= goodThreshold) {
    statusText = warnLabel;
    statusColorClass = "text-amber";
    dotClass = "bg-amber";
    barColor = "bg-amber";
  }

  return (
    <div className={`sensor-card ${color} card-accent ${c.card} bg-card border border-border rounded-xl p-4 relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-[8px] text-dim tracking-widest uppercase">{name}</p>
          <p className="text-[11px] font-medium text-soft mt-0.5">{label}</p>
        </div>
        <svg viewBox="0 0 40 40" className="gauge-ring w-9 h-9 flex-shrink-0">
          <circle cx="20" cy="20" r="15" fill="none" stroke="#1a2840" strokeWidth="3.5"/>
          <circle cx="20" cy="20" r="15" fill="none" stroke={c.ring} strokeWidth="3.5"
            strokeDasharray="94.2" strokeDashoffset={ringOffset} strokeLinecap="round"/>
        </svg>
      </div>
      
      <div className="mb-2">
        <span className="font-mono text-3xl font-semibold text-text">{Math.round(value)}</span>
        <span className="font-mono text-[10px] text-dim ml-1">{unit}</span>
      </div>
      
      <div className="h-1 bg-surface rounded-full mb-1.5 overflow-hidden">
        <div className={`bar-fill h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
      </div>
      
      <div className="flex justify-between text-[7px] font-mono text-muted mb-2">
        <span>0</span><span>{maxValue / 2}</span><span>{maxValue}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${dotClass} blink`}></div>
        <span className={`text-[9px] font-mono ${statusColorClass}`}>{statusText}</span>
      </div>
    </div>
  );
}
