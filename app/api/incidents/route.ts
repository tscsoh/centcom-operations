import { NextRequest, NextResponse } from 'next/server'
import { getRecentIncidents, getIncidentRange, getIncidentsBetween } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/incidents
 *   ?limit=60           → most recent N incidents from DB
 *   ?from=ISO&to=ISO    → incidents within date range
 *   ?range=1            → just return { earliest, latest, total } metadata
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl

    if (searchParams.get('range') === '1') {
      const range = getIncidentRange()
      return NextResponse.json(range)
    }

    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    if (from && to) {
      const incidents = getIncidentsBetween(from, to)
      return NextResponse.json({ incidents, count: incidents.length })
    }

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '60', 10), 500)
    const incidents = getRecentIncidents(limit)
    return NextResponse.json({ incidents, count: incidents.length })
  } catch (err) {
    console.error('[/api/incidents]', err)
    return NextResponse.json({ error: 'DB read failed' }, { status: 500 })
  }
}
