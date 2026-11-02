// Study 25: the ball's shadow (1 Nov, GPT red team II, A2 "THE SHADOW LANDS FIRST"; Andrew: "I like the idea of an A2 shadow dig that"): while a ball is up, a
// small dark voxel spot runs over the grass, the wall and the seats under it, so you see where it is headed before it comes down. It sits where a ray from the ball
// meets the park (the uncut copy, seance.js parkHit), or the field or the water when nothing is there. BALL SHADOW in THE LAB:
//   1 STRAIGHT DOWN   the noon sun: right under the ball
//   2 LOW SUN         an afternoon sun low in the southwest: the shadow runs out ahead of the ball on the way down and meets it as it lands
//   3 OFF
import { parkHit } from '../seance.js'
import { WATER_Z } from './water25.js'
export function initShadow25(api) {
  const { THREE, scene } = api.NN
  const g = new THREE.Group(); g.visible = false; scene.add(g)
  const cube = new THREE.BoxGeometry(1, 0.12, 1)
  const fillM = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.62, depthWrite: false, fog: false })
  const ringM = new THREE.MeshBasicMaterial({ color: '#6b7079', transparent: true, opacity: 0.55, depthWrite: false, fog: false })
  // a round spot of cells, 7 across, and a ring of grey cells round it (so it still shows over the black stands)
  const cells = (pick) => { const out = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const r = Math.hypot(i, j); if (pick(r)) out.push([i, j]) } return out }
  const mk = (list, m) => { const im = new THREE.InstancedMesh(cube, m, list.length), d = new THREE.Object3D(); list.forEach(([i, j], k) => { d.position.set(i, 0, j); d.updateMatrix(); im.setMatrixAt(k, d.matrix) }); im.frustumCulled = false; im.renderOrder = 6; g.add(im); return im }
  mk(cells((r) => r <= 3.2), fillM); mk(cells((r) => r > 3.2 && r <= 4.2), ringM)
  let style = 1
  const down = new THREE.Vector3(0, -1, 0), sun = new THREE.Vector3(0.55, -0.62, 0.55).normalize() // the low sun shines from the southwest (behind third base, roughly), downward
  const ground = () => api.toWorld([0, 0, 0]).y, water = () => api.toWorld([0, 0, WATER_Z]).y
  function at(pos) {
    if (style === 3 || !pos) { g.visible = false; return }
    const dir = style === 2 ? sun : down, h = parkHit(api.NN, pos, dir)
    let p = h?.point
    if (!p) { // nothing of the park in the way: the field (inside the walls) or the water
      const y = Math.hypot(pos.x, pos.z) < 125 ? ground() : water(), t = (pos.y - y) / -dir.y
      if (!(t > 0)) { g.visible = false; return }
      p = pos.clone().addScaledVector(dir, t)
    }
    const s = 0.3 + Math.min(0.25, (pos.y - p.y) * 0.004) // a cell is 30 cm, a little softer and wider the higher the ball
    g.position.set(p.x, p.y + 0.15, p.z); g.scale.set(s, 1, s); g.visible = true
  }
  return { at, hide() { g.visible = false }, setStyle(n) { style = n; if (n === 3) g.visible = false }, group: g }
}
