// Shared toolkit for the skeletal studies (cockpits 11 to 13): austere arcade, Neuromancer-flavored. Black void, bone-colored lines, one accent, bitmap type, outlines instead of
// fills, stepped (low frame rate) motion, no glow, no gloss, no shake. Drawings are line-only SVG with crisp edges.
export const ACCENTS = { amber: '#e8a33a', red: '#ff3b2f', green: '#7dff9d', bone: '#e9e7dc' }
export const SKEL_CSS = `
@font-face{font-family:PS2P;src:url(/fonts/PressStart2P-Regular.ttf)}
@font-face{font-family:VT;src:url(/fonts/VT323-Regular.ttf)}
#cp.skel{--k:#030403;--tx:#e9e7dc;--dim:#6a6c64;--ln:#2c2e2a;--acc:#e8a33a;font:20px/1 VT,'Share Tech Mono',monospace;letter-spacing:.02em;-webkit-font-smoothing:none;text-transform:uppercase}
#cp.skel svg{shape-rendering:crispEdges;font-family:VT,monospace}
#cp.skel .ps{font-family:PS2P,monospace;font-size:8px;letter-spacing:0;line-height:1.5}
#cp.skel .pnl{border:1px solid var(--tx);position:relative;background:var(--k);min-height:0}
#cp.skel .pnl.clear{background:transparent}
#cp.skel .pnl>.t{position:absolute;top:-5px;left:10px;background:var(--k);padding:0 6px;font:8px/10px PS2P,monospace;color:var(--tx);z-index:3}
#cp.skel .pnl.clear>.t{background:var(--k)}
#cp.skel button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--tx);background:var(--k);border:1px solid var(--tx);border-radius:0;padding:2px 8px;cursor:pointer}
#cp.skel button:hover{background:var(--tx);color:var(--k)}
#cp.skel button:active{transform:translate(2px,2px);background:var(--acc);border-color:var(--acc);color:var(--k)}
#cp.skel .seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;height:16px;cursor:pointer;touch-action:none}
#cp.skel .seg i{border:1px solid var(--dim);display:block}
#cp.skel .seg i.on{background:var(--tx);border-color:var(--tx)}
#cp.skel .seg i.hot{background:var(--acc);border-color:var(--acc)}
#cp.skel .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--dim);color:var(--dim);font-size:15px;line-height:.95;position:relative;font-style:normal}
#cp.skel .tile u{text-decoration:none;font-size:13px}
#cp.skel .tile.g{border-color:var(--acc);color:var(--acc)}
#cp.skel .tile.w{border-color:var(--tx);color:var(--tx)}
#cp.skel .tile.f{border-style:dotted;color:var(--ln)}
#cp.skel .tile.me{outline:1px solid var(--tx);outline-offset:1px}
@keyframes stamp{0%{transform:scale(1.5);background:var(--tx);color:var(--k)}34%{transform:scale(1.2);background:var(--k);color:var(--acc)}67%{transform:scale(1.06);background:var(--acc);color:var(--k)}100%{transform:scale(1);background:var(--k);color:var(--tx)}}
#cp.skel .stamp{animation:stamp .36s steps(1,end) 1}
@keyframes blinkc{0%,49%{opacity:1}50%,100%{opacity:0}}
#cp.skel .cur{display:inline-block;width:.6em;height:1em;background:var(--tx);vertical-align:-2px;animation:blinkc 1s steps(1,end) infinite}
#cp.skel .acc{display:flex;gap:4px;align-items:center;font:8px PS2P,monospace;color:var(--dim)}
#cp.skel .acc b{display:block;width:14px;height:14px;border:1px solid var(--tx);cursor:pointer;pointer-events:auto}
@media (prefers-reduced-motion:reduce){#cp.skel .stamp,#cp.skel .cur{animation:none}}
`
// the accent can be cycled with four swatches, remembered per browser
export function accentPicker(root, host) {
  let cur = 'amber'
  try { cur = localStorage.getItem('nn-accent') || 'amber' } catch {}
  const set = (k) => { root.style.setProperty('--acc', ACCENTS[k]); try { localStorage.setItem('nn-accent', k) } catch {} }
  const d = document.createElement('div')
  d.className = 'acc p'
  d.innerHTML = 'ACCENT ' + Object.entries(ACCENTS).map(([k, c]) => `<b data-k="${k}" style="background:${c}" title="${k}"></b>`).join('')
  d.querySelectorAll('b').forEach((b) => b.addEventListener('click', () => set(b.dataset.k)))
  host.appendChild(d)
  set(ACCENTS[cur] ? cur : 'amber')
}
export const segs = (n) => `<span class="seg">${'<i></i>'.repeat(n)}</span>`
export function litSegs(el, f, hot) {
  const kids = el.children, on = Math.round(f * kids.length)
  for (let i = 0; i < kids.length; i++) { kids[i].classList.toggle('on', i < on); kids[i].classList.toggle('hot', !!hot && i === on - 1) }
}
export function restamp(el) { el.classList.remove('stamp'); void el.offsetWidth; el.classList.add('stamp') }
const n0 = (v) => Math.round(v)
// Plan view, line only: range rings as dashes, the foul lines, 30 fences (current park bright), the committed path, an optional ghost of the last swing and a dashed preview
export function skelPlan(res, FT, o = {}) {
  const W = o.w ?? 320, H = o.h ?? 190, cx = W / 2, cy = H - 12, reach = o.reach ?? 440, S = (H - 26) / reach
  const X = (x) => Math.round(cx + x * S), Y = (y) => Math.round(cy - y * S)
  let g = ''
  for (let r = 100; r <= reach; r += 100) {
    const a = (47 * Math.PI) / 180
    g += `<path d="M${X(-r * Math.sin(a))} ${Y(r * Math.cos(a))}A${r * S} ${r * S} 0 0 1 ${X(r * Math.sin(a))} ${Y(r * Math.cos(a))}" fill="none" stroke="#6a6c64" stroke-dasharray="2 4"/><text x="${X(0) + 3}" y="${Y(r) + 11}" fill="#6a6c64" font-size="14">${r}</text>`
  }
  for (const b of [-45, 45]) { const r = (b * Math.PI) / 180; g += `<line x1="${cx}" y1="${cy}" x2="${X(reach * Math.sin(r))}" y2="${Y(reach * Math.cos(r))}" stroke="#e9e7dc" opacity=".8"/>` }
  g += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${Y(reach)}" stroke="#6a6c64" stroke-dasharray="2 4"/>`
  for (const f of o.fences ?? []) g += `<polyline points="${f.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="none" stroke="${f.hot ? 'var(--acc)' : '#6a6c64'}" stroke-width="${f.hot ? 2 : 1}" ${f.hot ? '' : 'stroke-dasharray="1 2"'}/>`
  const line = (path, stroke, dash, w = 2) => `<polyline points="${path.filter((_, i) => i % 6 === 0).map((q) => `${X(q.p[0] / FT)},${Y(q.p[1] / FT)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
  if (o.ghost) g += line(o.ghost, '#6a6c64', '1 3', 1)
  g += line(res.path, o.preview ? '#e9e7dc' : '#e9e7dc', o.preview ? '5 4' : '', o.preview ? 1 : 2)
  const L = res.path[res.path.length - 1].p, lx = X(L[0] / FT), ly = Y(L[1] / FT)
  g += `<path d="M${lx - 4} ${ly - 4}l8 8M${lx + 4} ${ly - 4}l-8 8" stroke="var(--acc)" stroke-width="2"/><rect x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="#e9e7dc"/>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}
// Side arc, line only, same conventions
export function skelArc(res, FT, o = {}) {
  const W = o.w ?? 320, H = o.h ?? 190, m = { l: 28, r: 8, t: 12, b: 20 }
  const P = res.visPath ?? res.path, v = res.verdict
  const pr = P.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT])
  const xmax = Math.max(pr[pr.length - 1][0], (v.wallFt ?? 0) + 40, 200) * 1.04, ymax = Math.max(res.peakFt * 1.15, (v.wallH ?? 0) + 12, 50)
  const X = (r) => Math.round(m.l + (r / xmax) * (W - m.l - m.r)), Y = (h) => Math.round(H - m.b - (Math.max(h, -2) / ymax) * (H - m.t - m.b))
  let g = ''
  for (let r = 100; r < xmax; r += 100) g += `<line x1="${X(r)}" x2="${X(r)}" y1="${m.t}" y2="${H - m.b}" stroke="#6a6c64" stroke-dasharray="2 4"/><text x="${X(r)}" y="${H - 5}" fill="#6a6c64" font-size="14" text-anchor="middle">${r}</text>`
  for (let h = 50; h < ymax; h += 50) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(h)}" y2="${Y(h)}" stroke="#6a6c64" stroke-dasharray="2 4"/><text x="${m.l - 4}" y="${Y(h) + 4}" fill="#6a6c64" font-size="14" text-anchor="end">${h}</text>`
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="#e9e7dc"/>`
  if (v.wallFt) { const wx = X(v.wallFt); g += `<rect x="${wx - 3}" y="${Y(v.wallH)}" width="6" height="${Y(0) - Y(v.wallH)}" fill="none" stroke="var(--acc)" stroke-width="2"/><text x="${wx > W - 90 ? wx - 8 : wx + 8}" y="${Y(v.wallH) - 4}" fill="var(--acc)" font-size="16" text-anchor="${wx > W - 90 ? 'end' : 'start'}">${n0(v.wallFt)}/${v.wallH.toFixed(0)}</text>` }
  const path = (pts, stroke, dash, w) => `<polyline points="${pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).map(([r, h]) => `${X(r)},${Y(h)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
  if (o.ghost) g += path(o.ghost.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT]), '#6a6c64', '1 3', 1)
  g += path(pr, '#e9e7dc', o.preview ? '5 4' : '', o.preview ? 1 : 2)
  let ap = 0; pr.forEach(([, h], i) => { if (h > pr[ap][1]) ap = i })
  g += `<rect x="${X(pr[ap][0]) - 3}" y="${Y(pr[ap][1]) - 3}" width="6" height="6" fill="#e9e7dc"/><text x="${X(pr[ap][0]) + 7}" y="${Y(pr[ap][1]) - 4}" fill="#e9e7dc" font-size="16">${n0(res.peakFt)}</text>`
  const lr = pr[pr.length - 1][0]
  g += `<path d="M${X(lr) - 4} ${Y(0) - 4}l8 8M${X(lr) + 4} ${Y(0) - 4}l-8 8" stroke="var(--acc)" stroke-width="2"/>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${g}</svg>`
}
export function tileHTML(rows) {
  return rows.map(({ p, k, margin }) => {
    const c = k === 'GONE' ? 'g' : k === 'WALL' ? 'w' : k === 'PLAY' ? 'p' : 'f'
    const val = k === 'GONE' ? `+${n0(margin)}` : k === 'WALL' ? `${n0(margin)}` : k === 'PLAY' ? 'IN' : 'FL'
    return `<i class="tile ${c}${p.abbr === 'SF' ? ' me' : ''}" title="${p.name}">${p.abbr}<u>${val}</u></i>`
  }).join('')
}
export const isHR = (b) => !!b && b.last && ['gone', 'nuke', 'splash', 'scraper'].includes(b.tone)
