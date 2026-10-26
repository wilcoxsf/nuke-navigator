// Yesterday's balls for BLAST BULLETIN and DAILY DINGER. The nightly job (ops/cron-daily) stores one JSON per date; the site serves the newest at /api/daily/latest
// behind the token gate; in development the page falls back to /daily/latest.json (a copy of a dry-run day). Each ball gets:
//   bear   landing bearing from the feed's hit coordinates (the same system as Statcast hc_x / hc_y)
//   odds   the what-if model at its own park (fence and wall height at that bearing from parks30, park elevation, game temperature)
//   oracle would it be gone at Oracle Park: the flight engine with the side spin set so it lands on its real bearing and the carry set so it flies its real distance in
//          its own park's air, then flown again over the Oracle wall (same swing, same temperature, sea-level air)
import { whatIfP } from './whatif.js'

export async function loadDaily() {
  for (const u of ['/api/daily/latest', '/daily/latest.json']) {
    try { const r = await fetch(u); if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) return await r.json() } catch {}
  }
  return null
}
const bearingOf = (b) => (b.cx == null || b.cy == null ? null : (Math.atan2(b.cx - 125.42, 198.27 - b.cy) * 180) / Math.PI)

export function enrichDay(day, api, U, parks, wim) {
  const byId = new Map(parks.parks.map((p) => [p.id, p]))
  const out = []
  for (const b of day.balls) {
    if (b.ev == null || b.la == null || b.ft == null) continue
    const bear = bearingOf(b)
    if (bear == null) continue
    const park = byId.get(b.vid), hand = b.s === 'R' ? 1 : -1, temp = b.temp ?? day.games?.[b.gm]?.temp ?? 70
    const wallFn = park ? U.wallFnOf(parks, park) : null, [fence, wallh] = wallFn ? wallFn(Math.max(-45, Math.min(45, bear))) : [400, 8]
    const odds = whatIfP(wim, { ev: b.ev, la: b.la, bear, hand, temp, elev: park?.elev_ft ?? 0, fence, wallh })
    const name = day.players?.[b.b] ?? day.players?.[String(b.b)]
    out.push({ ...b, bear, hand, temp, park: park ?? null, odds, name: Array.isArray(name) ? name[0] : name?.name ?? name ?? 'BATTER ' + b.b })
  }
  return out
}

// fit the engine to one real ball (direction so it lands on its bearing, carry so it flies its distance in its own park), then fly it over the Oracle wall
export function oracleCheck(api, b) {
  const own = b.park ? { hPa: b.park.hpa } : {}
  const st = { ...api.state, ev: b.ev, la: b.la, hand: b.hand, temp: b.temp, wind: 0, dws: 0, tab: false, carry: 1, dir: b.bear }
  for (let it = 0; it < 3; it++) { const r = api.fly(st, { ...own, wallFn: () => [9999, 0] }); st.dir += b.bear - r.landB }
  let lo = 0.6, hi = 1.6
  // carry multiplies air density (more carry, shorter flight); the fit flies with no wall in the way, to the ground, like Statcast projected distance
  const free = { ...own, floor: 0, wallFn: () => [9999, 0] }
  for (let it = 0; it < 14; it++) { st.carry = (lo + hi) / 2; const r = api.fly(st, free); if (r.landFt < b.ft) hi = st.carry; else lo = st.carry }
  const r = api.fly(st, {})
  return { gone: r.verdict.kind === 'GONE', verdict: r.verdict, state: { ...st } }
}

// the five balls of the day's DAILY DINGER: the closest calls (model odds nearest a coin flip, among balls that reached 340 ft), in a fixed order for that date
export function dingerPicks(balls, date, n = 5) {
  const cand = balls.filter((b) => b.ft >= 340 && b.odds != null).sort((a, b) => Math.abs(a.odds - 0.5) - Math.abs(b.odds - 0.5)).slice(0, 12)
  let h = 0
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const rng = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296)
  return cand.map((b) => ({ b, k: rng() })).sort((a, b) => a.k - b.k).slice(0, n).map((x) => x.b)
}
