import { describe, expect, it } from 'vitest'
import { sameOriginFetch } from './privacy'

describe('sameOriginFetch', () => {
  const origin = 'https://mua-net.pages.dev'
  const calls: string[] = []
  const blocked: string[] = []
  const inner = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response('ok')
  }) as typeof fetch
  const guarded = sameOriginFetch(inner, origin, host => blocked.push(host))

  it('lets the model and WASM load from the app itself', async () => {
    await guarded('/models/hand_landmarker.task')
    await guarded(new URL('/wasm/vision_wasm_module_internal.wasm', origin))
    expect(calls).toEqual(['/models/hand_landmarker.task', `${origin}/wasm/vision_wasm_module_internal.wasm`])
  })

  it('refuses every other host, e.g. MediaPipe usage logging', async () => {
    await expect(guarded('https://odml.pa.googleapis.com/v1/log', { method: 'POST' })).rejects.toThrow(/chặn/)
    await expect(guarded(new Request('https://example.com/upload'))).rejects.toThrow()
    expect(blocked).toEqual(['odml.pa.googleapis.com', 'example.com'])
    expect(calls).toHaveLength(2)
  })
})
