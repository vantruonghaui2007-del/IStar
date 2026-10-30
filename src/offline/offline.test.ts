import { describe, expect, it } from 'vitest'
import { missingEntries, summarizeOffline } from './offlineCheck'

describe('missingEntries', () => {
  it('lists every precache entry that is not in the cache', async () => {
    const cached = new Set(['/index.html', '/models/hand_landmarker.task'])
    const missing = await missingEntries(['/index.html', '/models/hand_landmarker.task', '/wasm/vision_wasm_module_internal.wasm'], async url => cached.has(url))
    expect(missing).toEqual(['/wasm/vision_wasm_module_internal.wasm'])
  })
})

describe('summarizeOffline', () => {
  it('is ready only when a service worker controls the page and nothing is missing', () => {
    expect(summarizeOffline({ supported: true, controlled: true, report: { total: 12, missing: [] } })).toEqual({ status: 'ready', total: 12, missing: 0 })
  })

  it('is still preparing while no service worker controls the page, whatever the network says', () => {
    expect(summarizeOffline({ supported: true, controlled: false, report: null }).status).toBe('preparing')
  })

  it('is incomplete when required files are missing from the cache', () => {
    expect(summarizeOffline({ supported: true, controlled: true, report: { total: 12, missing: ['/a.wasm', '/b.task'] } })).toEqual({ status: 'incomplete', total: 12, missing: 2 })
  })

  it('treats an empty or unanswered report as not ready', () => {
    expect(summarizeOffline({ supported: true, controlled: true, report: { total: 0, missing: [] } }).status).toBe('incomplete')
    expect(summarizeOffline({ supported: true, controlled: true, report: null }).status).toBe('preparing')
  })

  it('reports browsers without service workers', () => {
    expect(summarizeOffline({ supported: false, controlled: false, report: null }).status).toBe('unsupported')
  })
})
