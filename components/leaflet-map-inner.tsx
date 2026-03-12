'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Incident, THREAT_LEVEL_CONFIG, ATTACK_TYPE_CONFIG } from '@/lib/incident-types'
import { IRAQ_LOCATIONS, REGIONAL_LOCATIONS } from '@/lib/iraq-locations'

// Threat color map
const THREAT_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
}

interface Props {
  incidents: Incident[]
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident) => void
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null
}

// Component that manages incident markers imperatively so we don't remount the map
function IncidentMarkers({ incidents, selectedIncident, onSelectIncident }: Props) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const prevIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Compute which IDs are newly visible this render
    const newSet = new Set(incidents.filter(i => !prevIdsRef.current.has(i.id)).map(i => i.id))

    incidents.forEach((incident) => {
      const color = THREAT_COLORS[incident.threatLevel] ?? '#6b7280'
      const isSelected = selectedIncident?.id === incident.id
      const size = isSelected ? 18 : 12
      const borderWidth = isSelected ? 3 : 2

      const isNew = newSet.has(incident.id)
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${size}px;height:${size}px;">
    ${isNew ? `<div class="marker-ripple" style="width:${size}px;height:${size}px;top:0;left:0;border:2px solid ${color};"></div>` : ''}
    <div class="${isNew ? 'marker-new' : ''}" style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      border:${borderWidth}px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.6)'};
      box-shadow:0 0 ${isSelected ? 10 : 6}px ${color};
      cursor:pointer;
      transition:all 0.2s;
    "></div>
  </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([incident.location.lat, incident.location.lng], { icon })
        .addTo(map)

      // Tooltip
      const attackLabel = ATTACK_TYPE_CONFIG[incident.attackType]?.label ?? incident.attackType
      const ts = incident.timestamp instanceof Date ? incident.timestamp : new Date(incident.timestamp)
      const timeStr = ts.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;background:#0f172a;color:#e2e8f0;padding:6px 8px;border:1px solid ${color};border-radius:4px;white-space:nowrap;line-height:1.7;">
          <div style="color:${color};font-weight:bold;letter-spacing:0.05em;">${incident.threatLevel} — ${attackLabel.toUpperCase()}</div>
          <div style="color:#e2e8f0;">${incident.location.name}</div>
          <div style="color:#38bdf8;font-size:10px;display:flex;align-items:center;gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${timeStr}</div>
          <div style="color:#64748b;font-size:10px;">${incident.id} &nbsp;|&nbsp; ${incident.source}</div>
        </div>`,
        { direction: 'top', offset: [0, -size / 2 - 4], opacity: 1, className: 'leaflet-tooltip-custom' }
      )

      marker.on('click', () => onSelectIncident(incident))

      // data-testid for Playwright
      const el = marker.getElement()
      if (el) {
        el.setAttribute('data-testid', `incident-marker-${incident.id}`)
      } else {
        marker.on('add', () => {
          const e = marker.getElement()
          if (e) e.setAttribute('data-testid', `incident-marker-${incident.id}`)
        })
      }

      markersRef.current.push(marker)
    })

    // Track rendered IDs for next diff
    prevIdsRef.current = new Set(incidents.map(i => i.id))

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, selectedIncident])

  return null
}

// Fly to a target location when flyToTarget changes
function FlyToController({ target }: { target?: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap()
  const prevTarget = useRef<typeof target>(null)
  useEffect(() => {
    if (!target || target === prevTarget.current) return
    prevTarget.current = target
    map.flyTo([target.lat, target.lng], target.zoom ?? 10, { duration: 1.2 })
  }, [map, target])
  return null
}

// Home button Leaflet control — resets to initial CENTCOM overview
function HomeControl() {
  const map = useMap()
  const divRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<L.Control | null>(null)

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'leaflet-bar')
        div.innerHTML = `
          <a href="#" title="Reset view" style="
            display:flex;align-items:center;justify-content:center;
            width:30px;height:30px;background:rgba(13,17,23,0.9);
            color:#38bdf8;font-size:14px;text-decoration:none;
            border:1px solid rgba(56,189,248,0.3);border-radius:4px;
            font-family:monospace;letter-spacing:0;
          " id="home-btn">⌂</a>
        `
        L.DomEvent.on(div.querySelector('#home-btn')!, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          map.flyTo([28.0, 46.0], 5, { duration: 1.2 })
        })
        divRef.current = div
        return div
      },
    })
    controlRef.current = new Control({ position: 'topleft' })
    controlRef.current.addTo(map)
    return () => { controlRef.current?.remove() }
  }, [map])

  return null
}

// City label markers
function CityMarkers() {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const allCities = [...IRAQ_LOCATIONS, ...REGIONAL_LOCATIONS]
    allCities.forEach((city) => {
      const isRegional = REGIONAL_LOCATIONS.includes(city)
      const dotColor = isRegional ? '#475569' : '#334155'
      const labelColor = isRegional ? '#64748b' : '#94a3b8'
      const dotSize = isRegional ? 4 : 6

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;white-space:nowrap;">
          <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${dotColor};border:1px solid #1e293b;"></div>
          <div style="position:absolute;top:-1px;left:${dotSize + 4}px;font-family:monospace;font-size:9px;color:${labelColor};text-shadow:0 0 4px #000,0 0 4px #000;pointer-events:none;white-space:nowrap;">${city.name.toUpperCase()}</div>
        </div>`,
        iconSize: [dotSize, dotSize],
        iconAnchor: [dotSize / 2, dotSize / 2],
      })

      const marker = L.marker([city.lat, city.lng], { icon, interactive: false }).addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  }, [map])

  return null
}

// Stats overlay (bottom-left corner of map)
function StatsOverlay({ incidents }: { incidents: Incident[] }) {
  const map = useMap()
  const divRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<L.Control | null>(null)

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', '')
        div.innerHTML = `
          <div style="font-family:monospace;font-size:10px;background:rgba(15,23,42,0.85);color:#94a3b8;padding:6px 10px;border:1px solid #1e3a5f;border-radius:4px;line-height:1.8;backdrop-filter:blur(4px);">
            <div style="color:#38bdf8;font-weight:bold;margin-bottom:2px;">INCIDENTS PLOTTED</div>
            <div><span style="color:#ef4444;">CRITICAL</span> ${incidents.filter(i => i.threatLevel === 'CRITICAL').length}</div>
            <div><span style="color:#f97316;">HIGH</span> ${incidents.filter(i => i.threatLevel === 'HIGH').length}</div>
            <div><span style="color:#eab308;">MEDIUM</span> ${incidents.filter(i => i.threatLevel === 'MEDIUM').length}</div>
            <div><span style="color:#22c55e;">LOW</span> ${incidents.filter(i => i.threatLevel === 'LOW').length}</div>
            <div style="border-top:1px solid #1e3a5f;margin-top:4px;padding-top:4px;color:#64748b;">TOTAL: ${incidents.length}</div>
          </div>
        `
        divRef.current = div
        return div
      },
    })
    controlRef.current = new Control({ position: 'bottomleft' })
    controlRef.current.addTo(map)
    return () => { controlRef.current?.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, incidents.length, incidents.filter(i => i.threatLevel === 'CRITICAL').length])

  return null
}

export default function LeafletMapInner({ incidents, selectedIncident, onSelectIncident, flyToTarget }: Props) {
  return (
    <MapContainer
      center={[28.0, 46.0]}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      style={{ width: '100%', height: '100%', background: '#0c1420' }}
      zoomControl={true}
      attributionControl={false}
    >
      {/* CartoDB Dark Matter tiles — free, no API key needed */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <IncidentMarkers
        incidents={incidents}
        selectedIncident={selectedIncident}
        onSelectIncident={onSelectIncident}
      />
      <CityMarkers />
      <StatsOverlay incidents={incidents} />
      <HomeControl />
      <FlyToController target={flyToTarget} />
    </MapContainer>
  )
}
