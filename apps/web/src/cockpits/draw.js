// Drawings shared between cockpits: side elevation, plan view with the 30 fences, the small tile grid. All return markup strings (SVG or HTML).
const n0 = (v) => Math.round(v)
export function elevation(res, FT, o = {}) {
  const W = o.w ?? 400, H = o.h ?? 200, m = { l: o.ml ?? 30, r: 14, t: 16, b: 22 }
  const ink = o.ink ?? '#dfe9ec', acc = o.acc ?? '#e0a24a', dim = o.dim ?? '#6f8892', fs = o.fs ?? 9
  const P = res.visPath ?? res.path
  const pr = P.map((q) => [Math.hypot(q.p[0], q.p[1]) / FT, q.p[2] / FT])
  const v = res.verdict
  const xmax = Math.max(pr[pr.length - 1][0], (v.wallFt ?? 0) + 40, 200) * 1.04
  const ymax = Math.max(res.peakFt * 1.15, (v.wallH ?? 0) + 12, 50)
  const X = (r) => m.l + (r / xmax) * (W - m.l - m.r), Y = (hh) => H - m.b - (Math.max(hh, -2) / ymax) * (H - m.t - m.b)
  let g = ''
  for (let r = 100; r < xmax; r += 100) g += `<line x1="${X(r)}" x2="${X(r)}" y1="${m.t}" y2="${H - m.b}" stroke="${dim}" stroke-opacity=".35" stroke-dasharray="2 4"/><text x="${X(r)}" y="${H - 8}" fill="${dim}" font-size="${fs}" text-anchor="middle">${r}</text>`
  for (let hh = 50; hh < ymax; hh += 50) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(hh)}" y2="${Y(hh)}" stroke="${dim}" stroke-opacity=".25" stroke-dasharray="2 4"/><text x="${m.l - 5}" y="${Y(hh) + 3}" fill="${dim}" font-size="${fs}" text-anchor="end">${hh}</text>`
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="${ink}" stroke-width="1.4"/>`
  if (v.wallFt) {
    const wx = X(v.wallFt), wh = Y(0) - Y(v.wallH)
    const left = wx > W - 120
    g += `<rect x="${wx - 2.5}" y="${Y(v.wallH)}" width="5" height="${wh}" fill="${acc}"/><text x="${left ? wx - 8 : wx + 8}" y="${Y(v.wallH) - 4}" fill="${acc}" font-size="${fs + 1}" text-anchor="${left ? 'end' : 'start'}">${n0(v.wallFt)} FT / ${v.wallH.toFixed(0)} FT</text>`
  }
  const d = pr.filter((_, i) => i % 3 === 0 || i === pr.length - 1).map(([r, hh], i) => `${i ? 'L' : 'M'}${X(r).toFixed(1)} ${Y(hh).toFixed(1)}`).join(' ')
  g += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.8"/>`
  let ap = 0
  pr.forEach(([, hh], i) => { if (hh > pr[ap][1]) ap = i })
  const [ar, ah] = pr[ap]
  g += `<line x1="${X(ar)}" x2="${X(ar)}" y1="${Y(0)}" y2="${Y(ah)}" stroke="${ink}" stroke-dasharray="3 3" stroke-opacity=".6"/><rect x="${X(ar) - 3}" y="${Y(ah) - 3}" width="6" height="6" transform="rotate(45 ${X(ar)} ${Y(ah)})" fill="${ink}"/><text x="${X(ar) + 7}" y="${Y(ah) - 5}" fill="${ink}" font-size="${fs + 1}">${n0(res.peakFt)} FT</text>`
  const lr = pr[pr.length - 1][0]
  g += `<path d="M${X(lr) - 4} ${Y(0) - 4}L${X(lr) + 4} ${Y(0) + 4}M${X(lr) + 4} ${Y(0) - 4}L${X(lr) - 4} ${Y(0) + 4}" stroke="${acc}" stroke-width="2"/><text x="${Math.min(X(lr), W - 30)}" y="${Y(0) + 14}" fill="${acc}" font-size="${fs + 1}" text-anchor="middle">${n0(res.landFt)}</text>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" font-family="STM,Consolas,monospace">${g}</svg>`
}
// plan view: home plate at the bottom, fence outlines (other parks dim, the highlighted park bright), ground track and landing mark. fences: [{pts, hot}] in feet
export function plan(res, FT, o = {}) {
  const W = o.w ?? 300, H = o.h ?? 300, ink = o.ink ?? '#dfe9ec', acc = o.acc ?? '#e0a24a', dim = o.dim ?? '#6f8892', fs = o.fs ?? 9
  const cx = W / 2, cy = H - 16, S = (H - 34) / (o.reach ?? 440)
  const X = (x) => cx + x * S, Y = (y) => cy - y * S
  let g = ''
  for (let r = 100; r <= (o.reach ?? 440); r += 100) {
    const a0 = (-47 * Math.PI) / 180, a1 = (47 * Math.PI) / 180
    g += `<path d="M${X(r * Math.sin(a0))} ${Y(r * Math.cos(a0))}A${r * S} ${r * S} 0 0 1 ${X(r * Math.sin(a1))} ${Y(r * Math.cos(a1))}" fill="none" stroke="${dim}" stroke-opacity=".3" stroke-dasharray="2 4"/><text x="${X(0) + 3}" y="${Y(r) + 9}" fill="${dim}" font-size="${fs}">${r}</text>`
  }
  for (const b of [-45, -30, -15, 0, 15, 30, 45]) { const r = (b * Math.PI) / 180, L = (o.reach ?? 440) * S; g += `<line x1="${cx}" y1="${cy}" x2="${cx + L * Math.sin(r)}" y2="${cy - L * Math.cos(r)}" stroke="${dim}" stroke-opacity="${Math.abs(b) === 45 ? 0.7 : 0.22}"/>` }
  for (const f of o.fences ?? []) g += `<polyline points="${f.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}" fill="none" stroke="${f.hot ? acc : dim}" stroke-opacity="${f.hot ? 1 : 0.35}" stroke-width="${f.hot ? 2 : 1}"/>`
  const pts = res.path.filter((_, i) => i % 6 === 0).map((q) => `${X(q.p[0] / FT).toFixed(1)},${Y(q.p[1] / FT).toFixed(1)}`).join(' ')
  g += `<polyline points="${pts}" fill="none" stroke="${ink}" stroke-width="1.5"/>`
  const L = res.path[res.path.length - 1].p
  g += `<path d="M${X(L[0] / FT) - 4} ${Y(L[1] / FT) - 4}L${X(L[0] / FT) + 4} ${Y(L[1] / FT) + 4}M${X(L[0] / FT) + 4} ${Y(L[1] / FT) - 4}L${X(L[0] / FT) - 4} ${Y(L[1] / FT) + 4}" stroke="${acc}" stroke-width="2"/>`
  g += `<rect x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="${ink}" transform="rotate(45 ${cx} ${cy})"/>`
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" font-family="STM,Consolas,monospace">${g}</svg>`
}
// tiles: rows from evalParks, ranked; cls g = gone, w = wall, p = in play, f = foul
export function tiles(rows, o = {}) {
  return rows.map(({ p, k, margin }) => {
    const c = k === 'GONE' ? 'g' : k === 'WALL' ? 'w' : k === 'PLAY' ? 'p' : 'f'
    const val = k === 'GONE' ? `+${n0(margin)}` : k === 'WALL' ? `${n0(margin)}` : k === 'PLAY' ? 'IN' : 'FL'
    return `<i class="t ${c}${p.abbr === 'SF' ? ' me' : ''}" title="${p.name}"><b>${p.abbr}</b>${o.val === false ? '' : `<u>${val}</u>`}</i>`
  }).join('')
}
export const TILE_CSS = (sel, acc = 'var(--acc)') => `
${sel} .t{display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--ln);font-style:normal;line-height:1.1;font-size:10px;position:relative}
${sel} .t b{font-weight:400}${sel} .t u{text-decoration:none;font-size:9px;opacity:.85}
${sel} .t.g{background:${acc};color:var(--k);border-color:${acc}}
${sel} .t.w{border-color:${acc};color:${acc}}
${sel} .t.p{color:var(--dim);border-color:var(--dim)}
${sel} .t.f{color:var(--ln);border-style:dashed}
${sel} .t.me::after{content:'';position:absolute;left:2px;right:2px;bottom:1px;height:2px;background:currentColor}
`
