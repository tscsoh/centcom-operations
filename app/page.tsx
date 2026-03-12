'use client'

import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from 'react'

function useIsDesktop() {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia('(min-width: 768px)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false, // SSR snapshot — assume mobile until hydrated
  )
}
import { Incident } from '@/lib/incident-types'

import { TacticalMap } from '@/components/tactical-map'
import { IncidentFeed } from '@/components/incident-feed'
import { StatsPanel } from '@/components/stats-panel'
import { IncidentDetail } from '@/components/incident-detail'
import { CommandHeader } from '@/components/command-header'
import { TimelineSlider } from '@/components/timeline-slider'

type FeedSource = 'ALL' | 'INTEL' | 'NEWS' | 'SOCIAL'

// War start: Feb 28, 2026 at 00:00:00 local time
const WAR_START = new Date('2026-02-28T00:00:00').getTime()

// JSON serialization turns Date objects into ISO strings — hydrate them back
function deserializeIncidents(raw: unknown[]): Incident[] {
  return raw.map((i) => {
    const inc = i as Incident & { timestamp: string | Date }
    return { ...inc, timestamp: inc.timestamp instanceof Date ? inc.timestamp : new Date(inc.timestamp) }
  })
}

export default function WarTracker() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [feedSource, setFeedSource] = useState<FeedSource>('ALL')
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [dbRange, setDbRange] = useState<{ earliest: string | null; latest: string | null; total: number } | null>(null)
  const [timeRange, setTimeRange] = useState<[number, number]>([WAR_START, Date.now()])

  const [threatFilters, setThreatFilters] = useState<Set<string>>(new Set())
  const [attackFilters, setAttackFilters] = useState<Set<string>>(new Set())
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [mobileTab, setMobileTab] = useState<'map' | 'feed' | 'stats'>('map')
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const isDesktop = useIsDesktop()

  // Tracks the playhead origin so seeking during playback rebases the interval
  const playOriginRef = useRef<{ ts: number; wall: number }>({ ts: WAR_START, wall: 0 })
  // Mirror of timeRange[1] accessible inside effects without stale closure
  const timeRangeEndRef = useRef(Date.now())
  // Mirror of playSpeed accessible inside the interval without stale closure
  const playSpeedRef = useRef(1)

  // Initialize: load persisted incidents from DB
  useEffect(() => {
    async function init() {
      try {
        const rangeRes = await fetch('/api/incidents?range=1')
        if (rangeRes.ok) {
          const range = await rangeRes.json()
          setDbRange(range)
        }
        const res = await fetch('/api/incidents?limit=60')
        if (res.ok) {
          const data = await res.json()
          if (data.incidents?.length > 0) {
            setIncidents(deserializeIncidents(data.incidents))
          }
        }
      } catch { /* ignore — live feeds will populate */ }
      setIsLoading(false)
    }
    init()
  }, [])

  // Fetch live news feed incidents
  const fetchNewsIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      if (res.ok) {
        const data = await res.json()
        if (data.incidents?.length > 0) {
          const hydrated = deserializeIncidents(data.incidents)
          setIncidents((prev) => {
            const existingIds = new Set(prev.map((i) => i.id))
            const fresh = hydrated.filter((i) => !existingIds.has(i.id))
            return [...fresh, ...prev].slice(0, 60)
          })
          setLastFetch(new Date())
        }
      }
    } catch {
      // Network error — dashboard continues with existing data
    }
  }, [])

  // Fetch social media feed incidents
  const fetchSocialIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/social')
      if (res.ok) {
        const data = await res.json()
        if (data.incidents?.length > 0) {
          const hydrated = deserializeIncidents(data.incidents)
          setIncidents((prev) => {
            const existingIds = new Set(prev.map((i) => i.id))
            const fresh = hydrated.filter((i) => !existingIds.has(i.id))
            return [...fresh, ...prev].slice(0, 60)
          })
          setLastFetch(new Date())
        }
      }
    } catch {
      // Network error — dashboard continues with existing data
    }
  }, [])

  // Initial data fetch from live sources
  useEffect(() => {
    fetchNewsIncidents()
    fetchSocialIncidents()
  }, [fetchNewsIncidents, fetchSocialIncidents])

  // Refresh live feeds every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNewsIncidents()
      fetchSocialIncidents()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNewsIncidents, fetchSocialIncidents])

  // Keep refs in sync
  useEffect(() => { timeRangeEndRef.current = timeRange[1] }, [timeRange])
  useEffect(() => { playSpeedRef.current = playSpeed }, [playSpeed])

  // Called by timeline when user clicks/drags the playhead (including while playing)
  const handleTimelineSeek = useCallback((ts: number) => {
    if (isPlaying) {
      // Rebase play origin so the interval continues from the new position
      playOriginRef.current = { ts, wall: Date.now() }
    }
  }, [isPlaying])

  // Timeline playback — starts from current playhead position
  useEffect(() => {
    if (!isPlaying || incidents.length === 0) return
    const timestamps = incidents.map(i =>
      i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
    )
    const maxTs = Math.max(Math.max(...timestamps), Date.now())
    const totalSpan = maxTs - WAR_START
    const BASE_RATE = totalSpan / 12000 // ms of timeline per ms of wall clock at 1× (12s full span)
    // Start from wherever the playhead currently sits
    playOriginRef.current = { ts: timeRangeEndRef.current, wall: Date.now() }
    const interval = setInterval(() => {
      const { ts: fromTs, wall: fromWall } = playOriginRef.current
      const newEnd = Math.min(fromTs + (Date.now() - fromWall) * BASE_RATE * playSpeedRef.current, maxTs)
      setTimeRange([WAR_START, newEnd])
      if (newEnd >= maxTs) setIsPlaying(false)
    }, 50)
    return () => clearInterval(interval)
  }, [isPlaying, incidents])

  const handleSelectIncident = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
  }, [])

  // Filter incidents by source, time range, threat level, and attack type (deduplicate by ID)
  const filteredIncidents = (() => {
    const seen = new Set<string>()
    return incidents.filter((i) => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      if (feedSource === 'NEWS'   && !i.id.startsWith('NEWS-')) return false
      if (feedSource === 'SOCIAL' && !i.id.startsWith('SOC-'))  return false
      if (feedSource === 'INTEL'  && !i.id.startsWith('INC-'))  return false
      const ts = i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
      if (ts < timeRange[0] || ts > timeRange[1]) return false
      if (threatFilters.size > 0 && !threatFilters.has(i.threatLevel)) return false
      if (attackFilters.size > 0 && !attackFilters.has(i.attackType)) return false
      return true
    })
  })()

  const hasActiveFilters = feedSource !== 'ALL' || threatFilters.size > 0 || attackFilters.size > 0

  function clearAllFilters() {
    setThreatFilters(new Set())
    setAttackFilters(new Set())
    setFeedSource('ALL')
  }

  function toggleThreat(level: string) {
    setThreatFilters(prev => {
      const next = new Set(prev)
      if (next.has(level)) { next.delete(level) } else { next.add(level) }
      return next
    })
  }

  function toggleAttack(type: string) {
    setAttackFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) { next.delete(type) } else { next.add(type) }
      return next
    })
  }

  const handleActivityClick = useCallback((hourIndex: number) => {
    const now = Date.now()
    const targetTs = now - (5 - hourIndex) * 3600000
    const timestamps = incidents.map(i =>
      i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
    )
    const minTs = timestamps.length ? Math.min(...timestamps) : 0
    setTimeRange([minTs, targetTs])
  }, [incidents])

  const activeCount = incidents.filter((i) => i.status === 'ACTIVE' || i.status === 'DEVELOPING').length

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground">INITIALIZING IRAQ THEATER SYSTEMS...</p>
          <p className="font-mono text-xs text-muted-foreground/60 mt-2">MNF-I INTELLIGENCE FEED LOADING</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <CommandHeader incidentCount={incidents.length} activeCount={activeCount} />

      {/* Toolbar */}
      <div className="bg-secondary/30 border-b border-border px-4 py-2 flex items-center gap-3">
        {/* Source filter tabs */}
        <div className="flex items-center gap-1 border border-border rounded overflow-hidden shrink-0">
          {(['ALL', 'INTEL', 'NEWS', 'SOCIAL'] as FeedSource[]).map((src) => (
            <button
              key={src}
              onClick={() => setFeedSource(src)}
              className={`font-mono text-[10px] px-2 py-1 transition-colors ${
                feedSource === src
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              {src}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="font-mono text-[9px] text-amber-400 border border-amber-400/40 rounded px-1.5 py-0.5 bg-amber-400/10">
              FILTERS ACTIVE
            </div>
            <button
              onClick={clearAllFilters}
              className="font-mono text-[9px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 hover:bg-secondary/60 transition-colors"
            >
              CLEAR ALL
            </button>
          </div>
        )}

        {/* Timeline slider — stretches to fill available space */}
        <TimelineSlider
          allIncidents={incidents}
          timeRange={timeRange}
          onChange={setTimeRange}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(p => !p)}
          onSeek={handleTimelineSeek}
          playSpeed={playSpeed}
          onSpeedChange={speed => {
            setPlaySpeed(speed)
            // Rebase play origin so speed change takes effect immediately
            if (isPlaying) playOriginRef.current = { ts: timeRangeEndRef.current, wall: Date.now() }
          }}
          warStart={WAR_START}
        />

        {/* Last sync badge */}
        {lastFetch && (
          <div className="shrink-0 flex items-center gap-1.5 font-mono text-xs text-cyan-400 border border-cyan-400/30 rounded px-2 py-0.5 bg-cyan-400/5">
            <span className="text-cyan-400/50 text-[9px]">SYNC</span>
            <span>{lastFetch.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Stats — hidden on mobile, shown on md+ */}
        <div className="hidden md:flex w-64 lg:w-72 border-r border-border p-3 overflow-auto flex-col shrink-0">
          {isDesktop && (
            <StatsPanel
              incidents={filteredIncidents}
              threatFilters={threatFilters}
              attackFilters={attackFilters}
              onThreatClick={toggleThreat}
              onAttackClick={toggleAttack}
              onActivityClick={handleActivityClick}
            />
          )}
        </div>

        {/* Center - Map — hidden on mobile unless map tab active */}
        <div className={`flex-1 p-2 md:p-4 min-w-0 ${mobileTab === 'map' ? 'flex' : 'hidden md:flex'} flex-col`}>
          <TacticalMap
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            flyToTarget={flyToTarget}
          />
        </div>

        {/* Right Panel - Feed or Detail — hidden on mobile unless feed tab active */}
        <div className={`${mobileTab === 'feed' ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 xl:w-80 border-l border-border flex-col shrink-0 min-h-0 overflow-hidden`}>
          {selectedIncident ? (
            <IncidentDetail
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
              onZoomTo={incident => {
                setFlyToTarget({ lat: incident.location.lat, lng: incident.location.lng, zoom: 10 })
                setMobileTab('map')
              }}
            />
          ) : (
            <IncidentFeed
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={handleSelectIncident}
              onZoomTo={incident => {
                setFlyToTarget({ lat: incident.location.lat, lng: incident.location.lng, zoom: 10 })
                setMobileTab('map')
              }}
            />
          )}
        </div>

        {/* Stats panel for mobile — only shown when stats tab active */}
        <div className={`${mobileTab === 'stats' ? 'flex' : 'hidden'} md:hidden w-full border-l border-border p-3 overflow-auto flex-col shrink-0`}>
          {mobileTab === 'stats' && (
            <StatsPanel
              incidents={filteredIncidents}
              threatFilters={threatFilters}
              attackFilters={attackFilters}
              onThreatClick={toggleThreat}
              onAttackClick={toggleAttack}
              onActivityClick={handleActivityClick}
            />
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden bg-card border-t border-border flex items-center justify-around px-4 py-2">
        {(['map', 'feed', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`font-mono text-[10px] px-3 py-1.5 rounded transition-colors ${
              mobileTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Footer Status Bar */}
      <div className="bg-card border-t border-border px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
          <span>SYS: <span className="text-green-500">NOMINAL</span></span>
          <span>NET: <span className="text-green-500">SECURE</span></span>
          <span>INCIDENTS: <span className="text-primary">{incidents.length}</span></span>
          <span className="hidden sm:inline">SOURCES: <span className="text-primary">NEWS + SOCIAL + SIGINT</span></span>
          {dbRange && dbRange.total > 0 && (
            <span className="text-muted-foreground/70 hidden lg:inline">
              DB: <span className="text-primary">{dbRange.total}</span> records
              {dbRange.earliest && (
                <> &nbsp;|&nbsp; <span className="text-primary/70">
                  {new Date(dbRange.earliest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' → '}
                  {new Date(dbRange.latest!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span></>
              )}
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          <span className="text-green-500 hidden sm:inline">UNCLASSIFIED // OSINT // OPEN SOURCE INTELLIGENCE</span>
        </div>
      </div>
    </div>
  )
}
