'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Wifi, 
  Clock,
  Activity,
  Lock,
  Radio,
} from 'lucide-react'

interface CommandHeaderProps {
  incidentCount: number
  activeCount: number
}

export function CommandHeader({ incidentCount, activeCount }: CommandHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: '2-digit',
    }).toUpperCase()
  }

  return (
    <header className="bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-wider text-foreground">
                CENTCOM OPERATIONS
              </h1>
              <p className="font-mono text-[10px] text-muted-foreground">
                IRAQ THEATER — MNF-I INTELLIGENCE
              </p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border" />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">{incidentCount}</span> TRACKED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground">
                <span className="text-destructive font-semibold">{activeCount}</span> ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Right - Status */}
        <div className="flex items-center gap-4">
          {/* System Status */}
          <div className="flex items-center gap-3">
            <StatusIndicator icon={Wifi} label="SATLINK" status="online" />
            <StatusIndicator icon={Radio} label="SIGINT" status="online" />
            <StatusIndicator icon={Lock} label="CRYPTO" status="online" />
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Classification */}
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-green-500 text-green-500 bg-green-500/10"
          >
            OSINT // UNCLASSIFIED
          </Badge>

          <div className="h-8 w-px bg-border" />

          {/* Time */}
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-primary tabular-nums">
              {formatTime(currentTime)}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {formatDate(currentTime)} UTC
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

interface StatusIndicatorProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  status: 'online' | 'offline' | 'warning'
}

function StatusIndicator({ icon: Icon, label, status }: StatusIndicatorProps) {
  const colors = {
    online: 'text-green-500',
    offline: 'text-red-500',
    warning: 'text-yellow-500',
  }

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${colors[status]}`} />
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
