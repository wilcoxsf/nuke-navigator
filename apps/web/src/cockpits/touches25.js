// Study 25 touches (2 Nov, night, Andrew: "attention to detail things that make users say 'wow that's a nice touch'. Things like the number going over just every
// once in a while, some neato voxel art, the tags - things that demonstrate this is a labor of love and that normal people wouldn't be thinking of but that when
// they're there increase the feel and satisfaction of using this. Come up with a number of them and surprise me"). The ones that live here:
//   THE GULL ON THE NUMBER: now and then one of the park's gulls (park25.js's voxel gull) comes down on the settled distance, pecks at it twice, looks round, and
//     goes when the next ball is hit (or after a while)
//   POINTING AT A SEAT: in SHOT CALLER, before you click, a small ring of cubes and the seat's section and row in voxels sit under the pointer, so you know where
//     a click will land before you make it
//   YOUR FLAG: in MY SEAT, your WALLOP WITNESS emblem (emblem25.js) flies as a voxel flag on a pole at your seat
// (The rest are the landing number's own, landnum25.js: the overshoot, the dip, GEIGER, 404, the chip, the touch.)
import { voxDots, voxText, voxPost, voxCells, keepReadable } from './vox25.js'
import { emblemPixels, EMBLEM_COLORS, EMBLEM_N } from './emblem25.js'

export function initTouches25(api, o = {}) {
  const { THREE, scene, camera } = api.NN
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const runs = []
  let lastT = 0
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016); lastT = now; for (let i = runs.length - 1; i >= 0; i--) if (!runs[i](dt)) runs.splice(i, 1) })
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
  const count = { gulls: 0, pecks: 0, flags: 0 }

  // ---- THE GULL ON THE NUMBER ----
  let perched = null
  function gull(ld) {
    if (perched || !o.makeGull) return false
    const P0 = ld.userData.perch?.()
    if (!P0?.live) return false
    const m = o.makeGull(), W = m.userData.wings ?? [], head = m.userData.head
    m.scale.setScalar(Math.max(1.6, P0.sc * 2.4)); scene.add(m) // (big enough to read on a number seen from the broadcast seat)
    const side = Math.random() < 0.5 ? -1 : 1, seat = () => { const P = ld.userData.perch(); return P.top.clone().addScaledVector(P.R, side * P.w * 0.22).add(V(0, 0.15 * P.sc, 0)) }
    const from = seat().addScaledVector(P0.R, side * 60).add(V(0, 30, 0)), away = seat().addScaledVector(P0.R, -side * 70).add(V(0, 45, 0))
    let t = 0, ph = 'in', t0 = 0, pecks = 0
    perched = { ld, m }
    count.gulls++
    const face = (p) => { m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z) }
    const flap = (k) => { W.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 14) * 0.7 * k }) }
    m.position.copy(from)
    runs.push((dt) => {
      t += dt
      const P = ld.userData.perch?.(), gone = !P?.live
      if (gone && ph !== 'out') { ph = 'out'; t0 = t }
      if (ph === 'in') { // a glide down onto the number, wings going
        const u = Math.min(1, t / 1.8), s = seat(), p = from.clone().lerp(s, ease(u)); p.y += Math.sin(u * Math.PI) * 6
        face(s); m.position.copy(p); flap(1 - u * 0.6)
        if (u >= 1) { ph = 'sit'; t0 = t; o.sound?.('gull', { n: 1, vol: 0.4 }) }
        return true
      }
      if (ph === 'sit') { // on the top edge: two pecks at the digit, a look round, wings folded
        const s = seat(); m.position.copy(s); flap(0)
        const k = t - t0
        m.rotation.y = Math.atan2(camera.position.x - s.x, camera.position.z - s.z) + side * 0.9 + (k > 2.2 && k < 3.2 ? Math.sin((k - 2.2) * 6) * 0.8 : 0)
        const peck = (k > 0.6 && k < 0.9) || (k > 1.3 && k < 1.6)
        m.rotation.x = peck ? 0.55 : 0; if (head) head.rotation.x = peck ? 0.5 : 0
        if (peck && pecks < (k > 1.3 ? 2 : 1)) { pecks++; count.pecks++; o.sound?.('peck', { vol: 0.6 }) }
        if (k > (o.stay ?? 9)) { ph = 'out'; t0 = t }
        return true
      }
      // off again, over the stands
      const u = Math.min(1, (t - t0) / 1.6), s = m.position.clone(), p = s.lerp(away, ease(u) * 0.5)
      face(away); m.position.copy(p); m.rotation.x = -0.3; flap(1)
      if (u >= 1 || m.position.distanceTo(away) < 2) { scene.remove(m); if (perched?.m === m) perched = null; return false }
      return true
    })
    return true
  }

  // ---- POINTING AT A SEAT ----
  let ptr = null
  function hoverSeat(spot, s, color) {
    if (!spot || s?.what !== 'seat') { if (ptr) ptr.visible = false; return }
    const key = `${s.sec}|${s.row}`
    if (!ptr || ptr.userData.key !== key) {
      if (ptr) scene.remove(ptr)
      ptr = new THREE.Group(); ptr.userData.key = key
      const ring = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return V(Math.cos(a) * 1.8, 0.5, Math.sin(a) * 1.8) })
      ptr.add(voxDots(THREE, ring, { px: 0.45, color }))
      const lab = voxText(THREE, `SEC ${s.sec} ROW ${s.row}`, { px: 0.32, color: '#e8e1c9', back: '#141414' }); lab.position.set(0, 4.5, 0); keepReadable(api, lab, 120, 0.5, 1.8, { prio: 5 }); ptr.add(lab)
      ptr.add(voxPost(THREE, V(0, 1, 0), V(0, 4.2, 0), { px: 0.22, gap: 0.6, color }))
      scene.add(ptr)
    }
    ptr.visible = true; ptr.position.copy(spot)
  }

  // ---- YOUR FLAG ----
  let flagG = null
  function flag(at, code) {
    if (flagG) { scene.remove(flagG); flagG = null }
    if (!at || !code) return
    const px = emblemPixels(code), cells = [], N = EMBLEM_N
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = px[y * N + x]; if (c >= 0) cells.push([x, N - 1 - y, 0, EMBLEM_COLORS[c]]) }
    const g = new THREE.Group(), cloth = new THREE.Group(), face = voxCells(THREE, cells, 0.16), H = 11
    face.position.set(N * 0.16 * 0.5 + 0.2, H - N * 0.16, 0); cloth.add(face); g.add(cloth)
    g.add(voxPost(THREE, V(0, 0, 0), V(0, H + 0.4, 0), { px: 0.28, gap: 0.3, color: '#c9c2ad' }))
    g.position.copy(at); scene.add(g); flagG = g; count.flags++
    let t = 0
    runs.push((dt) => { if (flagG !== g) return false; t += dt; g.rotation.y = Math.atan2(camera.position.x - at.x, camera.position.z - at.z) - Math.PI / 2 + 0.5; cloth.rotation.y = Math.sin(t * 2.2) * 0.12; cloth.rotation.z = Math.sin(t * 3.1) * 0.025; return true })
  }

  return { gull, hoverSeat, flag, count: () => ({ ...count, perched: !!perched }) }
}
