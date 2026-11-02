// Study 25 SELECT screen: a video-game mode menu over the park (up and down to choose, Enter to start, Esc to come back to it, number keys jump straight to a line,
// S switches the sound). While it sits idle the park behind it replays the longest home runs (attract mode, run by the study through onIdle).
import { sound } from './sfx25.js'
import { jukebox } from './music25.js'

export const MENU_CSS = `
#cp .c25 .sm{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:color-mix(in srgb,var(--k) 90%,transparent);pointer-events:auto}
#cp .c25 .sm.open{display:flex}
#cp .c25 .sm .smb{display:grid;gap:16px;justify-items:center;max-width:min(920px,94vw);max-height:94vh;overflow:auto;padding:10px 12px}
#cp .c25 .sm .smt{font-family:PS2P,monospace;font-size:clamp(22px,4.2vw,46px);color:var(--acc);letter-spacing:.04em;text-align:center;line-height:1.15;text-shadow:4px 4px 0 var(--ln)}
#cp .c25 .sm .sms{font-family:PS2P,monospace;font-size:10px;color:var(--dim);letter-spacing:.2em}
#cp .c25 .sm .sml{display:grid;gap:3px;width:min(780px,90vw)}
#cp .c25 .sm .smi{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:16px;align-items:baseline;padding:7px 12px;cursor:pointer;border:1px solid transparent}
#cp .c25 .sm .smi b{font-family:PS2P,monospace;font-weight:400;font-size:clamp(11px,1.5vw,15px);color:var(--tx);white-space:nowrap}
#cp .c25 .sm .smi span{font-size:calc(17px * var(--ts));color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .sm .smi.on{border-color:var(--acc)}
#cp .c25 .sm .smi.hero{grid-template-columns:minmax(0,1fr);gap:6px;padding:10px 12px}#cp .c25 .sm .smi.hero b{font-size:clamp(15px,2.3vw,24px)}#cp .c25 .sm .smi.hero span{color:var(--tx);white-space:normal}
#cp .c25 .sm .smi.on b{color:var(--acc)}
#cp .c25 .sm .smi.dis b,#cp .c25 .sm .smi.dis span{opacity:.45}
#cp .c25 .sm .smf{font-family:PS2P,monospace;font-size:9px;color:var(--dim);letter-spacing:.12em;text-align:center;line-height:1.8}
#cp .c25 .sm .artbox{width:780px;max-width:90vw;aspect-ratio:780/144;display:flex;align-items:center;justify-content:center}
#cp .c25 .sm .ins2{display:block;width:100%;height:auto;image-rendering:pixelated;cursor:pointer}
#cp .c25 .sm .art{font-family:PS2P,monospace;font-size:9px;color:var(--dim);letter-spacing:.12em;text-align:center;margin-top:-8px;cursor:pointer}
#cp .c25 .sm .art b{font-weight:400;color:var(--tx)}
@media (max-width:600px){#cp .c25 .sm .art{display:none}#cp .c25 .sm .artbox{aspect-ratio:auto}}
#cp .c25 .sm .lg2{display:grid;justify-items:center}
#cp .c25 .sm .lg2 svg{display:block;width:min(560px,80vw);height:auto;margin-bottom:-6px}
#cp .c25 .sm .lg3{padding:14px;background:radial-gradient(circle,var(--acc) 38%,transparent 42%) 0 0/14px 14px;animation:smchase .5s steps(2) infinite}
#cp .c25 .sm .lg3>div{background:var(--k);padding:16px 26px}
@keyframes smchase{to{background-position:14px 0}}
@media (prefers-reduced-motion:reduce){#cp .c25 .sm .lg3{animation:none}}
@media (max-width:600px){#cp .c25 .sm .smi{grid-template-columns:minmax(0,1fr);gap:4px}#cp .c25 .sm .smi span{white-space:normal;font-size:calc(15px * var(--ts))}}
`

// items: [{ k, name, blurb, run(), off?() }]; the menu owns the keyboard while it is open
export function selectMenu(host, items, o = {}) {
  const el = document.createElement('div')
  el.className = 'sm'
  el.innerHTML = `<div class="smb"><div class="lgo"></div><div class="sms">SELECT MODE</div><div class="sml"></div><div class="artbox"><canvas class="ins2" width="780" height="144" role="img" aria-label="a little pixel scene"></canvas></div><div class="art" role="button"></div>
    <div class="smf">UP / DOWN OR 1 TO 4 TO CHOOSE &nbsp; ENTER TO START &nbsp; ESC COMES BACK HERE</div></div>`
  host.appendChild(el)
  let i = 0, open = false, idle = null, logo = o.logo ?? 1
  // the title, three ways (the M option): stacked letters, a pixel home-run arc over the name, or a marquee of chasing bulbs
  const LOGO = {
    1: '<div class="smt">NUKE<br>NAVIGATOR</div>',
    2: '<div class="lg2"><svg viewBox="0 0 560 120">' + Array.from({ length: 26 }, (_, k) => { const t = k / 25, x = 30 + t * 500, y = 108 - 96 * 4 * t * (1 - t); return '<rect x="' + (x - 4).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" width="8" height="8" fill="var(--' + (k === 25 ? 'acc' : k % 2 ? 'tx' : 'dim') + ')"/>' }).join('') + '</svg><div class="smt">NUKE NAVIGATOR</div></div>',
    3: '<div class="lg3"><div class="smt">NUKE<br>NAVIGATOR</div></div>',
  }
  const paintLogo = () => { el.querySelector('.lgo').innerHTML = LOGO[logo] ?? LOGO[1] }
  paintLogo()
  // the bottom of the menu (28 Oct, Andrew, in place of 1 PLAYER FREE PLAY): little pixel scenes, 3 px a pixel.
  // 31 Oct (Andrew: "For the current pixel art let's make it the full length of the menu text and let's have it cycle between them - run each twice and then move to
  // another random one"; and "a top down view of a baseball diamond with a pitch and then different players making plays, and maybe even runners? Just a simulated
  // baseball inning that goes on forever"): the art is as wide as the menu (260 across, 20 high); each scene loops twice (3.6 s a loop) and then a random other one
  // comes; THE INNING (48 high) plays a half inning each time it comes up and keeps its game going between visits (score, outs, runners, the innings count on); the
  // box keeps the inning's height so the menu never jumps. Drawn at 12 frames a second; one still frame under reduced motion.
  const cv = el.querySelector('.ins2'), cx2 = cv.getContext('2d'), U = 3, GW = 260, LOOP = 3.6, DWELL = LOOP * 2
  const P = {
    set: ['...##...', '...##...', '..####..', '.#.##.#.', '...##...', '...##...', '..#..#..', '..#..#..'],
    wind: ['...##..#', '...##.#.', '..####..', '...##...', '..###...', '..#.#...', '...#....', '...#....'],
    throw: ['..##....', '#.##....', '.####...', '..###...', '..##....', '.#..#...', '#....#..', '........'],
    snag: ['a.##....', '#.##....', '.####...', '..##....', '...##...', '...##...', '..#..#..', '..#..#..'],
  }
  const B = {
    stance: ['#.......', '.#.##...', '..###...', '...##...', '..###...', '..##....', '.#..#...', '#....#..'],
    swing: ['...##...', '...##...', '..######', '..###...', '..##....', '..##....', '.#..#...', '#....#..'],
  }
  const R = (u, v, w, h, c) => { cx2.fillStyle = c; cx2.fillRect(Math.round(u * U), Math.round(v * U), Math.max(1, Math.round(w * U)), Math.max(1, Math.round(h * U))) }
  const word = (s, u, v, c) => { cx2.fillStyle = c; cx2.font = '8px PS2P'; cx2.fillText(s, u * U, v * U) }
  const BX = Math.round(GW * 0.22), PX = Math.round(GW * 0.7) // where the batter and the pitcher stand in the side-on scenes
  const SCENES = {
    inning: { name: 'THE INNING', label: 'a baseball game from above that never ends: pitches, outs, hits, runners, the score', tall: true, draw: () => inning.draw() },
    snag: { name: 'THE SNAG', label: 'a pitcher throws, the batter lines it right back, the pitcher snags it', draw: (t, K) => K.snag(t) },
    moonshot: { name: 'MOONSHOT', label: 'a batter hits one so high it leaves the screen', draw(t, K) {
      K.blit(t > 0.9 && t < 1.4 ? B.swing : B.stance, BX, 10, true); K.blit(t < 0.5 ? P.set : t < 0.9 ? P.throw : P.set, PX, 10, false)
      if (t < 0.9) K.ball(PX - 2 - (t / 0.9) * (PX - BX - 10), 12)
      else if (t < 2.6) { const k = (t - 0.9) / 1.7; K.ball(BX + 10 + k * 120, 12 - k * 60 + k * k * 30) }
      if (t > 1.6) word('GONE!', BX + 50, 8, K.acc)
    } },
    splash: { name: 'SPLASH HIT', label: 'a home run lands in McCovey Cove and a kayak goes after it', draw(t, K) {
      const bx = Math.round(GW * 0.1), L = Math.round(GW * 0.72)
      K.blit(t > 0.3 && t < 0.8 ? B.swing : B.stance, bx, 10, true)
      R(Math.round(GW * 0.45) - 2, 12, 2, 6, '#8a8f99') // the arcade wall
      for (let u = Math.round(GW * 0.45); u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 5) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const k = Math.min(1, t / 1.4); if (t < 1.4) K.ball(bx + 10 + k * (L - bx - 10), 12 - Math.sin(k * Math.PI) * 11)
      if (t > 1.4 && t < 1.8) for (let i = 0; i < 5; i++) R(L + (i - 2) * (t - 1.4) * 10, 16 - (t - 1.4) * 14 * (1 - Math.abs(i - 2) * 0.3), 1, 1, K.tx)
      if (t > 1.6) { const x = GW - Math.min(1, (t - 1.6) / 1.2) * (GW - L - 4); R(x, 16, 8, 1, '#a8713f'); R(x + 3, 13, 2, 3, K.acc); R(x + 1, 14, 6, 0.5, K.tx) }
      if (t > 2.8) word('SPLASH', L - 40, 8, '#5fd3ff')
    } },
    kayaks: { name: 'KAYAK RACE', label: 'a splash hit, three kayaks race for it, one flips', draw(t, K) {
      const L = Math.round(GW * 0.5)
      for (let u = 0; u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 5) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const k = Math.min(1, t / 0.9); if (t < 0.9) K.ball(L - 70 + k * 70, 2 + k * 14)
      if (t > 0.9 && t < 1.3) for (let i = 0; i < 5; i++) R(L + (i - 2) * (t - 0.9) * 12, 16 - (t - 0.9) * 16 * (1 - Math.abs(i - 2) * 0.3), 1, 1, K.tx)
      const yak = (x, c, flip) => { if (flip) { R(x, 17, 8, 1, '#a8713f'); R(x + 3, 18, 2, 1, c) } else { R(x, 16, 8, 1, '#a8713f'); R(x + 3, 13, 2, 3, c); R(x + 1, 14 + (Math.floor(t * 6) % 2), 6, 0.5, K.tx) } }
      const g = Math.max(0, t - 0.9)
      yak(Math.min(L - 6, 6 + g * 70), K.acc, false) // the winner, from the left
      yak(Math.max(L + 6, GW - 10 - g * 60), '#5fd3ff', t > 2.1) // the one who flips, from the right
      yak(GW + 6 - g * 40, '#f2bc40', false)
      if (t > 1.3 && t < 2.6) K.ball(L, 15.5)
      if (t >= 2.6) { K.ball(L - 4, 11); word('GOT IT', L - 22, 8, K.acc) }
      if (t > 2.1 && t < 3.0) word('GLUG', L + 14, 9, '#5fd3ff')
    } },
    gulls: { name: 'GULL HEIST', label: 'a gull swoops down and steals a fan\'s garlic fries', draw(t, K) {
      const c = Math.round(GW / 2) - 8
      for (let u = 6; u < GW - 4; u += 9) if (Math.abs(u - c) > 10) { R(u, 14, 3, 4, (u / 9) % 2 ? '#3a3f47' : '#4a4f58'); R(u + 0.5, 12.5, 2, 1.5, '#8a8f99') } // the rest of the row, sitting
      R(c, 12, 4, 6, K.acc); R(c + 1, 10, 2, 2, K.tx); if (t < 1.4) R(c + 4, 13, 4, 2, '#f2bc40') // the fan and his fries
      const k = Math.min(1, t / 1.4), gx = t < 1.4 ? GW - 8 - k * (GW - 14 - c) : c + 6 - (t - 1.4) * 70, gy = t < 1.4 ? 2 + k * 9 : 11 - (t - 1.4) * 9, f = Math.floor(t * 8) % 2
      R(gx, gy, 3, 1, K.tx); R(gx - 2, gy - f, 2, 1, '#8a8f99'); R(gx + 3, gy - f, 2, 1, '#8a8f99'); R(gx + 3, gy + 0.5, 1, 1, '#f2bc40')
      if (t > 1.4) R(gx + 1, gy + 1, 3, 1, '#f2bc40')
      if (t > 1.6) { word('HEY!', c + 8, 7, K.acc); R(c + 1, 9, 1, 1, K.tx); R(c + 2, 8, 1, 1, K.tx) }
    } },
    cablecar: { name: 'CABLE CAR', label: 'a cable car rolls by, bell ringing, riders hanging off it', draw(t, K) {
      const x = -36 + t * ((GW + 40) / LOOP)
      R(x - 1, 8, 36, 1, K.tx); R(x, 9, 34, 7, '#e4002b'); for (let i = 2; i < 32; i += 4) R(x + i, 10, 2, 2, '#f2bc40'); R(x, 16, 34, 1, '#a8713f'); R(x + 4, 17, 3, 1, K.dim); R(x + 27, 17, 3, 1, K.dim)
      for (const r of [1, 31]) { R(x + r, 11, 1, 1, K.tx); R(x + r, 12, 1, 3, K.acc) }
      if (Math.floor(t * 4) % 2) word('DING', x + 10, 6, '#f2bc40')
    } },
    karl: { name: 'KARL THE FOG', label: 'Karl the fog rolls in over everything', draw(t, K) {
      K.blit(B.stance, BX, 10, true); K.blit(P.set, PX, 10, false)
      const front = (t / 2.6) * (GW + 12)
      for (let v = 0; v < 20; v++) for (let u = 0; u < GW; u += 2) if (u < front - ((v * 7) % 9)) R(u, v, 2, 1, (u + v + Math.floor(t * 4)) % 3 ? '#3a3f47' : '#8a8f99')
      if (t > 2.4) word("KARL'S IN", Math.round(GW / 2) - 18, 12, K.tx)
    } },
    wave: { name: 'THE WAVE', label: 'the crowd does the wave', draw(t, K) {
      const wx = -6 + (t / 3.2) * (GW + 12)
      for (let u = 2; u < GW - 2; u += 3) { const up = Math.max(0, 1 - Math.abs(u - wx) / 7), h = Math.round(up * 5); R(u, 15 - h, 2, 2, K.tx); R(u, 17 - h, 2, 2, (u / 3) % 2 ? K.acc : '#f2bc40'); if (h > 3) { R(u - 1, 13 - h, 1, 1, K.tx); R(u + 2, 13 - h, 1, 1, K.tx) } }
    } },
    sealion: { name: 'SEA LION', label: 'a sea lion pops up and balances a ball on its nose', draw(t, K) {
      for (let u = 0; u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 4) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const rise = Math.min(1, t / 0.8) - Math.max(0, (t - 3.0) / 0.6), c = Math.round(GW / 2) - 4
      if (rise > 0) { const y = 18 - rise * 9; R(c, y, 6, 9, '#8a8f99'); R(c + 3, y - 2, 6, 3, '#8a8f99'); R(c + 7, y - 1, 1, 1, K.tx); K.ball(c + 6.5 + Math.sin(t * 6) * 0.6, y - 4.5) }
      if (t > 1.4 && t < 3.0) word('ARF', c + 16, 8, K.tx)
    } },
    steamroller: { name: 'STEAMROLLER', label: 'a steamroller flattens a Dodger', draw(t, K) {
      const dx = Math.round(GW / 2), x = -30 + t * ((dx + 30) / 2.4), flat = x + 26 > dx
      if (!flat) { R(dx, 9, 4, 2, '#5fd3ff'); R(dx, 11, 4, 3, K.tx); R(dx - 1, 14, 6, 3, '#5fd3ff'); R(dx, 17, 4, 1, K.dim) } else { R(dx - 3, 17, 10, 1, '#5fd3ff'); R(dx - 4, 17, 1, 1, '#e4002b'); R(dx + 7, 17, 1, 1, '#e4002b') }
      R(x, 9, 18, 7, '#f2bc40'); R(x + 3, 5, 8, 4, '#f2bc40'); R(x + 4, 6, 4, 2, K.acc); for (let v = 0; v < 8; v++) R(x + 20, 9 + v, 7 - Math.abs(v - 3.5), 1, K.dim)
      if (flat && t > 2.6) word('FLAT', dx - 14, 7, K.acc)
    } },
  }
  // ---- THE INNING: a game from above that never ends. Home plate at the bottom middle, the field fanned out above it; a play at a time, drawn at random from a
  // weighted list; runners stay on base between plays; three outs turn the sides over; after nine innings a FINAL and a new game ----
  const inning = (() => {
    const GH = 48, SX = 1.9, X = (x) => 130 + (x - 130) * SX, H = [130, 44], D = 16 / Math.SQRT2, BASES = [H, [X(130 + D), 44 - D], [130, 44 - 2 * D], [X(130 - D), 44 - D], H], MOUND = [130, 33.5] // (the field stretched SX across, to fill the strip)
    const POS = [MOUND, [130, 46.5], [X(139), 30], [X(135), 24], [X(124), 24], [X(121), 30], [X(111), 13], [130, 7], [X(149), 13]] // P C 1B 2B SS 3B LF CF RF
    const COL = { SF: '#f0802a', LA: '#3d7bff' }
    const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], cl = (x) => Math.max(0, Math.min(1, x))
    const path = (s) => { s = Math.max(0, Math.min(4, s)); const k = Math.min(3, Math.floor(s)); return lerp(BASES[k], BASES[k + 1], s - k) }
    // the field, drawn once
    let field = null
    const paintField = (dim, tx) => {
      field = document.createElement('canvas'); field.width = GW * U; field.height = GH * U
      const f = field.getContext('2d'), F = (u, v, c) => { f.fillStyle = c; f.fillRect(u * U, v * U, U, U) }
      for (let v = 0; v < GH; v++) for (let u = 0; u < GW; u++) {
        const dx = (u + 0.5 - H[0]) / SX, dy = H[1] - (v + 0.5), r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) * 180) / Math.PI, fair = a >= 44 && a <= 136
        if (fair && r <= 39) F(u, v, r >= 13.5 && r <= 21 ? '#4a3220' : '#17331f')
        else if (fair && r <= 41) F(u, v, '#30281c') // the warning track
        else if (!fair && r <= 4.5 && dy > -2) F(u, v, '#4a3220') // around the plate
        else if (!fair && r > 9 && r < 47 && dy > 6 && ((u * 7 + v * 13) % 19 === 0)) F(u, v, '#24272c') // the stands
        if (u > 205 && v > 4 && v < 34 && (u + v * 5) % 13 === 0) F(u, v, '#163a48') // McCovey Cove, out past right
      }
      f.fillStyle = '#4a3220'; f.beginPath(); f.ellipse(MOUND[0] * U, MOUND[1] * U, 2.4 * SX * U, 2.4 * U, 0, 0, Math.PI * 2); f.fill()
      f.strokeStyle = tx; f.globalAlpha = 0.55; f.lineWidth = 1
      for (const s of [-1, 1]) { f.beginPath(); f.moveTo(H[0] * U, H[1] * U); f.lineTo((H[0] + s * 30 * SX) * U, (H[1] - 30) * U); f.stroke() }
      f.globalAlpha = 1; f.strokeStyle = dim; f.beginPath(); f.ellipse(H[0] * U, H[1] * U, 41 * SX * U, 41 * U, 0, (-136 * Math.PI) / 180, (-44 * Math.PI) / 180); f.stroke() // the wall
      for (const b of BASES.slice(1, 4)) { f.fillStyle = tx; f.fillRect(b[0] * U - 3, b[1] * U - 3, 6, 6) }
      f.fillStyle = tx; f.fillRect(H[0] * U - 3, H[1] * U - 2, 6, 5)
    }
    const G = { inn: 1, top: true, outs: 0, runs: { SF: 0, LA: 0 }, bases: [false, false, false], play: null, gap: 0.8, msg: '', note: 0, halves: 0, game: 1, t: 0 }
    const bat = () => (G.top ? 'LA' : 'SF'), fld = () => (G.top ? 'SF' : 'LA')
    const WEIGHT = [['K', 22], ['ground', 20], ['fly', 18], ['single', 16], ['walk', 8], ['double', 9], ['hr', 6]]
    const pick = () => { let r = Math.random() * WEIGHT.reduce((a, w) => a + w[1], 0); for (const [k, w] of WEIGHT) { r -= w; if (r < 0) return k } return 'K' }
    function newPlay() {
      const kind = pick(), on = [1, 2, 3].filter((b) => G.bases[b - 1])
      const p = { kind, t: 0, runners: [], ball: null, chase: null, outs: 0, msg: '' }
      const run = (from, to, start, per) => p.runners.push({ from, to, start, per })
      if (kind === 'K') { p.dur = 3.0; p.outs = 1; p.msg = 'STRIKE THREE'; p.pitches = 3; for (const b of on) run(b, b, 0, 1) }
      else if (kind === 'walk') { p.dur = 3.6; p.pitches = 4; p.msg = 'BALL FOUR'; let f = true; for (const s of [1, 2, 3]) { if (!G.bases[s - 1]) { f = false; continue } run(s, f ? s + 1 : s, 2.9, 0.7) } run(0, 1, 2.9, 0.7) }
      else if (kind === 'ground') { p.dur = 3.0; p.outs = 1; p.msg = 'GROUNDOUT, 6 TO 3'; p.ball = (t) => (t < 0.5 ? null : t < 1.3 ? [...lerp(H, POS[4], (t - 0.5) / 0.8), 0] : t < 1.8 ? [...lerp(POS[4], POS[2], (t - 1.3) / 0.5), 1.5] : null); p.chase = { i: 4, to: [X(125), 26], t0: 0.5, t1: 1.2 }; run(0, 0.92, 0.5, 1.5); p.outAt = 1.8; for (const b of on) run(b, b === 1 || (b === 2 && G.bases[0]) || (b === 3 && G.bases[0] && G.bases[1]) ? b + 1 : b, 0.5, 1.0) }
      else if (kind === 'fly') { const f = 6 + Math.floor(Math.random() * 3), spot = [POS[f][0] + (Math.random() - 0.5) * 14, POS[f][1] + 2 + Math.random() * 3]; p.dur = 3.4; p.outs = 1; p.msg = ['FLY OUT TO LEFT', 'FLY OUT TO CENTER', 'FLY OUT TO RIGHT'][f - 6]; p.ball = (t) => (t < 0.5 || t > 2.5 ? null : [...lerp(H, spot, (t - 0.5) / 2.0), Math.sin(((t - 0.5) / 2.0) * Math.PI) * 9]); p.chase = { i: f, to: spot, t0: 0.6, t1: 2.3 }; run(0, 0.7, 0.5, 1.2); p.outAt = 2.5; for (const b of on) run(b, b, 0, 1) }
      else if (kind === 'single' || kind === 'double') {
        const two = kind === 'double', side = Math.random() < 0.5 ? -1 : 1, spot = two ? [X(130 + side * 17), 6] : [X(130 + side * 10), 15], f = side < 0 ? 6 : 8
        p.dur = two ? 4.6 : 3.6; p.msg = two ? 'DOUBLE IN THE GAP' : 'BASE HIT'
        p.ball = (t) => (t < 0.5 ? null : t < 1.4 ? [...lerp(H, spot, (t - 0.5) / 0.9), two ? Math.sin(((t - 0.5) / 0.9) * Math.PI) * 5 : 0] : t < 2.0 ? [...spot, 0] : t < 2.6 ? [...lerp(spot, BASES[2], (t - 2.0) / 0.6), 1] : null)
        p.chase = { i: f, to: spot, t0: 0.6, t1: 2.0 }; const n = two ? 2 : 1; run(0, n, 0.5, two ? 1.4 : 1.2); for (const b of on) run(b, Math.min(4, b + n), 0.5, 1.0)
      } else { p.dur = 6.0; p.msg = on.length === 3 ? 'GRAND SLAM' : 'HOME RUN'; const ang = (60 + Math.random() * 60) * (Math.PI / 180); p.ball = (t) => (t < 0.5 || t > 2.2 ? null : [...lerp(H, [H[0] + Math.cos(ang) * 60 * SX, H[1] - Math.sin(ang) * 60], (t - 0.5) / 1.7), Math.sin(((t - 0.5) / 1.7) * Math.PI * 0.8) * 14]); run(0, 4, 0.9, 1.15); for (const b of on) run(b, 4, 0.9, 1.15) }
      return p
    }
    function endPlay(p) {
      G.outs += p.outs
      const scored = G.outs >= 3 ? 0 : p.runners.filter((r) => r.to >= 4).length
      G.runs[bat()] += scored
      G.bases = [1, 2, 3].map((b) => G.outs < 3 && p.runners.some((r) => r.to === b))
      G.msg = p.msg + (scored ? `, ${scored} IN` : ''); G.note = 3.0
      if (G.outs >= 3) {
        G.halves++; G.outs = 0; G.bases = [false, false, false]; G.gap = 2.0; G.msg = 'SIDE RETIRED'
        if (!G.top) { G.inn++; if (G.inn > 9) { G.msg = `FINAL: SF ${G.runs.SF}, LA ${G.runs.LA}`; G.inn = 1; G.runs = { SF: 0, LA: 0 }; G.game++; G.gap = 3.0 } }
        G.top = !G.top
      } else G.gap = 0.7
    }
    function tick(dt) {
      G.t += dt; G.note = Math.max(0, G.note - dt)
      if (!G.play) { G.gap -= dt; if (G.gap <= 0) G.play = newPlay(); return }
      G.play.t += dt
      if (G.play.t >= G.play.dur) { endPlay(G.play); G.play = null }
    }
    function draw() {
      const cs = getComputedStyle(host), tx = cs.getPropertyValue('--tx').trim(), acc = cs.getPropertyValue('--acc').trim(), dim = cs.getPropertyValue('--dim').trim()
      if (!field) paintField(dim, tx)
      cx2.clearRect(0, 0, cv.width, cv.height); cx2.drawImage(field, 0, 0)
      const p = G.play, t = p?.t ?? 0, fc = COL[fld()], bc = COL[bat()]
      const dot = (q, c, s = 2) => R(q[0] - s / 2, q[1] - s / 2, s, s, c)
      POS.forEach((q, i) => { let at = q; if (p?.chase?.i === i) at = lerp(q, p.chase.to, cl((t - p.chase.t0) / (p.chase.t1 - p.chase.t0))); dot(at, fc) }) // the fielders
      // the runners already on, and the batter; a play moves them along the base paths
      const moving = new Set(p ? p.runners.map((r) => r.from) : [])
      for (const b of [1, 2, 3]) if (G.bases[b - 1] && !moving.has(b)) dot(BASES[b], bc)
      const br = p?.runners.find((r) => r.from === 0)
      if (p) for (const r of p.runners) { if (r === br && t < r.start) continue; const s = r.from + cl((t - r.start) / (r.per * Math.max(0.01, r.to - r.from))) * (r.to - r.from); if (r === br && p.outAt && t >= p.outAt) continue; if (s >= 4 && t > r.start + r.per * (r.to - r.from) + 0.6) continue; dot(path(s), bc) }
      if (!br || t < br.start) { R(H[0] - 3.5, H[1] - 1, 2, 2, bc); if (p && t > 0.42 && t < 0.62 && p.kind !== 'walk') R(H[0] - 1.5, H[1] - 1, 3, 0.6, tx) } // the batter in the box, his swing
      // the pitch (or pitches), and the ball in play with its shadow
      if (p) {
        const pitches = p.pitches ?? 1, per = (p.dur - 0.6) / pitches
        for (let k = 0; k < pitches; k++) { const u = (t - k * per) / 0.45; if (u > 0 && u < 1) dot(lerp(MOUND, [H[0] + (p.kind === 'walk' ? 3 : 0), H[1] - 1], u), '#ffffff', 1) }
        const b = p.ball?.(t); if (b) { R(b[0] - 0.5, b[1] - 0.5, 1, 1, '#000000'); dot([b[0], b[1] - b[2] * 0.4], '#ffffff', b[2] > 4 ? 1.6 : 1) }
      }
      // the corner: the inning, the outs, the score; the last play on the right
      word(`${G.top ? 'TOP' : 'BOT'} ${G.inn}`, 4, 5, tx)
      word('OUTS', 4, 10, dim); for (let k = 0; k < 3; k++) R(20 + k * 3, 8, 2, 2, k < G.outs ? acc : '#2a2d33')
      word(`LA ${G.runs.LA}`, 4, 15, COL.LA); word(`SF ${G.runs.SF}`, 18, 15, COL.SF)
      if (G.note > 0 || !p) { cx2.font = '8px PS2P'; const w = cx2.measureText(G.msg).width / U; word(G.msg, GW - 4 - w, 5, acc) }
    }
    return { tick, draw, halves: () => G.halves, state: () => ({ inn: G.inn, top: G.top, outs: G.outs, runs: { ...G.runs }, bases: [...G.bases], play: G.play?.kind ?? null, game: G.game }) }
  })()
  let sceneKey = 'inning', lastKey = null, firstOpen = true
  const KEYS = Object.keys(SCENES), artEl = el.querySelector('.art')
  let allArt = false, artT0 = 0, halves0 = 0
  const paintArt = () => { artEl.innerHTML = `<b>${SCENES[sceneKey].name}</b> &nbsp; ${KEYS.indexOf(sceneKey) + 1} / ${KEYS.length} &nbsp; &larr; &rarr; MORE &nbsp; A: ${allArt ? 'STOP' : 'ALL IN TURN'}`; cv.setAttribute('aria-label', SCENES[sceneKey].label) }
  const setScene = (k) => { sceneKey = k; lastKey = k; artT0 = performance.now(); halves0 = inning.halves(); const h = SCENES[k].tall ? 48 * U : 20 * U; if (cv.height !== h) cv.height = h; lastTick = -1; paintArt() }
  const stepArt = (d) => setScene(KEYS[(KEYS.indexOf(sceneKey) + d + KEYS.length) % KEYS.length])
  const pickScene = () => { if (firstOpen) { firstOpen = false; setScene('inning'); return } const keys = KEYS.filter((k) => k !== lastKey); setScene(keys[Math.floor(Math.random() * keys.length)]) }
  cv.addEventListener('click', () => { stepArt(1); sound.play('move') })
  artEl.addEventListener('click', () => { allArt = !allArt; if (allArt) setScene(KEYS[0]); else paintArt(); sound.play('move') })
  const still = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  function scene(t) {
    if (SCENES[sceneKey].tall) { inning.draw(); return }
    const cs = getComputedStyle(host), tx = cs.getPropertyValue('--tx').trim(), acc = cs.getPropertyValue('--acc').trim(), dim = cs.getPropertyValue('--dim').trim()
    cx2.clearRect(0, 0, cv.width, cv.height)
    const blit = (spr, u, v, flip) => spr.forEach((r, j) => [...r].forEach((c, i) => { if (c === '.') return; cx2.fillStyle = c === 'a' ? acc : tx; cx2.fillRect((u + (flip ? spr[0].length - 1 - i : i)) * U, (v + j) * U, U, U) }))
    cx2.fillStyle = dim; cx2.fillRect(0, 18 * U, cv.width, 1)
    const ball = (u, v) => { cx2.fillStyle = acc; cx2.fillRect(Math.round(u * U), Math.round(v * U), 2 * U - 1, 2 * U - 1) }
    const snag = (t) => {
      // pitcher on the right facing left, batter on the left facing right
      const pu = PX, bu = BX, row = 10
      const pose = t < 0.35 ? 'set' : t < 0.75 ? 'wind' : t < 1.45 ? 'throw' : t < 1.62 ? 'set' : 'snag'
      blit(P[pose], pu, row, false)
      blit(t > 1.18 && t < 1.7 ? B.swing : B.stance, bu, row, true)
      if (t >= 0.75 && t < 1.25) { const k = (t - 0.75) / 0.5; ball(pu - k * (pu - bu - 8), 11 + k * 2 + 1.5 * Math.sin(k * Math.PI) * -0.6) } // the pitch, with a little drop
      else if (t >= 1.25 && t < 1.62) { const k = (t - 1.25) / 0.37; ball(bu + 8 + k * (pu - bu - 9), 12.5 - k * 2) } // the line drive back up the middle
      else if (t >= 1.62 && t < 2.6) { ball(pu - 0.5, 9.5); if (t < 2.2) { cx2.fillStyle = acc; cx2.font = '8px PS2P'; cx2.fillText('SNAG!', (pu - 22) * U, 7 * U) } } // in the glove
      else if (t < 0.75) ball(pu + 2, 11)
    }
    SCENES[sceneKey].draw(t, { blit, ball, tx, acc, dim, snag })
  }
  let raf = 0, lastTick = -1, lastNow = 0
  // twelve frames a second: the art is drawn only when a twelfth of a second has gone by; the inning's game runs on the real clock (a long pause counts as a short one)
  const loop = (now) => {
    if (!open) { raf = 0; return }
    const tk = Math.floor(now / (1000 / 12))
    if (tk !== lastTick) {
      const dt = lastNow ? Math.min(0.25, (now - lastNow) / 1000) : 0; lastNow = now; lastTick = tk
      const e = (now - artT0) / 1000
      if (SCENES[sceneKey].tall) { inning.tick(dt); if (inning.halves() > halves0 || e > 60) { if (allArt) stepArt(1); else pickScene() } }
      else if (e >= DWELL) { if (allArt) stepArt(1); else pickScene() }
      scene(((now - artT0) / 1000) % LOOP)
    }
    raf = requestAnimationFrame(loop)
  }
  const list = el.querySelector('.sml')
  const paint = () => {
    list.innerHTML = items.map((it, n) => `<div class="smi${n === i ? ' on' : ''}${it.off?.() ? ' dis' : ''}${it.hero ? ' hero' : ''}" data-n="${n}" role="button" aria-label="${it.name}"><b>${it.name}</b><span>${it.blurb}</span></div>`).join('')
    { const sn = el.querySelector('.snd'); if (sn) sn.textContent = sound.on() ? 'ON' : 'OFF' }
    list.querySelectorAll('.smi').forEach((x) => {
      x.addEventListener('mouseenter', () => { if (i !== Number(x.dataset.n)) { i = Number(x.dataset.n); sound.play('move'); paint() } })
      x.addEventListener('click', () => { i = Number(x.dataset.n); pick() })
    })
  }
  const kick = () => { clearTimeout(idle); if (o.onIdle) idle = setTimeout(function tick() { if (open) { o.onIdle(); idle = setTimeout(tick, o.idleEvery ?? 7000) } }, o.idleAfter ?? 20000) }
  const pick = () => { const it = items[i]; if (it.off?.()) { sound.play('back'); return } sound.play('pick'); close(); it.run() }
  function show(k) { if (k) { const n = items.findIndex((it) => it.k === k); if (n >= 0) i = n } if (!open) pickScene(); open = true; el.classList.add('open'); paint(); kick(); if (still) { if (SCENES[sceneKey].tall) inning.tick(3); scene(1.4) } else if (!raf) { lastNow = 0; raf = requestAnimationFrame(loop) }; o.onOpen?.() }
  function close() { open = false; el.classList.remove('open'); clearTimeout(idle); o.onClose?.() }
  addEventListener('keydown', (e) => {
    if (!open || e.ctrlKey || e.metaKey || e.altKey) return
    kick()
    if (e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % items.length; sound.play('move'); paint() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i = (i - 1 + items.length) % items.length; sound.play('move'); paint() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() }
    else if (e.key === 'Escape') { e.preventDefault(); sound.play('back'); close() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepArt(e.key === 'ArrowLeft' ? -1 : 1); sound.play('move') }
    else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); allArt = !allArt; if (allArt) setScene(KEYS[0]); else paintArt(); sound.play('move') }
    else if ((e.key === 'j' || e.key === 'J') && o.onJukebox) { e.preventDefault(); sound.play('pick'); close(); o.onJukebox() }
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); if (!sound.on()) jukebox.stop(); paint(); sound.play('move') }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) { i = Number(e.key) - 1; pick() }
    e.stopImmediatePropagation()
  }, true)
  el.addEventListener('pointermove', kick)
  // scene: which loop is up (and, for the tests, set one: k, drawn at t when given)
  return { show, close, isOpen: () => open, el, setLogo(n) { logo = n; paintLogo() }, scenes: Object.keys(SCENES), scene(k, t) { if (k && SCENES[k]) { setScene(k); if (t != null) scene(t) } return sceneKey }, allArt: () => allArt, inning: () => inning.state(), tickInning: (s) => inning.tick(s) }
}
