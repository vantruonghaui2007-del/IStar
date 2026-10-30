// Pre-release audit of dist/ — run after `npm run build`.
// Usage: node scripts/check-release.mjs
import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dist = path.join(root, 'dist')
const MIB = 1024 * 1024
const CLOUDFLARE_FILE_LIMIT = 25 * MIB
const MODEL_SHA256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1'
const MEDIAPIPE_VERSION = '1.2.0'
// Hosts that appear in bundled code but are never contacted: XML namespaces,
// links inside comments and error messages, and MediaPipe's usage-logging
// endpoint, which the worker's same-origin fetch guard and the CSP block.
const INERT_HOSTS = new Set([
  'www.w3.org', 'react.dev', 'www.khronos.org', 'www.ietf.org', 'tools.ietf.org', 'webkit.org', 'github.com', 'developer.mozilla.org',
  'bugzil.la', 'bit.ly', 'unicode.org', 'server.com', 'pubs.opengroup.org', 'kripken.github.io', 'en.wikipedia.org', 'odml.pa.googleapis.com',
])
const SECRET_PATTERNS = [/AIza[0-9A-Za-z_-]{35}/, /\bsk-[A-Za-z0-9]{20,}/, /\bghp_[A-Za-z0-9]{36}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/]

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`)
  if (!ok) failures.push(message)
}

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => (entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)])))
  return nested.flat()
}

const all = await files(dist)
const sizes = await Promise.all(all.map(async file => ({ file: path.relative(dist, file), size: (await stat(file)).size })))
const largest = sizes.sort((a, b) => b.size - a.size)[0]
check(sizes.every(({ size }) => size <= CLOUDFLARE_FILE_LIMIT), `every file ≤ 25 MiB (largest: ${largest.file}, ${(largest.size / MIB).toFixed(1)} MiB; total ${(sizes.reduce((sum, { size }) => sum + size, 0) / MIB).toFixed(1)} MiB in ${sizes.length} files)`)

const model = await readFile(path.join(dist, 'models/hand_landmarker.task'))
check(createHash('sha256').update(model).digest('hex') === MODEL_SHA256, 'hand_landmarker.task matches the documented SHA-256')

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
check(pkg.dependencies['@mediapipe/tasks-vision'] === MEDIAPIPE_VERSION, `@mediapipe/tasks-vision pinned to ${MEDIAPIPE_VERSION}`)
for (const name of ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm']) {
  const [shipped, upstream] = await Promise.all([readFile(path.join(dist, 'wasm', name)), readFile(path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm', name))])
  check(shipped.equals(upstream), `wasm/${name} is identical to the installed runtime`)
}

const textFiles = all.filter(file => /\.(html|js|mjs|css|webmanifest|json)$/.test(file) || path.basename(file) === '_headers')
const hosts = new Map()
const secrets = []
for (const file of textFiles) {
  const text = await readFile(file, 'utf8')
  for (const pattern of SECRET_PATTERNS) if (pattern.test(text)) secrets.push(`${path.relative(dist, file)} (${pattern})`)
  for (const match of text.matchAll(/https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost)/g)) {
    const list = hosts.get(match[1]) ?? new Set()
    list.add(path.relative(dist, file))
    hosts.set(match[1], list)
  }
}
check(secrets.length === 0, `no API keys or private keys in ${textFiles.length} text files${secrets.length ? `: ${secrets.join(', ')}` : ''}`)
const unexpected = [...hosts.keys()].filter(host => !INERT_HOSTS.has(host))
check(unexpected.length === 0, `no unexpected external hosts in shipped code${unexpected.length ? `: ${unexpected.map(host => `${host} (${[...hosts.get(host)].join(', ')})`).join('; ')}` : ''}`)

const workerFile = all.find(file => /hand\.worker-.*\.js$/.test(file))
check(Boolean(workerFile) && (await readFile(workerFile, 'utf8')).includes('Đã chặn yêu cầu mạng'), 'hand worker ships the same-origin fetch guard')

const headers = await readFile(path.join(dist, '_headers'), 'utf8')
check(/connect-src 'self'/.test(headers), "_headers sets CSP connect-src 'self'")
check(/Permissions-Policy: camera=\(self\)/.test(headers), '_headers limits camera to this site')

const sw = await readFile(path.join(dist, 'sw.js'), 'utf8')
for (const required of ['index.html', 'models/hand_landmarker.task', 'wasm/vision_wasm_module_internal.wasm', 'wasm/vision_wasm_module_internal.js', 'hand.worker-']) {
  check(sw.includes(required), `service worker precaches ${required}`)
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`)
  process.exit(1)
}
console.log('\nRelease checks passed.')
