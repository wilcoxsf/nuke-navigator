// Study 21, ASCII LAB: every character-art style from art.js, live, for any player. Subjects: FACE (the baked MLB headshot tone maps), STANCE (my vector batter at a pose and attack angle),
// SWING (that batter plus the pitch and the ball's path), GPT (the dotted swing sequences GPT drew, sliced into frames by science/slice_gpt_sheets.py, converted dot for dot).
// Sizes S M L. Click a tile to pick that style for that subject; picks are remembered (localStorage nn-art-face, -stance, -swing, -gpt) and Study 20 uses them.
// Everything is text in DejaVu Sans Mono, so it is the same on your screen as in the app.
import { SKEL_CSS } from './skel.js'
import { THEME_CSS, JUICE_CSS, themePicker, finishUI } from './skel2.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBatter, loadPng, artMetrics } from './art.js'

const SIZES = { S: { face: 28, scene: 36, gpt: 16 }, M: { face: 44, scene: 56, gpt: 24 }, L: { face: 64, scene: 80, gpt: 34 } }
const PLAYERS = ['BUSTER POSEY', 'MADISON BUMGARNER', 'PABLO SANDOVAL', 'BRANDON BELT', 'TRAVIS ISHIKAWA', 'RAFAEL DEVERS', 'BRANDON CRAWFORD', 'HUNTER PENCE', 'LOGAN WEBB', 'MATT CHAPMAN']
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch {} return null }

export async function build(root, api, U) {
  const { css } = U
  css('cp21', SKEL_CSS + THEME_CSS + JUICE_CSS + ART_CSS + `
#cp.skel.solid{background:var(--k);pointer-events:auto}
#cp .c21{position:absolute;inset:10px;display:grid;gap:12px;grid-template-columns:230px 1fr;grid-template-rows:20px minmax(0,1fr)}
#cp .c21 .hdr{grid-column:1/3;display:flex;justify-content:space-between;align-items:center}
#cp .c21 .side{padding:18px 12px 12px;display:flex;flex-direction:column;gap:6px;overflow:auto}
#cp .c21 .side h4{font:8px PS2P,monospace;color:var(--dim);margin:8px 0 2px;font-weight:400}
#cp .c21 .side .bt{padding:3px 8px;font-size:17px;text-align:left;box-shadow:0 3px 0 var(--e)}
#cp .c21 .side .row{display:flex;gap:6px;flex-wrap:wrap}
#cp .c21 .side .row .bt{text-align:center;padding:3px 7px}
#cp .c21 .side .bt.on{background:var(--tx);color:var(--k);transform:translateY(2px);box-shadow:0 1px 0 var(--e)}
#cp .c21 .side .picks{margin-top:auto;color:var(--dim);font-size:15px;line-height:1.15}
#cp .c21 .side .picks b{font-weight:400;color:var(--acc)}
#cp .c21 .main{overflow:auto;padding:16px 12px 14px;display:grid;grid-template-columns:repeat(var(--mc,4),minmax(0,1fr));gap:14px;align-content:start}
#cp .c21 .tile{border:1px solid var(--ln);padding:8px 8px 6px;display:grid;gap:4px;cursor:pointer;background:var(--k);position:relative;min-width:0;align-content:start;box-shadow:0 4px 0 var(--ln);transition:transform .08s steps(2,end),box-shadow .08s steps(2,end)}
#cp .c21 .tile:hover{transform:translateY(-2px);box-shadow:0 6px 0 var(--dim)}
#cp .c21 .tile.pick{border-color:var(--acc);box-shadow:0 4px 0 var(--acc)}
#cp .c21 .tile .nm{display:flex;justify-content:space-between;font-size:17px;gap:6px}
#cp .c21 .tile .nm b{font-weight:400}
#cp .c21 .tile .nm i{font-style:normal;color:var(--acc)}
#cp .c21 .tile .note{color:var(--dim);font-size:14px;line-height:1}
#cp .c21 .tile .art{color:var(--tx);overflow:hidden}
#cp .c21 .tile.pick .art{color:var(--acc)}
#cp .c21 .tile .seq{display:flex;gap:6px;align-items:flex-end}
`)
  root.classList.add('skel', 'solid')
  api.NN.setPaused(true)
  const j = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : {} } catch { return {} } }
  const [faces, gptArt] = await Promise.all([j('/faces_tone.json'), j('/gpt_art.json')])
  const ids = Object.keys(faces), q = new URLSearchParams(location.search)
  let who = ids.includes('457763') ? '457763' : ids[0], subject = q.get('sub') || 'face', size = q.get('size') || 'M', pose = 'contact', aa = 14, hand = 'R', gp = Number(q.get('gp') || 0), sheet = q.get('sheet') || '3'
  const POSE_T = { stance: 0, load: 1 / 3, contact: 2 / 3, follow: 1 }
  root.innerHTML = `<div class="c21"><div class="hdr"><span class="ps">DINGER DOJO // STUDY 21 // ASCII LAB</span><span id="c21a"></span></div>
    <div class="pnl p side" id="c21s"><span class="t">/ C H O O S E /</span></div><div class="pnl p main" id="c21m"><span class="t">/ S T Y L E S /</span></div></div>`
  const E = (s) => root.querySelector(s)
  themePicker(root, E('#c21a'), api, 21, 'orange')
  const btn = (attrs, label, on) => `<span class="bt${on ? ' on' : ''}" ${attrs}>${label}</span>`
  function side() {
    E('#c21s').innerHTML = `<span class="t">/ C H O O S E /</span>
      <h4>SUBJECT</h4><div class="row">${['face', 'stance', 'swing', 'gpt'].map((k) => btn(`data-sub="${k}"`, k.toUpperCase(), subject === k)).join('')}</div>
      <h4>SIZE</h4><div class="row">${Object.keys(SIZES).map((k) => btn(`data-size="${k}"`, k, size === k)).join('')}</div>
      ${subject === 'face' ? `<h4>PLAYER</h4>${ids.map((id) => btn(`data-who="${id}"`, (faces[id].name || id).toUpperCase(), who === id)).join('')}`
        : subject === 'gpt' ? `<h4>GPT SHEET</h4><div class="row">${['3', '1'].map((k) => btn(`data-sheet="${k}"`, 'SHEET ' + k + (k === '3' ? ' (10)' : ' (5)'), sheet === k)).join('')}</div><h4>PLAYER (ROW)</h4>${PLAYERS.slice(0, sheet === '3' ? 10 : 5).map((nm, i) => btn(`data-gp="${i}"`, nm, gp === i)).join('')}`
        : `<h4>POSE</h4><div class="row">${Object.keys(POSE_T).map((k) => btn(`data-pose="${k}"`, k, pose === k)).join('')}</div>
      <h4>BATS</h4><div class="row">${['R', 'L'].map((k) => btn(`data-hand="${k}"`, k, hand === k)).join('')}</div>
      <h4>ATTACK ANGLE ${aa}°</h4><div class="row">${btn('data-aa="-4"', '-')}${btn('data-aa="4"', '+')}</div>`}
      <div class="picks">PICKED<br>face: <b>${store('nn-art-face') || 'none yet'}</b><br>stance: <b>${store('nn-art-stance') || 'none yet'}</b><br>swing: <b>${store('nn-art-swing') || 'none yet'}</b><br>gpt: <b>${store('nn-art-gpt') || 'none yet'}</b><br><br>Click a tile to pick it for the current subject.</div>`
    const on = (sel, key, fn) => E('#c21s').querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => { fn(b.dataset[key]); paint() }))
    on('[data-sub]', 'sub', (v) => { subject = v }); on('[data-size]', 'size', (v) => { size = v }); on('[data-who]', 'who', (v) => { who = v }); on('[data-pose]', 'pose', (v) => { pose = v })
    on('[data-hand]', 'hand', (v) => { hand = v }); on('[data-aa]', 'aa', (v) => { aa = Math.max(-10, Math.min(40, aa + Number(v))) })
    on('[data-sheet]', 'sheet', (v) => { sheet = v; gp = Math.min(gp, v === '3' ? 9 : 4) }); on('[data-gp]', 'gp', (v) => { gp = Number(v) })
    for (const el of E('#c21s').querySelectorAll('.bt')) { el.tabIndex = 0; el.setAttribute('role', 'button') }
  }
  // the four frames (stance, load, contact, follow-through) GPT drew for one player
  const gptFrames = (sh, p) => {
    const frames = gptArt[sh]?.frames ?? []
    if (sh === '3') return frames.filter((f) => f.region === (p < 5 ? 'TL' : 'TR') && f.row === p % 5).sort((a, b) => a.col - b.col)
    return frames.filter((f) => f.row === p).sort((a, b) => a.col - b.col)
  }
  let token = 0
  async function paint() {
    const my = ++token
    side()
    const main = E('#c21m')
    main.style.setProperty('--mc', subject === 'gpt' ? 2 : 4)
    main.innerHTML = '<span class="t">/ S T Y L E S /</span>'
    const pick = store('nn-art-' + subject)
    let styles = STYLES.filter((s) => !s.dots), srcs // the dot-snap styles are for dotted drawings only
    if (subject === 'gpt') {
      const fr = gptFrames(sheet, gp)
      if (!fr.length) { main.insertAdjacentHTML('beforeend', '<div>NO GPT FRAMES (gpt_art.json missing)</div>'); return }
      srcs = await Promise.all(fr.map((f) => loadPng(f.png)))
      if (my !== token) return
      styles = [...STYLES.filter((s) => s.dots), ...STYLES.filter((s) => !s.dots)]
    } else {
      const src = subject === 'face' ? (faces[who] ? faceSource(faces[who]) : null) : drawBatter({ t: POSE_T[pose], aa, hand, w: subject === 'swing' ? 420 : 300, mirrorW: subject === 'swing' ? 420 : 300, rays: subject === 'swing' ? { la: aa + 14, vaa: -6, len: 120 } : null })
      if (!src) { main.insertAdjacentHTML('beforeend', '<div>NO SOURCE (faces_tone.json missing)</div>'); return }
      srcs = [src]
    }
    const cols = SIZES[size][subject === 'face' ? 'face' : subject === 'gpt' ? 'gpt' : 'scene']
    for (const st of styles) {
      const t = document.createElement('div')
      t.className = 'tile' + (pick === st.id ? ' pick' : '')
      t.innerHTML = `<div class="nm"><b>${st.name}</b><i>${pick === st.id ? 'PICKED' : ''}</i></div><div class="note">${st.note}</div><div class="seq"></div>`
      main.appendChild(t)
      const seq = t.querySelector('.seq'), w = Math.max(120, t.clientWidth - 18) / srcs.length
      for (const src of srcs) {
        const r = renderArt(src, st, cols, subject === 'face' ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : {})
        const pre = document.createElement('pre')
        const am = artMetrics(st)
        pre.className = am.cls
        pre.textContent = r.lines.join('\n')
        pre.style.fontSize = Math.min(14, (w - 6) / (r.cols * am.w)) + 'px'
        seq.appendChild(pre)
      }
      t.addEventListener('click', () => { store('nn-art-' + subject, st.id); paint() })
    }
  }
  finishUI(root, { minW: 1000, minH: 600 })
  paint()
  addEventListener('resize', () => paint())
  return { render() {}, beat() {} }
}
