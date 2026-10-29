// Study 25 show pieces:
//   CONSTELLATION: every ball in the current filter flown at once and drawn over the park as thin flight lines (this batter's in the accent color), a poster of
//   where the home runs went. Flights are computed in small batches so the page never stalls.
//   PRINT IT: a portrait PNG of the ball on screen for sharing: the park from above with its flight track, the flight from the side with the wall it beat, the
//   numbers, the batter's face as character art, in the study's pixel type. Drawn in 2D from the same engine numbers, not a screenshot.
export function constellation(api, col) {
  const { THREE, scene } = api.NN, toWorld = window.__cp.toWorld
  let group = null, token = 0
  const clear = () => { token++; if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose() }) } group = null }
  async function show(list, isHi, onProgress) {
    clear()
    const my = token, c = col(), hi = new THREE.Color(c.acc), lo = new THREE.Color(c.tx).lerp(new THREE.Color(c.k ?? '#000'), 0.62)
    const pos = [], cols = [], dots = [], dcols = [], beads = []
    group = new THREE.Group(); scene.add(group)
    for (let i = 0; i < list.length; i += 30) {
      if (my !== token) return null
      for (const b of list.slice(i, i + 30)) {
        const res = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry ?? 1, dws: b.dws ?? 0, tab: false }, {})
        const src = res.visPath ?? res.path, me = isHi(b), cc = me ? hi : lo
        let prev = null, pf = 0
        for (let k = 0; k < src.length; k += 3) {
          const p = toWorld(src[k].p), f = me ? 1 : Math.min(1, Math.hypot(src[k].p[0], src[k].p[1]) / 110) ** 1.5
          if (prev) { pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z); cols.push(cc.r * pf, cc.g * pf, cc.b * pf, cc.r * f, cc.g * f, cc.b * f) }
          if (me && k % 6 === 0) beads.push(p.x, p.y, p.z)
          prev = p; pf = f
        }
        const L = src[src.length - 1], q = toWorld(L.p); dots.push(q.x, Math.max(q.y, 0.5), q.z); dcols.push(cc.r, cc.g, cc.b)
      }
      onProgress?.(Math.min(list.length, i + 30), list.length)
      await new Promise((r) => setTimeout(r, 0))
    }
    if (my !== token) return null
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, fog: false })))
    // the landings and this batter's beads as cubes (28 Oct, night: voxels everywhere), one instanced mesh each, colored per landing
    const box = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), col3 = new THREE.Color()
    const land = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ flatShading: true, fog: false }), dots.length / 3)
    for (let k = 0; k < dots.length / 3; k++) { m4.makeScale(1.3, 1.3, 1.3).setPosition(dots[3 * k], dots[3 * k + 1], dots[3 * k + 2]); land.setMatrixAt(k, m4); land.setColorAt(k, col3.setRGB(dcols[3 * k], dcols[3 * k + 1], dcols[3 * k + 2])) }
    group.add(land)
    if (beads.length) { const bd = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: c.acc, flatShading: true, fog: false }), beads.length / 3); for (let k = 0; k < beads.length / 3; k++) { m4.makeScale(1.1, 1.1, 1.1).setPosition(beads[3 * k], beads[3 * k + 1], beads[3 * k + 2]); bd.setMatrixAt(k, m4) } group.add(bd) }
    return { n: list.length, segs: pos.length / 6 }
  }
  return { show, clear, on: () => !!group }
}

// ---- PRINT IT ----
export async function posterPNG(d) {
  try { await Promise.all(['16px PS2P', '24px VT'].map((f) => document.fonts.load(f))) } catch {}
  const W = 1200, H = 1680, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d'), C = d.colors
  g.fillStyle = C.k; g.fillRect(0, 0, W, H)
  // crop-mark corners, like the screen's P5 frame
  g.strokeStyle = C.tx; g.lineWidth = 3
  for (const [x, y, sx, sy] of [[30, 30, 1, 1], [W - 30, 30, -1, 1], [30, H - 30, 1, -1], [W - 30, H - 30, -1, -1]]) { g.beginPath(); g.moveTo(x + sx * 46, y); g.lineTo(x, y); g.lineTo(x, y + sy * 46); g.stroke() }
  const txt = (s, x, y, font, color, align = 'left') => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y) }
  txt('NUKE NAVIGATOR // ' + d.mode, 70, 96, '16px PS2P', C.dim)
  txt(d.name, 70, 178, '58px VT', C.tx)
  txt(d.sub, 70, 222, '30px VT', C.dim)
  txt(`${d.ft}`, W - 70, 196, '120px VT', C.acc, 'right')
  txt('FT', W - 70, 232, '28px VT', C.dim, 'right')
  // the park from above: the wall (from the engine's own wall at each bearing), the foul lines, the infield, the ball's ground track and where it came down
  const mx = W / 2, my = 980, sc = 1.32 // px per foot
  const P = (xft, yft) => [mx + xft * sc, my - yft * sc]
  g.strokeStyle = C.dim; g.lineWidth = 2
  g.beginPath(); for (const s of [-1, 1]) { const [x, y] = P(s * 330 * Math.sin(Math.PI / 4), 330 * Math.cos(Math.PI / 4)); g.moveTo(...P(0, 0)); g.lineTo(x, y) } g.stroke()
  { const h = 90 * Math.SQRT1_2; g.beginPath(); [[0, 0], [h, h], [0, 2 * h], [-h, h], [0, 0]].forEach((pt, k) => (k ? g.lineTo(...P(...pt)) : g.moveTo(...P(...pt)))); g.stroke() } // the infield, 90 ft a side
  g.strokeStyle = C.tx; g.lineWidth = 4; g.beginPath()
  d.wall.forEach(([b, ft], i) => { const r = (b * Math.PI) / 180, p = P(ft * Math.sin(r), ft * Math.cos(r)); i ? g.lineTo(...p) : g.moveTo(...p) }); g.stroke()
  g.strokeStyle = C.acc; g.lineWidth = 5; g.setLineDash([10, 8]); g.beginPath()
  d.track.forEach(([x, y], i) => { const p = P(x, y); i ? g.lineTo(...p) : g.moveTo(...p) }); g.stroke(); g.setLineDash([])
  { const [x, y] = d.track[d.track.length - 1], p = P(x, y); g.fillStyle = C.acc; g.fillRect(p[0] - 10, p[1] - 10, 20, 20) }
  txt('FROM ABOVE', 70, 560, '16px PS2P', C.dim)
  // the flight from the side: height against distance, the wall it had to beat
  const sx0 = 70, sy0 = 1410, sw = W - 140, sh = 220, maxD = Math.max(460, d.ft + 30), maxH = Math.max(140, d.apex + 20)
  const S = (dd, hh) => [sx0 + (dd / maxD) * sw, sy0 - (hh / maxH) * sh]
  txt('FROM THE SIDE', 70, 1150, '16px PS2P', C.dim)
  g.strokeStyle = C.dim; g.lineWidth = 2; g.beginPath(); g.moveTo(...S(0, 0)); g.lineTo(...S(maxD, 0)); g.stroke()
  if (d.wallFt) { g.fillStyle = C.tx; const [a, b] = S(d.wallFt, d.wallH); g.fillRect(a - 3, b, 6, sy0 - b) }
  { const pts = []; for (const [dd, hh] of d.side) { if (pts.length > 2 && hh < 0) break; pts.push([dd, Math.max(0, hh)]) } g.strokeStyle = C.acc; g.lineWidth = 5; g.beginPath(); pts.forEach(([dd, hh], i) => { const p = S(dd, hh); i ? g.lineTo(...p) : g.moveTo(...p) }); g.stroke(); const e = S(...pts[pts.length - 1]); g.fillStyle = C.acc; g.fillRect(e[0] - 8, e[1] - 8, 16, 16) }
  // numbers
  const rows = d.rows
  rows.forEach(([a, b], i) => { const x = i % 2 ? W / 2 + 20 : 70, y = 1480 + Math.floor(i / 2) * 36; txt(a, x, y, '26px VT', C.dim); txt(b, x + 500, y, '26px VT', C.tx, 'right') })
  if (d.tag) { g.font = '18px PS2P'; const w = g.measureText(d.tag).width + 24; g.fillStyle = C.acc; g.fillRect(70, 252, w, 36); txt(d.tag, 82, 280, '18px PS2P', C.k) }
  // the face, top right of the map: a canvas style's own drawing (redrawn by the page at 300 px), or character art
  if (d.faceImg) g.drawImage(d.faceImg, W - 70 - 300, 280, 300, 300)
  else if (d.face?.length) {
    const lines = d.face.slice(0, 48), cols = Math.max(...lines.map((x) => x.length)), fs = Math.min(14, 300 / (cols * 0.62), 300 / (lines.length * 1.05))
    g.font = `${fs}px ${d.faceFont ?? 'monospace'}`; g.fillStyle = C.tx; g.textAlign = 'left'
    lines.forEach((l, i) => g.fillText(l, W - 70 - cols * fs * 0.62, 280 + i * fs * 1.05))
  }
  txt('ORACLE PARK · ' + d.date, W / 2, H - 52, '14px PS2P', C.dim, 'center')
  return c.toDataURL('image/png')
}
