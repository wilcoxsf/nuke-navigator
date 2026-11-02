// Study 25 foul poles in voxels (1 Nov, Andrew: "The foul poles are basically unseeable right now - could we make them white and/or orange and/or yellow?").
// Both poles stand over the model's own, from the field to the model's pole tops (wind25.js measured them; the windsocks' masts go on up from there), a
// column of cubes with the screen (the mesh fin) down its fair side from the top of the wall to near the top, as real poles have, its cubes in a lattice.
// FP picks the paint: 1 GIANTS ORANGE   2 FOUL-POLE YELLOW   3 WHITE   4 ORANGE AND WHITE (an orange pole, a white screen).
// During HERON the right pole is happen25.js's own bending one: hideRight(true), or o.hideRight, a getter checked each frame.
const POLES = [[-73.89, 74.51, 26.2], [66.32, 67.36, 33.2]] // field frame, metres: x to right field, y to center, z up (wind25.js)
export const POLE_LOOKS = [
  { c: 1, name: 'GIANTS ORANGE', pole: '#fd5a1e', screen: '#fd5a1e' },
  { c: 2, name: 'FOUL-POLE YELLOW', pole: '#ffd23f', screen: '#ffd23f' },
  { c: 3, name: 'WHITE', pole: '#f4f2ea', screen: '#f4f2ea' },
  { c: 4, name: 'ORANGE AND WHITE', pole: '#fd5a1e', screen: '#f4f2ea' },
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
  if (o.hideRight) api.NN.frames.push(() => { const v = !!o.hideRight(); if (v !== hid) hideRight(v) })
  return {
    setLook(n) { if (n !== look) setLook(n) }, look: () => look, group: g, hideRight,
    // for the tests: each pole's foot and top in the world, and whether it shows
    poles: () => parts.map((p) => ({ right: p.right, top: p.top.clone(), foot: p.foot.clone(), shown: g.visible && p.pg.visible, screen: p.sm.count })),
  }
}
