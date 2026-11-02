// Study 25 Coke corner in voxels (29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?"). The bottle and the old
// four-finger glove behind the left-field bleachers; the model's own copies are cut out (c25.js, under()).
// 29 Oct, night (Andrew: "The coke bottle not there yet ... The coca cola text needs to be in voxel"; before that the wireframe-edge voxels read as noise and the
// painted label floated off the bottle): both are baked from the park model's own TRIANGLES (science/bake_coke_vox.py, public/coke_vox.json, git-ignored).
//   the bottle: the model's skeleton of rings and tubes, its envelope revolved into a closed shell of 0.25 m cubes, glass green; it stands on its base by the
//     concourse with its neck up by the glove (30 Oct, Andrew: "The coke bottle is backwards and not hollow lol"). Later on 30 Oct ("run literally right over
//     the old wireframe ... look at pictures online"): like the real one it is an open frame, the model's own rings and staves in green cubes (turned end for
//     end), the slides showing inside, and one solid red label band with "Coca-" over "Cola" round it. Round its body the red label in cubes, and "Coca-Cola" in a chunky script (strokes
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
  // the slide: from high in the body (t 60) along the inside of that side wall, a swing up and down, down toward the base; at t 14 it comes out through a door
  // in the wall (cut out of the shell) and runs down a chute onto the concourse. The bottle sinks below the concourse, so the slide keeps to the axis's height
  const DOOR = 14, along = (t, k) => onAxis(t).addScaledVector(side, R(t) * k)
  const slide = (f) => {
    if (f < 0.7) { const t = 60 + (f / 0.7) * (DOOR - 60), p = along(t, 0.75); p.y += Math.sin(f * Math.PI * 3) * 1.2; return p }
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
      x.c === 0 ? GL[(x.h & 7) === 0 ? 1 : 0] : x.c === 1 ? GL[2] : x.c === 2 ? ((x.h & 15) === 0 ? '#c91a24' : '#e3202a') : x.c === 3 ? '#f4f2ea' : x.c === 4 ? ((x.h & 7) === 0 ? '#b81d24' : '#d8262c') : x.c === 6 ? '#d9dcdf' : GL[3])))
    letters.forEach((_, i) => word.setColorAt(i, col.set('#ffffff')))
    const TAN = [['#e2ab6c', '#d69a5a'], ['#c98d50', '#bd8246'], ['#a8713c', '#9c6834'], ['#6e4524', '#5a361b']]
    glove.forEach((x, i) => gloveM.setColorAt(i, col.set((x.h & 31) === 0 ? '#4e2f17' : TAN[x.c][(x.h >> 3) & 1]))) // a dark lace stitch here and there
    for (const m of [bottle, word, gloveM]) m.instanceColor.needsUpdate = true
  }
  paint(o.style ?? 1)

  // ---- 1 Nov (from GPT's second red team; Andrew: "On the leftovers see what you think, if you want to institute any as options be my guest"): three looks ----
  //   1 AS IS   2 LIVING BOTTLE: dark green ribs round the base, the shoulder and the neck, and on a home run toward left field (bubble()) orange and white bubbles race
  //   up through the frame, the word lights, and they burst out of the mouth   3 SODA LANTERN: the label lit from inside, the green staves lit unevenly, a slow flicker
  const w2 = V(), tOf = (p) => ((w2.copy(p).sub(c0).dot(u) - s0) / L) * 100
  shell.forEach((x) => { x.t = tOf(x.p) })
  // the shoulder: where the outline narrows fastest between t 40 and 85
  let shoulder = 60, best = 0; for (let t = 40; t <= 85; t++) { const dr = R(t) - R(t + 3); if (dr > best) { best = dr; shoulder = t + 1.5 } }
  const RIB = [[0, 5], [shoulder - 3, shoulder + 3], [88, 95]], ribCells = []
  for (const x of shell) if (x.c === 0 && RIB.some(([a, b]) => x.t >= a && x.t <= b)) { const r = w2.copy(x.p).sub(onAxis(x.t)); if (r.lengthSq() > 1e-6) ribCells.push(x.p.clone().addScaledVector(r.normalize(), 0.3)) }
  const ribs = inst(ribCells, d.v * 1.6); ribCells.forEach((_, i) => ribs.setColorAt(i, col.set((i * 7) % 5 ? '#5fb07c' : '#7cc996'))); ribs.instanceColor.needsUpdate = true; ribs.visible = false
  const side2 = u.clone().cross(side).normalize()
  // (1 Nov, evening, Andrew: "digging living bottle very much, can we have the bubbles percolate up into the air too then?"): out of the mouth they keep rising,
  // wobbling, leaning with the dojo's wind, shrinking, and each pops at its own height (3 to 17 m) in a puff of five little cubes; thick at first, then thinning
  const NB = 56, NPOP = 5, bubM = new THREE.InstancedMesh(cube, lam(), NB), popM = new THREE.InstancedMesh(cube, lam(), NB * NPOP); bubM.frustumCulled = popM.frustumCulled = false; g.add(bubM); g.add(popM)
  const bubs = Array.from({ length: NB }, (_, i) => {
    const v = 38 + ((i * 29) % 7) * 4, up = 3 + ((i * 23) % 9) * 0.45, hPop = 3 + ((i * 41) % 13)
    return { d: 2.4 * (i / NB) ** 1.5 + ((i * 37) % 11) * 0.02, a: (i * 2.39996) % (Math.PI * 2), r: 0.15 + ((i * 53) % 10) * 0.05, v, s: 0.75 + ((i * 17) % 4) * 0.12, up, popS: hPop / up, wob: 0.5 + ((i * 7) % 5) * 0.15, fan: 0.25 + ((i * 11) % 6) * 0.08 }
  })
  bubs.forEach((_, i) => { const c = i % 3 ? '#fd5a1e' : '#f4f2ea'; bubM.setColorAt(i, col.set(c)); for (let k = 0; k < NPOP; k++) popM.setColorAt(i * NPOP + k, col.set(c)) }); bubM.instanceColor.needsUpdate = popM.instanceColor.needsUpdate = true
  const hide = () => { dummy.scale.setScalar(0); dummy.updateMatrix(); for (let i = 0; i < NB; i++) bubM.setMatrixAt(i, dummy.matrix); for (let i = 0; i < NB * NPOP; i++) popM.setMatrixAt(i, dummy.matrix); bubM.instanceMatrix.needsUpdate = popM.instanceMatrix.needsUpdate = true }
  hide()
  let look = 1, bub = null, lit = false, flick = 0
  const POP_T = 0.4, BUB_T = Math.max(...bubs.map((b) => b.d + 100 / b.v + b.popS + POP_T)) + 0.1
  const Y = V(0, 1, 0), drift = V(), bp = V(), pop = V()
  // where a bubble is s seconds after it left the mouth: a push out along the neck that dies away, a steady rise, a slow fan outward, a growing side to side wobble, the wind's lean
  const airAt = (b, i, s, out) => out.copy(onAxis(100)).addScaledVector(side, Math.cos(b.a) * R(100) * b.r).addScaledVector(side2, Math.sin(b.a) * R(100) * b.r)
    .addScaledVector(u, 1.8 * (1 - Math.exp(-3 * s))).addScaledVector(Y, b.up * s).addScaledVector(side, Math.cos(b.a) * b.fan * s).addScaledVector(side2, Math.sin(b.a) * b.fan * s)
    .addScaledVector(side, Math.sin(s * 3.1 + i) * b.wob * Math.min(1, s)).addScaledVector(side2, Math.cos(s * 2.3 + i * 1.7) * b.wob * Math.min(1, s))
    .addScaledVector(drift, s ** 1.3)
  function stepBubbles(dt) {
    bub.t += dt
    const st = api.state ?? {}; drift.set((st.xwind ?? 0) * 0.447 * 0.35, 0, -(st.wind ?? 0) * 0.447 * 0.35) // the field's wind (toward right field, toward center) in the world, gently
    bubs.forEach((b, i) => {
      const tau = bub.t - b.d, tt = tau * b.v, s = tau - 100 / b.v
      let pk = -1
      if (tau < 0) dummy.scale.setScalar(0)
      else if (tt <= 100) { const wob = Math.sin(tau * 9 + i) * 0.12; dummy.position.copy(onAxis(tt)).addScaledVector(side, Math.cos(b.a + wob) * R(tt) * b.r).addScaledVector(side2, Math.sin(b.a + wob) * R(tt) * b.r); dummy.scale.setScalar(b.s) }
      else if (s < b.popS) { airAt(b, i, s, dummy.position); dummy.scale.setScalar(b.s * (1 - 0.6 * (s / b.popS))) } // up into the air, shrinking
      else { dummy.scale.setScalar(0); pk = (s - b.popS) / POP_T } // popped
      dummy.updateMatrix(); bubM.setMatrixAt(i, dummy.matrix)
      // the pop: five little cubes fly out from where it was and vanish
      if (pk >= 0 && pk < 1) airAt(b, i, b.popS, pop)
      for (let k = 0; k < NPOP; k++) {
        if (pk >= 0 && pk < 1) { const a = b.a + (k / NPOP) * Math.PI * 2; bp.set(Math.cos(a), 0.5 * Math.sin(k * 2.1 + i), Math.sin(a)); dummy.position.copy(pop).addScaledVector(bp, 0.3 + pk * 1.4); dummy.scale.setScalar(b.s * 0.32 * (1 - pk)) }
        else dummy.scale.setScalar(0)
        dummy.updateMatrix(); popM.setMatrixAt(i * NPOP + k, dummy.matrix)
      }
    })
    bubM.instanceMatrix.needsUpdate = popM.instanceMatrix.needsUpdate = true
    const on = bub.t > 0.9 && bub.t < 2.6 // the word lights while they pass the label
    if (on !== lit) { lit = on; letters.forEach((_, i) => word.setColorAt(i, col.set(on ? '#ffe27a' : '#ffffff'))); word.instanceColor.needsUpdate = true }
    if (bub.t > BUB_T) { bub = null; hide(); if (lit) { lit = false; letters.forEach((_, i) => word.setColorAt(i, col.set('#ffffff'))); word.instanceColor.needsUpdate = true } }
  }
  // the lantern: the label lit, the staves uneven; a few staves change every quarter second
  const LG = ['#22533a', '#3f8a5e', '#6fd896', '#b4ffd0']
  function lantern(all) {
    shell.forEach((x, i) => {
      if (x.c === 2) { if (all) bottle.setColorAt(i, col.set((x.h & 7) === 0 ? '#ff7a5c' : '#ff4a38')) }
      else if (x.c === 0 && (all || ((x.h + flick * 7919) & 31) === 0)) bottle.setColorAt(i, col.set(LG[((x.h >> 2) + (all ? 0 : flick)) & 3]))
    })
    bottle.instanceColor.needsUpdate = true
  }
  function setLook(n) {
    look = n; ribs.visible = n === 2
    if (n !== 2 && bub) { bub = null; hide() }
    paint(style); if (n === 3) lantern(true)
  }
  // ---- THE GLOVE CATCHES FOG (1 Nov, from GPT's list, Andrew's pick): a blob of Karl drifts into the glove, the glove closes on it, fog squeezes out between the
  // fingers in four jets, and the glove opens again. The glove closes by squashing about its middle (it is one baked mesh) ----
  const gc = glove.reduce((a, x) => a.add(x.p), V()).multiplyScalar(1 / Math.max(1, glove.length))
  const pivot = new THREE.Group(); pivot.position.copy(gc); g.remove(gloveM); pivot.add(gloveM); gloveM.position.copy(gc).negate(); g.add(pivot)
  const topG = glove.map((x) => x.p).sort((a, b) => b.y - a.y).slice(0, Math.max(4, Math.floor(glove.length * 0.2))), tips = [topG[0]]
  while (tips.length < 4) tips.push(topG.reduce((bst, p) => (Math.min(...tips.map((q) => q.distanceTo(p))) > Math.min(...tips.map((q) => q.distanceTo(bst))) ? p : bst), topG[0]))
  const toField = toHome.clone().setY(0).normalize(), NF = 80, fogM = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ color: '#e6eaee', flatShading: true }), NF); fogM.frustumCulled = false; g.add(fogM)
  const blob = Array.from({ length: 34 }, (_, i) => V(Math.sin(i * 1.7) * 2.4, Math.cos(i * 2.3) * 1.4, Math.sin(i * 3.1) * 2.4).multiplyScalar(0.45 + ((i * 13) % 5) * 0.13))
  const hideFog = () => { dummy.scale.setScalar(0); dummy.updateMatrix(); for (let i = 0; i < NF; i++) fogM.setMatrixAt(i, dummy.matrix); fogM.instanceMatrix.needsUpdate = true }
  hideFog()
  const FOG = { drift: 3.2, close: 3.8, squeeze: 6.4, open: 7.2, end: 8.6 }
  let grab = null
  function stepFog(dt) {
    grab.t += dt
    const t = grab.t, F = FOG, start = gc.clone().addScaledVector(toField, 20).add(V(0, 6, 0)), pocket = gc.clone().add(V(0, 1.2, 0))
    // the glove: closes after the fog arrives, trembles while it squeezes, opens
    const shut = t < F.drift ? 0 : t < F.close ? (t - F.drift) / (F.close - F.drift) : t < F.squeeze ? 1 : t < F.open ? 1 - (t - F.squeeze) / (F.open - F.squeeze) : 0, sq = 0.5 - 0.5 * Math.cos(Math.PI * shut)
    pivot.scale.set(1 - 0.14 * sq, 1 - 0.24 * sq, 1 - 0.14 * sq)
    pivot.rotation.z = t > F.close && t < F.squeeze ? Math.sin(t * 40) * 0.012 : 0
    for (let i = 0; i < NF; i++) {
      if (i < blob.length && t < F.close) { const k = Math.min(1, t / F.drift), e = k * k * (3 - 2 * k), bob = Math.sin(t * 2 + i) * 0.15; dummy.position.copy(start).lerp(pocket, e).addScaledVector(blob[i], 1 - 0.6 * Math.max(0, (t - F.drift) / (F.close - F.drift))).add(V(0, bob, 0)); dummy.scale.setScalar(1.05) }
      else if (i >= blob.length && t > F.close) { // the jets: each cube leaves a fingertip in turn and drifts out, growing, then thins away
        const j = i - blob.length, tip = tips[j % 4], tau = t - F.close - Math.floor(j / 4) * 0.18
        if (tau <= 0 || tau > 2.4) dummy.scale.setScalar(0)
        else { const out = tip.clone().sub(gc).setY(0).normalize(); dummy.position.copy(tip).addScaledVector(out, tau * 2.2).add(V(0, 0.6 + tau * 0.9 + Math.sin(tau * 5 + j) * 0.2, 0)); dummy.scale.setScalar(0.35 + 0.5 * Math.min(1, tau) * (1 - Math.max(0, tau - 1.6) / 0.8)) }
      } else dummy.scale.setScalar(0)
      dummy.updateMatrix(); fogM.setMatrixAt(i, dummy.matrix)
    }
    fogM.instanceMatrix.needsUpdate = true
    if (t > F.end) { grab = null; pivot.scale.setScalar(1); pivot.rotation.z = 0; hideFog() }
  }
  let fwall = performance.now(), facc = 0
  api.NN.frames.push(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - fwall) / 1000); fwall = now
    if (!g.visible) return
    if (bub) stepBubbles(dt)
    if (grab) stepFog(dt)
    if (look === 3 && !still) { facc += dt; if (facc > 0.25) { facc = 0; flick++; lantern(false) } }
  })
  // the cut: inside the bottle's outline (and a little past it), and within half a metre of a glove cube; above the concourse floor
  const gSet = new Set(); for (const x of glove) { const i = Math.floor(x.p.x / 0.5), j = Math.floor(x.p.y / 0.5), k = Math.floor(x.p.z / 0.5); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) gSet.add(`${i + a},${j + b},${k + c}`) }
  const w = V()
  const under = (x, y, z) => {
    if (y <= 7.6) return false
    w.set(x, y, z).sub(c0); const s = w.dot(u), t = ((s - s0) / L) * 100
    if (t > -3 && t < 103) { w.addScaledVector(u, -s); const k = Math.min(100, Math.max(0, t)); if (w.length() <= Math.max(R(k), R(100 - k)) / 0.86 + 0.9) return true } // the model's own bottle runs the other way, and is fatter than ours (slimmed 30 Oct): cut both outlines at its size
    return gSet.has(`${Math.floor(x / 0.5)},${Math.floor(y / 0.5)},${Math.floor(z / 0.5)}`)
  }
  return {
    set style(n) { if (n !== style) { paint(n); if (look === 3) lantern(true) } }, styleNow: () => style, set visible(v) { g.visible = v },
    // 1 Nov: the looks (1 AS IS, 2 LIVING BOTTLE, 3 SODA LANTERN); bubble() on a home run toward left field (the living bottle only; false otherwise); fogGrab() while
    // Karl is in (the caller checks the fog; false under reduced motion or while one is going)
    setLook(n) { if (n !== look) setLook(n) }, lookNow: () => look,
    bubble() { if (look !== 2 || still || bub) return false; bub = { t: 0 }; return true }, bubbling: () => !!bub, bubbleT: () => bub?.t ?? null, bubbleLen: () => BUB_T,
    // for the tests: the bubbles and pop cubes showing now, and the highest one above the mouth (m)
    fizz: () => { const m4 = new THREE.Matrix4(), p = V(), mouth = onAxis(100); let n = 0, pops = 0, hi = -1e9; for (let i = 0; i < NB; i++) { bubM.getMatrixAt(i, m4); if (Math.hypot(m4.elements[0], m4.elements[1], m4.elements[2]) > 1e-3) { p.setFromMatrixPosition(m4); n++; hi = Math.max(hi, p.y - mouth.y) } } for (let i = 0; i < NB * NPOP; i++) { popM.getMatrixAt(i, m4); if (Math.hypot(m4.elements[0], m4.elements[1], m4.elements[2]) > 1e-3) pops++ } return { n, pops, above: n ? hi : null } },
    fogGrab() { if (still || grab || !g.visible) return false; grab = { t: 0 }; return true }, grabbing: () => !!grab, gloveShut: () => 1 - pivot.scale.y,
    under,
    // for the tests: the cubes in each part (label: 1 when the word is there; letters: its cubes), the kids and how many laps they have run, whether it shows
    count: () => ({ bottle: shell.length, cap: shell.filter((x) => x.c === 4).length, lip: shell.filter((x) => x.c === 5).length, glove: glove.length, label: letters.length ? 1 : 0, letters: letters.length, red: shell.filter((x) => x.c === 2).length, slide: slideCubes.length, kids: kids.length }),
    laps: () => laps, kidAt: (i) => kids[i]?.m.position.clone(), shown: () => g.visible, group: g, focus: () => c0.clone(),
    // for the tests: the frame (to measure the word on screen and the shell against the outline)
    frame: () => ({ c0: c0.clone(), u: u.clone(), s0, L, R, band: d.band, wordH: d.wordH, mouth: onAxis(100), cells: shell.map((x) => [x.p.x, x.p.y, x.p.z, x.c]), letters: letters.map((x) => [x.p.x, x.p.y, x.p.z]), glove: glove.map((x) => [x.p.x, x.p.y, x.p.z]) }),
  }
}
