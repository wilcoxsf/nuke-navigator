// Study 25 wind you can see (29 Oct, night, Andrew: "Is the wind slightly horizontal? If so I need to know that somehow"):
//   windsocks on top of both foul poles, orange and white voxel rings that hang limp in a calm, fill and stream downwind as it picks up, and flutter more the harder it blows
//   air streams: a few dozen thin pale dashes drifting across the field the way the air goes, more and faster with the speed; none in a calm
//   now and then a gust: everything quickens for a second and a half (window.__nnSound('wind-gust') if a sound is listening)
// set({ mph, fromDeg }) takes a compass wind (the direction it blows FROM, as Open-Meteo gives it); setField({ wind, xwind }) takes the dojo's what-if wind in the
// field's frame (mph toward center field and toward right field). Oracle's home-to-center azimuth is 85 degrees (MLB Stats API), so a west wind blows straight out.
// Under reduced motion the socks hold still and the streams stay off.
// the engine's own conversion (dojo.js windParts, on window.__cp); the same arithmetic here if the engine is older
import { ORANGE } from './orange25.js'
const ORACLE_AZ = 85
const windParts = (mph, fromDeg) => window.__cp?.windParts?.(mph, fromDeg) ?? (() => { const h = ((fromDeg + 180 - ORACLE_AZ) * Math.PI) / 180; return { wind: mph * Math.cos(h), xwind: mph * Math.sin(h) } })()
// the model's foul-pole tops (field frame, metres: x to right field, y to center, z up), measured as the highest vertex within 1.5 m of where the wall meets 45 degrees
const POLES = [[-73.89, 74.51, 26.2], [66.32, 67.36, 33.2]]
export function initWind25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld, cube = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D(), V = (x, y, z) => new THREE.Vector3(x, y, z)
  let mph = 0, fromDeg = 270, dir = V(1, 0, 0), t = 0, wall = performance.now(), gust = 0, nextGust = 8, gusts = 0, shown = true
  // ---- windsocks: a short mast, a hoop, six rings of ten cubes tapering from 0.7 to 0.35 m, orange and white stripes ----
  const SEG = 6, AROUND = 10, SEGL = 0.75, CUBE = 0.26
  const socks = POLES.map(([x, y, z]) => {
    const g = new THREE.Group(), hoop = toWorld([x, y, z + 1.6])
    const mast = new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: '#d9dbe0', flatShading: true })); mast.scale.set(0.18, 1.8, 0.18); mast.position.copy(toWorld([x, y, z + 0.8])); g.add(mast)
    const rings = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial({ flatShading: true }), SEG * AROUND)
    for (let i = 0; i < SEG; i++) for (let k = 0; k < AROUND; k++) rings.setColorAt(i * AROUND + k, new THREE.Color(i % 2 ? '#f4f2ea' : ORANGE.o))
    rings.frustumCulled = false; g.add(rings); scene.add(g)
    return { g, rings, hoop, droop: 0.2, yaw: 0 }
  })
  // ---- air streams: thin pale dashes over the field, wrapped inside a box in the wind's own frame ----
  const NS = 60, streams = new THREE.InstancedMesh(cube, new THREE.MeshBasicMaterial({ color: '#d6e6ff', transparent: true, opacity: 0.4, depthWrite: false }), NS)
  streams.frustumCulled = false; scene.add(streams)
  const mid = toWorld([0, 65, 0]), HALF = 95 // the box: 190 m on a side around the middle of the field
  const dash = Array.from({ length: NS }, (_, i) => ({ a: ((i * 73) % 190) - 95, b: ((i * 41) % 190) - 95, h: 6 + ((i * 29) % 34), len: 2 + ((i * 7) % 3) }))
  const up = V(0, 1, 0), side = V(), a = V(), u = V(), w = V(), p = V()
  function aim() {
    // the air's heading in the world (the direction it goes), from the compass reading through the field frame
    const f = windParts(1, fromDeg)
    dir.set(f.xwind, 0, -f.wind).normalize()
    side.crossVectors(up, dir).normalize()
  }
  function stepSocks(dt) {
    const k = Math.min(1, (mph * (1 + gust * 0.6)) / 15), want = 0.2 + k * (Math.PI / 2 - 0.25) // radians from hanging straight down: limp to level by 15 mph
    for (const s of socks) {
      s.droop += (want - s.droop) * Math.min(1, dt * 2.5)
      for (let i = 0; i < SEG; i++) {
        const f = (i + 0.5) / SEG, r = 0.7 - 0.35 * f
        a.copy(dir).multiplyScalar(Math.sin(s.droop)).addScaledVector(up, -Math.cos(s.droop)).normalize() // the sock's axis
        const fl = o.still ? 0 : Math.sin(t * (3 + mph * 0.35) + i * 0.9) * (0.05 + 0.018 * mph) * f * (1 + gust)
        p.copy(s.hoop).addScaledVector(a, (i + 0.5) * SEGL).addScaledVector(side, fl * 3).addScaledVector(up, fl)
        u.crossVectors(a, Math.abs(a.y) > 0.95 ? side : up).normalize(); w.crossVectors(a, u).normalize()
        for (let k2 = 0; k2 < AROUND; k2++) {
          const th = (k2 / AROUND) * Math.PI * 2
          d.position.copy(p).addScaledVector(u, Math.cos(th) * r).addScaledVector(w, Math.sin(th) * r)
          d.scale.setScalar(CUBE); d.rotation.set(0, 0, 0); d.updateMatrix(); s.rings.setMatrixAt(i * AROUND + k2, d.matrix)
        }
      }
      s.rings.instanceMatrix.needsUpdate = true
    }
  }
  function stepStreams(dt) {
    const n = o.still || !shown ? 0 : Math.min(NS, Math.round(mph * 3))
    streams.count = n; streams.visible = n > 0
    if (!n) return
    const v = (2 + mph * 0.6) * (1 + gust * 0.8) // metres a second, slower than the real air so a dash can be followed
    for (let i = 0; i < n; i++) {
      const s = dash[i]
      s.a += v * dt; if (s.a > HALF) s.a -= 2 * HALF // along the wind, wrapped
      const L = s.len * (0.6 + mph / 12)
      d.position.copy(mid).addScaledVector(dir, s.a).addScaledVector(side, s.b); d.position.y = mid.y + s.h
      d.scale.set(0.16, 0.16, L); d.lookAt(d.position.clone().add(dir)); d.updateMatrix(); streams.setMatrixAt(i, d.matrix)
    }
    streams.instanceMatrix.needsUpdate = true
  }
  function step(dt) {
    t += dt
    if (!o.still && mph >= 6 && t > nextGust) { gust = 1; gusts++; nextGust = t + 6 + Math.random() * 8; window.__nnSound?.('wind-gust', { mph }) }
    gust = Math.max(0, gust - dt / 1.5)
    stepSocks(dt); stepStreams(dt)
  }
  aim(); step(0)
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.25, (now - wall) / 1000); wall = now; step(dt) })
  const api25 = {
    // a compass wind: mph and the direction it blows from
    set(w0) { mph = Math.max(0, Number(w0?.mph) || 0); fromDeg = Number(w0?.fromDeg) || 0; aim(); o.onChange?.({ mph, fromDeg }); step(0); return api25 },
    // the dojo's what-if wind in the field frame (mph toward center field, mph toward right field)
    setField(f) { const along = Number(f?.wind) || 0, across = Number(f?.xwind) || 0, m = Math.hypot(along, across); return api25.set({ mph: m, fromDeg: m ? ((Math.atan2(across, along) * 180) / Math.PI + ORACLE_AZ + 180 + 360) % 360 : fromDeg }) },
    get now() { return { mph, fromDeg, ...windParts(mph, fromDeg) } },
    // for the tests: the air's heading in the world, each sock's tip and hoop, how many dashes are up, how many gusts so far
    state: () => ({ mph, fromDeg, dir: dir.toArray(), socks: socks.map((s) => { const m = new THREE.Matrix4(), q = V(); s.rings.getMatrixAt(SEG * AROUND - 1, m); q.setFromMatrixPosition(m); return { hoop: s.hoop.toArray(), tip: q.toArray(), droop: s.droop } }), streams: streams.visible ? streams.count : 0, gusts }),
    gust() { nextGust = t },
    set visible(v) { shown = !!v; for (const s of socks) s.g.visible = shown; if (!shown) streams.visible = false },
  }
  return api25
}
