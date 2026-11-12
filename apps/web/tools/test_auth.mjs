// The sign-in gate without a browser (11 Nov 2026): functions/_middleware.js, /api/login, /api/password, /api/logout against a fake KV, with a user made the way
// ops/users.mjs makes one (node's PBKDF2). Usage: node tools/test_auth.mjs
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { onRequest as gate } from '../functions/_middleware.js'
import { onRequest as login } from '../functions/api/login.js'
import { onRequest as password } from '../functions/api/password.js'
import { onRequest as logout } from '../functions/api/logout.js'
let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const kv = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v) }, delete: async (k) => { m.delete(k) }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } }
const TOKENS = kv(), env = { TOKENS }
const salt = Buffer.from(randomBytes(16)).toString('base64url'), start = 'tater-cove-gull-123'
await TOKENS.put('u:andrew', JSON.stringify({ name: 'andrew', display: 'ANDREW', salt, hash: pbkdf2Sync(start, Buffer.from(salt, 'base64url'), 100000, 32, 'sha256').toString('base64url'), iter: 100000, must: true }))
const req = (path, o = {}) => new Request('https://nn.example' + path, { method: o.method ?? 'GET', headers: { 'content-type': 'application/json', ...(o.sid ? { Cookie: `nn_s=${o.sid}` } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined, redirect: 'manual' })
const through = async () => new Response('THE APP', { status: 200 })
const viaGate = (path, o, handler = through) => gate({ request: req(path, o), env, next: () => handler({ request: req(path, o), env }) })
const sidOf = (r) => /nn_s=([^;]+)/.exec(r.headers.get('Set-Cookie') ?? '')?.[1]

let r = await viaGate('/')
check('no session: the page sends you to /login', r.status === 302 && /\/login$/.test(r.headers.get('Location')))
r = await viaGate('/songs_private.json')
check('no session: the private files are not served either', r.status === 302)
r = await viaGate('/api/witness')
check('no session: the API says sign in (401)', r.status === 401)
r = await viaGate('/login')
check('the sign-in page itself is open, and asks for a name and a password', r.status === 200 && /SIGN IN/.test(await r.text()))
r = await viaGate('/api/login', { method: 'POST', body: { name: 'Andrew', password: 'wrong' } }, login)
check('a wrong password: 401 and no session', r.status === 401 && !sidOf(r))
r = await viaGate('/api/login', { method: 'POST', body: { name: ' ANDREW ', password: start } }, login)
let j = await r.json(), sid = sidOf(r)
check('the starting password signs in (name in any case) and says to pick your own', r.status === 200 && j.must === true && !!sid && /HttpOnly/.test(r.headers.get('Set-Cookie')))
r = await viaGate('/', { sid })
check('still on the starting password: everything sends you to pick your own', r.status === 302 && /set=1/.test(r.headers.get('Location')))
r = await viaGate('/login?set=1', { sid })
check('the pick-a-password page', r.status === 200 && /PICK YOUR OWN PASSWORD/.test(await r.text()))
r = await viaGate('/api/password', { method: 'POST', sid, body: { password: 'short' } }, password)
check('a password under 8 characters is refused', r.status === 400)
r = await viaGate('/api/password', { method: 'POST', sid, body: { password: start } }, password)
check('the starting password again is refused', r.status === 400)
r = await viaGate('/api/password', { method: 'POST', sid, body: { password: 'barry-bonds-762' } }, password)
check('your own password is set', r.status === 200 && (await r.json()).must === false)
r = await viaGate('/', { sid })
check('then the app opens', r.status === 200 && (await r.text()) === 'THE APP' && /noindex/.test(r.headers.get('X-Robots-Tag')))
r = await viaGate('/api/login', { method: 'POST', body: { name: 'andrew', password: start } }, login)
check('the starting password no longer works', r.status === 401)
r = await viaGate('/api/login', { method: 'POST', body: { name: 'andrew', password: 'barry-bonds-762' } }, login)
const sid2 = sidOf(r)
check('your own one does, and goes straight in', r.status === 200 && (await r.json()).must === false && !!sid2)
r = await viaGate('/api/password', { method: 'POST', sid: sid2, body: { password: 'new-one-12345' } }, password)
check('changing it later needs the old one', r.status === 403)
r = await viaGate('/api/logout', { method: 'POST', sid: sid2 }, logout)
r = await viaGate('/', { sid: sid2 })
check('signed out: that session no longer works', r.status === 302)
for (let k = 0; k < 10; k++) await viaGate('/api/login', { method: 'POST', body: { name: 'andrew', password: 'guess' + k } }, login)
r = await viaGate('/api/login', { method: 'POST', body: { name: 'andrew', password: 'barry-bonds-762' } }, login)
check('ten wrong tries in an hour and even the right one waits (429)', r.status === 429)
r = await viaGate('/?t=' + 'A'.repeat(24))
check('an old ?t= invite link does not get in', r.status === 302)
check('no password or hash is ever a KV key, and passwords are not stored in the clear', ![...TOKENS.m.keys()].some((k) => k.includes(start) || k.includes('barry')) && ![...TOKENS.m.values()].some((v) => String(v).includes('barry-bonds') || String(v).includes(start)))
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
