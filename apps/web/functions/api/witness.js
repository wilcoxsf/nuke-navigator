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
const open = (key, rows, now) => { const h = (now - firstPitch(key, rows)) / 3.6e6; return h >= 0 && h <= WINDOW_HOURS }

// the caller's token, the way the gate chose it: the link's ?t= if it is a real token, else the cookie
async function caller(request, env) {
  const url = new URL(request.url), fromUrl = url.searchParams.get('t'), m = /(?:^|;\s*)nn_t=([^;]+)/.exec(request.headers.get('Cookie') || '')
  for (const t of [fromUrl, m?.[1]]) {
    if (!t || !/^[A-Za-z0-9_-]{16,64}$/.test(t)) continue
    const rec = await env.TOKENS.get(t)
    if (rec !== null) { let name = ''; try { name = JSON.parse(rec).name ?? '' } catch {} return { token: t, name } }
  }
  return null
}
async function idOf(token) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nn-witness:' + token)))
  return [...h.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const cleanName = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
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
        all.push({ id: k.name.slice(2, 10), me: k.name === key, name: e.name, days: e.days ?? [], seats: Object.fromEntries(Object.entries(e.seats ?? {}).map(([d, s]) => [d, { sec: s.sec }])) })
      }
      if (l.list_complete || !l.cursor) break
      cursor = l.cursor
    }
    return json({ me: mine ?? { name: cleanName(who.name.split(' ')[0]), days: [], seats: {} }, all })
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
    const entry = { name: cleanName(body.name) || cleanName(who.name.split(' ')[0]) || 'A FRIEND', days, seats, updated: new Date(now).toISOString() }
    await env.WITNESS.put(key, JSON.stringify(entry))
    return json({ me: entry })
  }
  return json({ error: 'GET or PUT' }, 405)
}
