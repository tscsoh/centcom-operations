import { ALL_LOCATIONS, IraqLocation } from '../iraq-locations'

// Keyword → location name mapping for geocoding free-text mentions
const KEYWORD_MAP: Record<string, string> = {
  // Iraq cities
  baghdad: 'Baghdad',
  fallujah: 'Fallujah',
  fallouja: 'Fallujah',
  mosul: 'Mosul',
  basra: 'Basra',
  basrah: 'Basra',
  tikrit: 'Tikrit',
  ramadi: 'Ramadi',
  kirkuk: 'Kirkuk',
  najaf: 'Najaf',
  karbala: 'Karbala',
  samarra: 'Samarra',
  baqubah: 'Baqubah',
  haditha: 'Haditha',
  'tal afar': 'Tal Afar',
  amarah: 'Amarah',
  nasiriyah: 'Nasiriyah',
  hillah: 'Hillah',
  rutbah: 'Ar Rutbah',
  'abu ghraib': 'Abu Ghraib',
  // Iraq provinces / regions
  anbar: 'Ramadi',
  'al anbar': 'Ramadi',
  nineveh: 'Mosul',
  diyala: 'Baqubah',
  saladin: 'Tikrit',
  maysan: 'Amarah',
  'dhi qar': 'Nasiriyah',
  babylon: 'Hillah',
  // Iraq colloquial
  'green zone': 'Baghdad',
  'international zone': 'Baghdad',
  'sunni triangle': 'Ramadi',
  'triangle of death': 'Hillah',
  'golden mosque': 'Samarra',
  'sadr city': 'Baghdad',
  'camp victory': 'Baghdad',
  'camp anaconda': 'Baqubah',
  // Syria
  damascus: 'Damascus',
  'abu kamal': 'Abu Kamal',
  'deir ez-zor': 'Deir ez-Zor',
  'deir ezzor': 'Deir ez-Zor',
  // Jordan
  amman: 'Amman',
  zarqa: 'Zarqa',
  // Kuwait
  'kuwait city': 'Kuwait City',
  kuwait: 'Kuwait City',
  'camp doha': 'Camp Doha',
  // Saudi Arabia
  riyadh: 'Riyadh',
  'prince sultan': 'Prince Sultan AB',
  // Iran
  tehran: 'Tehran',
  ahvaz: 'Ahvaz',
  mehran: 'Mehran',
  // Turkey
  incirlik: 'Incirlik AB',
  diyarbakir: 'Diyarbakir',
  // Gulf / Persian Gulf
  'strait of hormuz': 'Strait of Hormuz',
  hormuz: 'Strait of Hormuz',
  'persian gulf': 'Manama',
  'gulf of oman': 'Muscat',
  dubai: 'Dubai',
  'abu dhabi': 'Abu Dhabi',
  uae: 'Dubai',
  'united arab emirates': 'Dubai',
  muscat: 'Muscat',
  oman: 'Muscat',
  doha: 'Doha',
  qatar: 'Doha',
  'al udeid': 'Doha',
  manama: 'Manama',
  bahrain: 'Manama',
  navcent: 'Manama',
  // Yemen / Red Sea
  sanaa: 'Sanaa',
  "sana'a": 'Sanaa',
  houthi: 'Hodeidah',
  'ansar allah': 'Hodeidah',
  hodeidah: 'Hodeidah',
  'red sea': 'Hodeidah',
  aden: 'Aden',
  'gulf of aden': 'Aden',
  yemen: 'Sanaa',
  // Vessels / maritime (map to Strait of Hormuz or closest Gulf location)
  'cargo ship': 'Strait of Hormuz',
  tanker: 'Strait of Hormuz',
  vessel: 'Strait of Hormuz',
  projectile: 'Strait of Hormuz',
  'merchant ship': 'Strait of Hormuz',
  // Israel / Palestine / Gaza
  israel: 'Tel Aviv',
  'tel aviv': 'Tel Aviv',
  haifa: 'Tel Aviv',
  ashkelon: 'Tel Aviv',
  sderot: 'Gaza City',
  jerusalem: 'Jerusalem',
  'west bank': 'West Bank',
  jenin: 'West Bank',
  nablus: 'West Bank',
  hebron: 'West Bank',
  ramallah: 'West Bank',
  jericho: 'West Bank',
  tulkarm: 'West Bank',
  gaza: 'Gaza City',
  'gaza city': 'Gaza City',
  'gaza strip': 'Gaza City',
  rafah: 'Rafah',
  'khan yunis': 'Khan Yunis',
  'khan younis': 'Khan Yunis',
  'beit lahiya': 'Gaza City',
  'northern gaza': 'Gaza City',
  hamas: 'Gaza City',
  'iron dome': 'Tel Aviv',
  idf: 'Tel Aviv',
  'israeli forces': 'Tel Aviv',
  // Lebanon
  lebanon: 'Beirut',
  beirut: 'Beirut',
  'south lebanon': 'South Lebanon',
  'southern lebanon': 'South Lebanon',
  tyre: 'South Lebanon',
  sidon: 'Beirut',
  'bekaa valley': 'Beirut',
  // Aleppo
  aleppo: 'Aleppo',
}

const LOCATION_INDEX: Record<string, IraqLocation> = {}
for (const loc of ALL_LOCATIONS) {
  LOCATION_INDEX[loc.name] = loc
}

/**
 * Attempt to extract a location from a free-text string.
 * Returns the matched location or null if no match found.
 */
export function geocodeText(text: string): IraqLocation | null {
  const lower = text.toLowerCase()

  for (const [keyword, locationName] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      const loc = LOCATION_INDEX[locationName]
      if (loc) return loc
    }
  }

  // Fallback: direct name match against all known locations
  for (const loc of ALL_LOCATIONS) {
    if (lower.includes(loc.name.toLowerCase())) return loc
  }

  return null
}

/**
 * Add small random jitter to coordinates so multiple incidents at the
 * same city don't stack on top of each other.
 */
export function jitterCoords(lat: number, lng: number, radiusDeg = 0.15): { lat: number; lng: number } {
  return {
    lat: lat + (Math.random() - 0.5) * radiusDeg * 2,
    lng: lng + (Math.random() - 0.5) * radiusDeg * 2,
  }
}
