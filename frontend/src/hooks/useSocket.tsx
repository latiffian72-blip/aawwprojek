"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface SensorReading {
  type: string;
  value: number;
  unit: string;
}

export interface SensorData {
  device_id: string;
  readings: SensorReading[];
}

export interface DeviceStatus {
  status: string;
  load?: number;
  rpm?: number;
  speed?: number;
}

export interface SystemStatus {
  device_id: string;
  components: {
    pump: DeviceStatus;
    blower: DeviceStatus;
  };
}

export interface LogEntry {
  id: number;
  time: string;
  msg: string;
  type: 'info' | 'warn' | 'error';
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sensorData: SensorData | null;
  systemStatus: SystemStatus | null;
  logs: LogEntry[];
  addLog: (msg: string, type?: 'info' | 'warn' | 'error') => void;
  sendCommand: (command: string, payload?: any) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Mengambil log dari localStorage saat pertama kali dimuat
  useEffect(() => {
    const savedLogs = localStorage.getItem("asap_logs");
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Gagal membaca log dari localStorage", e);
      }
    }
  }, []);

  // Menyimpan log ke localStorage setiap kali ada perubahan
  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem("asap_logs", JSON.stringify(logs));
    }
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs(prev => [{ id: Date.now() + Math.random(), time, msg, type }, ...prev].slice(0, 100)); // Simpan 100 log terakhir
  };

  useEffect(() => {
    const socketIo = io("http://localhost:3001", {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketIo.on("connect", () => {
      console.log("WebSocket Terhubung!");
      setIsConnected(true);
      addLog("Sistem ASAP MONITOR terhubung ke server", "info");
    });

    socketIo.on("disconnect", () => {
      console.log("WebSocket Terputus!");
      setIsConnected(false);
      addLog("Koneksi terputus dari server", "error");
    });

    socketIo.on("sensor_update", (data: SensorData) => {
      setSensorData(data);
    });

    socketIo.on("status_update", (data: SystemStatus) => {
      setSystemStatus(data);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  const sendCommand = (command: string, payload?: any) => {
    if (socket && isConnected) {
      socket.emit("control_device", { command, payload });
      addLog(`Mengirim perintah: ${command}`, "warn");
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sensorData, systemStatus, logs, addLog, sendCommand }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
