import { NextResponse } from 'next/server'
import { clearAllIncidents } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** DELETE /api/admin/purge — wipes all incidents from SQLite so stale/mock data is gone */
export async function DELETE() {
  const deleted = clearAllIncidents()
  return NextResponse.json({ deleted, message: `Cleared ${deleted} incidents from database` })
}
