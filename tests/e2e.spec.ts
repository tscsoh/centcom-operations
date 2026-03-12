import { test, expect } from '@playwright/test'
import fixtureIncidents from './fixtures/incidents.json'

// Simulate what the API routes actually return: timestamps as ISO strings (JSON-serialized)
const NEWS_RESPONSE = {
  incidents: fixtureIncidents.slice(0, 2).map((i, idx) => ({
    ...i,
    id: `NEWS-${String(idx).padStart(4, '0')}`,
    status: 'UNVERIFIED',
    verified: false,
  })),
  fetchedAt: new Date().toISOString(),
}

const SOCIAL_RESPONSE = {
  incidents: fixtureIncidents.slice(2, 4).map((i, idx) => ({
    ...i,
    id: `SOC-${String(idx).padStart(4, '0')}`,
    status: 'UNVERIFIED',
    verified: false,
  })),
  fetchedAt: new Date().toISOString(),
}

test.describe('E2E — Full User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Return real fixture data with string timestamps — this tests Date deserialization
    await page.route('/api/news', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS_RESPONSE) })
    )
    await page.route('/api/social', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SOCIAL_RESPONSE) })
    )
    await page.goto('/')
    await page.waitForSelector('[data-testid="tactical-map"]', { timeout: 15000 })
  })

  test('full page load — all major sections visible', async ({ page }) => {
    await expect(page.getByText('CENTCOM OPERATIONS')).toBeVisible()
    await expect(page.locator('[data-testid="tactical-map"]')).toBeVisible()
    await expect(page.locator('[data-testid="tactical-map"]').getByText(/IRAQ THEATER/)).toBeVisible()
    await expect(page.getByText('LIVE INCIDENT FEED')).toBeVisible()
    await expect(page.getByText(/UNCLASSIFIED.*OSINT/)).toBeVisible()
  })

  test('header shows live clock', async ({ page }) => {
    await expect(page.locator('header')).toContainText(/\d{2}:\d{2}:\d{2}/)
  })

  test('system status indicators shown in header', async ({ page }) => {
    const header = page.locator('header')
    await expect(header.getByText('SATLINK')).toBeVisible()
    await expect(header.getByText('SIGINT')).toBeVisible()
    await expect(header.getByText('CRYPTO')).toBeVisible()
  })

  test('API incidents with string timestamps do not crash stats panel', async ({ page }) => {
    // Wait for API incidents to be merged in — the stats panel must not throw
    await page.waitForTimeout(1000)
    // Stats panel stays visible (no crash) — confirms Date deserialization works
    await expect(page.locator('.overflow-auto').first()).toBeVisible()
    await expect(page.getByText(/INCIDENTS PLOTTED/)).toBeVisible()
  })

  test('select incident → detail view → feed heading disappears', async ({ page }) => {
    await page.waitForSelector('[data-testid^="feed-item-"]', { timeout: 10000 })
    const feedItem = page.locator('[data-testid^="feed-item-"]').first()
    await feedItem.click()
    await expect(page.locator('[data-testid="incident-detail"]')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('LIVE INCIDENT FEED')).not.toBeVisible()
  })

  test('refresh button reloads incidents', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /REFRESH/i })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-testid="tactical-map"]')).toBeVisible()
  })

  test('stats panel shows incident metrics', async ({ page }) => {
    const leftPanel = page.locator('.overflow-auto').first()
    await expect(leftPanel).toBeVisible()
    await expect(leftPanel.getByText(/\d+/).first()).toBeVisible()
  })

  test('source filter tabs switch active state', async ({ page }) => {
    const intelTab = page.getByRole('button', { name: 'INTEL' })
    await intelTab.click()
    await expect(intelTab).toHaveClass(/bg-primary/)
    const allTab = page.getByRole('button', { name: 'ALL' })
    await allTab.click()
    await expect(allTab).toHaveClass(/bg-primary/)
  })
})
