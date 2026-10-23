// Learned carry correction for the what-if sandbox. public/carry_table.json (built by science/carry_table.py, git-ignored derived data) holds the mean and spread of log carry by exit speed and launch angle:
// carry is the air-density multiplier that makes the page's physics reproduce Statcast's projected distance. The mean makes the sandbox unbiased by default; the spread, with the empirical shape of the
// residuals, gives the draws behind the "gone in N to M parks" band. Everything is a prediction, never a measurement.
let T = null
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function loadCarry() {
  return fetch('/carry_table.json').then((r) => (r.ok ? r.json() : null)).then((d) => { T = d; return d }).catch(() => null)
}
export const carryReady = () => !!T

export function carryAt(ev, la) {
  if (!T) return null
  const ne = T.mean.length, nl = T.mean[0].length
  const x = clamp((ev - T.ev0) / T.de, 0, ne - 1.0001), y = clamp((la - T.la0) / T.dl, 0, nl - 1.0001)
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const bil = (a) => a[i][j] * (1 - fx) * (1 - fy) + a[i + 1][j] * fx * (1 - fy) + a[i][j + 1] * (1 - fx) * fy + a[i + 1][j + 1] * fx * fy
  return { mu: bil(T.mean), sd: bil(T.sd) }
}

// weather correction to log carry (science/weather_response.py): real balls fly a little shorter than the physics says in heat (above temp_ref) and at altitude (Coors: about 7 ft)
export function wxAdj(temp, hPa) {
  if (!T) return 0
  const kft = (44330 * (1 - Math.pow(Math.max(hPa, 300) / 1013.25, 0.1903))) / 0.3048 / 1000
  return T.temp_slope * Math.max(temp - T.temp_ref, 0) + T.elev_slope * Math.max(kft, 0)
}
// log carry for a swing in given weather and air pressure (0 until the table has loaded); a draw is a log carry at the reference weather
export const carryLog = (ev, la, temp, hPa) => { const c = carryAt(ev, la); return c ? c.mu + wxAdj(temp, hPa) : 0 }

// n common log-carry draws at evenly spaced probabilities, shaped by the held-out residual quantiles (not a normal curve)
export function carryDraws(ev, la, n = 16) {
  const c = carryAt(ev, la)
  if (!c) return []
  const zp = T.zp, z = T.z, out = []
  for (let k = 0; k < n; k++) {
    const p = clamp((k + 0.5) / n, zp[0], zp[zp.length - 1])
    let i = 0
    while (i < zp.length - 2 && p > zp[i + 1]) i++
    const f = (p - zp[i]) / (zp[i + 1] - zp[i])
    out.push(c.mu + c.sd * (z[i] * (1 - f) + z[i + 1] * f)) // log carry at the reference weather; each park adds its own weather term when the ball is flown
  }
  return out
}

// how many parks the swing clears under each common draw; the band is the 10th to 90th percentile across draws. parks: [{abbr, hpa}], wallFnFor(p): the park's wall function
export function goneBand(state, fly, parks, wallFnFor, n = 16) {
  const ms = carryDraws(state.ev, state.la, n)
  if (!ms.length) return null
  const counts = ms.map((m) => {
    const st = { ...state, tab: true, carryOverride: m }
    let g = 0
    for (const p of parks) if (fly(st, p.abbr === 'SF' ? {} : { wallFn: wallFnFor(p), hPa: p.hpa }).verdict.kind === 'GONE') g++
    return g
  }).sort((a, b) => a - b)
  const q = (f) => counts[clamp(Math.round(f * (counts.length - 1)), 0, counts.length - 1)]
  return { lo: q(0.1), med: q(0.5), hi: q(0.9) }
}

// debounced, cached band for a live state: returns the cached band or null, and schedules one computation that calls onDone when it finishes
const cache = new Map()
let timer = 0
export function bandPeek(state, fly, parks, wallFnFor, onDone) {
  if (!state.tab || !carryReady()) return null
  const key = [state.ev, state.la, state.dir, state.hand, state.temp, state.wind, state.dws || 0].join('|')
  if (cache.has(key)) return cache.get(key)
  clearTimeout(timer)
  const snap = { ...state } // the live state keeps moving while the timer waits
  timer = setTimeout(() => {
    const b = goneBand(snap, fly, parks, wallFnFor)
    if (!b) return
    if (cache.size > 80) cache.clear()
    cache.set(key, b)
    onDone?.()
  }, 140)
  return null
}
export const bandWord = (b, total) => (b.lo === b.hi ? `${b.lo}` : `${b.lo} TO ${b.hi}`) + ` OF ${total}`
