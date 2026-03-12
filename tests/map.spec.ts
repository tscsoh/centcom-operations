import { test, expect } from '@playwright/test'
import fixtureIncidents from './fixtures/incidents.json'

const NEWS_RESPONSE = {
  incidents: fixtureIncidents.slice(0, 2).map((i, idx) => ({
    ...i,
    id: `NEWS-${String(idx).padStart(4, '0')}`,
    status: 'UNVERIFIED',
    verified: false,
  })),
  fetchedAt: new Date().toISOString(),
}

test.describe('Tactical Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/news', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS_RESPONSE) })
    )
    await page.route('/api/social', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ incidents: [], fetchedAt: new Date().toISOString() }) })
    )
    await page.goto('/')
    await page.waitForSelector('[data-testid="tactical-map"]', { timeout: 15000 })
  })

  test('renders Iraq theater map container', async ({ page }) => {
    await expect(page.locator('[data-testid="tactical-map"]')).toBeVisible()
  })

  test('displays Iraq theater label', async ({ page }) => {
    await expect(page.locator('[data-testid="tactical-map"]').getByText(/IRAQ THEATER/)).toBeVisible()
  })

  test('renders incident markers on the map', async ({ page }) => {
    const markers = page.locator('[data-testid^="incident-marker-INC-"]')
    await expect(markers.first()).toBeVisible({ timeout: 10000 })
    expect(await markers.count()).toBeGreaterThan(0)
  })

  test('shows tooltip on incident marker hover', async ({ page }) => {
    const firstMarker = page.locator('[data-testid^="incident-marker-"]').first()
    await expect(firstMarker).toBeVisible({ timeout: 10000 })
    await firstMarker.hover({ force: true })
    await page.waitForTimeout(300)
    const tooltip = page.locator('[data-testid="tactical-map"] .font-mono').filter({ hasText: /CRITICAL|HIGH|MEDIUM|LOW/ }).last()
    await expect(tooltip).toBeVisible({ timeout: 5000 })
  })

  test('selects incident via feed item and shows detail', async ({ page }) => {
    const feedItem = page.locator('[data-testid^="feed-item-"]').first()
    await expect(feedItem).toBeVisible({ timeout: 10000 })
    await feedItem.click()
    await expect(page.locator('[data-testid="incident-detail"]')).toBeVisible({ timeout: 10000 })
  })

  test('incident count overlay is visible', async ({ page }) => {
    await expect(page.getByText(/INCIDENTS PLOTTED/)).toBeVisible()
  })
})
