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
// LINE FILL (5 Nov, Andrew: "For the ball flight let's actually make the line grey and then it turns orange as the ball flies over it ... give me some fun things for how
// the line goes from grey to orange (bouncing, animations, ripple, etc.)"): the whole flight is drawn grey from the crack; each cube turns as the ball passes it
export const LINE_FILLS = [
  { c: 1, name: 'PLAIN', desc: 'each cube simply turns as the ball passes it' },
  { c: 2, name: 'RIPPLE', desc: 'a swell runs along behind the ball: each cube puffs up white-hot and settles back in its color' },
  { c: 3, name: 'BOUNCE', desc: 'each cube hops up as the ball passes and bounces back down onto the line' },
  { c: 4, name: 'SPARKLE', desc: 'each cube twinkles white a few times before it settles in its color' },
  { c: 5, name: 'DOMINO', desc: 'each cube tips over as the ball passes, like a row of dominoes going down' },
  { c: 6, name: 'GLOW UP', desc: 'each cube warms from grey through bone to its color, slowly, so a long glow trails the ball' },
]
// THE POSTS (5 Nov, Andrew: "The assembly of the cubes I want them to just grow from nothing ... just have the ripple like turn into them. Give me a few options for what
// that looks like and how the lines drop from them - do the lines come from above or below, do they have a fun unfurling animation"): the zenith and wall cubes grow out
// of nothing as the ball passes, then their posts arrive
export const POST_LOOKS = [
  { c: 1, name: 'GROW, THEN DROP', desc: 'the cube grows out of nothing, the post drops from it to the ground' },
  { c: 2, name: 'GROW, THEN RISE', desc: 'the cube grows, the post climbs up from the ground to meet it' },
  { c: 3, name: 'UNFURL', desc: 'the post unrolls down from the cube, each block popping out with a little bounce' },
  { c: 4, name: 'PLUMB BOB', desc: 'a weight drops from the cube on a line and lays the post behind it as it falls, bouncing once on the ground' },
  { c: 5, name: 'RAIN', desc: 'the post blocks fall from the cube one by one like drops and stack up from the ground' },
]
export function initFlight25(api, colors) {
  const { THREE, camera } = api.NN
  const toWorld = window.__cp.toWorld
  let style = 2, last = null, ghost = null, fillLook = 1, postLook = 1
  const box = () => new THREE.BoxGeometry(1, 1, 1) // its own cube per track: the engine disposes the track's geometry when the next ball comes
  const LAM = new Map(), lam = (c) => (LAM.has(c) ? LAM.get(c) : LAM.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true, fog: false })).get(c)) // one material per color (red team: a new set every preview)
  // cubes at points (world), one InstancedMesh
  function cubes(geo, mat, pts, size) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length)), m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { const s = typeof size === 'function' ? size(i, p) : size; m4.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m4) })
    im.count = pts.length
    im.frustumCulled = false // (5 Nov: drawn as they grow; bounds taken while empty dropped them when the camera moved)
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
  function showTags(g, f) { if (!g) return; g.userData.f = f; const R = [...g.userData.reveal].sort((a, b) => a[0] - b[0]); let k = -1; R.forEach(([at], i) => { if (f >= at) k = i }); R.forEach(([, o], i) => { const t = o.children.find((c) => c.userData.isTag); if (t && !t.userData.landNumber) { t.visible = flow === 3 ? o === hov : flow === 1 || i === k; if (t.userData.read) t.userData.read.fixed = flow === 3 && o === hov } }) } // (3 Nov: a tag you point at holds its place; the rest make way)
  // the hovered cube: the nearest dot on screen within 22 px of the pointer, among the posts already up
  const ptr = { x: -1e4, y: -1e4 }, pv = new THREE.Vector3()
  const dotsOnScreen = () => { const cv = api.NN.renderer?.domElement; if (!last || !cv) return []; const r = cv.getBoundingClientRect(); return last.userData.reveal.filter(([, o]) => o.userData.dot && o.visible).map(([, o]) => { pv.copy(o.userData.dot).project(camera); return { o, x: r.left + ((pv.x + 1) / 2) * r.width, y: r.top + ((1 - pv.y) / 2) * r.height, front: pv.z < 1 } }) }
  function hover() { let best = null, bd = 22; for (const d of dotsOnScreen()) { const e = Math.hypot(d.x - ptr.x, d.y - ptr.y); if (d.front && e < bd) { bd = e; best = d.o } } if (best !== hov) { hov = best; if (flow === 3) showTags(last, last?.userData.f ?? 1) } }
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; hover() }, true) // (capture: the park's own handlers stop some moves on the way up)
  api.NN.frames.push(() => { if (last && flow === 3) hover() }) // the camera or the ball moved under a still pointer // (2 Nov, later: the count-up is never stood down for a newer tag; ONE AT A TIME hid it from the zenith on)
  // the track: pts are world points along the flight; res the engine's result; color the verdict color; preview the ghost before a swing
  function track(pts, res, color, preview) {
    const g = new THREE.Group(), geo = box(), c = colors(), main = lam(preview ? c.dim : color), dim = lam(c.dim)
    // (5 Nov, later: every committed track is a new flight, a re-hit too; Andrew: "don't redraw when I re-hit a home run")
    const same = false
    g.userData.preview = !!preview
    const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength(), at = (stepM) => curve.getSpacedPoints(Math.max(2, Math.round(len / stepM)))
    const ground = toWorld([0, 0, 0]).y + 0.3
    g.userData.reveal = []
    if (style === 1) g.add(cubes(geo, main, at(8 * FT), 1.3))
    else if (style === 2) {
      const P = at(0.55), m = cubes(geo, lam('#ffffff'), P, 0.55), cold = new THREE.Color(c.dim), hot = new THREE.Color(preview ? c.dim : color), now0 = window.__fixedTime !== undefined || same
      P.forEach((_, i) => m.setColorAt(i, now0 ? hot : cold)); m.instanceColor.needsUpdate = true
      m.frustumCulled = false
      m.userData.fill = { P, cold, hot, upto: now0 || preview ? P.length : -1, live: new Map() }
      if (!now0 && !preview) m.visible = false // (shown at the crack: the first reveal)
      g.add(m); if (!preview) g.userData.line = m
    }
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
    const zPost = cubes(geo, lam(c.mk || c.pc || c.tx), column(top.x, top.z, ground, top.y - 1.4, 1.5).reverse(), 0.45); zen.add(zPost)
    zen.add(tag('ZENITH', `${Math.round(res.peakFt)} FT`, top.clone().add(new THREE.Vector3(0, 1, 0)), c.tx, -1, 1, c.mk || c.pc || c.tx))
    const zDot = cubes(geo, lam(c.mk ?? c.tx), [top], 1.4); zen.add(zDot) // the dot at the top of the flight
    zen.userData.dot = top.clone(); zen.userData.form = { post: zPost, dot: zDot, at: top.clone(), pts: column(top.x, top.z, ground, top.y - 1.4, 1.5).reverse(), s: 0.45, size: 1.4, look: 4 }
    g.add(zen); g.userData.reveal.push([ai / Math.max(1, src.length - 1), zen])
    // the clearance post: from the top of the wall to the ball as it crossed (GONE), or from the top down to where it hit (WALL)
    const v = res.verdict
    if (v.wallFt && v.cross != null && (v.kind === 'GONE' || v.kind === 'WALL')) {
      const ci = src.findIndex((s) => Math.hypot(s.p[0], s.p[1]) / FT >= v.wallFt)
      if (ci > 0) {
        const q = src[ci].p, b = toWorld([q[0], q[1], v.wallH * FT]), ball = toWorld([q[0], q[1], v.cross * FT]), lo = Math.min(b.y, ball.y), hi = Math.max(b.y, ball.y)
        const cl = new THREE.Group()
        const gc = v.kind === 'GONE' ? c.nk || c.mk || c.pc || c.acc : c.mk || c.pc || c.tx // (2 Nov, later: "the cleared the wall cube / line let's also make it geiger"; 3 Nov, the color audit: GEIGER means gone, so off the wall it stays ICE)
        const cPost = cubes(geo, lam(gc), column(b.x, b.z, lo, hi, 0.8).reverse(), 0.5); cl.add(cPost)
        const gone = v.kind === 'GONE', n = Math.round(gone ? v.clearBy : v.short)
        cl.add(tag(gone ? 'CLEARED THE WALL BY' : 'SHORT OF THE TOP BY', `${gone ? '+' : ''}${n} FT`, new THREE.Vector3(b.x, hi + 1, b.z), c.acc, 1, 3, gc))
        const cDot = cubes(geo, lam(gc), [ball], 1.4); cl.add(cDot) // the dot where it crossed the wall
        cl.userData.dot = ball.clone(); cl.userData.form = { post: cPost, dot: cDot, at: ball.clone(), pts: column(b.x, b.z, lo, hi, 0.8).reverse(), s: 0.5, size: 1.4, look: 6 }
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
    for (const [, o] of g.userData.reveal) o.visible = !!preview || window.__fixedTime !== undefined || same
    showTags(g, preview || window.__fixedTime !== undefined || same ? 1 : 0)
    if (same) { g.userData.shown = true; g.userData.ld?.userData.settle() }
    last = g
    return g
  }
  // as the ball flies (fraction f of the flight): posts appear when the ball passes them; the comet head follows the ball
  function reveal(f, pos) {
    if (!last) return
    const ld = last.userData.ld
    if (ld) { const S = ld.userData.src, i = Math.min(S.length - 1, Math.max(0, Math.round(f * (S.length - 1)))), p = S[i].p; ld.userData.ride(Math.hypot(p[0], p[1]) / FT, pos ?? toWorld(p), i >= ld.userData.over, p[2] / FT) }
    for (const [at, o] of last.userData.reveal) if (f >= at && !o.visible) { o.visible = true; startForm(o) }
    const L = last.userData.line
    if (L && !L.visible) L.visible = true
    if (L) { const F = L.userData.fill, k = Math.floor(f * (F.P.length - 1)), t = performance.now(); while (F.upto < k) { F.upto++; F.live.set(F.upto, t) } }
    if (flow === 2) showTags(last, f)
    const h = last.userData.comet
    if (h) {
      const P = h.userData.comet, n = Math.round((60 * FT) / 0.5), end = Math.floor(f * (P.length - 1)), m4 = new THREE.Matrix4()
      for (let i = 0; i < n; i++) { const k = Math.max(0, end - n + 1 + i), s = 0.4 + 1.1 * (i / n); m4.makeScale(s, s, s).setPosition(P[k]); h.setMatrixAt(i, m4) }
      h.instanceMatrix.needsUpdate = true
    }
  }
  function done() { if (last) { last.userData.shown = true; for (const [, o] of last.userData.reveal) if (!o.visible) { o.visible = true; startForm(o) } showTags(last, 1); last.userData.ld?.userData.settle(); const L = last.userData.line; if (L) { L.visible = true; const F = L.userData.fill, t = performance.now(); while (F.upto < F.P.length - 1) { F.upto++; F.live.set(F.upto, t + (F.upto % 40) * 4) } } } }
  // ---- the zenith and wall cubes: grown out of nothing as the ball passes, then the post (POST_LOOKS) ----
  const forming = new Set()
  function startForm(o) {
    const F = o.userData.form; if (!F || window.__fixedTime !== undefined) return
    F.t0 = performance.now(); F.look = F.look ?? postLook; F.N = F.pts.length; F.post.count = 0; dotAt(F, 0.001)
    if (F.look === 4 && !F.bob) { F.bob = cubes(box(), F.dot.material, [F.at], 0.8); F.bob.frustumCulled = false; (o.parent ?? o).add(F.bob) } // (on the flight, beside the post: the post's group holds only its own cube)
    forming.add(F)
  }
  const ease = (x) => 1 - Math.pow(1 - x, 3), back = (x) => { const k = 1.70158 * 1.4; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2) }
  const m4f = new THREE.Matrix4(), vF = new THREE.Vector3()
  const put = (F, i, p, sc, dy = 0) => { m4f.makeScale(sc, sc, sc).setPosition(p.x, p.y + dy, p.z); F.post.setMatrixAt(i, m4f) }
  const dotAt = (F, k) => { const s = F.size * Math.max(0.001, k); m4f.makeScale(s, s, s).setPosition(F.at); F.dot.setMatrixAt(0, m4f); F.dot.instanceMatrix.needsUpdate = true }
  api.NN.frames.push(() => {
    const t = performance.now()
    for (const F of forming) {
      const a = t - F.t0, N = F.N, gy = F.pts[N - 1]?.y ?? F.at.y
      // the cube: out of nothing, smoothly, 0 to 360 ms (5 Nov: "the actual formation of the cube on top looks weird right now let's make it smoother")
      const kd = Math.min(1, a / 420), sm = kd * kd * (3 - 2 * kd); dotAt(F, sm)
      const T = a - 260 // the post starts as the cube nears full size
      if (F.look === 1) { F.post.count = Math.round(N * ease(Math.max(0, Math.min(1, T / 520)))) }
      if (F.look === 2 || F.look === 6) { const n = Math.round(N * ease(Math.max(0, Math.min(1, T / (F.look === 6 ? 1400 : 520))))); for (let i = 0; i < n; i++) put(F, i, F.pts[N - 1 - i], F.s); F.post.count = n; F.post.instanceMatrix.needsUpdate = true }
      if (F.look === 3) { let n = 0; for (let i = 0; i < N; i++) { const f = Math.max(0, Math.min(1, (T - i * 28) / 260)); if (f <= 0) break; put(F, i, F.pts[i], F.s * back(f)); n = i + 1 } F.post.count = n; F.post.instanceMatrix.needsUpdate = true }
      if (F.look === 4) {
        const G = 60, fall = Math.max(0, T) / 1000, drop = F.at.y - gy, y = Math.max(gy, F.at.y - 0.5 * G * fall * fall), landed = y <= gy, tl = Math.sqrt((2 * drop) / G) * 1000 // (5 Nov: "speed it up a little bit")
        if (a >= 1100) { if (F.bob) { F.bob.parent?.remove(F.bob); F.bob.geometry.dispose(); F.bob = null } } else if (F.bob) F.bob.visible = T > 0; // (the weight goes once it has laid the post; it shares the cube's material, so only its own cube is freed)
        if (F.bob) { const bounce = landed ? Math.abs(Math.sin(Math.min(1, (T - tl) / 200) * Math.PI)) * 0.7 * (1 - Math.min(1, (T - tl) / 200)) : 0
        m4f.makeScale(0.8, 0.8, 0.8).setPosition(F.at.x, y + bounce, F.at.z); F.bob.setMatrixAt(0, m4f); F.bob.instanceMatrix.needsUpdate = true }
        let n = 0; for (let i = 0; i < N; i++) { if (F.pts[i].y >= y - 0.2) n = i + 1 } F.post.count = T > 0 ? n : 0
      }
      if (F.look === 5) { let n = 0; for (let k = 0; k < N; k++) { const i = N - 1 - k, f = (T - k * 45) / 1000; if (f <= 0) break; const p = F.pts[i], y = Math.max(p.y, F.at.y - 0.5 * 40 * f * f); vF.set(p.x, y, p.z); m4f.makeScale(F.s, F.s, F.s).setPosition(vF); F.post.setMatrixAt(k, m4f); n = k + 1 } F.post.count = n; F.post.instanceMatrix.needsUpdate = true }
      if (a > 2600) { dotAt(F, 1); for (let i = 0; i < N; i++) put(F, i, F.pts[i], F.s); F.post.count = N; F.post.instanceMatrix.needsUpdate = true; if (F.bob) { F.bob.parent?.remove(F.bob); F.bob.geometry.dispose(); F.bob = null } forming.delete(F) }
    }
    // the line filling in behind the ball
    const L = last?.userData.line; if (!L) return
    const Fl = L.userData.fill; if (!Fl.live.size) return
    const look = fillLook, cW = new THREE.Color('#fff7e6'), tmp = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3()
    const DUR = { 1: 0, 2: 420, 3: 520, 4: 380, 5: 300, 6: 900 }[look] ?? 0
    for (const [i, t0] of Fl.live) {
      const a = t - t0; if (a < 0) continue
      const k = DUR ? Math.min(1, a / DUR) : 1, p = Fl.P[i]
      let s = 0.55, dy = 0, rot = 0
      if (look === 1) tmp.copy(Fl.hot)
      if (look === 2) { const sw = Math.sin(Math.PI * Math.min(1, k * 1.4)); s = 0.55 * (1 + 1.3 * sw * (1 - k)); tmp.copy(cW).lerp(Fl.hot, ease(k)) }
      if (look === 3) { dy = 1.1 * Math.abs(Math.sin(k * Math.PI * 2.2)) * (1 - k); tmp.copy(Fl.hot) }
      if (look === 4) { tmp.copy(k < 1 && Math.floor(a / 55 + i) % 2 ? cW : Fl.hot); s = 0.55 * (k < 1 ? 1 + 0.35 * Math.random() : 1) }
      if (look === 5) { rot = (Math.PI / 2) * ease(k); tmp.copy(Fl.cold).lerp(Fl.hot, Math.min(1, k * 2)) }
      if (look === 6) { tmp.copy(Fl.cold).lerp(cW, Math.min(1, k * 2)); if (k > 0.5) tmp.copy(cW).lerp(Fl.hot, (k - 0.5) * 2) }
      L.setColorAt(i, tmp)
      e.set(0, 0, rot); q.setFromEuler(e); m4f.compose(Pv.set(p.x, p.y + dy, p.z), q, Sv.set(s, s, s)); L.setMatrixAt(i, m4f)
      if (k >= 1) { L.setColorAt(i, Fl.hot); e.set(0, 0, look === 5 ? Math.PI / 2 : 0); q.setFromEuler(e); m4f.compose(Pv.set(p.x, p.y, p.z), q, Sv.set(0.55, 0.55, 0.55)); L.setMatrixAt(i, m4f); Fl.live.delete(i) }
    }
    L.instanceColor.needsUpdate = true; L.instanceMatrix.needsUpdate = true
  })
  return { track, reveal, done, dots: () => dotsOnScreen().map((d) => ({ x: Math.round(d.x), y: Math.round(d.y), kind: d.o.children.find((c) => c.userData.isTag)?.visible ? "on" : "off", near: Math.round(Math.hypot(d.x - ptr.x, d.y - ptr.y)) })), setLand(n) { landLook = n }, land: () => landLook, setLandCol(n) { landCol = n }, setFlow(n) { flow = n; showTags(last, last?.userData.f ?? 1) }, setStyle(c) { style = c }, style: () => style, setFill(n) { fillLook = n }, fill: () => fillLook, setPosts(n) { postLook = n }, posts: () => postLook, last: () => last, setGhost(p) { ghost = p }, ghost: () => ghost }
}
