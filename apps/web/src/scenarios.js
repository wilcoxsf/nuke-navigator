// The same swing somewhere else. Point-mass flight under a central gravity field (so tiny worlds curve away
// under the ball), with quadratic drag where a world has an atmosphere. No spin, no wind, launched from 1.2 m.
//
// GM and radius for the real worlds are standard published values; the Death Star is a 160 km sphere at lunar
// density, because its canonical gravity is artificial. Phobos escapes if the ball's energy is non-negative.

const BALL = { m: 0.145, area: 0.00426, cd: 0.35 }
export const BODIES = [
  { id: 'moon', name: 'the Moon', GM: 4.9048695e12, R: 1.7374e6, rho: 0 },
  { id: 'mars', name: 'Mars', GM: 4.282837e13, R: 3.3895e6, rho: 0.02 },
  { id: 'pluto', name: 'Pluto', GM: 8.696e11, R: 1.1883e6, rho: 0 },
  { id: 'ceres', name: 'Ceres', GM: 6.2628e10, R: 4.697e5, rho: 0 },
  { id: 'deathstar', name: 'the Death Star', GM: 4.786e8, R: 8.0e4, rho: 0, note: 'a 160 km sphere at lunar density' },
  { id: 'phobos', name: 'Phobos', GM: 7.0875e5, R: 1.1267e4, rho: 0 },
]

const MPH = 0.44704
const FT = 0.3048

export function flightOn(body, mph, laDeg) {
  const v0 = mph * MPH
  const la = (laDeg * Math.PI) / 180
  const r0 = body.R + 1.2
  const energy = 0.5 * v0 * v0 - body.GM / r0
  if (energy >= 0) return { escapes: true, escapeRatio: v0 / Math.sqrt((2 * body.GM) / body.R) }
  const k = body.rho > 0 ? (0.5 * body.rho * BALL.cd * BALL.area) / BALL.m : 0
  // state: x, y (planet-centred), vx, vy. Start at the top of the planet; launch angle measured from the horizon.
  let s = [0, r0, v0 * Math.cos(la), v0 * Math.sin(la)]
  const acc = (st) => {
    const r2 = st[0] * st[0] + st[1] * st[1]
    const r = Math.sqrt(r2)
    const g = -body.GM / (r2 * r)
    const sp = Math.hypot(st[2], st[3])
    return [g * st[0] - k * sp * st[2], g * st[1] - k * sp * st[3]]
  }
  const dt = body.R < 2e5 ? 0.05 : 0.02
  let t = 0
  let prev = s
  while (t < 4 * 3600) {
    prev = s
    const a1 = acc(s)
    const s2 = [s[0] + (s[2] * dt) / 2, s[1] + (s[3] * dt) / 2, s[2] + (a1[0] * dt) / 2, s[3] + (a1[1] * dt) / 2]
    const a2 = acc(s2)
    const s3 = [s[0] + (s2[2] * dt) / 2, s[1] + (s2[3] * dt) / 2, s[2] + (a2[0] * dt) / 2, s[3] + (a2[1] * dt) / 2]
    const a3 = acc(s3)
    const s4 = [s[0] + s3[2] * dt, s[1] + s3[3] * dt, s[2] + a3[0] * dt, s[3] + a3[1] * dt]
    const a4 = acc(s4)
    s = [
      s[0] + (dt / 6) * (s[2] + 2 * s2[2] + 2 * s3[2] + s4[2]),
      s[1] + (dt / 6) * (s[3] + 2 * s2[3] + 2 * s3[3] + s4[3]),
      s[2] + (dt / 6) * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]),
      s[3] + (dt / 6) * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]),
    ]
    t += dt
    if (Math.hypot(s[0], s[1]) <= body.R && t > 0.2) break
  }
  const ang = Math.atan2(s[0], s[1])
  return { escapes: false, rangeM: body.R * ang, seconds: t }
}

function distance(m) {
  const ft = m / FT
  if (ft < 5280) return `${Math.round(ft / 10) * 10 >= 1000 ? (Math.round(ft / 10) * 10).toLocaleString('en-US') : Math.round(ft)} ft`
  const mi = m / 1609.344
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} miles`
}

export function swingElsewhere(mph, laDeg) {
  return BODIES.map((b) => {
    const f = flightOn(b, mph, laDeg)
    const text = f.escapes
      ? `On ${b.name} this ball never comes down: it leaves at ${f.escapeRatio.toFixed(1)} times escape velocity`
      : `On ${b.name} this ball flies ${distance(f.rangeM)}${f.seconds > 120 ? ` and stays up for ${Math.round(f.seconds / 60)} minutes` : ''}`
    return { body: b, text, ...f }
  })
}

export function pickScenarios(mph, laDeg, rand = Math.random, n = 2, recent = []) {
  const all = swingElsewhere(mph, laDeg)
  const pool = all.filter((s) => !recent.includes(s.body.id))
  const out = []
  const src = pool.length >= n ? pool : all
  const bag = [...src]
  while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rand() * bag.length), 1)[0])
  return out
}
