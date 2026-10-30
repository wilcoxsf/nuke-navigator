// Study 25 landing moments (F1, 28 Oct; they replace the fireworks, which nobody could see from the broadcast camera): something happens where the ball comes down.
//   seats: a glove pops up out of the crowd and makes the catch; about one in four bobbles it and a second glove grabs it
//   McCovey Cove: a sea lion rears up out of the water and snaps the ball (the ripples and the kayak race are fx25's)
//   MITT SHOT: a ball that comes down by the giant four-finger glove behind left-center (placed from the park model's height map, next to the Coke bottle)
//   the scoreboard: the board glitches and its pixels fall off        off the wall: a puff of dust, and the ball drops onto the warning track
//   off the foul pole: the pole shivers like a tuning fork, with a ring
// The glove, the sea lion and the ball are voxel models ("real 3D pixel graphics", Andrew, 28 Oct; models25.js, built in Blender), scaled up so they read at 400 ft
// and turned to face the camera; nothing glows and nothing shakes the screen.
import { loadModels, cloneModel } from './models25.js'
import { WATER_Z } from './water25.js'
export function initMoments25(api, col, fx, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const parts = [], live = new Set()
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  let M = null
  loadModels(THREE).then((m) => { M = m })
  // the models' real heights (m) and how tall each should stand in the park
  const SIZE = { glove: [0.39, 11], mitt: [0.39, 18], sealion: [1.45, 13], ball: [0.09, 2.6] }
  // a piece: a group holding one or two looks of a model (open and shut), facing the camera, at a spot
  function piece(kind, names, at) {
    const g = new THREE.Group(), [real, want] = SIZE[kind], s = want / real
    const looks = names.map((n) => { const c = M?.[n] ? cloneModel(M[n], s) : null; if (c) { c.visible = false; g.add(c) } return c })
    if (looks[0]) looks[0].visible = true
    const cam = api.NN.camera.position
    g.rotation.y = Math.atan2(cam.x - at.x, cam.z - at.z) // the model's front (+z) toward the camera
    g.position.copy(at); g.userData.at = at.clone(); g.userData.looks = looks
    scene.add(g); live.add(g)
    return g
  }
  const look = (g, i) => g.userData.looks.forEach((c, k) => { if (c) c.visible = k === i })
  const kill = (g) => { scene.remove(g); live.delete(g) }
  const hideBall = (v) => { if (!M) return; const b = api.ballMesh?.(); if (b) b.visible = !v } // with no model loaded yet, nothing takes the ball
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  const run = (fn) => { let t = 0; parts.push((dt) => fn((t += dt))) }
  const log = []

  // a glove rises from the seats under the ball and closes on it (bobble: it fumbles, open and shut, and lets go)
  function glove(at, onShut = null, bobble = false) {
    const H = SIZE.glove[1], g = piece('glove', ['glove_open', 'glove_shut'], at.clone().add(V(0, -H, 0)))
    let shut = false
    run((t) => {
      const up = ease(t / 0.35) - ease((t - 2.6) / 0.5)
      g.position.y = at.y - H + up * H * 1.05
      if (!shut && t > 0.38) { shut = true; if (!bobble) { look(g, 1); hideBall(true); onShut?.() } }
      if (bobble && t > 0.38 && t < 0.62) look(g, t % 0.1 < 0.05 ? 0 : 1)
      if (bobble && t >= 0.62) look(g, 0)
      if (t > 3.2) { kill(g); return false }
      return true
    })
    return g
  }
  // ---- 29 Oct, later (Andrew: "more landing fun animations"): three more for the seats, built from cubes here ----
  const vox = (cells, size, at0) => { // cells: [x, y, z, color] in cube units, the group's origin at the bottom middle
    const g = new THREE.Group(), byC = {}
    for (const [x, y, z, c] of cells) (byC[c] ??= []).push([x, y, z])
    for (const [c, list] of Object.entries(byC)) { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshLambertMaterial({ color: c, flatShading: true }), list.length); list.forEach(([x, y, z], i) => m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x * size, y * size, z * size))); g.add(m) }
    g.position.copy(at0); scene.add(g); live.add(g); g.userData.at = at0.clone()
    const cam = api.NN.camera.position; g.rotation.y = Math.atan2(cam.x - at0.x, cam.z - at0.z)
    return g
  }
  const box = (out, x0, x1, y0, y1, z0, z1, c) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) out.push([x, y, z, c]) }
  // GULL GRAB: a big gull swoops in from the side, takes the ball out of the air and flaps off over the bay with it
  function gullGrab(at) {
    log.push('gull'); o.banner?.('GULL GRAB', 'IT IS NOT COMING BACK')
    const C = []
    box(C, -1, 1, 0, 1, -3, 3, '#f2f0ea'); box(C, -1, 1, 1, 2, 3, 4, '#f2f0ea'); C.push([0, 1, 5, '#f2c230'], [0, 1, 6, '#f2c230'], [0, 0, 6, '#d8262c'], [-1, 2, 4, '#111'], [1, 2, 4, '#111'])
    for (const s of [-1, 1]) for (let k = 2; k <= 8; k++) for (let z = -1; z <= 1; z++) C.push([s * k, 1, z, k > 6 ? '#3a3f47' : '#f2f0ea'])
    const side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion), from = at.clone().addScaledVector(side, -40).add(V(0, 14, 0)), g = vox(C, 0.6, from)
    let got = false
    run((t) => {
      const k = Math.min(1, t / 0.8)
      if (t < 0.8) g.position.lerpVectors(from, at, ease(k)); else { g.position.copy(at).addScaledVector(side, (t - 0.8) * 22).add(V(0, (t - 0.8) * 12, 0)) }
      if (!got && t >= 0.8) { got = true; hideBall(true); o.sound?.('pop') }
      g.rotation.z = Math.sin(t * 14) * 0.35
      if (t > 3.4) { kill(g); return false }
      return true
    })
  }
  // GOOD BOY: a dog (it is Bark at the Park) leaps out of the crowd, catches the ball in its mouth and drops back
  function dog(at) {
    log.push('dog'); o.banner?.('GOOD BOY', 'WHAT A CATCH')
    const C = [], B = '#a8703f', D = '#5a3a1e'
    box(C, -1, 1, 3, 5, -3, 3, B); box(C, -1, 1, 5, 8, 3, 5, B); box(C, -1, 1, 6, 7, 6, 7, B); C.push([0, 7, 8, '#111'], [-1, 8, 4, '#111'], [1, 8, 4, '#111'])
    box(C, -2, -2, 7, 9, 4, 4, D); box(C, 2, 2, 7, 9, 4, 4, D) // the ears
    for (const [x, z] of [[-1, -3], [1, -3], [-1, 2], [1, 2]]) box(C, x, x, 0, 2, z, z, B)
    box(C, 0, 0, 6, 8, -5, -4, B) // the tail, up
    C.push([0, 6, 8, '#f4f2ea']) // the ball in its mouth
    const g = vox(C, 0.6, at.clone().add(V(0, -9, 0)))
    let got = false
    run((t) => {
      const k = Math.min(1, t / 1.6), arc = 4 * k * (1 - k)
      g.position.y = at.y - 9 + arc * 11; g.rotation.x = (0.5 - k) * 0.9
      if (!got && t > 0.75) { got = true; hideBall(true); o.sound?.('pop') }
      if (t > 2.2) { kill(g); return false }
      return true
    })
  }
  // BEER SHOWER: the ball lands in someone's beer; the cup goes up end over end and the foam comes down on the section
  function beer(at) {
    log.push('beer'); o.banner?.('BEER SHOWER', 'SECTION GOT WET')
    const C = []
    for (let y = 0; y < 6; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) === 2 || Math.abs(z) === 2 || y === 0) C.push([x, y, z, y >= 5 ? '#f4f2ea' : '#e8b33a'])
    const g = vox(C, 0.45, at.clone())
    hideBall(true)
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 6; fx.particle(i % 3 ? '#f2c94c' : '#f4f2ea', at.clone().add(V(0, 2, 0)), V(Math.cos(a) * v, 6 + Math.random() * 8, Math.sin(a) * v), 1.6 + Math.random(), 1.4, 9.8, 0.3) }
    o.sound?.('pop')
    run((t) => { g.position.y = at.y + 9 * 4 * Math.min(1, t / 1.6) * (1 - Math.min(1, t / 1.6)); g.rotation.x = t * 7; if (t > 1.8) { kill(g); return false } return true })
  }
  function seats(at) {
    // half the time the glove (sometimes a bobble); otherwise a gull, a dog or a beer
    const r = Math.random()
    if (o.variety !== false && r >= 0.5) { if (r < 0.67) gullGrab(at); else if (r < 0.84) dog(at); else beer(at); return }
    seatsGlove(at)
  }
  function seatsGlove(at) {
    if (Math.random() < (o.bobbleRate ?? 0.25)) {
      log.push('bobble'); glove(at, null, true); hideBall(true)
      const side = V(Math.random() < 0.5 ? -1 : 1, 0, 0).applyQuaternion(api.NN.camera.quaternion).multiplyScalar(12), b = piece('ball', ['ball'], at.clone())
      run((t) => { const k = Math.min(1, Math.max(0, (t - 0.45) / 0.7)); b.position.copy(at).addScaledVector(side, k).add(V(0, 8 + 6 * 4 * k * (1 - k), 0)); b.rotation.x = t * 9; if (k >= 1) { kill(b); glove(at.clone().add(side)); return false } return true })
      o.sound?.('thud')
    } else { log.push('glove'); glove(at, () => o.sound?.('pop')) }
  }
  // the sea lion rears up out of the water beside the splash, mouth open as the ball comes in, and snaps it
  function seal(at) {
    log.push('seal')
    const level = toWorld([0, 0, WATER_Z]).y, spot = V(at.x, level, at.z), H = SIZE.sealion[1]
    const g = piece('sealion', ['sealion_shut', 'sealion_open'], spot.clone().add(V(0, -H, 0)))
    let snapped = false
    run((t) => {
      const up = ease(t / 0.9) - ease((t - 2.6) / 0.7)
      g.position.y = level - H * 0.75 + up * H * 0.75
      if (t > 0.7 && t < 1.25) look(g, 1)
      else if (!snapped && t >= 1.25) { snapped = true; look(g, 0); hideBall(true); o.sound?.('pop') }
      if (t > 3.4) { kill(g); return false }
      return true
    })
  }
  // the giant mitt behind left-center: world x, z of its middle (estimated from the model's height map) and how near counts
  const MITT = { x: -51, z: -146, r: 11 }
  function mitt(at) {
    log.push('mitt')
    const g = piece('mitt', ['glove_open', 'glove_shut'], V(MITT.x, at.y - 2, MITT.z))
    o.banner?.('MITT SHOT', 'INTO THE GIANT GLOVE')
    o.sound?.('fanfare')
    run((t) => { if (t > 0.5) { look(g, 1); hideBall(true) } if (t > 3.6) { kill(g); return false } return true })
  }
  function dust(at) {
    log.push('dust')
    const ground = toWorld([0, 0, 0]).y
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2; fx.particle(i % 3 ? '#8a8f99' : '#c9b79a', at, V(Math.cos(a) * 3, 1 + Math.random() * 3, Math.sin(a) * 3), 1.2 + Math.random() * 0.6, 1.4, 1.5, 1.2) }
    hideBall(true)
    const b = piece('ball', ['ball'], at.clone())
    run((t) => { const k = Math.min(1, t / 0.6); b.position.y = at.y + (ground + 1.2 - at.y) * k * k; if (k >= 1) { const u = Math.min(1, (t - 0.6) / 0.5); b.position.y = ground + 1.2 + 2.5 * 4 * u * (1 - u) } b.rotation.z = -t * 6; if (t > 2.6) { kill(b); return false } return true })
    o.sound?.('thud')
  }
  function pole(at) {
    log.push('pole')
    const left = at.x < 0, w = window.__cp.wallAt?.(left ? -45 : 45) ?? [335, 8], r = w[0] * 0.3048, b = ((left ? -45 : 45) * Math.PI) / 180
    const base = toWorld([r * Math.sin(b), r * Math.cos(b), 0]), top = toWorld([r * Math.sin(b), r * Math.cos(b), 26])
    // the pole as a column of accent cubes (28 Oct, night: voxels everywhere) that bends like a tuning fork, more at the top
    const n = 30, ln = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: col().acc, flatShading: true, fog: false }), n), m4 = new THREE.Matrix4(), p = new THREE.Vector3()
    scene.add(ln); live.add(ln)
    const side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion)
    o.sound?.('ring')
    run((t) => {
      const a = Math.sin(t * 34) * Math.exp(-2.2 * t) * 1.6
      for (let i = 0; i < n; i++) { const f = i / (n - 1); p.lerpVectors(base, top, f).addScaledVector(side, a * f * f); m4.makeScale(0.7, 0.9, 0.7).setPosition(p); ln.setMatrixAt(i, m4) }
      ln.instanceMatrix.needsUpdate = true
      if (t > 2) { scene.remove(ln); ln.geometry.dispose(); ln.material.dispose(); live.delete(ln); return false }
      return true
    })
  }
  let wall = performance.now() // its own wall clock, steps of up to a quarter second (the engine's step is clamped, which slowed the moments on a slow device)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](dt)) parts.splice(i, 1) })

  return {
    // ev: the engine's landing hook ({ at, key }); landing: where the flight ended (STANDS, SPLASH, STREET), boardAt: the LED board's world position
    land(ev, landing, boardAt) {
      if (!ev?.at) return null
      const at = ev.at.clone ? ev.at.clone() : V(...ev.at)
      const hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key)
      if (ev.key === 'POLE') { pole(at); return 'pole' }
      if (ev.key === 'SPLASH') { seal(at); return 'seal' }
      if (hr && o.oracle !== false && Math.hypot(at.x - MITT.x, at.z - MITT.z) < MITT.r) { mitt(at); return 'mitt' }
      if (hr && boardAt && at.distanceTo(boardAt) < 32) { o.onBoard?.(); log.push('board'); return 'board' }
      if (hr) { seats(at); return 'seats' } // the stands, or the street and the promenade past them: someone is always there with a glove
      if (ev.key === 'WALL' || ev.key === 'CLOSE') { dust(at); return 'dust' }
      return null
    },
    ready: () => !!M, shown: () => live.size, log: () => [...log], MITT, setBobble(r) { o.bobbleRate = r }, setVariety(v) { o.variety = v },
    // for the tests and the dock: play one of the seat moments at a spot
    try(kind, at) { ({ gull: gullGrab, dog, beer, glove: seatsGlove })[kind]?.(at) },
    // for the tests: where each piece up right now sits on screen, and how far it is (along the ground) from the spot it was made for
    boxes() { const c = document.querySelector('canvas').getBoundingClientRect(), cam = api.NN.camera; return [...live].filter((s) => s.userData.at).map((s) => { const v = s.position.clone().project(cam), a = s.userData.at; return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height, on: v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, d: Math.hypot(s.position.x - a.x, s.position.z - a.z), model: !!s.userData.looks?.[0] } }) },
  }
}
