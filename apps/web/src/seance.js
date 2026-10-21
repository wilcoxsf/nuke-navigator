// Seat Seance v0 (and the Monte Carlo over hidden variables): fly 300 "ghost" balls through the Dojo physics with the spread a prediction really has
// (exit speed, launch angle, direction, spin, wind, temperature), find where each one comes down by ray-casting its path against the park model,
// and show the cloud on the seats with the share of ghosts that are homers, wall balls, in play, foul, or splash hits.
// The spread sizes come from backtest errors (direction about 8 degrees near the wall, spin about 400 rpm); they are not yet the learned landing-density model,
// which has to be shipped to the page first (docket item B5). Zones are by bearing, not seat section, until a seat chart is attached to the model.
import * as THREE from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'

const N = 300
const SPREAD = { ev: 2.0, la: 3.0, dir: 8.0, temp: 4, wind: 4, dwb: 350, dws: 450 }
const ZONES = [[-46, -30, 'left-field stands'], [-30, -12, 'left-center'], [-12, 12, 'center field'], [12, 30, 'right-center'], [30, 46, 'right-field bleachers']]

function gauss(rng) { // Box-Muller
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
}
function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export function initSeance({ NN, state, fly, toWorld, colors }) {
  if (!NN.real) return
  const { scene } = NN
  THREE.Mesh.prototype.raycast = acceleratedRaycast
  let meshes = null
  function prepare() { // BVH per stadium mesh; the quantised attributes are converted to plain floats first
    if (meshes) return meshes
    meshes = []
    NN.stadium?.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry, pos = g.attributes.position
      const f = new Float32Array(pos.count * 3)
      for (let i = 0; i < pos.count; i++) { f[i * 3] = pos.getX(i); f[i * 3 + 1] = pos.getY(i); f[i * 3 + 2] = pos.getZ(i) }
      g.setAttribute('position', new THREE.BufferAttribute(f, 3))
      g.boundsTree = new MeshBVH(g)
      meshes.push(o)
    })
    return meshes
  }

  const css = `#dj-seance{position:absolute;left:12px;bottom:128px;width:300px;background:rgba(0,0,0,.55);color:#fff;padding:8px 10px;border-radius:4px;font:12px Arial,sans-serif}
#dj-seance button{cursor:pointer;font:900 12px Arial;padding:4px 10px;border:2px solid #fff;background:#1d2a6d;color:#fff;letter-spacing:.06em}
#dj-seance.on button{background:#ffd23f;color:#1d2a6d}
#dj-seance .bar{display:flex;height:10px;margin:6px 0 4px;border:1px solid #fff}
#dj-seance .rows div{display:flex;justify-content:space-between;padding:1px 0}
#dj-seance .zone{margin-top:4px;opacity:.9}`
  const box = document.createElement('div')
  box.id = 'dj-seance'
  box.innerHTML = `<style>${css}</style><button id="se-btn">SEAT SEANCE</button> <span id="se-sub" style="opacity:.75"></span><div id="se-out"></div>`
  document.getElementById('dojo').appendChild(box)

  let on = false, group = null
  const ray = new THREE.Raycaster()
  ray.firstHitOnly = true

  function clear() { if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.() }); group = null } }

  function run() {
    clear()
    const ms = prepare()
    const rng = mulberry(11)
    const col = colors()
    const tally = { GONE: 0, WALL: 0, PLAY: 0, FOUL: 0, SPLASH: 0, STREET: 0 }
    const zones = {}
    const pts = []
    const trails = []
    for (let k = 0; k < N; k++) {
      const s = {
        ...state, ev: state.ev + SPREAD.ev * gauss(rng), la: state.la + SPREAD.la * gauss(rng), dir: state.dir + SPREAD.dir * gauss(rng),
        temp: state.temp + SPREAD.temp * gauss(rng), wind: state.wind + SPREAD.wind * gauss(rng), dwb: SPREAD.dwb * gauss(rng), dws: SPREAD.dws * gauss(rng),
      }
      const res = fly(s, { floor: -8 })
      const v = res.verdict
      const path = res.path
      let kind = v.kind, at = null
      if (kind === 'GONE' || kind === 'FOUL') { // follow the ball past the wall until it meets the stands, the street or the water
        const wp = path.filter((_, i) => i % 3 === 0).map((q) => toWorld(q.p))
        for (let i = 1; i < wp.length && !at; i++) {
          if (Math.hypot(wp[i].x, wp[i].z) < 90) continue
          const d = wp[i].clone().sub(wp[i - 1]), len = d.length()
          ray.set(wp[i - 1], d.normalize()); ray.far = len
          const h = ray.intersectObjects(ms, false)[0]
          if (h) at = h.point
        }
        if (!at) { // no structure: splash if it came down on the right-field side, street otherwise
          const last = toWorld(path[path.length - 1].p)
          at = last
          if (kind === 'GONE') kind = last.x > 25 ? 'SPLASH' : 'STREET'
        }
      } else at = toWorld(path[path.length - 1].p)
      tally[kind] = (tally[kind] || 0) + 1
      if (kind === 'GONE' || kind === 'SPLASH' || kind === 'STREET') {
        const b = (Math.atan2(at.x, -at.z) * 180) / Math.PI
        const z = ZONES.find((zz) => b >= zz[0] && b < zz[1])?.[2] ?? (b < 0 ? 'left-field stands' : 'right-field bleachers')
        zones[z] = (zones[z] || 0) + 1
      }
      pts.push({ at, kind })
      if (k < 40) trails.push(path.filter((_, i) => i % 6 === 0).map((q) => toWorld(q.p)))
    }
    group = new THREE.Group()
    const dotCol = { GONE: col.GONE, WALL: col.WALL, PLAY: col.PLAY, FOUL: col.FOUL, SPLASH: new THREE.Color('#37f0ff'), STREET: col.GONE }
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), pts.length)
    const m4 = new THREE.Matrix4()
    pts.forEach((p, i) => { m4.setPosition(p.at); inst.setMatrixAt(i, m4); inst.setColorAt(i, new THREE.Color(dotCol[p.kind])) })
    group.add(inst)
    const seg = []
    for (const t of trails) for (let i = 1; i < t.length; i++) seg.push(t[i - 1].x, t[i - 1].y, t[i - 1].z, t[i].x, t[i].y, t[i].z)
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })))
    scene.add(group)
    const pct = (x) => `${Math.round((100 * (x || 0)) / N)}%`
    const homers = (tally.GONE || 0) + (tally.SPLASH || 0) + (tally.STREET || 0)
    const hex = (c) => `#${new THREE.Color(c).getHexString()}`
    const bar = [['HR', homers, hex(col.GONE)], ['WALL', tally.WALL, hex(col.WALL)], ['PLAY', tally.PLAY, hex(col.PLAY)], ['FOUL', tally.FOUL, hex(col.FOUL)]]
      .map(([, n, c]) => `<div style="width:${(100 * (n || 0)) / N}%;background:${c}"></div>`).join('')
    const top = Object.entries(zones).sort((a, b) => b[1] - a[1])[0]
    document.getElementById('se-out').innerHTML = `<div class="bar">${bar}</div><div class="rows">` +
      `<div><span>Home run</span><b>${pct(homers)}</b></div><div><span>Off the wall</span><b>${pct(tally.WALL)}</b></div>` +
      `<div><span>In play</span><b>${pct(tally.PLAY)}</b></div><div><span>Foul</span><b>${pct(tally.FOUL)}</b></div>` +
      (tally.SPLASH ? `<div><span>Splash hit</span><b>${pct(tally.SPLASH)}</b></div>` : '') + `</div>` +
      (top ? `<div class="zone">Most homers land in ${top[0]} (${Math.round((100 * top[1]) / Math.max(homers, 1))}%)</div>` : '') +
      `<div style="font-size:10px;opacity:.7;margin-top:4px">${N} ghost balls; spread from backtest errors. Prediction, not a measurement.</div>`
    window.__seance = { tally, N, homers }
  }
  function refresh() {
    box.classList.toggle('on', on)
    document.getElementById('se-sub').textContent = on ? 'ON' : ''
    if (on) run(); else { clear(); document.getElementById('se-out').innerHTML = '' }
  }
  document.getElementById('se-btn').addEventListener('click', () => { on = !on; refresh() })
  let pending = 0
  window.__seanceRefresh = () => { if (on) { cancelAnimationFrame(pending); pending = requestAnimationFrame(run) } }
  if (new URLSearchParams(location.search).get('seance') === '1') { on = true; setTimeout(refresh, 600) }
}
