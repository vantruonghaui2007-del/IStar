/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

/**
 * Sent by `vite preview` and, via the generated `_headers` file, by
 * Cloudflare Pages. `connect-src 'self'` means the browser itself refuses to
 * send anything (camera frames, hand points, artworks) to another server.
 */
const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

/** Writes Cloudflare Pages' `_headers`: security headers everywhere, and no stale service worker or HTML. */
function cloudflareHeaders(): Plugin {
  return {
    name: 'cloudflare-headers',
    apply: 'build',
    generateBundle() {
      const lines = ['/*', ...Object.entries(securityHeaders).map(([key, value]) => `  ${key}: ${value}`), '', '/sw.js', '  Cache-Control: no-cache', '', '/index.html', '  Cache-Control: no-cache', '', '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '']
      this.emitFile({ type: 'asset', fileName: '_headers', source: lines.join('\n') })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflareHeaders(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/offline',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,
      devOptions: { enabled: false },
      injectManifest: {
        // The plugin's defaults skip .task and .wasm and anything over 2 MiB;
        // the model (7.5 MiB) and WASM (13.8 MiB) must be cached explicitly.
        globPatterns: ['**/*.{html,js,css,svg,png,wasm,task}'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
      },
      manifest: {
        name: 'Múa Nét AI — Gieo mầm',
        short_name: 'Múa Nét AI',
        description: 'Mỗi chuyển động nhỏ có thể nuôi dưỡng một điều tốt đẹp. Vẽ khu vườn bằng cử chỉ tay, AI nhận diện ngay trên máy.',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#f5f3ec',
        theme_color: '#3f694c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? pkg.version),
  },
  worker: { format: 'es' },
  preview: { headers: securityHeaders },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
