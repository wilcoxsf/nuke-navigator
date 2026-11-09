// Study 25 foul poles in voxels (1 Nov, Andrew: "The foul poles are basically unseeable right now - could we make them white and/or orange and/or yellow?").
// Both poles stand over the model's own, from the field to the model's pole tops (wind25.js measured them; the windsocks' masts go on up from there), a
// column of cubes with the screen (the mesh fin) down its fair side from the top of the wall to near the top, as real poles have, its cubes in a lattice.
// FP picks the paint: 1 GIANTS ORANGE   2 FOUL-POLE YELLOW   3 WHITE   4 ORANGE AND WHITE (an orange pole, a white screen).
// During HERON the right pole is happen25.js's own bending one: hideRight(true), or o.hideRight, a getter checked each frame.
import { ORANGE } from './orange25.js'
const POLES = [[-73.89, 74.51, 26.2], [66.32, 67.36, 33.2]] // field frame, metres: x to right field, y to center, z up (wind25.js)
export const POLE_LOOKS = [
  { c: 1, name: 'ORANGE', get pole() { return ORANGE.o }, get screen() { return ORANGE.o } },
  { c: 2, name: 'FOUL-POLE YELLOW', pole: '#ffd23f', screen: '#ffd23f' },
  { c: 3, name: 'WHITE', pole: '#f4f2ea', screen: '#f4f2ea' },
  { c: 4, name: 'ORANGE AND WHITE', get pole() { return ORANGE.o }, screen: '#f4f2ea' },
]
export function initPoles25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp?.toWorld ?? api.toWorld, cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D(), g = new THREE.Group()
  const POLE = 1.0, SCR = 0.42, WIDE = 5 // the pole's cubes (fatter than a real pole, to read at the default camera); the screen's cubes, five across (2.1 m)
  const parts = POLES.map(([x, y, top]) => {
    const pg = new THREE.Group(), bear = (Math.atan2(x, y) * 180) / Math.PI, wallH = ((window.__cp?.wallAt?.(bear) ?? api.wallAt?.(bear) ?? [330, 8])[1]) * 0.3048
    // the fair side: square to the foul line, toward center field
    const len = Math.hypot(x, y), fx = -Math.sign(x) * (y / len), fy = Math.sign(x) * (x / len)
    const n = Math.round(top / POLE), pm = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ flatShading: true }), n)
    for (let i = 0; i < n; i++) { d.position.copy(toWorld([x, y, (i + 0.5) * (top / n)])); d.scale.set(POLE, (top / n) * 0.94, POLE); d.updateMatrix(); pm.setMatrixAt(i, d.matrix) }
    pm.frustumCulled = false; pg.add(pm)
    // the screen: a lattice (every other cube, offset row by row) from just above the wall to 1.5 m under the top
    const z0 = wallH + 0.6, z1 = top - 1.5, rows = Math.max(2, Math.round((z1 - z0) / SCR)), cells = []
    for (let r = 0; r < rows; r++) for (let k = 0; k < WIDE; k++) {
      const edge = k === WIDE - 1 || r === 0 || r === rows - 1
      if (!edge && (r + k) % 2) continue
      const off = POLE / 2 + (k + 0.5) * SCR
      cells.push(toWorld([x + fx * off, y + fy * off, z0 + (r + 0.5) * ((z1 - z0) / rows)]))
    }
    const sm = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ flatShading: true }), cells.length)
    cells.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(SCR * 0.92); d.updateMatrix(); sm.setMatrixAt(i, d.matrix) })
    sm.frustumCulled = false; pg.add(sm)
    g.add(pg)
    return { pg, pm, sm, right: x > 0, top: toWorld([x, y, top]), foot: toWorld([x, y, 0]) }
  })
  scene.add(g)
  let look = 1, hid = false
  function setLook(n) {
    const L = POLE_LOOKS.find((l) => l.c === n) ?? POLE_LOOKS[0]
    look = L.c
    for (const p of parts) { p.pm.material.color.set(L.pole); p.sm.material.color.set(L.screen) }
  }
  setLook(o.look ?? 1)
  const hideRight = (v) => { hid = !!v; for (const p of parts) if (p.right) p.pg.visible = !hid }
  // THE POLE RINGS (9 Nov, razzle-dazzle 4, Andrew: yes to "the pole rings like a bell"): a ball off the pole sets the real pole shivering like a struck tuning
  // fork (more toward the top, dying away), its cubes flash, and three rings of cubes spread out from where it was hit, like the sound going out across the park
  const base = new Map() // each mesh's resting matrices, taken the first time it rings
  const keep = (im) => { if (!base.has(im)) { const a = []; for (let i = 0; i < im.count; i++) { const m = new THREE.Matrix4(); im.getMatrixAt(i, m); a.push(m) } base.set(im, a) } return base.get(im) }
  let ringing = null
  function ring(at) {
    if (!g.visible) return false
    const p = parts.reduce((a, b) => (at && a.foot.distanceTo(at) > b.foot.distanceTo(at) ? b : a))
    if (!p.pg.visible) return false
    if (ringing) stop()
    const foot = p.foot, topY = p.top.y, hitY = Math.min(topY - 1, Math.max(foot.y + 3, at?.y ?? foot.y + 10))
    const N = 26, halo = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ color: '#f4f2ea', flatShading: true, fog: false }), N * 3)
    halo.frustumCulled = false; g.add(halo)
    ringing = { p, t0: performance.now(), foot, topY, hitY, halo, N, mats: [p.pm.material, p.sm.material] }
    return true
  }
  function stop() {
    if (!ringing) return
    for (const im of [ringing.p.pm, ringing.p.sm]) { const a = keep(im); a.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true }
    for (const m of ringing.mats) m.emissive?.setRGB(0, 0, 0)
    g.remove(ringing.halo); ringing.halo.geometry !== cube && ringing.halo.geometry.dispose(); ringing.halo.material.dispose()
    ringing = null
  }
  const m4 = new THREE.Matrix4(), sv = new THREE.Vector3(), tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3()
  api.NN.frames.push(() => {
    if (!ringing) return
    const R = ringing, t = (performance.now() - R.t0) / 1000
    if (t > 2.4) { stop(); return }
    sv.set(1, 0, 0).applyQuaternion(api.NN.camera.quaternion); sv.y = 0; sv.normalize()
    const a = Math.sin(t * 34) * Math.exp(-2.2 * t) * 0.9, h = R.topY - R.foot.y
    for (const im of [R.p.pm, R.p.sm]) {
      const A = keep(im)
      A.forEach((m, i) => { m.decompose(tp, tq, ts); const f = Math.max(0, (tp.y - R.foot.y) / h); tp.addScaledVector(sv, a * f * f); m4.compose(tp, tq, ts); im.setMatrixAt(i, m4) })
      im.instanceMatrix.needsUpdate = true
    }
    const fl = Math.max(0, 1 - t / 0.5)
    for (const m of R.mats) m.emissive?.setRGB(fl * 0.8, fl * 0.8, fl * 0.7)
    let k = 0
    for (let w = 0; w < 3; w++) {
      const u = (t - w * 0.22) / 1.1
      for (let j = 0; j < R.N; j++) {
        if (u <= 0 || u >= 1) { m4.makeScale(0, 0, 0); R.halo.setMatrixAt(k++, m4); continue }
        const r = 0.8 + u * 7, an = (j / R.N) * Math.PI * 2, s = 0.45 * (1 - u)
        m4.makeScale(s, s, s).setPosition(R.foot.x + Math.cos(an) * r, R.hitY + Math.sin(an * 2 + t * 6) * 0.15, R.foot.z + Math.sin(an) * r); R.halo.setMatrixAt(k++, m4)
      }
    }
    R.halo.count = k; R.halo.instanceMatrix.needsUpdate = true
  })
  if (o.hideRight) api.NN.frames.push(() => { const v = !!o.hideRight(); if (v !== hid) hideRight(v) })
  return {
    setLook(n) { if (n !== look) setLook(n) }, look: () => look, group: g, hideRight, ring, ringing: () => !!ringing,
    // for the tests: each pole's foot and top in the world, and whether it shows
    poles: () => parts.map((p) => ({ right: p.right, top: p.top.clone(), foot: p.foot.clone(), shown: g.visible && p.pg.visible, screen: p.sm.count })),
  }
}
