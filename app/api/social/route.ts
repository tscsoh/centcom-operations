import { NextResponse } from 'next/server'
import { parseRSSFeed, newsItemToIncident, isRelevantToAOR } from '@/lib/services/news-service'
import { SOCIAL_RSS_SOURCES } from '@/lib/services/social-service'
import { Incident } from '@/lib/incident-types'
import { saveIncidents } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 minutes

export async function GET() {
  const allIncidents: Incident[] = []
  const seenIds = new Set<string>()

  for (const source of SOCIAL_RSS_SOURCES) {
    try {
      const res = await fetch(source.url, {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'CENTCOM-OPS/1.0 (research dashboard)' },
        signal: AbortSignal.timeout(5000),
      })

      if (!res.ok) continue

      const xml = await res.text()
      const items = parseRSSFeed(xml, source.name)

      // Require both geographic AOR match AND actual conflict language
      const relevant = items.filter(item => isRelevantToAOR(item.title, item.summary))

      for (const item of relevant.slice(0, 5)) {
        const incident = newsItemToIncident(item, 0, 'SOC')
        // Deduplicate within this fetch (same article from multiple sources)
        if (!seenIds.has(incident.id)) {
          seenIds.add(incident.id)
          allIncidents.push(incident)
        }
      }
    } catch {
      // Skip failed sources
    }
  }

  if (allIncidents.length > 0) {
    try { saveIncidents(allIncidents) } catch { /* non-fatal */ }
  }

  return NextResponse.json({ incidents: allIncidents, fetchedAt: new Date().toISOString() })
}
