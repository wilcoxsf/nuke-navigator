// Study 25 landing number (1 Nov, Andrew: "I don't want 'landed' feet then it should just say the ft as a hover number. But chunky voxel, above where it landed. Give me
// like 5 options for this"): the distance alone, in voxel digits three cubes deep (the face in the verdict color, the sides darker), over the spot where the ball came
// down. It faces the camera and keeps a readable size (vox25.js keepReadable); the motion is on an inner group so the placement and the motion never fight. Five looks
// (LANDING NUMBER, LN, in THE LAB):
//   1 HOVER: a small FT beside it, a slow bob    2 COUNT-UP: counts from the wall's distance up to the landing, then a little pop    3 DROP-IN: the digits fall in one
//   at a time and squash as they land    4 BIG PRIME: bigger, a foot mark for the FT    5 PINNED: hovering on a dotted line down to the spot, a ring of cubes where it hit
import { VOX_FONT, voxCells, voxText, voxPost, keepReadable } from './vox25.js'

export const LAND_LOOKS = [
  { c: 1, name: 'HOVER', desc: 'the feet in chunky voxel digits over the spot, a small FT beside them, bobbing slowly' },
  { c: 2, name: 'COUNT-UP', desc: "the number counts up from the wall's distance to the landing as the ball comes down, then pops" },
  { c: 3, name: 'DROP-IN', desc: 'the digits fall in one at a time and squash as they land' },
  { c: 4, name: 'BIG PRIME', desc: 'bigger digits and a foot mark in place of FT' },
  { c: 5, name: 'PINNED', desc: 'the number on a dotted line down to the spot, a ring of cubes where it hit' },
]
const PRIME = ['.#', '.#', '#.', '..', '..', '..', '..']
const DEEP = 3
const live = new Set()
let hooked = false
const shown = (g) => { for (let p = g; p; p = p.parent) if (!p.visible) return false; return true }

// one glyph's cells, three deep: the face at z 0, the sides behind it
function glyph(rows, x0, face, side) {
  const out = []
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') for (let z = 0; z < DEEP; z++) out.push([x0 + i, 6 - j, -z, z === 0 ? face : side]) }))
  return out
}
function digits(THREE, text, px, face, side, prime) {
  const g = new THREE.Group(), parts = []
  let x = 0
  for (const ch of String(text)) { const rows = VOX_FONT[ch] ?? VOX_FONT[' ']; parts.push({ ch, x, w: rows[0].length }); x += rows[0].length + 1 }
  if (prime) { parts.push({ ch: "'", x, w: 2, rows: PRIME }); x += 3 }
  const width = x - 1
  // one group per glyph, so DROP-IN can move them one by one; centred on the whole number
  for (const p of parts) {
    const d = new THREE.Group(), cells = glyph(p.rows ?? VOX_FONT[p.ch], 0, face, side)
    const vc = voxCells(THREE, cells, px)
    d.add(vc); d.position.x = (p.x + p.w / 2 - width / 2) * px
    d.userData.glyph = true
    g.add(d)
  }
  g.userData.width = width * px
  return g
}

export function landNumber(api, o) {
  const { THREE } = api.NN, look = o.look ?? 1, ft = Math.round(o.ft), from = Math.round(Math.min(ft - 1, o.from ?? ft - 60))
  const face = new THREE.Color(o.color), side = '#' + face.clone().lerp(new THREE.Color('#000000'), 0.55).getHexString(), fc = '#' + face.getHexString()
  const px = look === 4 ? 1.45 : 1.1
  const outer = new THREE.Group(), inner = new THREE.Group()
  outer.add(inner)
  inner.rotation.y = -0.35 // turned a little off the camera, so the sides show and it reads as a block, not a sticker
  const at = o.at.clone(), lift = look === 5 ? 14 : 10
  outer.position.copy(at).add(new THREE.Vector3(0, lift, 0))
  let num = null
  const build = (n) => {
    if (num) inner.remove(num)
    num = digits(THREE, n, px, fc, side, look === 4)
    if (look !== 4) { const unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' }); unit.position.set(num.userData.width / 2 + px * 3, 0, 0); num.add(unit) }
    inner.add(num)
  }
  build(look === 2 ? from : ft)
  outer.userData.isTag = true
  outer.userData.landNumber = { look, ft }
  keepReadable(api, outer, 230, 0.45, 3, { prio: 2 })
  const g = new THREE.Group()
  g.add(outer)
  if (look === 5) { // the line down and the ring on the ground: in the park, not scaled
    const ground = at.clone()
    g.add(voxPost(THREE, ground.clone().add(new THREE.Vector3(0, 0.6, 0)), ground.clone().add(new THREE.Vector3(0, lift - 0.4, 0)), { px: 0.35, gap: 0.9, color: fc }))
    const ring = []
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ring.push([Math.round(Math.cos(a) * 4), 0, Math.round(Math.sin(a) * 4), fc]) }
    const r = voxCells(THREE, ring, 0.5); r.position.copy(ground).add(new THREE.Vector3(0, 0.05, 0)); g.add(r)
  }
  // the motion: from the first frame it is on screen
  let t0 = null, shownN = look === 2 ? from : ft
  outer.userData.tick = (now) => {
    if (!shown(outer)) return
    if (t0 == null) t0 = now
    const t = (now - t0) / 1000
    if (look === 1 || look === 4 || look === 5) inner.position.y = Math.sin(t * 1.7) * px * 0.9
    if (look === 2) {
      const k = Math.min(1, t / 0.9), n = Math.round(from + (ft - from) * (1 - (1 - k) ** 3))
      if (n !== shownN) { shownN = n; build(n) }
      const pop = t > 0.9 && t < 1.25 ? 1 + 0.18 * Math.sin(((t - 0.9) / 0.35) * Math.PI) : 1
      inner.scale.setScalar(pop)
    }
    if (look === 3) {
      num.children.filter((c) => c.userData.glyph).forEach((d, i) => {
        const s = t - i * 0.14, fall = 0.42
        if (s < 0) { d.visible = false; return }
        d.visible = true
        if (s < fall) { const u = s / fall; d.position.y = 14 * px * (1 - u * u); d.scale.set(1, 1, 1) }
        else { const u = Math.min(1, (s - fall) / 0.3); d.position.y = 0; const sq = Math.sin(u * Math.PI) * 0.35; d.scale.set(1 + sq * 0.5, 1 - sq, 1) }
      })
    }
  }
  live.add(outer)
  if (!hooked) {
    hooked = true
    api.NN.frames.push(() => {
      const now = performance.now()
      for (const n of live) { let r = n; while (r.parent) r = r.parent; if (r !== api.NN.scene && n.userData.seen) { live.delete(n); continue } if (r === api.NN.scene) n.userData.seen = true; n.userData.tick(now) }
    })
  }
  return g
}
