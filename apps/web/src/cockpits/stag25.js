// Study 25 tags in the park (31 Oct, Andrew: "The text is sort of jank when you zoom in and out and it's still overlapping and a little wonky in general"; later the
// same day: "the diagetic zenith, cleared the wall, distance still needs to be voxel. Give me options for that too"): the park keeps a small voxel pin where the thing
// happened, and the words sit beside it at one size on the screen, whatever the zoom, placed clear of everything. Each frame the camera moves, the pins are
// projected; a tag tries fifteen spots beside its pin (its own side, the other side, centred; level with the pin, then higher a line at a time, then under it) and
// takes the first inside the park window and clear of the readout, the verdict chip, the chooser, the button, the scoreboard and any tag that ranks above it. It
// keeps last frame's spot while that still works, so tags do not hop; with no room it hides. The words come four ways (PARK TAGS, TG, in THE LAB):
//   1 VOXEL, STEADY: voxel letters, held at one screen size by standing them on the camera's line of sight at a fixed distance and scaling them to it
//   2 VOXEL ON A BOARD: the same on a dark board   3 VOXEL NUMBER ONLY: the number alone   4 PIXEL TYPE: flat pixel type on a dark strip
// 1 Nov (Andrew: "it's difficult to tell what they're referring to with voxel number only - maybe we make them the same color as their ice blue line? ... maybe we connect
// them via a line too?"): a tag can carry the color of the post it belongs to (o.tie), and a dashed leader runs from the tag to its point. TAGS: TIE in THE LAB:
//   1 LINE AND COLOR   2 COLOR ONLY   3 LINE ONLY   4 NEITHER
// 1 Nov, later (GPT red team II, B8 "NUMBER TOTEMS"; Andrew left the leftovers to me as options): 6 BIG NUMBER, the number large on its board and the caption small and
// grey under nothing else, so the digits are the landmark
// stag(api, [small, big], color, { side, prio, tie }) returns an empty Group: put it where the tag points (it rides its parent's visibility; off the scene, it goes away).
import { readable as voxReadable, voxText } from './vox25.js'
let L = null, STYLE = 5, TIE = 2
const extra = [] // other things on the screen a tag keeps off: functions giving [x0, y0, x1, y1] boxes in pixels (Landing Party's marks)
const sOf = () => (STYLE === 5 ? SQ : S)
const tieCol = (t) => (TIE <= 2 && t.tie) || t.color, tieLine = () => TIE === 1 || TIE === 3
const S = 2.2, SQ = 1.75 // screen pixels to a voxel cell (the quiet board, 5, smaller)
const CSS = `
#cp .stags{position:fixed;inset:0;pointer-events:none;z-index:2}
#cp .stag{position:absolute;left:0;top:0;padding:3px 7px 4px;background:color-mix(in srgb,var(--k) 86%,transparent);border-left:2px solid var(--sc,var(--acc));white-space:nowrap;font-family:var(--lf),monospace;line-height:1.05;will-change:transform}
#cp .stag i{display:block;font-style:normal;font-size:10px;letter-spacing:.06em;color:var(--dim)}
#cp .stag b{display:block;font-weight:400;font-size:20px;color:var(--sc,var(--acc))}
#cp .stag.off,#cp .stags.vx .stag{visibility:hidden}
#cp .stags svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#cp .stags line{stroke-width:2;stroke-dasharray:4 3;shape-rendering:crispEdges}`
// the voxel words of a tag, in cell units, centred on the group's origin; and their size on the screen
function voxWords(THREE, t) {
  const bp = STYLE === 6 ? 2.4 : 1.5, sp = STYLE === 6 ? 0.75 : 1 // the number's and the caption's cells
  const g = new THREE.Group(), back = STYLE === 2 || STYLE === 5 || STYLE === 6 ? '#141414' : undefined, big = voxText(THREE, t.lines[1] ?? '', { px: bp, color: tieCol(t) ?? '#f0802a', back })
  g.add(big) // (voxCells centres its cells already; 1 Nov: shifting them by half a width again drew each line left of its spot, so a long caption ran into the tag beside it)
  let wU = big.userData.width + bp, hU = 7 * bp
  if (STYLE !== 3 && t.lines[0]) { const sm = voxText(THREE, t.lines[0], { px: sp, color: STYLE >= 5 ? '#8a8f99' : '#e8e1c9', back }); sm.position.set(0, hU + 2 * sp, 0); g.add(sm); wU = Math.max(wU, sm.userData.width + sp); hU += 9 * sp }
  for (const c of g.children) c.position.y -= hU / 2
  g.userData.px = [wU * sOf() + 6, hU * sOf() + 6]
  return g
}
function layer(api) {
  if (L) return L
  const host = document.querySelector('#cp') ?? document.body
  if (!document.getElementById('stag-css')) { const st = document.createElement('style'); st.id = 'stag-css'; st.textContent = CSS; document.head.appendChild(st) }
  const el = document.createElement('div'); el.className = 'stags'; host.appendChild(el)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.appendChild(svg)
  const THREE = api.NN.THREE, v = new THREE.Vector3(), vroot = new THREE.Group(); vroot.renderOrder = 30; api.NN.scene.add(vroot)
  L = { el, svg, tags: new Set(), api, v, vroot, dirty: true }
  let lastCam = '', frame = 0
  api.NN.frames.push(() => {
    frame++
    if (!L.tags.size) return
    el.classList.toggle('vx', STYLE !== 4)
    const cam = api.NN.camera, ck = cam.position.toArray().map((x) => x.toFixed(2)).join() + cam.quaternion.toArray().map((x) => x.toFixed(3)).join()
    const W = window.__cpWindow ?? { l: 0, r: 0, t: 0, b: 0 }, X0 = W.l + 4, X1 = innerWidth - W.r - 4, Y0 = W.t + 4, Y1 = innerHeight - W.b - 4
    // a tag shown or hidden since the last pass (1 Nov: Landing Party's lit tag lagged its flag by a few frames) places them all again at once
    const shown = (t) => { for (let p = t.g; p; p = p.parent) if (!p.visible) return false; return true }
    for (const t of L.tags) if (t.vis !== shown(t)) { L.dirty = true; break }
    // and when the scoreboard or the sign moved on the screen: the voxel layer measures them in its own frame, which can come after this one, so a tag placed
    // as the camera moves could sit on where the board is now (1 Nov: the tidy suite's far-back check caught three)
    const fk = voxReadable().filter((r) => r.fixed && r.rect).map((r) => [r.rect.x0, r.rect.x1, r.rect.y0, r.rect.y1].map((x) => x.toFixed(3)).join()).join('|')
    if (fk !== L.fk) { L.fk = fk; L.dirty = true }
    if (ck === lastCam && frame % 6 && !L.dirty) return // nothing moved: the tags stay where they are
    lastCam = ck; L.dirty = false
    // the things a tag keeps clear of: the park's own readouts, and the scoreboard and sign (as the voxel layer measures them)
    const avoid = []
    for (const s of ['#c25rd', '#c25v', '#c25ch', '#c25nk', '#c25t', '#c25bug']) { const n = document.querySelector(s); if (n && n.offsetParent) { const r = n.getBoundingClientRect(); if (r.width && r.height) avoid.push([r.left, r.top, r.right, r.bottom]) } }
    for (const f of extra) for (const b of f()) avoid.push(b)
    for (const r of voxReadable()) if (r.fixed && r.rect) avoid.push([((r.rect.x0 + 1) / 2) * innerWidth, ((1 - r.rect.y1) / 2) * innerHeight, ((r.rect.x1 + 1) / 2) * innerWidth, ((1 - r.rect.y0) / 2) * innerHeight])
    const placed = [], hit = (a, b, p = 4) => a[0] < b[2] + p && b[0] < a[2] + p && a[1] < b[3] + p && b[1] < a[3] + p
    const upp = (D) => (2 * D * Math.tan((cam.fov * Math.PI) / 360)) / innerHeight // world metres to a screen pixel at distance D
    const list = [...L.tags].sort((a, b) => b.prio - a.prio)
    for (const t of list) {
      const hide = () => { t.el.classList.add('off'); if (t.vox) t.vox.visible = false; t.rect = null; t.ln.style.display = 'none' }
      let on = true, root = t.g
      for (let p = t.g; p; p = p.parent) { if (!p.visible) on = false; root = p }
      if (root !== api.NN.scene) { if (++t.gone > 2) { t.el.remove(); t.ln.remove(); if (t.vox) vroot.remove(t.vox); L.tags.delete(t) } else hide(); continue }
      t.gone = 0; t.vis = on
      if (!on) { hide(); continue }
      t.g.getWorldPosition(v); const dist = v.distanceTo(cam.position); v.project(cam)
      if (v.z > 1) { hide(); continue }
      const ax = ((v.x + 1) / 2) * innerWidth, ay = ((1 - v.y) / 2) * innerHeight
      // the size: the voxel words (built for the current look) or the pixel type
      const vk = STYLE + '-' + TIE
      if (STYLE !== 4) { if (!t.vox || t.voxStyle !== vk) { if (t.vox) vroot.remove(t.vox); t.vox = voxWords(THREE, t); t.voxStyle = vk; vroot.add(t.vox) } }
      else { t.el.style.setProperty('--sc', tieCol(t)); if (t.vox) t.vox.visible = false }
      t.el.classList.remove('off')
      const [w, h] = STYLE !== 4 ? t.vox.userData.px : [t.w || (t.w = t.el.offsetWidth), t.h || (t.h = t.el.offsetHeight)], s = t.side || 1
      const DY = [0, -24, -48, -72, null], at = (k) => { const side = k % 3, dy = DY[Math.floor(k / 3)], x = side === 2 ? ax - w / 2 : (side === 0 ? s : -s) > 0 ? ax + 8 : ax - 8 - w; return [x, dy == null ? ay + 10 : ay - h - 6 + dy] }
      const order = [t.k ?? 0, ...Array.from({ length: 15 }, (_, i) => i)].filter((k, i, a) => a.indexOf(k) === i)
      let got = null
      for (const k of order) { const [x, y] = at(k), r = [x, y, x + w, y + h]; if (x < X0 || x + w > X1 || y < Y0 || y + h > Y1) continue; if (avoid.some((a) => hit(r, a)) || placed.some((a) => hit(r, a))) continue; got = { k, r }; break }
      if (!got) { hide(); continue }
      t.k = got.k; placed.push(got.r)
      // the leader: from the nearest point of the tag to the point it names, unless the tag sits on it
      const nx = Math.max(got.r[0], Math.min(ax, got.r[2])), ny = Math.max(got.r[1], Math.min(ay, got.r[3])), ld = Math.hypot(ax - nx, ay - ny)
      if (tieLine() && ld > 14) { const ux = (ax - nx) / ld, uy = (ay - ny) / ld; Object.entries({ x1: nx + ux * 3, y1: ny + uy * 3, x2: ax - ux * 4, y2: ay - uy * 4 }).forEach(([a, b]) => t.ln.setAttribute(a, b.toFixed(1))); t.ln.style.stroke = t.tie || t.color; t.ln.style.display = '' }
      else t.ln.style.display = 'none'
      t.rect = { x0: (got.r[0] / innerWidth) * 2 - 1, x1: (got.r[2] / innerWidth) * 2 - 1, y0: 1 - (got.r[3] / innerHeight) * 2, y1: 1 - (got.r[1] / innerHeight) * 2 }
      if (STYLE === 4) { t.el.style.transform = `translate3d(${Math.round(got.r[0])}px,${Math.round(got.r[1])}px,0)`; continue }
      // the voxel words: on the line of sight through the spot's middle, nearer the camera than the pin (so the stands do not cut them), scaled to S pixels a cell
      const cx = (got.r[0] + got.r[2]) / 2, cy = (got.r[1] + got.r[3]) / 2, D = Math.max(8, Math.min(dist * 0.55, 60))
      const dir = new THREE.Vector3((cx / innerWidth) * 2 - 1, 1 - (cy / innerHeight) * 2, 0.5).unproject(cam).sub(cam.position).normalize()
      t.vox.position.copy(cam.position).addScaledVector(dir, D); t.vox.quaternion.copy(cam.quaternion); t.vox.scale.setScalar(upp(D) * sOf()); t.vox.visible = true
    }
  })
  return L
}
export function stag(api, lines, color, o = {}) {
  const l = layer(api), g = new api.NN.THREE.Group(), el = document.createElement('div')
  el.className = 'stag off'
  if (color) el.style.setProperty('--sc', color)
  el.innerHTML = (lines[0] ? `<i>${lines[0]}</i>` : '') + `<b>${lines[1] ?? ''}</b>`
  l.el.appendChild(el)
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.style.display = 'none'; l.svg.appendChild(ln)
  l.tags.add({ g, el, ln, lines, color, tie: o.tie, prio: o.prio ?? 1, side: o.side || 1, gone: 0, k: null, w: 0, h: 0, rect: null, vox: null, voxStyle: '' })
  l.dirty = true
  return g
}
// the look (TG in THE LAB)
export function setTagStyle(n) { if (n === STYLE) return; STYLE = n; if (L) L.dirty = true }
export function stagAvoid(f) { extra.push(f); if (L) L.dirty = true }
export function setTagTie(n) { if (n === TIE) return; TIE = n; if (L) L.dirty = true }
// for the tests: every tag on screen, in the same form as vox25's readable()
export function screenTags() { return L ? [...L.tags].map((t) => ({ prio: t.prio, fixed: false, off: !t.rect, rect: t.rect, text: t.el.textContent })) : [] }
