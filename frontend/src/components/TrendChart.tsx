import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SensorReading } from "../hooks/useSocket";

interface TrendChartProps {
  currentReadings: SensorReading[];
}

interface ChartDataPoint {
  time: string;
  MQ135: number;
  MQ7: number;
  DSM501A: number;
  TURBIDITY: number;
}

export default function TrendChart({ currentReadings }: TrendChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (!currentReadings || currentReadings.length === 0) return;

    const time = new Date().toLocaleTimeString("id-ID", {
      second: "2-digit",
      minute: "2-digit",
    });
    const newDataPoint: any = { time };

    currentReadings.forEach((r) => {
      newDataPoint[r.type] = r.value;
    });

    setData((prev) => {
      const newArray = [...prev, newDataPoint as ChartDataPoint];
      if (newArray.length > 30) {
        return newArray.slice(1);
      }
      return newArray;
    });
  }, [currentReadings]);

  const avg = (key: keyof ChartDataPoint) => {
    if (data.length === 0) return 0;
    const sum = data.reduce(
      (acc, curr) => acc + ((curr[key] as number) || 0),
      0,
    );
    return Math.round(sum / data.length);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="font-mono text-[8px] text-dim tracking-widest uppercase mb-0.5">
            ● Grafik Tren Real-Time
          </p>
          <p className="text-[11px] text-soft">
            30 data point terakhir — semua sensor
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full bg-accent"></div>
            <span className="font-mono text-[8px] text-dim">AQ (MQ135)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full bg-purple-500"></div>
            <span className="font-mono text-[8px] text-dim">CO (MQ7)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full bg-amber"></div>
            <span className="font-mono text-[8px] text-dim">
              PM2.5 (DSM501A)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full bg-blue"></div>
            <span className="font-mono text-[8px] text-dim">Turbidity</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBox
          label="Rata-rata AQ"
          value={avg("MQ135")}
          unit="ppm"
          color="text-accent"
        />
        <StatBox
          label="Rata-rata CO"
          value={avg("MQ7")}
          unit="ppm"
          color="text-purple-400"
        />
        <StatBox
          label="Rata-rata PM"
          value={avg("DSM501A")}
          unit="μg/m³"
          color="text-amber"
        />
        <StatBox
          label="Rata-rata NTU"
          value={avg("TURBIDITY")}
          unit="NTU"
          color="text-blue"
        />
      </div>

      <div className="w-full h-32 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip
              contentStyle={{
                backgroundColor: "#111c30",
                borderColor: "#1a2840",
                fontSize: "10px",
                fontFamily: "monospace",
              }}
              itemStyle={{ padding: 0, margin: 0 }}
            />
            <Line
              type="monotone"
              dataKey="MQ135"
              stroke="#00d4aa"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="MQ7"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="DSM501A"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="TURBIDITY"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="font-mono text-[7px] text-muted">← 30 detik lalu</span>
        <span className="font-mono text-[7px] text-muted">Sekarang →</span>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="bg-surface rounded-lg px-3 py-2 border border-border/50">
      <p className="font-mono text-[7px] text-dim mb-1 uppercase tracking-wider">
        {label}
      </p>
      <p className={`font-mono text-base font-semibold ${color}`}>{value}</p>
      <p className="font-mono text-[7px] text-muted">{unit}</p>
    </div>
  );
}
