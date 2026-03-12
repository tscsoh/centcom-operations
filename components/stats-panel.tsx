'use client'

import { useMemo, useState, useEffect } from 'react'
import { Incident, ATTACK_TYPE_CONFIG } from '@/lib/incident-types'
import {
  AlertTriangle,
  Target,
  Users,
  Activity,
  TrendingUp,
  Shield,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface StatsPanelProps {
  incidents: Incident[]
  threatFilters: Set<string>
  attackFilters: Set<string>
  onThreatClick: (level: string) => void
  onAttackClick: (type: string) => void
  onActivityClick: (hourIndex: number) => void
}

export function StatsPanel({ incidents, threatFilters, attackFilters, onThreatClick, onAttackClick, onActivityClick }: StatsPanelProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const activeIncidents = incidents.filter(i => i.status === 'ACTIVE' || i.status === 'DEVELOPING')
    const totalCasualties = incidents.reduce((sum, i) => sum + i.casualties.confirmed, 0)
    const criticalCount = incidents.filter(i => i.threatLevel === 'CRITICAL').length

    // Attack type distribution
    const attackTypeCounts: Record<string, number> = {}
    incidents.forEach(i => {
      attackTypeCounts[i.attackType] = (attackTypeCounts[i.attackType] || 0) + 1
    })

    // Threat level distribution
    const threatCounts = {
      CRITICAL: incidents.filter(i => i.threatLevel === 'CRITICAL').length,
      HIGH: incidents.filter(i => i.threatLevel === 'HIGH').length,
      MEDIUM: incidents.filter(i => i.threatLevel === 'MEDIUM').length,
      LOW: incidents.filter(i => i.threatLevel === 'LOW').length,
    }

    // Timeline data (last 6 hours)
    const timelineData = []
    for (let i = 5; i >= 0; i--) {
      const count = incidents.filter(inc => {
        const diff = (new Date().getTime() - inc.timestamp.getTime()) / 3600000
        return diff >= i && diff < i + 1
      }).length
      timelineData.push({
        hour: `-${i}h`,
        incidents: count,
      })
    }

    return {
      total: incidents.length,
      active: activeIncidents.length,
      casualties: totalCasualties,
      critical: criticalCount,
      attackTypeCounts,
      threatCounts,
      timelineData,
    }
  }, [incidents])

  const threatData = [
    { name: 'CRIT', key: 'CRITICAL', value: stats.threatCounts.CRITICAL, color: '#ef4444' },
    { name: 'HIGH', key: 'HIGH',     value: stats.threatCounts.HIGH,     color: '#f97316' },
    { name: 'MED',  key: 'MEDIUM',   value: stats.threatCounts.MEDIUM,   color: '#eab308' },
    { name: 'LOW',  key: 'LOW',      value: stats.threatCounts.LOW,      color: '#22c55e' },
  ]

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Target}
          label="TOTAL INCIDENTS"
          value={stats.total}
          color="#00d4ff"
        />
        <MetricCard
          icon={Activity}
          label="ACTIVE OPS"
          value={stats.active}
          color="#ef4444"
          pulse={stats.active > 0}
        />
        <MetricCard
          icon={Users}
          label="CASUALTIES"
          value={stats.casualties}
          color="#f97316"
        />
        <MetricCard
          icon={AlertTriangle}
          label="CRITICAL"
          value={stats.critical}
          color="#ef4444"
        />
      </div>

      {/* Activity Timeline */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-xs font-semibold tracking-wider">6HR ACTIVITY</h3>
          <span className="font-mono text-[9px] text-cyan-400/70 ml-auto whitespace-nowrap">
            NOW {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.timelineData} onClick={(data) => {
              if (data?.activeTooltipIndex !== undefined) onActivityClick(data.activeTooltipIndex)
            }} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area
                type="monotone"
                dataKey="incidents"
                stroke="#00d4ff"
                strokeWidth={2}
                fill="url(#activityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Threat Distribution */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-xs font-semibold tracking-wider">THREAT LEVEL</h3>
          <span className="font-mono text-[9px] text-muted-foreground/60 ml-auto">click to filter</span>
        </div>
        <div className="space-y-1.5">
          {threatData.map(({ name, value, color, key }) => {
            const isActive = threatFilters.has(key)
            const maxVal = Math.max(...threatData.map(d => d.value), 1)
            return (
              <button
                key={key}
                onClick={() => onThreatClick(key)}
                className={`w-full flex items-center gap-2 rounded px-1 py-0.5 transition-colors ${isActive ? 'bg-white/5 ring-1 ring-white/20' : 'hover:bg-secondary/40'}`}
              >
                <div className="w-10 font-mono text-[10px] text-left" style={{ color }}>{name}</div>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }} />
                </div>
                <div className="w-6 font-mono text-[10px] text-right" style={{ color }}>{value}</div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Attack Types */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs font-semibold tracking-wider">ATTACK TYPES</h3>
          <span className="font-mono text-[9px] text-muted-foreground/60">click to filter</span>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.attackTypeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => {
              const config = ATTACK_TYPE_CONFIG[type as keyof typeof ATTACK_TYPE_CONFIG]
              const percentage = (count / stats.total) * 100
              const isActive = attackFilters.has(type)
              return (
                <button
                  key={type}
                  onClick={() => onAttackClick(type)}
                  className={`w-full flex items-center gap-2 rounded px-1 py-0.5 transition-colors ${isActive ? 'bg-white/5 ring-1 ring-white/20' : 'hover:bg-secondary/40'}`}
                >
                  <div className="w-20 font-mono text-[10px] text-left text-muted-foreground truncate">
                    {config.label.toUpperCase()}
                  </div>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: config.color }}
                    />
                  </div>
                  <div className="w-8 font-mono text-[10px] text-right" style={{ color: config.color }}>{count}</div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
  pulse?: boolean
}

function MetricCard({ icon: Icon, label, value, color, pulse }: MetricCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        {pulse && <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />}
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="font-mono text-[10px] text-muted-foreground tracking-wider">
        {label}
      </div>
    </div>
  )
}
