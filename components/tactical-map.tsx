'use client'

import dynamic from 'next/dynamic'
import { Incident } from '@/lib/incident-types'

interface TacticalMapProps {
  incidents: Incident[]
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident) => void
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null
}

// Dynamically import Leaflet map — SSR must be false (Leaflet requires browser DOM)
const LeafletMapInner = dynamic(() => import('./leaflet-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0c1420] text-muted-foreground font-mono text-sm">
      <div className="text-center space-y-2">
        <div className="text-primary animate-pulse">INITIALIZING TACTICAL MAP...</div>
        <div className="text-xs text-muted-foreground">IRAQ THEATER — CENTCOM AOR</div>
      </div>
    </div>
  ),
})

export function TacticalMap({ incidents, selectedIncident, onSelectIncident, flyToTarget }: TacticalMapProps) {
  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-sm"
      data-testid="tactical-map"
    >
      {/* Theater label overlay */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-1000 pointer-events-none">
        <div className="font-mono text-[10px] text-primary/70 bg-background/60 px-3 py-1 rounded border border-primary/20 backdrop-blur-sm tracking-widest">
          CENTCOM AOR — MIDDLE EAST / GULF REGION
        </div>
      </div>

      {/* Classification watermark */}
      <div className="absolute bottom-2 right-2 z-1000 pointer-events-none">
        <div className="font-mono text-[9px] text-green-500/50 tracking-widest">
          UNCLASSIFIED // OSINT
        </div>
      </div>

      <LeafletMapInner
        incidents={incidents}
        selectedIncident={selectedIncident}
        onSelectIncident={onSelectIncident}
        flyToTarget={flyToTarget}
      />
    </div>
  )
}
