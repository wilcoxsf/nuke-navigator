// Study 25 histograms: Study 24's honest histogram, plus what Andrew asked for on 26 Oct: the home-run-rate line labeled at its peak, the rate at this ball's own bin
// spelled out, and a hover box on every bin. Bars count balls in play per bin; the line is the share of them that were home runs (bins with fewer than minN balls are
// left off the line because a handful of balls makes a jumpy rate). D is dists.json (all 30 parks) or dists_oracle.json (Oracle only), both science/build_dists.py.
export function hist25(D, key, v, o = {}) {
  const M = D.metrics?.[key]
  if (!M) return { svg: '', pct: null }
  const W = Math.max(120, Math.round(o.w || 260)), H = Math.max(34, Math.round(o.h || 56)), n = M.all.length, bw = (W - 2) / n, base = H - 14, top = 12
  const minN = o.minN ?? 40, fmt = o.fmt ?? ((x) => String(Math.round(x))), unit = o.unit ?? ''
  const idx = Math.min(n - 1, Math.max(0, Math.floor((v - M.lo) / M.step))), mx = Math.max(...M.all)
  let tot = 0, cum = 0, mean = 0
  M.all.forEach((c, i) => { tot += c; mean += c * (M.lo + (i + 0.5) * M.step); if (i < idx) cum += c })
  cum += M.all[idx] / 2
  mean /= tot
  const X = (x) => 1 + ((Math.min(M.hi, Math.max(M.lo, x)) - M.lo) / (M.hi - M.lo)) * (W - 2)
  const rate = M.all.map((c, i) => (c >= minN ? M.hr[i] / c : null)), ok = rate.filter((r) => r != null)
  const maxRate = Math.max(...ok, 0.001), peakI = rate.indexOf(maxRate)
  const RY = (r) => base - (r / maxRate) * (base - top)
  let g = ''
  M.all.forEach((c, i) => { const h = Math.max(c ? 1 : 0, Math.round((c / mx) * (base - top))); if (h) g += `<rect x="${(1 + i * bw).toFixed(1)}" y="${base - h}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${h}" fill="${i === idx ? 'var(--acc)' : 'var(--dim)'}" opacity="${i === idx ? 1 : 0.55}"/>` })
  const pts = rate.map((r, i) => (r == null ? null : `${(1 + (i + 0.5) * bw).toFixed(1)},${RY(r).toFixed(1)}`)).filter(Boolean)
  if (pts.length > 1) g += `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--tx)" stroke-width="2" stroke-linejoin="bevel"/>`
  g += `<line x1="${X(mean).toFixed(1)}" x2="${X(mean).toFixed(1)}" y1="${top}" y2="${base}" stroke="var(--tx)" stroke-dasharray="2 3" opacity=".6"/>`
  g += `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${top - 2}" y2="${base + 3}" stroke="var(--acc)" stroke-width="2"/>`
  g += `<line x1="1" x2="${W - 1}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="var(--tx)"/>`
  // the peak of the line, labeled with its rate, so the line has a scale
  const here = rate[idx], bx = 1 + (idx + 0.5) * bw
  let peakX = null
  if (peakI >= 0 && pts.length > 1) {
    const px = 1 + (peakI + 0.5) * bw, py = RY(maxRate), anchor = px > W * 0.8 ? 'end' : px < W * 0.2 ? 'start' : 'middle'
    peakX = px
    g += `<rect x="${(px - 2.5).toFixed(1)}" y="${(py - 2.5).toFixed(1)}" width="5" height="5" fill="var(--tx)"/>`
    if (!o.inline || Math.abs(px - bx) > 58) g += `<text class="pk" x="${px.toFixed(1)}" y="${Math.max(10, py - 4).toFixed(1)}" fill="var(--tx)" text-anchor="${anchor}" style="font-size:calc(12px * var(--ts))">PEAK ${Math.round(maxRate * 100)}%</text>`
  }
  // where this ball sits on the line: a square on it and its rate, so the line reads as "this share of balls like this one went out"
  if (here != null) {
    const by = RY(here), right = bx > W * 0.62, near = peakX != null && Math.abs(peakX - bx) <= 58
    g += `<rect x="${(bx - 3.5).toFixed(1)}" y="${(by - 3.5).toFixed(1)}" width="7" height="7" fill="var(--acc)" stroke="var(--k)" stroke-width="1.5"/>`
    if (o.inline) g += `<text class="ra" x="${(bx + (right ? -7 : 7)).toFixed(1)}" y="${Math.min(base - 3, Math.max(11, by + (by < top + 14 ? 13 : -5))).toFixed(1)}" fill="var(--acc)" text-anchor="${right ? 'end' : 'start'}" style="font-size:calc(13px * var(--ts))">${Math.round(here * 100)}% WENT OUT${near ? ' (PEAK)' : ''}</text>`
  }
  for (const q of [0, 0.5, 1]) { const val = M.lo + q * (M.hi - M.lo); g += `<text x="${(1 + q * (W - 2)).toFixed(1)}" y="${H - 2}" fill="var(--dim)" style="font-size:calc(12px * var(--ts))" text-anchor="${q === 0 ? 'start' : q === 1 ? 'end' : 'middle'}">${Number.isInteger(val) ? val : val.toFixed(1)}</text>` }
  // a hover box on every bin: its range, how many balls, what share left the park
  M.all.forEach((c, i) => {
    const a = M.lo + i * M.step, b = a + M.step, r = c ? M.hr[i] / c : 0
    g += `<rect class="hv" x="${(1 + i * bw).toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${base}" fill="transparent"><title>${fmt(a)} TO ${fmt(b)}${unit}: ${c.toLocaleString()} BALLS, ${M.hr[i].toLocaleString()} HOME RUNS (${c >= minN ? Math.round(r * 100) + '%' : 'TOO FEW TO SAY'})</title></rect>`
  })
  return { svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}</svg>`, pct: Math.round((100 * cum) / tot), mean, maxRate, peakAt: M.lo + (peakI + 0.5) * M.step, here, n: M.n ?? tot }
}
