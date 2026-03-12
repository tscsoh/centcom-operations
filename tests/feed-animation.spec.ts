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

test.describe('Feed slide-in animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/news', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS_RESPONSE) })
    )
    await page.route('/api/social', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ incidents: [], fetchedAt: new Date().toISOString() }) })
    )
    await page.route('/api/incidents**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ incidents: [], total: 0, earliest: null, latest: null }) })
    )
    await page.goto('/')
    await page.waitForSelector('[data-testid^="feed-item-"]', { timeout: 15000 })
  })

  test('initial items do NOT have feed-item-new class', async ({ page }) => {
    // All items present at load time must not be animated
    const items = page.locator('[data-testid^="feed-item-"]')
    const count = await items.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 5); i++) {
      const classList = await items.nth(i).getAttribute('class') ?? ''
      expect(classList).not.toContain('feed-item-new')
    }
  })

  test('new item gets feed-item-new class when it appears', async ({ page }) => {
    // Record IDs currently in the feed
    const initialItems = await page.locator('[data-testid^="feed-item-"]').all()
    const initialIds = await Promise.all(initialItems.map(el => el.getAttribute('data-testid')))

    // Wait for a new item to appear (mock auto-update fires within 5s, 65% chance; give it 10s)
    await page.waitForFunction(
      (knownIds: string[]) => {
        const items = document.querySelectorAll('[data-testid^="feed-item-"]')
        for (const item of items) {
          const id = item.getAttribute('data-testid') ?? ''
          if (!knownIds.includes(id)) return true
        }
        return false
      },
      initialIds,
      { timeout: 10000 }
    )

    // Immediately after the new item appears it should carry the animation class
    const newItem = await page.waitForSelector('[data-testid^="feed-item-"].feed-item-new', { timeout: 500 })
    expect(newItem).not.toBeNull()
  })

  test('feed-item-new class is removed after animation completes', async ({ page }) => {
    const initialItems = await page.locator('[data-testid^="feed-item-"]').all()
    const initialIds = await Promise.all(initialItems.map(el => el.getAttribute('data-testid')))

    // Wait for a new item
    await page.waitForFunction(
      (knownIds: string[]) => {
        const items = document.querySelectorAll('[data-testid^="feed-item-"]')
        for (const item of items) {
          const id = item.getAttribute('data-testid') ?? ''
          if (!knownIds.includes(id)) return true
        }
        return false
      },
      initialIds,
      { timeout: 10000 }
    )

    // Wait for the animation class to appear…
    await page.waitForSelector('[data-testid^="feed-item-"].feed-item-new', { timeout: 500 })

    // …then wait for it to disappear (class removed after 600ms)
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="feed-item-"].feed-item-new').length === 0,
      { timeout: 1200 }
    )
  })
})
