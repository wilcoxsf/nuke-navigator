// Study 25 park life (Oracle only): the scoreboard behind center field is a live LED board, and pixel seagulls circle the outfield the way they gather late at Oracle,
// scattering when a ball leaves the park. The board shows two lines of text (the batter, TRACKING, the distance, HOME RUN flashing), and on top of that plays a
// library of pixel animations (28 Oct, Andrew: "can we code a bunch of fun ones?"), each fired by what just happened:
//   CRAZY CRAB (a wall scraper or a ball just short)   SEA LION (a splash hit)   SPLASH ODOMETER (the splash count rolls over)   CABLE CAR (430 ft or more)
//   KARL (the fog eats the board)   GULL HEIST and GOLDEN GATE (idle)   GOLF SHOT, TOMAHAWK, CHASE SCENE, INSIDE JOB (the four OFF THE MENU home runs)
//   WALK-OFF   GRAND SLAM   GO-AHEAD and TIES IT (a scoreline flip)   MOONSHOT   TWEAK THE TATER   SO CLOSE (a dojo swing that just missed)
// The board is 72 x 36 LEDs of 0.61 m, sized to the screen of Oracle's own board in the park model; the animations use the middle 22 rows.
// One animation plays at a time, with at most two waiting.
// Over the board, the ORACLE PARK sign and its clock are bulbs too (29 Oct): the sign glows and reacts to home runs, the clock tells the time of the swing.
import { FONT } from './vox25.js'
export function initPark25(api, col, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const at = (bear, r, h) => { const b = (bear * Math.PI) / 180; return toWorld([r * Math.sin(b), r * Math.cos(b), h]) }
  const parts = []

  // ---- the LED board: a buffer of color codes per LED, drawn as round bulbs ----
  // the logic grid is 72 x 22 (every animation is drawn on it); the board itself has GHT rows, the logic rows centered with dark rows above and below
  const GW = 72, GH = 22, GHT = 36, ROW0 = 7, S = 10, LED = 0.614, LEDH = 0.611, SH = Math.round((S * LEDH) / LED)
  const buf = new Uint8Array(GW * GH)
  const grid = document.createElement('canvas'); grid.width = GW; grid.height = GH
  const gx = grid.getContext('2d', { willReadFrequently: true })
  const out = document.createElement('canvas'); out.width = GW * S; out.height = GHT * SH
  const ox = out.getContext('2d')
  const tex = new THREE.CanvasTexture(out); tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace
  const board = new THREE.Mesh(new THREE.PlaneGeometry(GW * LED, GHT * LEDH), new THREE.MeshBasicMaterial({ map: tex, fog: false, side: THREE.DoubleSide }))
  // it replaces Oracle's own board (28 Oct, Andrew: 'wire that puppy in directly over it'): the real board in the park model sits between the two light towers, from
  // 28 Oct, night remeasure (Andrew: still higher than the real board), by casting rays at the park model from in front of it: the screen is a flat face 149 m out,
  // from 8 degrees left to 9 right and 13 to 35 m up (the bits at 36 to 52 m are the ORACLE PARK sign and its clock, which the first measure took for the board).
  // This one covers exactly that face (44 m by 22 m, centered half a degree right and 24 m up), a hair in front of it, with square LEDs 0.61 m across
  const bearing = o.boardBearing ?? 0.5, bh = o.boardH ?? 24
  board.position.copy(at(bearing, o.boardR ?? 148.4, bh))
  board.lookAt(at(bearing, 0, bh))
  scene.add(board)

  // ---- the ORACLE PARK sign and the clock over the board (29 Oct, Andrew: "breathe some life back into that"; the clock right for the moment) ----
  // Measured from in front like the board: the clock face is a disc 148.5 m out, dead center, 39.25 m up, 5.6 m across; the letters run 43 to 45.7 m up, from 3.75 degrees left
  // to 3.5 right. Both become bulbs like the board's, a hair in front of the model. The sign: ORACLE PARK in 5x7 bulbs between two rows of chaser bulbs. Idle it glows
  // bone, a gleam crosses it now and then and a bulb or two twinkles; a home run lights the letters in the accent one by one while the chasers run; a walk-off blinks the
  // lot; Karl dims it. The clock: twelve hour bulbs, sixty minute dots, bulb hands. DEJA-VU sets it to when the ball was hit and the hands spin back to it; the dojo runs
  // it on the time in San Francisco now, with a second hand.
  const SW = 67, SHT = 11, SP = 0.32, SS = 8, WORD = 'ORACLE PARK', LETS = []
  {
    const w = [...WORD].reduce((a, ch) => a + FONT[ch][0].length + 1, -1)
    let x = Math.floor((SW - w) / 2)
    ;[...WORD].forEach((ch, li) => { const g = FONT[ch]; g.forEach((r, y) => [...r].forEach((c, i) => { if (c === '#') LETS.push([x + i, y + 2, li]) })); x += g[0].length + 1 })
  }
  const sCan = document.createElement('canvas'); sCan.width = SW * SS; sCan.height = SHT * SS
  const sx = sCan.getContext('2d'), sTex = new THREE.CanvasTexture(sCan); sTex.colorSpace = THREE.SRGBColorSpace
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(SW * SP, SHT * SP), new THREE.MeshBasicMaterial({ map: sTex, fog: false, side: THREE.DoubleSide }))
  sign.position.copy(at(-0.12, 148.2, 44.35)); sign.lookAt(at(-0.12, 0, 44.35)); scene.add(sign)
  let sfx = null, gleam = null, gleamT = 8, fogged = false, signs = 0
  const lit = new Set(LETS.map(([x, y]) => x + ',' + y))
  function paintSign(dt) {
    const c = col()
    if (sfx) { sfx.t += dt; if (sfx.t > sfx.dur) sfx = null }
    if (!sfx && !gleam && (gleamT -= dt) <= 0) { gleam = { t: 0 }; gleamT = 22 + Math.random() * 16 }
    if (gleam && (gleam.t += dt) > 1.4) gleam = null
    sx.fillStyle = '#050505'; sx.fillRect(0, 0, sCan.width, sCan.height)
    const dim = fogged ? 0.45 : 1, t = sfx?.t ?? 0, twk = Math.floor(performance.now() / 260)
    const bulb = (x, y, colr, on) => { sx.globalAlpha = on ? dim : 1; sx.fillStyle = on ? colr : '#1a1a1a'; sx.beginPath(); sx.arc(x * SS + SS / 2, y * SS + SS / 2, SS * (on ? 0.44 : 0.28), 0, Math.PI * 2); sx.fill(); sx.globalAlpha = 1 }
    // the chasers: dark dots at rest; running in the accent on a home run, fast on a walk-off
    for (const y of [0, SHT - 1]) for (let x = 0; x < SW; x++) {
      const on = sfx && (x + (y ? 1 : 0) + Math.floor(t * (sfx.kind === 'walk' ? 22 : 12))) % 3 === 0
      bulb(x, y, c.acc, !!on)
    }
    for (let y = 1; y < SHT - 1; y++) for (let x = 0; x < SW; x++) if (!lit.has(x + ',' + y)) bulb(x, y, '', false)
    for (const [x, y, li] of LETS) {
      let k = c.tx
      if (sfx?.kind === 'hr') k = t > 0.15 + li * 0.13 ? c.acc : c.tx
      else if (sfx?.kind === 'walk') k = Math.floor(t * 6) % 2 ? c.acc : '#ffffff'
      else if (gleam && Math.abs(x - 2 * y - (gleam.t / 1.4) * (SW + 24) + 12) < 3) k = '#ffffff'
      else if ((x * 7 + y * 13 + twk) % 97 === 0) k = '#ffffff'
      bulb(x, y, k, true)
    }
    sTex.needsUpdate = true
  }

  const CR = 2.85, CPX = 256
  const cCan = document.createElement('canvas'); cCan.width = cCan.height = CPX
  const cx = cCan.getContext('2d'), cTex = new THREE.CanvasTexture(cCan); cTex.colorSpace = THREE.SRGBColorSpace
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(CR, 48), new THREE.MeshBasicMaterial({ map: cTex, fog: false, side: THREE.DoubleSide }))
  clockFace.position.copy(at(0, 148.3, 39.25)); clockFace.lookAt(at(0, 0, 39.25)); scene.add(clockFace)
  // the time shown, in minutes after midnight (fractional); spin: a sweep from one time to another; live: the time in San Francisco, updated every paint
  const sfNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60 }
  let clk = { shown: sfNow(), live: true, spin: null }
  function setClock(s) {
    if (!s || s.live) { clk = { shown: clk.shown, live: true, spin: { from: clk.shown, to: sfNow(), t: 0, dur: 0.9 } }; return }
    const [h, m] = String(s.hm).split(':').map(Number), to = h * 60 + m
    if (!isFinite(to)) return
    // back in time: the hands always run backward, at least once round, to the moment it was hit
    let d = ((clk.shown - to) % 720 + 720) % 720; if (d < 60) d += 720
    clk = { shown: clk.shown, live: false, hm: s.hm, spin: o.still ? null : { from: clk.shown, to: clk.shown - d, t: 0, dur: 1.5 }, target: to }
    if (o.still) clk.shown = to
  }
  function paintClock(dt) {
    const c = col(), R = CPX / 2
    if (clk.spin) { const sp = clk.spin; sp.t += dt; const k = ease(sp.t / sp.dur); clk.shown = sp.from + (sp.to - sp.from) * k; if (sp.t >= sp.dur) { clk.spin = null; clk.shown = clk.live ? sfNow() : clk.target } }
    else if (clk.live) clk.shown = sfNow()
    const dimA = fogged ? 0.5 : 1
    cx.fillStyle = '#050505'; cx.fillRect(0, 0, CPX, CPX)
    const dot = (a, r, rad, colr) => { cx.fillStyle = colr; cx.beginPath(); cx.arc(R + Math.sin(a) * r, R - Math.cos(a) * r, rad, 0, Math.PI * 2); cx.fill() }
    cx.globalAlpha = dimA
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; if (i % 5) dot(a, R * 0.86, 3, '#3a3a3a'); else dot(a, R * 0.86, i ? 8 : 10, i ? c.tx : c.acc) }
    const hand = (a, len, step, rad, colr) => { for (let r = 14; r <= len; r += step) dot(a, r, rad, colr) }
    const m = ((clk.shown % 720) + 720) % 720
    hand((m / 720) * Math.PI * 2, R * 0.46, 11, 7, c.tx)
    hand(((m % 60) / 60) * Math.PI * 2, R * 0.7, 10, 5.5, c.tx)
    if (clk.live && !clk.spin) hand((((clk.shown * 60) % 60) / 60) * Math.PI * 2, R * 0.74, 9, 3, c.acc)
    dot(0, 0, 9, c.acc)
    cx.globalAlpha = 1
    cTex.needsUpdate = true
  }
  // palette: a = the text color of the moment (accent, or bone while flashing), o = accent, w = bone, then fixed colors for the sprites
  const FIX = { b: '#5fd3ff', y: '#f2bc40', r: '#e4002b', g: '#8a8f99', n: '#a8713f', d: '#4a4f58' }
  const CODES = ' aowbyrgnd'
  const ci = (ch) => Math.max(0, CODES.indexOf(ch))
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = ci(ch) }
  const off = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = 0 }
  const rect = (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, ch) }
  const line = (x0, y0, x1, y1, ch) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch) }
  const blit = (spr, x, y, flip = false) => { for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) { const c = spr[j][flip ? spr[j].length - 1 - i : i]; if (c !== '.' && c !== ' ') put(x + i, y + j, c) } }
  // text in Press Start 2P at 8 px (8 LEDs tall); clip = [y0, y1) keeps only those rows (the odometer roll)
  const tw = (s) => { gx.font = '8px PS2P'; return Math.round(gx.measureText(s).width) }
  // x = 'c' centers it, or loops it sideways when it is wider than the board (on the animation's clock)
  let animT = 0
  function text(s, x, y, ch = 'a', clip = null) {
    gx.clearRect(0, 0, GW, GH); gx.fillStyle = '#fff'; gx.font = '8px PS2P'; gx.textBaseline = 'top'
    if (x === 'c') { const w = tw(s); if (w <= GW - 2) x = Math.round((GW - w) / 2); else { x = Math.round(2 - ((animT * 26) % (w + 24))); gx.fillText(s, x + w + 24, y) } }
    gx.fillText(s, x, y)
    const px = gx.getImageData(0, 0, GW, GH).data
    for (let j = 0; j < GH; j++) { if (clip && (j < clip[0] || j >= clip[1])) continue; for (let i = 0; i < GW; i++) if (px[(j * GW + i) * 4 + 3] > 110) buf[j * GW + i] = ci(ch) }
  }
  let lines = ['NUKE NAVIGATOR', ''], color = null, flash = 0, scroll = 0, marquee = true
  const ready = document.fonts?.load?.('8px PS2P').catch(() => {}) ?? Promise.resolve()
  // the two lines of text: centered when they fit, scrolling when they do not (or in the idle marquee)
  function drawLines() {
    const row = (s, y) => { if (!s) return; const w = tw(s); if (marquee || w > GW - 2) text(s, GW - (scroll % (w + 24 + GW)), y); else text(s, 'c', y) }
    if (lines[1]) { row(lines[0], 2); row(lines[1], 12) } else row(lines[0], 7)
  }
  function paint() {
    const c = col(), on = flash > 0 && Math.floor(flash * 6) % 2 ? c.tx : color ?? c.acc
    const P = [null, on, c.acc, c.tx, FIX.b, FIX.y, FIX.r, FIX.g, FIX.n, FIX.d]
    ox.fillStyle = '#050505'; ox.fillRect(0, 0, out.width, out.height)
    for (let y = 0; y < GHT; y++) for (let x = 0; x < GW; x++) {
      const ly = y - ROW0, k = ly >= 0 && ly < GH ? buf[ly * GW + x] : 0
      ox.fillStyle = k ? P[k] : '#1a1a1a'
      ox.beginPath(); ox.ellipse(x * S + S / 2, y * SH + SH / 2, S * (k ? 0.44 : 0.3), SH * (k ? 0.44 : 0.3), 0, 0, Math.PI * 2); ox.fill()
    }
    tex.needsUpdate = true
  }

  // ---- the sprites (one character per LED: o accent, w bone, b water, y gold, r red, g grey, n brown, d dark grey) ----
  const SPR = {
    crab: [['rr...........rr', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '.r.r.r...r.r.r.', 'r.r.r.....r.r.r'],
      ['.rr.........rr.', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '..r.r.r.r.r.r..', '.r.r.r...r.r.r.']],
    seal: [['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'gggggggggggg..', 'gggggggggggg..', '.ggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
      ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'ggggggggggggg.', '......gggggg..', 'gggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg']],
    gull: [['w.....w', '.w...w.', '..www..'], ['..www..', '.w...w.', 'w.....w']],
    fries: ['.y.y.y.', 'yy.y.yy', 'yyyyyyy', 'rrrrrrr', 'rwrwrwr', 'rrrrrrr', '.rrrrr.'],
    ball: ['.www.', 'wrwrw', 'wwwww', 'wrwrw', '.www.'],
    legs: [['w...w'], ['.w.w.']],
    glove: ['.n.n.n..', 'nnnnnnn.', 'nnnnnnnn', 'nnyyynnn', 'nnnnnnnn', '.nnnnnn.', '..nnnn..'],
    player: [['.w.', 'www', '.w.', 'w.w', 'w.w'], ['.o.', 'ooo', '.o.', 'o.o', 'o.o']],
    rocket: ['..w..', '.www.', '.www.', '.wbw.', '.www.', 'wwwww', 'w.w.w'],
    potato: ['...nnnnnn...', '.nnnnnnnnnn.', 'nnnynnnnnynn', 'nnnnnnnnnnnn', 'nnynnnnynnnn', 'nnnnnnnnnnnn', '.nnnnnnnynn.', '...nnnnnn...'],
    face: ['...wwww...', '.wwwwwwww.', 'wwwwwwwwww', 'ww.ww.wwww', 'wwwwwwwwww', 'wwwwwwwwww', 'www....www', 'ww.wwww.ww', '.wwwwwwww.', '...wwww...'],
  }

  // ---- the animations: each draws a frame at time t (seconds), over dur seconds; a = its arguments ----
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  const water = (t, y0 = 19) => { for (let x = 0; x < GW; x++) { put(x, y0 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); put(x, GH - 1, 'b') } }
  function roll(a, b, x, y, t) { // an odometer: a rolls up and away, b rolls in under it, inside rows y .. y+9
    const k = Math.round(ease(t) * 10)
    text(a, x, y - k, 'o', [y - 1, y + 9]); text(b, x, y + 10 - k, 'o', [y - 1, y + 9])
  }
  const ANIM = {
    crab: { dur: 4.6, draw(t) { const x = -16 + t * 20, f = Math.floor(t * 8) % 2; blit(SPR.crab[f], x, 12); if (Math.floor(t * 3) % 2) text('BOO!', 'c', 1, 'w'); else text('CRAZY CRAB', 'c', 1, 'r') } },
    seal: { dur: 4.2, draw(t) {
      water(t)
      const rise = ease(t / 1.2) - ease((t - 3.2) / 0.8), open = t > 1.3 && t < 2.1
      blit(SPR.seal[open ? 1 : 0], 30, 20 - rise * 11)
      if (t < 2.05) { const k = Math.min(1, t / 2.0); put(30 + k * 2, 1 + k * 11, 'w'); put(31 + k * 2, 1 + k * 11, 'w'); put(30 + k * 2, 2 + k * 11, 'w'); put(31 + k * 2, 2 + k * 11, 'w') }
      if (t > 2.1) text('GULP!', 2, 2, 'w')
    } },
    odometer: { dur: 3.4, draw(t, a) { text('SPLASHES', 'c', 1, 'b'); const n = a?.n ?? 1, s0 = '#' + (n - 1), s1 = '#' + n; roll(s0, s1, Math.round((GW - tw(s1)) / 2), 12, (t - 0.6) / 0.9) } },
    cable: { dur: 5.2, draw(t, a) {
      line(0, 1, GW, 1, 'g')
      const w = 34, x = Math.round(-w + ease(t / 3.4) * (GW / 2 + w / 2) - (t > 4.2 ? (t - 4.2) * 60 : 0))
      line(x + 22, 2, x + 18, 8, 'g')
      rect(x, 8, w, 1, 'w'); rect(x, 9, w, 10, 'r'); for (let i = 2; i < w - 2; i += 4) rect(x + i, 10, 2, 2, 'y')
      text(String(a?.ft ?? ''), x + 5, 12, 'w'); rect(x + 3, 19, 3, 2, 'g'); rect(x + w - 6, 19, 3, 2, 'g')
      line(0, GH - 1, GW, GH - 1, 'd')
      if (t > 3.0 && Math.floor(t * 4) % 2) text('DING', 52, 3, 'y')
    } },
    karl: { dur: 5.4, draw(t) {
      text(lines[0] || 'ORACLE PARK', 'c', 7, 'a')
      const front = (t / 3.2) * (GW + 10)
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (x > front - ((y * 7) % 5)) continue; if ((x + y + Math.floor(t * 6)) % 3) off(x, y); else put(x, y, 'd') }
      if (t > 3.6) text("KARL'S IN", 'c', 7, 'g')
    } },
    gulls: { dur: 5.6, draw(t) {
      const grab = 2.4, f = Math.floor(t * 6) % 2
      if (t < grab + 0.2) blit(SPR.fries, 33, 14)
      const gx0 = t < grab ? -8 + (t / grab) * 42 : 34 + (t - grab) * 22, gy = t < grab ? 2 + (t / grab) * 9 : 11 - (t - grab) * 4
      blit(SPR.gull[f], gx0, gy)
      if (t >= grab) blit(SPR.fries, gx0, gy + 3)
      text(t < grab ? 'GARLIC FRIES' : 'HEY!', t < grab ? 'c' : 4, t < grab ? 1 : 1, t < grab ? 'y' : 'w')
    } },
    bridge: { dur: 8, draw(t) {
      for (const tx of [18, 54]) { line(tx, 3, tx, 18, 'o'); line(tx + 1, 3, tx + 1, 18, 'o') }
      const cab = (x) => (x < 18 ? 3 + ((18 - x) / 18) * 5 : x < 54 ? 3 + 8 * (1 - ((x - 36) / 18) ** 2) : 3 + ((x - 54) / 18) * 5)
      for (let x = 0; x < GW; x++) { put(x, cab(x), 'o'); if (x % 3 === 0 && x !== 18 && x !== 54) line(x, cab(x) + 1, x, 13, 'd') }
      line(0, 14, GW, 14, 'o')
      for (let x = 0; x < GW; x++) if ((x + Math.floor(t * 3)) % 5) put(x, 20, 'b')
      const bx = ((t / 8) * (GW + 10)) - 6; rect(bx, 18, 5, 1, 'w'); put(bx + 2, 17, 'w')
    } },
    golf: { dur: 4.4, draw(t) {
      const sw = t < 1.0 ? -2.6 * ease(t) : -2.6 + 4.2 * ease((t - 1.0) / 0.35), hit = t > 1.2
      put(6, 8, 'w'); put(7, 8, 'w'); put(6, 9, 'w'); put(7, 9, 'w'); line(6, 10, 6, 15, 'w'); line(6, 15, 4, 19, 'w'); line(6, 15, 8, 19, 'w')
      line(6, 11, 6 + Math.sin(sw) * 8, 11 + Math.cos(sw) * 8, 'g')
      line(0, 20, GW, 20, 'd'); put(11, 19, 'y')
      if (!hit) put(11, 18, 'w'); else { const k = Math.min(1, (t - 1.2) / 2.4), x = 11 + k * 58, y = 18 - 4 * 15 * k * (1 - k); put(x, y, 'w') }
      if (t > 2.0) text('FORE!', 38, 3, 'o')
    } },
    tomahawk: { dur: 3.8, draw(t) {
      text('TOMAHAWK', 'c', 1, 'o')
      const th = t < 1.1 ? -1.9 + 0.3 * Math.sin(t * 8) : t < 1.35 ? -1.9 + 1.9 * ease((t - 1.1) / 0.25) : 0
      const px = 26, py = 18, L = 14, hx = px + Math.cos(th) * L, hy = py + Math.sin(th) * L
      line(px, py, hx, hy, 'n'); rect(hx - 1, hy - 2, 4, 4, 'g'); put(hx + 3, hy - 1, 'w'); put(hx + 3, hy, 'w')
      blit(SPR.ball, 41, 15)
      if (t > 1.35 && t < 2.2) for (let i = 0; i < 6; i++) put(42 + Math.cos(i) * (t - 1.35) * 14, 16 - Math.abs(Math.sin(i)) * (t - 1.35) * 12, 'y')
      line(0, 20, GW, 20, 'd')
    } },
    chase: { dur: 4.6, draw(t) {
      text('CHASE SCENE', 'c', 1, 'o')
      const f = Math.floor(t * 10) % 2, bx = ((t * 26) % (GW + 30)) - 8
      blit(SPR.ball, bx, 12); blit(SPR.legs[f], bx, 17)
      blit(SPR.glove, bx - 16 - Math.sin(t * 9) * 1.5, 11)
      for (let i = 1; i < 4; i++) put(bx - 3 - i * 2, 13 + (i % 2), 'g')
      line(0, 19, GW, 19, 'd')
    } },
    insidejob: { dur: 4.8, draw(t) {
      text('INSIDE JOB', 'c', 1, 'o')
      const sx = 26, sy = 8, open = ease((t - 2.4) / 0.5)
      rect(sx, sy, 20, 13, 'g'); rect(sx + 2, sy + 2, 16, 9, 'd')
      if (open < 1) { rect(sx + 2 + open * 16, sy + 2, 16 - open * 16, 9, 'g'); const a = t * 5, dx = sx + 10 + Math.cos(a) * 3, dy = sy + 6 + Math.sin(a) * 3; put(sx + 10, sy + 6, 'w'); put(dx, dy, 'y') }
      if (open >= 1) { const k = Math.min(1, (t - 2.9) / 1.2), x = sx + 8 + k * 26, y = sy + 5 - 9 * k * (1 - k) * 4; blit(SPR.ball, x, Math.min(16, y)) }
    } },
    walkoff: { dur: 5.2, draw(t) {
      if (Math.floor(t * 4) % 2) text('WALK-OFF!', 'c', 1, 'o')
      const hx = 36; put(hx - 1, 20, 'w'); put(hx, 20, 'w'); put(hx + 1, 20, 'w'); put(hx, 21, 'w')
      for (let i = 0; i < 6; i++) { const from = i < 3 ? -6 - i * 6 : GW + 4 + (i - 3) * 6, k = ease(t / 1.6), x = from + (hx - 1 + (i - 2.5) * 3 - from) * k, jump = t > 1.6 ? Math.abs(Math.sin(t * 7 + i)) * 4 : 0; blit(SPR.player[i % 2], x, 14 - jump) }
    } },
    slam: { dur: 5.6, draw(t) {
      const B = [[53, 20], [62, 14], [53, 8], [44, 14]]
      for (let i = 0; i < 4; i++) { const [x0, y0] = B[i], [x1, y1] = B[(i + 1) % 4]; line(x0, y0, x1, y1, 'd') }
      for (const [x, y] of B) rect(x - 1, y - 1, 2, 2, 'w')
      text('GRAND', 0, 2, 'o'); text('SLAM', 0, 12, 'o')
      let home = 0
      for (let r = 0; r < 4; r++) { // the runner on third, second, first, then the batter, each heading home in turn
        const start = 3 - r, k = Math.max(0, Math.min(1, (t - r * 0.9) / 1.2)), legs = r + 1, pos = start + k * legs
        if (k >= 1) { home++; continue }
        const seg = Math.floor(pos) % 4, f = pos - Math.floor(pos), [x0, y0] = B[seg], [x1, y1] = B[(seg + 1) % 4]
        rect(x0 + (x1 - x0) * f - 1, y0 + (y1 - y0) * f - 1, 2, 2, 'o')
      }
      text(String(home), 50, 11, 'y')
    } },
    flip: { dur: 4.4, draw(t, a) {
      text(a?.word ?? 'GO-AHEAD', 'c', 1, 'o')
      // team and runs with no space between (SF5 LAD4) so both fit across 72 LEDs; the batting team's runs roll over
      const bt = a?.bat ?? 'BAT', ft0 = `${a?.fld ?? 'FLD'}${a?.f ?? 0}`, s0 = String(a?.b0 ?? 0), s1 = String(a?.b1 ?? 1)
      const w = tw(bt) + Math.max(tw(s0), tw(s1)), x = Math.round((GW - w - tw(ft0) - 6) / 2)
      text(bt, x, 12, 'w'); roll(s0, s1, x + tw(bt), 12, (t - 1.0) / 0.9); text(ft0, x + w + 6, 12, 'w')
    } },
    moon: { dur: 4.8, draw(t) {
      for (let i = 0; i < 14; i++) { const x = (i * 37) % GW, y = (i * 11) % 18; if ((i + Math.floor(t * 3)) % 4) put(x, y, 'd') }
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) put(62 + x, 6 + y, 'g')
      const k = ease(t / 3.6), rx = 40 + k * 14, ry = 13 - k * 11
      blit(SPR.rocket, rx, ry); const fl = Math.floor(t * 10) % 2; put(rx + 2, ry + 7, fl ? 'o' : 'y'); put(rx + 1, ry + 7 + fl, 'y'); put(rx + 3, ry + 7 + fl, 'o')
      text('MOON', 2, 2, 'w'); text('SHOT', 2, 12, 'o')
    } },
    tater: { dur: 4.4, draw(t) {
      blit(SPR.potato, 4, 8)
      const a = Math.sin(t * 7) * 0.6 - 0.6, cx = 21, cy = 11, ex = cx + Math.cos(a) * 8, ey = cy + Math.sin(a) * 8
      line(cx, cy, ex, ey, 'g'); rect(ex - 1, ey - 1, 3, 3, 'g'); off(ex, ey); put(cx, cy, 'g')
      text('TWEAK', 32, 2, 'o'); text('TATER', 32, 12, 'o')
    } },
    // a ball off the board itself: the text breaks up and its pixels fall off, column by column
    glitch: { dur: 3.6, draw(t) {
      text('HOME RUN', 'c', 7, 'a')
      const snap = Uint8Array.from(buf); buf.fill(0)
      for (let x = 0; x < GW; x++) {
        const d = ((x * 73) % 17) / 17 * 1.1, fall = t < d ? 0 : 30 * (t - d) ** 2
        for (let y = GH - 1; y >= 0; y--) { const k = snap[y * GW + x]; if (!k) continue; const ny = Math.round(y + fall + (Math.sin(x * 9 + t * 40) > 0.7 && t < 0.6 ? 1 : 0)); if (ny < GH) buf[ny * GW + x] = (x + y) % 9 === 0 ? ci('w') : k }
      }
      if (t > 1.5) text('OUCH', 'c', 7, 'w')
    } },
    soclose: { dur: 4.2, draw(t) {
      blit(SPR.face, 8, 6)
      for (const ex of [10, 13]) { const k = ((t * 1.6 + ex * 0.2) % 1) * 6; put(ex, 10 + k, 'b') }
      text('SO', 32, 2, 'w'); text('CLOSE', 32, 12, 'o')
    } },
  }
  const PRIORITY = { glitch: 10, walkoff: 9, slam: 8, flip: 7, golf: 6, tomahawk: 6, chase: 6, insidejob: 6, seal: 5, odometer: 4, cable: 4, crab: 3, soclose: 3, tater: 3, moon: 3, karl: 2, gulls: 1, bridge: 1 }
  let cur = null, queue = [], wait = 0, idleT = 0, played = []
  // play now (if the board is free) or wait; delay holds it back, e.g. until HOME RUN has flashed
  // now: something the viewer just did (TWEAK THE TATER, Karl, MOONSHOT) cuts in ahead of everything
  function play(name, a = {}, delay = 0, now = false) {
    if (!ANIM[name]) return false
    if (now) { cur = null; queue = [{ name, a, p: 99 }, ...queue].slice(0, 2); wait = 0; return true }
    queue.push({ name, a, p: PRIORITY[name] ?? 1 })
    queue.sort((x, y) => y.p - x.p)
    if (queue.length > 2) queue.length = 2
    if (!cur) wait = Math.max(wait, delay)
    return true
  }
  function frame(dt) {
    buf.fill(0)
    if (cur) {
      cur.t += dt; animT = cur.t
      ANIM[cur.name].draw(cur.t, cur.a)
      if (cur.t >= ANIM[cur.name].dur) { played.push(cur.name); cur = null; if (!queue.length) idle(idleText) }
    } else if (queue.length && (wait -= dt) <= 0) {
      const n = queue.shift(); cur = { name: n.name, a: n.a, t: 0 }; idleT = 0; wait = 0
      ANIM[cur.name].draw(0, cur.a)
    } else {
      drawLines()
      // idle: now and then a gull steals fries or the bridge shows, while the board just scrolls the batter's name
      if (marquee && !flash && o.idleAnims !== false && (idleT += dt) > 26 + Math.random() * 14) { idleT = 0; play(Math.random() < 0.5 ? 'gulls' : 'bridge') }
    }
    paint()
  }
  ready.then(() => frame(0))
  // the sign and the clock at the board's pace; a clock in mid-spin every frame
  let sAcc = 0
  parts.push((dt) => { sAcc += dt; if (clk.spin) paintClock(dt); if (sAcc >= 0.09) { paintSign(sAcc); if (!clk.spin) paintClock(sAcc); sAcc = 0 } return true })
  let acc = 0
  parts.push((dt) => {
    acc += dt
    if (flash > 0) flash = Math.max(0, flash - dt)
    if (acc < 0.09) return true
    scroll += 1
    frame(acc); acc = 0
    return true
  })
  // a status line (TRACKING, the distance, HOME RUN) cuts short an idle animation but waits behind an event one
  const show = (a, b = '', c = null, fl = 0) => { lines = [a, b]; color = c; flash = fl; marquee = false; scroll = 0; if (cur && (PRIORITY[cur.name] ?? 1) <= 1) cur = null; if (!cur) frame(0) }
  let idleText = 'NUKE NAVIGATOR  ·  ORACLE PARK'
  function idle(txt) { idleText = txt ?? idleText; lines = [idleText, '']; color = null; flash = 0; marquee = true; scroll = 0 }

  // ---- seagulls: voxel gulls (28 Oct, night: everything in the park is voxels), a body and two three-cube wings that flap, circling the outfield; a home run scatters them ----
  const gulls = [], cube = new THREE.BoxGeometry(1, 1, 1), gm = new THREE.MeshLambertMaterial({ color: '#e8e6df', flatShading: true }), gt = new THREE.MeshLambertMaterial({ color: '#8a8f99', flatShading: true })
  function voxGull() {
    const m = new THREE.Group(), body = new THREE.Mesh(cube, gm)
    body.scale.set(0.7, 0.6, 1.6); m.add(body)
    const wing = (side) => { const w = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cube, k === 2 ? gt : gm); c.scale.set(0.8, 0.25, 0.8 - k * 0.15); c.position.x = side * (0.75 + k * 0.78); w.add(c) } m.add(w); return w }
    m.userData.wings = [wing(-1), wing(1)]
    return m
  }
  for (let i = 0; i < (o.gulls ?? 10); i++) {
    const m = voxGull()
    scene.add(m)
    const g = { m, c: at(Math.random() * 70 - 35, 80 + Math.random() * 60, 0), r: 14 + Math.random() * 22, h: 32 + Math.random() * 26, a: Math.random() * Math.PI * 2, w: (0.25 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6, out: 0, v: null }
    m.position.set(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
    gulls.push(g)
  }
  let t = 0
  parts.push((dt) => {
    t += dt
    for (const g of gulls) {
      g.a += g.w * dt
      const home = new THREE.Vector3(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
      if (g.out > 0) { g.out -= dt; g.m.position.addScaledVector(g.v, dt); g.v.y += 1.5 * dt }
      else g.m.position.lerp(home, Math.min(1, dt * 0.8))
      const flap = Math.sin(t * (g.out > 0 ? 16 : 7) + g.ph) * 0.45
      const dir = g.out > 0 ? Math.atan2(g.v.z, g.v.x) : g.a + Math.sign(g.w) * Math.PI / 2
      g.m.rotation.y = -dir + Math.PI / 2 // the body's length (z) along the flight
      g.m.userData.wings[0].rotation.z = -flap; g.m.userData.wings[1].rotation.z = flap
    }
    return true
  })
  function scatter() { for (const g of gulls) { g.out = 5 + Math.random() * 3; const a = Math.random() * Math.PI * 2; g.v = new THREE.Vector3(Math.cos(a) * 14, 9 + Math.random() * 8, Math.sin(a) * 14) } }

  // the board keeps its own wall clock (steps of up to half a second): the engine hands frames a clamped step, so on a slow device a 4.6 s crab took 45 s
  let wall = performance.now()
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.5, (now - wall) / 1000); wall = now; for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](dt)) parts.splice(i, 1) })
  return {
    show, idle, scatter, play,
    // a new swing takes the board: whatever the last one left playing or waiting is dropped
    clear() { cur = null; queue = []; wait = 0 },
    text: () => lines.join(' / '), gulls: () => gulls.length, scattered: () => gulls.filter((g) => g.out > 0).length,
    set visible(v) { board.visible = v; sign.visible = v; clockFace.visible = v; for (const g of gulls) g.m.visible = v },
    // the sign's moments ('hr', or 'walk' for a walk-off), Karl dimming it and the clock, and the clock: { hm: 'HH:MM' } for a real ball, { live: true } for now in San Francisco
    signFx(kind) { sfx = { kind, t: 0, dur: kind === 'walk' ? 5 : 3.6 }; gleam = null; signs++ }, signCount: () => signs,
    set fog(v) { fogged = !!v },
    setClock, clock: () => { const m = ((clk.shown % 720) + 720) % 720; return { h: Math.floor(m / 60) || 12, m: Math.floor(m % 60), live: clk.live, hm: clk.hm ?? null, spinning: !!clk.spin } },
    sign, clockFace, signState: () => (sfx ? sfx.kind : gleam ? 'gleam' : 'idle'),
    set gullsOn(v) { for (const g of gulls) g.m.visible = v },
    board, names: () => Object.keys(ANIM), anim: () => cur?.name ?? null, queued: () => queue.map((q) => q.name), played: () => [...played],
    // for the tests: how many LEDs are lit right now, and the board's size in LEDs
    litCount: () => buf.reduce((s, k) => s + (k ? 1 : 0), 0), size: [GW, GH],
    dur: (n) => ANIM[n]?.dur,
    // draw one frame of an animation at time t right now (the next tick redraws); returns how many LEDs it lit, and the board as a picture when asked
    peek(n, tt, a = {}, pic = false) { buf.fill(0); animT = tt; ANIM[n].draw(tt, a); paint(); return { lit: buf.reduce((s, k) => s + (k ? 1 : 0), 0), url: pic ? out.toDataURL() : null } },
  }
}
