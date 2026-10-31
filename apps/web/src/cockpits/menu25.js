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
#cp .c25 .sm .smi.on b{color:var(--acc)}
#cp .c25 .sm .smi.dis b,#cp .c25 .sm .smi.dis span{opacity:.45}
#cp .c25 .sm .smf{font-family:PS2P,monospace;font-size:9px;color:var(--dim);letter-spacing:.12em;text-align:center;line-height:1.8}
#cp .c25 .sm .ins2{display:block;width:432px;max-width:86vw;height:auto;image-rendering:pixelated;cursor:pointer}
#cp .c25 .sm .art{font-family:PS2P,monospace;font-size:9px;color:var(--dim);letter-spacing:.12em;text-align:center;margin-top:-8px;cursor:pointer}
#cp .c25 .sm .art b{font-weight:400;color:var(--tx)}
@media (max-width:600px){#cp .c25 .sm .art{display:none}}
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
  el.innerHTML = `<div class="smb"><div class="lgo"></div><div class="sms">SELECT MODE</div><div class="sml"></div><canvas class="ins2" width="432" height="60" role="img" aria-label="a little pixel scene"></canvas><div class="art" role="button"></div>
    <div class="smf">UP / DOWN TO CHOOSE &nbsp; ENTER TO START &nbsp; ESC COMES BACK HERE<br>SOUND: <span class="snd"></span> (S) &nbsp; JUKEBOX (J)</div></div>`
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
  // the bottom of the menu (28 Oct, Andrew, in place of 1 PLAYER FREE PLAY): a pitcher throws, the batter lines it right back up the middle, the pitcher snags it.
  // 3 px per pixel on a 144 by 20 grid (108 until 31 Oct), a 3.6 s loop on the wall clock, running only while the menu is open; one still frame under reduced motion.
  const cv = el.querySelector('.ins2'), cx2 = cv.getContext('2d'), U = 3, GW = 144 // (31 Oct, Andrew: "We can make them a little wider": 108 to 144 across)
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
  // (30 Oct, later, Andrew: "I def want other options than the throw / catch for pixel art in the menu - let's have like 10 different ones that it goes between at
  // random when we pull the menu up"): ten little loops on the same 108 by 20 grid, one picked at random each time the menu opens, never the same twice running
  const R = (u, v, w, h, c) => { cx2.fillStyle = c; cx2.fillRect(Math.round(u * U), Math.round(v * U), Math.max(1, Math.round(w * U)), Math.max(1, Math.round(h * U))) }
  const word = (s, u, v, c) => { cx2.fillStyle = c; cx2.font = '8px PS2P'; cx2.fillText(s, u * U, v * U) }
  // 31 Oct (Andrew: "Can I get a way to watch all of these menu art? I don't like the zepellin that's boring, the fog is fun, the splash his is fun. We can make
  // them a little wider"): 144 across; the blimp is gone and KAYAK RACE (another splash) takes its place; under the art its name, left and right step through
  // them (or click the art), A plays them all in turn
  const SCENES = {
    snag: { name: 'THE SNAG', label: 'a pitcher throws, the batter lines it right back, the pitcher snags it', draw: (t, K) => K.snag(t) },
    moonshot: { name: 'MOONSHOT', label: 'a batter hits one so high it leaves the screen', draw(t, K) {
      K.blit(t > 0.9 && t < 1.4 ? B.swing : B.stance, 8, 10, true); K.blit(t < 0.5 ? P.set : t < 0.9 ? P.throw : P.set, GW - 22, 10, false)
      if (t < 0.9) K.ball(GW - 24 - (t / 0.9) * (GW - 42), 12)
      else if (t < 2.6) { const k = (t - 0.9) / 1.7; K.ball(18 + k * 90, 12 - k * 60 + k * k * 30) }
      if (t > 1.6) word('GONE!', 62, 8, K.acc)
    } },
    splash: { name: 'SPLASH HIT', label: 'a home run lands in McCovey Cove and a kayak goes after it', draw(t, K) {
      K.blit(t > 0.3 && t < 0.8 ? B.swing : B.stance, 4, 10, true)
      for (let u = 64; u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 5) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const k = Math.min(1, t / 1.4); if (t < 1.4) K.ball(14 + k * 96, 12 - Math.sin(k * Math.PI) * 11)
      if (t > 1.4 && t < 1.8) for (let i = 0; i < 5; i++) R(110 + (i - 2) * (t - 1.4) * 10, 16 - (t - 1.4) * 14 * (1 - Math.abs(i - 2) * 0.3), 1, 1, K.tx)
      if (t > 1.6) { const x = GW - Math.min(1, (t - 1.6) / 1.2) * 34; R(x, 16, 8, 1, '#a8713f'); R(x + 3, 13, 2, 3, K.acc); R(x + 1, 14, 6, 0.5, K.tx) }
      if (t > 2.8) word('SPLASH', 50, 8, '#5fd3ff')
    } },
    kayaks: { name: 'KAYAK RACE', label: 'a splash hit, three kayaks race for it, one flips', draw(t, K) {
      for (let u = 0; u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 5) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const k = Math.min(1, t / 0.9); if (t < 0.9) K.ball(-2 + k * 74, 2 + k * 14)
      if (t > 0.9 && t < 1.3) for (let i = 0; i < 5; i++) R(72 + (i - 2) * (t - 0.9) * 12, 16 - (t - 0.9) * 16 * (1 - Math.abs(i - 2) * 0.3), 1, 1, K.tx)
      const yak = (x, c, flip) => { if (flip) { R(x, 17, 8, 1, '#a8713f'); R(x + 3, 18, 2, 1, c) } else { R(x, 16, 8, 1, '#a8713f'); R(x + 3, 13, 2, 3, c); R(x + 1, 14 + (Math.floor(t * 6) % 2), 6, 0.5, K.tx) } }
      const g = Math.max(0, t - 0.9)
      yak(Math.min(66, 4 + g * 30), K.acc, false) // the winner, from the left
      yak(GW - 8 - Math.min(52, g * 26), '#5fd3ff', t > 2.1) // the one who flips, from the right
      yak(GW + 6 - g * 18, '#f2bc40', false)
      if (t > 1.3 && t < 2.6) K.ball(72, 15.5)
      if (t >= 2.6) { K.ball(68, 11); word('GOT IT', 52, 8, K.acc) }
      if (t > 2.1 && t < 3.0) word('GLUG', GW - 50, 9, '#5fd3ff')
    } },
    gulls: { name: 'GULL HEIST', label: 'a gull swoops down and steals a fan\'s garlic fries', draw(t, K) {
      const c = GW / 2 - 8
      R(c, 12, 4, 6, K.acc); R(c + 1, 10, 2, 2, K.tx); if (t < 1.4) R(c + 4, 13, 4, 2, '#f2bc40') // the fan and his fries
      const k = Math.min(1, t / 1.4), gx = t < 1.4 ? GW - 8 - k * (GW - 14 - c) : c + 6 - (t - 1.4) * 40, gy = t < 1.4 ? 2 + k * 9 : 11 - (t - 1.4) * 9, f = Math.floor(t * 8) % 2
      R(gx, gy, 3, 1, K.tx); R(gx - 2, gy - f, 2, 1, '#8a8f99'); R(gx + 3, gy - f, 2, 1, '#8a8f99'); R(gx + 3, gy + 0.5, 1, 1, '#f2bc40')
      if (t > 1.4) R(gx + 1, gy + 1, 3, 1, '#f2bc40')
      if (t > 1.6) { word('HEY!', c + 8, 7, K.acc); R(c + 1, 9, 1, 1, K.tx); R(c + 2, 8, 1, 1, K.tx) }
    } },
    cablecar: { name: 'CABLE CAR', label: 'a cable car rolls by, bell ringing, riders hanging off it', draw(t, K) {
      const x = -36 + t * 50
      R(x - 1, 8, 36, 1, K.tx); R(x, 9, 34, 7, '#e4002b'); for (let i = 2; i < 32; i += 4) R(x + i, 10, 2, 2, '#f2bc40'); R(x, 16, 34, 1, '#a8713f'); R(x + 4, 17, 3, 1, K.dim); R(x + 27, 17, 3, 1, K.dim)
      for (const r of [1, 31]) { R(x + r, 11, 1, 1, K.tx); R(x + r, 12, 1, 3, K.acc) }
      if (Math.floor(t * 4) % 2) word('DING', x + 10, 6, '#f2bc40')
    } },
    karl: { name: 'KARL THE FOG', label: 'Karl the fog rolls in over everything', draw(t, K) {
      K.blit(B.stance, 8, 10, true); K.blit(P.set, GW - 22, 10, false)
      const front = (t / 2.6) * (GW + 12)
      for (let v = 0; v < 20; v++) for (let u = 0; u < GW; u += 2) if (u < front - ((v * 7) % 9)) R(u, v, 2, 1, (u + v + Math.floor(t * 4)) % 3 ? '#3a3f47' : '#8a8f99')
      if (t > 2.4) word("KARL'S IN", 50, 12, K.tx)
    } },
    wave: { name: 'THE WAVE', label: 'the crowd does the wave', draw(t, K) {
      const wx = -6 + (t / 3.2) * (GW + 12)
      for (let u = 2; u < GW - 2; u += 3) { const up = Math.max(0, 1 - Math.abs(u - wx) / 7), h = Math.round(up * 5); R(u, 15 - h, 2, 2, K.tx); R(u, 17 - h, 2, 2, (u / 3) % 2 ? K.acc : '#f2bc40'); if (h > 3) { R(u - 1, 13 - h, 1, 1, K.tx); R(u + 2, 13 - h, 1, 1, K.tx) } }
    } },
    sealion: { name: 'SEA LION', label: 'a sea lion pops up and balances a ball on its nose', draw(t, K) {
      for (let u = 0; u < GW; u += 2) R(u, 17 + (Math.sin(u * 0.5 + t * 4) > 0.4 ? 0 : 1), 2, 1, '#5fd3ff')
      const rise = Math.min(1, t / 0.8) - Math.max(0, (t - 3.0) / 0.6), c = GW / 2 - 4
      if (rise > 0) { const y = 18 - rise * 9; R(c, y, 6, 9, '#8a8f99'); R(c + 3, y - 2, 6, 3, '#8a8f99'); R(c + 7, y - 1, 1, 1, K.tx); K.ball(c + 6.5 + Math.sin(t * 6) * 0.6, y - 4.5) }
      if (t > 1.4 && t < 3.0) word('ARF', c + 16, 8, K.tx)
    } },
    steamroller: { name: 'STEAMROLLER', label: 'a steamroller flattens a Dodger', draw(t, K) {
      const x = -30 + t * 48, dx = 84, flat = x + 26 > dx
      if (!flat) { R(dx, 9, 4, 2, '#5fd3ff'); R(dx, 11, 4, 3, K.tx); R(dx - 1, 14, 6, 3, '#5fd3ff'); R(dx, 17, 4, 1, K.dim) } else { R(dx - 3, 17, 10, 1, '#5fd3ff'); R(dx - 4, 17, 1, 1, '#e4002b'); R(dx + 7, 17, 1, 1, '#e4002b') }
      R(x, 9, 18, 7, '#f2bc40'); R(x + 3, 5, 8, 4, '#f2bc40'); R(x + 4, 6, 4, 2, K.acc); for (let v = 0; v < 8; v++) R(x + 20, 9 + v, 7 - Math.abs(v - 3.5), 1, K.dim)
      if (flat && t > 2.6) word('FLAT', 70, 7, K.acc)
    } },
  }
  let sceneKey = 'snag', lastKey = null
  const KEYS = Object.keys(SCENES), artEl = el.querySelector('.art')
  let allArt = false, artT0 = 0
  const paintArt = () => { artEl.innerHTML = `<b>${SCENES[sceneKey].name}</b> &nbsp; ${KEYS.indexOf(sceneKey) + 1} / ${KEYS.length} &nbsp; &larr; &rarr; MORE &nbsp; A: ${allArt ? 'STOP' : 'ALL'}`; cv.setAttribute('aria-label', SCENES[sceneKey].label) }
  const setScene = (k) => { sceneKey = k; lastKey = k; artT0 = performance.now(); paintArt() }
  const stepArt = (d) => setScene(KEYS[(KEYS.indexOf(sceneKey) + d + KEYS.length) % KEYS.length])
  const pickScene = () => { const keys = KEYS.filter((k) => k !== lastKey); setScene(keys[Math.floor(Math.random() * keys.length)]) }
  cv.addEventListener('click', () => { allArt = false; stepArt(1); sound.play('move') })
  artEl.addEventListener('click', () => { allArt = !allArt; if (allArt) setScene(KEYS[0]); else paintArt(); sound.play('move') })
  const still = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  function scene(t) {
    const cs = getComputedStyle(host), tx = cs.getPropertyValue('--tx').trim(), acc = cs.getPropertyValue('--acc').trim(), dim = cs.getPropertyValue('--dim').trim()
    cx2.clearRect(0, 0, cv.width, cv.height)
    const blit = (spr, u, v, flip) => spr.forEach((r, j) => [...r].forEach((c, i) => { if (c === '.') return; cx2.fillStyle = c === 'a' ? acc : tx; cx2.fillRect((u + (flip ? spr[0].length - 1 - i : i)) * U, (v + j) * U, U, U) }))
    cx2.fillStyle = dim; cx2.fillRect(0, 18 * U, cv.width, 1)
    const ball = (u, v) => { cx2.fillStyle = acc; cx2.fillRect(Math.round(u * U), Math.round(v * U), 2 * U - 1, 2 * U - 1) }
    const snag = (t) => {
      // pitcher on the right facing left, batter on the left facing right
      const pu = GW - 22, bu = 8, row = 10
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
  let raf = 0
  const loop = () => { if (!open) { raf = 0; return } const e = (performance.now() - artT0) / 1000; if (allArt && e >= 3.6) stepArt(1); scene(((performance.now() - artT0) / 1000) % 3.6); raf = requestAnimationFrame(loop) } // (each loop from its start; A: every one in turn)
  const list = el.querySelector('.sml')
  const paint = () => {
    list.innerHTML = items.map((it, n) => `<div class="smi${n === i ? ' on' : ''}${it.off?.() ? ' dis' : ''}" data-n="${n}" role="button" aria-label="${it.name}"><b>${it.name}</b><span>${it.blurb}</span></div>`).join('')
    el.querySelector('.snd').textContent = sound.on() ? 'ON' : 'OFF'
    list.querySelectorAll('.smi').forEach((x) => {
      x.addEventListener('mouseenter', () => { if (i !== Number(x.dataset.n)) { i = Number(x.dataset.n); sound.play('move'); paint() } })
      x.addEventListener('click', () => { i = Number(x.dataset.n); pick() })
    })
  }
  const kick = () => { clearTimeout(idle); if (o.onIdle) idle = setTimeout(function tick() { if (open) { o.onIdle(); idle = setTimeout(tick, o.idleEvery ?? 7000) } }, o.idleAfter ?? 20000) }
  const pick = () => { const it = items[i]; if (it.off?.()) { sound.play('back'); return } sound.play('pick'); close(); it.run() }
  function show(k) { if (k) { const n = items.findIndex((it) => it.k === k); if (n >= 0) i = n } if (!open) pickScene(); open = true; el.classList.add('open'); paint(); kick(); if (still) scene(1.4); else if (!raf) raf = requestAnimationFrame(loop); o.onOpen?.() }
  function close() { open = false; el.classList.remove('open'); clearTimeout(idle); o.onClose?.() }
  addEventListener('keydown', (e) => {
    if (!open || e.ctrlKey || e.metaKey || e.altKey) return
    kick()
    if (e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % items.length; sound.play('move'); paint() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i = (i - 1 + items.length) % items.length; sound.play('move'); paint() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() }
    else if (e.key === 'Escape') { e.preventDefault(); sound.play('back'); close() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); allArt = false; stepArt(e.key === 'ArrowLeft' ? -1 : 1); sound.play('move') }
    else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); allArt = !allArt; if (allArt) setScene(KEYS[0]); else paintArt(); sound.play('move') }
    else if ((e.key === 'j' || e.key === 'J') && o.onJukebox) { e.preventDefault(); sound.play('pick'); close(); o.onJukebox() }
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); if (!sound.on()) jukebox.stop(); paint(); sound.play('move') }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) { i = Number(e.key) - 1; pick() }
    e.stopImmediatePropagation()
  }, true)
  el.addEventListener('pointermove', kick)
  // scene: which loop is up (and, for the tests, set one: k, drawn at t when given)
  return { show, close, isOpen: () => open, el, setLogo(n) { logo = n; paintLogo() }, scenes: Object.keys(SCENES), scene(k, t) { if (k && SCENES[k]) { setScene(k); if (t != null) scene(t) } return sceneKey }, allArt: () => allArt }
}
