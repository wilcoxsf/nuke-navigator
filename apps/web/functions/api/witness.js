// /api/witness: WALLOP WITNESS entries for WITNESS STAND (1 Nov 2026). Behind the same token gate as the rest of the site (functions/_middleware.js runs first).
// GET: { me: your whole entry, all: every friend's public part (a display name, the days, the section of each seat; never a token, a row or a seat) }.
// PUT { name, days, seats }: saves your own entry. A game you add has to be inside its 72 hours from first pitch (giants_games.json, served beside the page;
// 7:05 pm in San Francisco for a game not in the file yet); taking one away is always allowed. Entries live in the KV namespace WITNESS under w:<hash of the token>.
// Until Andrew creates and binds WITNESS (wrangler.toml, or the Pages dashboard: a KV binding named WITNESS), every request answers 404 and the page keeps the
// entry in the browser instead (witnessStore in src/cockpits/witness25.js). The 72-hour rule matches windowOpen there (tools/test_witness25.mjs checks they agree).
const WINDOW_HOURS = 72
const KEY = /^(\d{4}-\d{2}-\d{2})(?:#([12]))?$/
const MAX_DAYS = 500, MAX_NAME = 20, MAX_BODY = 32 * 1024
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

let gamesCache = null // [rows, expiry]
async function games(env, request) {
  if (gamesCache && gamesCache[1] > Date.now()) return gamesCache[0]
  let rows = []
  try { const r = await env.ASSETS.fetch(new URL('/giants_games.json', request.url)); if (r.ok) rows = (await r.json()).games ?? [] } catch {}
  gamesCache = [rows, Date.now() + 10 * 60_000]
  return rows
}
function firstPitch(key, rows) {
  const m = KEY.exec(key)
  if (!m) return NaN
  const g = rows.find((x) => x.d === m[1] && (!m[2] || x.dh === Number(m[2])))
  return g?.start ? Date.parse(g.start) : Date.parse(m[1] + 'T19:05:00-07:00')
}
// (11 Nov) the off-season back-fill: any 2026 home game already played, until Opening Day 2027 (as windowOpen in src/cockpits/witness25.js)
const BACKFILL = { season: '2026', until: Date.parse('2027-03-25T07:00:00Z') }
const open = (key, rows, now) => { const h = (now - firstPitch(key, rows)) / 3.6e6; if (h >= 0 && key.startsWith(BACKFILL.season) && now < BACKFILL.until) return true; return h >= 0 && h <= WINDOW_HOURS }
// tickets: games still to come in giants_schedule.json, by day key (KEY); a friend sees who else has the same game
let schedCache = null
async function schedule(env, request) {
  if (schedCache && schedCache[1] > Date.now()) return schedCache[0]
  let rows = []
  try { const r = await env.ASSETS.fetch(new URL('/giants_schedule.json', request.url)); if (r.ok) rows = (await r.json()).games ?? [] } catch {}
  schedCache = [rows, Date.now() + 10 * 60_000]
  return rows
}
const cleanTickets = (v, sched, now) => [...new Set(Array.isArray(v) ? v.map(String) : [])].filter((k) => { const m = KEY.exec(k); if (!m) return false; const g = sched.find((x) => x.d === m[1] && (!m[2] || x.dh === Number(m[2]))); return !!g && Date.parse(g.start) > now - 6 * 3.6e6 }).slice(0, 81)
// (11 Nov, Andrew: yes to checking the songs) a song counts only with the proof of a right guess: the proof hashes to one in that song's lock in songs_private.json,
// which only someone who typed a right spelling could have made (the file holds the hash of the proof, not the proof)
let songCache = null
async function songProofs(env, request) {
  if (songCache && songCache[1] > Date.now()) return songCache[0]
  const m = new Map()
  try { const r = await env.ASSETS.fetch(new URL('/songs_private.json', request.url)); if (r.ok) for (const x of (await r.json()).songs ?? []) if (x.lock) m.set(x.id, new Set(x.lock.v.map((p) => p[3]).filter(Boolean))) } catch {}
  songCache = [m, Date.now() + 10 * 60_000]
  return m
}
const hex = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('')
async function provenJk(jk, proofs) { const out = {}; for (const [id, v] of Object.entries(jk)) { const P = proofs.get(id); if (P && typeof v[4] === 'string' && /^[0-9a-f]{64}$/.test(v[4]) && P.has(await hex('nn-pf|' + v[4]))) out[id] = v.slice(0, 4) } return out }

// (11 Nov) the caller: the signed-in user (lib/auth.js); the entry is keyed by a hash of the user's name
import { whoIs } from '../../lib/auth.js'
async function caller(request, env) { const w = await whoIs(request, env); return w ? { token: 'user:' + w.name, name: w.user.display ?? w.name } : null }
async function idOf(token) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nn-witness:' + token)))
  return [...h.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const cleanName = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
// (2 Nov, night) the calling card (src/cockpits/emblem25.js): a gamer tag, its case kept ([CLAN] up to 4, then 3 to 18 of letters, digits, _ - .), and an emblem as
// its URL-safe base64 code, kept only if it looks like one and is short
const cleanTag = (s) => { const m = /^\s*(?:\[([A-Za-z0-9]{1,4})\])?\s*([A-Za-z0-9_.-]{3,18})/.exec(String(s ?? '').replace(/[^A-Za-z0-9_.\[\]-]/g, '')); return m ? (m[1] ? '[' + m[1] + ']' : '') + m[2] : '' }
const cleanEmblem = (s) => (typeof s === 'string' && s.length <= 1400 && /^[A-Za-z0-9_-]*$/.test(s) ? s : '')
// (11 Nov) the guessing jukebox's record (src/cockpits/witness25.js jkPack): opaque song ids to [when, guesses, blanks hint, year hint]; anything else is dropped
const cleanJk = (v, now) => { const out = {}; if (!v || typeof v !== 'object') return out; for (const [id, x] of Object.entries(v).slice(0, 400)) { if (!/^k[0-9a-f]{10}$/.test(id) || !Array.isArray(x)) continue; const at = Math.round(Number(x[0])), n = Math.round(Number(x[1])); if (!(at > 1735689600000 && at < now + 864e5) || !(n >= 1 && n <= 99999)) continue; out[id] = [at, n, x[2] ? 1 : 0, x[3] ? 1 : 0, typeof x[4] === 'string' ? x[4] : ''] } return out }
// (GPT red team round 2, 1) a save adds to what the stand has (another device's guesses stay); the earlier guess of a song wins
const mergeJk = (had, add) => { const out = { ...(had && typeof had === 'object' ? had : {}) }; for (const [id, v] of Object.entries(add)) if (!out[id] || v[0] < out[id][0]) out[id] = v; return out }
const cleanSeat = (s) => ({ sec: String(s?.sec ?? '').replace(/[^0-9A-Z]/gi, '').slice(0, 6), row: String(s?.row ?? '').replace(/[^0-9A-Z]/gi, '').slice(0, 4), seat: String(s?.seat ?? '').replace(/[^0-9]/g, '').slice(0, 4) })

export async function onRequest({ request, env }) {
  if (!env.WITNESS) return json({ error: 'the witness stand is not set up yet' }, 404)
  const who = await caller(request, env)
  if (!who) return json({ error: 'no token' }, 403)
  const id = await idOf(who.token), key = 'w:' + id
  const mineRaw = await env.WITNESS.get(key)
  let mine = null
  try { mine = mineRaw ? JSON.parse(mineRaw) : null } catch {}
  if (request.method === 'GET') {
    const all = []
    let cursor
    for (let page = 0; page < 10; page++) { // 1,000 keys a page: far more friends than there are
      const l = await env.WITNESS.list({ prefix: 'w:', cursor })
      for (const k of l.keys) {
        let e = null
        try { e = JSON.parse((await env.WITNESS.get(k.name)) ?? 'null') } catch {}
        if (!e) continue
        all.push({ id: k.name.slice(2, 10), me: k.name === key, name: e.name, tag: e.tag ?? '', emblem: e.emblem ?? '', days: e.days ?? [], tickets: e.tickets ?? [], jk: e.jk ?? {}, seats: Object.fromEntries(Object.entries(e.seats ?? {}).map(([d, s]) => [d, { sec: s.sec }])) })
      }
      if (l.list_complete || !l.cursor) break
      cursor = l.cursor
    }
    return json({ me: mine ?? { name: cleanName(who.name.split(' ')[0]), days: [], seats: {}, tickets: [] }, all })
  }
  if (request.method === 'PUT') {
    const text = await request.text()
    if (text.length > MAX_BODY) return json({ error: 'too big' }, 400)
    let body
    try { body = JSON.parse(text) } catch { return json({ error: 'not json' }, 400) }
    const days = [...new Set(Array.isArray(body.days) ? body.days.map(String) : [])]
    if (days.length > MAX_DAYS || days.some((d) => !KEY.test(d))) return json({ error: 'bad days' }, 400)
    const before = new Set(mine?.days ?? []), rows = await games(env, request), now = Date.now()
    const refused = days.filter((d) => !before.has(d) && !open(d, rows, now))
    if (refused.length) return json({ error: 'a game can be logged only within 72 hours of first pitch', refused }, 422)
    const seats = {}
    for (const d of days) if (body.seats?.[d]) seats[d] = cleanSeat(body.seats[d])
    const entry = { name: cleanName(body.name) || cleanName(who.name.split(' ')[0]) || 'A FRIEND', tag: cleanTag(body.tag), emblem: cleanEmblem(body.emblem), days, seats, tickets: cleanTickets(body.tickets, await schedule(env, request), now), jk: mergeJk(mine?.jk, await provenJk(cleanJk(body.jk, now), await songProofs(env, request))), updated: new Date(now).toISOString() }
    await env.WITNESS.put(key, JSON.stringify(entry))
    return json({ me: entry })
  }
  return json({ error: 'GET or PUT' }, 405)
}
