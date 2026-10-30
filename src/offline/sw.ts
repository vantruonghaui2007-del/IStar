/// <reference lib="webworker" />
import { clientsClaim, cacheNames } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, getCacheKeyForURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { missingEntries, type PrecacheReport, type ServiceWorkerRequest } from './offlineCheck'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] }

// Injected at build time: index.html, JS/CSS, the hand model (.task) and the
// MediaPipe WASM runtime — everything needed to draw with the camera offline.
const manifest = self.__WB_MANIFEST
const urls = manifest.map(entry => (typeof entry === 'string' ? entry : entry.url))

precacheAndRoute(manifest)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
clientsClaim()

async function report(): Promise<PrecacheReport> {
  const cache = await caches.open(cacheNames.precache)
  const missing = await missingEntries(urls, async url => {
    const key = getCacheKeyForURL(url)
    return Boolean(key && (await cache.match(key)))
  })
  return { total: urls.length, missing }
}

async function repair(): Promise<PrecacheReport> {
  const cache = await caches.open(cacheNames.precache)
  for (const url of (await report()).missing) {
    const key = getCacheKeyForURL(url)
    if (!key) continue
    try {
      const response = await fetch(url, { cache: 'reload' })
      if (response.ok) await cache.put(key, response)
    } catch {
      // Still offline; the report below says what is missing.
    }
  }
  return report()
}

self.addEventListener('message', event => {
  const message = event.data as ServiceWorkerRequest | undefined
  const reply = (work: Promise<PrecacheReport>) => event.waitUntil(work.then(result => event.ports[0]?.postMessage(result)))
  if (message?.type === 'SKIP_WAITING') void self.skipWaiting()
  else if (message?.type === 'CHECK_OFFLINE') reply(report())
  else if (message?.type === 'REPAIR_OFFLINE') reply(repair())
})
