// Study 25 bay water (B, 28 Oct, Andrew: "a really subtle bay animation in the back for water undulating"): faint arcs over McCovey Cove and the bay beyond right
// field (bearings 25 to 95 degrees, 130 to 420 m out), drawn as thin lines at the water's level, dark blue, brightening a little where the motion is.
//   B1 SWELL: the arcs rise and fall about 0.6 m on a 9 s cycle, lighter on the crests   B2 SHIMMER: still, a few short pieces brighten and fade
//   B3 SHORE LINES: three faint bands roll in toward the ballpark and fade at the seawall   B4 WAKES: still, and now and then a faint V crosses the Cove   B0 STILL
// Still under prefers-reduced-motion. The stadium hides what is behind it, so most of it shows past the right-field arcade.
export function initWater25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  // the water's level, from where real splash flights come down
  let water = 0
  { const ys = []; for (const dir of [18, 26, 34]) { const res = api.fly({ ...api.state, ev: 118, la: 27, dir, hand: -1, wind: 0, carry: 1, dws: 0, temp: 70 }, {}); const L = window.__cp.findLanding?.(res.path); if (L?.kind === 'SPLASH') ys.push(L.point.y) } water = Math.max(ys.length ? Math.min(...ys) : -0.3, toWorld([0, 0, 0]).y) + 0.35 } // just above the model's ground, which runs out over the water
  const B0 = 25, B1 = 95, R0 = 130, R1 = 420, DR = 14, DB = 2
  const arcs = []
  for (let r = R0; r <= R1; r += DR) arcs.push(r)
  const nb = Math.round((B1 - B0) / DB), segs = arcs.length * nb
  const pos = new Float32Array(segs * 6), colr = new Float32Array(segs * 6), meta = []
  const P = (r, b) => { const br = (b * Math.PI) / 180, w = toWorld([r * Math.sin(br), r * Math.cos(br), 0]); return [w.x, w.z] }
  let i = 0
  for (const r of arcs) for (let k = 0; k < nb; k++) {
    const b0 = B0 + k * DB, b1 = b0 + DB, [x0, z0] = P(r, b0), [x1, z1] = P(r, b1)
    pos.set([x0, water, z0, x1, water, z1], i * 6); meta.push({ r, b: b0 + DB / 2, x: (x0 + x1) / 2, z: (z0 + z1) / 2, h: ((r * 131 + k * 71) % 97) / 97 }); i++
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3))
  // no depth write and no normal pass: the post shader inks every depth or normal edge, which would paint a 1-pixel line black
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, fog: false, depthWrite: false })
  const lines = new THREE.LineSegments(geo, mat); lines.renderOrder = -1; scene.add(lines); window.__nn?.hideForNormal.push(lines)
  // a dark filled surface under the arcs: it gives them depth to sit on (over empty sky the post shader paints the background over anything that writes none)
  const seaPts = [], seaIdx = [], NB = 36, rIn = R0 - 6, rOut = R1 + 6
  for (let k = 0; k <= NB; k++) { const b = B0 - 2 + (k / NB) * (B1 - B0 + 4); for (const r of [rIn, rOut]) { const [x, z] = P(r, b); seaPts.push(x, water - 0.05, z) } }
  for (let k = 0; k < NB; k++) { const a = 2 * k; seaIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const seaGeo = new THREE.BufferGeometry(); seaGeo.setAttribute('position', new THREE.Float32BufferAttribute(seaPts, 3)); seaGeo.setIndex(seaIdx)
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshBasicMaterial({ color: '#050d12', fog: false, side: THREE.DoubleSide }))
  sea.renderOrder = -2; scene.add(sea); window.__nn?.hideForNormal.push(sea) // drawn before the arcs, which write no depth
  const BLUE = new THREE.Color('#5fd3ff'), BASE = 0.1, HI = 0.42
  const still = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let mode = o.mode ?? 1, t = 0, cost = [], boat = null
  const setC = (j, v) => { const c = BLUE; for (const q of [0, 3]) { colr[j * 6 + q] = c.r * v; colr[j * 6 + q + 1] = c.g * v; colr[j * 6 + q + 2] = c.b * v } }
  const setY = (j, y0, y1) => { pos[j * 6 + 1] = y0; pos[j * 6 + 4] = y1 }
  function update(dt) {
    const s0 = performance.now()
    t += dt
    const m = still ? 0 : mode
    for (let j = 0; j < segs; j++) {
      // the sector fades out toward its sides and its far edge, so it has no hard border
      const q = meta[j], fadeOut = Math.min(1, (q.b - B0) / 12, (B1 - q.b) / 12) * (1 - Math.max(0, (q.r - 300) / 140))
      let v = BASE, y = water
      if (m === 1) { const ph = (2 * Math.PI * q.r) / 60 - (2 * Math.PI * t) / 9, s = Math.sin(ph); y = water + 0.6 * s; v = BASE + (HI - BASE) * 0.35 * Math.max(0, s) }
      else if (m === 2) { const u = (t / 1.6 + q.h * 11) % 6; v = u < 1 ? BASE + (HI - BASE) * Math.sin(u * Math.PI) : BASE }
      else if (m === 3) { for (let k = 0; k < 3; k++) { const band = R1 - (((t * 9) + k * 95) % (R1 - R0)), d = Math.abs(q.r - band); if (d < DR) v = Math.max(v, BASE + (HI - BASE) * (1 - d / DR) * Math.min(1, (band - R0) / 40)) } }
      else if (m === 4 && boat) { const dx = q.x - boat.x, dz = q.z - boat.z, along = -(dx * boat.ux + dz * boat.uz), side = Math.abs(dx * -boat.uz + dz * boat.ux); if (along > 0 && along < 70 && Math.abs(side - along * 0.36) < 3.5) v = BASE + (HI - BASE) * 0.8 * (1 - along / 70) }
      setY(j, y, y); setC(j, v * fadeOut)
    }
    if (m === 4) { // a boat (unseen) crosses the Cove on a long arc every 20 s, leaving its V
      const cyc = t % 20
      if (cyc < 14) { const b = B1 - (cyc / 14) * (B1 - B0), b2 = b - 0.5, [x, z] = P(240, b), [x2, z2] = P(240, b2), L = Math.hypot(x2 - x, z2 - z); boat = { x, z, ux: (x2 - x) / L, uz: (z2 - z) / L } } else boat = null
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true
    cost.push(performance.now() - s0); if (cost.length > 120) cost.shift()
  }
  update(0)
  api.NN.frames.push((dt) => { if (lines.visible) update(Math.min(dt, 0.1)) })
  return {
    setMode(v) { mode = v; lines.visible = true; update(0) }, sea, mode: () => (still ? 0 : mode), lines, water: () => water, segs,
    // for the tests: the average time one water update takes (ms), and how bright the brightest piece is right now
    cost: () => cost.reduce((a, b) => a + b, 0) / Math.max(1, cost.length), peak: () => { let m = 0; for (let j = 0; j < colr.length; j += 3) m = Math.max(m, colr[j + 2]); return m },
  }
}
