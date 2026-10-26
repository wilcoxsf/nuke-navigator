// LANDING PARTY: the real home runs at Oracle Park most like this ball (exit speed, launch angle, landing bearing), each flown through the same engine with its own fitted
// carry and side spin and followed past the wall into the stands, the arcade or McCovey Cove. Numbered markers sit where they came down; the list says who, when, how far.
// Real balls only (the replay set: every Oracle home run since 2023-07-14). Where a ball came down is the engine's landing, anchored to Statcast's distance and bearing, not a seat record.
import * as THREE from 'three'

const ZONES = [[-46, -30, 'LEFT-FIELD STANDS'], [-30, -12, 'LEFT-CENTER'], [-12, 12, 'CENTER FIELD'], [12, 30, 'RIGHT-CENTER'], [30, 47, 'ARCADE']]

function numberSprite(n, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(8, 8, 48, 48)
  g.strokeStyle = color
  g.lineWidth = 4
  g.strokeRect(8, 8, 48, 48)
  g.fillStyle = color
  g.font = 'bold 34px monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(String(n), 32, 34)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }))
  s.scale.set(7, 7, 1)
  s.renderOrder = 20
  return s
}

export function landingParty(api, balls, o = {}) {
  const K = o.k ?? 8
  let group = null
  const oracle = balls.filter((b) => b.park === 'SF' && b.hr)
  function clear() {
    if (!group) return
    api.NN.scene.remove(group)
    group.traverse((x) => { x.geometry?.dispose(); x.material?.map?.dispose(); x.material?.dispose?.() })
    group = null
  }
  // x: { ev, la, bear, self } (self: the replay ball itself, left out of its own party)
  function nearest(x) {
    // compare landing bearing with landing bearing: a ball's stored dir is its fitted launch direction, which the spin hook bends by a few degrees
    for (const b of oracle) if (b._lb == null) b._lb = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, {}).landB
    return oracle.filter((b) => b !== x.self).map((b) => ({ b, d: ((b.ev - x.ev) / 3) ** 2 + ((b.la - x.la) / 3) ** 2 + ((b._lb - x.bear) / 6) ** 2 })).sort((p, q) => p.d - q.d).slice(0, K)
  }
  function show(x, color = '#f0802a') {
    clear()
    const list = nearest(x), out = []
    group = new THREE.Group()
    const dot = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true })
    list.forEach(({ b, d }, i) => {
      const st = { ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }
      const res = api.fly(st, { floor: -8 })
      const hit = res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL' ? api.findLanding(res.path) : { point: api.toWorld(res.path[res.path.length - 1].p), kind: 'SHORT' }
      const p = hit.point, bear = (Math.atan2(p.x, -p.z) * 180) / Math.PI
      const where = hit.kind === 'SPLASH' ? 'MCCOVEY COVE' : hit.kind === 'STREET' ? 'OUT OF THE PARK' : hit.kind === 'SHORT' ? 'SHORT IN THE ENGINE' : ZONES.find((z) => bear >= z[0] && bear < z[1])?.[2] ?? (bear < 0 ? 'LEFT-FIELD STANDS' : 'ARCADE')
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), dot)
      m.position.copy(p)
      m.renderOrder = 19
      const s = numberSprite(i + 1, color)
      s.position.set(p.x, p.y + 6, p.z)
      group.add(m, s)
      // the flight, faint, so the eye can follow each one in
      const pts = res.path.filter((_, k) => k % 5 === 0).map((q) => api.toWorld(q.p))
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, depthTest: false })))
      out.push({ n: i + 1, b, d, where, kind: hit.kind })
    })
    api.NN.scene.add(group)
    return out
  }
  return { show, clear, count: () => oracle.length }
}
