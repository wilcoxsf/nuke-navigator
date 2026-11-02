// Study 25 dojo controls in the park (30 Oct, Andrew: "for dinger dojo I feel like launch angle I want to be able to drag an actual angle and directions the same
// thing... semi-diegetic sliders or controls"; he took LA1, DR1 and EV1, and the wind rose came with the real wind):
//   SPRAY FAN (direction): ticks every 5 degrees from line to line just past the infield dirt, the aim line out from the plate; drag its end to aim
//   PROTRACTOR (launch angle): a voxel half-dial standing beside the plate, turned to the camera; drag the launch ray up or down
//   SLINGSHOT (exit velocity): a ball in a voxel slingshot just behind the plate; pull it back, the farther the harder, off to one side to aim the other way;
//   let go and it swings (a short tug only sets the numbers)
//   WINDSOCK (wind; 30 Oct, later, Andrew: the wind rose "lags insanely - maybe we make it a wind sock on the mound?"): a pole on the mound and an orange-and-white
//   sock off the top of it, blowing the way the air goes and standing out as far as it is strong; drag the end of the sock, double-click it for calm
// 30 Oct, later (Andrew: "way too busy ... I really insanely dig this slingshot thing though is there a way to control launch angle with that too?"): the slingshot
// does it all. Pull the ball back for speed and off to one side to aim; grab the top of the fork and lean it back for a higher launch, forward for a lower one.
// The spray fan and the protractor are gone. Later still (his pick, option 1: "you can't really operate on all 3 dimensions at once well"): while the ball is
// held back, the scroll wheel or the up and down arrows set the launch angle (the fork leans with it), and the flight on the field updates as it changes.
// 31 Oct (Andrew: "move the diagetic wind sock to on first base and make it a hair taller ... put a diagetic thermo to the direct left of the weather sock"): the
// sock stands on first base, a seventh taller, and a thermometer stands just to its left as you look out from home: a glass tube on a bulb, the red up to the
// air temperature; drag the top of the red up or down.
// The typed boxes and the slider stay; these set the same numbers through o.set. A grab takes the pointer from the camera until it lets go. Sizes grow with the
// camera's distance so the handles stay grabbable from the broadcast seat.
import { voxText, VOX_FONT } from './vox25.js'
import { ORANGE as OR25 } from './orange25.js'
const FT = 0.3048, RAD = Math.PI / 180
export function initControls25(api, o = {}) {
  const { THREE, scene, camera } = api.NN
  const toWorld = window.__cp.toWorld, cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
  const C = { acc: o.acc ?? OR25.o, tx: o.tx ?? '#e8e1c9', dim: o.dim ?? '#8a8f99' }
  const mats = {}, mat = (c) => (mats[c] ??= new THREE.MeshBasicMaterial({ color: c, fog: false }))
  const g = new THREE.Group(); g.visible = false; scene.add(g)
  const F = (x, y, z) => toWorld([x, y, z])
  const pool = (n, color, parent = g) => { const m = new THREE.InstancedMesh(cube, mat(color), n); m.count = 0; m.frustumCulled = false; parent.add(m); return m }
  const fill = (m, pts) => { m.count = Math.min(pts.length, m.instanceMatrix.count); for (let i = 0; i < m.count; i++) { const p = pts[i]; d.position.set(p[0], p[1], p[2]); d.scale.setScalar(p[3]); d.updateMatrix(); m.setMatrixAt(i, d.matrix) } m.instanceMatrix.needsUpdate = true }
  let k = 2.05, st = { ev: 103, la: 28, dir: 0, wind: 0, xwind: 0, temp: 70 }, drag = null, pull = null
  const along = (b, r, z = 0.25) => F(Math.sin(b * RAD) * r, Math.cos(b * RAD) * r, z)
  // ---- 31 Oct, later (Andrew: "The 3D diagetic controls look sort of shitty too give me better voxel versions of those and 3-4 options each"; of the slingshot,
  // "gimme options I am not at this point convinced"): four of each, picked in THE LAB (OPTIONS): SL slingshot, SK windsock, TH thermometer. Every piece is cubes in
  // a few colors (one pool per color); the sock and the thermometer were capped in size (they stood over Levi's Landing; since 1 Nov all three keep one size), and the
  // thermometer is drawn again only when its number or the camera's side changes (GPT red team: no work every frame for a still thing) ----
  // 1 Nov (Andrew: "let's have all of those diagetic controls a fixed size"): they no longer grow and shrink with the zoom; k and ks stay at what they were in the
  // dojo's opening view (the camera 225 m from home: k 2.05, the sock and the gauge at their cap of 1.5)
  let sty = { sl: 1, sk: 5, th: 5 }, ks = 1.5
  const pools = new Map(), poolOf = (piece, color, n, parent) => { const key = piece + color; if (!pools.has(key)) pools.set(key, { piece, m: pool(n, color, parent) }); return pools.get(key).m }
  const paintPiece = (piece, parent, parts) => { for (const [key, p] of pools) if (p.piece === piece && !(key.slice(piece.length) in parts)) fill(p.m, []); for (const [c, pts] of Object.entries(parts)) fill(poolOf(piece, c, 640, parent), pts) }
  const WOOD = '#a8703f', STEEL = '#8a8f99', WHITE = '#f4f2ea', RED = '#e0403a', GREEN = '#3b8a52'
  // ---- the slingshot behind the plate: its own group, scaled with the camera; the ball is the grip for speed and aim, the lit handle on top for the angle ----
  const sg = new THREE.Group(); sg.position.copy(F(0, -5, 0)); g.add(sg)
  const L = (x, y, z) => new THREE.Vector3(x, z, -y) // the plate frame inside the group: x right, y toward center field, z up
  const REST = [0, 0, 1.5]
  const lean = () => ((st.la - 25) / 35) * 0.5 // the lean back (radians) for the launch angle
  const tilt = (x, y, z) => { const a = lean(); return L(x, y - Math.sin(a) * z, Math.cos(a) * z) } // a point of the launcher, leaned about its foot
  const ballLocal = () => { const p = pull ?? [0, 0], r = tilt(REST[0], 0, REST[2]); return new THREE.Vector3(r.x + p[0], r.y, r.z - p[1]) }
  const GRIP = { 1: [0, 0, 2.95], 2: [0, 0, 3.1], 3: [0, 0, 2.9], 4: [0, 0.2, 2.9] }
  const forkTop = () => sg.localToWorld(tilt(...(GRIP[sty.sl] ?? GRIP[1])))
  const ballAt = () => sg.localToWorld(ballLocal())
  // the ball's cubes, worked out once: a shell of radius 0.44 (in the slingshot's own size), the seam the curve a tennis ball and a baseball share
  const BALL = (() => {
    const out = [], R = 0.44, seam = []
    for (let i = 0; i < 160; i++) { const t = (i / 160) * Math.PI * 2, a = 0.7, bb = 0.3; seam.push(new THREE.Vector3(a * Math.cos(t) + bb * Math.cos(3 * t), a * Math.sin(t) - bb * Math.sin(3 * t), 2 * Math.sqrt(a * bb) * Math.sin(2 * t))) }
    for (let x = -R; x <= R + 0.01; x += 0.14) for (let y = -R; y <= R + 0.01; y += 0.14) for (let z = -R; z <= R + 0.01; z += 0.14) {
      const r = Math.hypot(x, y, z); if (r > R + 0.02 || r < R - 0.17) continue
      const n = new THREE.Vector3(x, y, z).normalize(), near = Math.min(...seam.map((q) => q.distanceTo(n)))
      out.push([x, y, z, near < 0.2 ? RED : WHITE])
    }
    return out
  })()
  function paintSling() {
    const P = {}, put = (c, v, s) => (P[c] ??= []).push([v.x, v.y, v.z, s]), qt = (c, x, y, z, s) => put(c, tilt(x, y, z), s), q = (c, x, y, z, s) => put(c, L(x, y, z), s)
    const line = (c, a, b, s, step = 0.12) => { const n = Math.max(1, Math.ceil(a.distanceTo(b) / step)); for (let i = 0; i <= n; i++) put(c, a.clone().lerp(b, i / n), typeof s === 'function' ? s(i / n) : s) }
    const b = ballLocal()
    // the Y-forks (1, 5 to 8): a stem, two arms, bands from the tips to a pouch behind the ball; o: colors and sizes for each
    const fork = (o) => {
      for (let z = 0; z <= 1.3; z += 0.22) for (const x of o.thin ? [0] : [-0.2, 0.2]) qt(o.stem(z), x + (o.wob ? Math.sin(z * 5) * 0.06 : 0), 0, z, o.thin ? 0.34 : 0.42)
      for (const s of [-1, 1]) {
        for (let z = 1.3; z <= 2.5; z += 0.18) qt(o.arm(z, s), s * (0.25 + (z - 1.3) * o.spread) + (o.wob ? Math.sin(z * 7 + s) * 0.08 : 0), 0, z, o.armW)
        const tip = [s * (0.25 + 1.2 * o.spread), 0, 2.6]; qt(o.tip, ...tip, o.armW + 0.1)
        for (const dz of o.bands === 2 ? [-0.16, 0.16] : [0]) line(o.band, tilt(tip[0], tip[1], tip[2] - 0.05 + dz), b, o.bandW)
      }
      if (o.pouch) for (const dx of [-0.32, 0, 0.32]) for (const dz of [-0.28, 0, 0.28]) put(o.pouch, new THREE.Vector3(b.x + dx, b.y + dz, b.z + 0.32), 0.3) // the pouch, behind the ball
      if (o.brace) { line(STEEL, tilt(0, 0, 0.7), tilt(0, -1.7, 0.95), 0.2); for (const s of [-1, 1]) put(STEEL, tilt(s * 0.35, -1.75, 0.95), 0.24) }
      if (o.twig) { line(o.arm(2, -1), tilt(-0.7, 0, 1.9), tilt(-1.5, 0.2, 2.6), 0.2); put('#5f8f3a', tilt(-1.55, 0.2, 2.72), 0.3) }
    }
    if (sty.sl === 1) { // CHUNKY Y-FORK, with its notched angle arc
      fork({ stem: () => WOOD, arm: () => WOOD, tip: WOOD, armW: 0.4, spread: 0.75, band: OR25.o, bandW: 0.24 })
      for (let a = -10; a <= 60; a += 5) { const r = 1.6, v = L(1.95, Math.cos(a * RAD) * r - 0.6, 0.25 + Math.sin(a * RAD) * r); put(a % 30 ? STEEL : WHITE, v, a % 30 ? 0.16 : 0.26) }
      for (let t = 0.3; t <= 1.6; t += 0.32) put(OR25.o, L(1.95, Math.cos(st.la * RAD) * t - 0.6, 0.25 + Math.sin(st.la * RAD) * t), 0.22)
    } else if (sty.sl === 5) fork({ stem: () => STEEL, arm: () => STEEL, tip: '#2a2d33', armW: 0.26, spread: 0.7, band: '#222326', bandW: 0.2, pouch: '#7a4a2a', brace: true, thin: true }) // WRIST ROCKET
    else if (sty.sl === 6) fork({ stem: (z) => (Math.floor(z * 5) % 3 ? '#6b4a2b' : '#8b6a43'), arm: (z) => (Math.floor(z * 6) % 3 ? '#6b4a2b' : '#8b6a43'), tip: '#6b4a2b', armW: 0.36, spread: 0.8, band: '#d8c08a', bandW: 0.2, pouch: '#7a4a2a', wob: true, twig: true }) // TREE BRANCH
    else if (sty.sl === 7) fork({ stem: (z) => (Math.floor(z * 4) % 2 ? '#141414' : OR25.o), arm: () => '#1a1a1a', tip: OR25.o, armW: 0.38, spread: 0.75, band: OR25.o, bandW: 0.24 }) // GIANTS FORK
    else if (sty.sl === 8) fork({ stem: () => WOOD, arm: () => WOOD, tip: STEEL, armW: 0.44, spread: 1.05, band: OR25.o, bandW: 0.18, bands: 2, pouch: '#7a4a2a' }) // DOUBLE BANDS
    else if (sty.sl === 2) { // PINBALL PLUNGER
      for (let x = -0.6; x <= 0.61; x += 0.3) for (let y = -0.45; y <= 0.46; y += 0.3) for (let z = 0; z <= 0.9; z += 0.3) q(STEEL, x, y, z, 0.32)
      for (let z = 1.0; z <= 3.0; z += 0.25) for (const [x, y] of [[0.38, 0], [-0.38, 0], [0, 0.38], [0, -0.38]]) qt(STEEL, x, y, z, 0.24)
      const base = tilt(0, 0, 0.95); for (let i = 0; i <= 10; i++) { const t = i / 10, p = base.clone().lerp(b, t); p.x += (i % 2 ? 0.25 : -0.25); put(OR25.o, p, 0.16) }
    } else if (sty.sl === 3) { // BAT CATAPULT
      for (let x = -0.7; x <= 0.71; x += 0.35) for (let y = -0.35; y <= 0.36; y += 0.35) q(STEEL, x, y, 0.1, 0.38)
      line(WOOD, tilt(0, 0, 0.35), b, (t) => 0.22 + t * 0.4, 0.15)
      for (let z = 0.3; z <= 2.7; z += 0.3) qt(STEEL, 0, 0.55, z, 0.2)
    } else { // BALLISTA
      for (let z = 0.4; z <= 2.9; z += 0.2) qt(WOOD, 0, 0.2, z, 0.34)
      for (let x = -1.9; x <= 1.91; x += 0.19) qt(STEEL, x, 0.2 - 0.55 * (x / 1.9) ** 2, 2.3, 0.26)
      for (const s of [-1, 1]) line(OR25.o, tilt(s * 1.9, -0.35, 2.3), b, 0.14)
      for (const s of [-1, 1]) line(WOOD, L(s * 0.9, -0.3, 0), tilt(0, 0.2, 1.2), 0.24, 0.2)
    }
    put(OR25.o, tilt(...(GRIP[sty.sl] ?? GRIP[1])), 0.45) // the lit grip for the angle
    // the ball (1 Nov, Andrew: "let's have the thing we're pulling back clearly be the ball"): a round shell of small cubes, white, with red seams
    const seam = o.seam?.() ?? RED // (1 Nov, later: "the ball seam color should be the pitch color we already agreed on")
    for (const [x, y, z, c] of BALL) put(c === RED ? seam : c, new THREE.Vector3(b.x + x, b.y + y, b.z + z), 0.15)
    paintPiece('sl', sg, P)
  }
  // ---- the windsock on first base, a little lower than it was, its size capped ----
  const B1 = 90 * FT * Math.SQRT1_2, C2 = F(B1, B1, 0), PH = 6, RW = 7
  const poleTop = () => C2.clone().setY(C2.y + PH * ks)
  const HOLLOW = () => sty.sk === 5 || sty.sk === 6, SOCKL = 7.2, PENL = 7
  const sockAxis = () => { const m = Math.hypot(st.wind, st.xwind), dx = m ? st.xwind / m : 1, dz = m ? -st.wind / m : 0, droop = 0.2 + Math.min(1, m / 15) * (Math.PI / 2 - 0.25); return new THREE.Vector3(dx * Math.sin(droop), -Math.cos(droop), dz * Math.sin(droop)) }
  // the pennant never droops (1 Nov, later: "let's not ever have it droop, let's just make it go more or less far out horizontally"): level, downwind, longer the stronger
  const penAxis = () => { const m = Math.hypot(st.wind, st.xwind); return m ? new THREE.Vector3(st.xwind / m, 0, -st.wind / m) : new THREE.Vector3(1, 0, 0) }, penLen = () => PENL * (0.8 + 0.4 * Math.min(1, Math.hypot(st.wind, st.xwind) / 20)) // (long enough for the word at a calm)
  const windTip = () => { if (sty.sk === 4) return poleTop().addScaledVector(penAxis(), penLen() * ks); if (HOLLOW()) return poleTop().addScaledVector(sockAxis(), SOCKL * ks); const m = Math.hypot(st.wind, st.xwind), top = poleTop(), r = (0.25 + (Math.min(25, m) / 25) * 0.75) * RW * ks; if (!m) return top.clone().add(new THREE.Vector3(0.5 * ks, -r * 0.8, 0)); const droop = sty.sk === 2 ? 0 : (1 - Math.min(25, m) / 25) * r * 0.6; return new THREE.Vector3(top.x + (st.xwind / m) * r, top.y - droop, top.z - (st.wind / m) * r) }
  let sockAt = 0
  function paintSock(now = performance.now()) {
    sockAt = now
    const P = {}, put = (c, x, y, z, s) => (P[c] ??= []).push([x, y, z, s])
    for (let y = 0; y <= PH; y += 0.45) put(sty.sk === 4 ? STEEL : C.tx, C2.x, C2.y + y * ks, C2.z, 0.4 * ks)
    const top = poleTop(), tip = windTip(), m = Math.hypot(st.wind, st.xwind), ft = (now / 1000) * (2 + m * 0.3)
    const at = (f, wob = 0) => [top.x + (tip.x - top.x) * f + wob, top.y + (tip.y - top.y) * f + wob * 0.5, top.z + (tip.z - top.z) * f - wob]
    if (HOLLOW()) { // HOLLOW SOCK (5), HOLLOW SOCK, FINE (6): a steel hoop, then rings tapering from 0.95 to 0.4 m, two rings to a stripe
      const fine = sty.sk === 6, SEG = fine ? 16 : 10, AR = fine ? 18 : 12, cube = (fine ? 0.17 : 0.22) * ks, ax = sockAxis(), upv = new THREE.Vector3(0, 1, 0)
      const u = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : upv).normalize(), w = new THREE.Vector3().crossVectors(ax, u).normalize(), sideV = new THREE.Vector3().crossVectors(upv, ax).normalize()
      for (let i = -1; i < SEG; i++) {
        const f = Math.max(0, (i + 0.5) / SEG), r = (0.95 - 0.55 * f) * ks, fl = Math.sin(ft * 3 + i * 0.8) * (0.04 + 0.012 * m) * f * ks * 3
        const c = top.clone().addScaledVector(ax, (i + 0.5) * (SOCKL / SEG) * ks).addScaledVector(sideV, fl).addScaledVector(upv, fl * 0.3)
        for (let k2 = 0; k2 < AR; k2++) { const th = (k2 / AR) * Math.PI * 2, pnt = c.clone().addScaledVector(u, Math.cos(th) * r).addScaledVector(w, Math.sin(th) * r); put(i < 0 ? STEEL : Math.floor(i / (fine ? 3 : 2)) % 2 ? WHITE : OR25.o, pnt.x, pnt.y, pnt.z, cube) }
      }
    } else if (sty.sk === 1) { // AIRPORT SOCK: a steel cuff, five bands orange and white, still but for a flutter at the tail
      for (const [dx, dz] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) put(STEEL, top.x + dx * ks, top.y, top.z + dz * ks, 0.35 * ks)
      for (let f = 0; f <= 1; f += 0.04) { const wob = f > 0.7 ? Math.sin(ft * 3 - f * 6) * (f - 0.7) * 0.8 * ks : 0; put(Math.floor(f * 5) % 2 ? WHITE : OR25.o, ...at(f, wob), (1.5 - f * 0.8) * ks) }
    } else if (sty.sk === 2) { // WEATHER VANE: an arrow along the wind, its head downwind, a white fin at the back; longer the stronger
      const back = [top.x - (tip.x - top.x) * 0.35, top.y, top.z - (tip.z - top.z) * 0.35]
      for (let f = 0; f <= 1; f += 0.05) put(C.tx, back[0] + (tip.x - back[0]) * f, top.y, back[2] + (tip.z - back[2]) * f, 0.3 * ks)
      const dx = tip.x - top.x, dz = tip.z - top.z, L2 = Math.hypot(dx, dz) || 1, ux = dx / L2, uz = dz / L2
      for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) put(OR25.o, tip.x - ux * i * 0.35 * ks + -uz * s * i * 0.3 * ks, top.y, tip.z - uz * i * 0.35 * ks + ux * s * i * 0.3 * ks, 0.38 * ks)
      for (let i = 0; i <= 3; i++) for (let j = -1; j <= 1; j++) put(WHITE, back[0] - ux * i * 0.3 * ks, top.y + j * 0.3 * ks, back[2] - uz * i * 0.3 * ks, 0.3 * ks)
      for (const [cx, cz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(STEEL, top.x + cx * 0.9 * ks, top.y - 0.9 * ks, top.z + cz * 0.9 * ks, 0.22 * ks) // the compass pegs
    } else if (sty.sk === 4) { // GIANTS PENNANT (1 Nov, Andrew: "I like the giants pennant but would like it to actually say giants on it"): orange felt edged in white, GIANTS in black
      // the cloth hangs from its top edge along the sock's axis (out with the wind, drooping as it drops); the word is on both faces, laid out so it reads left to right
      // from wherever the camera is
      const ax = penAxis(), dn = new THREE.Vector3(0, -1, 0), nrm = new THREE.Vector3().crossVectors(ax, dn).normalize(), PL = penLen()
      const H = 2.6, hAt = (sd) => { const f = sd / PL; return f < 0.8 ? H * (1 - 0.75 * f) : H * 2 * (1 - f) }
      const pt = (sd, j, off = 0) => { const f = sd / PL, wob = Math.sin(ft * 2.5 - f * 5) * f * 0.3; return top.clone().addScaledVector(ax, sd * ks).addScaledVector(dn, j * ks).addScaledVector(nrm, (wob + off) * ks) }
      for (let sd = 0.15; sd <= PL; sd += 0.28) { const h = hAt(sd); for (let j = 0; j <= h; j += 0.28) { const q = pt(sd, j); put(j > h - 0.3 ? WHITE : OR25.o, q.x, q.y, q.z, 0.34 * ks) } }
      const word = 'GIANTS', cs = 0.12, cols = []
      for (const ch of word) { const rows = VOX_FONT[ch] ?? VOX_FONT[' ']; for (let i = 0; i < rows[0].length; i++) cols.push(rows.map((r) => r[i] === '#')); cols.push(null) }
      cols.pop()
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), flip = ax.dot(right) < 0, W = cols.length
      cols.forEach((col, c) => { if (!col) return; const sd = 0.45 + (flip ? W - 1 - c : c) * cs; col.forEach((on, j) => { if (!on) return; for (const off of [-0.2, 0.2]) { const q = pt(sd, 0.22 + j * cs, off); put('#141414', q.x, q.y, q.z, 0.13 * ks) } }) })
    } else { // 3 STAIR-STEP PENNANT: four rectangles, smaller and smaller, rising to the horizontal as it blows
      for (let f = 0; f <= 1; f += 0.03) {
        const wob = Math.sin(ft * 2.5 - f * 5) * f * 0.3 * ks, wd = 1.6 - Math.floor(f * 4) * 0.32, p = at(f, wob)
        for (let j = 0; j <= wd; j += 0.3) put(Math.floor(f * 4) % 2 ? WHITE : OR25.o, p[0], p[1] - j * ks, p[2], 0.34 * ks)
      }
    }
    put(OR25.o, tip.x, tip.y, tip.z, 0.9 * ks) // the grip
    paintPiece('sk', g, P)
  }
  // ---- the thermometer, just left of the sock as seen from home ----
  const thBase = () => F(B1 - 3.4 * ks, B1, 0), T0 = 1.6, T1 = 6.2 // the gauge's bottom and top, in ks above the ground
  const thSide = () => new THREE.Vector3(camera.position.z - C2.z, 0, -(camera.position.x - C2.x)).normalize() // across the line of sight
  const tempTip = () => { const b = thBase(); return b.setY(b.y + (T0 + ((st.temp - 40) / 60) * (T1 - T0)) * ks) }
  let thKey = ''
  function paintTherm(force) {
    const b = thBase(), sd = thSide(), key = [sty.th, st.temp, ks.toFixed(2), sd.x.toFixed(2), sd.z.toFixed(2)].join()
    if (!force && key === thKey) return
    thKey = key
    // a point of the gauge: y up (in ks), a across the line of sight, dep away from the camera (a board sits behind the tube)
    const bk = new THREE.Vector3(b.x - camera.position.x, 0, b.z - camera.position.z).normalize()
    const P = {}, at = (y, a, dep = 0) => [b.x + (sd.x * a + bk.x * dep) * ks, b.y + y * ks, b.z + (sd.z * a + bk.z * dep) * ks], put = (c, y, a, s, dep) => (P[c] ??= []).push([...at(y, a, dep), s * ks])
    const f = (st.temp - 40) / 60, lvl = T0 + f * (T1 - T0)
    // voxel digits from the park's font, cs a cell, a0 its left edge
    const digits = (txt, y, a0, cs, c, dep = 0) => { let x = 0; for (const ch of txt) { const rows = VOX_FONT[ch] ?? VOX_FONT[' ']; rows.forEach((r, j) => [...r].forEach((q, i) => { if (q === '#') put(c, y + (6 - j) * cs, a0 + (x + i) * cs, cs * 1.05, dep) })); x += rows[0].length + 1 } }
    // the mercury thermometer itself: a glass tube, a glint, a red column to the temperature, a red bulb in a glass rim, a cap (5 to 8 share it)
    const tube = (glass, glint, cap) => {
      for (let y = T0; y <= T1 + 0.01; y += 0.22) for (const a of [-0.42, 0.42]) put(glass, y, a, 0.2)
      if (glint) for (let y = T0 + 0.4; y <= T1 - 0.4; y += 0.5) put(WHITE, y, -0.2, 0.09, -0.05)
      for (let y = T0 - 0.2; y <= lvl; y += 0.18) put(RED, y, 0, 0.3)
      for (let y = 0.3; y <= 1.5; y += 0.22) for (let a = -0.8; a <= 0.81; a += 0.22) { const r = Math.hypot((y - 0.9) / 0.62, a / 0.72); if (r <= 0.78) put(RED, y, a, 0.26); else if (r <= 1.02) put(glass, y, a, 0.2) }
      put(WHITE, 1.15, -0.35, 0.14, -0.1) // the bulb's shine
      for (const a of [-0.3, 0, 0.3]) put(cap, T1 + 0.25, a, 0.3)
    }
    const ticks = (c, digitsC, a0 = 0.62) => { for (let n = 0; n <= 6; n++) { const y = T0 + (n / 6) * (T1 - T0), big = n % 3 === 0; put(c, y, a0, big ? 0.2 : 0.12); if (big) put(c, y, a0 + 0.18, 0.2); if (big && digitsC) digits(String(40 + n * 10), y - 0.25, a0 + 0.42, 0.075, digitsC) } }
    if (sty.th === 5) { tube('#cfe3ef', true, STEEL); ticks(WHITE, WHITE) } // GLASS TUBE
    else if (sty.th === 6) { // PORCH BOARD: a wooden board behind, dark ticks and numbers
      for (let y = 0.0; y <= T1 + 0.75; y += 0.3) for (let a = -1.05; a <= 1.66; a += 0.3) put((Math.floor(y * 3.3) + Math.floor(a * 3.3)) % 5 ? '#8b5a2b' : '#7a4c22', y, a, 0.32, 0.3)
      tube('#e9eef2', true, '#3a2a1a'); ticks('#2a1a0e', '#2a1a0e')
    } else if (sty.th === 7) { // ENAMEL SIGN: an orange board, a white rim, black ticks, F at the top
      for (let y = 0.0; y <= T1 + 1.2; y += 0.3) for (let a = -1.05; a <= 1.66; a += 0.3) { const rim = y < 0.15 || y > T1 + 1.05 || a < -0.95 || a > 1.55; put(rim ? WHITE : OR25.o, y, a, 0.32, 0.3) }
      tube(WHITE, false, '#141414'); ticks('#141414', '#141414'); digits('F', T1 + 0.45, 0.62, 0.075, '#141414')
    } else if (sty.th === 8) { // CHROME CASE: steel rails and caps round the tube, a dark window, bolts
      for (let y = 0.1; y <= T1 + 0.6; y += 0.22) for (const a of [-0.72, 0.72]) put('#b8bec8', y, a, 0.26)
      for (let a = -0.72; a <= 0.73; a += 0.24) { put('#b8bec8', 0.05, a, 0.26); put('#b8bec8', T1 + 0.65, a, 0.26) }
      for (let y = T0; y <= T1; y += 0.3) for (const a of [-0.3, 0.3]) put('#1c2026', y, a, 0.3, 0.25)
      for (const [y, a] of [[0.05, -0.72], [0.05, 0.72], [T1 + 0.65, -0.72], [T1 + 0.65, 0.72]]) put(WHITE, y, a, 0.3, -0.05)
      tube('#cfe3ef', true, '#b8bec8'); ticks(WHITE, null, 0.95)
    } else { // MERCURY TOWER (the first one; 1 Nov, Andrew: "the mercury red can't be hollow, needs to read as cleaner"): a white case filled in behind, a solid red
      // column a little proud of it, a solid red bulb in a white ring, three notches
      for (let y = T0 - 0.2; y <= T1 + 0.01; y += 0.3) for (const a of [-0.6, -0.3, 0, 0.3, 0.6]) put(WHITE, y, a, 0.32, Math.abs(a) > 0.5 ? 0 : 0.12)
      for (const a of [-0.45, -0.15, 0.15, 0.45]) put(WHITE, T1 + 0.3, a, 0.32)
      for (let y = 0.15; y <= 1.6; y += 0.2) for (let a = -0.95; a <= 0.96; a += 0.19) { const r = Math.hypot((y - 0.88) / 0.72, a / 0.95); if (r <= 1) put(r > 0.74 ? WHITE : RED, y, a, 0.22, r > 0.74 ? 0 : -0.06) }
      for (let y = 1.4; y <= lvl; y += 0.16) for (const a of [-0.16, 0, 0.16]) put(RED, y, a, 0.2, -0.08)
      for (const n of [0, 0.5, 1]) for (const a of [-0.95, -1.2]) put(STEEL, T0 + n * (T1 - T0), a, 0.22)
    }
    const tp = tempTip(); (P[RED] ??= []).push([tp.x, tp.y, tp.z, 0.5 * ks]) // the grip, the top of the red
    paintPiece('th', g, P)
  }
  // the value while a handle is held, over the handle
  const tagG = new THREE.Group(); g.add(tagG)
  let tagTxt = ''
  function showTag(txt, at) {
    if (txt !== tagTxt) { tagTxt = txt; tagG.clear(); if (txt) tagG.add(voxText(THREE, txt, { px: 0.3, color: C.acc, back: '#141414' })) }
    if (!txt) return
    tagG.position.copy(at).add(new THREE.Vector3(0, 3.2 * Math.min(k, 1.7), 0)); tagG.scale.setScalar(Math.min(k, 1.7))
    tagG.rotation.y = Math.atan2(camera.position.x - tagG.position.x, camera.position.z - tagG.position.z)
  }
  const paint = () => { paintSling(); paintSock(); paintTherm(true) }
  paint()
  api.NN.frames.push(() => {
    if (!g.visible) return
    const now = performance.now(); if (!drag && now - sockAt > 80 && sty.sk !== 2) paintSock(now); paintTherm() // the sock flutters at a dozen frames a second; the gauge only when it must
    sg.scale.setScalar(k * 1.6)
    if (drag) showTag(tagFor(drag.k), handleAt(drag.k))
  })
  // ---- picking ----
  const canvas = api.NN.renderer?.domElement ?? document.querySelector('canvas')
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3()
  const aim = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera) }
  const onPlane = (n, p) => ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, p), new THREE.Vector3())
  const screen = (p) => { v.copy(p).project(camera); const r = canvas.getBoundingClientRect(); return [((v.x + 1) / 2) * r.width + r.left, ((1 - v.y) / 2) * r.height + r.top, v.z] }
  const handleAt = (kk) => (kk === 'la' ? forkTop() : kk === 'ev' ? ballAt() : kk === 'temp' ? tempTip() : windTip())
  function grabAt(e) {
    if (!g.visible || (o.enabled && !o.enabled())) return null
    let best = null, bd = 30
    for (const kk of ['ev', 'la', 'wind', 'temp']) { const [x, y, z] = screen(handleAt(kk)); if (z > 1) continue; const dd = Math.hypot(x - e.clientX, y - e.clientY); if (dd < bd) { bd = dd; best = kk } }
    return best
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const words = o.words ?? {}
  function tagFor(kk) {
    if (kk === 'dir') return words.dir ? words.dir(st.dir) : `${st.dir}°`
    if (kk === 'la') return `${st.la}°`
    if (kk === 'temp') return `${st.temp}°F`
    if (kk === 'ev') return `${st.ev} MPH ${st.la}° ${st.dir > 0 ? 'R' : st.dir < 0 ? 'L' : ''}${st.dir ? Math.abs(st.dir) : ''}`.trim()
    const m = Math.round(Math.hypot(st.wind, st.xwind))
    return m ? `${m} MPH ${st.wind >= 0 ? 'OUT' : 'IN'}${Math.abs(st.xwind) >= 1 ? (st.xwind > 0 ? ' TO RIGHT' : ' TO LEFT') : ''}` : 'CALM'
  }
  function move(e) {
    aim(e)
    const ch = {}
    if (drag.k === 'la') { // up the screen leans it back (higher), down leans it forward, from where the grab began
      const top = drag.top ?? (drag.top = forkTop()), n = camera.position.clone().sub(top).setY(0).normalize(), p = onPlane(n, top); if (!p) return
      drag.la0 ??= st.la; drag.y0 ??= p.y
      ch.la = clamp(Math.round(drag.la0 + ((p.y - drag.y0) / (k * 1.6)) * 14), -10, 60)
    }
    else if (drag.k === 'ev') {
      const rest = sg.localToWorld(L(...REST)), p = onPlane(up, rest); if (!p) return
      const s1 = k * 1.6, fx = (p.x - rest.x) / s1, fy = -(p.z - rest.z) / s1, back = clamp(-fy, 0, 6) // in the slingshot's own meters
      pull = [clamp(fx, -4, 4), -back]
      ch.ev = Math.round(60 + (back / 6) * 65)
      if (back > 0.5) ch.dir = clamp(Math.round(Math.atan2(-fx, back) / RAD), -50, 50)
      paintSling()
    } else if (drag.k === 'temp') { // up the tube is warmer
      const b = thBase(), n = camera.position.clone().sub(b).setY(0).normalize(), p = onPlane(n, b); if (!p) return
      ch.temp = clamp(Math.round(40 + ((p.y - b.y - T0 * ks) / ((T1 - T0) * ks)) * 60), 40, 100)
    } else {
      const top = poleTop(), p = onPlane(up, top); if (!p) return
      const fx = p.x - top.x, fy = -(p.z - top.z), len = Math.hypot(fx, fy), mph = clamp(Math.round((Math.max(0, len / (RW * ks) - 0.25) / 0.75) * 25), 0, 25)
      ch.wind = mph ? clamp(Math.round((mph * fy) / len), -20, 20) : 0; ch.xwind = mph ? clamp(Math.round((mph * fx) / len), -20, 20) : 0
    }
    // the fine clutch (1 Nov, later; GPT red team II, B11 "THE PRECISION CLUTCH"; Andrew on the leftovers: "if you want to institute any as options be my guest"):
    // hold Alt while dragging and the handle moves a tenth as far; let go and it carries on from there, no jump
    drag.fine ??= {}
    for (const kk of Object.keys(ch)) {
      const f = (drag.fine[kk] ??= { off: 0, at: null }), raw = ch[kk]
      if (e.altKey) { f.at ??= { raw, val: st[kk] }; ch[kk] = Math.round(f.at.val + (raw - f.at.raw) / 10) }
      else { if (f.at) { f.off = st[kk] - raw; f.at = null } ch[kk] = raw + f.off }
    }
    const diff = Object.keys(ch).some((kk) => ch[kk] !== st[kk])
    Object.assign(st, ch)
    if (diff) { paint(); pend = { ...pend, ...ch }; const now = performance.now(); if (now - sentAt > 120) flush() } // (30 Oct, later: the drag lagged; every change re-flew the ball)
  }
  let pend = null, sentAt = 0
  function flush() { if (!pend) return; const ch = pend; pend = null; sentAt = performance.now(); o.set?.(ch)
  }
  canvas?.addEventListener('pointerdown', (e) => {
    const kk = e.button === 0 ? grabAt(e) : null
    if (!kk) return
    e.stopImmediatePropagation(); e.preventDefault()
    drag = { k: kk }; if (api.NN.controls) api.NN.controls.enabled = false
    try { canvas.setPointerCapture(e.pointerId) } catch {}
    canvas.style.cursor = 'grabbing'; o.sound?.('pick')
    move(e)
  }, true)
  canvas?.addEventListener('pointermove', (e) => {
    // (1 Nov, later) pointing at a handle shows its value over it, so you know what you'd be grabbing; it goes when you point away
    if (!drag) { if (g.visible) { const kk = grabAt(e); canvas.style.cursor = kk ? 'grab' : ''; if (kk !== hoverK) { hoverK = kk; if (kk) showTag(tagFor(kk), handleAt(kk)); else if (!step.t || performance.now() - (step.at ?? 0) > 1200) showTag('', null) } } return }
    e.stopImmediatePropagation(); move(e)
  }, true)
  const end = (e) => {
    if (!drag) return
    e.stopImmediatePropagation()
    const was = drag.k, tugged = pull && -pull[1] > 0.8
    drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true; flush()
    canvas.style.cursor = ''; showTag('', null); paintSling()
    if (was === 'ev' && tugged) o.fire?.() // let go of the slingshot: it swings
  }
  canvas?.addEventListener('pointerup', end, true)
  canvas?.addEventListener('pointercancel', end, true)
  // the launch angle while the ball is held: a wheel notch or an arrow is a degree (shift: five)
  const nudge = (d) => { st.la = clamp(st.la + d, -10, 60); paint(); pend = { ...pend, la: st.la }; if (performance.now() - sentAt > 120) flush() }
  // and with nothing held, a wheel notch over a handle is one of its units: a mph of speed, a degree of angle or of air, a mph of wind (its direction kept); shift: five
  // (1 Nov, later: the fine tuning, GPT red team II B11); the value shows over the handle for a moment
  let tagT = 0
  const step = (kk, d) => {
    if (kk === 'ev') st.ev = clamp(st.ev + d, 60, 125)
    else if (kk === 'la') st.la = clamp(st.la + d, -10, 60)
    else if (kk === 'temp') st.temp = clamp(st.temp + d, 40, 100)
    else { const m = Math.hypot(st.wind, st.xwind), m2 = clamp(Math.round(m) + d, 0, 25), ux = m ? st.xwind / m : 0, uy = m ? st.wind / m : 1; st.wind = Math.round(uy * m2); st.xwind = Math.round(ux * m2) }
    paint(); pend = { ...pend, ...(kk === 'wind' ? { wind: st.wind, xwind: st.xwind } : { [kk]: st[kk] }) }; if (performance.now() - sentAt > 120) flush(); else { clearTimeout(tagT); tagT = setTimeout(flush, 130) }
    showTag(tagFor(kk), handleAt(kk)); step.at = performance.now(); clearTimeout(step.t); step.t = setTimeout(() => { if (!drag && !hoverK) showTag('', null) }, 1200)
  }
  canvas?.addEventListener('wheel', (e) => {
    const kk = drag?.k === 'ev' ? 'la' : !drag ? grabAt(e) : null
    if (!kk) return
    e.preventDefault(); e.stopImmediatePropagation()
    if (drag?.k === 'ev') nudge((e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1)); else step(kk, (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1))
  }, { capture: true, passive: false })
  addEventListener('keydown', (e) => { if (drag?.k !== 'ev' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault(); e.stopImmediatePropagation(); nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1)) }, true)
  // a double-click puts a handle back: the wind to calm, and the rest to where they started (the dojo's blank swing, or the real ball when you are tweaking it; 1 Nov,
  // later: the sock had it, now all four)
  let hoverK = null
  canvas?.addEventListener('dblclick', (e) => {
    const kk = grabAt(e); if (!kk) return
    e.stopImmediatePropagation()
    const h = o.home?.() ?? { ev: 103, la: 28, temp: 62, wind: 0, xwind: 0, dir: 0 }, ch = kk === 'wind' ? { wind: 0, xwind: 0 } : kk === 'ev' ? { ev: Math.round(h.ev), dir: Math.round(h.dir ?? 0) } : { [kk]: Math.round(h[kk]) }
    Object.assign(st, ch); o.set?.(ch); paint(); o.sound?.('back'); showTag(tagFor(kk), handleAt(kk))
  }, true)
  return {
    group: g,
    set visible(v) { g.visible = v; if (!v && canvas) canvas.style.cursor = ''; if (!v && drag) { drag = null; pull = null; if (api.NN.controls) api.NN.controls.enabled = true; showTag('', null) } }, // (1 Nov: no grab hand left over the replay)
    get visible() { return g.visible },
    // the numbers from the state (after a typed number, a slider, a new ball)
    sync(s) { const n = { ev: Math.round(s.ev), la: Math.round(s.la), dir: Math.round(s.dir), wind: s.wind ?? 0, xwind: s.xwind ?? 0, temp: Math.round(s.temp ?? 70) }; if (Object.keys(n).every((kk) => n[kk] === st[kk])) return; st = n; paint() },
    // for the tests: where each handle is on screen, and a drag from one to a point
    // the looks (THE LAB: SL, SK, TH)
    setStyles(x) { sty = { ...sty, ...x }; paint() }, styles: () => ({ ...sty }),
    step, // (tests: a wheel notch on a handle)
    handles: () => Object.fromEntries(['ev', 'la', 'wind', 'temp'].map((kk) => [kk, screen(handleAt(kk)).slice(0, 2)])),
    dragging: () => drag?.k ?? null,
  }
}
