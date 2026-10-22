// Cockpit 1, DISCOVERY BANK: the crew station. A wall of separate monitors (telemetry list, the park, side elevation, verdict, input bars, plan view, 30-park
// tiles) over a console of switch banks: every input is a label, a number and four keys (minus 5, minus 1, plus 1, plus 5) that repeat when held.
import { elevation, plan, tiles, TILE_CSS } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, h, css, setP, windowSync, loadParks, evalParks, fencePoly, norm } = U
  css('cp1', `
#cp .c1{position:absolute;inset:12px;display:grid;gap:10px;grid-template-columns:23% 1fr 25%;grid-template-rows:minmax(0,1fr) 188px 108px;--sl:#3f6270}
#cp .c1 .m{border:1px solid var(--ln);position:relative;background:var(--k);min-height:0;overflow:hidden}
#cp .c1 .m.clear{background:transparent}
#cp .c1 .tag{position:absolute;top:0;left:0;font-size:9px;letter-spacing:.22em;padding:1px 7px;background:var(--ln);color:var(--dim);z-index:2}
#cp .c1 .tel{padding:22px 12px 8px;display:grid;align-content:start;gap:3px}
#cp .c1 .r{display:flex;align-items:baseline;gap:6px;font-size:12.5px}
#cp .c1 .r span{color:var(--dim);letter-spacing:.08em}
#cp .c1 .r i{flex:1;border-bottom:1px dotted var(--ln);transform:translateY(-3px)}
#cp .c1 .r b{font-weight:400;color:var(--tx)}
#cp .c1 .r.hot b{color:var(--acc)}
#cp .c1 .mid{grid-column:1/4;display:grid;grid-template-columns:1.25fr .8fr 1fr 1.5fr;gap:10px;min-height:0}
#cp .c1 .ver{background:var(--sl);color:#f4f8f9;display:flex;flex-direction:column;justify-content:space-between;padding:22px 12px 10px;text-align:center}
#cp .c1 .ver.g{background:var(--acc);color:#0b0a08}
#cp .c1 .ver em{font-style:normal;font-size:10px;letter-spacing:.3em}
#cp .c1 .ver b{font:600 30px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.04em}
#cp .c1 .ver u{text-decoration:none;font-size:11px}
#cp .c1 .bars{display:flex;gap:10px;padding:22px 14px 8px;align-items:flex-end;height:100%}
#cp .c1 .bars div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;font-size:9px;text-align:center;color:var(--dim)}
#cp .c1 .bars i{display:block;background:var(--tx);width:100%;transition:height .15s}
#cp .c1 .bars b{font-weight:400;color:var(--tx);font-size:10px;margin-bottom:3px}
#cp .c1 .gt{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;padding:24px 8px 8px;height:100%;align-content:stretch}
#cp .c1 .gn{position:absolute;top:1px;right:8px;font-size:10px;color:var(--acc);letter-spacing:.1em;z-index:2}
#cp .c1 .con{grid-column:1/4;display:grid;grid-template-columns:repeat(5,1fr) 1.45fr;gap:10px}
#cp .c1 .bank{border:1px solid var(--ln);padding:8px 10px;display:grid;grid-template-rows:auto 1fr auto;gap:4px;background:var(--k)}
#cp .c1 .bank label{font-size:10px;letter-spacing:.2em;color:var(--dim)}
#cp .c1 .bank .v{font:600 30px/1 BC,"Barlow Condensed",sans-serif;letter-spacing:.04em}
#cp .c1 .keys{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
#cp .c1 .keys button{padding:5px 0;font-size:12px;text-align:center}
#cp .c1 .pre{display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start}
#cp .c1 .pre button{font-size:11px;padding:4px 8px;letter-spacing:.1em;text-transform:uppercase}
#cp .c1 .pre .go{background:var(--tx);color:var(--k)}
${TILE_CSS('#cp .c1')}
`)
  const BANKS = ['ev', 'la', 'dir', 'temp', 'wind']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c1">
  <div class="m p"><span class="tag">MON 01 TELEMETRY</span><div class="tel" id="c1t"></div></div>
  <div class="m clear" id="c1w"><span class="tag">MON 02 ORACLE PARK</span></div>
  <div class="m p"><span class="tag">MON 03 ELEVATION</span><div id="c1e" style="position:absolute;inset:20px 6px 4px"></div></div>
  <div class="mid">
    <div class="m p ver" id="c1v"><span class="tag">MON 04 VERDICT</span><em></em><b>. . .</b><u></u></div>
    <div class="m p"><span class="tag">MON 05 INPUTS</span><div class="bars" id="c1b"></div></div>
    <div class="m p"><span class="tag">MON 06 PLAN</span><div id="c1p" style="position:absolute;inset:20px 4px 2px"></div></div>
    <div class="m p"><span class="tag">MON 07 GONER GRID</span><span class="gn" id="c1n"></span><div class="gt" id="c1g"></div></div>
  </div>
  <div class="con p">
    ${BANKS.map((k) => `<div class="bank" data-k="${k}"><label>${SPEC[k].label}</label><div class="v"></div><div class="keys">${[-5, -1, 1, 5].map((d) => `<button data-d="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`).join('')}</div></div>`).join('')}
    <div class="bank"><label>PRESETS</label><div class="pre">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c1h"></button><button class="go" data-swing>SWING AGAIN</button></div></div>
  </div></div>`
  windowSync(api, root.querySelector('#c1w'), { zoom: 1.0 })
  // keys that repeat while held
  for (const bank of root.querySelectorAll('.bank[data-k]')) {
    const k = bank.dataset.k
    for (const b of bank.querySelectorAll('button')) {
      let t1 = 0, t2 = 0
      const fire = () => setP(api, k, api.state[k] + Number(b.dataset.d))
      b.addEventListener('pointerdown', () => { fire(); t1 = setTimeout(() => { t2 = setInterval(fire, 70) }, 350) })
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { clearTimeout(t1); clearInterval(t2) })
    }
  }
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c1h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  const parks = await loadParks()
  const fences = parks.parks.map((p) => ({ pts: fencePoly(parks, p), hot: p.abbr === 'SF' }))
  let beat = null
  const T = (id) => root.querySelector(id)
  function render(res) {
    const v = res.verdict, s = api.state
    const rows = [['EXIT SPEED', `${s.ev} MPH`], ['LAUNCH ANGLE', `${s.la} DEG`], ['DIRECTION', SPEC.dir.fmt(s.dir)], ['AIR TEMP', `${s.temp} F`], ['WIND', SPEC.wind.fmt(s.wind)],
      ['BACKSPIN', `${Math.round(res.wb)} RPM`], ['SIDESPIN', `${Math.round(res.ws)} RPM`], ['AIR DENSITY', `${res.rho.toFixed(3)}`], ['HANG TIME', `${res.hang.toFixed(1)} S`],
      ['APEX', `${Math.round(res.peakFt)} FT`], ['DISTANCE', `${Math.round(res.landFt)} FT`]]
    if (v.wallFt) rows.push(['WALL', `${Math.round(v.wallFt)} FT / ${v.wallH.toFixed(0)} FT`], ['HEIGHT AT WALL', `${v.cross.toFixed(0)} FT`], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(0)} FT`])
    T('#c1t').innerHTML = rows.map(([a, b], i) => `<div class="r${i >= 11 ? ' hot' : ''}"><span>${a}</span><i></i><b>${b}</b></div>`).join('')
    T('#c1e').innerHTML = elevation(res, api.FT, { w: 340, h: 300, ink: '#dfe9ec', acc: '#e0a24a', dim: '#6f8892', fs: 9 })
    T('#c1p').innerHTML = plan(res, api.FT, { w: 260, h: 160, fences, reach: 430, fs: 8 })
    T('#c1b').innerHTML = BANKS.map((k) => `<div><b>${k === 'dir' ? SPEC.dir.fmt(s[k]).replace('°', '') : k === 'wind' ? (s[k] === 0 ? '0' : s[k]) : s[k]}</b><i style="height:${Math.max(2, norm(k, s[k]) * 100)}%"></i>${{ ev: 'EV', la: 'LA', dir: 'DIR', temp: 'T', wind: 'W' }[k]}</div>`).join('')
    for (const bank of root.querySelectorAll('.bank[data-k]')) { const k = bank.dataset.k; bank.querySelector('.v').textContent = `${SPEC[k].fmt(s[k])}${SPEC[k].unit && k !== 'dir' && k !== 'wind' ? ' ' + SPEC[k].unit : ''}` }
    T('#c1h').textContent = s.hand > 0 ? 'RIGHT-HANDED' : 'LEFT-HANDED'
    if (parks.parks.length) {
      const pr = evalParks(parks, api)
      T('#c1g').innerHTML = tiles(pr)
      T('#c1n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}`
    }
    verdict()
  }
  function verdict() {
    const el = T('#c1v'), b = beat
    el.className = 'm p ver' + (b && b.tone && (b.tone === 'gone' || b.tone === 'nuke' || b.tone === 'splash' || b.tone === 'scraper') ? ' g' : '')
    el.querySelector('em').textContent = b ? b.state : 'TRACKING'
    el.querySelector('b').textContent = b ? b.text : '. . .'
    el.querySelector('u').textContent = b?.sub ?? ''
  }
  return { render, beat: (b) => { beat = b; verdict() } }
}
