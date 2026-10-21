// Radar overlay for the 3D park: thin, sharp, flat-colour lines laid on the real scene (no glow, nothing physical).
//   range grid   rings every 25 ft (every 100 ft stronger, labelled) and spokes every 15 degrees on the field, clipped at the wall, foul lines heavier
//   wall crest   the top of the wall as a line at its real height, with a tick every 5 degrees, so the clearance question is visible in 3D
//   flight       the path as a vertical curtain from its ground track up to the ball, plumb lines, and 25 ft height ticks under the zenith
//   landing      four corner brackets on the ground (or the stands) where the called ball comes down
//   cloud        120 balls with the spread a prediction really has, as round markers where each comes down
// Colours: slate-cyan lines, bone for the datum and the called ball, amber for the wall. Toggle with the G key or the Radar button.
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'

const FT = 0.3048
const LINE = '#9fc4d0', BONE = '#e8e1c9', AMBER = '#e2823a', CYAN = '#4fd0e0'
const GY = 0.32 // lines sit a hair above the field

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill()
  return new THREE.CanvasTexture(c)
}
export function label(text, color = BONE) {
  const c = document.createElement('canvas'); c.width = 260; c.height = 48
  const g = c.getContext('2d'); g.font = "400 26px 'STM','Share Tech Mono',Consolas,monospace"; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 4, 26)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }))
  s.scale.set(26, 4.8, 1); s.center.set(0, 0.5); s.renderOrder = 30
  return s
}

export function initRadar3D({ NN, state, fly, toWorld, getWall, findLanding }) {
  const { scene } = NN
  const group = new THREE.Group(); group.name = 'radar'
  const dyn = new THREE.Group(); group.add(dyn)
  scene.add(group)
  NN.hideForNormal.push(group) // the ink-outline pass reads normals: keep the overlay out of it
  const mat = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, depthTest: true })
  let on = new URLSearchParams(location.search).get('radar') !== '0'
  let detail = new URLSearchParams(location.search).get('radar') === 'full' // subtle by default; the G key or ?radar=full adds the curtain, labels and cloud
  group.visible = on

  const wallFtAt = (b) => { const W = getWall(), k = Math.min(Math.max(b, -47), 47) + 47, i = Math.floor(k), f = k - i, j = Math.min(i + 1, 94); return W.wall_ft[i] * (1 - f) + W.wall_ft[j] * f }
  const wallHAt = (b) => { const W = getWall(), k = Math.min(Math.max(b, -47), 47) + 47, i = Math.floor(k), f = k - i, j = Math.min(i + 1, 94); return W.height_ft[i] * (1 - f) + W.height_ft[j] * f }
  const at = (rFt, bDeg, h = GY) => { const b = (bDeg * Math.PI) / 180, v = toWorld([rFt * FT * Math.sin(b), rFt * FT * Math.cos(b), 0]); v.y = h; return v }
  const seg = (arr, a, b) => arr.push(a.x, a.y, a.z, b.x, b.y, b.z)
  const thickMats = []
  const fitMats = () => { for (const m of thickMats) m.resolution.set(innerWidth, innerHeight) }
  addEventListener('resize', fitMats)
  const thick = (arr, color, opacity = 1, px = 2.5) => { // real pixel-width strokes (WebGL lines are otherwise 1 px)
    const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: px, transparent: opacity < 1, opacity, depthWrite: false, worldUnits: false })
    m.resolution.set(innerWidth, innerHeight); thickMats.push(m)
    const l = new LineSegments2(new LineSegmentsGeometry().setPositions(arr), m); l.renderOrder = 22; return l
  }
  const lines = (arr, material) => { const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const l = new THREE.LineSegments(g, material); l.renderOrder = 20; return l }

  let built = false
  function buildStatic() {
    if (built || !getWall()) return
    built = true
    const fine = [], strong = [], axis = [], foulL = [], crest = [], ticks = []
    for (let r = 50; r <= 500; r += 50) {
      const arr = r % 100 === 0 ? strong : fine
      for (let b = -46; b < 46; b += 1) {
        if (r > wallFtAt(b) - 4 || r > wallFtAt(b + 1) - 4) continue
        seg(arr, at(r, b), at(r, b + 1))
      }
    }
    for (let b = -45; b <= 45; b += 15) {
      if (b === 0) continue
      const arr = Math.abs(b) === 45 ? foulL : fine
      seg(arr, at(25, b), at(wallFtAt(b) - 4, b))
    }
    for (let b = -46; b < 46; b += 1) {
      seg(crest, at(wallFtAt(b), b, wallHAt(b) * FT), at(wallFtAt(b + 1), b + 1, wallHAt(b + 1) * FT))
      if (b % 15 === 0) seg(ticks, at(wallFtAt(b), b, GY), at(wallFtAt(b), b, wallHAt(b) * FT))
    }
    group.add(lines(fine, mat(LINE, 0.16)), thick(strong, LINE, 0.28, 1.2), thick(foulL, BONE, 0.34, 1.3), thick(crest, AMBER, 0.55, 1.6), lines(ticks, mat(AMBER, 0.3)))
    for (const r of [100, 200, 300, 400]) { const s = label(`${r}`, LINE); s.position.copy(at(r, 1.2, 1.6)); s.userData.detail = true; s.visible = detail; group.add(s) }
  }

  function clearDyn() {
    for (let i = thickMats.length - 1; i >= 0; i--) if (thickMats[i].userData.dyn) thickMats.splice(i, 1)
    for (const c of [...dyn.children]) { dyn.remove(c); c.geometry?.dispose?.(); c.material?.dispose?.() } }
  let timer = 0
  function update(res) {
    buildStatic()
    if (!built) return
    clearDyn()
    const P = res.visPath ?? res.path
    group.children.forEach((c) => { if (c.userData.detail) c.visible = detail })
    if (!detail) { // subtle mode: only the landing marks
      const land0 = (res.landing?.point ?? toWorld(P[P.length - 1].p)).clone(); if (!res.landing) land0.y = GY
      const L0 = [], a0 = 3.4, b0 = 1.5
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L0.push(land0.x + sx * a0, land0.y + 0.1, land0.z + sz * b0, land0.x + sx * a0, land0.y + 0.1, land0.z + sz * a0, land0.x + sx * a0, land0.y + 0.1, land0.z + sz * a0, land0.x + sx * b0, land0.y + 0.1, land0.z + sz * a0)
      dyn.add(thick(L0, CYAN, 0.6, 1.3))
      dyn.children.forEach((c) => { if (c.material?.isLineMaterial) c.material.userData.dyn = true })
      return
    }
    // flight curtain: ground track to the ball, as a see-through sheet with plumb lines
    const pts = P.filter((_, i) => i % 3 === 0)
    const pos = [], idx = []
    pts.forEach((q, i) => { const w = toWorld(q.p), g = w.clone(); g.y = GY; pos.push(w.x, w.y, w.z, g.x, g.y, g.z); if (i) { const a = 2 * (i - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } })
    const sheet = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setIndex(idx),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }))
    sheet.renderOrder = 18; dyn.add(sheet)
    const drop = [], track = []
    pts.forEach((q, i) => { const w = toWorld(q.p), g = w.clone(); g.y = GY; if (i % 3 === 0) seg(drop, w, g); if (i) { const pw = toWorld(pts[i - 1].p); pw.y = GY; seg(track, pw, g) } })
    dyn.add(lines(drop, mat(CYAN, 0.55)), thick(track, BONE, 1, 3))
    // height ticks under the zenith
    let ai = 0; pts.forEach((q, i) => { if (q.p[2] > pts[ai].p[2]) ai = i })
    const top = toWorld(pts[ai].p), ht = []
    for (let h = 25; h <= res.peakFt; h += 25) { const y = h * FT; ht.push(top.x - 2.2, y, top.z, top.x + 2.2, y, top.z) }
    dyn.add(thick(ht, BONE, 1, 2.5))
    // landing brackets
    const land = (res.landing?.point ?? toWorld(P[P.length - 1].p)).clone(); if (!res.landing) land.y = GY
    const L = [], a = 4.2, b = 1.8
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = land.clone(); L.push(c.x + sx * a, c.y + 0.1, c.z + sz * b, c.x + sx * a, c.y + 0.1, c.z + sz * a, c.x + sx * a, c.y + 0.1, c.z + sz * a, c.x + sx * b, c.y + 0.1, c.z + sz * a) }
    dyn.add(thick(L, CYAN, 1, 3.5))
    const rr = res.landFt, bb = res.landB, tag = label(`${Math.round(rr)} FT  ${bb < 0 ? 'L' : 'R'}${Math.abs(Math.round(bb))}`, BONE)
    tag.position.copy(land).add(new THREE.Vector3(5, 3, 0)); dyn.add(tag)
    dyn.children.forEach((c) => { if (c.material?.isLineMaterial) c.material.userData.dyn = true })
    clearTimeout(timer); timer = setTimeout(() => cloud(res), 160)
  }
  function cloud(res) {
    if (!on) return
    const r = mulberry(5), pos = [], col = [], c = new THREE.Color()
    const tally = { hr: 0, play: 0, foul: 0 }
    for (let i = 0; i < 120; i++) {
      const s = { ...state, ev: state.ev + 2 * gauss(r), la: state.la + 3 * gauss(r), dir: state.dir + 8 * gauss(r), temp: state.temp + 4 * gauss(r), wind: state.wind + 4 * gauss(r) }
      const g = fly(s, { floor: -8 }), k = g.verdict.kind
      let p
      if ((k === 'GONE' || k === 'FOUL') && findLanding && NN.stadium) p = findLanding(NN, g.path, toWorld).point
      else p = toWorld(g.path[g.path.length - 1].p)
      tally[k === 'GONE' ? 'hr' : k === 'FOUL' ? 'foul' : 'play']++
      pos.push(p.x, Math.max(p.y, GY) + 0.15, p.z); c.set(k === 'GONE' ? BONE : k === 'FOUL' ? CYAN : LINE); col.push(c.r, c.g, c.b)
    }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, map: dot, alphaTest: 0.5, transparent: true, depthWrite: false }))
    pts.renderOrder = 25; dyn.add(pts)
    window.__radar = { ...tally, n: 120 }
    window.dispatchEvent(new CustomEvent('nn-radar', { detail: window.__radar }))
  }
  const dot = dotTexture()
  function setDetail(v) { detail = v; group.children.forEach((c) => { if (c.userData.detail) c.visible = v }); if (window.__dojo) update(window.__dojo) }
  function set(v) { on = v; group.visible = v; if (v && window.__dojo) update(window.__dojo) }
  addEventListener('keydown', (e) => { if ((e.key === 'g' || e.key === 'G') && e.target.tagName !== 'INPUT') { if (!on) set(true); else if (!detail) setDetail(true); else { setDetail(false); set(false) } } })
  return { update, set, setDetail, toggle: () => set(!on), isOn: () => on }
}
