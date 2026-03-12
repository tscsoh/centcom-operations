/**
 * Social/supplemental RSS feeds — focused on Israel, Gaza, Lebanon, and broader CENTCOM AOR.
 * These complement the primary news feeds with additional geographic coverage.
 * Reddit has been removed: it produces opinion pieces and off-topic content, not incident reports.
 */

/** Additional RSS sources covering Israel, Gaza, and Lebanon */
export const SOCIAL_RSS_SOURCES = [
  { url: 'https://news.google.com/rss/search?q=israel+attack+OR+airstrike+OR+killed+Gaza&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Israel' },
  { url: 'https://news.google.com/rss/search?q=Gaza+strike+OR+explosion+OR+casualties&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Gaza' },
  { url: 'https://news.google.com/rss/search?q=hezbollah+attack+OR+lebanon+rocket+OR+strike&hl=en-US&gl=US&ceid=US:en', name: 'Google News: Lebanon' },
  { url: 'https://news.google.com/rss/search?q=west+bank+shooting+OR+attack+OR+killed&hl=en-US&gl=US&ceid=US:en', name: 'Google News: West Bank' },
  { url: 'https://www.timesofisrael.com/feed/', name: 'Times of Israel' },
  { url: 'https://news.google.com/rss/search?q=idf+strike+OR+hamas+rocket+OR+iron+dome&hl=en-US&gl=US&ceid=US:en', name: 'Google News: IDF' },
]
