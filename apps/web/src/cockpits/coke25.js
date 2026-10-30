// Study 25 Coke corner in voxels (29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?"). The bottle and the old
// four-finger glove behind the left-field bleachers; the model's own copies are cut out (c25.js, under()).
// 29 Oct, night (Andrew: "The coke bottle not there yet ... The coca cola text needs to be in voxel"; before that the wireframe-edge voxels read as noise and the
// painted label floated off the bottle): both are baked from the park model's own TRIANGLES (science/bake_coke_vox.py, public/coke_vox.json, git-ignored).
//   the bottle: the model's skeleton of rings and tubes, its envelope revolved into a closed shell of 0.25 m cubes, glass green; it lies with its neck at the low
//     end, by the concourse, a lip ring round the mouth and a red cap on it. Round its body the red label in cubes, and "Coca-Cola" in a chunky script (strokes
//     two cubes or more) running along it in white cubes of 0.2 m raised off the label, facing home plate, upright and reading left to right from there.
//   the glove: the model's glove voxelized and filled solid (no hole through it), two tans with darker laces.
//   a white slide from high in the body down the inside and out of a door in the neck's side (the side facing the field) onto the concourse, and three kids who climb up and slide down, over and over.
// C picks the paint: 1 GLASS (green, his pick), 2 COKE RED (the glass in red).
export async function initCoke25(api, o = {}) {
  const { THREE, scene } = api.NN
  let d = null
  try { const r = await fetch('/coke_vox.json'); d = r.ok ? await r.json() : null } catch {}
  if (!d?.letters) return null
  const cube = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D(), g = new THREE.Group(), V = (...a) => new THREE.Vector3(...a)
  const lam = () => new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true })
  const inst = (list, size) => { const m = new THREE.InstancedMesh(cube, lam(), Math.max(1, list.length)); m.count = list.length; list.forEach((p, i) => { dummy.position.copy(p); dummy.scale.setScalar(size); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }); g.add(m); return m }
  const cells = (arr, n, org, size) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push({ p: V(org[0] + (arr[i] + 0.5) * size, org[1] + (arr[i + 1] + 0.5) * size, org[2] + (arr[i + 2] + 0.5) * size), c: n > 3 ? arr[i + 3] : 0, h: (arr[i] * 73856093) ^ (arr[i + 1] * 19349663) ^ (arr[i + 2] * 83492791) }); return out }

  // ---- the bottle's frame: t from the base (0) to the mouth (100), its outline R(t), "down" square to the axis ----
  const u = V(...d.axis), c0 = V(...d.c0), s0 = d.s0, L = d.L, prof = d.prof
  const R = (t) => { const f = Math.min(prof.length - 1, Math.max(0, t / 2)), k = Math.floor(f), j = Math.min(prof.length - 1, k + 1); return prof[k] + (prof[j] - prof[k]) * (f - k) }
  const onAxis = (t) => c0.clone().addScaledVector(u, s0 + (t / 100) * L)
  const dn = V(0, -1, 0).addScaledVector(u, u.y).normalize(), side0 = u.clone().cross(dn).normalize()
  const ground = 8.0 // the concourse round the mouth
  // the slide's side of the bottle: the one facing home plate, so the field sees the kids come out
  const toHome = api.toWorld([0, 0, 0]).sub(c0), side = side0.clone().multiplyScalar(Math.sign(side0.dot(toHome)) || 1)
  // the slide: from high in the body (t 40) along the inside of that side wall, a swing up and down, toward the neck; at t 84 it comes out through a door in
  // the wall (cut out of the shell) and runs down a chute onto the concourse. The bottle sinks below the concourse, so the slide keeps to the axis's height
  const DOOR = 84, along = (t, k) => onAxis(t).addScaledVector(side, R(t) * k)
  const slide = (f) => {
    if (f < 0.7) { const t = 40 + (f / 0.7) * (DOOR - 40), p = along(t, 0.75); p.y += Math.sin(f * Math.PI * 3) * 1.2; return p }
    if (f < 0.8) return along(DOOR, 0.75).lerp(along(DOOR, 1.15), (f - 0.7) / 0.1)
    const k = (f - 0.8) / 0.2, a = along(DOOR, 1.15), b = along(DOOR, 1.15).addScaledVector(side, 4.5).addScaledVector(u, 1.5); b.y = ground + 0.2
    const p = a.lerp(b, k); p.y = Math.max(ground + 0.2, p.y); return p
  }
  const slideCubes = []
  for (let k = 0; k <= 300; k++) { const p = slide(k / 300); for (const q of [-0.28, 0, 0.28]) slideCubes.push(p.clone().addScaledVector(side, q).add(V(0, q === 0 ? -0.18 : 0.05, 0))) }
  // ---- the shell, less the door where the slide comes through ----
  const doorAt = along(DOOR, 1), doorR = 1.3
  const shell = cells(d.bottle, 4, d.o, d.v).filter((x) => x.p.distanceTo(doorAt) > doorR)
  const bottle = inst(shell.map((x) => x.p), d.v * 1.02)
  const letters = cells(d.letters, 3, d.of, d.vf), word = inst(letters.map((x) => x.p), d.vf * 1.02)
  const slideM = inst(slideCubes, 0.3)
  slideCubes.forEach((_, i) => slideM.setColorAt(i, new THREE.Color('#f4f2ea')))
  // the kids climb a ladder from the door up the inside to the slide's top, slide down and walk back round
  const foot = along(DOOR, 1.25), top = slide(0), door = along(DOOR, 0.9); foot.y = ground + 0.1
  const climb = (f) => (f < 0.25 ? foot.clone().lerp(door, f / 0.25) : door.clone().lerp(top, (f - 0.25) / 0.75)) // up a ladder to the door, then up inside
  const SHIRT = ['#fd5a1e', '#1b1b1b', '#f4f2ea'], SKIN = ['#c68a64', '#8d5a3b', '#e9b99a'], PANTS = ['#3b5b8c', '#2a2a2a', '#6d6a60']
  const kids = SHIRT.map((sh, k) => {
    const m = new THREE.Group(), part = (c, sx, sy, sz, x, y, z) => { const b = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); b.scale.set(sx, sy, sz); b.position.set(x, y, z); m.add(b); return b }
    part(SKIN[k], 0.32, 0.32, 0.32, 0, 1.05, 0); part(sh, 0.42, 0.45, 0.28, 0, 0.66, 0)
    const legs = [part(PANTS[k], 0.17, 0.42, 0.2, -0.11, 0.22, 0), part(PANTS[k], 0.17, 0.42, 0.2, 0.11, 0.22, 0)]
    m.userData.legs = legs; g.add(m)
    return { m, ph: k / 3 }
  })
  // one lap: climb 8 s, slide 2.6 s, walk back round to the door 3.4 s
  const LAP = 14, still = !!o.still
  let wall = performance.now(), clock = 0, laps = 0
  function moveKids(dt) {
    clock += dt
    for (const kd of kids) {
      const T = ((clock / LAP + kd.ph) % 1) * LAP, m = kd.m, lg = kd.m.userData.legs
      let p, q, sit = false
      if (T < 8) { const f = T / 8; p = climb(f); q = climb(Math.min(1, f + 0.02)); p.y += Math.abs(Math.sin(T * 6)) * 0.12 }
      else if (T < 10.6) { const f = ((T - 8) / 2.6) ** 1.6; p = slide(f); q = slide(Math.min(1, f + 0.01)); sit = true }
      else { const f = (T - 10.6) / 3.4, a = slide(1), b = foot.clone().addScaledVector(side, 0.8); p = a.clone().lerp(b, f); p.addScaledVector(side, Math.sin(f * Math.PI) * 2.5); q = a.clone().lerp(b, Math.min(1, f + 0.02)); q.addScaledVector(side, Math.sin(Math.min(1, f + 0.02) * Math.PI) * 2.5); p.y = q.y = ground + 0.1 + Math.abs(Math.sin(T * 9)) * 0.08 }
      m.position.copy(p); const dir = q.clone().sub(p); dir.y = 0
      if (dir.lengthSq() > 1e-6) m.rotation.y = Math.atan2(dir.x, dir.z)
      const swing = sit ? 0 : Math.sin(T * (T < 8 ? 7 : 10)) * 0.6
      lg[0].rotation.x = sit ? -1.4 : swing; lg[1].rotation.x = sit ? -1.4 : -swing
      lg[0].position.z = lg[1].position.z = sit ? 0.18 : 0
    }
    laps = Math.floor(clock / LAP)
  }
  moveKids(0)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; if (g.visible && !still) moveKids(dt) })

  // ---- the glove: solid, tan leather lit where it is open and darker down in the creases between the fingers and in the pocket (baked: c 0 open .. 3 deep) ----
  const glove = cells(d.glove, 4, d.og, d.v)
  const gloveM = inst(glove.map((x) => x.p), d.v * 1.02)
  scene.add(g)
  const col = new THREE.Color()
  let style = 0
  function paint(n) {
    style = n
    const red = n === 2
    const GL = red ? ['#c81e26', '#d8323a', '#ef6b70', '#e8545a'] : ['#3f8a5e', '#4f9a6c', '#bfeccc', '#5fb07c']
    shell.forEach((x, i) => bottle.setColorAt(i, col.set(
      x.c === 0 ? GL[(x.h & 7) === 0 ? 1 : 0] : x.c === 1 ? GL[2] : x.c === 2 ? ((x.h & 15) === 0 ? '#c91a24' : '#e3202a') : x.c === 3 ? '#f4f2ea' : x.c === 4 ? ((x.h & 7) === 0 ? '#b81d24' : '#d8262c') : GL[3])))
    letters.forEach((_, i) => word.setColorAt(i, col.set('#ffffff')))
    const TAN = [['#e2ab6c', '#d69a5a'], ['#c98d50', '#bd8246'], ['#a8713c', '#9c6834'], ['#6e4524', '#5a361b']]
    glove.forEach((x, i) => gloveM.setColorAt(i, col.set((x.h & 31) === 0 ? '#4e2f17' : TAN[x.c][(x.h >> 3) & 1]))) // a dark lace stitch here and there
    for (const m of [bottle, word, gloveM]) m.instanceColor.needsUpdate = true
  }
  paint(o.style ?? 1)
  // the cut: inside the bottle's outline (and a little past it), and within half a metre of a glove cube; above the concourse floor
  const gSet = new Set(); for (const x of glove) { const i = Math.floor(x.p.x / 0.5), j = Math.floor(x.p.y / 0.5), k = Math.floor(x.p.z / 0.5); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) gSet.add(`${i + a},${j + b},${k + c}`) }
  const w = V()
  const under = (x, y, z) => {
    if (y <= 7.6) return false
    w.set(x, y, z).sub(c0); const s = w.dot(u), t = ((s - s0) / L) * 100
    if (t > -3 && t < 103) { w.addScaledVector(u, -s); if (w.length() <= R(Math.min(100, Math.max(0, t))) + 0.7) return true }
    return gSet.has(`${Math.floor(x / 0.5)},${Math.floor(y / 0.5)},${Math.floor(z / 0.5)}`)
  }
  return {
    set style(n) { if (n !== style) paint(n) }, styleNow: () => style, set visible(v) { g.visible = v },
    under,
    // for the tests: the cubes in each part (label: 1 when the word is there; letters: its cubes), the kids and how many laps they have run, whether it shows
    count: () => ({ bottle: shell.length, cap: shell.filter((x) => x.c === 4).length, lip: shell.filter((x) => x.c === 5).length, glove: glove.length, label: letters.length ? 1 : 0, letters: letters.length, red: shell.filter((x) => x.c === 2).length, slide: slideCubes.length, kids: kids.length }),
    laps: () => laps, kidAt: (i) => kids[i]?.m.position.clone(), shown: () => g.visible, group: g, focus: () => c0.clone(),
    // for the tests: the frame (to measure the word on screen and the shell against the outline)
    frame: () => ({ c0: c0.clone(), u: u.clone(), s0, L, R, band: d.band, wordH: d.wordH, mouth: onAxis(100), cells: shell.map((x) => [x.p.x, x.p.y, x.p.z, x.c]), letters: letters.map((x) => [x.p.x, x.p.y, x.p.z]), glove: glove.map((x) => [x.p.x, x.p.y, x.p.z]) }),
  }
}
