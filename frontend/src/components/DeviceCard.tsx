import React from "react";

interface DeviceCardProps {
  id: string;
  name: string;
  label: string;
  isOn: boolean;
  color: "green" | "orange";
  statusText: string;
  meta: string;
  value: number;
  unit: string;
  onToggle: () => void;
  isBlower?: boolean;
}

const colorMap = {
  green:  { ring: "#10B981", bar: "bg-success", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  orange: { ring: "#F97316", bar: "bg-orange",  text: "text-orange-600",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
};

export default function DeviceCard({
  id, name, label, isOn, color, statusText, meta, value, unit, onToggle, isBlower
}: DeviceCardProps) {
  const c = colorMap[color];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sensor-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-sans text-[9px] text-muted tracking-widest uppercase font-semibold">{id}</p>
          <p className="text-sm font-semibold text-text mt-0.5">{name}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div onClick={onToggle} className={`toggle-btn ${isOn ? 'on' : 'off'} w-12 h-6 rounded-full relative cursor-pointer`}>
            <div className={`toggle-knob ${isOn ? 'on' : 'off'} absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm`}></div>
          </div>
          <span className="font-sans text-[8px] text-dim font-semibold">{isOn ? "ON" : "OFF"}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
          {isBlower ? (
            <svg viewBox="0 0 56 56" width="56" height="56">
              <circle cx="28" cy="28" r="26" fill="#F0F2F8" />
              <g className={isOn ? "fan-spin" : "fan-paused"} style={{ "--fan-speed": "1.5s" } as any}>
                <ellipse cx="28" cy="10" rx="7" ry="12" fill={c.ring} opacity="0.85" transform="rotate(0 28 28)"/>
                <ellipse cx="28" cy="10" rx="7" ry="12" fill={c.ring} opacity="0.55" transform="rotate(120 28 28)"/>
                <ellipse cx="28" cy="10" rx="7" ry="12" fill={c.ring} opacity="0.35" transform="rotate(240 28 28)"/>
              </g>
              <circle cx="28" cy="28" r="5.5" fill="#FFFFFF" stroke={c.ring} strokeWidth="1.5"/>
            </svg>
          ) : (
            <>
              <svg viewBox="0 0 56 56" className="w-full h-full">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#E2E6F0" strokeWidth="4"/>
                <circle cx="28" cy="28" r="24" fill="none" stroke={c.ring} strokeWidth="4"
                  strokeDasharray="150.8" strokeDashoffset={150.8 * (1 - value / 100)} strokeLinecap="round"
                  transform="rotate(-90 28 28)" style={{ transition: "all 0.8s ease" }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xs font-semibold text-text">{Math.round(value)}</span>
                <span className="font-mono text-[7px] text-dim">{unit}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text mb-0.5">{label}</p>
          <p className="text-[10px] text-dim mb-2">{meta}</p>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-1">
            <div className={`bar-fill h-full rounded-full ${c.bar}`} style={{ width: `${isOn ? (isBlower ? 55 : value) : 0}%` }}></div>
          </div>
          {isBlower ? (
            <p className="font-mono text-[8px] text-muted">RPM: <span className="font-semibold text-soft">{value}</span></p>
          ) : (
            <p className="font-mono text-[8px] text-muted">Beban: <span className="font-semibold text-soft">{value}%</span></p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isOn ? c.bar.replace('bg-', 'bg-') + ' blink' : 'bg-muted'}`}></div>
        <span className={`font-sans text-[9px] font-semibold tracking-wide inline-flex items-center px-2 py-0.5 rounded-full border ${isOn ? c.badge : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
          {isOn ? statusText : 'STANDBY'}
        </span>
      </div>
    </div>
  );
}
