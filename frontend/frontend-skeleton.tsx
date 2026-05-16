// ============================================
// FRONTEND SKELETON - Next.js Dashboard
// ============================================

// ============================================
// hooks/useSocket.ts - Socket.io hook
// ============================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface SensorUpdate {
  device_id: string
  sensor_type: string
  value: number
  unit: string
  timestamp: string
}

interface DeviceStatus {
  device_id: string
  [key: string]: any
}

interface Alert {
  id: number
  device_id: string
  alert_type: string
  severity: string
  message: string
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [sensorUpdates, setSensorUpdates] = useState<SensorUpdate[]>([])
  const [deviceStatus, setDeviceStatus] = useState<Record<string, DeviceStatus>>({})
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setConnected(false)
    })

    // Listen for sensor updates
    socketInstance.on('sensor_update', (data: SensorUpdate) => {
      setSensorUpdates(prev => {
        const updated = [data, ...prev].slice(0, 100) // Keep last 100
        return updated
      })
    })

    // Listen for device status
    socketInstance.on('device_status', (data: DeviceStatus) => {
      setDeviceStatus(prev => ({
        ...prev,
        [data.device_id]: data
      }))
    })

    // Listen for alerts
    socketInstance.on('alert', (data: Alert) => {
      setAlerts(prev => [data, ...prev].slice(0, 50))
    })

    // Device online/offline
    socketInstance.on('device_heartbeat', (data) => {
      console.log(`Device ${data.device_id} is ${data.status}`)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const sendCommand = useCallback((deviceId: string, command: string, payload?: any) => {
    if (socket) {
      socket.emit('control_device', {
        device_id: deviceId,
        command,
        payload
      })
    }
  }, [socket])

  return {
    connected,
    sensorUpdates,
    deviceStatus,
    alerts,
    sendCommand
  }
}

// ============================================
// components/Dashboard.tsx
// ============================================

'use client'

import { useSocket } from '@/hooks/useSocket'
import SensorPanel from './SensorPanel'
import DeviceControlPanel from './DeviceControlPanel'
import AlertPanel from './AlertPanel'

export default function Dashboard() {
  const { connected, sensorUpdates, deviceStatus, alerts, sendCommand } = useSocket()

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-text">ASAP MONITOR</h1>
          <div className={`px-4 py-2 rounded-lg font-mono text-sm ${
            connected 
              ? 'bg-success/20 text-success border border-success/50' 
              : 'bg-danger/20 text-danger border border-danger/50'
          }`}>
            {connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
          </div>
        </div>
        <p className="text-dim text-sm mt-1">Real-time monitoring & control system</p>
      </div>

      {/* Alert Panel */}
      {alerts.length > 0 && (
        <AlertPanel alerts={alerts} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Sensor Panel */}
        <div className="xl:col-span-2">
          <SensorPanel data={sensorUpdates} />
        </div>

        {/* Device Control */}
        <div>
          <DeviceControlPanel 
            status={deviceStatus} 
            onCommand={sendCommand}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================
// components/SensorPanel.tsx
// ============================================

'use client'

import { useMemo } from 'react'

interface SensorUpdate {
  device_id: string
  sensor_type: string
  value: number
  unit: string
  timestamp: string
}

export default function SensorPanel({ data }: { data: SensorUpdate[] }) {
  const latestReadings = useMemo(() => {
    const readings: Record<string, SensorUpdate> = {}
    data.forEach(item => {
      const key = `${item.device_id}:${item.sensor_type}`
      if (!readings[key]) {
        readings[key] = item
      }
    })
    return Object.values(readings)
  }, [data])

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-bold text-text mb-4">📊 Sensor Readings</h2>
      
      <div className="space-y-3">
        {latestReadings.map((reading) => (
          <div 
            key={`${reading.device_id}:${reading.sensor_type}`}
            className="flex items-center justify-between p-4 bg-surface border border-border/50 rounded-lg"
          >
            <div>
              <p className="font-mono text-sm text-dim">{reading.device_id}</p>
              <p className="text-lg font-semibold text-text">{reading.sensor_type}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-accent">{reading.value.toFixed(2)}</p>
              <p className="font-mono text-xs text-soft">{reading.unit}</p>
            </div>
          </div>
        ))}
      </div>

      {latestReadings.length === 0 && (
        <p className="text-dim text-center py-8">Waiting for sensor data...</p>
      )}
    </div>
  )
}

// ============================================
// components/DeviceControlPanel.tsx
// ============================================

'use client'

import { useState } from 'react'

interface DeviceStatus {
  device_id: string
  pump?: { status: string; load: number }
  blower?: { status: string; rpm: number; speed: number }
}

interface Props {
  status: Record<string, DeviceStatus>
  onCommand: (deviceId: string, command: string, payload?: any) => void
}

export default function DeviceControlPanel({ status, onCommand }: Props) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async (deviceId: string, component: string, currentStatus: string) => {
    setLoading(true)
    const newStatus = currentStatus === 'ON' ? 'OFF' : 'ON'
    onCommand(deviceId, `${component}_${newStatus}`)
    setTimeout(() => setLoading(false), 500)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-bold text-text mb-4">🎮 Device Control</h2>

      <div className="space-y-4">
        {Object.entries(status).map(([deviceId, deviceData]) => (
          <div key={deviceId} className="bg-surface border border-border/50 rounded-lg p-4">
            <p className="font-mono text-xs text-dim mb-3">{deviceId}</p>

            {/* Pump Control */}
            {deviceData.pump && (
              <div className="mb-3 pb-3 border-b border-border/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text">Pump</span>
                  <button
                    onClick={() => handleToggle(deviceId, 'PUMP', deviceData.pump.status)}
                    disabled={loading}
                    className={`px-4 py-1 rounded-lg font-mono text-xs font-semibold transition ${
                      deviceData.pump.status === 'ON'
                        ? 'bg-success/20 text-success border border-success/50 hover:bg-success/30'
                        : 'bg-danger/20 text-danger border border-danger/50 hover:bg-danger/30'
                    }`}
                  >
                    {deviceData.pump.status}
                  </button>
                </div>
                <p className="text-[11px] text-dim mt-1">Load: {deviceData.pump.load}%</p>
              </div>
            )}

            {/* Blower Control */}
            {deviceData.blower && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-text">Blower</span>
                  <button
                    onClick={() => handleToggle(deviceId, 'BLOWER', deviceData.blower.status)}
                    disabled={loading}
                    className={`px-4 py-1 rounded-lg font-mono text-xs font-semibold transition ${
                      deviceData.blower.status === 'ON'
                        ? 'bg-orange/20 text-orange border border-orange/50 hover:bg-orange/30'
                        : 'bg-danger/20 text-danger border border-danger/50 hover:bg-danger/30'
                    }`}
                  >
                    {deviceData.blower.status}
                  </button>
                </div>
                <div className="text-[11px] text-dim space-y-0.5">
                  <p>RPM: {deviceData.blower.rpm}</p>
                  <p>Speed: {deviceData.blower.speed}%</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(status).length === 0 && (
        <p className="text-dim text-center py-8">No devices connected</p>
      )}
    </div>
  )
}

// ============================================
// components/AlertPanel.tsx
// ============================================

'use client'

interface Alert {
  id: number
  device_id: string
  alert_type: string
  severity: string
  message: string
}

export default function AlertPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="mb-6 space-y-2">
      {alerts.slice(0, 5).map((alert) => (
        <div 
          key={alert.id}
          className={`p-4 rounded-lg border font-mono text-sm ${
            alert.severity === 'CRITICAL'
              ? 'bg-danger/10 border-danger/50 text-danger'
              : alert.severity === 'WARNING'
              ? 'bg-amber/10 border-amber/50 text-amber'
              : 'bg-success/10 border-success/50 text-success'
          }`}
        >
          <span className="font-bold">[{alert.alert_type}]</span> {alert.message}
        </div>
      ))}
    </div>
  )
}

// ============================================
// app/page.tsx
// ============================================

import Dashboard from '@/components/Dashboard'

export default function Home() {
  return <Dashboard />
}
