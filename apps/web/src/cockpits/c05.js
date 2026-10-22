// Cockpit 5, INSTRUCTION CARD: the interface is a sentence. A numbered card in the manner of the Pan Am zero gravity instructions: every input is a blank in a
// sentence that you drag to change (bone, underlined), every result is a blank the flight fills in (amber). The last box is the verdict. Beside it, the park and the 30 parks.
import { tiles, TILE_CSS } from './draw.js'

export async function build(root, api, U) {
  const { SPEC, css, setP, windowSync, loadParks, evalParks, scrubNum } = U
  css('cp5', `
#cp .c5{position:absolute;inset:12px;display:grid;grid-template-columns:minmax(500px,41%) 1fr;gap:14px;font-family:SG,"Space Grotesk",Arial,sans-serif}
#cp .c5 .card{border:1px solid var(--tx);background:#0d1114;padding:22px 30px 18px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
#cp .c5 .card h1{margin:0;font:600 34px/1 BC,"Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase}
#cp .c5 .card .sub{color:var(--dim);font-size:11px;letter-spacing:.3em;margin:6px 0 14px;text-transform:uppercase;border-bottom:2px solid var(--tx);padding-bottom:10px;font-family:STM,monospace}
#cp .c5 ol{list-style:none;margin:0;padding:0;display:grid;gap:11px;font-size:17px;line-height:1.35;letter-spacing:.03em;text-transform:uppercase;font-weight:500}
#cp .c5 li{display:grid;grid-template-columns:34px 1fr;gap:14px;align-items:start}
#cp .c5 li i{font:600 20px/1 BC,"Barlow Condensed",sans-serif;font-style:normal;border:1px solid var(--tx);width:30px;height:30px;display:flex;align-items:center;justify-content:center}
#cp .c5 .f{border-bottom:2px solid var(--tx);padding:0 3px;cursor:ns-resize;white-space:nowrap;display:inline-block;outline:0;user-select:none}
#cp .c5 .f:focus{background:var(--tx);color:var(--k)}
#cp .c5 .o{color:var(--acc);border-bottom:2px dotted var(--acc);padding:0 3px;white-space:nowrap}
#cp .c5 .res{margin-top:auto;border:2px solid var(--tx);padding:12px 16px;display:grid;gap:4px}
#cp .c5 .res em{font:400 10px STM,monospace;font-style:normal;letter-spacing:.3em;color:var(--dim)}
#cp .c5 .res b{font:600 40px/1 BC,"Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase}
#cp .c5 .res u{text-decoration:none;font:400 13px STM,monospace;color:var(--dim)}
#cp .c5 .res.g{background:var(--acc);border-color:var(--acc);color:#0b0a08}
#cp .c5 .res.g em,#cp .c5 .res.g u{color:#2a1c06}
#cp .c5 .tools{display:flex;gap:4px;flex-wrap:wrap;margin-top:12px}
#cp .c5 .tools button{font:400 10.5px STM,monospace;padding:3px 8px;letter-spacing:.1em;text-transform:uppercase}
#cp .c5 .tools .go{background:var(--tx);color:var(--k)}
#cp .c5 .right{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:10px;min-height:0}
#cp .c5 .fig{position:relative;border:1px solid var(--ln)}
#cp .c5 .fig .cap{position:absolute;top:0;left:0;font:400 11px BC,"Barlow Condensed",sans-serif;letter-spacing:.28em;padding:3px 9px;background:var(--ln);color:var(--dim);z-index:2}
#cp .c5 .gt{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;padding:26px 8px 8px}
#cp .c5 .gt .t{height:34px}
${TILE_CSS('#cp .c5')}
`)
  const pre = Object.keys(api.PRESETS).slice(0, 7)
  root.innerHTML = `<div class="c5"><div class="card p">
    <h1>Instructions for one batted ball</h1><div class="sub">Read all steps before swinging. Drag a blank to change it.</div>
    <ol>
      <li><i>1</i><span>The ball leaves the bat at <span class="f" data-k="ev"></span>.</span></li>
      <li><i>2</i><span>It rises at <span class="f" data-k="la"></span>, <span class="f" data-k="dir"></span>.</span></li>
      <li><i>3</i><span>The air is <span class="f" data-k="temp"></span>. The wind is <span class="f" data-k="wind"></span>.</span></li>
      <li><i>4</i><span>The batter is <span class="f" id="c5hand" tabindex="0" style="cursor:pointer"></span>.</span></li>
      <li><i>5</i><span>The ball spins <span class="o" id="c5s1"></span> backward and <span class="o" id="c5s2"></span> sideways.</span></li>
      <li><i>6</i><span>It peaks at <span class="o" id="c5pk"></span>, <span class="o" id="c5hg"></span> after the bat.</span></li>
      <li><i>7</i><span id="c5wall"></span></li>
      <li><i>8</i><span id="c5pk2"></span></li>
    </ol>
    <div class="res" id="c5res"><em>THEN</em><b>. . .</b><u></u></div>
    <div class="tools">${pre.map((n) => `<button data-p="${n}">${n}</button>`).join('')}<button class="go" data-swing>SWING AGAIN</button></div>
  </div>
  <div class="right"><div class="fig" id="c5w"><span class="cap">FIG. 1 &nbsp; ORACLE PARK</span></div><div class="fig p"><span class="cap">FIG. 2 &nbsp; THE SAME BALL IN ALL 30 PARKS</span><div class="gt" id="c5g"></div></div></div></div>`
  windowSync(api, root.querySelector('#c5w'), { zoom: 0.82 })
  for (const f of root.querySelectorAll('.f[data-k]')) scrubNum(f, api, f.dataset.k, { px: f.dataset.k === 'ev' ? 3 : 4 })
  const hand = root.querySelector('#c5hand')
  hand.addEventListener('click', () => { api.state.hand *= -1; api.update() })
  hand.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.state.hand *= -1; api.update() } })
  for (const b of root.querySelectorAll('[data-p]')) b.addEventListener('click', () => { Object.assign(api.state, api.PRESETS[b.dataset.p]); api.update() })
  root.querySelector('[data-swing]').addEventListener('click', () => { const k = Object.keys(api.PRESETS); Object.assign(api.state, api.PRESETS[k[Math.floor(Math.random() * k.length)]]); api.update() })
  const parks = await loadParks()
  let beat = null
  const q = (id) => root.querySelector(id)
  const words = {
    ev: (v) => `${v} miles per hour`, la: (v) => `${v} degrees`,
    dir: (v) => (v < -2 ? `${-v} degrees left of center` : v > 2 ? `${v} degrees right of center` : 'straight to center field'),
    temp: (v) => `${v} degrees`, wind: (v) => (v === 0 ? 'calm' : `${Math.abs(v)} miles per hour ${v > 0 ? 'out' : 'in'}`),
  }
  function render(res) {
    const s = api.state, v = res.verdict
    for (const f of root.querySelectorAll('.f[data-k]')) f.textContent = words[f.dataset.k](s[f.dataset.k])
    hand.textContent = s.hand > 0 ? 'right-handed' : 'left-handed'
    q('#c5s1').textContent = `${Math.round(res.wb)} rpm`; q('#c5s2').textContent = `${Math.round(res.ws)} rpm`
    q('#c5pk').textContent = `${Math.round(res.peakFt)} feet`
    const P = res.path; let ai = 0; P.forEach((p, i) => { if (p.p[2] > P[ai].p[2]) ai = i })
    q('#c5hg').textContent = `${P[ai].t.toFixed(1)} seconds`
    q('#c5wall').innerHTML = v.wallFt ? `The wall is <span class="o">${Math.round(v.wallFt)} feet</span> away and <span class="o">${v.wallH.toFixed(0)} feet</span> tall. The ball arrives <span class="o">${v.cross.toFixed(0)} feet</span> up.` : `The ball comes down <span class="o">${Math.round(res.landFt)} feet</span> from the plate, short of the wall.`
    q('#c5pk2').innerHTML = `It is in the air for <span class="o">${res.hang.toFixed(1)} seconds</span> and lands <span class="o">${Math.round(res.landFt)} feet</span> out.`
    if (parks.parks.length) {
      const pr = evalParks(parks, api)
      q('#c5g').innerHTML = tiles(pr)
      q('#c5pk2').innerHTML += ` Of the 30 parks, <span class="o">${pr.filter((r) => r.k === 'GONE').length}</span> would have let it go.`
    }
    paint()
  }
  function paint() {
    const r = q('#c5res')
    r.className = 'res' + (beat && beat.last && ['gone', 'nuke', 'splash', 'scraper'].includes(beat.tone) ? ' g' : '')
    r.querySelector('em').textContent = beat ? `THEN: ${beat.state}` : 'THEN'
    r.querySelector('b').textContent = beat ? beat.text : '. . .'
    r.querySelector('u').textContent = beat?.sub ?? ''
  }
  return { render, beat: (b) => { beat = b; paint() } }
}
