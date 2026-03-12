/**
 * SQLite database — persists all incidents across server restarts.
 *
 * File location: <project-root>/data/centcom-ops.db
 * Uses WAL mode for concurrent reads + single writer.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { Incident } from './incident-types'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'centcom-ops.db')

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

// Enable WAL for better concurrent performance
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id              TEXT PRIMARY KEY,
    timestamp       TEXT NOT NULL,         -- ISO 8601
    location_name   TEXT NOT NULL,
    location_region TEXT NOT NULL,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    attack_type     TEXT NOT NULL,
    threat_level    TEXT NOT NULL,
    status          TEXT NOT NULL,
    source          TEXT NOT NULL,
    description     TEXT NOT NULL,
    details         TEXT,
    verified        INTEGER NOT NULL DEFAULT 0,   -- 0/1 boolean
    cas_confirmed   INTEGER NOT NULL DEFAULT 0,
    cas_estimated   INTEGER NOT NULL DEFAULT 0,
    cas_civilian    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_incidents_timestamp   ON incidents(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_incidents_threat_level ON incidents(threat_level);
  CREATE INDEX IF NOT EXISTS idx_incidents_source       ON incidents(source);
`)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stmtInsert = db.prepare(`
  INSERT OR IGNORE INTO incidents
    (id, timestamp, location_name, location_region, lat, lng,
     attack_type, threat_level, status, source, description, details,
     verified, cas_confirmed, cas_estimated, cas_civilian)
  VALUES
    (@id, @timestamp, @location_name, @location_region, @lat, @lng,
     @attack_type, @threat_level, @status, @source, @description, @details,
     @verified, @cas_confirmed, @cas_estimated, @cas_civilian)
`)

const stmtRange = db.prepare(`
  SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest, COUNT(*) as total
  FROM incidents
`)

const stmtRecent = db.prepare(`
  SELECT * FROM incidents
  ORDER BY timestamp DESC
  LIMIT ?
`)

export function saveIncidents(incidents: Incident[]): void {
  const insertMany = db.transaction((rows: Incident[]) => {
    for (const i of rows) {
      stmtInsert.run({
        id:              i.id,
        timestamp:       (i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)).toISOString(),
        location_name:   i.location.name,
        location_region: i.location.region,
        lat:             i.location.lat,
        lng:             i.location.lng,
        attack_type:     i.attackType,
        threat_level:    i.threatLevel,
        status:          i.status,
        source:          i.source,
        description:     i.description,
        details:         i.details ?? null,
        verified:        i.verified ? 1 : 0,
        cas_confirmed:   i.casualties.confirmed,
        cas_estimated:   i.casualties.estimated,
        cas_civilian:    i.casualties.civilian,
      })
    }
  })
  insertMany(incidents)
}

export interface IncidentRange {
  earliest: string | null
  latest:   string | null
  total:    number
}

export function getIncidentRange(): IncidentRange {
  return stmtRange.get() as IncidentRange
}

export function getRecentIncidents(limit = 60): Incident[] {
  const rows = stmtRecent.all(limit) as Record<string, unknown>[]
  return rows.map(rowToIncident)
}

export function getIncidentsBetween(from: string, to: string): Incident[] {
  const stmt = db.prepare(`
    SELECT * FROM incidents
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp DESC
  `)
  const rows = stmt.all(from, to) as Record<string, unknown>[]
  return rows.map(rowToIncident)
}

function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id:          row.id as string,
    timestamp:   new Date(row.timestamp as string),
    location: {
      name:   row.location_name as string,
      region: row.location_region as string,
      lat:    row.lat as number,
      lng:    row.lng as number,
    },
    attackType:  row.attack_type as Incident['attackType'],
    threatLevel: row.threat_level as Incident['threatLevel'],
    status:      row.status as Incident['status'],
    source:      row.source as string,
    description: row.description as string,
    details:     row.details as string | undefined,
    verified:    Boolean(row.verified),
    casualties: {
      confirmed: row.cas_confirmed as number,
      estimated: row.cas_estimated as number,
      civilian:  row.cas_civilian as number,
    },
  }
}

/** Delete all stored incidents — used to flush bad/mock data */
export function clearAllIncidents(): number {
  const result = db.prepare('DELETE FROM incidents').run()
  return result.changes
}

export default db
