// LANDING PARTY: the real home runs at Oracle Park most like this ball (exit speed, launch angle, landing bearing), each flown through the same engine with its own fitted
// carry and side spin and followed past the wall into the stands, the arcade or McCovey Cove. Numbered markers sit where they came down; the list says who, when, how far.
// Real balls only (the replay set: every Oracle home run since 2023-07-14). Where a ball came down is the engine's landing, anchored to Statcast's distance and bearing, not a seat record.
import * as THREE from 'three'
import { voxPost, voxDots, voxText, voxCells, VOX_FONT } from './cockpits/vox25.js'
import { stag, stagAvoid } from './cockpits/stag25.js'

// the instance buffers of voxel meshes (their cube and materials are shared, so only those go)
const freeVox = (g) => g.traverse((o) => { if (o.isInstancedMesh) o.dispose() })
const ZONES = [[-46, -30, 'LEFT-FIELD STANDS'], [-30, -12, 'LEFT-CENTER'], [-12, 12, 'CENTER FIELD'], [12, 30, 'RIGHT-CENTER'], [30, 47, 'ARCADE']]

function numberSprite(n, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(8, 8, 48, 48)
  g.strokeStyle = color
  g.lineWidth = 4
  g.strokeRect(8, 8, 48, 48)
  g.fillStyle = color
  g.font = 'bold 34px monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(String(n), 32, 34)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }))
  s.scale.set(7, 7, 1)
  s.renderOrder = 20
  return s
}

// 31 Oct (Andrew: "Landing party is unreadable right now"; his screengrab: eight big numbers and eight grey flights piled up in one corner): in the voxel
// look the numbers are smaller, each yields to the ones ranked above it (it steps up or hides rather than overlap), and no flight is drawn until a row in the
// list is pointed at (focus(n)): then that one ball's flight, and only its number stays lit
export function landingParty(api, balls, o = {}) {
  const K = o.k ?? 8
  let group = null, items = [], flightG = null, marksG = null, style = o.style ?? 2, lit = 1, flags = [], tops = []
  // (1 Nov, later) the marks are things you can point at: pick(x, y) is the mark nearest a screen point (within 26 px), and the park's tags keep off them
  const scr = (v) => { const c = api.NN.renderer?.domElement, r = c?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight }, q = v.clone().project(api.NN.camera); return q.z > 1 ? null : [((q.x + 1) / 2) * r.width + r.left, ((1 - q.y) / 2) * r.height + r.top] }
  function pick(x, y) { if (!group) return null; let best = null, bd = 26; for (const t of tops) { const s = scr(t.at); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = t.k } } return best }
  stagAvoid(() => (group ? tops.map((t) => scr(t.at)).filter(Boolean).map(([x, y]) => [x - 14, y - 16, x + 14, y + 12]) : []))
  // 31 Oct, later (Andrew: "I still want landing party to show the top 5 other ones as like points on the map if we can, give me options for that too"): the six
  // nearest are marked where they came down, one of five ways (LP in THE LAB); the one in focus is lit with its tag over the marks
  const MARK = '#c9c2ad', MARKD = '#8a8f99'
  function marks() {
    if (!group) return
    if (marksG) { group.remove(marksG); freeVox(marksG); marksG = null } // (1 Nov, later; an audit: each hover rebuilt them and the old instance buffers stayed)
    const g = new THREE.Group(), six = items.slice(0, 6).filter(Boolean)
    flags = []; tops = []
    for (const [i, it] of six.entries()) {
      const p = it.p
      tops.push({ k: i + 1, at: p.clone().setY(p.y + (style === 6 ? (i === lit - 1 ? 8 : 6) : style === 2 ? (i === lit - 1 ? 6.6 : 5) : 1)) })
      if (style === 1) g.add(voxDots(THREE, [p, p.clone().setY(p.y + 0.9)], { size: (j) => (j ? 0.7 : 1.5), color: MARK })) // DOTS
      else if (style === 2) { // NUMBERED PINS (1 Nov, later, his pick: "I like numbered pins for landing party the most but still think this interface needs help"): bigger,
        // the number on a dark plate turned to the camera, the one in focus orange and taller
        const on = i === lit - 1, top = p.clone().setY(p.y + (on ? 6 : 4.4)); g.add(voxPost(THREE, p, top, { px: on ? 0.45 : 0.35, gap: 0.7, color: on ? '#f0802a' : MARKD }))
        const n = voxText(THREE, String(i + 1), { px: on ? 0.8 : 0.6, color: on ? '#f0802a' : MARK, back: '#141414' }), fl = new THREE.Group(); fl.add(n); fl.position.copy(top).add(new THREE.Vector3(0, 0.3, 0)); g.add(fl); flags.push(fl)
      }
      else if (style === 3) { const top = p.clone().setY(p.y + 4); g.add(voxPost(THREE, p, top, { px: 0.3, gap: 0.9, color: MARKD })); const f = []; for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) f.push(top.clone().add(new THREE.Vector3(0.45 + a * 0.45, -b * 0.45, 0))); g.add(voxDots(THREE, f.filter((_, j) => j % 2 === 0), { px: 0.45, color: '#f0802a' }), voxDots(THREE, f.filter((_, j) => j % 2 === 1), { px: 0.45, color: '#f4f2ea' })) } // FLAGS
      else if (style === 6) { // NUMBERED FLAGS (1 Nov, Andrew: "let's make it numbered flags and have the flag we're currently highlighting orange"): a stake, a flag
        // off its top with the number on it; bone flags with dark numbers, the one in focus orange; each turns to face the camera
        const on = i === lit - 1, cs = on ? 0.6 : 0.45, top = p.clone().setY(p.y + (on ? 9 : 7)); g.add(voxPost(THREE, p, top, { px: on ? 0.55 : 0.4, gap: 0.7, color: on ? '#f0802a' : MARKD }))
        const cells = [], rows = VOX_FONT[String(i + 1)]
        for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) cells.push([x, y, -1, on ? '#f0802a' : MARK])
        rows.forEach((r, j) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x + 2, 7 - j, 0, '#141414']) }))
        const fl = new THREE.Group(), f = voxCells(THREE, cells, cs); f.position.set(4.6 * cs, -9 * cs, 0); fl.add(f); fl.position.copy(top); g.add(fl); flags.push(fl)
      } else if (style === 4) g.add(voxDots(THREE, it.pts.filter((_, j) => j % 3 === 0), { px: 0.22, color: MARKD }), voxDots(THREE, [p], { px: 1.2, color: MARK })) // TRAILS
      else g.add(voxDots(THREE, [p], { px: 1.1, color: MARK })) // HALO (the ring below)
    }
    if (style === 5 && six.length) {
      const c = six.reduce((a, it) => a.add(it.p), new THREE.Vector3()).multiplyScalar(1 / six.length), R0 = Math.max(4, ...six.map((it) => Math.hypot(it.p.x - c.x, it.p.z - c.z))) + 3, ring = []
      for (let a = 0; a < 64; a++) ring.push(new THREE.Vector3(c.x + Math.cos((a / 64) * Math.PI * 2) * R0, Math.max(...six.map((it) => it.p.y)) + 0.4, c.z + Math.sin((a / 64) * Math.PI * 2) * R0))
      g.add(voxDots(THREE, ring, { px: 0.4, color: MARKD }))
    }
    for (const it of items) if (it?.n.children[0]) it.n.children[0].visible = style !== 6 && style !== 2 // the flags and pins stand in for the lit stake (its tag stays)
    marksG = g; group.add(g)
  }
  const oracle = balls.filter((b) => b.park === 'SF' && b.hr)
  function clear() {
    if (!group) return
    api.NN.scene.remove(group)
    group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose(); x.material?.map?.dispose(); x.material?.dispose?.() })
    group = null; items = []; flightG = null; marksG = null; tops = []; flags = []
  }
  // x: { ev, la, bear, self } (self: the replay ball itself, left out of its own party)
  const lbOf = (b) => { if (b._lb == null) b._lb = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, {}).landB; return b._lb }
  // (31 Oct, GPT red team: the first open flew every Oracle home run at once) the bearings are worked out in idle moments after the page loads, a few dozen at a time
  function warm() { let i = 0; const step = (dl) => { while (i < oracle.length && (dl?.timeRemaining?.() ?? 1) > 2) lbOf(oracle[i++]); if (i < oracle.length) (window.requestIdleCallback ?? ((f) => setTimeout(f, 50)))(step) }; (window.requestIdleCallback ?? ((f) => setTimeout(f, 50)))(step) }
  function nearest(x) {
    // compare landing bearing with landing bearing: a ball's stored dir is its fitted launch direction, which the spin hook bends by a few degrees
    for (const b of oracle) lbOf(b)
    return oracle.filter((b) => b !== x.self).map((b) => ({ b, d: ((b.ev - x.ev) / 3) ** 2 + ((b.la - x.la) / 3) ** 2 + ((b._lb - x.bear) / 6) ** 2 })).sort((p, q) => p.d - q.d).slice(0, K)
  }
  function show(x, color = '#f0802a') {
    clear()
    const list = nearest(x), out = []
    group = new THREE.Group()
    const dot = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true })
    list.forEach(({ b, d }, i) => {
      const st = { ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }
      const res = api.fly(st, { floor: -8 })
      const hit = res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL' ? api.findLanding(res.path) : { point: api.toWorld(res.path[res.path.length - 1].p), kind: 'SHORT' }
      const p = hit.point, bear = (Math.atan2(p.x, -p.z) * 180) / Math.PI
      const where = hit.kind === 'SPLASH' ? 'MCCOVEY COVE' : hit.kind === 'STREET' ? 'OUT OF THE PARK' : hit.kind === 'SHORT' ? 'SHORT IN THE ENGINE' : ZONES.find((z) => bear >= z[0] && bear < z[1])?.[2] ?? (bear < 0 ? 'LEFT-FIELD STANDS' : 'ARCADE')
      const pts = res.path.filter((_, k) => k % 5 === 0).map((q) => api.toWorld(q.p))
      if (o.vox) {
        // Study 25 (28 Oct, night): a voxel number on a voxel stake where it came down, the flight as a few faint cubes
        // 31 Oct (GPT red team, his yes: "only one illuminated landing marker at a time"): every one a dim stake; the one in focus (#1 at first) lit, with its tag on the screen
        const top = new THREE.Vector3(p.x, p.y + 4, p.z), post = voxPost(THREE, p, top, { px: 0.35, gap: 1.2, color: o.dim ?? '#8a8f99' }), lit = voxPost(THREE, p, top.clone().setY(p.y + 6), { px: 0.5, gap: 1, color })
        const n = stag(api, [`#${i + 1} ${String(o.name?.(b) ?? '').toUpperCase()}`.trim(), `${b.ft} FT`], color, { prio: 2, side: 1, tie: color }); n.position.copy(top).setY(p.y + 6.5)
        lit.add(n); group.add(post, lit)
        post.visible = false // (the marks stand for the rest; 31 Oct, later)
        items[i] = { n: lit, post, p: p.clone(), pts: res.path.filter((_, k) => k % 4 === 2).map((q) => api.toWorld(q.p)) }
      } else {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), dot)
        m.position.copy(p)
        m.renderOrder = 19
        const s = numberSprite(i + 1, color)
        s.position.set(p.x, p.y + 6, p.z)
        group.add(m, s)
        // the flight, faint, so the eye can follow each one in
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, depthTest: false })))
      }
      out.push({ n: i + 1, b, d, where, kind: hit.kind, at: p.clone() })
    })
    api.NN.scene.add(group)
    marks()
    focus(1)
    return out
  }
  // point at one (1-based; null for all): its flight in cubes, the others' numbers dimmed away
  function focus(k) {
    if (!group) return
    if (flightG) { group.remove(flightG); freeVox(flightG); flightG = null }
    k = k ?? 1 // (nothing pointed at: #1)
    items.forEach((it, i) => { if (it) it.n.visible = i === k - 1 })
    if ((style === 6 || style === 2) && k !== lit) { lit = k; marks() } else lit = k
    const it = items[k - 1]
    if (it) { flightG = voxDots(THREE, it.pts, { px: 0.45, color: o.flight ?? '#f0802a' }); group.add(flightG) }
  }
  // the flags turn to the camera (about their stakes)
  api.NN.frames?.push(() => { if (!flags.length || !group) return; const cp = api.NN.camera.position; for (const f of flags) f.rotation.y = Math.atan2(cp.x - f.position.x, cp.z - f.position.z) })
  return { show, clear, focus, warm, pick, lit: () => (group ? lit : null), setStyle(n) { if (n === style) return; style = n; marks() }, count: () => oracle.length }
}
