// Study 25 voxel kit (28 Oct, night, Andrew: "every single thing on the field that is real or shown as a 3D thing should be voxel 3D art"): lettering, posts and markers
// built from cubes, so the numbers in the park match the voxel kayaks, gloves and sea lion. One InstancedMesh per piece and color, flat Lambert like models25.js, so the
// park's lights shade the faces and the post shader inks the outline.
// FONT: 5 wide by 7 tall, # is a cube.
import { ORANGE } from './orange25.js'
import { parkHit } from '../seance.js'
export const FONT = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'], J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'], '.': ['.', '.', '.', '.', '.', '.', '#'], ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '-': ['....', '....', '....', '####', '....', '....', '....'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  "'": ['#', '#', '.', '.', '.', '.', '.'], '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'], '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ':': ['.', '#', '.', '.', '.', '#', '.'], '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
}
const cubes = new Map()
const unit = (THREE) => { if (!cubes.has(THREE)) cubes.set(THREE, new THREE.BoxGeometry(1, 1, 1)); return cubes.get(THREE) }
const mats = new Map()
const lambert = (THREE, color) => { const k = String(color); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, flatShading: true, fog: false })); return mats.get(k) }

// cells: [[x, y, z, color]] in voxel units, z toward the viewer; one InstancedMesh per color, centered on x, standing on y = 0
export function voxCells(THREE, cells, px = 1) {
  const g = new THREE.Group(), by = new Map()
  for (const c of cells) { const k = c[3]; if (!by.has(k)) by.set(k, []); by.get(k).push(c) }
  const xs = cells.map((c) => c[0]), cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const m4 = new THREE.Matrix4()
  for (const [color, list] of by) {
    const im = new THREE.InstancedMesh(unit(THREE), lambert(THREE, color), list.length)
    list.forEach(([x, y, z], i) => { m4.makeScale(px, px, px).setPosition((x - cx) * px, (y + 0.5) * px, z * px); im.setMatrixAt(i, m4) })
    im.userData.vox = true // shared cube and materials: callers that dispose on clear skip these
    g.add(im)
  }
  return g
}
// a line of text in voxels, 7 cubes tall (px meters each), one cube deep, standing on its base; o.back adds a darker slab behind it so it reads over the stands
export function voxText(THREE, text, o = {}) {
  const px = o.px ?? 1, color = o.color ?? ORANGE.o, cells = []
  let x = 0
  for (const ch of String(text).toUpperCase()) {
    const rows = FONT[ch] ?? FONT[' ']
    rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') cells.push([x + i, 6 - j, 0, color]) }))
    x += rows[0].length + 1
  }
  if (o.back) { const w = x - 1; for (let i = -1; i <= w; i++) for (let j = -1; j <= 7; j++) cells.push([i, j, -1, o.back]) }
  const g = voxCells(THREE, cells, px)
  g.userData.width = (x - 1) * px
  return g
}
// a dotted voxel post from a to b (world points), cubes of px meters every gap meters: the zenith and clearance lines, the landing-party stakes
export function voxPost(THREE, a, b, o = {}) {
  const px = o.px ?? 0.5, gap = o.gap ?? 1.6, len = a.distanceTo(b), n = Math.max(1, Math.floor(len / gap))
  const im = new THREE.InstancedMesh(unit(THREE), lambert(THREE, o.color ?? '#e8e1c9'), n + 1), m4 = new THREE.Matrix4(), p = new THREE.Vector3()
  for (let i = 0; i <= n; i++) { p.lerpVectors(a, b, i / n); m4.makeScale(px, px, px).setPosition(p); im.setMatrixAt(i, m4) }
  im.userData.vox = true
  const g = new THREE.Group(); g.add(im)
  return g
}
// a cube at each world point (px meters, or o.size(i) per point)
export function voxDots(THREE, pts, o = {}) {
  const im = new THREE.InstancedMesh(unit(THREE), lambert(THREE, o.color ?? '#e8e1c9'), Math.max(1, pts.length)), m4 = new THREE.Matrix4()
  pts.forEach((p, i) => { const s = o.size?.(i) ?? o.px ?? 0.5; m4.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m4) })
  im.count = pts.length
  im.userData.vox = true
  return im
}
// turn a piece to face the camera about the vertical only, so lettering stands upright
export function faceCam(g, camera) { g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z) }
// lettering that stays readable as the camera moves (the broadcast seat is 300 m away, a LOOK close-up 80 m): every frame each registered piece faces the camera and
// takes a scale in proportion to its distance (ref meters = scale 1), within lo and hi; pieces that have left the scene drop out
// 30 Oct (Andrew: "texts all the fuck over the place over each other"): they also keep out of each other's way. Each piece has a priority (o.prio, higher wins); after
// scaling, its box is taken on screen, and a piece that would touch a higher one steps up a line at a time (up to five) and is hidden if there is still no room.
// o.fixed pieces (the Seance ghost and its sign, the scoreboard) hold their place and only reserve room; o.scale false leaves the size alone. A piece also has to stay
// inside the park's open window (window.__cpWindow), so it tries a step to either side as well as up before it stands down
const readers = new Set()
let hooked = false
export function keepReadable(api, g, ref = 230, lo = 0.35, hi = 2.6, o = {}) {
  g.userData.read = { ref, lo, hi, prio: o.prio ?? 1, fixed: !!o.fixed, scale: o.scale !== false, base: g.position.clone(), box: null, off: false, rect: null }
  readers.add(g)
  if (hooked) return g
  hooked = true
  const THREE = api.NN.THREE, cam = api.NN.camera, w = new THREE.Vector3(), v = new THREE.Vector3(), inv = new THREE.Matrix4(), m = new THREE.Matrix4()
  const shown = (r) => { for (let p = r; p; p = p.parent) if (!p.visible && !(p === r && p.userData.read.off)) return false; return true }
  // the piece's own box, in its own frame, once (its contents never change after it is made)
  const localBox = (r) => {
    const b = new THREE.Box3(), t = new THREE.Box3()
    r.updateMatrixWorld(true); inv.copy(r.matrixWorld).invert()
    r.traverse((c) => { if (!c.geometry || c === r) return; if (c.isInstancedMesh) c.computeBoundingBox(); else c.geometry.computeBoundingBox(); t.copy(c.isInstancedMesh ? c.boundingBox : c.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, c.matrixWorld)); b.union(t) })
    return b.isEmpty() ? null : b
  }
  const rectOf = (r) => {
    const b = r.userData.read.box
    if (!b) return null
    r.updateMatrixWorld(true)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(r.matrixWorld).project(cam)
      if (v.z > 1) return null // behind the camera
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y)
    }
    return { x0, x1, y0, y1 }
  }
  const hits = (a, list) => list.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0)
  const win = () => { const W = window.__cpWindow; return W ? { x0: (2 * W.l) / innerWidth - 1, x1: 1 - (2 * W.r) / innerWidth, y0: (2 * W.b) / innerHeight - 1, y1: 1 - (2 * W.t) / innerHeight } : { x0: -1, x1: 1, y0: -1, y1: 1 } }
  const cc = new THREE.Vector3(), dv = new THREE.Vector3(), pw = new THREE.Vector3()
  const TRY = [[0, 0], [0, 1], [-1, 0], [1, 0], [0, 2], [-1, 1], [1, 1], [-2, 0], [2, 0], [0, 3], [-2, 1], [2, 1], [0, 4], [0, 5]], side = new THREE.Vector3()
  api.NN.frames.push(() => {
    const live = []
    for (const r of readers) {
      let root = r; while (root.parent) root = root.parent
      if (root !== api.NN.scene) { readers.delete(r); continue } // its group left the scene
      live.push(r)
    }
    live.sort((a, b) => (b.userData.read.fixed - a.userData.read.fixed) || (b.userData.read.prio - a.userData.read.prio))
    const placed = [], wb = win(), out = (a) => a.x0 < wb.x0 || a.x1 > wb.x1 || a.y0 < wb.y0 || a.y1 > wb.y1
    side.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize()
    for (const r of live) {
      const o = r.userData.read
      if (!shown(r)) { o.rect = null; continue }
      if (o.pulled) { r.position.copy(o.base); o.pulled = false } // (last frame's pull in front of the park is undone first: its size comes from where it really is)
      if (o.scale) {
        r.getWorldPosition(w)
        r.scale.setScalar(Math.min(o.hi, Math.max(o.lo, cam.position.distanceTo(w) / o.ref)))
        r.rotation.y = Math.atan2(cam.position.x - w.x, cam.position.z - w.z)
      }
      if (!o.box) { const p = r.position.clone(), q = r.quaternion.clone(), s = r.scale.clone(); r.position.set(0, 0, 0); r.quaternion.identity(); r.scale.setScalar(1); o.box = localBox(r) ?? new THREE.Box3(); r.position.copy(p); r.quaternion.copy(q); r.scale.copy(s) }
      if (o.fixed) { o.rect = rectOf(r); if (o.rect) placed.push(o.rect); continue }
      const step = (o.box.max.y - o.box.min.y) * r.scale.y * 1.15, across = (o.box.max.x - o.box.min.x) * r.scale.x * 0.6
      let rect = null, bad = true
      for (const [dx, dy] of TRY) {
        r.position.copy(o.base).addScaledVector(side, dx * across); r.position.y += dy * step
        rect = rectOf(r)
        bad = !!rect && (hits(rect, placed) || out(rect))
        if (!rect || !bad) break
      }
      o.off = !!rect && bad
      r.visible = !o.off
      o.rect = o.off ? null : rect
      if (rect && !o.off) placed.push(rect)
      if (!o.off && o.clear !== false && o.box) { // in front of whatever stands between it and the camera
        r.updateMatrixWorld(true)
        const b = o.box, mx = (b.min.x + b.max.x) / 2, my = (b.min.y + b.max.y) / 2, mz = (b.min.z + b.max.z) / 2
        let k = 1
        for (const [x, y, z] of [[mx, my, mz], [b.min.x, b.min.y, mz], [b.max.x, b.min.y, mz], [mx, b.min.y, mz], [b.min.x, b.max.y, mz], [b.max.x, b.max.y, mz]]) {
          cc.set(x, y, z).applyMatrix4(r.matrixWorld)
          const d = cam.position.distanceTo(cc), hit = parkHit(api.NN, cam.position, dv.copy(cc).sub(cam.position).normalize(), d)
          if (hit && hit.distance < d - 0.5) k = Math.min(k, (hit.distance - 2.5) / d)
        }
        if (k < 1) { k = Math.max(0.15, k); const wp = r.getWorldPosition(pw); wp.sub(cam.position).multiplyScalar(k).add(cam.position); if (r.parent) r.parent.worldToLocal(wp); r.position.copy(wp); r.scale.multiplyScalar(k); o.pulled = true }
      }
    }
  })
  return g
}
// for the tests: every piece on screen now, with its box (normalized device coordinates) and whether it stood down
export function readable() { return [...readers].map((r) => ({ ln: !!r.userData.landNumber, prio: r.userData.read.prio, fixed: r.userData.read.fixed, off: r.userData.read.off, rect: r.userData.read.rect })) }
export function disposeVox(g) { g?.parent?.remove(g) } // geometry and materials are shared; nothing to free
export const VOX_FONT = FONT
