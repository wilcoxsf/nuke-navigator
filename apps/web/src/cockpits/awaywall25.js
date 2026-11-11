// THE WALL IT WENT OVER (9 Nov, Andrew: "my idea is we draw the over the wall line in the actual stadium that it went over in that team's color if it was an away bomb
// too. Oracle over the wall still stays and is always green. Amazing comparison point immediately - could immediately grok 'oh there was the wall for this HR IRL'").
// An away home run in DEJA-VU flies over Oracle as always; this lays the wall of the park it was really hit in over Oracle's field, foul pole to foul pole, in that
// team's color: a line of cubes along the top of that wall (drawn over the park, so the arcade never hides it) and thin posts down its face so its height reads.
// When the ball is hit (9 Nov, later: "how much it cleared by should still only show up when you hit the ball"), a post rises where the flight crosses that wall,
// from its top up to the ball, with the words: CLEARED THE COORS FIELD WALL BY 23 FT ("I don't understand what the like +X feet means"). The crossing is the same
// flight flown against that park's own wall (dojo.js fly with wallFn), interpolated as Oracle's own post is. A real home run the model flies a hair short or level
// at that wall (7 of 316) says JUST OVER THE ... WALL: it went out, and a number under zero would say it did not.
// The wall is the one that park had THAT season (public/fences_by_year.json from science/build_fences_by_year.py: Camden Yards before 2025, Kauffman before 2026,
// the Coliseum, Steinbrenner Field in 2025), else the park's measured crest (public/parks/<TEAM>/crest.json) through core.js wallFnOf.
// Red team (9 Nov, later): the shared voxel cube and materials of vox25 are never freed here; the wall redraws when the season table or the park's crest arrives.
import { voxText, keepReadable } from './vox25.js'
import { voxDigits } from './landnum25.js'

const FT = 0.3048
const ALIAS = { AZ: 'ARI', OAK: 'ATH' }
const SHORT = { 'ORIOLE PARK AT CAMDEN YARDS': 'CAMDEN YARDS', 'GEORGE M. STEINBRENNER FIELD': 'STEINBRENNER FIELD', 'UNIQLO FIELD AT DODGER STADIUM': 'DODGER STADIUM',
  'RINGCENTRAL COLISEUM': 'THE COLISEUM', 'OAKLAND COLISEUM': 'THE COLISEUM', 'O.CO COLISEUM': 'THE COLISEUM' }
const shortName = (v) => { const u = String(v ?? '').toUpperCase(); return SHORT[u] ?? u }

export function initAwayWall25(api, { parks, wallFnOf, onData }) {
  const { THREE, scene } = api.NN
  const toWorld = (p) => api.toWorld(p)
  let fences = null, g = null, cl = null, key = '', crossT = Infinity, hang = 1
  fetch('/fences_by_year.json').then((r) => (r.ok ? r.json() : null)).then((d) => { fences = d; onData?.() }).catch(() => {})
  // a park's crest loads behind the page (core.js): when the shown ball's arrives, draw it again
  let watch = 0
  setInterval(() => { if (!g || watch > 40) return; watch++; const t = g.userData.team; if (t && !g.userData.crest && parks?.crests?.[t]) onData?.() }, 1500)

  function wallOf(b) {
    const team = ALIAS[b.park] ?? b.park, yr = String(b.d ?? '').slice(0, 4)
    const f = fences?.fences?.[`${team}:${yr}`], p = parks?.parks?.find((x) => x.abbr === team)
    const now = fences?.fences?.[`${team}:2026`]
    if (f && !f.same_as_crest && p && now && f.venue === now.venue && parks?.crests?.[team]) { // (10 Nov) the same park, its fence moved: today's crest, shifted by Savant's change between that season and today (as science/otherpark_study.py flies it)
      const today = wallFnOf(parks, p), then = wallFnOf({ bearings: fences.bearings }, { abbr: team, dist: f.dist, height: f.height }), was = wallFnOf({ bearings: fences.bearings }, { abbr: team, dist: now.dist, height: now.height })
      return { fn: (br) => { const c = today(br), a = then(br), z = was(br); return [c[0] + a[0] - z[0], Math.max(1, c[1] + a[1] - z[1])] }, venue: f.venue, team, crest: true }
    }
    if (f && !f.same_as_crest) return { fn: wallFnOf({ bearings: fences.bearings }, { abbr: team, dist: f.dist, height: f.height }), venue: f.venue, team, crest: !(now && f.venue === now.venue) } // (crest false: the same park's crest is still loading; draw it again when it comes)
    if (p) return { fn: wallFnOf(parks, p), venue: f?.venue ?? p.name, team, crest: !!parks?.crests?.[team] }
    return null
  }
  function drop() {
    if (!g) return
    g.traverse((o) => { if (o.isMesh && !o.userData.vox) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m?.map?.dispose(); m?.dispose() }) } })
    g.parent?.remove(g); g = null; cl = null; crossT = Infinity
  }
  function cubes(color, pts, size, over = false) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color, flatShading: true, fog: false, depthTest: !over }), Math.max(1, pts.length)), m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { m4.makeScale(size, size, size).setPosition(p); im.setMatrixAt(i, m4) })
    im.count = pts.length; im.frustumCulled = false; if (over) im.renderOrder = 3
    return im
  }
  const at = (ft, hFt, bear) => { const r = (bear * Math.PI) / 180; return toWorld([ft * FT * Math.sin(r), ft * FT * Math.cos(r), hFt * FT]) }
  function tag(small, big, pos, color) {
    const t = new THREE.Group(), inner = new THREE.Group(), px = 0.75, col = new THREE.Color(color), face = '#' + col.getHexString(), side = '#' + col.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString()
    const cap = voxText(THREE, small, { px: px * 0.32, color: '#e8e1c9' })
    if (big != null) {
      const d = voxDigits(THREE, big, px, face, side), unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' })
      unit.position.set(d.userData.width / 2 + px * 2.6, 0, 0); cap.position.set(0, px * 8.4, 0); inner.add(d, unit, cap); inner.position.x = -(d.userData.width / 2 + px * 3)
    } else { inner.add(cap); inner.position.x = -px * 6 }
    inner.rotation.y = 0.3 // (to the camera's left: Oracle's own tag stands to the right)
    t.add(inner); t.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0)); t.userData.isTag = true; t.userData.vtag = [small, big == null ? '' : big + ' FT']
    keepReadable(api, t, 230, 0.45, 2.6, { prio: 2 })
    return t
  }

  // show(ball, color): the away ball's real wall; anything else (an Oracle ball, no ball, a park we do not know) clears it. The crossing post waits for the swing.
  // (10 Nov, evening; GPT red team 3) the wall is kept while the park, season and color stay; the crossing is redone whenever anything that moves the flight changes
  // (speed, angle, aim, air, wind both ways, the hand, the carry), not only the first three
  // (10 Nov, evening, Andrew: "I think the fenway wall is broken it has lines dropping down from the wall"): the face is a dark sheet, not posts every 3 degrees,
  // which read as drips on the Green Monster's 38 ft
  let wkey = ''
  const dispose = (root) => root?.traverse((o) => { if (o.isMesh && !o.userData.vox) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m?.map?.dispose(); m?.dispose() }) } })
  function show(b, color) {
    const w = b && b.park && b.park !== 'SF' ? wallOf(b) : null
    const s = api.state
    const wk = w ? `${b.park}|${b.d}|${color}|${fences ? 1 : 0}|${w.crest ? 1 : 0}` : ''
    const k = w ? [wk, s.ev, s.la, s.dir, s.temp, s.wind, s.xwind ?? 0, s.hand, s.carry, s.dws ?? 0, s.tab ? 1 : 0, s.carryOverride ?? ''].join('|') : ''
    if (k === key) return g
    key = k
    if (!w) { wkey = ''; drop(); return null }
    const { fn, venue } = w
    if (wk !== wkey || !g) {
      drop(); wkey = wk
      const ground = toWorld([0, 0, 0]).y + 0.3, dark = '#' + new THREE.Color(color).lerp(new THREE.Color('#000000'), 0.45).getHexString()
      g = new THREE.Group(); g.name = 'awaywall25'; g.userData.team = w.team; g.userData.crest = w.crest
      const top = [], pos = []
      for (let br = -45; br <= 45.001; br += 0.5) { const [ft, h] = fn(br); top.push(at(ft, h, br)) }
      for (let i = 0; i < top.length - 1; i++) { const a = top[i], c = top[i + 1]; pos.push(a.x, a.y - 0.3, a.z, c.x, c.y - 0.3, c.z, c.x, ground, c.z, a.x, a.y - 0.3, a.z, c.x, ground, c.z, a.x, ground, a.z) }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      const sheet = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: dark, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, fog: false })); sheet.frustumCulled = false
      g.add(cubes(color, top, 0.62, true), sheet)
      g.userData.venue = venue
      scene.add(g)
    }
    // the same flight against that park's wall: where it crosses, and by how much
    if (cl) { cl.parent?.remove(cl); dispose(cl); cl = null } crossT = Infinity; delete g.userData.cross
    const res = api.fly({ ...s }, { wallFn: fn }), v = res?.verdict, P = res?.path ?? []
    hang = Math.max(0.1, api.fly({ ...s }).hang ?? 1) // (the flight on the screen is Oracle's: the post comes up when its ball reaches the crossing time)
    if (v && v.wallFt && v.cross != null && (v.kind === 'GONE' || v.kind === 'WALL')) {
      let i = P.findIndex((q) => Math.hypot(q.p[0], q.p[1]) / FT >= v.wallFt)
      if (i < 1) i = 1
      const a = P[i - 1], c = P[i], ra = Math.hypot(a.p[0], a.p[1]) / FT, rc = Math.hypot(c.p[0], c.p[1]) / FT, f = rc > ra ? (v.wallFt - ra) / (rc - ra) : 0
      const x = a.p[0] + (c.p[0] - a.p[0]) * f, y = a.p[1] + (c.p[1] - a.p[1]) * f
      crossT = a.t + (c.t - a.t) * f
      const wt = toWorld([x, y, v.wallH * FT]), ball = toWorld([x, y, v.cross * FT]), lo = Math.min(wt.y, ball.y), hi = Math.max(wt.y, ball.y), post = []
      for (let yy = lo; yy <= hi; yy += 0.8) post.push(new THREE.Vector3(wt.x, yy, wt.z))
      const m = v.cross - v.wallH, by = Math.round(m), name = shortName(venue)
      cl = new THREE.Group(); cl.visible = false
      cl.add(cubes(color, post, 0.5), cubes(color, [ball], 1.4))
      const tp = new THREE.Vector3(wt.x, hi + 1, wt.z) // (a dojo swing can come up short of another park's wall; it says so; GPT red team 13: under a foot short is JUST SHORT, not a made-up foot)
      cl.add(v.kind === 'WALL' ? (m > -1 ? tag(`JUST SHORT OF THE ${name} WALL`, null, tp, color) : tag(`SHORT OF THE ${name} WALL BY`, String(-by), tp, color)) : by >= 2 ? tag(`CLEARED THE ${name} WALL BY`, String(by), tp, color) : tag(`JUST OVER THE ${name} WALL`, null, tp, color))
      g.add(cl)
      g.userData.cross = { wallFt: Math.round(v.wallFt), wallH: v.wallH, clearBy: by, kind: v.kind }
    }
    return g
  }
  return {
    show,
    // the swing: hide the post at the crack, show it when the ball reaches the crossing (fr: the fraction of the Oracle flight), and at the landing in any case
    fire() { if (cl) cl.visible = false },
    reveal(fr) { if (cl && !cl.visible && fr * hang >= crossT) cl.visible = true },
    done() { if (cl) cl.visible = true },
    clear: () => { key = ''; wkey = ''; drop() },
    venueOf: (b) => wallOf(b)?.venue ?? null, // (10 Nov: the park window's title for an away ball)
    now: () => (g ? { venue: g.userData.venue, cross: g.userData.cross ?? null, shown: !!cl?.visible } : null),
  }
}
