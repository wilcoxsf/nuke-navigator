// THE WALL IT WENT OVER (9 Nov, Andrew: "my idea is we draw the over the wall line in the actual stadium that it went over in that team's color if it was an away bomb
// too. Oracle over the wall still stays and is always green. Amazing comparison point immediately - could immediately grok 'oh there was the wall for this HR IRL'").
// An away home run in DEJA-VU flies over Oracle as always; this lays the wall of the park it was really hit in over Oracle's field, foul pole to foul pole, in that
// team's color: a line of cubes along the top of that wall, thin posts down its face so its height reads, and a post where this flight crossed it, from the top
// of that wall up to the ball, tagged with the park and the feet it cleared by there. Oracle's own clearance post (flight25.js) stays green.
// The wall is the one that park had THAT season (public/fences_by_year.json from science/build_fences_by_year.py: Camden Yards before 2025, Kauffman before 2026,
// the Coliseum, Steinbrenner Field in 2025), else the park's measured crest (public/parks/<TEAM>/crest.json) through core.js wallFnOf.
import { voxText, keepReadable } from './vox25.js'
import { voxDigits } from './landnum25.js'

const FT = 0.3048
const ALIAS = { AZ: 'ARI', OAK: 'ATH' }

export function initAwayWall25(api, { parks, wallFnOf }) {
  const { THREE, scene } = api.NN
  const toWorld = (p) => api.toWorld(p)
  let fences = null, g = null, key = ''
  fetch('/fences_by_year.json').then((r) => (r.ok ? r.json() : null)).then((d) => { fences = d }).catch(() => {})

  // the wall of a ball's park as it stood that season: [fn(bearing) -> [feet out, feet high], the park's name], or null when we do not know it
  function wallOf(b) {
    const team = ALIAS[b.park] ?? b.park, yr = String(b.d ?? '').slice(0, 4)
    const f = fences?.fences?.[`${team}:${yr}`], p = parks?.parks?.find((x) => x.abbr === team)
    if (f && !f.same_as_crest) return [wallFnOf({ bearings: fences.bearings }, { abbr: team, dist: f.dist, height: f.height }), f.venue]
    if (p) return [wallFnOf(parks, p), f?.venue ?? p.name]
    return null
  }
  function drop() {
    if (!g) return
    g.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m?.map?.dispose(); m?.dispose() }) } })
    g.parent?.remove(g); g = null
  }
  function cubes(color, pts, size) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color, flatShading: true, fog: false }), Math.max(1, pts.length)), m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { m4.makeScale(size, size, size).setPosition(p); im.setMatrixAt(i, m4) })
    im.count = pts.length; im.frustumCulled = false
    return im
  }
  const at = (ft, hFt, bear) => { const r = (bear * Math.PI) / 180; return toWorld([ft * FT * Math.sin(r), ft * FT * Math.cos(r), hFt * FT]) }
  function tag(small, big, pos, color) {
    const t = new THREE.Group(), inner = new THREE.Group(), px = 0.75, col = new THREE.Color(color), face = '#' + col.getHexString(), side = '#' + col.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString()
    const d = voxDigits(THREE, big, px, face, side), unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' }), cap = voxText(THREE, small, { px: px * 0.32, color: '#e8e1c9' })
    unit.position.set(d.userData.width / 2 + px * 2.6, 0, 0); cap.position.set(0, px * 8.4, 0)
    inner.add(d, unit, cap); inner.rotation.y = 0.3; inner.position.x = -(d.userData.width / 2 + px * 3) // (to the camera's left: Oracle's own tag stands to the right)
    t.add(inner); t.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0)); t.userData.isTag = true; t.userData.vtag = [small, big + ' FT']
    keepReadable(api, t, 230, 0.45, 2.6, { prio: 2 })
    return t
  }

  // show(ball, color): the away ball's real wall; anything else (an Oracle ball, no ball, a park we do not know) clears it
  function show(b, color) {
    const w = b && b.park && b.park !== 'SF' ? wallOf(b) : null
    const k = w ? `${b.park}|${b.d}|${b.ev}|${b.la}|${b.dir}|${color}|${fences ? 1 : 0}` : ''
    if (k === key) return g
    key = k; drop()
    if (!w) return null
    const [fn, venue] = w, ground = toWorld([0, 0, 0]).y + 0.3, dark = '#' + new THREE.Color(color).lerp(new THREE.Color('#000000'), 0.45).getHexString()
    g = new THREE.Group(); g.name = 'awaywall25'
    const top = [], face = []
    for (let br = -45; br <= 45.001; br += 0.5) { const [ft, h] = fn(br); top.push(at(ft, h, br)) }
    for (let br = -45; br <= 45.001; br += 3) { const [ft, h] = fn(br), q = at(ft, h, br); for (let y = ground; y < q.y - 0.4; y += 0.7) face.push(new THREE.Vector3(q.x, y, q.z)) }
    g.add(cubes(color, top, 0.62), cubes(dark, face, 0.3))
    // where this flight crossed that wall, and by how much it cleared it there
    const res = api.fly({ ...api.state }), src = res?.visPath ?? res?.path ?? []
    const ci = src.findIndex((s) => { const br = (Math.atan2(s.p[0], s.p[1]) * 180) / Math.PI; return Math.hypot(s.p[0], s.p[1]) / FT >= fn(br)[0] })
    if (ci > 0) {
      const q = src[ci].p, br = (Math.atan2(q[0], q[1]) * 180) / Math.PI, [, h] = fn(br), wt = toWorld([q[0], q[1], h * FT]), ball = toWorld([q[0], q[1], q[2]])
      const lo = Math.min(wt.y, ball.y), hi = Math.max(wt.y, ball.y), post = []
      for (let y = lo; y <= hi; y += 0.8) post.push(new THREE.Vector3(wt.x, y, wt.z))
      g.add(cubes(color, post, 0.5), cubes(color, [ball], 1.4))
      const by = Math.round(q[2] / FT - h)
      g.add(tag(`AT ${String(venue).toUpperCase()}`, `${by >= 0 ? '+' : ''}${by}`, new THREE.Vector3(wt.x, hi + 1, wt.z), color))
      g.userData.cross = { bearing: br, wallFt: Math.round(Math.hypot(q[0], q[1]) / FT), wallH: h, clearBy: by }
    }
    g.userData.venue = venue
    scene.add(g)
    return g
  }
  return { show, clear: () => { key = ''; drop() }, now: () => (g ? { venue: g.userData.venue, cross: g.userData.cross ?? null } : null) }
}
