export type PrecacheReport = { total: number; missing: string[] }
export type OfflineStatus = 'unsupported' | 'preparing' | 'incomplete' | 'ready'
export type OfflineState = { status: OfflineStatus; total?: number; missing?: number }

export type ServiceWorkerRequest = { type: 'CHECK_OFFLINE' } | { type: 'REPAIR_OFFLINE' } | { type: 'SKIP_WAITING' }

/** Precache entries whose cached copy is missing. */
export async function missingEntries(urls: string[], isCached: (url: string) => Promise<boolean>): Promise<string[]> {
  const results = await Promise.all(urls.map(async url => ((await isCached(url)) ? null : url)))
  return results.filter((url): url is string => url !== null)
}

/**
 * "Ready for offline" means: a service worker controls this page AND it has
 * confirmed that every precached file (HTML, JS, CSS, model, WASM) is in the
 * cache. Being online or offline says nothing about it.
 */
export function summarizeOffline(input: { supported: boolean; controlled: boolean; report: PrecacheReport | null }): OfflineState {
  if (!input.supported) return { status: 'unsupported' }
  if (!input.controlled || !input.report) return { status: 'preparing' }
  const { total, missing } = input.report
  if (total === 0 || missing.length) return { status: 'incomplete', total, missing: missing.length }
  return { status: 'ready', total, missing: 0 }
}
