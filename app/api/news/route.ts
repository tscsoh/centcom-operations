import { NextResponse } from 'next/server'
import { parseRSSFeed, newsItemToIncident, RSS_SOURCES, isRelevantToAOR } from '@/lib/services/news-service'
import { Incident } from '@/lib/incident-types'
import { saveIncidents } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 minutes

export async function GET() {
  const allIncidents: Incident[] = []
  let index = 0

  for (const source of RSS_SOURCES) {
    try {
      const res = await fetch(source.url, {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'CENTCOM-OPS/1.0 (research dashboard)' },
        signal: AbortSignal.timeout(5000),
      })

      if (!res.ok) continue

      const xml = await res.text()
      const items = parseRSSFeed(xml, source.name)

      // Require AOR geographic match AND actual conflict language
      const relevant = items.filter(item => isRelevantToAOR(item.title, item.summary))

      for (const item of relevant.slice(0, 5)) {
        allIncidents.push(newsItemToIncident(item, index++))
      }
    } catch {
      // Skip failed sources — dashboard still works with mock data
    }
  }

  if (allIncidents.length > 0) {
    try { saveIncidents(allIncidents) } catch { /* non-fatal */ }
  }

  return NextResponse.json({ incidents: allIncidents, fetchedAt: new Date().toISOString() })
}
