// Study 25 PITCH CAM (H1, 28 Oct): PLAY IT cuts behind home plate for the pitch, drawn on its real path with its real break, then cuts back for the swing.
// The path is the same constant-acceleration model Statcast fits: from the release point (release_pos_x, 60.5 ft minus extension, release_pos_z) to the plate at y = 17/12 ft,
// with the speed falling from release_speed to plate_speed (that fixes the drag along y and the flight time), and spin's push taken from pfx_x and pfx_z, which Savant
// measures from y = 40 ft to the plate. The crossing point and the break are matched by construction; the approach angle (vaa) is not used, so it checks the fit.
// Statcast x is the catcher's view (positive toward first base), which is the plate frame's lateral axis here; y runs from the plate to the mound.
const FT = 0.3048, MPH = 1.46667, G = 32.174
export function pitchPath(b) {
  if ([b?.rx, b?.rz, b?.ext, b?.pv, b?.ps, b?.px, b?.pz, b?.hx, b?.hz].some((v) => v == null)) return null
  const y0 = 60.5 - b.ext, yT = 17 / 12, vy0 = -b.pv * MPH, vyT = -b.ps * MPH
  const ay = (vyT * vyT - vy0 * vy0) / (2 * (yT - y0)), T = (vyT - vy0) / ay
  if (!(T > 0.25 && T < 0.9)) return null
  // time from y = 40 ft to the plate, where Savant measures the movement
  const t40 = (() => { const d = vy0 * vy0 + 2 * ay * (40 - y0); const t = (-vy0 - Math.sqrt(Math.max(0, d))) / ay; return T - (t > 0 && t < T ? t : 0) })()
  const ax = (2 * (b.hx / 12)) / (t40 * t40), az = (2 * (b.hz / 12)) / (t40 * t40) - G
  const vx0 = (b.px - b.rx - 0.5 * ax * T * T) / T, vz0 = (b.pz - b.rz - 0.5 * az * T * T) / T
  const at = (t) => [b.rx + vx0 * t + 0.5 * ax * t * t, y0 + vy0 * t + 0.5 * ay * t * t, b.rz + vz0 * t + 0.5 * az * t * t]
  const pts = Array.from({ length: 41 }, (_, i) => at((T * i) / 40).map((v) => v * FT))
  const vzT = vz0 + az * T, vaaFit = (Math.atan2(vzT, -vyT) * 180) / Math.PI
  // where a spinless pitch (gravity and drag only) would have crossed, for the cam's ghost dot
  const ghost = [b.px - b.hx / 12, yT, b.pz - b.hz / 12].map((v) => v * FT)
  return { pts, T, vaaFit, ghost }
}
export function initPitchCam(api, col) {
  const { THREE, scene, camera, controls } = api.NN
  const toWorld = window.__cp.toWorld
  let live = [], run = null, lastDots = 0
  const mats = {}
  const mat = (c) => (mats[c] ??= new THREE.SpriteMaterial({ color: c, depthTest: false, depthWrite: false, fog: false }))
  const sprite = (c, size, p) => { const s = new THREE.Sprite(mat(c)); s.scale.setScalar(size); s.position.copy(p); s.renderOrder = 30; scene.add(s); live.push(s); return s }
  // the pitch flies in slow motion (dur seconds for its real flight time), the ghost dot appears where a spinless pitch would have crossed, a short hold, then the camera goes back
  api.NN.frames.push((dt) => {
    if (!run) return
    const r = run
    r.t = (performance.now() - r.t0) / 1000 // the wall clock, so the cut lasts the same at any frame rate
    const f = Math.min(1, r.t / r.dur), n = Math.floor(f * 40)
    while (r.shown < n) { r.shown++; sprite(r.c.acc, 0.07, toWorld(r.P.pts[r.shown])) }
    r.ball.position.copy(toWorld(r.P.pts[n]))
    if (f >= 1 && !r.ghost) r.ghost = sprite(r.c.tx, 0.09, toWorld(r.P.ghost))
    if (r.t >= r.dur + r.hold) stop(true)
  })
  function stop(finished) {
    if (!run) return
    const r = run; run = null; lastDots = r.shown
    for (const s of live) scene.remove(s)
    live = []
    camera.position.copy(r.saved[0]); controls.target.copy(r.saved[1]); controls.update()
    if (finished) r.done?.()
  }
  // plays the pitch, then calls done(); returns false (and plays nothing) when this ball has no fit
  function play(b, done, o = {}) {
    const P = pitchPath(b)
    if (!P || run) return false
    const saved = [camera.position.clone(), controls.target.clone()]
    camera.position.copy(toWorld([0, -5.5, 1.9])); controls.target.copy(toWorld([0, 14, 1.4])); controls.update()
    run = { P, done, saved, c: col(), dur: o.dur ?? 1.3, hold: o.hold ?? 0.45, t: 0, t0: performance.now(), shown: 0, ghost: null }
    run.ball = sprite('#ffffff', 0.22, toWorld(P.pts[0]))
    return true
  }
  return { play, stop: () => stop(false), busy: () => !!run, shown: () => live.length, lastDots: () => lastDots }
}
