// Study 25 landing number (1 Nov, Andrew: "I don't want 'landed' feet then it should just say the ft as a hover number. But chunky voxel, above where it landed"):
// the distance alone, in voxel digits three cubes deep (the face in its color, the sides darker), facing the camera at a readable size (vox25.js keepReadable).
// 2 Nov (Andrew: "I want count up with the number counting up the whole time, grey or pitch color when not a HR and then orange once it clears the wall"): it rides
// from the crack, counting the feet the ball has gone, in the pitch color until the ball clears the wall, then the hot color (COUNT-UP COLOR: orange or the nuke's
// GEIGER); when the ball comes down it settles on the landing's feet, with a little pop. The motion is on an inner group so the placement and the pop never fight.
// Two places (LANDING NUMBER, LN, in the side menu; 2 Nov, later: "count up directly over the ball and count up where it lands over the destination"):
//   2 OVER THE BALL: it moves with the ball, the height counting too ("a counter for both height and distance if it's riding"), then settles over the spot
//   3 OVER THE SPOT: it waits over where the ball will come down and counts up there
// 2 Nov, later (Andrew: "it is not riding the ball"): keepReadable put a piece back on the spot it was made at every frame, so a ride moved nothing. Its base moves
// with it now, and while it flies it is fixed (it holds its place, the other tags step round it) instead of stepping aside or standing down.
import { VOX_FONT, voxCells, voxText, voxPost, keepReadable } from './vox25.js'

export const LAND_LOOKS = [
  { c: 2, name: 'OVER THE BALL', desc: 'the count-up moves with the ball, its distance and its height, then settles over the spot where it came down' },
  { c: 3, name: 'OVER THE SPOT', desc: 'the count-up waits over the spot where the ball will come down, counting as it flies' },
]
// 2 Nov, later (Andrew, on a screengrab: "we can get it closer to the real landing location right?"): it settles 4 m over the spot, not 10, held there (it no longer
// steps aside for other pieces), with a dotted stake in its color down to where the ball came down
const DEEP = 3, RIDE = 5, LIFT = 4 // a deep digit; how far over the ball it rides and over the spot it settles (m)
const live = new Set()
let hooked = false
const shown = (g) => { for (let p = g; p; p = p.parent) if (!p.visible) return false; return true }

// one glyph's cells, three deep: the face at z 0, the sides behind it
function glyph(rows, face, side) {
  const out = []
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') for (let z = 0; z < DEEP; z++) out.push([i, 6 - j, -z, z === 0 ? face : side]) }))
  return out
}
function digits(THREE, text, px, face, side) {
  const g = new THREE.Group(), parts = []
  let x = 0
  for (const ch of String(text)) { const rows = VOX_FONT[ch] ?? VOX_FONT[' ']; parts.push({ ch, x, w: rows[0].length }); x += rows[0].length + 1 }
  const width = x - 1
  for (const p of parts) { const d = voxCells(THREE, glyph(VOX_FONT[p.ch], face, side), px); d.position.x = (p.x + p.w / 2 - width / 2) * px; g.add(d) } // centred on the whole number
  g.userData.width = width * px
  return g
}

// o: at (the landing spot, world), ft (the landing's feet), cool (its color before the wall), hot (after), gone (a home run), look, spot (counts over the spot),
// up (the height's color)
// the returned group's userData: ride(ft, pos, hot, upFt) while the ball flies (pos the ball, world; upFt its height, shown when riding), settle() when it comes down
export function landNumber(api, o) {
  const { THREE } = api.NN, ft = Math.round(o.ft), px = 1.1
  const dark = (c) => '#' + new THREE.Color(c).lerp(new THREE.Color('#000000'), 0.55).getHexString(), hex = (c) => '#' + new THREE.Color(c).getHexString()
  const outer = new THREE.Group(), inner = new THREE.Group()
  outer.add(inner)
  inner.rotation.y = -0.35 // turned a little off the camera, so the sides show and it reads as a block, not a sticker
  let num = null, key = '', upKey = '', upN = null
  const build = (n, color, up) => {
    const k = n + color, uk = up == null ? '' : String(up)
    if (k === key && uk === upKey) return
    if (num) inner.remove(num)
    key = k; upKey = uk
    num = digits(THREE, n, px, hex(color), dark(color))
    const unit = voxText(THREE, 'FT', { px: px * 0.45, color: '#e8e1c9' }); unit.position.set(num.userData.width / 2 + px * 3, 0, 0); num.add(unit)
    // the height, a smaller line over the distance: its digits in the zenith post's color, FT HIGH in bone
    upN = null
    if (up != null) {
      const h = new THREE.Group(), d = digits(THREE, up, px * 0.5, hex(o.up ?? '#e8e1c9'), dark(o.up ?? '#e8e1c9')), w = voxText(THREE, 'FT HIGH', { px: px * 0.3, color: '#e8e1c9' })
      d.position.x = -w.userData.width / 2 - px; w.position.x = d.userData.width / 2 + px * 0.5
      h.add(d, w); h.position.y = px * 9; num.add(h); upN = up
    }
    inner.add(num)
    if (outer.userData.read) outer.userData.read.box = null // its size changed: keepReadable measures it again
  }
  const place = (v) => { outer.position.copy(v); outer.userData.read?.base.copy(v) }
  const at = o.at.clone()
  let stake = null
  const settle = () => {
    place(at.clone().add(new THREE.Vector3(0, LIFT, 0))); build(ft, o.gone ? o.hot : o.cool, null); outer.userData.settled = performance.now()
    if (!stake && outer.parent) { stake = voxPost(THREE, at, at.clone().add(new THREE.Vector3(0, LIFT - 0.4, 0)), { px: 0.35, gap: 0.8, color: hex(o.gone ? o.hot : o.cool) }); stake.userData.stake = true; outer.parent.add(stake) }
  }
  const ride = (n, pos, hot, up) => {
    if (outer.userData.settled) return
    place(o.spot ? at.clone().add(new THREE.Vector3(0, LIFT, 0)) : pos.clone().add(new THREE.Vector3(0, RIDE, 0)))
    build(Math.max(0, Math.round(n)), hot ? o.hot : o.cool, o.spot || up == null ? null : Math.max(0, Math.round(up)))
  }
  ride(0, o.from ?? at, false, 0)
  outer.userData.isTag = true
  outer.userData.landNumber = { look: o.look ?? 2, ft }
  keepReadable(api, outer, 230, 0.45, 3, { prio: 2, fixed: true })
  const g = new THREE.Group()
  g.add(outer)
  g.userData.ride = ride
  g.userData.settle = settle
  // for the tests: the number, its color, the height it shows (null when none), and where it is in the world after the frame's placing
  g.userData.num = () => ({ n: Number(key.match(/^\d+/)?.[0]), color: key.replace(/^\d+/, ''), up: upN, settled: !!outer.userData.settled, pos: outer.getWorldPosition(new THREE.Vector3()), shown: shown(outer) })
  // the pop as it settles
  outer.userData.tick = (now) => {
    if (!shown(outer) || !outer.userData.settled) return
    const t = (now - outer.userData.settled) / 1000
    inner.scale.setScalar(t < 0.35 ? 1 + 0.2 * Math.sin((t / 0.35) * Math.PI) : 1)
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
