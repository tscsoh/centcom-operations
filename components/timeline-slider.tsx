'use client'

import { useMemo, useRef } from 'react'
import { Incident } from '@/lib/incident-types'
import { Play, Pause } from 'lucide-react'

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
}

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
  warStart?: number
}

export function TimelineSlider({ allIncidents, timeRange, onChange, isPlaying, onPlayToggle, warStart }: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingCursor = useRef(false)
  const draggingStart  = useRef(false)

  const { minTs, maxTs } = useMemo(() => {
    const floor = warStart ?? 0
    if (allIncidents.length === 0) return { minTs: floor || Date.now() - 86400000, maxTs: Date.now() }
    const ts = allIncidents.map(i =>
      i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
    )
    return { minTs: floor || Math.min(...ts), maxTs: Math.max(Math.max(...ts), Date.now()) }
  }, [allIncidents, warStart])

  const span = maxTs - minTs || 1

  const tickMarks = useMemo(() => allIncidents.map(i => {
    const ts = i.timestamp instanceof Date ? i.timestamp.getTime() : new Date(i.timestamp).getTime()
    return {
      id: i.id,
      pct: ((ts - minTs) / span) * 100,
      color: THREAT_COLORS[i.threatLevel] ?? '#6b7280',
      inRange: ts >= timeRange[0] && ts <= timeRange[1],
    }
  }), [allIncidents, minTs, span, timeRange])

  const startPct  = Math.max(0, Math.min(100, ((timeRange[0] - minTs) / span) * 100))
  const cursorPct = Math.max(0, Math.min(100, ((timeRange[1] - minTs) / span) * 100))

  function pctFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  }

  function tsFromPct(pct: number) { return minTs + (pct / 100) * span }

  // Click anywhere on track → jump cursor
  function onTrackClick(e: React.MouseEvent) {
    const newEnd = tsFromPct(pctFromClientX(e.clientX))
    onChange([Math.min(timeRange[0], newEnd), newEnd])
  }

  // Cursor drag (end / playhead)
  function onCursorDown(e: React.PointerEvent) {
    e.stopPropagation()
    draggingCursor.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onCursorMove(e: React.PointerEvent) {
    if (!draggingCursor.current) return
    const newEnd = tsFromPct(pctFromClientX(e.clientX))
    onChange([Math.min(timeRange[0], newEnd), newEnd])
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

  const isNotLive = Date.now() - timeRange[1] > 5 * 60 * 1000

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
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

      {/* NOW snap button — only visible when cursor is > 5 min behind current time */}
      {isNotLive && (
        <button
          onClick={() => onChange([timeRange[0], Date.now()])}
          className="shrink-0 font-mono text-[8px] px-1.5 py-0.5 border border-amber-400/60 text-amber-400 bg-amber-400/10 rounded hover:bg-amber-400/20 transition-colors whitespace-nowrap"
        >
          ▶ NOW
        </button>
      )}

      {/* Start label */}
      <span className="font-mono text-[9px] text-slate-500 whitespace-nowrap shrink-0">
        {formatLabel(timeRange[0])}
      </span>

      {/* Track — tall enough for diamond + line + label */}
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

        {/* Start bracket handle — vertical bar */}
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
          {/* Diamond grab handle */}
          <div style={{
            width: '8px', height: '8px',
            background: '#38bdf8',
            transform: 'rotate(45deg)',
            borderRadius: '1px',
            boxShadow: '0 0 8px #38bdf8, 0 0 3px #38bdf8',
            flexShrink: 0,
          }} />
          {/* Vertical line */}
          <div style={{
            width: '1px', height: '16px',
            background: '#38bdf8',
            boxShadow: '0 0 4px #38bdf8',
            marginTop: '-1px',
          }} />
          {/* Time label below the line */}
          <div
            className="font-mono text-[8px] text-cyan-400 whitespace-nowrap"
            style={{ marginTop: '2px', textShadow: '0 0 6px rgba(56,189,248,0.5)' }}
          >
            {formatLabel(timeRange[1])}
          </div>
        </div>
      </div>
    </div>
  )
}
