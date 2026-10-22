// Cockpit 3, STATUS BARS: the crew-vitals board. One long column of rows, each a name, a bar and a number. The top five rows are the commanded swing and the bars ARE
// the controls (drag along a bar); the rest are what the flight reports back. The right side is the park, an annunciator panel of every outcome (the active one lights)
// and the side elevation.
import { elevation } from './draw.js'


export async function build(root, api, U) {
  const { SPEC, css, setP, denorm, norm, windowSync, drag, clamp, loadParks, evalParks } = U
  css('cp3', `
#cp .c3{position:absolute;inset:12px;display:grid;grid-template-columns:minmax(380px,46%) 1fr;gap:14px}
#cp .c3 .left{display:grid;grid-template-rows:auto auto 1fr auto;gap:6px;min-height:0}
#cp .c3 h3{margin:10px 0 4px;font:400 12px BC,"Barlow Condensed",sans-serif;letter-spacing:.34em;color:var(--dim);border-bottom:1px solid var(--ln);padding-bottom:3px}
#cp .c3 .row{display:grid;grid-template-columns:130px 1fr 112px;gap:10px;align-items:center;height:27px;font-size:12.5px}
#cp .c3 .row label{color:var(--dim);letter-spacing:.1em}
#cp .c3 .row .v{text-align:right}
#cp .c3 .trk{position:relative;height:14px;border-left:1px solid var(--dim);border-right:1px solid var(--dim);background:repeating-linear-gradient(90deg,transparent 0 9.9%,var(--ln) 9.9% 10%)}
#cp .c3 .trk.cmd{cursor:ew-resize;touch-action:none;height:18px}
#cp .c3 .trk i{position:absolute;left:0;top:3px;bottom:3px;background:var(--tx);opacity:.88}
#cp .c3 .trk.obs i{background:#8aa3ad;opacity:.8}
#cp .c3 .trk i.hot{background:var(--acc);opacity:1}
#cp .c3 .trk em{position:absolute;top:-2px;bottom:-2px;width:3px;background:var(--acc);font-style:normal}
#cp .c3 .trk .zero{position:absolute;left:50%;top:-3px;bottom:-3px;border-left:1px solid var(--dim)}
#cp .c3 .pk{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}
#cp .c3 .pr{display:grid;grid-template-columns:36px 1fr 46px;gap:8px;align-items:center;height:17px;font-size:11px}
#cp .c3 .pr label{color:var(--dim);letter-spacing:.08em}
#cp .c3 .pr .trk{height:9px}
#cp .c3 .pr .v{text-align:right}
#cp .c3 .pr.me label,#cp .c3 .pr.me .v{color:var(--acc)}
#cp .c3 .tools{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
#cp .c3 .tools button{font-size:11px;padding:4px 9px;letter-spacing:.1em;text-transform:uppercase}
#cp .c3 .tools .go{background:var(--tx);color:var(--k)}
#cp .c3 .right{display:grid;grid-template-rows:minmax(0,1fr) auto 200px;gap:10px;min-height:0}
#cp .c3 .vrow{display:grid;grid-template-columns:1fr 330px;gap:12px;align-items:stretch}
#cp .c3 .head{border:1px solid var(--ln);padding:12px 16px;display:flex;flex-direction:column;justify-content:center;gap:6px;min-height:118px;background:var(--k)}
#cp .c3 .head em{font-style:normal;font-size:11px;letter-spacing:.3em;color:var(--dim)}
#cp .c3 .head b{font:600 44px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.03em}
#cp .c3 .head u{text-decoration:none;color:var(--dim)}
#cp .c3 .ann{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
#cp .c3 .ann div{border:1px solid var(--ln);font-size:10px;letter-spacing:.12em;display:flex;align-items:center;justify-content:center;color:var(--ln);text-align:center;padding:2px;min-height:26px;background:var(--k)}
#cp .c3 .ann div.on{background:var(--acc);color:#0b0a08;border-color:var(--acc)}
#cp .c3 .elv{border:1px solid var(--ln);background:var(--k);position:relative;padding:4px 8px}
#cp .c3 .elv span{position:absolute;top:2px;left:6px;font-size:9px;letter-spacing:.25em;color:var(--dim)}
`)
  const CMD = ['ev', 'la', 'dir', 'temp', 'wind']
  const STATES = ['HOME RUN', 'NUKE', 'SPLASH HIT', 'WALL SCRAPER', 'OFF THE WALL', 'SO CLOSE', 'FLY BALL', 'WARNING TRACK', 'LINE DRIVE', 'GROUND BALL', 'POP-UP', 'FOUL BALL']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c3">
  <div class="left p">
    <div><h3>COMMANDED</h3>${CMD.map((k) => `<div class="row"><label>${SPEC[k].label}</label><div class="trk cmd" data-k="${k}"><i></i><em></em></div><div class="v" id="c3v-${k}"></div></div>`).join('')}
    <div class="tools">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c3h"></button><button class="go" data-swing>SWING AGAIN</button></div></div>
    <div><h3>OBSERVED</h3><div id="c3o"></div></div>
    <div><h3>OTHER PARKS, SAME SWING <span id="c3n" style="color:var(--acc);margin-left:10px"></span></h3><div class="pk" id="c3p"></div></div><div></div>
  </div>
  <div class="right">
    <div class="win" id="c3w"></div>
    <div class="vrow"><div class="head p" id="c3hd"><em></em><b>. . .</b><u></u></div><div class="ann p">${STATES.map((s) => `<div data-s="${s}">${s}</div>`).join('')}</div></div>
    <div class="elv p"><span>FLIGHT, SIDE ELEVATION</span><div id="c3e" style="position:absolute;inset:14px 8px 4px"></div></div>
  </div></div>`
  windowSync(api, root.querySelector('#c3w'), { zoom: 1.0 })
  for (const trk of root.querySelectorAll('.trk.cmd')) {
    const k = trk.dataset.k
    drag(trk, (e) => { const r = trk.getBoundingClientRect(); setP(api, k, denorm(k, clamp((e.clientX - r.left) / r.width, 0, 1))) })
  }
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  root.querySelector('#c3h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  const parks = await loadParks()
  let beat = null
  const q = (id) => root.querySelector(id)
  // observed rows: [label, value or null, lo, hi, unit text, centred?, hot?]
  function obsRow([label, val, lo, hi, txt, centred, hot]) {
    let bar = ''
    if (val !== null) {
      const f = clamp((val - lo) / (hi - lo), 0, 1)
      bar = centred ? `<span class="zero"></span><i class="${hot ? 'hot' : ''}" style="left:${Math.min(f, 0.5) * 100}%;width:${Math.abs(f - 0.5) * 100}%"></i>` : `<i class="${hot ? 'hot' : ''}" style="width:${f * 100}%"></i>`
    }
    return `<div class="row"><label>${label}</label><div class="trk obs">${bar}</div><div class="v">${val === null ? '--' : txt}</div></div>`
  }
  function render(res) {
    const s = api.state, v = res.verdict, hasWall = !!v.wallFt
    for (const k of CMD) {
      const trk = q(`.trk[data-k="${k}"]`), f = norm(k, s[k])
      trk.querySelector('i').style.width = `${f * 100}%`
      trk.querySelector('em').style.left = `calc(${f * 100}% - 1px)`
      q(`#c3v-${k}`).textContent = `${SPEC[k].fmt(s[k])}${SPEC[k].unit && k !== 'dir' && k !== 'wind' ? ' ' + SPEC[k].unit : ''}`
    }
    q('#c3h').textContent = s.hand > 0 ? 'RIGHT-HANDED' : 'LEFT-HANDED'
    const clr = hasWall ? (v.kind === 'GONE' ? v.clearBy : -(v.short ?? 0)) : null
    q('#c3o').innerHTML = [
      ['DISTANCE', res.landFt, 0, 500, `${Math.round(res.landFt)} FT`], ['APEX', res.peakFt, 0, 150, `${Math.round(res.peakFt)} FT`], ['HANG TIME', res.hang, 0, 8, `${res.hang.toFixed(1)} S`],
      ['BACKSPIN', res.wb, 0, 4000, `${Math.round(res.wb)} RPM`], ['SIDESPIN', res.ws, -3000, 3000, `${Math.round(res.ws)} RPM`, true], ['AIR DENSITY', res.rho, 1.0, 1.3, res.rho.toFixed(3)],
      ['WALL DISTANCE', hasWall ? v.wallFt : null, 300, 420, hasWall ? `${Math.round(v.wallFt)} FT` : '', false, true], ['WALL HEIGHT', hasWall ? v.wallH : null, 0, 30, hasWall ? `${v.wallH.toFixed(0)} FT` : '', false, true],
      ['HEIGHT AT WALL', hasWall ? v.cross : null, 0, 100, hasWall ? `${v.cross.toFixed(0)} FT` : ''], ['CLEARANCE', clr, -30, 60, clr === null ? '' : `${clr >= 0 ? '+' : ''}${clr.toFixed(0)} FT`, true, v.kind === 'GONE'],
    ].map(obsRow).join('')
    q('#c3e').innerHTML = elevation(res, api.FT, { w: 760, h: 180, ml: 36, fs: 10 })
    if (parks.parks.length) {
      const pr = evalParks(parks, api).slice().sort((a, b) => a.p.abbr.localeCompare(b.p.abbr)), half = Math.ceil(pr.length / 2)
      const one = ({ p, k, margin }) => {
        const f = clamp((margin + 40) / 100, 0, 1), txt = k === 'GONE' ? `+${Math.round(margin)}` : k === 'WALL' ? `${Math.round(margin)}` : k === 'PLAY' ? 'IN' : 'FL'
        const bar = k === 'GONE' || k === 'WALL' ? `<span class="zero" style="left:40%"></span><i class="${k === 'GONE' ? 'hot' : ''}" style="left:${Math.min(f, 0.4) * 100}%;width:${Math.abs(f - 0.4) * 100}%"></i>` : ''
        return `<div class="pr${p.abbr === 'SF' ? ' me' : ''}"><label>${p.abbr}</label><div class="trk obs">${bar}</div><div class="v">${txt}</div></div>`
      }
      q('#c3p').innerHTML = pr.slice(0, half).map((r, i) => one(r) + (pr[half + i] ? one(pr[half + i]) : '')).join('')
      q('#c3n').textContent = `GONE IN ${pr.filter((r) => r.k === 'GONE').length} OF ${pr.length}`
    }
    paint()
  }
  function paint() {
    const hd = q('#c3hd')
    hd.querySelector('em').textContent = beat ? beat.state : 'TRACKING'
    hd.querySelector('b').textContent = beat ? beat.text : '. . .'
    hd.querySelector('u').textContent = beat?.sub ?? ''
    for (const d of root.querySelectorAll('.ann div')) d.classList.toggle('on', !!beat && beat.last && d.dataset.s === beat.state)
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
