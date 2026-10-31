// Study 25 tags in the park (31 Oct, Andrew: "The text is sort of jank when you zoom in and out and it's still overlapping and a little wonky in general"; later the
// same day: "the diagetic zenith, cleared the wall, distance still needs to be voxel. Give me options for that too"): the park keeps a small voxel pin where the thing
// happened, and the words sit beside it at one size on the screen, whatever the zoom, placed clear of everything. Each frame the camera moves, the pins are
// projected; a tag tries fifteen spots beside its pin (its own side, the other side, centred; level with the pin, then higher a line at a time, then under it) and
// takes the first inside the park window and clear of the readout, the verdict chip, the chooser, the button, the scoreboard and any tag that ranks above it. It
// keeps last frame's spot while that still works, so tags do not hop; with no room it hides. The words come four ways (PARK TAGS, TG, in THE LAB):
//   1 VOXEL, STEADY: voxel letters, held at one screen size by standing them on the camera's line of sight at a fixed distance and scaling them to it
//   2 VOXEL ON A BOARD: the same on a dark board   3 VOXEL NUMBER ONLY: the number alone   4 PIXEL TYPE: flat pixel type on a dark strip
// stag(api, [small, big], color, { side, prio }) returns an empty Group: put it where the tag points (it rides its parent's visibility; off the scene, it goes away).
import { readable as voxReadable, voxText } from './vox25.js'
let L = null, STYLE = 2
const S = 2.2 // screen pixels to a voxel cell
const CSS = `
#cp .stags{position:fixed;inset:0;pointer-events:none;z-index:2}
#cp .stag{position:absolute;left:0;top:0;padding:3px 7px 4px;background:color-mix(in srgb,var(--k) 86%,transparent);border-left:2px solid var(--sc,var(--acc));white-space:nowrap;font-family:var(--lf),monospace;line-height:1.05;will-change:transform}
#cp .stag i{display:block;font-style:normal;font-size:10px;letter-spacing:.06em;color:var(--dim)}
#cp .stag b{display:block;font-weight:400;font-size:20px;color:var(--sc,var(--acc))}
#cp .stag.off,#cp .stags.vx .stag{visibility:hidden}`
// the voxel words of a tag, in cell units, centred on the group's origin; and their size on the screen
function voxWords(THREE, t) {
  const g = new THREE.Group(), back = STYLE === 2 ? '#141414' : undefined, big = voxText(THREE, t.lines[1] ?? '', { px: 1.5, color: t.color ?? '#f0802a', back })
  big.position.x = -(big.userData.width + 1.5) / 2; g.add(big)
  let wU = big.userData.width + 1.5, hU = 7 * 1.5
  if (STYLE !== 3 && t.lines[0]) { const sm = voxText(THREE, t.lines[0], { px: 1, color: '#e8e1c9', back }); sm.position.set(-(sm.userData.width + 1) / 2, hU + 2, 0); g.add(sm); wU = Math.max(wU, sm.userData.width + 1); hU += 9 }
  for (const c of g.children) c.position.y -= hU / 2
  g.userData.px = [wU * S + 6, hU * S + 6]
  return g
}
function layer(api) {
  if (L) return L
  const host = document.querySelector('#cp') ?? document.body
  if (!document.getElementById('stag-css')) { const st = document.createElement('style'); st.id = 'stag-css'; st.textContent = CSS; document.head.appendChild(st) }
  const el = document.createElement('div'); el.className = 'stags'; host.appendChild(el)
  const THREE = api.NN.THREE, v = new THREE.Vector3(), vroot = new THREE.Group(); vroot.renderOrder = 30; api.NN.scene.add(vroot)
  L = { el, tags: new Set(), api, v, vroot, dirty: true }
  let lastCam = '', frame = 0
  api.NN.frames.push(() => {
    frame++
    if (!L.tags.size) return
    el.classList.toggle('vx', STYLE !== 4)
    const cam = api.NN.camera, ck = cam.position.toArray().map((x) => x.toFixed(2)).join() + cam.quaternion.toArray().map((x) => x.toFixed(3)).join()
    const W = window.__cpWindow ?? { l: 0, r: 0, t: 0, b: 0 }, X0 = W.l + 4, X1 = innerWidth - W.r - 4, Y0 = W.t + 4, Y1 = innerHeight - W.b - 4
    if (ck === lastCam && frame % 6 && !L.dirty) return // nothing moved: the tags stay where they are
    lastCam = ck; L.dirty = false
    // the things a tag keeps clear of: the park's own readouts, and the scoreboard and sign (as the voxel layer measures them)
    const avoid = []
    for (const s of ['#c25rd', '#c25v', '#c25ch', '#c25nk', '#c25t', '#c25bug']) { const n = document.querySelector(s); if (n && n.offsetParent) { const r = n.getBoundingClientRect(); if (r.width && r.height) avoid.push([r.left, r.top, r.right, r.bottom]) } }
    for (const r of voxReadable()) if (r.fixed && r.rect) avoid.push([((r.rect.x0 + 1) / 2) * innerWidth, ((1 - r.rect.y1) / 2) * innerHeight, ((r.rect.x1 + 1) / 2) * innerWidth, ((1 - r.rect.y0) / 2) * innerHeight])
    const placed = [], hit = (a, b, p = 4) => a[0] < b[2] + p && b[0] < a[2] + p && a[1] < b[3] + p && b[1] < a[3] + p
    const upp = (D) => (2 * D * Math.tan((cam.fov * Math.PI) / 360)) / innerHeight // world metres to a screen pixel at distance D
    const list = [...L.tags].sort((a, b) => b.prio - a.prio)
    for (const t of list) {
      const hide = () => { t.el.classList.add('off'); if (t.vox) t.vox.visible = false; t.rect = null }
      let on = true, root = t.g
      for (let p = t.g; p; p = p.parent) { if (!p.visible) on = false; root = p }
      if (root !== api.NN.scene) { if (++t.gone > 2) { t.el.remove(); if (t.vox) vroot.remove(t.vox); L.tags.delete(t) } else hide(); continue }
      t.gone = 0
      if (!on) { hide(); continue }
      t.g.getWorldPosition(v); const dist = v.distanceTo(cam.position); v.project(cam)
      if (v.z > 1) { hide(); continue }
      const ax = ((v.x + 1) / 2) * innerWidth, ay = ((1 - v.y) / 2) * innerHeight
      // the size: the voxel words (built for the current look) or the pixel type
      if (STYLE !== 4) { if (!t.vox || t.voxStyle !== STYLE) { if (t.vox) vroot.remove(t.vox); t.vox = voxWords(THREE, t); t.voxStyle = STYLE; vroot.add(t.vox) } }
      else if (t.vox) t.vox.visible = false
      t.el.classList.remove('off')
      const [w, h] = STYLE !== 4 ? t.vox.userData.px : [t.w || (t.w = t.el.offsetWidth), t.h || (t.h = t.el.offsetHeight)], s = t.side || 1
      const DY = [0, -24, -48, -72, null], at = (k) => { const side = k % 3, dy = DY[Math.floor(k / 3)], x = side === 2 ? ax - w / 2 : (side === 0 ? s : -s) > 0 ? ax + 8 : ax - 8 - w; return [x, dy == null ? ay + 10 : ay - h - 6 + dy] }
      const order = [t.k ?? 0, ...Array.from({ length: 15 }, (_, i) => i)].filter((k, i, a) => a.indexOf(k) === i)
      let got = null
      for (const k of order) { const [x, y] = at(k), r = [x, y, x + w, y + h]; if (x < X0 || x + w > X1 || y < Y0 || y + h > Y1) continue; if (avoid.some((a) => hit(r, a)) || placed.some((a) => hit(r, a))) continue; got = { k, r }; break }
      if (!got) { hide(); continue }
      t.k = got.k; placed.push(got.r)
      t.rect = { x0: (got.r[0] / innerWidth) * 2 - 1, x1: (got.r[2] / innerWidth) * 2 - 1, y0: 1 - (got.r[3] / innerHeight) * 2, y1: 1 - (got.r[1] / innerHeight) * 2 }
      if (STYLE === 4) { t.el.style.transform = `translate3d(${Math.round(got.r[0])}px,${Math.round(got.r[1])}px,0)`; continue }
      // the voxel words: on the line of sight through the spot's middle, nearer the camera than the pin (so the stands do not cut them), scaled to S pixels a cell
      const cx = (got.r[0] + got.r[2]) / 2, cy = (got.r[1] + got.r[3]) / 2, D = Math.max(8, Math.min(dist * 0.55, 60))
      const dir = new THREE.Vector3((cx / innerWidth) * 2 - 1, 1 - (cy / innerHeight) * 2, 0.5).unproject(cam).sub(cam.position).normalize()
      t.vox.position.copy(cam.position).addScaledVector(dir, D); t.vox.quaternion.copy(cam.quaternion); t.vox.scale.setScalar(upp(D) * S); t.vox.visible = true
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
  l.tags.add({ g, el, lines, color, prio: o.prio ?? 1, side: o.side || 1, gone: 0, k: null, w: 0, h: 0, rect: null, vox: null, voxStyle: 0 })
  l.dirty = true
  return g
}
// the look (TG in THE LAB)
export function setTagStyle(n) { if (n === STYLE) return; STYLE = n; if (L) L.dirty = true }
// for the tests: every tag on screen, in the same form as vox25's readable()
export function screenTags() { return L ? [...L.tags].map((t) => ({ prio: t.prio, fixed: false, off: !t.rect, rect: t.rect, text: t.el.textContent })) : [] }
