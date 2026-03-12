# CENTCOM Operations — Iraq War Theater Intelligence Dashboard

## Project Overview

A Next.js tactical incident monitoring dashboard visualizing Iraq War events (Operation Iraqi Freedom, 2003–2011) with live data feeds from news APIs, RSS sources, and social media. The UI presents a military command center aesthetic with real geographic data mapped to the Iraq theater.

## Current Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.7
- **Styling:** Tailwind CSS 4, shadcn/ui (new-york), custom military dark theme
- **Charts:** Recharts
- **Package Manager:** pnpm
- **Testing:** Playwright (to be added)

## Implementation Plan

### Phase 1: Iraq Theater Data Layer
**Goal:** Replace Iran mock data with accurate Iraq war geography and attack taxonomy.

#### 1.1 Iraq Locations (`lib/iraq-locations.ts`)
Replace 14 Iran cities with key Iraq war locations:
- Baghdad (33.3152°N, 44.3661°E) — Capital, heaviest fighting
- Fallujah (33.3500°N, 43.7833°E) — Two major battles 2004
- Mosul (36.3566°N, 43.1583°E) — Northern front
- Basra (30.5085°N, 47.7804°E) — Southern front, British sector
- Tikrit (34.6000°N, 43.6833°E) — Sunni Triangle
- Ramadi (33.4513°N, 43.3007°E) — Anbar Province capital
- Kirkuk (35.4669°N, 44.3922°E) — Disputed oil city
- Najaf (31.9955°N, 44.3358°E) — Shia holy city, 2004 uprising
- Karbala (32.6166°N, 44.0249°E) — Shia holy city
- Samarra (34.2000°N, 43.8700°E) — Golden Mosque bombing 2006
- Baqubah (33.7483°N, 44.6500°E) — Diyala Province
- Haditha (34.1264°N, 42.3829°E) — Anbar Province
- Tal Afar (36.3728°N, 42.4472°E) — Northwestern Iraq
- Amarah (31.8451°N, 47.1500°E) — Maysan Province

Map bounds: `minLat=29, maxLat=38, minLng=38, maxLng=49`

#### 1.2 Extended Attack Types (`lib/incident-types.ts`)
Add Iraq-war-specific types:
- `IED` — Improvised Explosive Device (roadside bomb)
- `VBIED` — Vehicle-Borne IED (car bomb)
- `SUICIDE_BOMBING` — Suicide attack
- `SNIPER` — Sniper engagement
- `RPG` — Rocket-Propelled Grenade attack
- `SECTARIAN` — Sectarian violence
- `INSURGENT` — General insurgent attack

Keep existing: AIRSTRIKE, MISSILE, DRONE, GROUND_ASSAULT, ARTILLERY, SPECIAL_OPS

#### 1.3 Map SVG Outline
Replace Iran SVG outline in `components/tactical-map.tsx` with Iraq border path.
Update `latLngToPosition()` to use Iraq bounds.

---

### Phase 2: Data Services Layer

#### 2.1 News Feed Service (`lib/services/news-service.ts`)
Fetch from free/public RSS and news APIs:
- **GDELT Project** — free, no API key, event data API: `https://api.gdeltproject.org/api/v2/doc/doc`
- **NewsAPI** — free tier 100 req/day, requires `NEWSAPI_KEY` env var
- **RSS Feeds** (server-side parsing via Next.js API route):
  - BBC Arabic: `feeds.bbci.co.uk/arabic/rss.xml`
  - Al Jazeera English: `www.aljazeera.com/xml/rss/all.xml`
  - Reuters World: `feeds.reuters.com/reuters/worldNews`

API route: `app/api/news/route.ts`
- Fetches and parses RSS XML
- Normalizes to `NewsItem` type: `{ id, title, summary, source, url, publishedAt, location? }`
- Geocodes location mentions to Iraq coordinates via keyword matching

#### 2.2 Social Media Feed Service (`lib/services/social-service.ts`)
- **Reddit** — public JSON API, no auth required for public subreddits
  - `r/worldnews` — `reddit.com/r/worldnews/search.json?q=iraq&sort=new`
  - `r/geopolitics` — same pattern
  - `r/military`
- **Twitter/X** — Nitter RSS proxy (no API key): `nitter.net/search/rss?q=iraq+attack`
- Returns `SocialPost[]` type: `{ id, platform, author, content, timestamp, url, engagementScore }`

API route: `app/api/social/route.ts`

#### 2.3 Event Geocoding (`lib/services/geocoder.ts`)
Map text mentions to Iraq coordinates:
- Keyword → location lookup table for all 14 Iraq locations + provinces
- Used to auto-assign map coordinates to news/social items

#### 2.4 Incident Enrichment (`lib/services/incident-enricher.ts`)
Converts raw news/social items into `Incident` objects with:
- Attack type classification via keyword matching
- Threat level scoring based on casualty mentions and keywords
- Source reliability weighting

---

### Phase 3: UI Updates

#### 3.1 Header (`components/command-header.tsx`)
- Change title to: `CENTCOM OPERATIONS / IRAQ THEATER INTELLIGENCE`
- Add theater: `MNF-I` (Multi-National Force Iraq)
- Add date range selector: filter 2003–2011

#### 3.2 Incident Feed (`components/incident-feed.tsx`)
- Add `source` tabs: ALL | NEWS | SOCIAL | INTEL
- Show live news article links
- Show social media posts with engagement metrics
- Color-code by data source type

#### 3.3 Stats Panel (`components/stats-panel.tsx`)
- Add province-level breakdown chart
- Add attack type frequency chart (Iraq-specific types)
- Add IED vs. kinetic split metric

#### 3.4 Tactical Map (`components/tactical-map.tsx`)
- Iraq bounds + SVG outline
- Province boundary overlay (optional)
- Cluster markers when zoomed out on dense areas (Baghdad)
- Legend showing all Iraq-specific attack type icons

---

### Phase 4: Playwright Testing

#### 4.1 Setup (`playwright.config.ts`)
```
pnpm add -D @playwright/test
npx playwright install
```
Config: baseURL `http://localhost:3000`, webServer auto-start, screenshot on failure.

#### 4.2 Test Files (`tests/`)
- `tests/map.spec.ts` — Map renders, incidents appear, click selects incident
- `tests/incident-feed.spec.ts` — Feed displays items, filter tabs work
- `tests/incident-detail.spec.ts` — Detail view shows correct fields
- `tests/stats-panel.spec.ts` — Charts render, stats update
- `tests/data-services.spec.ts` — API routes return valid data shapes
- `tests/e2e.spec.ts` — Full user journey: load → view map → select incident → view detail

#### 4.3 Test Strategy
- Use `page.route()` to mock external API calls (avoid real network in CI)
- Test data: fixture file `tests/fixtures/incidents.json` with 5 known Iraq incidents
- Assertions: DOM presence, coordinate rendering, data binding accuracy

---

## Environment Variables (`.env.local`)
```
NEWSAPI_KEY=<optional, free tier>
NEXT_PUBLIC_MAP_THEATER=IRAQ
```

## Key Files
| File | Purpose |
|------|---------|
| `lib/iraq-locations.ts` | Iraq city/region coordinates |
| `lib/incident-types.ts` | Attack type taxonomy (updated) |
| `lib/mock-incidents.ts` | Iraq war scenario generator |
| `lib/services/news-service.ts` | RSS + NewsAPI fetch/parse |
| `lib/services/social-service.ts` | Reddit + Nitter fetch/parse |
| `lib/services/geocoder.ts` | Text → coordinate mapping |
| `app/api/news/route.ts` | News API endpoint |
| `app/api/social/route.ts` | Social media API endpoint |
| `components/tactical-map.tsx` | Map with Iraq bounds + outline |
| `playwright.config.ts` | Playwright config |
| `tests/` | All Playwright test files |

## Development Commands
```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run Playwright tests
pnpm test:ui          # Playwright UI mode
```

## Notes & Constraints
- No API keys required for core functionality (GDELT + Reddit JSON + Nitter RSS are free/open)
- NewsAPI is optional enhancement (100 req/day free tier)
- Historical Iraq war data (2003–2011) is the primary dataset
- Real-time simulation overlays historical patterns for live-feel dashboard
- TypeScript strict mode enforced; `ignoreBuildErrors: true` in next.config.mjs is a v0 artifact — fix TypeScript errors rather than rely on this
