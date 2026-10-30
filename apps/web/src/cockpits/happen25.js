// Study 25 happenings around the park (29 Oct, later, Andrew: "more fun voxel happenings too"): things going on while nobody is swinging, all in cubes.
//   a Giants blimp circling high over the park, slowly, orange with SF on its side and a gondola under it
//   a ferry crossing the bay beyond right field, white with a blue stripe, a smokestack puffing
//   now and then a whale breaching beyond McCovey Cove: up out of the water, a slap and a splash
// Oracle only; nothing moves under reduced motion except the ferry, which glides.
import { WATER_Z } from './water25.js'
export function initHappen25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld, cube = new THREE.BoxGeometry(1, 1, 1)
  const matC = {}, lam = (c) => (matC[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }))
  const build = (cells, size) => { // [x, y, z, color] in cube units around the origin
    const g = new THREE.Group(), byC = {}, m4 = new THREE.Matrix4()
    for (const [x, y, z, c] of cells) (byC[c] ??= []).push([x, y, z])
    for (const [c, list] of Object.entries(byC)) { const m = new THREE.InstancedMesh(cube, lam(c), list.length); list.forEach(([x, y, z], i) => m.setMatrixAt(i, m4.makeScale(size, size, size).setPosition(x * size, y * size, z * size))); g.add(m) }
    scene.add(g); return g
  }
  const sea = toWorld([0, 0, WATER_Z]).y
  // ---- the blimp: an ellipsoid 22 cubes long, an orange band with SF on both sides, fins, a gondola ----
  const B = []
  for (let x = -11; x <= 11; x++) for (let y = -5; y <= 5; y++) for (let z = -5; z <= 5; z++) {
    const e = (x / 11) ** 2 + (y / 5) ** 2 + (z / 5) ** 2
    if (e > 1 || e < 0.6) continue
    const band = Math.abs(y) <= 1, sf = band && Math.abs(z) >= 4 && ((x >= -3 && x <= -1) || (x >= 1 && x <= 3)) && (y === 0 || x === -3 || x === 1)
    B.push([x, y, z, sf ? '#141414' : band ? '#fd5a1e' : '#d9dbe0'])
  }
  for (const [y, z] of [[0, 4], [0, -4], [4, 0], [-4, 0]]) for (let x = -13; x <= -10; x++) B.push([x, y + Math.sign(y) * (x + 13 > 1 ? 0 : 1), z + Math.sign(z) * (x + 13 > 1 ? 0 : 1), '#fd5a1e'])
  for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) B.push([x, -6, z, '#2b2e33'])
  const blimp = build(B, 1.4)
  const mid = toWorld([0, 90, 0])
  // ---- the ferry: a white hull 18 cubes long, a blue stripe, two decks of windows, a black and orange stack ----
  const F = []
  for (let x = -9; x <= 9; x++) for (let z = -3; z <= 3; z++) { const taper = Math.abs(x) > 7 ? Math.abs(x) - 7 : 0; if (Math.abs(z) > 3 - taper) continue; F.push([x, 0, z, '#f4f2ea'], [x, 1, z, Math.abs(z) === 3 - taper ? '#2f5bd3' : '#f4f2ea']) }
  for (let x = -6; x <= 5; x++) for (let z = -2; z <= 2; z++) for (let y = 2; y <= 3; y++) F.push([x, y, z, Math.abs(z) === 2 && x % 2 ? '#1f2a3a' : '#e9e6dc'])
  for (let y = 4; y <= 6; y++) F.push([1, y, 0, y === 6 ? '#fd5a1e' : '#141414'])
  const ferry = build(F, 1.2)
  // ---- the whale: a dark body 12 cubes long with a white belly and a fluke, breaching and falling back ----
  const Wc = []
  for (let x = -6; x <= 6; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) { if ((x / 6.5) ** 2 + (y / 2.5) ** 2 + (z / 2.5) ** 2 > 1) continue; Wc.push([x, y, z, y <= -1 && x > -4 ? '#e9e6dc' : '#3a4250']) }
  for (const z of [-3, -2, 2, 3]) Wc.push([-7, 0, z, '#3a4250']); Wc.push([5, 1, 2, '#111'], [5, 1, -2, '#111'])
  const whale = build(Wc, 1.1); whale.visible = false
  const splash = build(Array.from({ length: 14 }, (_, i) => [((i * 7) % 9) - 4, 0, ((i * 5) % 7) - 3, '#e9f2ff']), 0.9); splash.visible = false
  let t = 0, wall = performance.now(), nextWhale = o.whaleAt ?? 25, whaleT = -1, breaches = 0
  function step(dt) {
    t += dt
    // the blimp: a lap every four minutes, 120 m up, nose along its way
    const a = (t / 240) * Math.PI * 2, r = 230
    blimp.position.set(mid.x + Math.cos(a) * r, sea + 120 + Math.sin(t * 0.3) * 2, mid.z + Math.sin(a) * r); blimp.rotation.y = -a - Math.PI / 2 // nose along the circle
    // the ferry: across the bay beyond right field and back, a minute and a half each way
    const f = (t / 90) % 2, k = f < 1 ? f : 2 - f, p = toWorld([300, -150 + k * 650, WATER_Z + 0.6])
    ferry.position.copy(p); ferry.rotation.y = f < 1 ? Math.PI / 2 : -Math.PI / 2
    // the whale: up, a twist, a slap; every 50 to 80 s
    if (!o.still && whaleT < 0 && t > nextWhale) { whaleT = 0; breaches++; whale.visible = true; const w = toWorld([215 + Math.random() * 60, 230 + Math.random() * 120, WATER_Z]); whale.userData.at = w }
    if (whaleT >= 0) {
      whaleT += dt
      const u = whaleT / 2.6, w = whale.userData.at, h = Math.max(-6, 22 * u * (1 - u) * 4 - 6)
      whale.position.set(w.x + u * 6, sea + h, w.z); whale.rotation.z = 1.2 - u * 2.2; whale.rotation.x = u * 1.4
      splash.visible = u > 0.85 && u < 1.25; if (splash.visible) { splash.position.set(w.x + 6, sea + (u - 0.85) * 18 - 20 * (u - 0.85) ** 2, w.z); splash.scale.setScalar(1 + (u - 0.85) * 4) }
      if (u >= 1.3) { whaleT = -1; whale.visible = false; splash.visible = false; nextWhale = t + 50 + Math.random() * 30 }
    }
  }
  step(0)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; step(dt) })
  return {
    blimp, ferry, whale, breaches: () => breaches, breach() { nextWhale = t },
    set visible(v) { for (const g of [blimp, ferry]) g.visible = v },
  }
}
