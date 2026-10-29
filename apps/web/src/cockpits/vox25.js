// Study 25 voxel kit (28 Oct, night, Andrew: "every single thing on the field that is real or shown as a 3D thing should be voxel 3D art"): lettering, posts and markers
// built from cubes, so the numbers in the park match the voxel kayaks, gloves and sea lion. One InstancedMesh per piece and color, flat Lambert like models25.js, so the
// park's lights shade the faces and the post shader inks the outline.
// FONT: 5 wide by 7 tall, # is a cube.
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
  const px = o.px ?? 1, color = o.color ?? '#f0802a', cells = []
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
const readers = new Set()
let hooked = false
export function keepReadable(api, g, ref = 230, lo = 0.35, hi = 2.6) {
  g.userData.read = { ref, lo, hi }
  readers.add(g)
  if (hooked) return g
  hooked = true
  const cam = api.NN.camera, w = new api.NN.THREE.Vector3()
  api.NN.frames.push(() => {
    for (const r of readers) {
      let root = r; while (root.parent) root = root.parent
      if (root !== api.NN.scene) { readers.delete(r); continue } // its group left the scene
      const o = r.userData.read
      r.getWorldPosition(w)
      r.scale.setScalar(Math.min(o.hi, Math.max(o.lo, cam.position.distanceTo(w) / o.ref)))
      r.rotation.y = Math.atan2(cam.position.x - w.x, cam.position.z - w.z)
    }
  })
  return g
}
export function disposeVox(g) { g?.parent?.remove(g) } // geometry and materials are shared; nothing to free
export const VOX_FONT = FONT
