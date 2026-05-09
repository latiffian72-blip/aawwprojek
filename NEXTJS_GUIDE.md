# ASAP MONITOR - Next.js Implementation Guide

## Project Structure

```
asap-monitor-nextjs/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main dashboard page
├── components/
│   ├── Sidebar.tsx         # Sidebar navigation
│   ├── TopBar.tsx          # Header dengan clock & status
│   ├── SensorCards.tsx     # 4 sensor cards (grid)
│   ├── DeviceControl.tsx   # Pompa & Blower controls
│   ├── TrendChart.tsx      # Chart dengan canvas
│   ├── ActivityLog.tsx     # Log panel
│   ├── Popup.tsx           # Detail popup modal
│   ├── AlertToast.tsx      # Toast notifications
│   └── StatusPills.tsx     # Status badges di top
├── hooks/
│   ├── useSensorData.ts    # Custom hook untuk sensor data
│   └── useDeviceControl.ts # Custom hook untuk device toggle
├── lib/
│   ├── sensorSimulator.ts  # Simulasi data sensor
│   ├── constants.ts        # Threshold values, status logic
│   └── chartUtils.ts       # Canvas drawing helpers
├── types/
│   └── index.ts            # TypeScript types
├── styles/
│   └── globals.css         # Custom CSS & scrollbar styling
├── tailwind.config.ts      # Tailwind config dengan custom colors
├── tsconfig.json
└── package.json
```

## Setup Commands

```bash
# Create project
npx create-next-app@latest asap-monitor-nextjs --typescript --tailwind

# Or manual setup
npm create next-app@latest

# Install additional deps (if needed)
npm install chart.js react-chartjs-2  # jika pakai Chart.js
# atau pakai Canvas API (no dependency)
```

## Key Files Code Snippets

### 1. `app/layout.tsx`
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ASAP MONITOR',
  description: 'Pemantauan lingkungan & kontrol sprayer real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-screen bg-bg text-text font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
```

### 2. `app/page.tsx`
```tsx
'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import StatusPills from '@/components/StatusPills'
import SensorCards from '@/components/SensorCards'
import DeviceControl from '@/components/DeviceControl'
import TrendChart from '@/components/TrendChart'
import ActivityLog from '@/components/ActivityLog'
import AlertToast from '@/components/AlertToast'
import Popup from '@/components/Popup'
import { useSensorData } from '@/hooks/useSensorData'

export default function Dashboard() {
  const { sensors, history, alerts, logs, togglePump, toggleBlower } = useSensorData()
  const [selectedPopup, setSelectedPopup] = useState<string | null>(null)

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      
      <main className="ml-52 flex-1 min-h-screen p-5">
        <TopBar />
        <StatusPills sensors={sensors} />
        
        <AlertToast alerts={alerts} />
        
        <div className="mb-3">
          <p className="font-mono text-[8px] text-muted tracking-widest uppercase">● Sensor Real-Time</p>
        </div>
        
        <SensorCards sensors={sensors} onCardClick={setSelectedPopup} />
        
        <div className="mb-3 mt-5">
          <p className="font-mono text-[8px] text-muted tracking-widest uppercase">● Kontrol Perangkat</p>
        </div>
        
        <DeviceControl 
          pumpOn={sensors.pumpOn}
          blowerOn={sensors.blowerOn}
          onTogglePump={togglePump}
          onToggleBlower={toggleBlower}
        />
        
        <TrendChart history={history} />
      </main>

      {selectedPopup && (
        <Popup sensorKey={selectedPopup} data={sensors} onClose={() => setSelectedPopup(null)} />
      )}
    </div>
  )
}
```

### 3. `hooks/useSensorData.ts`
```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { simulateSensorReading } from '@/lib/sensorSimulator'
import { 
  getAqStatus, 
  getCoStatus, 
  getPmStatus, 
  getTbStatus,
  shouldAlert 
} from '@/lib/constants'

export interface SensorData {
  aq: number
  co: number
  pm: number
  tb: number
  pumpOn: boolean
  blowerOn: boolean
  pumpLoad?: number
  blowerRpm?: number
  blowerSpeed?: number
}

export interface Alert {
  id: string
  key: string
  message: string
  color: string
  timestamp: number
}

export interface Log {
  time: string
  message: string
  type: 'ok' | 'warn' | 'err'
}

const MAX_HISTORY = 30
const UPDATE_INTERVAL = 2000

export function useSensorData() {
  const [sensors, setSensors] = useState<SensorData>({
    aq: 247,
    co: 38,
    pm: 62,
    tb: 18,
    pumpOn: true,
    blowerOn: true,
  })

  const [history, setHistory] = useState<{ aq: number[], co: number[], pm: number[], tb: number[] }>({
    aq: [],
    co: [],
    pm: [],
    tb: [],
  })

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [logs, setLogs] = useState<Log[]>([])

  // Initialize history
  useEffect(() => {
    const initHistory = {
      aq: Array(MAX_HISTORY).fill(sensors.aq),
      co: Array(MAX_HISTORY).fill(sensors.co),
      pm: Array(MAX_HISTORY).fill(sensors.pm),
      tb: Array(MAX_HISTORY).fill(sensors.tb),
    }
    setHistory(initHistory)
    addLog('Sistem ASAP MONITOR dimulai', 'ok')
    addLog('Semua sensor terhubung & aktif', 'ok')
  }, [])

  // Update loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        const newSensors = {
          ...prev,
          aq: simulateSensorReading(prev.aq, 80, 550, 9),
          co: simulateSensorReading(prev.co, 5, 140, 3),
          pm: simulateSensorReading(prev.pm, 10, 110, 5),
          tb: simulateSensorReading(prev.tb, 2, 90, 2),
        }

        if (prev.pumpOn) {
          newSensors.pumpLoad = Math.round(58 + Math.random() * 24)
        }

        if (prev.blowerOn) {
          newSensors.blowerRpm = Math.round(1350 + Math.random() * 550)
          newSensors.blowerSpeed = Math.round(42 + Math.random() * 35)
        }

        // Add to history
        setHistory(h => ({
          aq: [...h.aq.slice(1), newSensors.aq],
          co: [...h.co.slice(1), newSensors.co],
          pm: [...h.pm.slice(1), newSensors.pm],
          tb: [...h.tb.slice(1), newSensors.tb],
        }))

        if (shouldAlert(newSensors)) {
          // Add alert logic
        }

        return newSensors
      })
    }, UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const addLog = useCallback((message: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    const time = new Date().toLocaleTimeString('id-ID')
    setLogs(prev => [{ time, message, type }, ...prev.slice(0, 29)])
  }, [])

  const togglePump = useCallback(() => {
    setSensors(prev => ({
      ...prev,
      pumpOn: !prev.pumpOn,
      pumpLoad: prev.pumpOn ? 0 : prev.pumpLoad,
    }))
    addLog(sensors.pumpOn ? 'Pompa-01 dimatikan' : 'Pompa-01 diaktifkan', sensors.pumpOn ? 'warn' : 'ok')
  }, [sensors.pumpOn, addLog])

  const toggleBlower = useCallback(() => {
    setSensors(prev => ({
      ...prev,
      blowerOn: !prev.blowerOn,
      blowerRpm: prev.blowerOn ? 0 : prev.blowerRpm,
      blowerSpeed: prev.blowerOn ? 0 : prev.blowerSpeed,
    }))
    addLog(sensors.blowerOn ? 'Blower-01 dimatikan' : 'Blower-01 diaktifkan', sensors.blowerOn ? 'warn' : 'ok')
  }, [sensors.blowerOn, addLog])

  return {
    sensors,
    history,
    alerts,
    logs,
    addLog,
    togglePump,
    toggleBlower,
  }
}
```

### 4. `lib/sensorSimulator.ts`
```ts
export function simulateSensorReading(
  current: number,
  min: number,
  max: number,
  volatility: number
): number {
  const change = (Math.random() - 0.48) * volatility
  return Math.max(min, Math.min(max, current + change))
}

export function generateInitialHistory(value: number, length: number) {
  return Array(length)
    .fill(0)
    .map(() => value + (Math.random() - 0.5) * 20)
}
```

### 5. `lib/constants.ts`
```ts
export const SENSOR_THRESHOLDS = {
  aq: { good: 200, warn: 400, danger: 600 },
  co: { good: 35, warn: 80, danger: 150 },
  pm: { good: 35, warn: 75, danger: 120 },
  tb: { good: 25, warn: 60, danger: 100 },
}

export const COLORS = {
  accent: '#00d4aa',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  blue: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  orange: '#f97316',
}

export function getAqStatus(value: number) {
  if (value < 200) return { color: COLORS.accent, text: 'BAIK' }
  if (value < 400) return { color: COLORS.amber, text: 'SEDANG' }
  return { color: COLORS.danger, text: 'BURUK' }
}

export function getCoStatus(value: number) {
  if (value < 35) return { color: COLORS.success, text: 'AMAN' }
  if (value < 80) return { color: COLORS.amber, text: 'WASPADA' }
  return { color: COLORS.danger, text: 'BAHAYA' }
}

export function getPmStatus(value: number) {
  if (value < 35) return { color: COLORS.success, text: 'BAIK' }
  if (value < 75) return { color: COLORS.amber, text: 'SEDANG' }
  return { color: COLORS.danger, text: 'BERBAHAYA' }
}

export function getTbStatus(value: number) {
  if (value < 25) return { color: COLORS.success, text: 'JERNIH' }
  if (value < 60) return { color: COLORS.amber, text: 'KERUH' }
  return { color: COLORS.danger, text: 'SANGAT KERUH' }
}

export function shouldAlert(sensors: any) {
  return sensors.co > 80 || sensors.pm > 75 || sensors.tb > 60
}
```

### 6. `tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        bg: '#080d1a',
        surface: '#0d1424',
        card: '#111c30',
        border: '#1a2840',
        accent: '#00d4aa',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        amber: '#f59e0b',
        danger: '#ef4444',
        success: '#10b981',
        orange: '#f97316',
        muted: '#374151',
        dim: '#6b7280',
        soft: '#94a3b8',
        text: '#e2e8f0',
      },
    },
  },
  plugins: [],
}
export default config
```

### 7. `styles/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #080d1a;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #e2e8f0;
  overflow-x: hidden;
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: #0d1424;
}

::-webkit-scrollbar-thumb {
  background: #1a2840;
  border-radius: 4px;
}

.card-accent {
  position: relative;
}

.card-accent::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  border-radius: 12px 12px 0 0;
}

.card-teal::before { background: linear-gradient(90deg, #00d4aa, transparent); }
.card-purple::before { background: linear-gradient(90deg, #8b5cf6, transparent); }
.card-amber::before { background: linear-gradient(90deg, #f59e0b, transparent); }
.card-blue::before { background: linear-gradient(90deg, #3b82f6, transparent); }
.card-green::before { background: linear-gradient(90deg, #10b981, transparent); }
.card-orange::before { background: linear-gradient(90deg, #f97316, transparent); }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}

.blink {
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes spinFan {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fan-spin {
  animation: spinFan var(--fan-speed, 1.5s) linear infinite;
  transform-origin: 32px 32px;
}

.fan-paused {
  animation-play-state: paused;
}

@keyframes alertIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.alert-toast {
  animation: alertIn 0.35s ease;
}
```

## Component Template Examples

### `components/SensorCards.tsx`
```tsx
'use client'

import { SensorData } from '@/hooks/useSensorData'

interface Props {
  sensors: SensorData
  onCardClick: (key: string) => void
}

export default function SensorCards({ sensors, onCardClick }: Props) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
      {/* MQ135 Card */}
      <div 
        className="sensor-card teal card-accent card-teal bg-card border border-border rounded-xl p-4 cursor-pointer"
        onClick={() => onCardClick('mq135')}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-[8px] text-dim tracking-widest uppercase">MQ135</p>
            <p className="text-[11px] font-medium text-soft mt-0.5">Kualitas Udara</p>
          </div>
        </div>
        <div className="mb-2">
          <span className="font-mono text-3xl font-semibold text-text">{Math.round(sensors.aq)}</span>
          <span className="font-mono text-[10px] text-dim ml-1">ppm</span>
        </div>
        {/* Add gauge, sparkline, etc */}
      </div>
      
      {/* ... other cards */}
    </div>
  )
}
```

### `components/Sidebar.tsx`
```tsx
export default function Sidebar() {
  return (
    <aside className="sidebar w-52 min-h-screen flex flex-col fixed top-0 left-0 z-20 py-6 px-4 bg-surface border-r border-border">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            {/* SVG icon */}
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-accent tracking-widest">ASAP</p>
            <p className="font-mono text-[8px] text-dim tracking-widest mt-0.5">MONITOR</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {/* Add menu items here */}
      </nav>

      {/* Footer */}
      <div className="border-t border-border pt-4">
        <span className="font-mono text-[9px] text-success">SISTEM ONLINE</span>
      </div>
    </aside>
  )
}
```

## Next Steps untuk Kamu:

1. **Setup project** dengan `create-next-app`
2. **Copy struktur** folder dan file dari guide ini
3. **Implement components** satu per satu (start dari Sidebar, TopBar)
4. **Add canvas drawing** untuk sparkline & trend chart (pakai Canvas API atau Chart.js)
5. **Test update loop** dengan `useSensorData` hook
6. **Connect to real API** nanti ketika sensor siap

---

Tips:
- Pakai **TypeScript** untuk type safety
- Gunakan **'use client'** di top components yang butuh interaktif
- Canvas drawing bisa di-extract ke custom hooks
- State management bisa pake Zustand/Jotai kalau lebih kompleks nanti

Good luck! 🚀
