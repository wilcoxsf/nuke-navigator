// THE BAT FLIP (9 Nov, razzle-dazzle 6, Andrew: yes to "bat flip on a no-doubter"). On a no-doubter (gone by 25 ft or more, or 425 ft and more), a voxel bat
// goes up off home plate a beat after contact, end over end, comes down in front of the plate with a wooden clack and a hop, lies there a moment and shrinks away.
// One bat at a time; a new swing takes the old one off. Field frame as dojo.js: metres, x to right field, y to center, z up; home plate at the origin.
export const isNoDoubter = (res) => !!res?.verdict && res.verdict.kind === 'GONE' && ((res.verdict.clearBy ?? 0) >= 25 || (res.landFt ?? 0) >= 425)

export function initBatFlip25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = (p) => api.toWorld(p)
  // the bat: knob, handle, taper, barrel; cubes along its length (scaled up 2.2x so it reads from the default camera, like the poles), lengths in metres
  const S = 2.2, cells = []
  for (let u = 0; u <= 0.86; u += 0.025) cells.push([u, u < 0.02 ? 0.055 : u < 0.45 ? 0.03 : u < 0.62 ? 0.03 + ((u - 0.45) / 0.17) * 0.035 : 0.066])
  const WOOD = '#c9925a', TAPE = '#1b1c1f'
  let bat = null
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3(), p = new THREE.Vector3(), sc = new THREE.Vector3()
  function drop() { if (!bat) return; scene.remove(bat.im); bat.im.geometry.dispose(); bat.im.material.dispose(); bat = null }
  api.NN.frames.push(() => {
    if (!bat) return
    const t = (performance.now() - bat.t0) / 1000 - bat.delay
    if (t < 0) { bat.im.visible = false; return }
    bat.im.visible = true
    const B = bat, g = 9.8
    let x, y, z, spin
    if (t < B.tl) { x = B.x0 + B.vx * t; y = B.y0 + B.vy * t; z = B.z0 + B.vz * t - 0.5 * g * t * t; spin = B.w * t }
    else { // the hop, then lying flat
      const u = t - B.tl, hop = Math.max(0, 1.6 * u - 0.5 * g * u * u)
      x = B.x0 + B.vx * B.tl + B.vx * 0.15 * Math.min(u, 0.35); y = B.y0 + B.vy * B.tl + B.vy * 0.15 * Math.min(u, 0.35); z = 0.08 + hop
      spin = B.w * B.tl + Math.min(u, 0.32) * B.w * 0.25
      if (!B.clacked) { B.clacked = true; o.sound?.('chip') }
    }
    const shrink = t > B.tl + 2.2 ? Math.max(0, 1 - (t - B.tl - 2.2) / 0.5) : 1
    if (shrink <= 0) { drop(); return }
    // end over end about a horizontal axis square to the toss
    ax.set(-B.vy, B.vx, 0).normalize(); q.setFromAxisAngle(new THREE.Vector3(ax.x, ax.z, -ax.y), spin) // (world axes: three.js y is up)
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q), c = toWorld([x, y, z])
    B.cells.forEach(([u, r], i) => {
      p.copy(c).addScaledVector(dir, (u - 0.43) * S)
      const s = Math.max(0.04, r * 2 * S) * shrink; sc.set(s, 0.025 * S * 1.1 * shrink, s)
      m4.compose(p, q, sc); B.im.setMatrixAt(i, m4)
    })
    B.im.instanceMatrix.needsUpdate = true
  })
  return {
    // flip(hand): hand 1 a right-handed batter (stands on the third-base side, x < 0), -1 a lefty
    flip(hand = 1, delay = 0.35) {
      drop()
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true, fog: false }), cells.length), c = new THREE.Color()
      cells.forEach(([u], i) => im.setColorAt(i, c.set(u < 0.2 ? TAPE : WOOD)))
      im.frustumCulled = false; scene.add(im)
      const vz = 8.5, tl = (vz + Math.sqrt(vz * vz + 2 * 9.8 * 1.0)) / 9.8
      bat = { im, cells, t0: performance.now(), delay, x0: -hand * 0.9, y0: -0.2, z0: 1.0, vx: hand * 1.1, vy: 2.4, vz, tl, w: 2.6 * Math.PI * 2, clacked: false }
      return true
    },
    clear: drop,
    flying: () => !!bat,
  }
}
