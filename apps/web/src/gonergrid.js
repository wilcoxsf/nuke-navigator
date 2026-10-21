// Goner Grid: the swing you set, flown through all 30 current parks (measured fence distance and height at five bearings, interpolated; local air pressure
// from the park's elevation; your temperature and wind). One tile per park, sorted from the most comfortable home run to the least. Prediction, not a measurement.
export const GRID_CSS = `
#dj-grid{position:fixed;z-index:6;left:var(--gl,314px);right:var(--gr,354px);top:104px;color:var(--tx);font:400 11px STM,Consolas,monospace;pointer-events:none}
#dj-grid .gh{display:flex;align-items:baseline;gap:14px;margin-bottom:5px;pointer-events:auto;cursor:pointer;user-select:none}
#dj-grid .gh b{font:600 13px 'Barlow Condensed','Arial Narrow',sans-serif;letter-spacing:.22em;text-transform:uppercase}
#dj-grid .gh .n{color:var(--acc);font-size:12px;letter-spacing:.06em}
#dj-grid .gh .lg{margin-left:auto;display:flex;gap:10px;color:var(--dim);font-size:10px}
#dj-grid .gh .lg i{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:-1px;border:1px solid var(--acc)}
#dj-grid .gh .lg i.g{background:var(--acc)}#dj-grid .gh .lg i.p{border-color:var(--dim)}#dj-grid .gh .lg i.f{border-color:var(--ln);border-style:dashed}
#dj-grid .gt{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;pointer-events:auto}
#dj-grid .t{height:37px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--ln);line-height:1.15;background:rgba(0,0,0,.28);position:relative}
#dj-grid .t u{text-decoration:none;font-size:9.5px;opacity:.85}
#dj-grid .t.g{background:var(--acc);color:var(--acct);border-color:var(--acc)}
#dj-grid .t.w{border-color:var(--acc);color:var(--acc)}
#dj-grid .t.p{color:var(--dim);border-color:var(--dim)}
#dj-grid .t.f{color:var(--ln);border-style:dashed}
#dj-grid .t.me::after{content:'';position:absolute;left:3px;right:3px;bottom:2px;height:2px;background:currentColor}
#dj-grid.off .gt{display:none}
@keyframes gtf{0%{opacity:0}35%{opacity:1}50%{opacity:.25}70%{opacity:1}85%{opacity:.6}100%{opacity:1}}
#dj-grid.ani .t{animation:gtf .5s steps(1,end) both;animation-delay:calc(var(--i) * 14ms)}
#dojo:not(.ui-K) ~ #dj-grid, body:has(#dojo:not(.ui-K)) #dj-grid{display:none}
body:has(#dojo.ui-K.lay-dock) #dj-grid{--gl:14px;--gr:14px}
body:has(#dojo.ui-K.lay-min) #dj-grid{--gl:246px;--gr:14px}
`

export function initGrid({ state, fly, onChange }) {
  let data = null, collapsed = false
  const st = document.createElement('style')
  st.textContent = GRID_CSS
  document.head.appendChild(st)
  const el = document.createElement('div')
  el.id = 'dj-grid'
  el.innerHTML = '<div class="gh"><b>Goner Grid</b><span class="n"></span><span class="lg"><span><i class="g"></i>GONE</span><span><i></i>WALL</span><span><i class="p"></i>IN PLAY</span><span><i class="f"></i>FOUL</span></span></div><div class="gt"></div>'
  document.body.appendChild(el)
  el.querySelector('.gh').addEventListener('click', () => { collapsed = !collapsed; el.classList.toggle('off', collapsed); onChange?.(!collapsed) })
  const wallFnOf = (p) => {
    const B = data.bearings
    return (b) => {
      const x = Math.min(Math.max(b, B[0]), B[4])
      let i = 0
      while (i < 3 && x > B[i + 1]) i++
      const f = (x - B[i]) / (B[i + 1] - B[i])
      return [p.dist[i] * (1 - f) + p.dist[i + 1] * f, p.height[i] * (1 - f) + p.height[i + 1] * f]
    }
  }
  function refresh() {
    if (!data) return
    const rows = data.parks.map((p) => {
      const res = fly(state, p.abbr === 'SF' ? {} : { wallFn: wallFnOf(p), hPa: p.hpa })
      const v = res.verdict, k = v.kind
      const margin = k === 'GONE' ? v.clearBy : k === 'WALL' ? -v.short : k === 'PLAY' ? -400 + res.landFt / 10 : -900
      return { p, k, v, res, margin }
    }).sort((a, b) => b.margin - a.margin)
    const gone = rows.filter((r) => r.k === 'GONE').length
    el.querySelector('.n').textContent = `GONE IN ${gone} OF ${rows.length} PARKS`
    el.querySelector('.gt').innerHTML = rows.map(({ p, k, v, margin, res }, i) => {
      const cls = k === 'GONE' ? 'g' : k === 'WALL' ? 'w' : k === 'PLAY' ? 'p' : 'f'
      const val = k === 'GONE' ? `+${Math.round(margin)}` : k === 'WALL' ? `${Math.round(margin)}` : k === 'PLAY' ? 'IN' : 'FL'
      const tip = `${p.name} (${p.season} fences): ${k === 'GONE' ? `over the wall by ${margin.toFixed(1)} ft (wall ${Math.round(v.wallFt)} ft, ${v.wallH.toFixed(0)} ft tall)` : k === 'WALL' ? `hits the wall ${(-margin).toFixed(1)} ft short of the top (${Math.round(v.wallFt)} ft, ${v.wallH.toFixed(0)} ft tall)` : k === 'PLAY' ? `stays in play, lands ${Math.round(res.landFt)} ft out` : 'foul'}; air ${res.rho.toFixed(3)} kg/m3`
      return `<div class="t ${cls}${p.abbr === 'SF' ? ' me' : ''}" style="--i:${i}" title="${tip}">${p.abbr}<u>${val}</u></div>`
    }).join('')
  }
  fetch('/parks30.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { data = d; refresh() } }).catch(() => {})
  let pt = 0
  const pulse = () => { el.classList.remove('ani'); void el.offsetWidth; el.classList.add('ani'); clearTimeout(pt); pt = setTimeout(() => el.classList.remove('ani'), 1100) }
  return { refresh, pulse, el, isOn: () => !collapsed }
}
