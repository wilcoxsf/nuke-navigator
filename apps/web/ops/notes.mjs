// Friends' notes from SEND A NOTE (11 Nov 2026; functions/api/note.js). Run from apps/web:  node ops/notes.mjs [how many, newest first; default 30]
import { execFileSync } from 'node:child_process'
const NAMESPACE = '61aa468915be47abb6f64fc10fc9060c' // WITNESS
const wr = (...a) => execFileSync('npx', ['--yes', 'wrangler', ...a], { encoding: 'utf8', shell: true })
const n = Number(process.argv[2] || 30)
const keys = JSON.parse(wr('kv', 'key', 'list', '--namespace-id', NAMESPACE, '--prefix', 'n:', '--remote')).map((k) => k.name).sort().reverse().slice(0, n)
if (!keys.length) console.log('no notes yet')
for (const k of keys) { const v = JSON.parse(wr('kv', 'key', 'get', `"${k}"`, '--namespace-id', NAMESPACE, '--remote') || '{}'); console.log(`\n${v.at}  ${v.name}  (${v.where})\n${v.text}`) }
