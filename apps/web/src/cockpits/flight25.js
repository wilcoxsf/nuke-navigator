// Study 25 ball arcs (28 Oct, night, Andrew: the arc is hard to discern, give options; and both a zenith and the feet it cleared the wall by, as vertical lines). The engine
// hands each flight to window.__cpTrack (dojo.js); this draws it in voxels, one of five ways (the U option), plus two voxel posts that rise as the ball passes them:
//   ZENITH: from the ground up to the top of the flight, its height in voxel letters    CLEARANCE: from the top of the wall up to the ball, how much it beat the wall by
//   (or, off the wall, the gap down from the top to where it hit)
// and a dot in the line at both (29 Oct, Andrew: a dot where the zenith is and where it cleared the wall, a different color; the X option picks it, colors().mk)
// The cubes are flat Lambert, so the park's lights shade them and the post shader inks their outline, like the kayaks.
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
  function tag(small, bigTxt, at, color, side = 0) {
    const g = new THREE.Group(), inner = new THREE.Group(), a = voxText(THREE, small, { px: 0.36, color: colors().tx, back: '#141414' }), b = voxText(THREE, bigTxt, { px: 0.72, color, back: '#141414' })
    a.position.y = 6.4; inner.add(a, b)
    const w = Math.max(a.userData.width, b.userData.width)
    inner.position.x = side * (w / 2 + 1.5)
    g.add(inner); g.position.copy(at)
    return keepReadable(api, g, 230, 0.35, 2.4)
  }
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
    zen.add(tag('ZENITH', `${Math.round(res.peakFt)} FT`, top.clone().add(new THREE.Vector3(0, 1, 0)), c.tx, -1))
    zen.add(cubes(geo, lam(c.mk ?? c.tx), [top], 1.4)) // the dot at the top of the flight
    g.add(zen); g.userData.reveal.push([ai / Math.max(1, src.length - 1), zen])
    // the clearance post: from the top of the wall to the ball as it crossed (GONE), or from the top down to where it hit (WALL)
    const v = res.verdict
    if (v.wallFt && v.cross != null && (v.kind === 'GONE' || v.kind === 'WALL')) {
      const ci = src.findIndex((s) => Math.hypot(s.p[0], s.p[1]) / FT >= v.wallFt)
      if (ci > 0) {
        const q = src[ci].p, b = toWorld([q[0], q[1], v.wallH * FT]), ball = toWorld([q[0], q[1], v.cross * FT]), lo = Math.min(b.y, ball.y), hi = Math.max(b.y, ball.y)
        const cl = new THREE.Group()
        cl.add(cubes(geo, lam(c.mk || c.pc || c.acc), column(b.x, b.z, lo, hi, 0.8), 0.5))
        const gone = v.kind === 'GONE', n = Math.round(gone ? v.clearBy : v.short)
        cl.add(tag(gone ? 'CLEARED THE WALL BY' : 'SHORT OF THE TOP BY', `${gone ? '+' : '-'}${n} FT`, new THREE.Vector3(b.x, hi + 1, b.z), c.acc, 1))
        cl.add(cubes(geo, lam(c.mk ?? c.tx), [ball], 1.4)) // the dot where it crossed the wall
        g.add(cl); g.userData.reveal.push([ci / Math.max(1, src.length - 1), cl])
      }
    }
    // where it came down: the distance, in voxels, on a short stake at the landing (a committed swing only; the preview has the readout)
    if (!preview) {
      const end = toWorld(src[src.length - 1].p), lp = res.landing?.point ?? end, ld = new THREE.Group(), base = lp.clone(); base.y = Math.max(base.y, ground)
      ld.add(cubes(geo, lam(color), column(base.x, base.z, base.y + 0.6, base.y + 7, 1.1), 0.45))
      ld.add(tag(res.verdict.kind === 'GONE' ? 'LANDED' : 'CAME DOWN', `${Math.round(res.landFt)} FT`, base.clone().add(new THREE.Vector3(0, 8, 0)), color, -1)) // to the left: the clearance tag sits to the right
      g.add(ld); g.userData.reveal.push([0.985, ld])
    }
    // the ghost: while you tweak a real home run, the real flight stays up as faint cubes, so your change reads against it
    if (ghost && ghost.length > 2) { const gc = new THREE.CatmullRomCurve3(ghost), gl = gc.getLength(); g.add(cubes(geo, lam(c.dim), gc.getSpacedPoints(Math.max(2, Math.round(gl / 2.2))), 0.32)) }
    for (const [, o] of g.userData.reveal) o.visible = !!preview || window.__fixedTime !== undefined
    last = g
    return g
  }
  // as the ball flies (fraction f of the flight): posts appear when the ball passes them; the comet head follows the ball
  function reveal(f) {
    if (!last) return
    for (const [at, o] of last.userData.reveal) if (f >= at) o.visible = true
    const h = last.userData.comet
    if (h) {
      const P = h.userData.comet, n = Math.round((60 * FT) / 0.5), end = Math.floor(f * (P.length - 1)), m4 = new THREE.Matrix4()
      for (let i = 0; i < n; i++) { const k = Math.max(0, end - n + 1 + i), s = 0.4 + 1.1 * (i / n); m4.makeScale(s, s, s).setPosition(P[k]); h.setMatrixAt(i, m4) }
      h.instanceMatrix.needsUpdate = true
    }
  }
  function done() { if (last) for (const [, o] of last.userData.reveal) o.visible = true }
  return { track, reveal, done, setStyle(c) { style = c }, style: () => style, last: () => last, setGhost(p) { ghost = p }, ghost: () => ghost }
}
