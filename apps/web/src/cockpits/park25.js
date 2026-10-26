// Study 25 park life (Oracle only): the scoreboard behind center field becomes a live LED board (a scrolling idle line, TRACKING during the flight, then the
// distance; HOME RUN and SPLASH flash), and pixel seagulls circle the outfield the way they gather late at Oracle, scattering when a ball leaves the park.
export function initPark25(api, col, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const at = (bear, r, h) => { const b = (bear * Math.PI) / 180; return toWorld([r * Math.sin(b), r * Math.cos(b), h]) }
  const parts = []

  // ---- the LED board: text drawn at 8 px in Press Start 2P on a small grid, each lit pixel drawn as a round bulb ----
  const GW = 66, GH = 12, S = 10
  const grid = document.createElement('canvas'); grid.width = GW; grid.height = GH
  const gx = grid.getContext('2d', { willReadFrequently: true })
  const out = document.createElement('canvas'); out.width = GW * S; out.height = GH * S
  const ox = out.getContext('2d')
  const tex = new THREE.CanvasTexture(out); tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace
  const board = new THREE.Mesh(new THREE.PlaneGeometry(46, 8.4), new THREE.MeshBasicMaterial({ map: tex, fog: false, side: THREE.DoubleSide }))
  const bearing = o.boardBearing ?? 0
  board.position.copy(at(bearing, o.boardR ?? 141, o.boardH ?? 27))
  board.lookAt(at(bearing, 0, o.boardH ?? 27))
  scene.add(board)
  let lines = ['NUKE NAVIGATOR', ''], color = null, flash = 0, scroll = 0, marquee = true, flip = 0
  const ready = document.fonts?.load?.('8px PS2P').catch(() => {}) ?? Promise.resolve()
  function paint() {
    const c = col()
    gx.clearRect(0, 0, GW, GH)
    gx.fillStyle = '#fff'; gx.font = '8px PS2P'; gx.textBaseline = 'top'
    const line = lines[1] && Math.floor(flip / 1.6) % 2 ? lines[1] : lines[0], w = gx.measureText(line).width
    if (marquee || w > GW - 2) { const x = GW - (scroll % (w + 24 + GW)); gx.fillText(line, x, 2) } else { gx.textAlign = 'center'; gx.fillText(line, GW / 2, 2); gx.textAlign = 'left' }
    const px = gx.getImageData(0, 0, GW, GH).data
    ox.fillStyle = '#050505'; ox.fillRect(0, 0, out.width, out.height)
    const on = flash > 0 && Math.floor(flash * 6) % 2 ? c.tx : color ?? c.acc
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const lit = px[(y * GW + x) * 4 + 3] > 110
      ox.fillStyle = lit ? on : '#1a1a1a'
      ox.beginPath(); ox.arc(x * S + S / 2, y * S + S / 2, S * (lit ? 0.42 : 0.3), 0, Math.PI * 2); ox.fill()
    }
    tex.needsUpdate = true
  }
  ready.then(paint)
  let acc = 0
  parts.push((dt) => {
    acc += dt
    if (flash > 0) flash = Math.max(0, flash - dt)
    flip += dt
    if (acc < 0.09) return true
    acc = 0
    scroll += 1
    paint()
    return true
  })
  const show = (a, b = '', c = null, fl = 0) => { lines = [a, b]; color = c; flash = fl; marquee = false; flip = 0; scroll = 0; paint() }
  const idle = (text) => { lines = [text ?? 'NUKE NAVIGATOR  ·  ORACLE PARK', '']; color = null; flash = 0; marquee = true; scroll = 0 }

  // ---- seagulls: wing chevrons that flap, circling the outfield; a home run scatters them and they drift back ----
  const gulls = []
  const gGeo = () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3))
  for (let i = 0; i < (o.gulls ?? 10); i++) {
    const m = new THREE.LineSegments(gGeo(), new THREE.LineBasicMaterial({ color: col().tx, fog: false }))
    scene.add(m)
    const g = { m, c: at(Math.random() * 70 - 35, 80 + Math.random() * 60, 0), r: 14 + Math.random() * 22, h: 32 + Math.random() * 26, a: Math.random() * Math.PI * 2, w: (0.25 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6, out: 0, v: null }
    m.position.set(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
    gulls.push(g)
  }
  let t = 0
  parts.push((dt) => {
    t += dt
    for (const g of gulls) {
      g.a += g.w * dt
      const home = new THREE.Vector3(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
      if (g.out > 0) { g.out -= dt; g.m.position.addScaledVector(g.v, dt); g.v.y += 1.5 * dt }
      else g.m.position.lerp(home, Math.min(1, dt * 0.8))
      const flap = Math.sin(t * (g.out > 0 ? 16 : 7) + g.ph) * 1.1, s = 2.6
      const p = g.m.geometry.attributes.position
      // left tip, body, body, right tip (the chevron points along the flight direction)
      const dir = g.out > 0 ? Math.atan2(g.v.z, g.v.x) : g.a + Math.sign(g.w) * Math.PI / 2
      const fx = Math.cos(dir), fz = Math.sin(dir), sx = -fz, sz = fx
      p.setXYZ(0, -sx * s - fx * 0.9, flap, -sz * s - fz * 0.9); p.setXYZ(1, 0, 0, 0); p.setXYZ(2, 0, 0, 0); p.setXYZ(3, sx * s - fx * 0.9, flap, sz * s - fz * 0.9)
      p.needsUpdate = true
    }
    return true
  })
  function scatter() { for (const g of gulls) { g.out = 5 + Math.random() * 3; const a = Math.random() * Math.PI * 2; g.v = new THREE.Vector3(Math.cos(a) * 14, 9 + Math.random() * 8, Math.sin(a) * 14) } }

  api.NN.frames.push((dt) => { for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](Math.min(dt, 0.1))) parts.splice(i, 1) })
  return {
    show, idle, scatter,
    text: () => lines.join(' / '), gulls: () => gulls.length, scattered: () => gulls.filter((g) => g.out > 0).length,
    set visible(v) { board.visible = v; for (const g of gulls) g.m.visible = v },
    board,
  }
}
