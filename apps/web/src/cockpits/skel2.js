// Toolkit for studies 14 to 18 (the second round of skeletal studies). Everything draws with CSS variables (--k ground, --tx ink, --dim, --ln, --acc), so a theme swap
// recolors the whole interface, including the paper theme (dark ink on off-white). Pieces: themes and picker, league histograms (where this ball lands against 2023-2025),
// a big top-down field map, a character-grid field for the ASCII study, a controls model shared by every study, a session log, and the press-down / hover-pop juice.
// No glow, no gloss, no shake: depth is a hard-edged offset shadow and stepped (low frame rate) motion.
import { isHR } from './skel.js'

export const THEMES = {
  // dim is also used for small text, so each is at least 4.5:1 against its ground (checked by the explorer QA tool)
  orange: { name: 'ORANGE', k: '#030403', tx: '#e9e7dc', dim: '#80827a', ln: '#2c2e2a', acc: '#f0802a' },
  amber: { name: 'AMBER', k: '#030403', tx: '#e9e7dc', dim: '#80827a', ln: '#2c2e2a', acc: '#e8a33a' },
  red: { name: 'RED', k: '#050303', tx: '#e9e4de', dim: '#857d77', ln: '#2d2826', acc: '#ff3b2f' },
  green: { name: 'GREEN', k: '#020503', tx: '#b9f3c3', dim: '#5fa06f', ln: '#1c3024', acc: '#7dff9d' },
  bone: { name: 'BONE', k: '#040404', tx: '#d9d7cc', dim: '#82827a', ln: '#2a2a28', acc: '#ffffff' },
  paper: { name: 'PAPER', k: '#ece7d6', tx: '#1b1a14', dim: '#66634f', ln: '#cfc9b4', acc: '#b3301a', light: true },
  // added 26 Oct for the Study 24 mixer: blueprint (navy ground, bone lines, orange accent; his GPT Blueprint concept) and ice (cyan accent on black)
  blueprint: { name: 'BLUEPRINT', k: '#0a1830', tx: '#dfe8f2', dim: '#8ea2bc', ln: '#1d3150', acc: '#ff8a3d' },
  ice: { name: 'ICE', k: '#020506', tx: '#d6f3ff', dim: '#7f9ea8', ln: '#18282d', acc: '#5fd3ff' },
}
export const THEME_CSS = `
#cp .thm{display:flex;gap:4px;align-items:center;font:8px PS2P,monospace;color:var(--dim)}
#cp .thm b{display:block;width:16px;height:14px;border:1px solid var(--tx);cursor:pointer;pointer-events:auto;position:relative;box-shadow:0 2px 0 var(--dim);transition:transform .06s steps(2,end),box-shadow .06s steps(2,end)}
#cp .thm b:hover{transform:translateY(-1px);box-shadow:0 3px 0 var(--dim)}
#cp .thm b:active,#cp .thm b.on{transform:translateY(2px);box-shadow:0 0 0 var(--dim)}
#cp .thm b.on::after{content:'';position:absolute;left:2px;right:2px;bottom:1px;height:2px;background:var(--k)}
`
export function applyTheme(root, api, key, o = {}) {
  const t = THEMES[key] ?? THEMES[o.def ?? 'orange']
  for (const [k, v] of Object.entries({ k: t.k, tx: t.tx, dim: t.dim, ln: t.ln, acc: t.acc })) root.style.setProperty('--' + k, v)
  root.classList.toggle('light', !!t.light)
  if (o.park) {
    api.NN.setBg(t.k)
    const V = api.NN.VIBES[api.NN.vibe()]
    V.ribbon = { GONE: t.acc, WALL: t.acc, PLAY: t.tx, FOUL: t.dim }
    o.onPark?.(t)
  }
  return t
}
// swatches; the choice is remembered per study; ?theme=NAME overrides (used for screenshots)
export function themePicker(root, host, api, id, def, o = {}) {
  let cur = def
  try { cur = new URLSearchParams(location.search).get('theme') || localStorage.getItem('nn-theme-' + id) || def } catch {}
  if (!THEMES[cur]) cur = def
  const d = document.createElement('div')
  d.className = 'thm p'
  d.innerHTML = 'COLOR ' + Object.entries(THEMES).map(([k, t]) => `<b data-k="${k}" title="${t.name}" style="background:${t.acc}"></b>`).join('')
  const set = (k) => {
    cur = k
    applyTheme(root, api, k, o)
    d.querySelectorAll('b').forEach((b) => b.classList.toggle('on', b.dataset.k === k))
    try { localStorage.setItem('nn-theme-' + id, k) } catch {}
    o.onChange?.(k)
  }
  d.querySelectorAll('b').forEach((b) => b.addEventListener('click', () => set(b.dataset.k)))
  host.appendChild(d)
  set(cur)
  return { set, get: () => cur }
}

// ---- juice: depressible buttons (.bt) and panels that pop toward you and tilt on hover -----------------------------------------------------------------------------
export const JUICE_CSS = `
#cp .bt{--e:var(--dim);border:1px solid var(--tx);background:var(--k);color:var(--tx);position:relative;cursor:pointer;user-select:none;box-shadow:0 5px 0 var(--e);
  transition:transform .08s steps(2,end),box-shadow .08s steps(2,end);padding:6px 10px;font:inherit;letter-spacing:inherit;text-transform:inherit;border-radius:0}
#cp .bt,#cp .thm b{pointer-events:auto}
#cp .bt:hover{transform:translateY(-2px);box-shadow:0 7px 0 var(--e)}
#cp .bt.arm{transform:translateY(3px);box-shadow:0 2px 0 var(--e);background:var(--tx);color:var(--k)}
#cp .bt:active,#cp .bt.pr{transform:translateY(5px);box-shadow:0 0 0 var(--e);transition-duration:.03s}
#cp .bt.hot{--e:color-mix(in srgb,var(--acc) 55%,#000);border-color:var(--acc);color:var(--acc);box-shadow:0 7px 0 var(--e)}
#cp .bt.hot:hover{box-shadow:0 9px 0 var(--e)}
#cp .bt.hot.arm{background:var(--acc);color:var(--k);transform:translateY(3px);box-shadow:0 4px 0 var(--e)}
#cp .bt.hot:active,#cp .bt.hot.pr{transform:translateY(7px);box-shadow:0 0 0 var(--e)}
#cp.light .bt.hot{--e:color-mix(in srgb,var(--acc) 60%,#fff)}
#cp .pop{transition:transform .12s steps(3,end),box-shadow .12s steps(3,end)}
#cp .pop:hover{transform:perspective(800px) translateZ(14px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));box-shadow:var(--sx,3px) var(--sy,3px) 0 color-mix(in srgb,var(--dim) 45%,var(--k));z-index:5}
#cp .tile{transition:transform .06s steps(2,end)}
#cp .tile:hover{transform:translate(-1px,-1px);box-shadow:2px 2px 0 var(--dim)}
#cp .bt:focus-visible,#cp button:focus-visible,#cp .thm b:focus-visible,#cp [tabindex]:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
#cp .guard{position:fixed;inset:0;z-index:20;background:var(--k);display:grid;place-items:center;text-align:center;padding:24px;pointer-events:auto}
#cp .guard[hidden]{display:none}
#cp .guard p{max-width:420px;margin:14px auto;color:var(--tx);font-size:20px;line-height:1.2}
@media (prefers-reduced-motion:reduce){#cp .bt,#cp .pop,#cp .tile,#cp .thm b{transition:none}#cp .pop:hover{transform:none}}
`
// Keyboard and small-window finishing: every .bt and swatch is focusable, labeled and works with Enter or Space (the window-level swing key stands down when one has focus), and a window
// smaller than minW by minH shows a card instead of a broken layout (with a way to continue anyway).
let kbNav = false // true after Tab until the next mouse press: only then does a focused button own Enter and Space
addEventListener('keydown', (e) => { if (e.key === 'Tab') kbNav = true }, true)
addEventListener('pointerdown', () => { kbNav = false }, true)
export function finishUI(root, o = {}) {
  for (const el of root.querySelectorAll('.bt,.thm b')) {
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0
    if (!el.getAttribute('role')) el.setAttribute('role', 'button')
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', (el.title || el.textContent || '').trim().replace(/\s+/g, ' ') || 'button')
    // Enter or Space presses a button only when it was reached with Tab; after a mouse click Enter still means swing
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && kbNav) { e.preventDefault(); e.stopPropagation(); el.click() } })
  }
  const minW = o.minW ?? 900, minH = o.minH ?? 560
  const g = document.createElement('div')
  g.className = 'guard'
  g.setAttribute('role', 'alertdialog')
  g.setAttribute('aria-label', 'Window too small')
  g.innerHTML = `<div><div class="ps">THIS VIEW NEEDS ROOM</div><p>It is laid out for a laptop-sized window, at least ${minW} by ${minH}. Make the window bigger, or turn your phone sideways.</p><span class="bt" tabindex="0" role="button">CONTINUE ANYWAY</span></div>`
  root.appendChild(g)
  let dismissed = false
  const chk = () => { g.hidden = dismissed || (innerWidth >= minW && innerHeight >= minH) }
  g.querySelector('.bt').addEventListener('click', () => { dismissed = true; chk() })
  addEventListener('resize', chk)
  chk()
}
// The Oracle fence as the verdict sees it (the wall profile measured from the model), so map labels and the readout agree; other parks use the Savant five-point fences.
export function oracleFence(api, parks, B = [-45, -22.5, 0, 22.5, 45]) {
  const sf = parks.parks.find((p) => p.abbr === 'SF')
  if (!sf || !api.wallAt || !api.wallAt(0)) return sf
  const w = B.map((b) => api.wallAt(b))
  return { ...sf, dist: w.map((x) => x[0]), height: w.map((x) => x[1]) }
}
export function oracleFences(api, fences) {
  if (!api.wallAt?.(0)) return fences
  const pts = []
  for (let b = -45; b <= 45; b += 5) { const [d] = api.wallAt(b), r = (b * Math.PI) / 180; pts.push([d * Math.sin(r), d * Math.cos(r)]) }
  return fences.map((f) => (f.hot ? { ...f, pts } : f))
}
export function popPanels(root, sel = '.pop') {
  for (const p of root.querySelectorAll(sel)) {
    p.addEventListener('mousemove', (e) => {
      const r = p.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5
      p.style.setProperty('--ry', `${Math.round(nx * 10) / 2}deg`) // half-degree steps: stepped, not smooth
      p.style.setProperty('--rx', `${-Math.round(ny * 10) / 2}deg`)
      p.style.setProperty('--sx', `${Math.round(-nx * 8)}px`)
      p.style.setProperty('--sy', `${Math.round(-ny * 8)}px`)
    })
  }
}
export const pressEl = (el) => { if (!el) return; el.classList.add('pr'); setTimeout(() => el.classList.remove('pr'), 140) }

// ---- controls: the six inputs, shared by every study ------------------------------------------------------------------------------------------------------------
export function makeControls(api, U) {
  const { SPEC, setP, clamp, norm } = U
  const SLOTS = [
    { k: 'ev', label: 'SPEED', unit: 'MPH' }, { k: 'la', label: 'ANGLE', unit: 'DEG' }, { k: 'dir', label: 'DIRECTION' },
    { k: 'temp', label: 'AIR', unit: 'F' }, { k: 'wind', label: 'WIND' }, { k: 'hand', label: 'BATTER' },
  ]
  const c = { SLOTS, armed: 0, els: [], onChange: () => {}, onArm: () => {} }
  c.text = (k) => (k === 'hand' ? (api.state.hand > 0 ? 'RIGHT' : 'LEFT') : SPEC[k].fmt(api.state[k]))
  c.frac = (k) => (k === 'hand' ? (api.state.hand > 0 ? 1 : 0) : norm(k, api.state[k]))
  c.arm = (i) => { c.armed = clamp(i, 0, SLOTS.length - 1); c.onArm() }
  c.change = (i, d) => {
    const k = SLOTS[i].k
    if (k === 'hand') { api.state.hand *= -1; api.update() } else setP(api, k, api.state[k] + d)
    pressEl(c.els[i]); c.onChange()
  }
  c.setFrac = (i, f) => { const k = SLOTS[i].k; if (k !== 'hand') setP(api, k, Math.round(SPEC[k].lo + clamp(f, 0, 1) * (SPEC[k].hi - SPEC[k].lo))) }
  // keys: axis 'h' = left/right arm and up/down change (the button strip); 'v' = up/down arm and left/right change (a list)
  c.bind = (fire, axis = 'h') => addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return
    const st = e.shiftKey ? 5 : 1, k = e.key
    if ((k === 'Enter' || k === ' ') && (e.repeat || (kbNav && e.target?.closest?.('.bt,button,.thm b')))) return // holding the key must not swing repeatedly; a button reached with Tab handles its own press
    const [armKeys, chgKeys] = axis === 'h' ? [['ArrowLeft', 'ArrowRight'], ['ArrowUp', 'ArrowDown']] : [['ArrowUp', 'ArrowDown'], ['ArrowRight', 'ArrowLeft']]
    if (k === armKeys[0]) { e.preventDefault(); c.arm(c.armed - 1) } else if (k === armKeys[1]) { e.preventDefault(); c.arm(c.armed + 1) } else if (k === chgKeys[0] || k === '+' || k === '=') { e.preventDefault(); c.change(c.armed, st) } else if (k === chgKeys[1] || k === '-') { e.preventDefault(); c.change(c.armed, -st) } else if (k === 'Enter' || k === ' ') { e.preventDefault(); fire() } else if (/^[1-6]$/.test(k)) c.arm(Number(k) - 1)
    else if (k.toLowerCase() === 'h') c.change(5, 1)
  })
  return c
}

// ---- session: swings, tally, committed ghost -------------------------------------------------------------------------------------------------------------------
const pad = (n, w = 5) => String(n).padStart(w, '0')
export const dirTxt = (d) => (d < 0 ? `${-d}L` : d > 0 ? `${d}R` : 'C')
export function makeSession(api) {
  const s = { swings: 0, hrs: 0, streak: 0, best: 0, log: [], committed: null, fireWanted: false, beat: null }
  s.fire = () => { s.fireWanted = true; api.fire() }
  s.onBeat = (b) => {
    s.beat = b
    if (b.last && (s.fireWanted || window.__fixedTime !== undefined)) {
      s.fireWanted = false
      const res = window.__dojo, st = api.state, hr = isHR(b)
      s.swings++; if (hr) { s.hrs++; s.streak++ } else s.streak = 0
      s.best = Math.max(s.best, Math.round(res.landFt))
      s.log.push({ hr, n: s.swings, ev: st.ev, la: st.la, dir: st.dir, state: b.state, ft: Math.round(res.landFt) })
      s.committed = { path: res.path }
      return true
    }
    return false
  }
  s.line = (l) => `${pad(l.n)}_ ${String(l.ev).padStart(3)} ${String(l.la).padStart(2)} ${dirTxt(l.dir).padStart(3)} > ${l.state} ${l.ft}`
  return s
}

// ---- league histograms ----------------------------------------------------------------------------------------------------------------------------------------
let distsData = null
export async function loadDists() {
  if (distsData) return distsData
  try { const r = await fetch('/dists.json'); distsData = r.ok ? await r.json() : { metrics: {} } } catch { distsData = { metrics: {} } }
  return distsData
}
export const METRICS = [
  { key: 'ev', label: 'EXIT SPEED', unit: 'MPH', get: (r, s) => s.ev, fmt: (v) => `${Math.round(v)}` },
  { key: 'la', label: 'LAUNCH ANGLE', unit: 'DEG', get: (r, s) => s.la, fmt: (v) => `${Math.round(v)}` },
  { key: 'dir', label: 'DIRECTION', unit: 'DEG', get: (r, s) => s.dir, fmt: (v) => (v < -2 ? `L${Math.round(-v)}` : v > 2 ? `R${Math.round(v)}` : 'CF') },
  { key: 'dist', label: 'DISTANCE', unit: 'FT', get: (r) => r.landFt, fmt: (v) => `${Math.round(v)}` },
  { key: 'hang', label: 'HANG (MODELED)', unit: 'S', get: (r) => r.hang, fmt: (v) => v.toFixed(1) },
]
// one histogram: league bars, the home-run subset as an outline, the league average as a dashed line, this ball as an accent bar and marker. Returns the svg and the percentile.
export function histSVG(D, m, res, state, o = {}) {
  const M = D.metrics?.[m.key]
  if (!M) return { svg: '', pct: null }
  const W = o.w ?? 220, H = o.h ?? 64, n = M.all.length, bw = (W - 2) / n, base = H - 13, top = 3
  const v = m.get(res, state), idx = Math.min(n - 1, Math.max(0, Math.floor((v - M.lo) / M.step)))
  const mx = Math.max(...M.all), mh = Math.max(...M.hr, 1)
  let tot = 0, cum = 0, mean = 0
  M.all.forEach((c, i) => { tot += c; mean += c * (M.lo + (i + 0.5) * M.step); if (i < idx) cum += c })
  cum += M.all[idx] / 2
  mean /= tot
  const pct = Math.round((100 * cum) / tot), X = (x) => 1 + ((Math.min(M.hi, Math.max(M.lo, x)) - M.lo) / (M.hi - M.lo)) * (W - 2)
  let g = ''
  M.all.forEach((c, i) => { const h = Math.max(c ? 1 : 0, Math.round((c / mx) * (base - top))); if (h) g += `<rect x="${(1 + i * bw).toFixed(1)}" y="${base - h}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h}" fill="${i === idx ? 'var(--acc)' : 'var(--dim)'}"/>` })
  if (o.hr !== false) g += `<polyline points="${M.hr.map((c, i) => `${(1 + (i + 0.5) * bw).toFixed(1)},${base - Math.round((c / mh) * (base - top) * 0.9)}`).join(' ')}" fill="none" stroke="var(--tx)" stroke-width="1"/>`
  g += `<line x1="${X(mean).toFixed(1)}" x2="${X(mean).toFixed(1)}" y1="${top}" y2="${base}" stroke="var(--tx)" stroke-dasharray="2 2"/>`
  g += `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${top}" y2="${base + 3}" stroke="var(--acc)" stroke-width="2"/>`
  g += `<line x1="1" x2="${W - 1}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="var(--tx)"/>`
  for (const q of [0, 0.5, 1]) { const val = M.lo + q * (M.hi - M.lo); g += `<text x="${1 + q * (W - 2)}" y="${H - 1}" fill="var(--dim)" font-size="12" text-anchor="${q === 0 ? 'start' : q === 1 ? 'end' : 'middle'}">${Number.isInteger(val) ? val : val.toFixed(1)}</text>` }
  return { svg: `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">${g}</svg>`, pct, v, mean }
}
export const pctWord = (p) => (p == null ? '' : p >= 50 ? `TOP ${Math.max(1, 100 - p)}%` : `LOW ${Math.max(1, p)}%`)

// ---- the big field map ----------------------------------------------------------------------------------------------------------------------------------------
// Top-down, line only: distance rings, foul lines, infield, the current park's fence with its measured distances, a ghost of the last swing, the path (dashed in preview).
export function bigPlan(res, FT, o = {}) {
  const W = o.w ?? 700, H = o.h ?? 500, reach = o.reach ?? 470
  const S = Math.min((W - 16) / (2 * reach * Math.sin((47 * Math.PI) / 180)), (H - 26) / reach), cx = W / 2, cy = H - 14
  const X = (x) => Math.round(cx + x * S), Y = (y) => Math.round(cy - y * S), a47 = (47 * Math.PI) / 180
  let g = ''
  for (let r = 50; r <= reach; r += 50) {
    const big = r % 100 === 0
    g += `<path d="M${X(-r * Math.sin(a47))} ${Y(r * Math.cos(a47))}A${r * S} ${r * S} 0 0 1 ${X(r * Math.sin(a47))} ${Y(r * Math.cos(a47))}" fill="none" stroke="${big ? 'var(--dim)' : 'var(--ln)'}" stroke-dasharray="${big ? '2 4' : '1 5'}"/>`
    if (big) g += `<text x="${X(0) + 4}" y="${Y(r) + 12}" fill="var(--dim)" font-size="15">${r}</text>`
  }
  for (const b of [-45, 45]) { const r = (b * Math.PI) / 180; g += `<line x1="${cx}" y1="${cy}" x2="${X(reach * Math.sin(r))}" y2="${Y(reach * Math.cos(r))}" stroke="var(--tx)" opacity=".8"/>` }
  g += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${Y(reach)}" stroke="var(--dim)" stroke-dasharray="2 4"/>`
  const d = 63.64
  g += `<polygon points="${X(0)},${Y(0)} ${X(d)},${Y(d)} ${X(0)},${Y(2 * d)} ${X(-d)},${Y(d)}" fill="none" stroke="var(--dim)"/>`
  g += `<path d="M${X(-d * 1.5)} ${Y(d * 1.12)}A${95 * S} ${95 * S} 0 0 1 ${X(d * 1.5)} ${Y(d * 1.12)}" fill="none" stroke="var(--ln)" stroke-dasharray="2 3"/>`
  for (const f of o.fences ?? []) g += `<polyline points="${f.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="none" stroke="${f.hot ? 'var(--acc)' : 'var(--ln)'}" stroke-width="${f.hot ? 2 : 1}" ${f.hot ? '' : 'stroke-dasharray="1 3"'}/>`
  if (o.park) {
    const B = o.bearings ?? [-45, -22.5, 0, 22.5, 45]
    B.forEach((b, i) => {
      const r = (b * Math.PI) / 180, dd = o.park.dist[i], x = dd * Math.sin(r), y = dd * Math.cos(r), lx = X(x + 14 * Math.sin(r)), ly = Y(y + 14 * Math.cos(r))
      g += `<text x="${lx}" y="${ly}" fill="var(--tx)" font-size="15" text-anchor="${i < 2 ? 'end' : i > 2 ? 'start' : 'middle'}">${Math.round(dd)}</text><text x="${lx}" y="${ly + 13}" fill="var(--dim)" font-size="12" text-anchor="${i < 2 ? 'end' : i > 2 ? 'start' : 'middle'}">${o.park.height[i].toFixed(0)} FT WALL</text>`
    })
  }
  const line = (path, stroke, dash, w) => `<polyline points="${path.filter((_, i) => i % 5 === 0).map((q) => `${X(q.p[0] / FT)},${Y(q.p[1] / FT)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
  if (o.ghost) g += line(o.ghost, 'var(--dim)', '1 3', 1)
  g += line(res.path, 'var(--tx)', o.preview ? '6 4' : '', o.preview ? 1 : 2)
  const L = res.path[res.path.length - 1].p, lx = X(L[0] / FT), ly = Y(L[1] / FT)
  g += `<path d="M${lx - 6} ${ly - 6}l12 12M${lx + 6} ${ly - 6}l-12 12" stroke="var(--acc)" stroke-width="3"/><text x="${lx + (lx > cx + 60 ? -12 : 12)}" y="${ly - 10}" fill="var(--acc)" font-size="18" text-anchor="${lx > cx + 60 ? 'end' : 'start'}">${Math.round(res.landFt)}</text>`
  g += `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="var(--tx)"/>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}
// side arc with the same variables, so it works on paper too
export function arcSVG(res, FT, o = {}) {
  const W = o.w ?? 320, H = o.h ?? 190, m = { l: 30, r: 8, t: 12, b: 20 }, P = res.visPath ?? res.path, v = res.verdict
  const pr = P.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT])
  const xmax = Math.max(pr[pr.length - 1][0], (v.wallFt ?? 0) + 40, 200) * 1.04, ymax = Math.max(res.peakFt * 1.15, (v.wallH ?? 0) + 12, 50)
  const X = (r) => Math.round(m.l + (r / xmax) * (W - m.l - m.r)), Y = (h) => Math.round(H - m.b - (Math.max(h, -2) / ymax) * (H - m.t - m.b))
  let g = ''
  for (let r = 100; r < xmax; r += 100) g += `<line x1="${X(r)}" x2="${X(r)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--dim)" stroke-dasharray="2 4"/><text x="${X(r)}" y="${H - 5}" fill="var(--dim)" font-size="14" text-anchor="middle">${r}</text>`
  for (let h = 50; h < ymax; h += 50) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(h)}" y2="${Y(h)}" stroke="var(--dim)" stroke-dasharray="2 4"/><text x="${m.l - 4}" y="${Y(h) + 4}" fill="var(--dim)" font-size="14" text-anchor="end">${h}</text>`
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--tx)"/>`
  if (v.wallFt) { const wx = X(v.wallFt); g += `<rect x="${wx - 3}" y="${Y(v.wallH)}" width="6" height="${Y(0) - Y(v.wallH)}" fill="none" stroke="var(--acc)" stroke-width="2"/><text x="${wx > W - 90 ? wx - 8 : wx + 8}" y="${Y(v.wallH) - 4}" fill="var(--acc)" font-size="16" text-anchor="${wx > W - 90 ? 'end' : 'start'}">${Math.round(v.wallFt)}/${v.wallH.toFixed(0)}</text>` }
  const path = (pts, stroke, dash, w) => `<polyline points="${pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).map(([r, h]) => `${X(r)},${Y(h)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
  if (o.ghost) g += path(o.ghost.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT]), 'var(--dim)', '1 3', 1)
  g += path(pr, 'var(--tx)', o.preview ? '5 4' : '', o.preview ? 1 : 2)
  let ap = 0; pr.forEach(([, h], i) => { if (h > pr[ap][1]) ap = i })
  g += `<rect x="${X(pr[ap][0]) - 3}" y="${Y(pr[ap][1]) - 3}" width="6" height="6" fill="var(--tx)"/><text x="${X(pr[ap][0]) + 7}" y="${Y(pr[ap][1]) - 4}" fill="var(--tx)" font-size="16">${Math.round(res.peakFt)}</text>`
  const lr = pr[pr.length - 1][0]
  g += `<path d="M${X(lr) - 4} ${Y(0) - 4}l8 8M${X(lr) + 4} ${Y(0) - 4}l-8 8" stroke="var(--acc)" stroke-width="2"/>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}

// ---- character-grid field (study 17) -------------------------------------------------------------------------------------------------------------------------
export function asciiField(res, FT, o = {}) {
  const C = o.cols ?? 72, R = o.rows ?? 34, reach = o.reach ?? 450, ratio = o.ratio ?? 2.25
  const grid = Array.from({ length: R }, () => Array(C).fill(' '))
  // a character cell is about 2.25 times as tall as wide
  const sx = (C - 2) / (2 * reach * Math.sin((47 * Math.PI) / 180)), sy = (R - 2) / reach, S = Math.min(sx, sy * ratio)
  const cx = C / 2, cy = R - 1
  const put = (x, y, ch, force) => { const c = Math.round(cx + x * S), r = Math.round(cy - (y * S) / ratio); if (c >= 0 && c < C && r >= 0 && r < R && (force || grid[r][c] === ' ' || '.:'.includes(grid[r][c]))) grid[r][c] = ch }
  const arc = (rad, a0, a1, ch, step = 0.4) => { for (let a = a0; a <= a1; a += step / rad) put(rad * Math.sin(a), rad * Math.cos(a), ch) }
  const a47 = (47 * Math.PI) / 180, t47 = Math.tan(a47)
  for (let r = 100; r <= reach; r += 100) arc(r, -a47, a47, '.', 5)
  // foul lines: one character per row, so they stay one cell thick
  for (let row = 0; row < R - 1; row++) { const y = ((cy - row) * ratio) / S, dx = y * t47; if (Math.hypot(dx, y) > reach) continue; put(dx, y, '\\', true); put(-dx, y, '/', true) }
  const d = 63.64
  for (let q = 0; q <= 1; q += 0.03) { put(d * q, d * q, '+'); put(d * (1 - q), d + d * q, '+'); put(-d * q, 2 * d - d * q, '+'); put(-d * (1 - q), d * (1 - q), '+') }
  for (const f of o.fences ?? []) if (f.hot) for (let i = 0; i < f.pts.length - 1; i++) { const [x0, y0] = f.pts[i], [x1, y1] = f.pts[i + 1]; for (let q = 0; q < 1; q += 0.15) put(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, '#', true) }
  const pts = res.path.filter((_, i) => i % 3 === 0)
  if (o.ghost) o.ghost.filter((_, i) => i % 3 === 0).forEach((q) => put(q.p[0] / FT, q.p[1] / FT, ':'))
  pts.forEach((q, i) => put(q.p[0] / FT, q.p[1] / FT, o.preview ? (i % 2 ? ' ' : '.') : 'o', true))
  const L = res.path[res.path.length - 1].p
  put(L[0] / FT, L[1] / FT, 'X', true)
  put(0, 0, 'H', true)
  for (const [r, s] of [[100, '100'], [200, '200'], [300, '300'], [400, '400']]) { const c = Math.round(cx + 1), rr = Math.round(cy - (r * S) / ratio); s.split('').forEach((ch, i) => { if (rr >= 0 && rr < R && c + i < C) grid[rr][c + i] = ch }) }
  return grid.map((r) => r.join('')).join('\n')
}
const BLOCKS = ' ▁▂▃▄▅▆▇█'
export function asciiHist(D, m, res, state, cols = 40) {
  const M = D.metrics?.[m.key]
  if (!M) return { rows: ['', '', ''], pct: null }
  const n = M.all.length, v = m.get(res, state), idx = Math.min(n - 1, Math.max(0, Math.floor((v - M.lo) / M.step))), mx = Math.max(...M.all)
  const bins = Array.from({ length: cols }, (_, c) => { const a = Math.floor((c * n) / cols), b = Math.max(a + 1, Math.floor(((c + 1) * n) / cols)); return M.all.slice(a, b).reduce((s, x) => s + x, 0) / (b - a) })
  const bm = Math.max(...bins)
  const mc = Math.min(cols - 1, Math.floor((idx * cols) / n))
  let tot = 0, cum = 0, mean = 0
  M.all.forEach((c, i) => { tot += c; mean += c * (M.lo + (i + 0.5) * M.step); if (i < idx) cum += c })
  mean /= tot
  const ac = Math.min(cols - 1, Math.floor(((mean - M.lo) / (M.hi - M.lo)) * cols))
  // two character rows tall: sixteen levels
  const lv = bins.map((b) => Math.max(b ? 1 : 0, Math.round((b / bm) * 16)))
  const top = lv.map((v, c) => (c === mc && v > 8 ? '█' : BLOCKS[Math.max(0, v - 8)])).join('')
  const bot = lv.map((v, c) => (c === mc ? '█' : BLOCKS[Math.min(8, v)])).join('')
  const mark = Array(cols).fill(' '); mark[ac] = ':'; mark[mc] = '^'
  return { rows: [top, bot, mark.join('')], pct: Math.round((100 * (cum + M.all[idx] / 2)) / tot), mx }
}
