// Study 25 pitch path (28 Oct): PLAY IT draws the pitch on the park on its real path with its real break (PITCH ARC, H1), then the hit flies.
// The path is the same constant-acceleration model Statcast fits: from the release point (release_pos_x, 60.5 ft minus extension, release_pos_z) to the plate at y = 17/12 ft,
// with the speed falling from release_speed to plate_speed (that fixes the drag along y and the flight time), and spin's push taken from pfx_x and pfx_z over the whole
// flight. The crossing point and the break are matched by construction; the approach angle (vaa) is not used, so it checks the fit (0.07 deg median error).
// Statcast x is the catcher's view (positive toward first base), which is the plate frame's lateral axis here; y runs from the plate to the mound.
const FT = 0.3048, MPH = 1.46667, G = 32.174
export function pitchPath(b) {
  if ([b?.rx, b?.rz, b?.ext, b?.pv, b?.ps, b?.px, b?.pz, b?.hx, b?.hz].some((v) => v == null)) return null
  const y0 = 60.5 - b.ext, yT = 17 / 12, vy0 = -b.pv * MPH, vyT = -b.ps * MPH
  const ay = (vyT * vyT - vy0 * vy0) / (2 * (yT - y0)), T = (vyT - vy0) / ay
  if (!(T > 0.25 && T < 0.9)) return null
  // time from y = 40 ft to the plate, where Savant measures the movement
  // spin's push over the whole flight, release to plate (that window matches Savant's approach angle to 0.07 deg median on these balls; a 40 ft window was 0.7 deg off)
  const ax = (2 * (b.hx / 12)) / (T * T), az = (2 * (b.hz / 12)) / (T * T) - G
  const vx0 = (b.px - b.rx - 0.5 * ax * T * T) / T, vz0 = (b.pz - b.rz - 0.5 * az * T * T) / T
  const at = (t) => [b.rx + vx0 * t + 0.5 * ax * t * t, y0 + vy0 * t + 0.5 * ay * t * t, b.rz + vz0 * t + 0.5 * az * t * t]
  const pts = Array.from({ length: 41 }, (_, i) => at((T * i) / 40).map((v) => v * FT))
  const vzT = vz0 + az * T, vaaFit = (Math.atan2(vzT, -vyT) * 180) / Math.PI
  // where a spinless pitch (gravity and drag only) would have crossed, for the cam's ghost dot
  const ghost = [b.px - b.hx / 12, yT, b.pz - b.hz / 12].map((v) => v * FT)
  return { pts, T, vaaFit, ghost }
}
// the break the pitch had from release to the plate, the way Savant's movement charts show it: sideways (pfx_x) and vertical with gravity left in (pfx_z minus the
// drop gravity alone gives over the flight), in inches, catcher's view. Four-seamers here drop a median 14.8 in; nothing is shown "as if it had no spin".
export function breakOf(b) {
  if (b?.hx == null || b?.hz == null || b.pv == null) return null
  const y0 = 60.5 - (b.ext ?? 6.3), vy0 = -b.pv * MPH, vyT = -(b.ps ?? b.pv * 0.92) * MPH, ay = (vyT * vyT - vy0 * vy0) / (2 * (17 / 12 - y0)), T = (vyT - vy0) / ay
  return { h: b.hx, v: b.hz - 0.5 * G * T * T * 12, T }
}
// the movement as a batter feels it (28 Oct, night, Andrew: a dead-ahead four-seamer should show next to nothing): the pitch measured against an average four-seamer from a
// pitcher of the same hand (medians of the 839 four-seamers in replay.json), gravity in both, so a fastball's own drop cancels and a curveball keeps its extra drop.
const FF = { R: { hx: -7.8, hz: 16, pv: 94.5, ps: 86.5 }, L: { hx: 8.6, hz: 15.8, pv: 92.7, ps: 84.8 } }
export function feltBreak(b) {
  const k = breakOf(b)
  if (!k) return null
  const f = FF[b.t] ?? FF.R, ff = breakOf({ hx: f.hx, hz: f.hz, pv: f.pv, ps: f.ps, ext: 6.5 })
  return { h: k.h - ff.h, v: k.v - ff.v, T: k.T }
}
// PITCH ARC (H1): the pitch drawn on the park itself, from the broadcast view, in the pitch color, then the hit flies. (28 Oct: the cut to a camera behind the
// plate is gone; Andrew wants the big 3D park throughout.) The arc stays until the next pitch, so the two flights read together.
export function initPitchArc(api, col) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  let live = [], run = null, lastDots = 0
  // voxels, thin (28 Oct, night, Andrew: "way thinner"): the path is small cubes 0.22 m on a side, the ball a cube 0.5 m; nothing writes depth, so the post shader leaves them alone
  const mats = {}, cube = new THREE.BoxGeometry(1, 1, 1)
  const mat = (c) => (mats[c] ??= new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, fog: false }))
  const sprite = (c, size, p) => { const s = new THREE.Mesh(cube, mat(c)); s.scale.setScalar(size); s.position.copy(p); s.renderOrder = 30; scene.add(s); live.push(s); window.__nn?.hideForNormal?.push(s); return s }
  const unhide = (s) => { const hf = window.__nn?.hideForNormal, i = hf?.indexOf(s) ?? -1; if (i >= 0) hf.splice(i, 1) }
  const clear = () => { for (const s of live) { scene.remove(s); unhide(s) } live = [] }
  // the pitch takes dur seconds of wall clock (its real flight is about 0.4 s; slowed so it reads), the arc fills in behind the ball, a short hold, then done()
  api.NN.frames.push(() => {
    if (!run) return
    const r = run, t = (performance.now() - r.t0) / 1000, f = Math.min(1, t / r.dur), n = Math.floor(f * 40)
    while (r.shown < n) { r.shown++; sprite(r.c, 0.22, toWorld(r.P.pts[r.shown])) }
    r.ball.position.copy(toWorld(r.P.pts[n]))
    if (t >= r.dur + r.hold) { run = null; lastDots = r.shown; scene.remove(r.ball); unhide(r.ball); live = live.filter((s) => s !== r.ball); r.done?.() }
  })
  // plays the pitch, then calls done(); returns false (and draws nothing) when this ball has no fitted path
  function play(b, done, o = {}) {
    const P = pitchPath(b)
    if (!P || run) return false
    clear()
    run = { P, done, c: o.color ?? col().pc ?? col().tx, dur: o.dur ?? 0.9, hold: o.hold ?? 0.25, t0: performance.now(), shown: 0 }
    run.ball = sprite('#ffffff', 0.5, toWorld(P.pts[0]))
    return true
  }
  // stop: call the pitch off (no hit); finish: skip to the hit now
  return { play, clear, stop: () => { if (run) { run = null; clear() } }, finish: () => { if (run) { const r = run; run = null; lastDots = r.shown; scene.remove(r.ball); unhide(r.ball); live = live.filter((s) => s !== r.ball); r.done?.() } }, busy: () => !!run, shown: () => live.length, lastDots: () => lastDots, size: () => live[0]?.scale.x ?? 0 }
}
