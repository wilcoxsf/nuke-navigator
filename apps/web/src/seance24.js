// SEAT SEANCE for Study 24: 300 ghost balls flown with the spread a prediction really has (exit speed, launch angle, direction, spin, wind, temperature; sizes from
// backtest errors, as in seance.js), each followed past the wall into the stands, the arcade or McCovey Cove. Draws the landing cloud in the park in the accent color and
// returns the tally by outcome and by zone. A prediction, not a measurement.
import * as THREE from 'three'

const N = 300
const SPREAD = { ev: 2.0, la: 3.0, dir: 8.0, temp: 4, wind: 4, dwb: 350, dws: 450 }
const ZONES = [[-46, -30, 'LEFT-FIELD STANDS'], [-30, -12, 'LEFT-CENTER'], [-12, 12, 'CENTER FIELD'], [12, 30, 'RIGHT-CENTER'], [30, 47, 'ARCADE']]
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

export function seatSeance(api) {
  let group = null
  const clear = () => { if (!group) return; api.NN.scene.remove(group); group.traverse((x) => { x.geometry?.dispose(); x.material?.dispose?.() }); group = null }
  function run(state, colors) {
    clear()
    const rng = mulberry(11), tally = { GONE: 0, SPLASH: 0, STREET: 0, WALL: 0, PLAY: 0, FOUL: 0 }, zones = {}, pts = []
    for (let k = 0; k < N; k++) {
      const s = { ...state, ev: state.ev + SPREAD.ev * gauss(rng), la: state.la + SPREAD.la * gauss(rng), dir: state.dir + SPREAD.dir * gauss(rng), temp: state.temp + SPREAD.temp * gauss(rng), wind: (state.wind ?? 0) + SPREAD.wind * gauss(rng), dwb: SPREAD.dwb * gauss(rng), dws: (state.dws ?? 0) + SPREAD.dws * gauss(rng) }
      const res = api.fly(s, { floor: -8 })
      let kind = res.verdict.kind, at
      if (kind === 'GONE' || kind === 'FOUL') { const h = api.findLanding(res.path); at = h.point; if (kind === 'GONE' && h.kind !== 'STANDS') kind = h.kind } else at = api.toWorld(res.path[res.path.length - 1].p)
      tally[kind] = (tally[kind] ?? 0) + 1
      if (kind === 'GONE' || kind === 'SPLASH' || kind === 'STREET') {
        const b = (Math.atan2(at.x, -at.z) * 180) / Math.PI, z = kind === 'SPLASH' ? 'MCCOVEY COVE' : ZONES.find((zz) => b >= zz[0] && b < zz[1])?.[2] ?? (b < 0 ? 'LEFT-FIELD STANDS' : 'ARCADE')
        zones[z] = (zones[z] ?? 0) + 1
      }
      pts.push({ at, kind })
    }
    group = new THREE.Group()
    const col = { GONE: colors.acc, SPLASH: colors.acc, STREET: colors.acc, WALL: colors.tx, PLAY: colors.dim, FOUL: colors.dim }
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }), pts.length)
    const m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { m4.setPosition(p.at); inst.setMatrixAt(i, m4); inst.setColorAt(i, new THREE.Color(col[p.kind])) })
    inst.renderOrder = 18
    group.add(inst)
    api.NN.scene.add(group)
    const homers = tally.GONE + tally.SPLASH + tally.STREET
    return { N, tally, homers, zones: Object.entries(zones).sort((a, b) => b[1] - a[1]) }
  }
  return { run, clear }
}
