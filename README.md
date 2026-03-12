# CENTCOM Operations — OSINT Tactical Intelligence Dashboard

Real-time open-source intelligence (OSINT) dashboard monitoring active conflict zones across the CENTCOM area of operations — Iraq, Israel/Gaza, Lebanon, and Syria. Aggregates live RSS feeds from major news sources, normalizes them into geolocated incident reports, and visualizes them on an interactive dark-mode tactical map.

---

## Features

- **Live feed ingestion** — Polls BBC Arabic, Al Jazeera, Reuters, and Google News RSS every 5 minutes; filters for CENTCOM AOR relevance using geographic + conflict keyword dual-gate
- **SQLite persistence** — All incidents deduplicated by URL hash and stored locally via `better-sqlite3`; survives page refreshes
- **Interactive tactical map** — Leaflet dark-tile map with color-coded threat markers, animated ripple effects on new incidents, city labels, and a stats overlay
- **Fly-to zoom** — Each feed card has a locate button that smoothly flies the map to that incident's coordinates
- **Timeline playback** — Scrub through the full incident history since Feb 28, 2026; hit play to animate through all events in 12 seconds
- **Filtering** — Filter by source (News/Social/Intel), threat level, and attack type; filters stack with a FILTERS ACTIVE badge and one-click CLEAR ALL
- **6HR Activity chart** — Clickable area chart showing incident frequency; click a bar to jump the timeline cursor to that hour
- **Incident detail panel** — Full report view with HTML-stripped Intel Report text, clickable source URL, and a FULL REPORT button
- **Responsive layout** — Full three-panel desktop layout; mobile bottom tab bar for MAP / FEED / STATS

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (new-york) |
| Map | Leaflet + react-leaflet 5 |
| Charts | Recharts |
| Database | better-sqlite3 (WAL mode) |
| Testing | Playwright |
| Package manager | pnpm |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys are required. All data sources (RSS feeds) are free and open.

---

## Environment Variables

Create `.env.local` (optional):

```env
NEWSAPI_KEY=        # Optional — NewsAPI free tier (100 req/day)
NEXT_PUBLIC_MAP_THEATER=IRAQ
```

---

## Data Sources

| Source | Type | Notes |
|---|---|---|
| BBC Arabic | RSS | `feeds.bbci.co.uk/arabic/rss.xml` |
| Al Jazeera English | RSS | `aljazeera.com/xml/rss/all.xml` |
| Reuters World News | RSS | `feeds.reuters.com/reuters/worldNews` |
| Google News (Israel/Gaza) | RSS | Query-scoped feeds |
| Google News (Lebanon/Hezbollah) | RSS | Query-scoped feeds |
| Google News (IDF Operations) | RSS | Query-scoped feeds |

Relevance filtering requires both a **geographic AOR term** (e.g. "in gaza", "in iraq") and a **conflict keyword** (e.g. "killed", "strike", "attack") to pass.

---

## Project Structure

```
app/
  page.tsx                  # Main WarTracker component — state, fetching, layout
  api/
    news/route.ts           # RSS news feed endpoint → Incident[]
    social/route.ts         # Social RSS feed endpoint → Incident[]
    incidents/route.ts      # SQLite read endpoint
    admin/purge/route.ts    # DELETE all incidents

components/
  tactical-map.tsx          # SSR-safe Leaflet wrapper
  leaflet-map-inner.tsx     # Markers, FlyToController, HomeControl, CityMarkers
  incident-feed.tsx         # Scrollable feed with search + zoom buttons
  incident-detail.tsx       # Full incident report panel
  stats-panel.tsx           # Metrics, 6HR chart, threat/attack filter bars
  command-header.tsx        # Top header bar
  timeline-slider.tsx       # Custom drag-based timeline with play/NOW controls

lib/
  db.ts                     # SQLite schema, saveIncidents, getRecentIncidents
  incident-types.ts         # AttackType, ThreatLevel, Incident types + configs
  iraq-locations.ts         # Iraq + regional lat/lng coordinates
  services/
    news-service.ts         # RSS fetch, OG tag extraction, attack classification
    social-service.ts       # Social RSS feeds
    geocoder.ts             # Keyword → coordinates lookup
    incident-enricher.ts    # Raw items → Incident objects

tests/
  map.spec.ts
  incident-feed.spec.ts
  data-services.spec.ts
  e2e.spec.ts
  fixtures/incidents.json
```

---

## Commands

```bash
pnpm dev          # Start dev server on :3000
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Run Playwright tests (headless)
pnpm test:ui      # Playwright UI mode
```

---

## Notes

- All data is **unclassified open-source intelligence** sourced from public RSS feeds
- Historical coverage begins **Feb 28, 2026** (conflict monitoring start date)
- The timeline cursor defaults to the current time; hit play to replay from the beginning
- The `DELETE /api/admin/purge` endpoint clears the local SQLite database
