'use client'

import { useMemo, useRef, useState } from 'react'
import { Incident } from '@/lib/incident-types'
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
}

const SPEEDS = [0.25, 0.5, 1, 2, 4]

function formatLabel(ts: number): string {
  const d = new Date(ts)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${month} ${day}, ${hh}:${mm}`
}

interface TimelineSliderProps {
  allIncidents: Incident[]
  timeRange: [number, number]
  onChange: (range: [number, number]) => void
  isPlaying: boolean
  onPlayToggle: () => void
  onSeek?: (ts: number) => void
  playSpeed: number
  onSpeedChange: (speed: number) => void
  warStart?: number
}

export function TimelineSlider({
  allIncidents, timeRange, onChange, isPlaying, onPlayToggle, onSeek,
  playSpeed, onSpeedChange, warStart,
}: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingCursor = useRef(false)
  const draggingStart  = useRef(false)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = full view, up to 32×

  const { minTs, maxTs } = useMemo(() => {
    const floor = warStart ?? 0
    if (allIncidents.length === 0) return { minTs: floor || Date.now() - 86400000, maxTs: Date.now() }
    const ts = allIncidents.map(i =>
      i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
    )
    return { minTs: floor || Math.min(...ts), maxTs: Math.max(Math.max(...ts), Date.now()) }
  }, [allIncidents, warStart])

  const fullSpan = maxTs - minTs || 1

  // Compute the visible window — centered on playhead, clamped to full range
  const { viewStart, viewEnd, viewSpan } = useMemo(() => {
    if (zoomLevel === 1) return { viewStart: minTs, viewEnd: maxTs, viewSpan: fullSpan }
    const window = fullSpan / zoomLevel
    const center = timeRange[1]
    let vs = center - window / 2
    let ve = center + window / 2
    if (vs < minTs) { vs = minTs; ve = minTs + window }
    if (ve > maxTs) { ve = maxTs; vs = maxTs - window }
    vs = Math.max(vs, minTs)
    ve = Math.min(ve, maxTs)
    return { viewStart: vs, viewEnd: ve, viewSpan: ve - vs || 1 }
  }, [zoomLevel, timeRange, minTs, maxTs, fullSpan])

  const tickMarks = useMemo(() => {
    const seen = new Set<string>()
    return allIncidents.flatMap(i => {
      if (seen.has(i.id)) return []
      seen.add(i.id)
      const ts = i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
      if (ts < viewStart || ts > viewEnd) return []
      return [{
        id: i.id,
        pct: ((ts - viewStart) / viewSpan) * 100,
        color: THREAT_COLORS[i.threatLevel] ?? '#6b7280',
        inRange: ts >= timeRange[0] && ts <= timeRange[1],
      }]
    })
  }, [allIncidents, viewStart, viewEnd, viewSpan, timeRange])

  const startPct  = Math.max(0, Math.min(100, ((timeRange[0] - viewStart) / viewSpan) * 100))
  const cursorPct = Math.max(0, Math.min(100, ((timeRange[1] - viewStart) / viewSpan) * 100))

  function pctFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }

  function tsFromPct(pct: number) { return viewStart + (pct / 100) * viewSpan }

  function onTrackClick(e: React.MouseEvent) {
    const newEnd = tsFromPct(pctFromClientX(e.clientX))
    onChange([Math.min(timeRange[0], newEnd), newEnd])
    onSeek?.(newEnd)
  }

  // Cursor drag (playhead)
  function onCursorDown(e: React.PointerEvent) {
    e.stopPropagation()
    draggingCursor.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onCursorMove(e: React.PointerEvent) {
    if (!draggingCursor.current) return
    const newEnd = tsFromPct(pctFromClientX(e.clientX))
    onChange([Math.min(timeRange[0], newEnd), newEnd])
    onSeek?.(newEnd)
  }
  function onCursorUp(e: React.PointerEvent) {
    draggingCursor.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Start bracket drag
  function onStartDown(e: React.PointerEvent) {
    e.stopPropagation()
    draggingStart.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onStartMove(e: React.PointerEvent) {
    if (!draggingStart.current) return
    const newStart = tsFromPct(pctFromClientX(e.clientX))
    if (newStart < timeRange[1]) onChange([newStart, timeRange[1]])
  }
  function onStartUp(e: React.PointerEvent) {
    draggingStart.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(playSpeed)
    onSpeedChange(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  const isNotLive = Date.now() - timeRange[1] > 5 * 60 * 1000

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {/* Reset to start */}
      <button
        onClick={() => {
          const start = warStart ?? minTs
          onChange([start, start])
          onSeek?.(start)
        }}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        title="Reset to start"
      >
        <RotateCcw className="w-3 h-3" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={onPlayToggle}
        className={`shrink-0 w-6 h-6 flex items-center justify-center rounded border transition-colors ${
          isPlaying
            ? 'border-cyan-400/60 text-cyan-400 bg-cyan-400/10'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        }`}
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>

      {/* Speed cycle */}
      <button
        onClick={cycleSpeed}
        className={`shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors whitespace-nowrap ${
          playSpeed !== 1
            ? 'border-cyan-400/60 text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        }`}
        title="Cycle playback speed"
      >
        {playSpeed === 0.25 ? '¼×' : playSpeed === 0.5 ? '½×' : `${playSpeed}×`}
      </button>

      {/* NOW snap button */}
      {isNotLive && (
        <button
          onClick={() => { onChange([timeRange[0], Date.now()]); onSeek?.(Date.now()) }}
          className="shrink-0 font-mono text-[8px] px-1.5 py-0.5 border border-amber-400/60 text-amber-400 bg-amber-400/10 rounded hover:bg-amber-400/20 transition-colors whitespace-nowrap"
        >
          ▶ NOW
        </button>
      )}

      {/* View window start label */}
      <span className="font-mono text-[9px] text-slate-500 whitespace-nowrap shrink-0">
        {formatLabel(viewStart)}
      </span>

      {/* Zoom out */}
      <button
        onClick={() => setZoomLevel(z => Math.max(1, z / 2))}
        disabled={zoomLevel === 1}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Zoom out"
      >
        <ZoomOut className="w-3 h-3" />
      </button>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-crosshair select-none"
        style={{ height: '40px' }}
        onClick={onTrackClick}
      >
        {/* Background track line */}
        <div
          className="absolute inset-x-0 bg-slate-600 pointer-events-none"
          style={{ top: '12px', height: '1px' }}
        />

        {/* Active range fill */}
        <div
          className="absolute bg-cyan-500/25 pointer-events-none"
          style={{ left: `${startPct}%`, right: `${100 - cursorPct}%`, top: '11px', height: '3px' }}
        />

        {/* Event tick marks */}
        {tickMarks.map(tick => (
          <div
            key={tick.id}
            className="absolute pointer-events-none transition-opacity duration-200"
            style={{
              left: `${tick.pct}%`,
              top: '7px',
              width: '1px',
              height: '11px',
              background: tick.color,
              opacity: tick.inRange ? 0.75 : 0.12,
            }}
          />
        ))}

        {/* Zoom level badge — shown when zoomed in */}
        {zoomLevel > 1 && (
          <div
            className="absolute top-0 right-0 font-mono text-[8px] text-cyan-400/70 bg-cyan-400/10 border border-cyan-400/20 rounded px-1 pointer-events-none"
          >
            {zoomLevel}×
          </div>
        )}

        {/* Start bracket handle */}
        <div
          className="absolute cursor-ew-resize"
          style={{ left: `${startPct}%`, top: '6px', transform: 'translateX(-50%)', width: '12px', display: 'flex', justifyContent: 'center' }}
          onPointerDown={onStartDown}
          onPointerMove={onStartMove}
          onPointerUp={onStartUp}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ width: '2px', height: '13px', background: '#475569', borderRadius: '1px', boxShadow: '0 0 3px rgba(0,0,0,0.5)' }} />
        </div>

        {/* Cursor / playhead */}
        <div
          className="absolute cursor-ew-resize"
          style={{ left: `${cursorPct}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          onPointerDown={onCursorDown}
          onPointerMove={onCursorMove}
          onPointerUp={onCursorUp}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            width: '8px', height: '8px',
            background: '#38bdf8',
            transform: 'rotate(45deg)',
            borderRadius: '1px',
            boxShadow: '0 0 8px #38bdf8, 0 0 3px #38bdf8',
            flexShrink: 0,
          }} />
          <div style={{
            width: '1px', height: '16px',
            background: '#38bdf8',
            boxShadow: '0 0 4px #38bdf8',
            marginTop: '-1px',
          }} />
          <div
            className="font-mono text-[8px] text-cyan-400 whitespace-nowrap"
            style={{ marginTop: '2px', textShadow: '0 0 6px rgba(56,189,248,0.5)' }}
          >
            {formatLabel(timeRange[1])}
          </div>
        </div>
      </div>

      {/* Zoom in */}
      <button
        onClick={() => setZoomLevel(z => Math.min(32, z * 2))}
        disabled={zoomLevel >= 32}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Zoom in"
      >
        <ZoomIn className="w-3 h-3" />
      </button>
    </div>
  )
}
