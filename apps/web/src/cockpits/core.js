// Shared plumbing for the ten cockpits (?cp=1..10). A cockpit is a different way of laying out the same live flight: it reads the swing and result from the
// Dojo (window.__cp), draws its own interface, and drives the same state (exit speed, launch angle, direction, temperature, wind, hand).
// The 3D park stays the main event: each cockpit marks a placeholder element as its park window and the camera is fitted to it.
export const SPEC = {
  ev: { lo: 60, hi: 125, label: 'EXIT SPEED', unit: 'MPH', fmt: (v) => `${v}` },
  la: { lo: -10, hi: 60, label: 'LAUNCH ANGLE', unit: 'DEG', fmt: (v) => `${v}` },
  dir: { lo: -50, hi: 50, label: 'DIRECTION', unit: '', fmt: (v) => dirWord(v) },
  temp: { lo: 40, hi: 100, label: 'AIR TEMP', unit: '°F', fmt: (v) => `${v}` },
  wind: { lo: -20, hi: 20, label: 'WIND', unit: 'MPH', fmt: (v) => windWord(v) },
}
export const dirWord = (v) => (v < -5 ? `${-v}° LF` : v > 5 ? `${v}° RF` : 'CF')
export const windWord = (v) => (v === 0 ? 'CALM' : `${Math.abs(v)} ${v > 0 ? 'OUT' : 'IN'}`)
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const norm = (k, v) => (v - SPEC[k].lo) / (SPEC[k].hi - SPEC[k].lo)
export const denorm = (k, f) => SPEC[k].lo + clamp(f, 0, 1) * (SPEC[k].hi - SPEC[k].lo)
export function setP(api, k, v) {
  const s = SPEC[k]
  v = Math.round(clamp(v, s.lo, s.hi))
  if (api.state[k] === v) return
  api.state[k] = v
  api.update()
}
export function h(tag, attrs = {}, html = '') {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') e.style.cssText = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else e.setAttribute(k, v)
  }
  if (html) e.innerHTML = html
  return e
}
export const svgNS = (tag, attrs = {}) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}
export function css(id, text) {
  let s = document.getElementById(id)
  if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s) }
  s.textContent = text
}
// pointer drag with capture; fn(event, phase) where phase is down, move or up
export function drag(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId)
    fn(e, 'down')
    const mv = (ev) => fn(ev, 'move')
    const up = (ev) => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); fn(ev, 'up') }
    el.addEventListener('pointermove', mv)
    el.addEventListener('pointerup', up)
    e.preventDefault()
  })
}
// a number you can drag (vertical by default), spin with the wheel, or step with the arrow keys once focused
export function scrubNum(el, api, key, o = {}) {
  const px = o.px ?? 4, axis = o.axis ?? 'y'
  el.tabIndex = 0
  el.style.cursor = axis === 'y' ? 'ns-resize' : 'ew-resize'
  el.style.touchAction = 'none'
  let v0 = 0, p0 = 0
  drag(el, (e, ph) => {
    if (ph === 'down') { v0 = api.state[key]; p0 = axis === 'y' ? e.clientY : e.clientX } else if (ph === 'move') {
      const d = (axis === 'y' ? p0 - e.clientY : e.clientX - p0)
      setP(api, key, v0 + Math.round(d / px))
    }
  })
  el.addEventListener('wheel', (e) => { e.preventDefault(); setP(api, key, api.state[key] + (e.deltaY < 0 ? 1 : -1)) }, { passive: false })
  el.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
    if (d) { e.preventDefault(); e.stopPropagation(); setP(api, key, api.state[key] + d * (e.shiftKey ? 5 : 1)) }
  })
}
// the flight as plain series for traces: time, range, height, speed, lateral, depth, plus the events
export function series(res, FT) {
  const P = res.path, out = []
  for (let i = 0; i < P.length; i += 4) {
    const a = P[i], b = P[Math.min(i + 4, P.length - 1)]
    const dt = Math.max(b.t - a.t, 1e-6)
    const sp = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]) / dt
    out.push({ t: a.t, range: Math.hypot(a.p[0], a.p[1]) / FT, h: a.p[2] / FT, speed: sp * 2.23694, x: a.p[0] / FT, y: a.p[1] / FT })
  }
  const last = P[P.length - 1]
  out.push({ t: last.t, range: Math.hypot(last.p[0], last.p[1]) / FT, h: last.p[2] / FT, speed: out[out.length - 1].speed, x: last.p[0] / FT, y: last.p[1] / FT })
  let ai = 0
  out.forEach((q, i) => { if (q.h > out[ai].h) ai = i })
  let wi = -1
  const w = res.verdict.wallFt
  if (w) wi = out.findIndex((q) => q.range >= w)
  return { pts: out, apex: ai, wall: wi, end: out.length - 1 }
}
export const T_END = (s) => s.pts[s.end].t
// fit the camera to a placeholder element; opts.zoom scales the automatic zoom
export function windowSync(api, el, o = {}) {
  const apply = () => {
    const r = el.getBoundingClientRect()
    const z = (o.zoom ?? 1) * Math.min(r.width / 780, r.height / 600) * 0.95
    window.__cpWindow = { l: r.left, r: innerWidth - r.right, t: r.top, b: innerHeight - r.bottom, k: 1, z: clamp(z, 0.3, 2.4) }
    api.NN.setWindow(window.__cpWindow)
  }
  new ResizeObserver(apply).observe(el)
  addEventListener('resize', apply)
  apply()
  return apply
}
import { bandPeek, bandWord } from '../carry.js'
export const onRender = (fn) => { window.__cpRender = fn }
export const onBeat = (fn) => { window.__cpBeat = fn }
// the 30 current parks (fences at five bearings, local air), flown with the live swing
let parksData = null
export async function loadParks() {
  if (parksData) return parksData
  try { const r = await fetch('/parks30.json'); parksData = r.ok ? await r.json() : { bearings: [-45, -22.5, 0, 22.5, 45], parks: [] } } catch { parksData = { bearings: [-45, -22.5, 0, 22.5, 45], parks: [] } }
  return parksData
}
export function wallFnOf(data, p) {
  const B = data.bearings
  return (b) => {
    const x = clamp(b, B[0], B[4])
    let i = 0
    while (i < 3 && x > B[i + 1]) i++
    const f = (x - B[i]) / (B[i + 1] - B[i])
    return [p.dist[i] * (1 - f) + p.dist[i + 1] * f, p.height[i] * (1 - f) + p.height[i + 1] * f]
  }
}
export function evalParks(data, api) {
  return data.parks.map((p) => {
    const res = api.fly(api.state, p.abbr === (window.__parkX ?? 'SF') ? {} : { wallFn: wallFnOf(data, p), hPa: p.hpa }) // the loaded park flies against its own measured crest
    const v = res.verdict, k = v.kind
    const margin = k === 'GONE' ? v.clearBy : k === 'WALL' ? -v.short : k === 'PLAY' ? -400 + res.landFt / 10 : -900
    return { p, k, v, res, margin }
  }).sort((a, b) => b.margin - a.margin)
}
// 'gone in N to M of 30 parks' for the live what-if swing: cached, debounced, updates once when ready (null in replay mode or before the carry table loads)
export function goneWord(data, api, pr) {
  const n = pr.filter((r) => r.k === 'GONE').length, b = bandPeek(api.state, api.fly, data.parks, (p) => wallFnOf(data, p), () => api.update())
  return b ? bandWord(b, pr.length) : `${n} OF ${pr.length}`
}
export function fencePoly(data, p, step = 5) {
  const f = wallFnOf(data, p), pts = []
  for (let b = -45; b <= 45; b += step) { const [d] = f(b), r = (b * Math.PI) / 180; pts.push([d * Math.sin(r), d * Math.cos(r)]) }
  return pts
}
export const BASE_CSS = `
body.cp #dojo,body.cp #dj-grid,body.cp #dj-seance,body.cp #strip,body.cp #look{display:none!important}
#cp{position:fixed;inset:0;z-index:7;pointer-events:none;color:var(--tx);font:14px/1.35 STM,"Share Tech Mono",Consolas,monospace;--k:#050608;--tx:#dfe9ec;--dim:#6f8892;--ln:#1f2a30;--acc:#e0a24a}
#cp *{box-sizing:border-box}
#cp .p{pointer-events:auto}
#cp .bc{font-family:BC,"Barlow Condensed","Arial Narrow",sans-serif;text-transform:uppercase;letter-spacing:.18em}
#cp .win{pointer-events:none}
#cp button{font:inherit;color:var(--tx);background:none;border:1px solid var(--ln);padding:3px 10px;cursor:pointer;pointer-events:auto}
#cp button:hover{border-color:var(--tx)}
`
