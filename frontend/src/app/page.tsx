"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import SensorCard from "../components/SensorCard";
import DeviceCard from "../components/DeviceCard";
import TrendChart from "../components/TrendChart";
import { useSocket, SensorReading, SystemStatus } from "../hooks/useSocket";

export default function Dashboard() {
  const { isConnected, sensorData, systemStatus, sendCommand, logs, addLog } = useSocket();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const prevPumpRef = React.useRef("");
  const prevBlowerRef = React.useRef("");
  const prevReadingsRef = React.useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID"));
      setDate(now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }));
      setDay(now.toLocaleDateString("id-ID", { weekday: "long" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getReading = (type: string): number => {
    if (!sensorData) return 0;
    const r = sensorData.readings.find((s) => s.type === type);
    return r ? r.value : 0;
  };

  const handlePumpToggle = () => {
    if (!systemStatus) return;
    const isCurrentlyOn = systemStatus.components.pump.status === "ON";
    sendCommand(isCurrentlyOn ? "PUMP_OFF" : "PUMP_ON");
  };

  const handleBlowerToggle = () => {
    if (!systemStatus) return;
    const isCurrentlyOn = systemStatus.components.blower.status === "ON";
    sendCommand(isCurrentlyOn ? "BLOWER_OFF" : "BLOWER_ON");
  };

  // Safe status access
  const pump = systemStatus?.components?.pump || { status: "OFF", load: 0 };
  const blower = systemStatus?.components?.blower || { status: "OFF", rpm: 0 };

  useEffect(() => {
    if (pump.status && pump.status !== prevPumpRef.current && prevPumpRef.current !== "") {
      addLog(`Pompa-01 ${pump.status === "ON" ? "diaktifkan" : "dimatikan"}`, pump.status === "ON" ? "info" : "warn");
    }
    prevPumpRef.current = pump.status;
  }, [pump.status, addLog]);

  useEffect(() => {
    if (blower.status && blower.status !== prevBlowerRef.current && prevBlowerRef.current !== "") {
      addLog(`Blower-01 ${blower.status === "ON" ? "diaktifkan" : "dimatikan"}`, blower.status === "ON" ? "info" : "warn");
    }
    prevBlowerRef.current = blower.status;
  }, [blower.status, addLog]);

  // Log untuk setiap perubahan nilai sensor
  useEffect(() => {
    if (sensorData?.readings) {
      sensorData.readings.forEach(r => {
        const prevValue = prevReadingsRef.current[r.type];
        if (prevValue !== undefined && prevValue !== r.value) {
          let logType: "info" | "warn" | "error" = "info";
          // Beri warna log warning/error jika nilai melewati batas wajar
          if (r.type === "MQ135" && r.value > 300) logType = "warn";
          if (r.type === "MQ7" && r.value > 50) logType = "warn";
          if (r.type === "DSM501A" && r.value > 75) logType = "error";
          
          addLog(`${r.type} berubah: ${r.value} ${r.unit}`, logType);
        }
        prevReadingsRef.current[r.type] = r.value;
      });
    }
  }, [sensorData, addLog]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="ml-0 md:ml-52 flex-1 min-h-screen p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-mono text-lg font-semibold text-text tracking-wide">
              Monitor <span className="text-accent">ASAP</span>
            </h1>
            <p className="text-[11px] text-dim mt-0.5">Pemantauan lingkungan & kontrol sprayer · real-time</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-3 text-right min-w-[200px]">
            <div className="font-mono text-2xl font-semibold text-text tracking-widest tabular-nums">{time || "--:--:--"}</div>
            <div className="font-mono text-[10px] text-soft tracking-wide mt-0.5">{date || "-- --- ----"}</div>
            <div className="font-mono text-[9px] text-dim tracking-widest mt-0.5 uppercase">{day || "--------"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${isConnected ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success blink' : 'bg-danger'}`}></div>
            <span className={`font-mono text-[9px] ${isConnected ? 'text-success' : 'text-danger'} tracking-wider`}>
              {isConnected ? "SYSTEM ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <p className="font-mono text-[8px] text-muted tracking-widest uppercase mb-3">● Sensor Real-Time</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <SensorCard 
            id="mq135" name="MQ135" label="Kualitas Udara" unit="ppm" color="teal"
            value={getReading("MQ135")} maxValue={600} 
            goodThreshold={200} warnThreshold={400} 
            goodLabel="BAIK" warnLabel="SEDANG" badLabel="BURUK"
          />
          <SensorCard 
            id="mq7" name="MQ7" label="Kadar CO" unit="ppm" color="purple"
            value={getReading("MQ7")} maxValue={150} 
            goodThreshold={35} warnThreshold={80} 
            goodLabel="AMAN" warnLabel="WASPADA" badLabel="BAHAYA"
          />
          <SensorCard 
            id="dsm" name="DSM501A" label="Partikel PM2.5" unit="μg/m³" color="amber"
            value={getReading("DSM501A")} maxValue={120} 
            goodThreshold={35} warnThreshold={75} 
            goodLabel="BAIK" warnLabel="SEDANG" badLabel="BERBAHAYA"
          />
          <SensorCard 
            id="turb" name="TURBIDITY" label="Kekeruhan Air" unit="NTU" color="blue"
            value={getReading("TURBIDITY")} maxValue={100} 
            goodThreshold={25} warnThreshold={60} 
            goodLabel="JERNIH" warnLabel="KERUH" badLabel="SANGAT KERUH"
          />
        </div>

        <p className="font-mono text-[8px] text-muted tracking-widest uppercase mb-3">● Kontrol Perangkat</p>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-5">
          <DeviceCard 
            id="PUMP-01" name="Pompa Air Sprayer" label={pump.status === "ON" ? "Pompa Aktif" : "Pompa Mati"}
            isOn={pump.status === "ON"} color="green" statusText="BEROPERASI"
            meta={pump.status === "ON" ? "Debit: 2.4 L/min · Tekanan: 1.2 bar" : "Standby — tidak ada aliran"}
            value={pump.load || 0} unit="%" onToggle={handlePumpToggle}
          />
          <DeviceCard 
            id="BLOWER-01" name="Blower / Kipas" label={blower.status === "ON" ? "Blower Aktif" : "Blower Mati"}
            isOn={blower.status === "ON"} color="orange" statusText="BERPUTAR"
            meta={blower.status === "ON" ? "Mode: Auto · Suhu: 34°C" : "Standby"}
            value={blower.rpm || 0} unit="RPM" onToggle={handleBlowerToggle} isBlower
          />
          
          <div className="card-accent bg-card border border-border rounded-xl p-5">
            <p className="font-mono text-[8px] text-dim tracking-widest uppercase mb-3">● Log Aktivitas</p>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1 text-[10px]">
              {logs.map(l => (
                <div key={l.id} className="flex gap-2">
                  <span className="font-mono text-[8px] text-muted shrink-0 mt-px">{l.time}</span>
                  <span className={`font-mono text-[9px] leading-relaxed ${l.type === 'error' ? 'text-danger' : l.type === 'warn' ? 'text-amber' : 'text-success'}`}>{l.msg}</span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-dim">Belum ada log aktivitas.</span>}
            </div>
          </div>
        </div>

        <TrendChart currentReadings={sensorData?.readings || []} />
      </main>
    </div>
  );
}
