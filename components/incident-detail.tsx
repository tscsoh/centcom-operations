'use client'

import { Incident, THREAT_LEVEL_CONFIG, ATTACK_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/incident-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Share2,
} from 'lucide-react'

interface IncidentDetailProps {
  incident: Incident
  onClose: () => void
}

function stripHtml(html: string): string {
  const decoded = html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  return decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"]+/g) ?? []
}

function truncateUrl(url: string, max = 55): string {
  const bare = url.replace(/^https?:\/\//, '')
  return bare.length > max ? bare.slice(0, max) + '…' : bare
}

function UrlPreviewLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      <span className="truncate">{truncateUrl(url)}</span>
    </a>
  )
}

export function IncidentDetail({ incident, onClose }: IncidentDetailProps) {
  const threatConfig = THREAT_LEVEL_CONFIG[incident.threatLevel]
  const attackConfig = ATTACK_TYPE_CONFIG[incident.attackType]
  const statusConfig = STATUS_CONFIG[incident.status]

  // Extract URLs from details/description for clickable source links
  const detailUrls = extractUrls(incident.details ?? '')
  const descUrls = extractUrls(incident.description ?? '')
  const sourceUrl = detailUrls[0] ?? descUrls[0] ?? null

  const cleanDetails = incident.details
    ? stripHtml(incident.details).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
    : null

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col h-full" data-testid="incident-detail">
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{ backgroundColor: threatConfig.bgColor }}
      >
        <div className="flex items-center gap-3">
          <Badge
            className="font-mono text-xs px-2 py-1"
            style={{ 
              backgroundColor: threatConfig.color, 
              color: '#000',
            }}
          >
            {incident.threatLevel}
          </Badge>
          <span className="font-mono text-sm font-semibold">{incident.id}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <h3 className="font-mono text-lg font-bold text-foreground mb-1">
            {attackConfig.label.toUpperCase()}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{incident.location.name}, {incident.location.region}</span>
          </div>
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusConfig.color }}
            />
            <span className="font-mono text-xs" style={{ color: statusConfig.color }}>
              {statusConfig.label.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-xs">
              {incident.timestamp.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-sm text-foreground leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* Casualties */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <div className="font-mono text-2xl font-bold text-destructive">
              {incident.casualties.confirmed}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">CONFIRMED</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <div className="font-mono text-2xl font-bold text-orange-500">
              {incident.casualties.estimated}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">ESTIMATED</div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <div className="font-mono text-2xl font-bold text-yellow-500">
              {incident.casualties.civilian}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">CIVILIAN</div>
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="font-mono text-[10px] text-muted-foreground mb-1">COORDINATES</div>
          <div className="font-mono text-sm text-primary">
            {incident.location.lat.toFixed(4)}°N, {incident.location.lng.toFixed(4)}°E
          </div>
        </div>

        {/* Source */}
        <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground mb-1">SOURCE</div>
            <div className="font-mono text-sm text-foreground">{incident.source}</div>
          </div>
          {incident.verified ? (
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-mono text-xs">VERIFIED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-mono text-xs">UNVERIFIED</span>
            </div>
          )}
        </div>

        {/* Details */}
        {(cleanDetails || sourceUrl) && (
          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="font-mono text-[10px] text-muted-foreground mb-2">INTEL REPORT</div>
            {cleanDetails && (
              <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-2">
                {cleanDetails}
              </p>
            )}
            {sourceUrl && <UrlPreviewLink url={sourceUrl} />}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-mono text-xs"
          disabled={!sourceUrl}
          onClick={() => sourceUrl && window.open(sourceUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          FULL REPORT
        </Button>
        <Button variant="outline" size="sm" className="font-mono text-xs">
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="sm" className="font-mono text-xs">
          <Share2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
