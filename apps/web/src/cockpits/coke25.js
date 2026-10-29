// Study 25 Coke corner in voxels (29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?"). The bottle (its slides inside)
// and the old four-finger glove behind the left-field bleachers, as cubes of 0.5 m voxelized from the park model's own full-detail wireframe (science/bake_coke_vox.py,
// public/coke_vox.json, git-ignored). C in the mixer picks the paint:
//   1 GLASS: the bottle in green contour glass with a red label band and cap, the glove in tan leather   2 COKE RED: a red bottle with a white wave across it
//   3 THE WIRE: no voxels; the model's own wireframe, as before (the wire is rebuilt for this one)
export async function initCoke25(api, o = {}) {
  const { THREE, scene } = api.NN
  let d = null
  try { const r = await fetch('/coke_vox.json'); d = r.ok ? await r.json() : null } catch {}
  if (!d) return null
  const cube = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D(), g = new THREE.Group()
  const mk = (arr) => {
    const n = arr.length / 4, m = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), n), cells = []
    for (let i = 0; i < n; i++) {
      const [a, b, c, t] = arr.slice(i * 4, i * 4 + 4), p = [d.o[0] + (a + 0.5) * d.vx, d.o[1] + (b + 0.5) * d.vx, d.o[2] + (c + 0.5) * d.vx]
      dummy.position.set(...p); dummy.scale.setScalar(d.vx); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); cells.push({ p, t, h: (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) })
    }
    g.add(m)
    return { m, cells }
  }
  const bottle = mk(d.bottle), glove = mk(d.glove)
  // each bottle cell's angle round the bottle's axis, for the wave
  {
    const u = new THREE.Vector3(...d.axis), c = bottle.cells.reduce((s, x) => s.add(new THREE.Vector3(...x.p)), new THREE.Vector3()).divideScalar(bottle.cells.length)
    const e1 = new THREE.Vector3(0, 1, 0).cross(u).normalize(), e2 = u.clone().cross(e1), v = new THREE.Vector3()
    for (const x of bottle.cells) { v.set(...x.p).sub(c); x.ang = Math.atan2(v.dot(e2), v.dot(e1)) }
  }
  scene.add(g)
  const col = new THREE.Color()
  let style = 0
  function paint(n) {
    style = n
    g.visible = n !== 3
    if (n === 3) return
    bottle.cells.forEach((x, i) => {
      const lit = (x.h & 7) === 0, t = x.t
      let h
      if (n === 1) h = t > 96 ? '#d8262c' : t > 36 && t < 52 ? ((x.h & 15) === 0 ? '#f2efe6' : '#d8262c') : lit ? '#7cc79b' : '#3f8a5e'
      else { const w = 45 + 6 * Math.sin(x.ang * 2); h = t > 96 ? '#f2efe6' : Math.abs(t - w) < 4 ? '#f2efe6' : lit ? '#ef4a4f' : '#c81e26' }
      bottle.m.setColorAt(i, col.set(h))
    })
    // the glove's deck (below 11.9 m) in concrete, the glove in two tans with dark laces
    glove.cells.forEach((x, i) => glove.m.setColorAt(i, col.set(x.p[1] < 11.9 ? ((x.h & 3) === 0 ? '#57544c' : '#6d6a60') : (x.h & 7) === 0 ? '#6b4423' : (x.h & 3) === 1 ? '#a8743f' : '#c08a52')))
    bottle.m.instanceColor.needsUpdate = true; glove.m.instanceColor.needsUpdate = true
  }
  paint(o.style ?? 1)
  return {
    set style(n) { if (n !== style) paint(n) }, styleNow: () => style, set visible(v) { g.visible = v && style !== 3 },
    // for the tests: how many cubes each has, and whether they show
    count: () => ({ bottle: bottle.cells.length, glove: glove.cells.length }), shown: () => g.visible, group: g,
  }
}
