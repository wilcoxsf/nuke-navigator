// Study 25 SEAT SEANCE ghost (29 Oct, later, Andrew: "Seat seance should have a fun ghost voxel coming out of the seats"). When the seance calls a seat, a voxel ghost
// rises out of it and floats over the seance's cloud: a white sheet with a domed head, black eyes and an O of a mouth, little arms that wave, a hem that ripples; it bobs and sways over the seat until
// the seance closes or calls another seat. Cubes of 0.45 m, about six metres tall (any smaller and it hid among the cloud's columns), turned to face home plate.
export function initGhost25(api, o = {}) {
  const { THREE, scene } = api.NN
  const V = 0.45, W = 11, Hh = 13, cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D()
  const sheet = [], ink = [], hem = [], arms = []
  // the silhouette, row 0 at the top: a dome to row 5, straight sides below, the hem's points along the bottom
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = i - (W - 1) / 2, y = Hh - 1 - j
    const inHead = j <= 5 ? x * x + (j - 5) * (j - 5) * 1.1 <= 27 : Math.abs(x) <= 5
    if (!inHead) continue
    const depth = Math.max(1, Math.round(3.4 * Math.sqrt(Math.max(0, 1 - (x / 5.6) ** 2)))) // rounder in the middle
    const eye = j >= 3 && j <= 4 && (x === -2 || x === -1 || x === 2 || x === 1) && !(x === -1 && j === 3) && !(x === 1 && j === 3)
    const mouth = j >= 6 && j <= 8 && Math.abs(x) <= 1 && !(j !== 7 && Math.abs(x) === 1)
    for (let k = -depth; k <= depth; k++) {
      const p = [x * V, y * V, k * V]
      if ((eye || mouth) && k === depth) ink.push([x * V, y * V, (depth + 0.4) * V])
      if (j === Hh - 1) hem.push({ p, ph: i * 0.9 })
      else sheet.push(p)
    }
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) arms.push({ s, p: [s * (5.5 + k) * V, (Hh - 7 + k * 0.6) * V, 0] })
  const mk = (list, mat) => { const m = new THREE.InstancedMesh(cube, mat, list.length); list.forEach((p, i) => { d.position.set(...p); d.scale.setScalar(V); d.updateMatrix(); m.setMatrixAt(i, d.matrix) }); return m }
  const white = new THREE.MeshLambertMaterial({ color: '#eef3ff', flatShading: true, transparent: true, opacity: 0.9, emissive: '#5a6488' })
  const g = new THREE.Group(), body = new THREE.Group()
  body.add(mk(sheet, white)); body.add(mk(ink, new THREE.MeshBasicMaterial({ color: '#0a0a0a' })))
  const hemM = mk(hem.map((h) => h.p), white), armM = mk(arms.map((a) => a.p), white)
  body.add(hemM, armM); g.add(body); g.visible = false; scene.add(g)
  let at = null, t = 0, wall = performance.now()
  const home = window.__cp.toWorld([0, 0, 0])
  function show(p) {
    at = p.clone(); t = 0; g.visible = true
    g.position.copy(at); g.rotation.y = Math.atan2(home.x - at.x, home.z - at.z)
  }
  api.NN.frames.push(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now
    if (!g.visible) return
    t += dt
    const rise = Math.min(1, t / 1.6), e = 1 - (1 - rise) ** 3, bob = o.still ? 0 : Math.sin(t * 2.2) * 0.3
    body.position.y = -4 + e * 10 + bob
    body.scale.set(0.6 + 0.4 * e, 0.4 + 0.6 * e, 0.6 + 0.4 * e)
    body.rotation.z = o.still ? 0 : Math.sin(t * 1.3) * 0.08
    if (!o.still) {
      hem.forEach((h, i) => { d.position.set(h.p[0], h.p[1] + Math.sin(t * 6 + h.ph) * V * 0.5, h.p[2]); d.scale.setScalar(V); d.updateMatrix(); hemM.setMatrixAt(i, d.matrix) }) // (the 0.12 m ripple scales with V below)
      hemM.instanceMatrix.needsUpdate = true
      arms.forEach((a, i) => { d.position.set(a.p[0], a.p[1] + Math.sin(t * 5 + a.s) * V * 0.7 * (i % 3), a.p[2]); d.scale.setScalar(V); d.updateMatrix(); armM.setMatrixAt(i, d.matrix) })
      armM.instanceMatrix.needsUpdate = true
    }
  })
  return { show, hide: () => { g.visible = false; at = null }, shown: () => g.visible, risen: () => (g.visible ? Math.min(1, t / 1.6) : 0), group: g }
}
