import { Incident, AttackType, ThreatLevel } from '../incident-types'
import { geocodeText, jitterCoords } from './geocoder'
import { ALL_LOCATIONS } from '../iraq-locations'

function cleanText(html: string): string {
  const decoded = html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  return decoded
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[^>]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  publishedAt: Date
  location?: { name: string; lat: number; lng: number; region: string }
}

// Keyword scoring for attack type classification
const ATTACK_KEYWORDS: Record<AttackType, string[]> = {
  IED: ['ied', 'roadside bomb', 'improvised explosive', 'bomb blast', 'explosion'],
  VBIED: ['car bomb', 'vbied', 'vehicle bomb', 'truck bomb', 'suicide car'],
  SUICIDE_BOMBING: ['suicide bomb', 'suicide attack', 'suicide vest', 'bomber killed'],
  SNIPER: ['sniper', 'sniper fire', 'shot dead', 'gunshot'],
  RPG: ['rpg', 'rocket-propelled', 'rocket attack'],
  SECTARIAN: ['sectarian', 'militia', 'execution', 'death squad', 'shia', 'sunni clashes'],
  INSURGENT: ['insurgent', 'ambush', 'gunmen', 'armed attack', 'mortar attack'],
  GROUND_ASSAULT: ['ground assault', 'infantry', 'firefight', 'clashes', 'combat'],
  AIRSTRIKE: ['airstrike', 'air strike', 'bombing raid', 'coalition aircraft', 'jets struck'],
  MISSILE: ['missile', 'rocket salvo', 'katyusha', 'rocket fire'],
  DRONE: ['drone strike', 'uav', 'unmanned', 'predator'],
  ARTILLERY: ['artillery', 'mortar', 'shelling', 'barrage'],
  NAVAL: ['naval', 'waterway', 'shatt', 'river patrol', 'cargo ship', 'tanker', 'vessel', 'ship struck', 'ship attack', 'projectile', 'maritime', 'strait of hormuz', 'red sea', 'gulf of aden', 'houthi ship', 'merchant ship'],
  CYBER: ['cyber', 'hack', 'network', 'communications down'],
  SPECIAL_OPS: ['raid', 'special forces', 'jsoc', 'delta force', 'seal team', 'hvt'],
}

function classifyAttackType(text: string): AttackType {
  const lower = text.toLowerCase()
  let bestType: AttackType = 'INSURGENT'
  let bestScore = 0

  for (const [type, keywords] of Object.entries(ATTACK_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestType = type as AttackType
    }
  }
  return bestType
}

function scoreThreatLevel(text: string): ThreatLevel {
  const lower = text.toLowerCase()
  if (lower.match(/killed|dead|deaths|casualties|massacre|dozens|hundreds/)) return 'CRITICAL'
  if (lower.match(/wounded|injured|attack|explosion|bomb/)) return 'HIGH'
  if (lower.match(/incident|clash|fired|shot/)) return 'MEDIUM'
  return 'LOW'
}

/** Parse raw XML RSS string into NewsItem array */
export function parseRSSFeed(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = stripCDATA(extractTag(block, 'title'))
    const desc = stripCDATA(extractTag(block, 'description'))
    const link = extractTag(block, 'link')
    const pubDateStr = extractTag(block, 'pubDate')

    if (!title) continue

    const text = `${title} ${desc}`
    const loc = geocodeText(text)

    let publishedAt: Date
    try {
      publishedAt = pubDateStr ? new Date(pubDateStr) : new Date()
    } catch {
      publishedAt = new Date()
    }

    items.push({
      id: `news-${sourceName}-${Date.now()}-${items.length}`,
      title,
      summary: cleanText(desc).substring(0, 300),
      source: sourceName,
      url: link,
      publishedAt,
      location: loc
        ? { ...jitterCoords(loc.lat, loc.lng), name: loc.name, region: loc.province }
        : undefined,
    })
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'))
  return match ? match[1].trim() : ''
}

function stripCDATA(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').trim()
}

/** Stable ID from URL — same article always gets the same ID across fetches */
function urlToId(url: string): string {
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).toUpperCase().padStart(7, '0')
}

/** Convert a NewsItem into an Incident for the map */
export function newsItemToIncident(item: NewsItem, _index: number, idPrefix = 'NEWS'): Incident {
  const text = `${item.title} ${item.summary}`
  const attackType = classifyAttackType(text)
  const threatLevel = scoreThreatLevel(text)

  const fallbackLoc = ALL_LOCATIONS[Math.abs(urlToId(item.url).charCodeAt(0)) % ALL_LOCATIONS.length]
  const loc = item.location ?? {
    ...jitterCoords(fallbackLoc.lat, fallbackLoc.lng),
    name: fallbackLoc.name,
    region: fallbackLoc.province,
  }

  return {
    id: `${idPrefix}-${urlToId(item.url || item.title)}`,
    timestamp: item.publishedAt,
    location: loc,
    attackType,
    threatLevel,
    status: 'UNVERIFIED',
    casualties: { confirmed: 0, estimated: 0, civilian: 0 },
    description: item.title,
    source: item.source,
    verified: false,
    details: `${item.summary}\n\nSource: ${item.source}\nURL: ${item.url}`,
  }
}

/** RSS feed sources to fetch (CENTCOM AOR — no API key required) */
export const RSS_SOURCES = [
  // Traditional outlets
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  // Google News RSS — free, no key, real-time OSINT
  { url: 'https://news.google.com/rss/search?q=iraq+attack+OR+explosion+OR+airstrike&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Iraq' },
  { url: 'https://news.google.com/rss/search?q=iran+missile+OR+drone+strike+OR+irgc&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Iran' },
  { url: 'https://news.google.com/rss/search?q=strait+of+hormuz+OR+persian+gulf+attack&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Hormuz' },
  { url: 'https://news.google.com/rss/search?q=houthi+attack+OR+red+sea+ship+strike&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Houthi' },
  { url: 'https://news.google.com/rss/search?q=syria+airstrike+OR+bomb+OR+killed&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Syria' },
]

// CENTCOM AOR geographic location keywords — must be an actual place reference
const CENTCOM_GEO_TERMS = [
  // Countries
  'in iraq', 'in iran', 'in syria', 'in yemen', 'in israel', 'in gaza', 'in lebanon',
  'in kuwait', 'in bahrain', 'in qatar', 'in saudi', 'in jordan', 'in turkey',
  'in oman', 'in uae', 'in egypt', 'in afghanistan', 'in pakistan',
  // Regions / bodies of water
  'persian gulf', 'red sea', 'gulf of aden', 'strait of hormuz', 'arabian sea',
  'west bank', 'gaza strip',
  // Iraq cities
  'baghdad', 'mosul', 'basra', 'fallujah', 'kirkuk', 'ramadi', 'tikrit', 'najaf', 'karbala',
  // Iran cities
  'tehran', 'isfahan', 'tabriz',
  // Syria cities
  'damascus', 'aleppo', 'raqqa', 'deir ez-zor',
  // Yemen cities
  'sanaa', 'hodeidah', 'aden',
  // Israel / Palestine
  'tel aviv', 'jerusalem', 'haifa', 'rafah', 'khan yunis', 'hebron', 'jenin', 'nablus',
  'gaza city', 'beit lahiya', 'northern gaza',
  // Lebanon
  'beirut', 'south lebanon', 'tyre', 'sidon',
  // Gulf / Saudi
  'riyadh', 'jeddah', 'mecca', 'doha', 'manama', 'abu dhabi', 'dubai',
  'amman', 'ankara', 'istanbul',
  // Militant groups / AOR-specific actors
  'houthi', 'isis', 'isil', 'daesh', 'al-qaeda', 'hamas', 'pij', 'hezbollah', 'irgc', 'pmu',
]

// Must also mention actual conflict/violence — prevents sports/politics articles slipping through
const CONFLICT_TERMS = [
  'attack', 'strike', 'airstrike', 'bomb', 'explosion', 'rocket', 'missile', 'drone',
  'killed', 'dead', 'wounded', 'casualties', 'troops', 'forces', 'military',
  'gunfire', 'shooting', 'mortar', 'artillery', 'clash', 'combat', 'battle',
  'offensive', 'raid', 'ambush', 'siege', 'launched', 'targeted', 'destroyed',
  'ied', 'suicide bomber', 'car bomb', 'shelling', 'sniper',
]

export function isRelevantToAOR(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase()
  return CENTCOM_GEO_TERMS.some(kw => text.includes(kw)) &&
         CONFLICT_TERMS.some(kw => text.includes(kw))
}
