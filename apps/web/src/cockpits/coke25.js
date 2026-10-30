// Study 25 Coke corner in voxels (29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?"). The bottle and the old
// four-finger glove behind the left-field bleachers, as cubes of 0.5 m voxelized from the park model's own full-detail wireframe (science/bake_coke_vox.py,
// public/coke_vox.json, git-ignored); the model's own copies are cut out (c25.js, under()).
// 29 Oct, evening (Andrew, with two photos of the real one: "make the coke bottle a little more hollow and actually say coca cola, and then have a couple kids going up
// and sliding down it"): the bottle is a skeleton like the real one, green rings every metre and a half and ten spars along it, open between; round its middle the red
// label band in finer cubes (0.14 m) with "Coca-Cola" in white script facing the field; a white slide comes down out of its base, and three kids climb up inside it and
// slide down, over and over. C picks the paint: 1 GLASS (green, his pick), 2 COKE RED (the skeleton in red).
export async function initCoke25(api, o = {}) {
  const { THREE, scene } = api.NN
  let d = null
  try { const r = await fetch('/coke_vox.json'); d = r.ok ? await r.json() : null } catch {}
  if (!d) return null
  const cube = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D(), g = new THREE.Group(), V = (...a) => new THREE.Vector3(...a)
  const lam = () => new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true })
  const cellsOf = (arr) => { const out = []; for (let i = 0; i < arr.length; i += 4) { const [a, b, c] = arr.slice(i, i + 3); out.push({ p: [d.o[0] + (a + 0.5) * d.vx, d.o[1] + (b + 0.5) * d.vx, d.o[2] + (c + 0.5) * d.vx], h: (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) }) } return out }
  const inst = (list, size) => { const m = new THREE.InstancedMesh(cube, lam(), Math.max(1, list.length)); m.count = list.length; list.forEach((p, i) => { dummy.position.copy(p); dummy.scale.setScalar(size); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }); g.add(m); return m }
  const allB = cellsOf(d.bottle), glove = cellsOf(d.glove)

  // ---- the bottle's own frame: its axis (base to neck), each cell's distance along it (s), out from it (r) and round it (ang); 0 for ang faces home plate ----
  const u = V(...d.axis), c0 = allB.reduce((s, x) => s.add(V(...x.p)), V()).divideScalar(allB.length)
  const home = api.toWorld([0, 0, 0]), toHome = home.clone().sub(c0); toHome.addScaledVector(u, -toHome.dot(u)).normalize()
  const e1 = toHome, e2 = u.clone().cross(e1), w = V()
  for (const x of allB) { w.set(...x.p).sub(c0); x.s = w.dot(u); w.addScaledVector(u, -x.s); x.r = w.length(); x.ang = Math.atan2(w.dot(e2), w.dot(e1)) }
  const s0 = Math.min(...allB.map((x) => x.s)), s1 = Math.max(...allB.map((x) => x.s)), L = s1 - s0
  for (const x of allB) x.t = ((x.s - s0) / L) * 100
  // its outline along the way: the outer edge of the shell (the 85th percentile of the distance from the axis, every 2 % of the length), smoothed
  const bins = Array.from({ length: 51 }, (_, k) => { const v = allB.filter((x) => Math.abs(x.t - k * 2) < 2).map((x) => x.r).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length * 0.85)] : null })
  for (let k = 0; k < bins.length; k++) if (bins[k] == null) bins[k] = bins[k - 1] ?? 2
  const prof = bins.map((_, k) => { const w5 = bins.slice(Math.max(0, k - 2), k + 3).sort((p, q) => p - q); return w5[w5.length >> 1] })
  for (let k = 36; k < prof.length; k++) prof[k] = Math.min(prof[k], prof[k - 1]) // from the shoulder up it only narrows (stray cells near the glove made a ring off the neck)
  const R = (t) => { const f = Math.min(50, Math.max(0, t / 2)), k = Math.floor(f), j = Math.min(50, k + 1); return prof[k] + (prof[j] - prof[k]) * (f - k) }
  const at = (t, r, a) => c0.clone().addScaledVector(u, s0 + (t / 100) * L).addScaledVector(e1, r * Math.cos(a)).addScaledVector(e2, r * Math.sin(a))
  // 29 Oct, later (Andrew: "the new bottle doesn't have a lip that closes at the end and the text still looks awful, redo ... Reconform them to the old wireframe
  // geometries"): the bottle is the model's own wireframe in voxels (every edge, cubes of 0.25 m: science/bake_coke_vox.py, w_bottle), green; the label is painted on a
  // band that follows the bottle's outline where the model has its corrugated label (46 to 66 % of the way up), red with "Coca-Cola" in white script running round
  // it as on the real one, letters upright toward the neck, the word centred on the side the stands see; the neck is closed by a red voxel cap
  const WV = d.wv, wcells = []
  for (let i = 0; i < d.w_bottle.length; i += 4) { const [a2, b2, c2, tg] = d.w_bottle.slice(i, i + 4), p = V(d.wo[0] + (a2 + 0.5) * WV, d.wo[1] + (b2 + 0.5) * WV, d.wo[2] + (c2 + 0.5) * WV); w.copy(p).sub(c0); wcells.push({ p, tg, t: ((w.dot(u) - s0) / L) * 100, h: (a2 * 73856093) ^ (b2 * 19349663) }) }
  const LB = [46, 66], frame = wcells.filter((x) => x.t < LB[0] + 0.5 || x.t > LB[1] - 0.5)
  for (let t = 99.2, r0 = R(99.2); t <= 99.2; t++) for (let x = -r0; x <= r0; x += WV) for (let y = -r0; y <= r0; y += WV) if (x * x + y * y <= r0 * r0) frame.push({ p: c0.clone().addScaledVector(u, s0 + (t / 100) * L).addScaledVector(e1, x).addScaledVector(e2, y), tg: 9, t, h: 0 }) // the cap
  const bottle = inst(frame.map((x) => x.p), WV * 1.04)
  // the label band: a tube on the outline (radius a hair outside it at each height), its texture drawn here
  const nA = 96, nH = 16, rOut = (t) => R(t) + 0.12, pos = [], uv = [], idx = []
  for (let j = 0; j <= nH; j++) { const t = LB[0] + ((LB[1] - LB[0]) * j) / nH; for (let i = 0; i <= nA; i++) { const a2 = (i / nA) * Math.PI * 2, q = at(t, rOut(t), a2); pos.push(q.x, q.y, q.z); uv.push(i / nA, j / nH) } }
  for (let j = 0; j < nH; j++) for (let i = 0; i < nA; i++) { const k = j * (nA + 1) + i; idx.push(k, k + 1, k + nA + 1, k + 1, k + nA + 2, k + nA + 1) }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); lg.setIndex(idx)
  const lc = document.createElement('canvas'); lc.width = 2048; lc.height = 512
  {
    const x = lc.getContext('2d'), W = lc.width, H = lc.height
    x.fillStyle = '#e3202a'; x.fillRect(0, 0, W, H)
    x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < W; i += 16) x.fillRect(i, 0, 5, H) // the corrugation
    // the word, centred on the side between home plate and the sky (a = 0 faces home; increasing a runs to the viewer's right and up the side)
    const aC = Math.atan2(V(0, 1, 0).dot(e2), V(0, 1, 0).dot(e1)) * 0.35, cx = ((aC + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * W
    let px = H * 0.62; const font = (q) => `italic 700 ${q}px "Segoe Script", "Brush Script MT", cursive`
    x.font = font(px); while (x.measureText('Coca-Cola').width > W * 0.32 && px > 20) { px *= 0.95; x.font = font(px) }
    x.fillStyle = x.strokeStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = px * 0.05
    for (const dx of [-W, 0, W]) { x.strokeText('Coca-Cola', cx + dx, H * 0.44); x.fillText('Coca-Cola', cx + dx, H * 0.44) } // the canvas top is the neck end
    x.lineWidth = px * 0.05; for (const dx of [-W, 0, W]) { x.beginPath(); x.moveTo(cx + dx - W * 0.2, H * 0.84); x.quadraticCurveTo(cx + dx, H * 0.7, cx + dx + W * 0.2, H * 0.88); x.stroke() }
  }
  const ltex = new THREE.CanvasTexture(lc); ltex.colorSpace = THREE.SRGBColorSpace; ltex.anisotropy = 4
  const label = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: ltex, side: THREE.DoubleSide }))
  g.add(label); window.__nn?.hideForNormal?.push(label)

  // ---- the slide out of the base and the kids on it ----
  const dn = V(0, -1, 0).addScaledVector(u, u.y).normalize(), side = u.clone().cross(dn).normalize()
  const ground = 8.0
  const inside = (t, k = 0.55) => c0.clone().addScaledVector(u, s0 + (t / 100) * L).addScaledVector(dn, R(t) * k)
  const top = inside(60), foot = inside(4, 0.7); foot.y = Math.max(foot.y, ground + 0.1)
  // the slide: from high inside the bottle, back down toward the base with an S on the way, out past the base and onto the plaza
  const slide = (f) => { const t = 60 - f * 66, p = t > 2 ? inside(t, 0.75) : inside(2, 0.75).addScaledVector(u, ((t - 2) / 100) * L); p.addScaledVector(side, Math.sin(f * Math.PI * 2.2) * R(Math.max(t, 4)) * 0.45); p.y = Math.max(ground + 0.2, p.y + (f > 0.92 ? -(f - 0.92) * 8 : 0)); return p }
  const slideCubes = []
  for (let k = 0; k <= 300; k++) { const p = slide(k / 300); for (const q of [-0.28, 0, 0.28]) slideCubes.push(p.clone().addScaledVector(side, q).add(V(0, q === 0 ? -0.18 : 0.05, 0))) }
  const slideM = inst(slideCubes, 0.3)
  slideCubes.forEach((_, i) => slideM.setColorAt(i, new THREE.Color('#f4f2ea')))
  const climb = (f) => foot.clone().lerp(top, f)
  const SHIRT = ['#fd5a1e', '#1b1b1b', '#f4f2ea'], SKIN = ['#c68a64', '#8d5a3b', '#e9b99a'], PANTS = ['#3b5b8c', '#2a2a2a', '#6d6a60']
  const kids = SHIRT.map((sh, k) => {
    const m = new THREE.Group(), part = (c, sx, sy, sz, x, y, z) => { const b = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); b.scale.set(sx, sy, sz); b.position.set(x, y, z); m.add(b); return b }
    part(SKIN[k], 0.32, 0.32, 0.32, 0, 1.05, 0); part(sh, 0.42, 0.45, 0.28, 0, 0.66, 0)
    const legs = [part(PANTS[k], 0.17, 0.42, 0.2, -0.11, 0.22, 0), part(PANTS[k], 0.17, 0.42, 0.2, 0.11, 0.22, 0)]
    m.userData.legs = legs; g.add(m)
    return { m, ph: k / 3 }
  })
  // one lap: climb 8 s, slide 2.6 s, walk back round to the stairs 3.4 s
  const LAP = 14, still = !!o.still
  let wall = performance.now(), clock = 0, laps = 0
  function moveKids(dt) {
    clock += dt
    for (const kd of kids) {
      const T = ((clock / LAP + kd.ph) % 1) * LAP, m = kd.m, lg = kd.m.userData.legs
      let p, q, sit = false
      if (T < 8) { const f = T / 8; p = climb(f); q = climb(Math.min(1, f + 0.02)); p.y += Math.abs(Math.sin(T * 6)) * 0.12 }
      else if (T < 10.6) { const f = ((T - 8) / 2.6) ** 1.6; p = slide(f); q = slide(Math.min(1, f + 0.01)); sit = true }
      else { const f = (T - 10.6) / 3.4, a = slide(1), b = foot.clone(); a.y = b.y = ground + 0.1; p = a.clone().lerp(b, f); p.addScaledVector(side, Math.sin(f * Math.PI) * 2.5); q = a.clone().lerp(b, Math.min(1, f + 0.02)); q.addScaledVector(side, Math.sin(Math.min(1, f + 0.02) * Math.PI) * 2.5); p.y += Math.abs(Math.sin(T * 9)) * 0.08 }
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

  // ---- the glove (29 Oct, later, Andrew: the cartoon one "looks awful ... reconform them to the old wireframe geometries"): the model's own glove wireframe in voxels
  // (w_glove), tan leather with darker lacing, on its deck (voxelized from the model, in concrete)
  const deck = glove.filter((x) => x.p[1] < 11.9), mk = [], mkCol = []
  for (let i = 0; i < d.w_glove.length; i += 4) {
    const [a2, b2, c2] = d.w_glove.slice(i, i + 3), p = V(d.wo[0] + (a2 + 0.5) * WV, d.wo[1] + (b2 + 0.5) * WV, d.wo[2] + (c2 + 0.5) * WV)
    if (p.y < 11.6) continue
    const hh = (a2 * 73856093) ^ (b2 * 19349663) ^ (c2 * 83492791)
    mk.push(p); mkCol.push((hh & 15) === 0 ? '#4e2f17' : (hh & 7) === 1 ? '#e2ab6c' : (hh & 3) === 2 ? '#b07a42' : '#c98d50')
  }
  const mittM = inst(mk, WV * 1.04)
  const gloveM = inst(deck.map((x) => V(...x.p)), d.vx)
  scene.add(g)
  const col = new THREE.Color()
  let style = 0
  function paint(n) {
    style = n
    const red = n === 2
    frame.forEach((x, i) => bottle.setColorAt(i, col.set(x.tg === 9 ? '#d8262c' : (x.h & 7) === 0 ? (red ? '#ef4a4f' : '#8fe0a8') : red ? '#c81e26' : x.tg ? '#4f9a6c' : '#3f8a5e')))
    // the glove's deck (below 11.9 m) in concrete, the glove in two tans with dark laces
    deck.forEach((x, i) => gloveM.setColorAt(i, col.set((x.h & 3) === 0 ? '#57544c' : '#6d6a60')))
    mkCol.forEach((c, i) => mittM.setColorAt(i, col.set(c)))
    for (const m of [bottle, gloveM, mittM]) m.instanceColor.needsUpdate = true
  }
  paint(o.style ?? 1)
  return {
    set style(n) { if (n !== style) paint(n) }, styleNow: () => style, set visible(v) { g.visible = v },
    // the columns the voxels stand in (cells of 0.5 m, grown by one): the model's own bottle and glove, and the wire beneath them, are cut out there (c25.js)
    under: (() => { const S = new Set(); let tp = 0; for (const x of [...allB, ...glove]) { const i = Math.floor(x.p[0] / d.vx), k = Math.floor(x.p[2] / d.vx); tp = Math.max(tp, x.p[1]); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) S.add((i + a) + ',' + (k + b)) } return (x, y, z) => y > 7.6 && y < tp + 1.5 && S.has(Math.floor(x / d.vx) + ',' + Math.floor(z / d.vx)) })(),
    // for the tests: the cubes in each part, the white ones in the label, the kids and how many laps they have run, whether it shows
    count: () => ({ bottle: frame.length, cap: frame.filter((x) => x.tg === 9).length, glove: mk.length, label: label.visible ? 1 : 0, slide: slideCubes.length, kids: kids.length }),
    laps: () => laps, kidAt: (i) => kids[i]?.m.position.clone(), shown: () => g.visible, group: g, focus: () => c0.clone(),
  }
}
