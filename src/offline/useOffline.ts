import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { summarizeOffline, type OfflineState, type PrecacheReport, type ServiceWorkerRequest } from './offlineCheck'

const UPDATE_CHECK_MS = 30 * 60 * 1000

function ask(worker: ServiceWorker, message: ServiceWorkerRequest, timeoutMs = 10_000): Promise<PrecacheReport | null> {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => resolve(null), timeoutMs)
    channel.port1.onmessage = event => {
      clearTimeout(timer)
      resolve(event.data as PrecacheReport)
    }
    worker.postMessage(message, [channel.port2])
  })
}

async function inspect(request: ServiceWorkerRequest = { type: 'CHECK_OFFLINE' }): Promise<OfflineState> {
  if (!('serviceWorker' in navigator)) return summarizeOffline({ supported: false, controlled: false, report: null })
  const controller = navigator.serviceWorker.controller
  if (!controller) return summarizeOffline({ supported: true, controlled: false, report: null })
  return summarizeOffline({ supported: true, controlled: true, report: await ask(controller, request) })
}

/** Registers the service worker, verifies the offline cache and surfaces app updates. */
export function useOffline() {
  const [state, setState] = useState<OfflineState>({ status: import.meta.env.DEV ? 'unsupported' : 'preparing' })
  const [updateReady, setUpdateReady] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const check = useCallback(async (request?: ServiceWorkerRequest) => {
    clearTimeout(timer.current)
    const next = await inspect(request)
    setState(next)
    if (next.status === 'preparing') timer.current = setTimeout(() => void check(), 1500)
    if (next.status === 'ready') void navigator.storage?.persist?.().catch(() => false)
    return next
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
      setState({ status: 'unsupported' })
      return
    }
    let interval: ReturnType<typeof setInterval> | undefined
    registerSW({
      immediate: true,
      onNeedRefresh: () => setUpdateReady(true),
      onRegisterError: () => setState({ status: 'incomplete' }),
      // Exhibition laptops stay open for hours: look for a new version now and then.
      onRegisteredSW: (_url, registration) => {
        interval = setInterval(() => {
          if (navigator.onLine) void registration?.update().catch(() => undefined)
        }, UPDATE_CHECK_MS)
      },
    })
    const onControllerChange = () => void check()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    void check()
    return () => {
      clearTimeout(timer.current)
      clearInterval(interval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [check])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  /** Re-downloads anything missing from the offline cache, then re-checks. */
  const repair = useCallback(async () => {
    setState(previous => ({ ...previous, status: 'preparing' }))
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.update().catch(() => undefined)
    return check({ type: 'REPAIR_OFFLINE' })
  }, [check])

  /**
   * Activates the waiting version and reloads. Call only after the artwork is saved.
   * Reloading here (not through workbox-window) also covers a first visit, where
   * workbox-window marks the later controller change as "not an update" and skips it.
   */
  const applyUpdate = useCallback(async () => {
    const waiting = (await navigator.serviceWorker.getRegistration())?.waiting
    if (!waiting) return window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    const request: ServiceWorkerRequest = { type: 'SKIP_WAITING' }
    waiting.postMessage(request)
  }, [])

  const dismissUpdate = useCallback(() => setUpdateReady(false), [])

  return { ...state, online, updateReady, check, repair, applyUpdate, dismissUpdate }
}
