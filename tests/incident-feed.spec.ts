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

test.describe('Incident Feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/news', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS_RESPONSE) })
    )
    await page.route('/api/social', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ incidents: [], fetchedAt: new Date().toISOString() }) })
    )
    await page.goto('/')
    await page.waitForSelector('[data-testid="tactical-map"]', { timeout: 15000 })
    await page.waitForSelector('[data-testid^="feed-item-"]', { timeout: 10000 })
  })

  test('displays LIVE INCIDENT FEED heading', async ({ page }) => {
    await expect(page.getByText('LIVE INCIDENT FEED')).toBeVisible()
  })

  test('shows active incident count badge', async ({ page }) => {
    await expect(page.getByText(/\d+ ACTIVE/).first()).toBeVisible()
  })

  test('feed items have location names from Iraq', async ({ page }) => {
    const iraqCities = ['Baghdad', 'Fallujah', 'Mosul', 'Basra', 'Tikrit', 'Ramadi', 'Kirkuk', 'Najaf']
    let found = false
    for (const city of iraqCities) {
      if (await page.getByText(city).first().isVisible().catch(() => false)) {
        found = true
        break
      }
    }
    expect(found, 'At least one Iraq city should appear in the feed').toBe(true)
  })

  test('source filter tabs are rendered', async ({ page }) => {
    for (const tab of ['ALL', 'INTEL', 'NEWS', 'SOCIAL']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible()
    }
  })

  test('clicking INTEL tab only shows INC- prefixed incidents', async ({ page }) => {
    await page.getByRole('button', { name: 'INTEL' }).click()
    await page.waitForTimeout(300)
    const feedItems = page.locator('[data-testid^="feed-item-"]')
    const count = await feedItems.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const testId = await feedItems.nth(i).getAttribute('data-testid')
      expect(testId).toMatch(/feed-item-INC-/)
    }
  })

  test('clicking a feed item opens the detail panel', async ({ page }) => {
    const firstItem = page.locator('[data-testid^="feed-item-"]').first()
    await firstItem.click()
    await expect(page.locator('[data-testid="incident-detail"]')).toBeVisible({ timeout: 10000 })
  })

  test('feed items disappear after opening detail view', async ({ page }) => {
    const firstItem = page.locator('[data-testid^="feed-item-"]').first()
    await firstItem.click()
    await expect(page.locator('[data-testid="incident-detail"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('LIVE INCIDENT FEED')).not.toBeVisible()
  })
})
