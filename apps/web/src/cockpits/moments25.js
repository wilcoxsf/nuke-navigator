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
import { ORANGE } from './orange25.js'
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
  // (red team 2: what a moment made is freed when it goes, played out or cut off; the glove, sea lion and ball models are clones of shared assets and are only removed)
  const free = (g) => { if (!g?.userData?.owned) return; g.traverse((c) => { c.geometry?.dispose?.(); c.material?.dispose?.() }) }
  const kill = (g) => { scene.remove(g); live.delete(g); free(g) }
  // (red team 12: a sound due later only plays if its moment is still the one up)
  let gen = 0
  const later = (ms, fn) => { const k = gen; setTimeout(() => { if (k === gen) fn() }, ms) }
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
    g.position.copy(at0); scene.add(g); live.add(g); g.userData.at = at0.clone(); g.userData.owned = true
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
    log.push('beer'); o.banner?.('BEER SHOWER', 'THE WHOLE ROW GOT WET')
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
    if (o.variety === false) { seatsGlove(at); return }
    const f = o.force?.(); if (f && PLAY[f]) { PLAY[f](at); return } // (5 Nov: one picked in the side menu, to look at)
    PLAY[deal()](at)
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
  // ---- 1 Nov, night (Andrew: "let's have more voxel landing effects that we cycle btw (can we have a mushroom cloud? Surprise me with fun ones) and right now sometimes
  // multiple voxel landings play and/or overlap - we need to fix that"): five more, all cubes; the seat moments come off a shuffled deck (each once before any again),
  // a home run of 450 ft or more always gets the mushroom cloud, and a new landing clears whatever the last one left up (clear()) ----
  // a burst of loose cubes (one InstancedMesh): each with a start, a velocity, a size and a life; g pulls them down, rise lifts them (smoke)
  function cubes(list, o2 = {}) {
    const n = list.length, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), n), m4 = new THREE.Matrix4(), c = new THREE.Color(), p = V(0, 0, 0)
    list.forEach((q, i) => im.setColorAt(i, c.set(q.c)))
    im.frustumCulled = false; im.userData.owned = true; scene.add(im); live.add(im)
    run((t) => {
      let alive = 0
      list.forEach((q, i) => {
        const u = t - (q.delay ?? 0), k = u / q.life
        if (u < 0 || k >= 1) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); return }
        alive++
        p.copy(q.at).addScaledVector(q.v, u); p.y += -0.5 * (o2.g ?? 0) * u * u
        const s = q.s * (q.grow ? 1 + q.grow * k : 1) * (k > 0.7 ? (1 - k) / 0.3 : 1)
        m4.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m4)
      })
      im.instanceMatrix.needsUpdate = true
      if (!alive && t > 0.5) { kill(im); return false }
      return true
    })
    return im
  }
  const rnd = (a, b) => a + Math.random() * (b - a)
  // MUSHROOM CLOUD: a flash of white at the spot, a stem of fire and smoke cubes going up, a cap that rolls outward on top, a ring of dust racing along the ground
  function mushroom(at, big = false) {
    log.push('mushroom'); o.banner?.(big ? 'NUKED' : 'MUSHROOM CLOUD', big ? 'FALLOUT AS FAR AS OAKLAND' : 'THE SECTION HAS BEEN EVACUATED')
    hideBall(true)
    const S = big ? 1.9 : 1.45, H = 30 * S, list = [] // (sized to read from the broadcast seat: the glove is 11 m, this is 40 m and more)
    const FIRE = ['#fff3c4', '#ffd23f', ORANGE.o, ORANGE.dark], SMOKE = ['#8a8f99', '#6b7079', '#b9bcc2', '#4b4f57']
    for (let i = 0; i < 22; i++) list.push({ at: at.clone().add(V(rnd(-1, 1), 0.5, rnd(-1, 1))), v: V(rnd(-3, 3), rnd(2, 6), rnd(-3, 3)), s: rnd(1.6, 2.6) * S, life: 0.5, c: '#fffbe8' }) // the flash
    for (let i = 0; i < 90; i++) { const y = rnd(0.1, 1), d = i * 0.012; list.push({ at: at.clone().add(V(rnd(-1.8, 1.8) * S, 0, rnd(-1.8, 1.8) * S)), v: V(rnd(-0.4, 0.4), (H * y) / 1.1, rnd(-0.4, 0.4)), s: rnd(1.1, 1.9) * S, life: 1.1 + rnd(1.2, 2.2), delay: d, grow: 0.4, c: y > 0.6 ? FIRE[Math.floor(rnd(0, 3))] : SMOKE[Math.floor(rnd(0, 4))] }) } // the stem
    for (let i = 0; i < 150; i++) { // the cap: rises with the stem, then rolls out
      const a = rnd(0, Math.PI * 2), r = rnd(0, 1) ** 0.6, out = V(Math.cos(a) * r, rnd(-0.25, 0.35), Math.sin(a) * r)
      list.push({ at: at.clone().add(V(0, H * 0.75, 0)), v: V(out.x * 9 * S, 4 + out.y * 6, out.z * 9 * S), s: rnd(1.6, 3) * S, life: rnd(2.2, 3.4), delay: 0.45 + rnd(0, 0.35), grow: 0.8, c: r < 0.62 ? FIRE[Math.floor(rnd(0, 4))] : SMOKE[Math.floor(rnd(0, 4))] })
    }
    for (let i = 0; i < 56; i++) { const a = (i / 56) * Math.PI * 2; list.push({ at: at.clone().add(V(0, 0.4, 0)), v: V(Math.cos(a) * 26 * S, 0.6, Math.sin(a) * 26 * S), s: rnd(0.9, 1.4) * S, life: 1.1, delay: 0.05, c: i % 2 ? '#c9b79a' : '#8a8f99' }) } // the ring
    cubes(list)
    o.sound?.('mushroom')
  }
  // CRATER: it lands like a meteor: the seats blow out in a ring of cubes that settles into a rim, smoke curls off it, and a little flag goes in
  function crater(at) {
    log.push('crater'); o.banner?.('IMPACT', 'THEY WILL BE DIGGING IT OUT FOR WEEKS')
    hideBall(true)
    const list = []
    for (let i = 0; i < 90; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(7, 15); list.push({ at: at.clone().add(V(0, 0.5, 0)), v: V(Math.cos(a) * sp, rnd(8, 16), Math.sin(a) * sp), s: rnd(1.3, 2.4), life: 1.3, c: ['#5a3a1e', '#8a8f99', '#c9b79a', '#3a3f47'][i % 4] }) }
    for (let i = 0; i < 26; i++) list.push({ at: at.clone().add(V(rnd(-4, 4), 1, rnd(-4, 4))), v: V(rnd(-0.6, 0.6), rnd(3, 6), rnd(-0.6, 0.6)), s: rnd(1.8, 3), life: rnd(2, 3), delay: 0.6 + rnd(0, 1.2), grow: 1, c: ['#6b7079', '#8a8f99', '#4b4f57'][i % 3] })
    cubes(list, { g: 14 })
    const C = []
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; C.push([Math.round(Math.cos(a) * 6), 0, Math.round(Math.sin(a) * 6), i % 2 ? '#5a3a1e' : '#3a3f47'], [Math.round(Math.cos(a) * 5), 1, Math.round(Math.sin(a) * 5), '#5a3a1e']) }
    box(C, 0, 0, 0, 7, 0, 0, '#e8e1c9'); box(C, 1, 3, 5, 7, 0, 0, ORANGE.o); C.push([0, 0, 0, '#f4f2ea'])
    const g = vox(C, 1.2, at.clone())
    g.scale.setScalar(0.01)
    run((t) => { const k = Math.min(1, Math.max(0, (t - 0.9) / 0.35)); g.scale.setScalar(Math.max(0.01, k)); if (t > 4) { kill(g); return false } return true })
    o.sound?.('kaboom'); later(300, () => o.sound?.('dirt'))
  }
  // ABDUCTED: a saucer drops out of the sky over the spot, a beam of cubes comes down, the ball goes up it, and the saucer is gone
  function ufo(at) {
    log.push('ufo'); o.banner?.('ABDUCTED', 'THE BALL HAS LEFT THE PLANET')
    const C = []
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) { const r = Math.hypot(x, z); if (r <= 6.2) C.push([x, 0, z, r > 5 ? '#f4f2ea' : '#8a8f99']); if (r <= 3.4) C.push([x, 1, z, '#b9bcc2']); if (r <= 2.2) C.push([x, 2, z, '#9dff00']) }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; C.push([Math.round(Math.cos(a) * 5), -1, Math.round(Math.sin(a) * 5), i % 2 ? ORANGE.o : '#ffd23f']) }
    const top = at.clone().add(V(0, 30, 0)), from = top.clone().add(V(-80, 40, 0)), g = vox(C, 1.3, from)
    const beam = []
    const b = piece('ball', ['ball'], at.clone().add(V(0, 1, 0)))
    let took = false, beamOn = false
    run((t) => {
      if (t < 1) g.position.lerpVectors(from, top, ease(t))
      else if (t < 3) g.position.copy(top).add(V(0, Math.sin(t * 5) * 0.3, 0))
      else g.position.copy(top).add(V((t - 3) ** 2 * 120, (t - 3) * 40, 0))
      g.rotation.y = t * 3
      if (!took && t > 0.4) { took = true; hideBall(true) }
      if (!beamOn && t > 1) { beamOn = true; o.sound?.('ufo'); for (let i = 0; i < 70; i++) { const y = rnd(0, 1); beam.push({ at: at.clone().add(V(rnd(-1, 1) * (1.5 + y * 5), y * 27, rnd(-1, 1) * (1.5 + y * 5))), v: V(0, 3, 0), s: rnd(0.8, 1.4), life: 1.9, delay: rnd(0, 0.3), c: i % 3 ? '#9dff00' : '#e9ffc4' }) } cubes(beam) }
      if (t > 1.2 && t < 2.8) b.position.copy(at).add(V(0, 1 + ease((t - 1.2) / 1.6) * 23, 0)), (b.rotation.y = t * 8)
      if (t >= 2.8) b.visible = false
      if (t > 4.2) { kill(g); kill(b); return false }
      return true
    })
    o.sound?.('whoosh')
  }
  // THE DOG: a giant bun comes up out of the seats under it, the ball lands in it like a frank, the bun shuts and a stripe of mustard goes on
  function hotdog(at) {
    log.push('hotdog'); o.banner?.('HOT DOG', 'WITH EVERYTHING')
    // one chunky dog: the bun a trough, the frank longer than the bun at both ends, a zigzag of mustard on top (sized for the broadcast seat)
    const C = [], BUN = '#e2a85b', CRUST = '#c27a35', FRANK = '#b04a2a', MUST = '#ffd23f'
    for (let x = -7; x <= 7; x++) for (let z = -2; z <= 2; z++) { C.push([x, 0, z, CRUST]); if (Math.abs(z) === 2) C.push([x, 1, z, BUN], [x, 2, z, Math.abs(x) === 7 ? CRUST : BUN]); else C.push([x, 1, z, BUN]) }
    for (let x = -9; x <= 9; x++) for (const z of [-1, 0, 1]) C.push([x, 2, z, FRANK], ...(z === 0 ? [[x, 3, z, FRANK]] : []))
    for (let x = -6; x <= 6; x++) C.push([x, 4, Math.round(Math.sin(x * 1.3)), MUST])
    const g = vox(C, 1.3, at.clone().add(V(0, -9, 0)))
    let got = false
    run((t) => {
      const up = ease(t / 0.45) - ease((t - 2.9) / 0.5)
      g.position.y = at.y - 9 + up * 10 + (t > 0.45 && t < 0.8 ? Math.sin(((t - 0.45) / 0.35) * Math.PI) * 1.2 : 0)
      if (!got && t > 0.4) { got = true; hideBall(true); o.sound?.('chomp') }
      if (t > 3.5) { kill(g); return false }
      return true
    })
  }
  // GARLIC FRIES: it drops into a paper boat of garlic fries, which go up in a fountain and rain down on the section
  function fries(at) {
    log.push('fries'); o.banner?.('GARLIC FRIES', 'NOBODY IS EATING THOSE NOW')
    const C = []
    box(C, -3, 3, 0, 0, -2, 2, '#f4f2ea'); for (const z of [-2, 2]) box(C, -3, 3, 1, 2, z, z, '#f4f2ea'); for (const x of [-3, 3]) box(C, x, x, 1, 2, -2, 2, '#f4f2ea'); box(C, -3, 3, 2, 2, -2, -2, ORANGE.o)
    const g = vox(C, 1.3, at.clone().add(V(0, -6, 0)))
    let burst = false
    run((t) => {
      g.position.y = at.y - 6 + (ease(t / 0.35) - ease((t - 2.6) / 0.4)) * 6
      if (!burst && t > 0.4) {
        burst = true; hideBall(true); o.sound?.('pop')
        const list = []
        for (let i = 0; i < 80; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(1, 7); list.push({ at: at.clone().add(V(0, 1.5, 0)), v: V(Math.cos(a) * sp * 1.4, rnd(12, 22), Math.sin(a) * sp * 1.4), s: rnd(0.7, 1.1), life: 2.4, c: i % 7 ? '#f2c94c' : '#e8e1c9' }) }
        const im = cubes(list, { g: 14 }); im.scale.set(1, 1, 1)
      }
      if (t > 3.1) { kill(g); return false }
      return true
    })
  }
  // ---- 5 Nov (Andrew, on the list of ten: "crater, dogpile, let's have an earthquake fault line split it, let's have it hit a dodger fan in the head and then he's
  // carried off on a stretcher, like pinball, like black hole too. Let's have one where it enters a portal too and then pops out somewhere else") ----
  const camSide = () => V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion).setY(0).normalize()
  const SHIRTS = ['#fd5a1e', '#16181b', '#efe6cf', '#fd5a1e', '#8a8f99', '#16181b'], SKIN = ['#e0b48a', '#c68e62', '#8d5a3b', '#f1c9a5']
  // a little fan, two cubes wide: shoes, pants, shirt, head, cap
  const fanCells = (shirt, skin, cap = '#16181b', pants = '#2a2d33') => { const c = []; for (const x of [0, 1]) { c.push([x, 0, 0, '#16181b'], [x, 1, 0, pants], [x, 2, 0, pants]); for (let y = 3; y <= 5; y++) c.push([x, y, 0, shirt]); c.push([x, 6, 0, skin], [x, 7, 0, skin], [x, 8, 0, cap]) } c.push([-1, 4, 0, shirt], [2, 4, 0, shirt], [0, 8, 1, cap], [1, 8, 1, cap]); return c }
  // BONK: it comes down on a Dodger fan's head, bounces off, stars go round, he keels over, and two medics carry him off on a stretcher
  function bonk(at) {
    log.push('bonk'); hideBall(true)
    const BLUE = '#005a9c', side = camSide(), fan = vox(fanCells(BLUE, '#f1c9a5', BLUE, '#d9dde3'), 1.25, at.clone())
    const medics = [-1, 1].map((s) => vox(fanCells('#f4f2ea', SKIN[(s + 3) % 4], '#d62a2a', '#f4f2ea'), 1.25, at.clone().addScaledVector(side, s * 30)))
    const strC = []; box(strC, -3, 3, 0, 0, 0, 1, '#f4f2ea'); box(strC, -4, -4, 0, 0, 0, 1, '#8a8f99'); box(strC, 4, 4, 0, 0, 0, 1, '#8a8f99'); box(strC, 0, 0, 1, 1, 0, 0, '#d62a2a')
    const str = vox(strC, 1.25, at.clone()); str.visible = false
    const ball = piece('ball', ['ball'], at.clone().add(V(0, 11.6, 0)))
    const stars = []; for (let i = 0; i < 5; i++) { const s = vox([[0, 0, 0, '#ffd23f']], 1, at.clone()); stars.push(s) }
    run((t) => {
      // the ball: off the head and away
      if (t < 1.2) { const k = t / 1.2; ball.position.copy(at).add(V(0, 11.6, 0)).addScaledVector(side, k * 18); ball.position.y += 12 * k - 18 * k * k; ball.rotation.x = t * 10 } else ball.visible = false
      // stars round his head while he wobbles, then he goes over
      const wob = t < 1.8 ? Math.sin(t * 12) * 0.18 : 0, fall = t < 1.8 ? 0 : Math.min(1, (t - 1.8) / 0.35)
      fan.rotation.z = wob + fall * (Math.PI / 2)
      stars.forEach((s, i) => { const a = t * 6 + (i / 5) * Math.PI * 2; s.visible = t > 0.2 && t < 2.6; s.position.copy(at).add(V(Math.cos(a) * 3.2, 12.4 + fall * -8, Math.sin(a) * 3.2)) })
      // the medics come in from each side with the stretcher between them, he goes on it, and they carry him off
      if (t > 2.1) {
        const inK = ease((t - 2.1) / 1.0), outK = t > 3.6 ? ease((t - 3.6) / 1.6) : 0, off = side.clone().multiplyScalar(outK * 50)
        medics.forEach((m, j) => { const s = j ? 1 : -1; m.position.copy(at).addScaledVector(side, s * (30 - 27 * inK)).add(off); m.position.y = at.y + Math.abs(Math.sin(t * 10 + j)) * 0.6 })
        if (t > 3.1) { str.visible = true; str.position.copy(at).add(off).add(V(0, 4.4, 0)); fan.position.copy(str.position).add(V(0, 1.2, 0)); fan.rotation.z = Math.PI / 2 }
      }
      if (t > 5.4) { kill(fan); kill(str); medics.forEach(kill); stars.forEach(kill); kill(ball); return false }
      return true
    })
    o.sound?.('thud')
  }
  // PINBALL: bumpers pop up out of the seats round the spot and the ball pings between them, each lighting up as it is hit, then it drops out of sight
  function pinball(at) {
    log.push('pinball'); hideBall(true)
    const side = camSide(), depth = V(-side.z, 0, side.x)
    const spots = [[-10, 6], [10, 8], [0, -8], [-8, -4], [8, -6]].map(([a, b]) => at.clone().addScaledVector(side, a).addScaledVector(depth, b))
    const bumperCells = (c) => { const C = []; for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) { const r = Math.hypot(x, z); if (r <= 2.3) { C.push([x, 0, z, '#16181b']); C.push([x, 1, z, r > 1.4 ? c : '#f4f2ea']) } } return C }
    const bumpers = spots.map((p, i) => ({ g: vox(bumperCells(i % 2 ? ORANGE.o : '#ffd23f'), 1.1, p.clone()), p }))
    const hot = spots.map((p) => { const g = vox(bumperCells('#ffffff'), 1.1, p.clone()); g.visible = false; return g })
    const ball = piece('ball', ['ball'], at.clone().add(V(0, 4, 0)))
    const path = [at.clone().add(V(0, 4, 0)), ...[0, 1, 2, 3, 4, 1, 0].map((k) => spots[k].clone().add(V(0, 4.4, 0)))], hop = 0.32
    run((t) => {
      bumpers.forEach((b, i) => { const up = ease(t / 0.3) - ease((t - 3.4) / 0.4); b.g.scale.setScalar(Math.max(0.01, up)); hot[i].scale.copy(b.g.scale) })
      const seg = Math.floor(t / hop), k = (t % hop) / hop
      if (seg < path.length - 1) { ball.position.lerpVectors(path[seg], path[seg + 1], k); ball.position.y += Math.sin(k * Math.PI) * 4.4; ball.rotation.y = t * 12; const hit = [0, 1, 2, 3, 4, 1, 0][seg]; hot.forEach((h, i) => { h.visible = i === hit && k > 0.85 || i === [0, 1, 2, 3, 4, 1, 0][seg - 1] && k < 0.25 }); if (k > 0.85 && !ball.userData['h' + seg]) { ball.userData['h' + seg] = 1; o.sound?.('chip') } }
      else { const k2 = Math.min(1, (t - hop * (path.length - 1)) / 0.4); ball.position.copy(path[path.length - 1]); ball.position.y -= k2 * 6; ball.scale.setScalar(Math.max(0.01, 1 - k2)); hot.forEach((h) => { h.visible = false }) }
      if (t > 3.9) { bumpers.forEach((b) => kill(b.g)); hot.forEach(kill); kill(ball); return false }
      return true
    })
  }
  // ---- 5 Nov, night (Andrew picked, from two lists of ten: "pinata, tiny tornado, 4 [whack-a-mole], 5 [jack-in-the-box], 9 [rocket launch]", then "1, 3, 6, 7, 8,
  // 10": the hand of God, the ball hatches, the lightning rod, the toilet flush, the claw machine, the ghost of the ball). Each stays on the spot or comes from above ----
  const ring2 = (out, r, y, c, z0 = 0) => { for (let i = 0; i < Math.max(8, Math.round(r * 7)); i++) { const a = (i / Math.max(8, Math.round(r * 7))) * Math.PI * 2; out.push([Math.round(Math.cos(a) * r), y, Math.round(Math.sin(a) * r) + z0, c]) } }
  const ballAt = (p) => { const b = piece('ball', ['ball'], p.clone()); return b }
  // PINATA: a donkey pinata swings down on a rope, the ball comes back up and smashes it, candy rains down
  function pinata(at) {
    log.push('pinata'); hideBall(true)
    const C = [], P = ['#fd5a1e', '#ffd23f', '#ff6fb5', '#5fd3ff', '#9a5cff']
    for (let x = -4; x <= 3; x++) for (let y = 0; y <= 3; y++) C.push([x, y + 3, 0, P[(x + 4 + y) % 5]]) // the body, in fringe stripes
    for (const x of [-4, -3, 2, 3]) for (let y = 0; y < 3; y++) C.push([x, y, 0, P[(x + 9) % 5]]) // legs
    box(C, 3, 4, 7, 9, 0, 0, '#ffd23f'); box(C, 4, 6, 9, 10, 0, 0, '#ff6fb5'); C.push([6, 11, 0, '#ffd23f'], [4, 11, 0, '#ffd23f'], [5, 9, 1, '#16181b']) // neck, head, ears, eye
    for (let y = 4; y <= 6; y++) C.push([-5, y, 0, '#5fd3ff']) // the tail
    const top = at.clone().add(V(0, 16, 0)), g = vox(C, 0.9, top.clone().add(V(0, 40, 0)))
    const rope = vox(Array.from({ length: 40 }, (_, i) => [0, i, 0, '#e8e1c9']), 0.35, top.clone().add(V(0, 10, 0)))
    const ball = ballAt(at.clone().add(V(0, 1, 0))); let smashed = false
    run((t) => {
      const drop = ease(t / 0.7); g.position.y = top.y + 40 * (1 - drop) - 0; g.rotation.z = Math.sin(t * 3) * 0.25 * (smashed ? 0 : 1); rope.position.y = g.position.y + 10.5
      if (t > 0.6 && t < 1.15) { const k = (t - 0.6) / 0.55; ball.position.copy(at).add(V(0, 1 + 17 * ease(k), 0)); ball.rotation.y = t * 9 }
      if (!smashed && t >= 1.15) {
        smashed = true; g.visible = false; ball.visible = false; o.sound?.('kaboom')
        const L = []
        for (let i = 0; i < 40; i++) L.push({ at: top.clone().add(V(rnd(-3, 3), rnd(3, 8), rnd(-1, 1))), v: V(rnd(-7, 7), rnd(2, 9), rnd(-7, 7)), s: rnd(0.8, 1.5), life: 1.4, c: P[i % 5] })
        for (let i = 0; i < 70; i++) L.push({ at: top.clone().add(V(rnd(-4, 4), rnd(4, 9), rnd(-4, 4))), v: V(rnd(-2, 2), rnd(-1, 3), rnd(-2, 2)), s: rnd(0.4, 0.7), life: rnd(1.8, 2.6), delay: rnd(0, 0.5), c: ['#ff3b6b', '#ffd23f', '#9dff00', '#5fd3ff', '#ffffff', '#ff8a00'][i % 6] })
        cubes(L, { g: 14 })
      }
      if (smashed) rope.position.y += (t - 1.15) * 30 * 0.016
      if (t > 3.6) { kill(g); kill(rope); kill(ball); return false }
      return true
    })
    o.sound?.('whoosh')
  }
  // TINY TORNADO: a twister spins up out of the seat, carries the ball round and up, and throws it into the sky
  function tornado(at) {
    log.push('tornado'); hideBall(true)
    const H = 26, LV = 14, rings = []
    for (let j = 0; j < LV; j++) { const y = (j / LV) * H, r = 1 + (j / LV) * 6.5, C = []; ring2(C, r, 0, j % 3 ? '#b9bcc2' : '#e8e1c9'); const g = vox(C, 0.9, at.clone().add(V(0, y, 0))); g.scale.setScalar(0.01); rings.push({ g, y }) }
    const ball = ballAt(at.clone().add(V(0, 1, 0))), deb = []
    for (let i = 0; i < 18; i++) deb.push({ a: rnd(0, 6.3), y: rnd(0, H * 0.8), r: rnd(2, 7), g: vox([[0, 0, 0, ['#5a3a1e', '#8a8f99', '#c9b79a', '#fd5a1e'][i % 4]]], rnd(0.6, 1.1), at.clone()) })
    run((t) => {
      const up = ease(t / 0.6), down = t > 3.3 ? 1 - ease((t - 3.3) / 0.5) : 1
      rings.forEach((R, j) => { R.g.scale.setScalar(Math.max(0.01, up * down)); R.g.rotation.y = t * (6 + j * 0.4); R.g.position.x = at.x + Math.sin(t * 2 + j * 0.4) * 0.8 * j / LV * 3; R.g.position.y = at.y + R.y * up })
      deb.forEach((d) => { d.a += 0.12; const r = d.r * up * down; d.g.position.set(at.x + Math.cos(d.a) * r, at.y + d.y * up + Math.sin(t * 3 + d.a) * 1.5, at.z + Math.sin(d.a) * r); d.g.visible = down > 0.05 })
      if (t < 2.5) { const h = Math.min(1, t / 2.5), a = t * 9; ball.position.set(at.x + Math.cos(a) * (1 + h * 5), at.y + 1 + h * H * 0.85, at.z + Math.sin(a) * (1 + h * 5)) }
      else { const k = (t - 2.5); ball.position.y += 70 * k * 0.016; ball.position.x += 25 * 0.016; if (k > 1) ball.visible = false }
      if (t > 3.9) { rings.forEach((R) => kill(R.g)); deb.forEach((d) => kill(d.g)); kill(ball); return false }
      return true
    })
    o.sound?.('whoosh'); later(800, () => o.sound?.('whoosh'))
  }
  // WHACK-A-MOLE: a mole pops up out of the seat and the ball bonks it; it ducks, and comes back up in a little Giants batting helmet
  function mole(at) {
    log.push('mole'); hideBall(true)
    const C = [], B = '#6b4a2b'
    for (let y = 0; y <= 6; y++) { const r = y > 4 ? 1 : 2; for (let x = -r; x <= r; x++) C.push([x, y, 0, B], [x, y, -1, B]) }
    C.push([-1, 5, 1, '#16181b'], [1, 5, 1, '#16181b'], [0, 4, 1, '#ff8fb0'], [0, 3, 1, '#f4f2ea'], [-2, 2, 1, '#ff8fb0'], [2, 2, 1, '#ff8fb0'])
    const H = []; for (let x = -2; x <= 2; x++) for (let z = -2; z <= 1; z++) H.push([x, 7, z, '#16181b']); for (let x = -1; x <= 1; x++) H.push([x, 8, 0, '#16181b'], [x, 8, -1, '#16181b']); H.push([0, 7, 2, '#16181b'], [1, 7, 2, '#16181b'], [-1, 7, 2, '#16181b'], [0, 8, 1, '#fd5a1e'], [2, 6, 0, '#16181b'], [2, 5, 0, '#16181b'])
    const hole = []; ring2(hole, 3, 0, '#16181b')
    const hg = vox(hole, 1.6, at.clone().add(V(0, 0.1, 0))), m = vox(C, 1.6, at.clone()), helmet = vox(H, 1.6, at.clone()); helmet.visible = false
    const ball = ballAt(at.clone().add(V(0, 20, 0)))
    run((t) => {
      // up (0 to 0.3), the ball comes down on it (0.3 to 0.6), squashed and down (to 1.0), up again in the helmet (1.5 to 1.8), a look round, down (3.1 to 3.4)
      const up = t < 0.3 ? ease(t / 0.3) : t < 0.6 ? 1 : t < 1.0 ? 1 - ease((t - 0.6) / 0.4) : t < 1.5 ? 0 : t < 1.8 ? ease((t - 1.5) / 0.3) : t < 3.1 ? 1 : 1 - ease((t - 3.1) / 0.3)
      m.position.y = at.y - 11 + up * 11; helmet.position.y = m.position.y; helmet.visible = t > 1.5
      m.scale.y = t > 0.6 && t < 0.8 ? 0.6 : 1; m.rotation.y = t > 2 && t < 3 ? Math.sin(t * 6) * 0.4 : m.rotation.y
      helmet.rotation.y = m.rotation.y
      if (t < 0.6) ball.position.copy(at).add(V(0, 26 - 14 * ease(t / 0.6), 0)); else if (t < 1.4) { const k = (t - 0.6) / 0.8; ball.position.copy(at).add(V(k * 12, 12 + 8 * k - 14 * k * k, 0)) } else ball.visible = false
      if (t > 3.5) { kill(m); kill(helmet); kill(hg); kill(ball); return false }
      return true
    })
    later(600, () => o.sound?.('thud'))
  }
  // JACK-IN-THE-BOX: a box comes up out of the seat, the lid flips, a clown head springs out on a coil with the ball in its teeth
  function jack(at) {
    log.push('jack'); hideBall(true)
    const BX = []; for (let x = -3; x <= 3; x++) for (let y = 0; y <= 5; y++) for (const z of [-3, 3]) BX.push([x, y, z, (x + y) % 2 ? '#fd5a1e' : '#16181b']); for (let z = -2; z <= 2; z++) for (let y = 0; y <= 5; y++) for (const x of [-3, 3]) BX.push([x, y, z, (z + y) % 2 ? '#ffd23f' : '#16181b'])
    const LID = []; for (let x = -3; x <= 3; x++) for (let z = 0; z <= 6; z++) LID.push([x, 0, z, '#ffd23f'])
    const HEAD = []; for (let x = -2; x <= 2; x++) for (let y = 0; y <= 4; y++) HEAD.push([x, y, 0, '#f4f2ea']); HEAD.push([-1, 3, 1, '#16181b'], [1, 3, 1, '#16181b'], [0, 2, 1, '#e4002b'], [-1, 1, 1, '#e4002b'], [0, 1, 1, '#e4002b'], [1, 1, 1, '#e4002b']); for (let x = -3; x <= 3; x++) HEAD.push([x, 5, 0, ['#ff3b6b', '#ffd23f', '#9dff00', '#5fd3ff', '#9a5cff', '#fd5a1e', '#ff3b6b'][x + 3]]); HEAD.push([-3, 4, 0, '#ffd23f'], [3, 4, 0, '#5fd3ff'])
    const box0 = vox(BX, 1, at.clone().add(V(0, -6, 0))), lid = vox(LID, 1, at.clone()), head = vox(HEAD, 1, at.clone()), coils = []
    for (let i = 0; i < 10; i++) coils.push(vox([[-1, 0, 0, '#b9bcc2'], [0, 0, 0, '#b9bcc2'], [1, 0, 0, '#b9bcc2']], 0.9, at.clone()))
    const ball = ballAt(at.clone()); ball.visible = false
    run((t) => {
      const rise = t < 0.4 ? ease(t / 0.4) : t < 3.2 ? 1 : 1 - ease((t - 3.2) / 0.4)
      box0.position.y = at.y - 6 + rise * 6
      lid.position.copy(at); lid.position.y = box0.position.y + 6; lid.rotation.x = t > 0.45 ? -Math.min(1, (t - 0.45) / 0.15) * 2 : 0
      const spring = t < 0.5 ? 0 : t < 3.0 ? 1 + Math.sin((t - 0.5) * 12) * 0.35 * Math.exp(-(t - 0.5) * 1.6) : Math.max(0, 1 - (t - 3.0) / 0.25), top = box0.position.y + 6 + spring * 11
      coils.forEach((c, i) => { c.position.set(at.x + (i % 2 ? 0.6 : -0.6), box0.position.y + 6 + (i / 10) * spring * 11, at.z); c.visible = spring > 0.05 })
      head.position.set(at.x, top, at.z); head.visible = spring > 0.05; head.rotation.z = Math.sin(t * 7) * 0.12 * spring
      ball.visible = spring > 0.3; ball.position.copy(head.position).add(V(0, 1.4, 1.2)).applyAxisAngle(V(0, 1, 0), 0)
      if (t > 3.7) { kill(box0); kill(lid); kill(head); coils.forEach(kill); kill(ball); return false }
      return true
    })
    later(450, () => o.sound?.('chip'))
  }
  // ROCKET LAUNCH: three lamps go out one by one beside the ball, then it lifts off on a plume and climbs until it is a dot
  function rocket(at) {
    log.push('rocket'); hideBall(true)
    const side = camSide(), lamps = [0, 1, 2].map((i) => vox([[0, 0, 0, '#ff3b30']], 2, at.clone().addScaledVector(side, -7).add(V(0, 2 + i * 2.8, 0))))
    const pad = []; ring2(pad, 3, 0, '#3a3f47'); const pg = vox(pad, 1.8, at.clone().add(V(0, 0.1, 0)))
    const ball = ballAt(at.clone().add(V(0, 1.4, 0))), plume = []; ball.scale.setScalar(2)
    run((t) => {
      lamps.forEach((l, i) => { l.visible = t < 0.6 + i * 0.5 })
      if (t > 1.9) { const k = t - 1.9, y = 1.4 + 6 * k * k * k + 8 * k; ball.position.copy(at).add(V(0, y, 0)); ball.rotation.y = t * 14; ball.visible = y < 220
        if (t < 4.2 && Math.random() < 0.9) for (let i = 0; i < 3; i++) plume.push({ at: ball.position.clone().add(V(rnd(-0.6, 0.6), -1.4, rnd(-0.6, 0.6))), v: V(rnd(-1.5, 1.5), rnd(-9, -4), rnd(-1.5, 1.5)), s: rnd(0.8, 1.6), life: rnd(0.4, 0.8), grow: 1.2, c: ['#fff3c4', '#ffd23f', '#fd5a1e', '#8a8f99'][i + (Math.random() < 0.4 ? 1 : 0)] }) }
      if (plume.length > 20) { cubes(plume.splice(0, plume.length)) }
      if (t > 1.9 && t < 2.1) for (let i = 0; i < 6; i++) plume.push({ at: at.clone().add(V(rnd(-2, 2), 0.6, rnd(-2, 2))), v: V(rnd(-5, 5), rnd(0.5, 2), rnd(-5, 5)), s: rnd(1.4, 2.4), life: 2, grow: 1.4, c: '#b9b4a5' })
      if (t > 5) { lamps.forEach(kill); kill(pg); kill(ball); return false }
      return true
    })
    later(1900, () => o.sound?.('ufo'))
  }
  // HAND OF GOD: a giant hand reaches down out of a cloud, takes the ball between finger and thumb, and goes back up
  function hand(at) {
    log.push('hand')
    const SK = '#f1c9a5', SH = '#d9a27a', C = []
    for (let x = -3; x <= 3; x++) for (let y = 8; y <= 14; y++) for (let z = -1; z <= 0; z++) C.push([x, y, z, z ? SK : SH]) // the palm and the back
    for (let y = 0; y <= 7; y++) C.push([-2, y, 0, SK], [-2, y, -1, SK]) // the index finger, pointing down
    for (let y = 3; y <= 7; y++) C.push([3, y, 0, SK], [3, y, -1, SK]); C.push([2, 3, 0, SK]) // the thumb
    for (const x of [-1, 0, 1]) for (let y = 6; y <= 8; y++) C.push([x, y, -1, SH]) // the curled fingers
    for (let x = -3; x <= 3; x++) for (let y = 15; y <= 19; y++) C.push([x, y, -1, '#efe6cf']) // the sleeve
    const hi = at.clone().add(V(0, 70, 0)), g = vox(C, 1.2, hi.clone()), clouds = []
    for (let i = 0; i < 26; i++) clouds.push({ at: hi.clone().add(V(rnd(-14, 14), rnd(26, 32), rnd(-8, 8))), v: V(rnd(-0.5, 0.5), 0, rnd(-0.5, 0.5)), s: rnd(3, 6), life: 4.4, c: i % 3 ? '#f4f2ea' : '#d5ddf5' })
    cubes(clouds)
    const ball = ballAt(at.clone().add(V(0, 1, 0))); let took = false
    run((t) => {
      const down = t < 1.2 ? ease(t / 1.2) : t < 1.7 ? 1 : 1 - ease((t - 1.7) / 1.4)
      g.position.copy(hi).lerp(at.clone().add(V(0.4 * 1.2 * 2, -0.6, 0)), down)
      if (!took && t > 1.25) { took = true; hideBall(true) }
      if (took) ball.position.copy(g.position).add(V(0.3, 0.2, 0.4)); ball.visible = took || t > 0.2
      if (t > 3.3) { kill(g); kill(ball); return false }
      return true
    })
    o.sound?.('whoosh')
  }
  // THE BALL HATCHES: it cracks like an egg, the halves fall apart, and a chick in a Giants cap climbs out and looks round
  function hatch(at) {
    log.push('hatch'); hideBall(true)
    const W = '#f4f2ea', R = '#d62a2a', top = [], bot = []
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) { if (Math.hypot(x, z) > 2.4) continue; for (let y = 0; y <= 2; y++) bot.push([x, y, z, (x === 0 && y === 1) ? R : W]); for (let y = 3; y <= 4; y++) if (Math.hypot(x, z) < 2.2 - (y - 3) * 0.6) top.push([x, y, z, (z === 0 && y === 3) ? R : W]) }
    const Y = '#ffd23f', chick = []; for (let x = -1; x <= 1; x++) for (let y = 0; y <= 2; y++) chick.push([x, y, 0, Y]); for (let x = -1; x <= 1; x++) for (let y = 3; y <= 4; y++) chick.push([x, y, 0, Y]); chick.push([-1, 4, 1, '#16181b'], [1, 4, 1, '#16181b'], [0, 3, 1, '#fd5a1e'], [-2, 1, 0, Y], [2, 1, 0, Y]); for (let x = -1; x <= 1; x++) chick.push([x, 5, 0, '#16181b']); chick.push([0, 5, 1, '#16181b'], [0, 6, 0, '#fd5a1e'])
    const eB = vox(bot, 1, at.clone()), eT = vox(top, 1, at.clone()), ch = vox(chick, 0.9, at.clone().add(V(0, 0.5, 0))); ch.visible = false
    run((t) => {
      if (t < 0.9) { eT.rotation.z = Math.sin(t * 40) * 0.06 * (t > 0.3 ? 1 : 0); eB.rotation.z = -eT.rotation.z }
      else { const k = Math.min(1, (t - 0.9) / 0.5); eT.position.copy(at).add(V(-3 * k, 3 * k - 4 * k * k, 0)); eT.rotation.z = k * 1.4; eB.rotation.z = -k * 0.3 }
      if (t > 1.1) { ch.visible = true; const hop = t > 2 && t < 2.8 ? Math.abs(Math.sin((t - 2) * 8)) * 1.2 : 0, k = Math.min(1, (t - 1.1) / 0.4); ch.position.copy(at).add(V(0, 0.5 + 2 * k + hop, 0)); ch.rotation.y += t > 1.6 && t < 2 ? 0.08 : t > 2.8 && t < 3.2 ? -0.08 : 0 }
      if (t > 4) { kill(eB); kill(eT); kill(ch); return false }
      return true
    })
    later(900, () => o.sound?.('chip'))
  }
  // LIGHTNING ROD: a rod shoots up out of the seat, a dark cloud gathers, a bolt comes down onto it twice, and the ball is left smoking and glowing
  function zap(at) {
    log.push('zap'); hideBall(true)
    const rod = vox(Array.from({ length: 16 }, (_, i) => [0, i, 0, i === 15 ? '#ffd23f' : '#8a8f99']), 0.9, at.clone()); rod.scale.y = 0.01
    const cloud = []; for (let i = 0; i < 30; i++) cloud.push({ at: at.clone().add(V(rnd(-10, 10), rnd(34, 40), rnd(-6, 6))), v: V(0, 0, 0), s: rnd(3, 5.5), life: 3.6, delay: rnd(0, 0.4), c: i % 2 ? '#3a3f47' : '#4b4f57' }); cubes(cloud)
    const tip = at.clone().add(V(0, 14, 0)), boltC = []; let x = 0
    for (let y = 22; y >= 0; y--) { x += Math.round(rnd(-1, 1)); boltC.push([x, y, 0, y % 3 ? '#ffffff' : '#fff36b']); if (y % 5 === 0) boltC.push([x + 1, y, 0, '#fff36b']) }
    const bolt = vox(boltC, 1, tip.clone()); bolt.visible = false
    const glow = vox([[0, 0, 0, '#ff7a00']], 2.6, at.clone().add(V(0, 0.2, 0))); glow.visible = false
    run((t) => {
      rod.scale.y = Math.max(0.01, ease(t / 0.4))
      bolt.visible = (t > 1.0 && t < 1.18) || (t > 1.35 && t < 1.55)
      if (t > 1.2) { glow.visible = true; glow.scale.setScalar(1 + Math.sin(t * 9) * 0.08); if (Math.random() < 0.3) cubes([{ at: at.clone().add(V(rnd(-0.6, 0.6), 1.6, rnd(-0.6, 0.6))), v: V(rnd(-0.4, 0.4), rnd(2, 4), rnd(-0.4, 0.4)), s: rnd(0.8, 1.4), life: 1.4, grow: 1.4, c: '#8a8f99' }]) }
      if (t > 3.8) { kill(rod); kill(bolt); kill(glow); return false }
      return true
    })
    later(1000, () => o.sound?.('kaboom')); later(1350, () => o.sound?.('kaboom'))
  }
  // TOILET FLUSH: a toilet comes up out of the seat, the ball goes round the bowl in the swirl and down, the lid drops, the toilet sinks
  function flush(at) {
    log.push('flush'); hideBall(true)
    const W = '#f4f2ea', C = []
    for (let y = 0; y <= 2; y++) ring2(C, 2 + y * 0.6, y, W)
    ring2(C, 3.4, 3, W); for (let x = -3; x <= 3; x++) for (let y = 3; y <= 8; y++) C.push([x, y, -4, W]); C.push([2, 8, -3, '#b9bcc2'])
    const water = []; ring2(water, 2.4, 2.6, '#5fd3ff'); ring2(water, 1.4, 2.6, '#5fd3ff')
    const lidC = []; for (let x = -3; x <= 3; x++) for (let z = 0; z <= 6; z++) lidC.push([x, 0, z, W])
    const g = vox(C, 1, at.clone().add(V(0, -9, 0))), wg = vox(water, 1, at.clone()), lid = vox(lidC, 1, at.clone())
    const ball = ballAt(at.clone()); ball.visible = false
    run((t) => {
      const rise = t < 0.5 ? ease(t / 0.5) : t < 3.3 ? 1 : 1 - ease((t - 3.3) / 0.5), y0 = at.y - 9 + rise * 9
      g.position.y = y0; wg.position.set(at.x, y0, at.z); wg.rotation.y = t * 5; wg.visible = t > 0.5 && t < 2.6
      lid.position.set(at.x, y0 + 3.5, at.z); lid.rotation.x = t < 2.6 ? -1.7 : -1.7 + Math.min(1, (t - 2.6) / 0.25) * 1.7
      if (t > 0.6 && t < 2.4) { const k = (t - 0.6) / 1.8, a = t * 10, r = 2.6 * (1 - k); ball.visible = true; ball.position.set(at.x + Math.cos(a) * r, y0 + 3 - 2.5 * k, at.z + Math.sin(a) * r); ball.scale.setScalar(1 - 0.6 * k) } else ball.visible = false
      if (t > 3.9) { kill(g); kill(wg); kill(lid); kill(ball); return false }
      return true
    })
    later(700, () => o.sound?.('splash'))
  }
  // CLAW MACHINE: an arcade claw comes down on a cable, grabs the ball, drops it, grabs it again and hauls it up out of sight
  function claw(at) {
    log.push('claw')
    const G = '#b9bcc2', D = '#6b7079', head = [], prong = (s) => { const c = []; for (let y = 0; y < 4; y++) c.push([0, -y, 0, y === 3 ? D : G]); c.push([s, -4, 0, D]); return c }
    for (let x = -1; x <= 1; x++) for (let y = 0; y <= 1; y++) head.push([x, y, 0, D]); head.push([0, 2, 0, '#ffd23f'])
    const hi = at.clone().add(V(0, 60, 0)), H = vox(head, 1, hi.clone()), cable = vox(Array.from({ length: 70 }, (_, i) => [0, i, 0, '#e8e1c9']), 0.3, hi.clone())
    const P = [-1, 1, 0].map((s, i) => { const g = vox(prong(s === 0 ? 1 : s), 1, hi.clone()); g.userData.side = i; return g })
    const ball = ballAt(at.clone().add(V(0, 1, 0)))
    let state = 0
    run((t) => {
      // down (0 to 1), grab (1 to 1.3), up a bit (1.3 to 1.8), drop it (1.8), down again (1.8 to 2.4), grab (2.4 to 2.7), up and away (2.7 to 4)
      const low = at.y + 5.5, hiY = at.y + 60
      let y = t < 1 ? hiY - (hiY - low) * ease(t) : t < 1.3 ? low : t < 1.8 ? low + 6 * ease((t - 1.3) / 0.5) : t < 2.4 ? low + 6 - 6 * ease((t - 1.8) / 0.6) : t < 2.7 ? low : low + (hiY - low + 20) * ease((t - 2.7) / 1.3)
      H.position.set(at.x, y, at.z); cable.position.set(at.x, y + 2, at.z)
      const shut = (t > 1.15 && t < 1.8) || t > 2.55
      P.forEach((p, i) => { p.position.set(at.x, y, at.z); p.rotation.y = (i / 3) * Math.PI * 2; p.rotation.z = shut ? 0.35 : -0.25 })
      if (t > 1.15 && t < 1.8) { hideBall(true); ball.position.set(at.x, y - 4.2, at.z) }
      else if (t >= 1.8 && t < 2.55) { const k = Math.min(1, (t - 1.8) / 0.35); ball.position.y = Math.max(at.y + 1, ball.position.y - 30 * 0.016 * (1 + k * 2)) }
      else if (t >= 2.55) ball.position.set(at.x, y - 4.2, at.z)
      if (state === 0 && t > 1.8) { state = 1; o.sound?.('thud') }
      if (t > 4.1) { kill(H); kill(cable); P.forEach(kill); kill(ball); return false }
      return true
    })
    o.sound?.('chip')
  }
  // THE GHOST OF THE BALL: a see-through ghost of the ball floats up out of it, takes a slow lap round the spot, and drifts off into the sky
  function spirit(at) {
    log.push('spirit')
    const C = []
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 4; y++) for (let z = -2; z <= 2; z++) if (Math.hypot(x, y - 2, z) <= 2.5) C.push([x, y + 2, z, '#f4f2ea'])
    C.push([-1, 5, 3, '#16181b'], [1, 5, 3, '#16181b'], [0, 1, 0, '#e6ecff'], [-1, 0, 0, '#d5ddf5'], [1, -1, 0, '#d5ddf5'], [0, -2, 0, '#d5ddf5'])
    const g = vox(C, 0.9, at.clone())
    g.traverse((c) => { if (c.material) { c.material.transparent = true; c.material.opacity = 0.5; c.material.depthWrite = false } })
    run((t) => {
      const up = ease(t / 0.8), a = t < 0.8 ? 0 : (t - 0.8) * 2.2, r = t < 0.8 ? 0 : Math.min(7, (t - 0.8) * 9)
      g.position.set(at.x + Math.sin(a) * r, at.y + 1 + up * 7 + Math.sin(t * 3) * 0.5 + Math.max(0, t - 3.2) * 25, at.z + Math.cos(a) * r - r)
      const op = t < 3.2 ? 0.5 : Math.max(0, 0.5 * (1 - (t - 3.2) / 1.2)); g.traverse((c) => { if (c.material) c.material.opacity = op })
      if (t > 4.5) { kill(g); return false }
      return true
    })
    o.sound?.('ufo')
  }
  // the seat moments as a deck: shuffled, each played once before any comes round again
  const SEAT_DECK = ['glove', 'gull', 'dog', 'beer', 'mushroom', 'crater', 'ufo', 'hotdog', 'fries', 'bonk', 'pinball', 'pinata', 'tornado', 'mole', 'jack', 'rocket', 'hand', 'hatch', 'zap', 'flush', 'claw', 'spirit']
  const PLAY = { glove: seatsGlove, gull: gullGrab, dog, beer, mushroom: (at) => mushroom(at), crater, ufo, hotdog, fries, bonk, pinball, pinata, tornado, mole, jack, rocket, hand, hatch, zap, flush, claw, spirit }
  let deck = []
  const deal = () => { if (!deck.length) { deck = SEAT_DECK.slice(); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] } } return deck.pop() }
  // a new landing clears the last one's pieces, so two never play on top of each other
  function clear() { gen++; parts.length = 0; for (const g of [...live]) kill(g); hideBall(false) }
  let wall = performance.now() // its own wall clock, steps of up to a quarter second (the engine's step is clamped, which slowed the moments on a slow device)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](dt)) parts.splice(i, 1) })

  return {
    // ev: the engine's landing hook ({ at, key }); landing: where the flight ended (STANDS, SPLASH, STREET), boardAt: the LED board's world position
    land(ev, landing, boardAt) {
      if (!ev?.at) return null
      clear()
      const at = ev.at.clone ? ev.at.clone() : V(...ev.at), ft = window.__dojo?.landFt ?? 0
      const hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key)
      if (ev.key === 'POLE') { pole(at); return 'pole' }
      if (ev.key === 'SPLASH') { if (o.cove?.()) return 'cove'; seal(at); return 'seal' } // (1 Nov, night) the Cove's kayakers have the splash to themselves when they are there (fx25.js)
      if (hr && o.oracle !== false && Math.hypot(at.x - MITT.x, at.z - MITT.z) < MITT.r) { mitt(at); return 'mitt' }
      if (hr && boardAt && at.distanceTo(boardAt) < 32) { o.onBoard?.(); log.push('board'); return 'board' }
      if (hr && ft >= 450 && o.oracle !== false) { mushroom(at, true); return 'nuked' }
      if (hr) { seats(at); return 'seats' } // the stands, or the street and the promenade past them: someone is always there with a glove
      if (ev.key === 'WALL' || ev.key === 'CLOSE') { dust(at); return 'dust' }
      return null
    },
    ready: () => !!M, shown: () => live.size, log: () => [...log], MITT, setBobble(r) { o.bobbleRate = r }, setVariety(v) { o.variety = v },
    // for the tests and the dock: play one of the seat moments at a spot
    try(kind, at) { clear(); PLAY[kind]?.(at) }, deck: () => SEAT_DECK.slice(), clear,
    // for the tests: where each piece up right now sits on screen, and how far it is (along the ground) from the spot it was made for
    boxes() { const c = document.querySelector('canvas').getBoundingClientRect(), cam = api.NN.camera; return [...live].filter((s) => s.userData.at).map((s) => { const v = s.position.clone().project(cam), a = s.userData.at; return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height, on: v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, d: Math.hypot(s.position.x - a.x, s.position.z - a.z), model: !!s.userData.looks?.[0] } }) },
  }
}
