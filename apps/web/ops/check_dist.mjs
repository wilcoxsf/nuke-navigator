// After `vite build`: list what is about to be served to token holders, and fail if anything that must never ship is in dist/.
// Never ship: data tables (parquet, csv, duckdb), secrets (.env, keys, token or credential files). Stadium models (.glb) and the derived data files (parks30.json, dists.json,
// giants_faces.json) are allowed because the site is token-gated, but they are printed every time so shipping them is a choice you can see, not an accident.
import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const root = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const NEVER = new Set(['.parquet', '.csv', '.duckdb', '.env', '.key', '.pem'])
const NEVER_NAMES = /^(\.env.*|credentials\.json|token\.json|tokens\.txt)$/
const SERVED_WITH_CARE = new Set(['.glb', '.gltf'])
const DERIVED = /^(parks30|dists|giants_faces|replay|pool|giants_games)\.json$/
const rows = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f), s = statSync(p); if (s.isDirectory()) walk(p); else rows.push({ p: p.slice(root.length), f, ext: extname(f).toLowerCase(), size: s.size }) } }
walk(root)
const mb = (n) => (n / 1048576).toFixed(2) + ' MB'
const bad = rows.filter((r) => NEVER.has(r.ext) || NEVER_NAMES.test(r.f))
const models = rows.filter((r) => SERVED_WITH_CARE.has(r.ext))
const derived = rows.filter((r) => DERIVED.test(r.f))
console.log(`dist: ${rows.length} files, ${mb(rows.reduce((a, r) => a + r.size, 0))} in total`)
if (models.length) console.log('STADIUM MODELS that will be served to token holders:\n' + models.map((r) => `  ${r.p}  ${mb(r.size)}`).join('\n'))
if (derived.length) console.log('DERIVED DATA files that will be served to token holders:\n' + derived.map((r) => `  ${r.p}  ${mb(r.size)}`).join('\n'))
if (bad.length) {
  console.error('FAIL: files that must never ship are in dist/:\n' + bad.map((r) => `  ${r.p}`).join('\n'))
  process.exit(1)
}
console.log('ok: no data tables or secrets in dist/ (models and derived files above are your call to deploy)')
