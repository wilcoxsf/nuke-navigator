// Study 25 ball arcs (28 Oct, night, Andrew: the arc is hard to discern, give options; and both a zenith and the feet it cleared the wall by, as vertical lines). The engine
// hands each flight to window.__cpTrack (dojo.js); this draws it in voxels, one of five ways (the U option), plus two voxel posts that rise as the ball passes them:
//   ZENITH: from the ground up to the top of the flight, its height in voxel letters    CLEARANCE: from the top of the wall up to the ball, how much it beat the wall by
//   (or, off the wall, the gap down from the top to where it hit)
// and a dot in the line at both (29 Oct, Andrew: a dot where the zenith is and where it cleared the wall, a different color; the X option picks it, colors().mk)
// The cubes are flat Lambert, so the park's lights shade them and the post shader inks their outline, like the kayaks.
import { landNumber, voxDigits } from './landnum25.js'
import { voxText, keepReadable } from './vox25.js'
const FT = 0.3048
export const ARCS = [
  { c: 1, name: 'BEADS', desc: 'a voxel bead every 8 ft along the flight, big enough to read from the broadcast seat' },
  { c: 2, name: 'PIXEL LINE', desc: 'small cubes touching end to end: a solid stair-stepped line, the thinnest that still reads' },
  { c: 3, name: 'SHADOW', desc: 'beads in the air, their shadow traced on the grass, and a dotted drop to it every 30 ft, so the height reads' },
  { c: 4, name: 'CURTAIN', desc: 'a voxel post from the grass up to the ball every 10 ft: the arc stands as a wall of light you can see the shape of' },
  { c: 5, name: 'COMET', desc: 'a thin pixel line, thick and bright over the last 60 ft behind the ball while it flies' },
]
export function initFlight25(api, colors) {
  const { THREE, camera } = api.NN
  const toWorld = window.__cp.toWorld
  let style = 2, last = null, ghost = null
  const box = () => new THREE.BoxGeometry(1, 1, 1) // its own cube per track: the engine disposes the track's geometry when the next ball comes
  const LAM = new Map(), lam = (c) => (LAM.has(c) ? LAM.get(c) : LAM.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true, fog: false })).get(c)) // one material per color (red team: a new set every preview)
  // cubes at points (world), one InstancedMesh
  function cubes(geo, mat, pts, size) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length)), m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { const s = typeof size === 'function' ? size(i, p) : size; m4.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m4) })
    im.count = pts.length
    return im
  }
  const column = (x, z, y0, y1, step) => { const out = []; for (let y = y0; y <= y1; y += step) out.push(new THREE.Vector3(x, y, z)); return out }
  // two lines of voxel letters (a small caption over a big number), on a pole top, facing the camera
  // side: -1 sets the tag off to the camera's left of its post, 1 to the right, so the zenith and the clearance tags never sit on each other; kept readable (vox25.js)
  // 31 Oct: the words are on the screen now, crisp at any zoom and never on each other (stag25.js); the post and the dot stay in the park
  // 1 Nov: tie is the color of the tag's own post (the zenith and clearance posts are ICE), for its number and its leader line (TAGS: TIE)
  // 2 Nov, night (Andrew: "let's actually kill the card completely on them - let's have it be fully diegetic text like the full distance card"): no card on the screen;
  // the caption in small bone voxels over the number in deep voxel digits of its post's color (tie), like the distance, standing off its dot to one side, readable
  function tag(small, bigTxt, at, color, side = 0, prio = 1, tie) {
    const g = new THREE.Group(), inner = new THREE.Group(), px = 0.75, col = new THREE.Color(tie ?? color), face = '#' + col.getHexString(), sideC = '#' + col.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString()
    const big = String(bigTxt).replace(/ FT$/, ''), d = voxDigits(THREE, big, px, face, sideC), unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' }), cap = voxText(THREE, small, { px: px * 0.32, color: '#e8e1c9' })
    unit.position.set(d.userData.width / 2 + px * 2.6, 0, 0); cap.position.set(0, px * 8.4, 0)
    inner.add(d, unit, cap); inner.rotation.y = -0.3 * (side || 1); inner.position.x = side * (d.userData.width / 2 + px * 3)
    g.add(inner); g.position.copy(at).add(new THREE.Vector3(0, 1.2, 0)); g.userData.isTag = true; g.userData.vtag = [small, String(bigTxt)]
    keepReadable(api, g, 230, 0.45, 2.6, { prio })
    return g
  }
  // PARK TAGS: WHEN (1 Nov, later; GPT red team II, B6 "ONE TAG AT A TIME"): 1 ALL STAY, every tag up once its moment has passed; 2 ONE AT A TIME, only the newest
  // (ZENITH at the top, the wall as it crosses, LANDED when it comes down), the posts and dots staying for the others
  let flow = 1, landLook = 2, landCol = 1
  // 3 ON HOVER (2 Nov, later): a tag shows only while the pointer is on its cube (the dot at the top of the flight, the dot where it crossed the wall)
  let hov = null
  function showTags(g, f) { if (!g) return; g.userData.f = f; const R = [...g.userData.reveal].sort((a, b) => a[0] - b[0]); let k = -1; R.forEach(([at], i) => { if (f >= at) k = i }); R.forEach(([, o], i) => { const t = o.children.find((c) => c.userData.isTag); if (t && !t.userData.landNumber) t.visible = flow === 3 ? o === hov : flow === 1 || i === k }) }
  // the hovered cube: the nearest dot on screen within 22 px of the pointer, among the posts already up
  const ptr = { x: -1e4, y: -1e4 }, pv = new THREE.Vector3()
  const dotsOnScreen = () => { const cv = api.NN.renderer?.domElement; if (!last || !cv) return []; const r = cv.getBoundingClientRect(); return last.userData.reveal.filter(([, o]) => o.userData.dot && o.visible).map(([, o]) => { pv.copy(o.userData.dot).project(camera); return { o, x: r.left + ((pv.x + 1) / 2) * r.width, y: r.top + ((1 - pv.y) / 2) * r.height, front: pv.z < 1 } }) }
  function hover() { let best = null, bd = 22; for (const d of dotsOnScreen()) { const e = Math.hypot(d.x - ptr.x, d.y - ptr.y); if (d.front && e < bd) { bd = e; best = d.o } } if (best !== hov) { hov = best; if (flow === 3) showTags(last, last?.userData.f ?? 1) } }
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; hover() }, true) // (capture: the park's own handlers stop some moves on the way up)
  api.NN.frames.push(() => { if (last && flow === 3) hover() }) // the camera or the ball moved under a still pointer // (2 Nov, later: the count-up is never stood down for a newer tag; ONE AT A TIME hid it from the zenith on)
  // the track: pts are world points along the flight; res the engine's result; color the verdict color; preview the ghost before a swing
  function track(pts, res, color, preview) {
    const g = new THREE.Group(), geo = box(), c = colors(), main = lam(preview ? c.dim : color), dim = lam(c.dim)
    const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength(), at = (stepM) => curve.getSpacedPoints(Math.max(2, Math.round(len / stepM)))
    const ground = toWorld([0, 0, 0]).y + 0.3
    g.userData.reveal = []
    if (style === 1) g.add(cubes(geo, main, at(8 * FT), 1.3))
    else if (style === 2) g.add(cubes(geo, main, at(0.55), 0.55))
    else if (style === 3) {
      g.add(cubes(geo, main, at(8 * FT), 1.1))
      g.add(cubes(geo, dim, at(4 * FT).map((p) => new THREE.Vector3(p.x, ground, p.z)), 0.6))
      const drops = []
      for (const p of at(30 * FT)) if (p.y > ground + 3) drops.push(...column(p.x, p.z, ground, p.y - 1.2, 1.4))
      g.add(cubes(geo, dim, drops, 0.35))
    } else if (style === 4) {
      g.add(cubes(geo, main, at(0.7), 0.7))
      const posts = []
      for (const p of at(10 * FT)) if (p.y > ground + 2) posts.push(...column(p.x, p.z, ground, p.y - 0.8, 0.9))
      g.add(cubes(geo, dim, posts, 0.4))
    } else {
      const P = at(0.5)
      g.add(cubes(geo, dim, P, 0.35))
      // the comet head: its own mesh, moved with the ball by reveal()
      const head = cubes(geo, main, P.slice(0, Math.round((60 * FT) / 0.5)), (i, _p) => 0.4 + 1.1 * (i / Math.round((60 * FT) / 0.5)))
      head.userData.comet = P
      head.frustumCulled = false // it moves out with the ball after its bounds were taken (red team)
      g.add(head); g.userData.comet = head
      if (preview) head.visible = false
    }
    // the zenith post and its tag
    const src = res.visPath ?? res.path
    let ai = 0
    src.forEach((q, i) => { if (q.p[2] > src[ai].p[2]) ai = i })
    const top = toWorld(src[ai].p)
    const zen = new THREE.Group()
    // the two posts in the pitch color, like the dots (29 Oct, evening, Andrew: the zenith and home-run height lines in ICE too)
    zen.add(cubes(geo, lam(c.mk || c.pc || c.tx), column(top.x, top.z, ground, top.y - 1.4, 1.5), 0.45))
    zen.add(tag('ZENITH', `${Math.round(res.peakFt)} FT`, top.clone().add(new THREE.Vector3(0, 1, 0)), c.tx, -1, 1, c.mk || c.pc || c.tx))
    zen.add(cubes(geo, lam(c.mk ?? c.tx), [top], 1.4)) // the dot at the top of the flight
    zen.userData.dot = top.clone()
    g.add(zen); g.userData.reveal.push([ai / Math.max(1, src.length - 1), zen])
    // the clearance post: from the top of the wall to the ball as it crossed (GONE), or from the top down to where it hit (WALL)
    const v = res.verdict
    if (v.wallFt && v.cross != null && (v.kind === 'GONE' || v.kind === 'WALL')) {
      const ci = src.findIndex((s) => Math.hypot(s.p[0], s.p[1]) / FT >= v.wallFt)
      if (ci > 0) {
        const q = src[ci].p, b = toWorld([q[0], q[1], v.wallH * FT]), ball = toWorld([q[0], q[1], v.cross * FT]), lo = Math.min(b.y, ball.y), hi = Math.max(b.y, ball.y)
        const cl = new THREE.Group()
        const gc = c.nk || c.mk || c.pc || c.acc // (2 Nov, later: "the cleared the wall cube / line let's also make it geiger")
        cl.add(cubes(geo, lam(gc), column(b.x, b.z, lo, hi, 0.8), 0.5))
        const gone = v.kind === 'GONE', n = Math.round(gone ? v.clearBy : v.short)
        cl.add(tag(gone ? 'CLEARED THE WALL BY' : 'SHORT OF THE TOP BY', `${gone ? '+' : ''}${n} FT`, new THREE.Vector3(b.x, hi + 1, b.z), c.acc, 1, 3, gc))
        cl.add(cubes(geo, lam(gc), [ball], 1.4)) // the dot where it crossed the wall
        cl.userData.dot = ball.clone()
        g.add(cl); g.userData.reveal.push([ci / Math.max(1, src.length - 1), cl])
      }
    }
    // the feet: a chunky voxel number riding over the ball from the crack, counting up, then settled over the spot (1 Nov, Andrew: no LANDED, "just say the ft as a
    // hover number"; 2 Nov: "counting up the whole time", grey until it clears the wall, then orange; landnum25.js). A committed swing only; the preview has the readout
    if (!preview) {
      const end = toWorld(src[src.length - 1].p), lp = res.landing?.point ?? end, base = lp.clone(); base.y = Math.max(base.y, ground)
      const gone = v.kind === 'GONE', over = gone && v.wallFt ? src.findIndex((s) => Math.hypot(s.p[0], s.p[1]) / FT >= v.wallFt) : -1
      // 2 Nov, later (Andrew: "pitch color until it's gone, after which I want to see both orange and the nuke color"): COUNT-UP COLOR, 1 ORANGE or 2 GEIGER
      const ld = landNumber(api, { at: base, ft: res.landFt, from: toWorld(src[0].p), cool: c.pc || c.tx, hot: landCol === 2 ? c.nk || c.acc : c.acc, up: c.mk || c.pc || c.tx, gone, look: landLook, spot: landLook === 3, avoid: at(1.5), splash: res.landing?.kind === 'SPLASH', wallFt: v.wallFt, geiger: () => window.__cpGeiger?.(), chip: () => window.__cpChipSnd?.() }) // (2 Nov, night: it keeps off the arc; a splash takes a dip)
      ld.userData.src = src; ld.userData.over = over < 0 ? Infinity : over
      g.add(ld); g.userData.reveal.push([0, ld]); g.userData.ld = ld
      if (window.__fixedTime !== undefined) ld.userData.settle()
    }
    // the ghost: while you tweak a real home run, the real flight stays up as faint cubes, so your change reads against it
    if (ghost && ghost.length > 2) { const gc = new THREE.CatmullRomCurve3(ghost), gl = gc.getLength(); g.add(cubes(geo, lam(c.dim), gc.getSpacedPoints(Math.max(2, Math.round(gl / 2.2))), 0.32)) }
    for (const [, o] of g.userData.reveal) o.visible = !!preview || window.__fixedTime !== undefined
    showTags(g, preview || window.__fixedTime !== undefined ? 1 : 0)
    last = g
    return g
  }
  // as the ball flies (fraction f of the flight): posts appear when the ball passes them; the comet head follows the ball
  function reveal(f, pos) {
    if (!last) return
    const ld = last.userData.ld
    if (ld) { const S = ld.userData.src, i = Math.min(S.length - 1, Math.max(0, Math.round(f * (S.length - 1)))), p = S[i].p; ld.userData.ride(Math.hypot(p[0], p[1]) / FT, pos ?? toWorld(p), i >= ld.userData.over, p[2] / FT) }
    for (const [at, o] of last.userData.reveal) if (f >= at) o.visible = true
    if (flow === 2) showTags(last, f)
    const h = last.userData.comet
    if (h) {
      const P = h.userData.comet, n = Math.round((60 * FT) / 0.5), end = Math.floor(f * (P.length - 1)), m4 = new THREE.Matrix4()
      for (let i = 0; i < n; i++) { const k = Math.max(0, end - n + 1 + i), s = 0.4 + 1.1 * (i / n); m4.makeScale(s, s, s).setPosition(P[k]); h.setMatrixAt(i, m4) }
      h.instanceMatrix.needsUpdate = true
    }
  }
  function done() { if (last) { for (const [, o] of last.userData.reveal) o.visible = true; showTags(last, 1); last.userData.ld?.userData.settle() } }
  return { track, reveal, done, dots: () => dotsOnScreen().map((d) => ({ x: Math.round(d.x), y: Math.round(d.y), kind: d.o.children.find((c) => c.userData.isTag)?.visible ? "on" : "off", near: Math.round(Math.hypot(d.x - ptr.x, d.y - ptr.y)) })), setLand(n) { landLook = n }, land: () => landLook, setLandCol(n) { landCol = n }, setFlow(n) { flow = n; showTags(last, last?.userData.f ?? 1) }, setStyle(c) { style = c }, style: () => style, last: () => last, setGhost(p) { ghost = p }, ghost: () => ghost }
}
