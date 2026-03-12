'use client'

import { useEffect, useRef, useState } from 'react'
import { Incident, THREAT_LEVEL_CONFIG, ATTACK_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/incident-types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Plane,
  Rocket,
  Radio,
  Users,
  Anchor,
  Wifi,
  Target,
  Shield,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Crosshair,
  Car,
  AlertOctagon,
  Swords,
  Search,
  Locate,
} from 'lucide-react'

const ATTACK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AIRSTRIKE: Plane,
  MISSILE: Rocket,
  DRONE: Radio,
  GROUND_ASSAULT: Users,
  NAVAL: Anchor,
  CYBER: Wifi,
  ARTILLERY: Target,
  SPECIAL_OPS: Shield,
  IED: AlertTriangle,
  VBIED: Car,
  SUICIDE_BOMBING: AlertOctagon,
  SNIPER: Crosshair,
  RPG: Zap,
  SECTARIAN: Users,
  INSURGENT: Swords,
}

interface IncidentFeedProps {
  incidents: Incident[]
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident) => void
  onZoomTo?: (incident: Incident) => void
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export function IncidentFeed({ incidents, selectedIncident, onSelectIncident, onZoomTo }: IncidentFeedProps) {
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    const currentIds = incidents.map(i => i.id)
    // Skip animation on initial load (seenIds is empty)
    let cleanup: (() => void) | undefined
    if (seenIdsRef.current.size > 0) {
      const fresh = new Set(currentIds.filter(id => !seenIdsRef.current.has(id)))
      if (fresh.size > 0) {
        setNewIds(fresh)
        const t = setTimeout(() => setNewIds(new Set()), 2500)
        cleanup = () => clearTimeout(t)
      }
    }
    // Always register all current IDs so we don't re-animate them on the next update
    currentIds.forEach(id => seenIdsRef.current.add(id))
    return cleanup
  }, [incidents])

  const displayed = search.trim()
    ? incidents.filter(i => {
        const q = search.toLowerCase()
        const label = ATTACK_TYPE_CONFIG[i.attackType]?.label?.toLowerCase() ?? ''
        const ts = (i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)).toLocaleString().toLowerCase()
        return (
          label.includes(q) ||
          i.location.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          ts.includes(q)
        )
      })
    : incidents

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold tracking-wider text-foreground">
            LIVE INCIDENT FEED
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-2 h-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              {newIds.size > 0 && (
                <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {incidents.filter(i => i.status === 'ACTIVE').length} ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-secondary/40 border border-border rounded text-xs font-mono pl-6 pr-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
              <p className="font-mono text-xs text-muted-foreground">AWAITING LIVE FEED</p>
              <p className="font-mono text-[10px] text-muted-foreground/40">Polling RSS sources...</p>
            </div>
          )}
          {displayed.map((incident) => {
            const Icon = ATTACK_ICONS[incident.attackType]
            const threatConfig = THREAT_LEVEL_CONFIG[incident.threatLevel]
            const statusConfig = STATUS_CONFIG[incident.status]
            const isSelected = selectedIncident?.id === incident.id

            return (
              <div
                key={incident.id}
                data-testid={`feed-item-${incident.id}`}
                onClick={() => onSelectIncident(incident)}
                className={[
                  'p-3 rounded-md cursor-pointer transition-all duration-200 border',
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-secondary/20 border-transparent hover:bg-secondary/40 hover:border-border',
                  newIds.has(incident.id) ? 'feed-item-new' : '',
                ].join(' ')}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: threatConfig.bgColor }}
                    >
                      <Icon className="w-4 h-4" style={{ color: threatConfig.color }} />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {ATTACK_TYPE_CONFIG[incident.attackType].label.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {incident.location.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onZoomTo && (
                      <button
                        onClick={e => { e.stopPropagation(); onZoomTo(incident) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                        title="Zoom to location"
                      >
                        <Locate className="w-3 h-3" />
                      </button>
                    )}
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: threatConfig.color,
                        color: threatConfig.color,
                        backgroundColor: threatConfig.bgColor,
                      }}
                    >
                      {incident.threatLevel}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {incident.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{formatTimeAgo(incident.timestamp)}</span>
                    </div>
                    <div 
                      className="flex items-center gap-1 text-[10px]"
                      style={{ color: statusConfig.color }}
                    >
                      {incident.status === 'ACTIVE' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>
                  {incident.casualties.confirmed > 0 && (
                    <div className="text-[10px] text-destructive font-mono">
                      {incident.casualties.confirmed} KIA
                    </div>
                  )}
                </div>

                {/* Verification badge */}
                {incident.verified && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1 text-[10px] text-primary">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified by {incident.source}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
