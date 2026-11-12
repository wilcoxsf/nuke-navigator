// Accounts for the private site (11 Nov 2026; lib/auth.js). Run from apps/web:
//   node ops/users.mjs add "Andrew"     makes an account with a starting password; they pick their own on first sign-in
//   node ops/users.mjs reset "Andrew"   a new starting password (for someone locked out)
//   node ops/users.mjs list             names, when made, and whether they still have the starting password
//   node ops/users.mjs remove "Andrew"  deletes the account (their WITNESS STAND entry stays)
// Starting passwords are written to ~/.config/nuke-navigator/users.txt (outside the repo), not printed. Hashing matches lib/auth.js (PBKDF2-SHA256, 100,000).
import { execFileSync } from 'node:child_process'
import { randomBytes, pbkdf2Sync } from 'node:crypto'
import { appendFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const NAMESPACE = '2417dbdcbf8041078341950c98b78e85' // TOKENS
const SITE = process.env.NN_SITE || 'https://nuke-navigator.pages.dev'
const wr = (...a) => execFileSync('npx', ['--yes', 'wrangler', ...a], { encoding: 'utf8', shell: true })
const clean = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9 ._-]/g, '').slice(0, 30)
const b64 = (b) => Buffer.from(b).toString('base64url')
const WORDS = ['tater', 'splash', 'cove', 'fog', 'gull', 'crab', 'barry', 'willie', 'orange', 'dinger', 'bleacher', 'cable', 'sourdough', 'garlic', 'wallop', 'moon', 'kayak', 'seal']
const starter = () => { const r = randomBytes(6); return `${WORDS[r[0] % WORDS.length]}-${WORDS[r[1] % WORDS.length]}-${WORDS[r[2] % WORDS.length]}-${(r.readUInt16BE(3) % 900) + 100}` }
function put(name, display, pw) {
  const salt = b64(randomBytes(16)), hash = b64(pbkdf2Sync(pw, Buffer.from(salt, 'base64url'), 100000, 32, 'sha256'))
  const rec = { name, display, salt, hash, iter: 100000, must: true, created: new Date().toISOString() }
  const f = join(tmpdir(), 'nn-user-' + randomBytes(4).toString('hex') + '.json'); writeFileSync(f, JSON.stringify(rec)) // (a file, so the hash never sits on a command line)
  try { wr('kv', 'key', 'put', `"u:${name}"`, '--path', f, '--namespace-id', NAMESPACE, '--remote') } finally { unlinkSync(f) }
}
const [cmd, arg] = process.argv.slice(2)
const name = clean(arg)
if ((cmd === 'add' || cmd === 'reset') && name) {
  const pw = starter(), dir = join(homedir(), '.config', 'nuke-navigator'); mkdirSync(dir, { recursive: true })
  put(name, String(arg).trim().toUpperCase().slice(0, 20), pw)
  appendFileSync(join(dir, 'users.txt'), `${new Date().toISOString()}\t${cmd}\t${name}\t${pw}\t${SITE}/login\n`)
  console.log(`${cmd === 'add' ? 'made' : 'reset'} ${name}; the starting password is in ${join(dir, 'users.txt')} (last line)`)
} else if (cmd === 'list') {
  const keys = JSON.parse(wr('kv', 'key', 'list', '--namespace-id', NAMESPACE, '--prefix', 'u:', '--remote'))
  for (const k of keys) { const v = JSON.parse(wr('kv', 'key', 'get', `"${k.name}"`, '--namespace-id', NAMESPACE, '--remote') || '{}'); console.log(`${v.display ?? v.name}\t${v.created ?? ''}\t${v.must ? 'STILL ON THE STARTING PASSWORD' : 'picked their own'}`) }
} else if (cmd === 'remove' && name) {
  wr('kv', 'key', 'delete', `"u:${name}"`, '--namespace-id', NAMESPACE, '--remote'); console.log('removed', name)
} else console.log('usage: node ops/users.mjs add "Name" | reset "Name" | list | remove "Name"')
