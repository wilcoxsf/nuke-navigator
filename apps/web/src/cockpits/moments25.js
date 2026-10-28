// Study 25 landing moments (F1, 28 Oct; they replace the fireworks, which nobody could see from the broadcast camera): something happens where the ball comes down.
//   seats: a glove pops up out of the crowd and makes the catch; about one in four bobbles it and a second glove grabs it
//   McCovey Cove: a sea lion surfaces and snaps the ball (the ripples and the kayak race are fx25's)
//   MITT SHOT: a ball that comes down by the giant four-finger glove behind left-center (placed from the park model's height map, next to the Coke bottle)
//   the scoreboard: the board glitches and its pixels fall off        off the wall: a puff of dust, and the ball drops onto the warning track
//   off the foul pole: the pole shivers like a tuning fork, with a ring
// Everything is flat pixel sprites (so it reads at 400 ft) or a thin line, in the theme's colors; nothing glows and nothing shakes the screen.
export function initMoments25(api, col, fx, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const parts = [], live = new Set()
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  // a pixel sprite from rows of characters (n brown, y gold, w bone, g grey, d dark, o accent)
  const PAL = { n: '#c8894a', y: '#f2bc40', w: '#efe9dc', g: '#c3c7cf', d: '#4a4f58', b: '#5fd3ff' }
  const texCache = new Map()
  // each sprite gets a one-pixel near-black outline so it separates from the busy wireframe behind it
  function pixTex(rows) {
    const k = rows.join('|'); if (texCache.has(k)) return texCache.get(k)
    const W = rows[0].length + 2, H = rows.length + 2, c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d'), full = (x, y) => rows[y - 1]?.[x - 1] && rows[y - 1][x - 1] !== '.'
    g.fillStyle = '#050505'
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!full(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => full(x + a, y + b))) g.fillRect(x, y, 1, 1)
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = ch === 'o' ? col().acc : PAL[ch] ?? '#fff'; g.fillRect(x + 1, y + 1, 1, 1) }))
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace
    texCache.set(k, t); return t
  }
  function sprite(rows, h, pos) {
    const t = pixTex(rows), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, fog: false }))
    s.scale.set((h * (rows[0].length + 2)) / (rows.length + 2), h, 1); s.position.copy(pos); s.renderOrder = 20; s.userData.at = pos.clone(); scene.add(s); live.add(s)
    return s
  }
  const kill = (s) => { scene.remove(s); s.material.dispose(); live.delete(s) }
  const setRows = (s, rows) => { s.material.map = pixTex(rows); s.material.needsUpdate = true }
  const GLOVE = {
    open: ['.nn.nn.nn.nn..', '.nn.nn.nn.nn..', '.nn.nn.nn.nn..', '.nnnnnnnnnnn..', '.nnnnnnnnnnn.n', '.nnyyyyyyynnnn', '.nnyyyyyyynnn.', '.nnnnnnnnnnn..', '..nnnnnnnnn...', '...nnnnnnn....', '....wwwww.....', '....wwwww.....'],
    shut: ['..............', '..............', '..nnnnnnnn....', '.nnnnnnnnnnn..', '.nnnwwwnnnnnnn', '.nnwwwwwnnnnn.', '.nnnwwwnnnnn..', '.nnnnnnnnnnn..', '..nnnnnnnnn...', '...nnnnnnn....', '....wwwww.....', '....wwwww.....'],
  }
  const SEAL = {
    shut: ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'gggggggggggg..', 'gggggggggggg..', '.ggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
    open: ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'ggggggggggggg.', '......gggggg..', 'gggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
  }
  const BALL = ['.ww.', 'wwww', 'wwww', '.ww.']
  const hideBall = (v) => { const b = api.ballMesh?.(); if (b) b.visible = !v }
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  const run = (fn) => { let t = 0; parts.push((dt) => fn((t += dt))) }
  const log = []

  // a glove rises from the seats under the ball and closes on it (second: the one that grabs a bobble)
  function glove(at, H = 11, onShut = null, bobble = false) {
    const s = sprite(GLOVE.open, H, at.clone().add(V(0, -H, 0)))
    let shut = false
    run((t) => {
      const up = ease(t / 0.35) - ease((t - 2.6) / 0.5)
      s.position.y = at.y - H + up * (H * 1.25)
      if (!shut && t > 0.38) { shut = true; if (!bobble) { setRows(s, GLOVE.shut); hideBall(true); onShut?.() } }
      if (bobble && t > 0.38 && t < 0.62) setRows(s, t % 0.1 < 0.05 ? GLOVE.open : GLOVE.shut)
      if (t > 3.2) { kill(s); return false }
      return true
    })
    return s
  }
  function seats(at) {
    if (Math.random() < (o.bobbleRate ?? 0.25)) {
      log.push('bobble'); glove(at, 11, null, true); hideBall(true)
      const side = V(Math.random() < 0.5 ? -1 : 1, 0, 0).applyQuaternion(api.NN.camera.quaternion).multiplyScalar(10), b = sprite(BALL, 2.4, at.clone())
      run((t) => { const k = Math.min(1, Math.max(0, (t - 0.45) / 0.7)); b.position.copy(at).addScaledVector(side, k).add(V(0, 6 + 5 * 4 * k * (1 - k), 0)); if (k >= 1) { kill(b); glove(at.clone().add(side), 11); return false } return true })
      o.sound?.('thud')
    } else { log.push('glove'); glove(at, 11, () => o.sound?.('pop')) }
  }
  function seal(at) {
    log.push('seal')
    const s = sprite(SEAL.shut, 16, at.clone().add(V(3, -16, 0)))
    let snapped = false
    run((t) => {
      const up = ease(t / 0.9) - ease((t - 2.6) / 0.7)
      s.position.y = at.y - 10 + up * 16
      if (t > 0.9 && t < 1.3) setRows(s, SEAL.open)
      else if (!snapped && t >= 1.3) { snapped = true; setRows(s, SEAL.shut); hideBall(true); o.sound?.('pop') }
      if (t > 3.4) { kill(s); return false }
      return true
    })
  }
  // the giant mitt behind left-center: world x, z of its middle (estimated from the model's height map) and how near counts
  const MITT = { x: -51, z: -146, r: 11 }
  function mitt(at) {
    log.push('mitt')
    const c = V(MITT.x, at.y, MITT.z), s = sprite(GLOVE.open, 16, c.clone().add(V(0, 9, 0)))
    o.banner?.('MITT SHOT', 'INTO THE GIANT GLOVE')
    o.sound?.('fanfare')
    run((t) => { if (t > 0.5) { setRows(s, GLOVE.shut); hideBall(true) } if (t > 3.6) { kill(s); return false } return true })
  }
  function dust(at) {
    log.push('dust')
    const ground = toWorld([0, 0, 0]).y
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2; fx.particle(i % 3 ? '#8a8f99' : '#c9b79a', at, V(Math.cos(a) * 3, 1 + Math.random() * 3, Math.sin(a) * 3), 1.2 + Math.random() * 0.6, 1.4, 1.5, 1.2) }
    hideBall(true)
    const b = sprite(BALL, 2.4, at.clone())
    run((t) => { const k = Math.min(1, t / 0.6); b.position.y = at.y + (ground + 0.8 - at.y) * k * k; if (k >= 1) { const u = Math.min(1, (t - 0.6) / 0.5); b.position.y = ground + 0.8 + 2.5 * 4 * u * (1 - u) } if (t > 2.6) { kill(b); return false } return true })
    o.sound?.('thud')
  }
  function pole(at) {
    log.push('pole')
    const left = at.x < 0, w = window.__cp.wallAt?.(left ? -45 : 45) ?? [335, 8], r = w[0] * 0.3048, b = ((left ? -45 : 45) * Math.PI) / 180
    const base = toWorld([r * Math.sin(b), r * Math.cos(b), 0]), top = toWorld([r * Math.sin(b), r * Math.cos(b), 26])
    const geo = new THREE.BufferGeometry().setFromPoints([base, top]), ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col().acc, depthTest: false, depthWrite: false, fog: false }))
    ln.renderOrder = 20; scene.add(ln); live.add(ln); window.__nn?.hideForNormal.push(ln)
    const side = V(1, 0, 0).applyQuaternion(api.NN.camera.quaternion)
    o.sound?.('ring')
    run((t) => { const a = Math.sin(t * 34) * Math.exp(-2.2 * t) * 1.6, p = geo.attributes.position; p.setXYZ(1, top.x + side.x * a, top.y, top.z + side.z * a); p.needsUpdate = true; if (t > 2) { scene.remove(ln); geo.dispose(); live.delete(ln); return false } return true })
  }
  api.NN.frames.push((dt) => { for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](Math.min(dt, 0.1))) parts.splice(i, 1) })

  return {
    // ev: the engine's landing hook ({ at, key }); landing: where the flight ended (STANDS, SPLASH, STREET), boardAt: the LED board's world position
    land(ev, landing, boardAt) {
      if (!ev?.at) return null
      const at = ev.at.clone ? ev.at.clone() : V(...ev.at)
      const hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key)
      if (ev.key === 'POLE') { pole(at); return 'pole' }
      if (ev.key === 'SPLASH') { seal(at); return 'seal' }
      if (hr && Math.hypot(at.x - MITT.x, at.z - MITT.z) < MITT.r) { mitt(at); return 'mitt' }
      if (hr && boardAt && at.distanceTo(boardAt) < 32) { o.onBoard?.(); log.push('board'); return 'board' }
      if (hr) { seats(at); return 'seats' } // the stands, or the street and the promenade past them: someone is always there with a glove
      if (ev.key === 'WALL' || ev.key === 'CLOSE') { dust(at); return 'dust' }
      return null
    },
    shown: () => live.size, log: () => [...log], MITT, setBobble(r) { o.bobbleRate = r },
    // for the tests: where each sprite up right now sits on screen, and how far it is (along the ground) from the spot it was made for
    boxes() { const c = document.querySelector('canvas').getBoundingClientRect(), cam = api.NN.camera; return [...live].filter((s) => s.isSprite).map((s) => { const v = s.position.clone().project(cam), a = s.userData.at; return { x: c.left + ((v.x + 1) / 2) * c.width, y: c.top + ((1 - v.y) / 2) * c.height, on: v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, d: Math.hypot(s.position.x - a.x, s.position.z - a.z) } }) },
  }
}
