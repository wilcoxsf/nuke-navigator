// Cockpit 9, DEPARTURES BOARD: the table is the interface. Thirty gates, one per park, in split-flap lettering: how far the fence is at the bearing the ball lands, how tall it is,
// whether this ball DEPARTED, was DELAYED at the wall, stayed GROUNDED or was CANCELLED (foul), and by how many feet. Rows re-sort and the letters flip when you change the swing.
// The park is the small window above the inputs.
import { elevation } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, loadParks, evalParks, wallFnOf, scrubNum } = U
  css('cp9', `
#cp .c9{position:absolute;inset:12px;display:grid;grid-template-columns:minmax(380px,34%) 1fr;gap:12px}
#cp .c9 .left{display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:10px;min-height:0}
#cp .c9 .box{border:1px solid var(--ln);background:var(--k);position:relative}
#cp .c9 .box.clear{background:transparent}
#cp .c9 .cap{font:400 11px BC,"Barlow Condensed",sans-serif;letter-spacing:.3em;color:var(--dim);padding:3px 9px;border-bottom:1px solid var(--ln);display:flex;justify-content:space-between}
#cp .c9 .box.clear .cap{position:absolute;top:0;left:0;right:0;border:0;z-index:2}
#cp .c9 .inp{display:grid;gap:0;padding:4px 10px 8px}
#cp .c9 .inp div{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;height:30px;border-bottom:1px solid #12181c}
#cp .c9 .inp label{color:var(--dim);letter-spacing:.14em;font-size:11px}
#cp .c9 .inp .num{font:600 22px/1 BC,"Barlow Condensed",sans-serif;min-width:100px;text-align:right;outline:0;letter-spacing:.03em}
#cp .c9 .inp .num:focus{color:var(--acc)}
#cp .c9 .inp button{padding:0 8px;font-size:13px}
#cp .c9 .tools{display:flex;gap:4px;flex-wrap:wrap;padding:6px 10px 8px}
#cp .c9 .tools button{font-size:10.5px;padding:3px 8px;letter-spacing:.1em;text-transform:uppercase}
#cp .c9 .tools .go{background:var(--tx);color:var(--k)}
#cp .c9 .stat{padding:10px 14px 12px;display:grid;gap:3px}
#cp .c9 .stat em{font-style:normal;font-size:10px;letter-spacing:.3em;color:var(--dim)}
#cp .c9 .stat b{font:600 30px/1 BC,"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.03em}
#cp .c9 .stat u{text-decoration:none;color:var(--dim);font-size:12px}
#cp .c9 .board{display:grid;grid-template-rows:auto auto 1fr;min-height:0}
#cp .c9 .bh{display:flex;align-items:baseline;gap:20px;padding:6px 12px 6px}
#cp .c9 .bh b{font:600 22px BC,"Barlow Condensed",sans-serif;letter-spacing:.4em}
#cp .c9 .bh span{color:var(--acc);font-size:12px;letter-spacing:.14em}
#cp .c9 .bh i{margin-left:auto;font-style:normal;font-size:10px;letter-spacing:.14em;color:var(--dim)}
#cp .c9 .hd,#cp .c9 .rw{display:grid;grid-template-columns:40px 1.5fr 54px 70px 60px 190px 98px minmax(60px,.8fr);gap:8px;align-items:center;padding:0 12px}
#cp .c9 .hd{font-size:10px;letter-spacing:.22em;color:var(--dim);border-top:1px solid var(--ln);border-bottom:1px solid var(--ln);height:24px}
#cp .c9 .rows{display:grid;grid-template-rows:repeat(30,1fr);min-height:0}
#cp .c9 .rw{font-size:12.5px;border-bottom:1px solid #12181c;min-height:0}
#cp .c9 .rw.me{outline:1px solid var(--acc);outline-offset:-1px}
#cp .c9 .rw .gate{color:var(--dim)}
#cp .c9 .fl{display:flex;gap:2px}
#cp .c9 .fl s{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;width:15px;height:21px;background:#10161a;position:relative;font-size:13px;color:var(--tx)}
#cp .c9 .fl s::after{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:#000}
#cp .c9 .fl s.sp{background:transparent}
#cp .c9 .fl s.sp::after{display:none}
#cp .c9 .fl.g s{color:var(--acc)}
#cp .c9 .fl.p s,#cp .c9 .fl.w s{color:#9fb4bb}
#cp .c9 .fl.f s{color:#506068}
#cp .c9 .fl s.flip{animation:c9f .42s steps(1,end) both;animation-delay:var(--d)}
@keyframes c9f{0%{transform:scaleY(1)}30%{transform:scaleY(.08)}60%{transform:scaleY(1)}}
#cp .c9 .bar{height:7px;position:relative;border-left:1px solid var(--ln)}
#cp .c9 .bar i{position:absolute;top:0;bottom:0;background:#8aa3ad}
#cp .c9 .bar i.g{background:var(--acc)}
`)
  const KEYS = ['ev', 'la', 'dir', 'temp', 'wind']
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c9"><div class="left">
    <div class="box clear" id="c9w"><div class="cap"><span>ORACLE PARK</span><span>THE SWING</span></div></div>
    <div class="box p"><div class="cap"><span>INPUTS</span><span>DRAG A NUMBER</span></div><div class="inp">${KEYS.map((k) => `<div><label>${SPEC[k].label}</label><span class="num" data-k="${k}"></span><button data-k="${k}" data-d="-1">−</button><button data-k="${k}" data-d="1">+</button><span></span></div>`).join('')}</div>
      <div class="tools">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button id="c9h"></button><button class="go" data-swing>SWING AGAIN</button></div></div>
    <div class="box stat p"><em id="c9e">TRACKING</em><b id="c9b">. . .</b><u id="c9u"></u></div></div>
    <div class="box board p"><div class="bh"><b>DEPARTURES</b><span id="c9n"></span><i>DEPARTED = OVER THE WALL &nbsp; DELAYED = OFF THE WALL &nbsp; GROUNDED = IN PLAY &nbsp; CANCELLED = FOUL</i></div>
      <div class="hd"><span>GATE</span><span>PARK</span><span>TEAM</span><span>FENCE</span><span>WALL</span><span>STATUS</span><span>BY FT</span><span></span></div><div class="rows" id="c9r"></div></div></div>`
  const E = (id) => root.querySelector(id)
  windowSync(api, E('#c9w'), { zoom: 0.7 })
  for (const n of root.querySelectorAll('.num')) scrubNum(n, api, n.dataset.k, { px: n.dataset.k === 'ev' ? 3 : 4 })
  for (const b of root.querySelectorAll('.inp button')) b.addEventListener('click', () => setP(api, b.dataset.k, api.state[b.dataset.k] + Number(b.dataset.d)))
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  E('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  E('#c9h').addEventListener('click', () => { api.state.hand *= -1; api.update() })
  const parks = await loadParks()
  const prev = new Map()
  const flap = (text, w, key, cls, i0 = 0) => {
    const chars = text.padEnd(w, ' ').slice(0, w).split('')
    return `<span class="fl ${cls}">${chars.map((c, i) => { const was = prev.get(`${key}${i}`); prev.set(`${key}${i}`, c); return `<s class="${c === ' ' ? 'sp' : ''}${was !== undefined && was !== c ? ' flip' : ''}" style="--d:${(i0 + i) * 28}ms">${c === ' ' ? '' : c}</s>` }).join('')}</span>`
  }
  let beat = null
  function render(res) {
    const s = api.state
    for (const n of root.querySelectorAll('.num')) n.textContent = `${SPEC[n.dataset.k].fmt(s[n.dataset.k])}${SPEC[n.dataset.k].unit && n.dataset.k !== 'dir' && n.dataset.k !== 'wind' ? ' ' + SPEC[n.dataset.k].unit : ''}`
    E('#c9h').textContent = s.hand > 0 ? 'RIGHT-HANDED' : 'LEFT-HANDED'
    if (parks.parks.length) {
      const rows = evalParks(parks, api)
      E('#c9n').textContent = `${rows.filter((r) => r.k === 'GONE').length} OF ${rows.length} DEPARTED`
      E('#c9r').innerHTML = rows.map((r, i) => {
        const [fd, fh] = wallFnOf(parks, r.p)(r.res.landB), cls = r.k === 'GONE' ? 'g' : r.k === 'WALL' ? 'w' : r.k === 'PLAY' ? 'p' : 'f'
        const status = { GONE: 'DEPARTED', WALL: 'DELAYED', PLAY: 'GROUNDED', FOUL: 'CANCELLED' }[r.k]
        const by = r.k === 'GONE' ? `+${Math.round(r.margin)}` : r.k === 'WALL' ? `${Math.round(r.margin)}` : ''
        const f = Math.max(0, Math.min(1, (r.margin + 30) / 70))
        const bar = r.k === 'GONE' || r.k === 'WALL' ? `<div class="bar"><i class="${r.k === 'GONE' ? 'g' : ''}" style="left:0;width:${f * 100}%"></i></div>` : '<div class="bar"></div>'
        return `<div class="rw${r.p.abbr === 'SF' ? ' me' : ''}"><span class="gate">${String(i + 1).padStart(2, '0')}</span><span>${r.p.name.toUpperCase()}</span><span style="color:var(--dim)">${r.p.abbr}</span><span>${Math.round(fd)}</span><span>${fh.toFixed(0)}</span>${flap(status, 9, `s${r.p.abbr}`, cls, 0)}${flap(by, 4, `b${r.p.abbr}`, cls, 4)}${bar}</div>`
      }).join('')
    }
    paint()
  }
  function paint() {
    E('#c9e').textContent = beat ? beat.state : 'TRACKING'
    E('#c9b').textContent = beat ? beat.text : '. . .'
    E('#c9u').textContent = beat?.sub ?? ''
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
