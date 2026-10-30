// Study 25 infield in voxels (29 Oct, later, Andrew: "Give me a raised voxel mound, voxel bases"). A pitcher's mound of stacked dirt cubes, raised higher than the
// real 10 inches so it reads from the broadcast seat, the rubber on top; the three bases as fat white voxel bags and home plate as a voxel pentagon. All in the plate
// frame the flights use (toWorld: x to the right, y toward center field, z up), so they sit on the markings.
const FT = 0.3048
export function initDiamond25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld, g = new THREE.Group(), cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D()
  const mat = {}, lam = (c) => (mat[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }))
  const groups = {}
  const put = (c, x, y, z, sx, sy, sz) => { (groups[c] ??= []).push([x, y, z, sx, sy, sz]) }
  // the mound: 18 ft across, centred 59 ft out, a dome 0.75 m high in 0.3 m cubes, two dirt tones; the rubber 24 by 6 inches, its front edge 60.5 ft out
  const MV = 0.3, R = 9 * FT, H = o.moundH ?? 0.75, cy = 59 * FT
  for (let x = -R; x <= R; x += MV) for (let y = -R; y <= R; y += MV) {
    const r = Math.hypot(x, y)
    if (r > R) continue
    const h = Math.max(MV * 0.5, H * (1 - (r / R) ** 2)), n = Math.max(1, Math.round(h / MV))
    for (let k = 0; k < n; k++) put((Math.round(x / MV) * 7 + Math.round(y / MV) * 3 + k) % 5 === 0 ? '#8f5f36' : '#a8703f', x, cy + y, MV * (k + 0.5), MV, MV, MV)
  }
  const top = H + 0.04
  put('#f4f2ea', 0, 60.5 * FT - 3 * 0.0254, top, 0.61, 0.15, 0.1)
  // the bases: 15-inch bags made 0.5 m and 0.16 m tall (a cartoon size), set as diamonds on the corners, 90 ft apart
  const c1 = [(90 * FT - 0.5 * FT) * Math.SQRT1_2, (90 * FT - 0.5 * FT) * Math.SQRT1_2], second = [0, Math.hypot(90 * FT, 90 * FT) - 0.35 * FT]
  const bag = (x, y) => { const B = 0.1; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (Math.abs(i) + Math.abs(j) <= 2.5) put(Math.abs(i) + Math.abs(j) === 2 ? '#d9d4c7' : '#f4f2ea', x + (i - j) * B * Math.SQRT1_2, y + (i + j) * B * Math.SQRT1_2, 0.08, B * 1.1, B * 1.1, 0.16) }
  bag(c1[0], c1[1]); bag(-c1[0], c1[1]); bag(...second)
  // home plate: the pentagon (17 inches across, the point toward the catcher) in 0.07 m cubes
  const IN = 0.0254, HV = 0.07
  for (let x = -8.5 * IN; x <= 8.5 * IN; x += HV) for (let y = 0; y <= 17 * IN; y += HV) { const inside = y >= 8.5 * IN || y >= Math.abs(x); if (inside) put('#f4f2ea', x, y, 0.03, HV, HV, 0.06) }
  for (const [c, list] of Object.entries(groups)) {
    const m = new THREE.InstancedMesh(cube, lam(c), list.length)
    list.forEach(([x, y, z, sx, sy, sz], i) => { const p = toWorld([x, y, z]); d.position.copy(p); d.scale.set(sx, sz, sy); d.updateMatrix(); m.setMatrixAt(i, d.matrix) })
    g.add(m)
  }
  scene.add(g)
  return { group: g, cubes: () => Object.values(groups).reduce((a, l) => a + l.length, 0), set visible(v) { g.visible = v } }
}
