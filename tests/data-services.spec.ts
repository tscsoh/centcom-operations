import { test, expect } from '@playwright/test'

test.describe('Data Service API Routes', () => {
  test('GET /api/news returns valid JSON shape', async ({ request }) => {
    const res = await request.get('/api/news')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('incidents')
    expect(body).toHaveProperty('fetchedAt')
    expect(Array.isArray(body.incidents)).toBe(true)
  })

  test('GET /api/social returns valid JSON shape', async ({ request }) => {
    const res = await request.get('/api/social')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('incidents')
    expect(body).toHaveProperty('fetchedAt')
    expect(Array.isArray(body.incidents)).toBe(true)
  })

  test('news incidents have required Incident fields', async ({ request }) => {
    const res = await request.get('/api/news')
    const body = await res.json()
    for (const incident of body.incidents) {
      expect(incident).toHaveProperty('id')
      expect(incident).toHaveProperty('timestamp')
      expect(incident).toHaveProperty('location')
      expect(incident).toHaveProperty('attackType')
      expect(incident).toHaveProperty('threatLevel')
      expect(incident).toHaveProperty('status')
      expect(incident).toHaveProperty('casualties')
      expect(incident).toHaveProperty('description')
      expect(incident).toHaveProperty('source')
      // News incidents should be prefixed with NEWS-
      expect(incident.id.startsWith('NEWS-')).toBe(true)
    }
  })

  test('social incidents have required Incident fields', async ({ request }) => {
    const res = await request.get('/api/social')
    const body = await res.json()
    for (const incident of body.incidents) {
      expect(incident).toHaveProperty('id')
      expect(incident).toHaveProperty('location')
      expect(incident.id.startsWith('SOC-')).toBe(true)
    }
  })
})
