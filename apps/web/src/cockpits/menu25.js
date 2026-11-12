// Study 25 SELECT screen: a video-game mode menu over the park (up and down to choose, Enter to start, Esc to come back to it, number keys jump straight to a line,
// S switches the sound). While it sits idle the park behind it replays the longest home runs (attract mode, run by the study through onIdle).
import { sound } from './sfx25.js'
import { director } from './music25.js'
import { GAGS, drawGag, GW as GAG_W, GH as GAG_H, U as GAG_U } from './menugags25.js'

export const MENU_CSS = `
#cp .c25 .sm{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:color-mix(in srgb,var(--k) 97%,transparent);pointer-events:auto}
#cp .c25 .sm.open{display:flex}
#cp .c25 .sm .smb{display:grid;gap:16px;justify-items:center;max-width:min(920px,94vw);max-height:94vh;overflow:auto;padding:10px 12px}
#cp .c25 .sm .smx{position:fixed;top:14px;right:18px;display:inline-flex;gap:8px;align-items:center;pointer-events:auto;cursor:pointer}
#cp .c25 .sm .smx kbd{font:inherit;font-size:calc(15px * var(--ts));border:1px solid currentColor;padding:0 4px}
#cp .c25 .sm .smt{font-family:PS2P,monospace;font-size:24px;color:var(--acc);letter-spacing:0;text-align:center;line-height:1.15;text-shadow:4px 4px 0 var(--ln)}
#cp .c25 .sm .sms{font-family:PS2P,monospace;font-size:8px;color:var(--dim);letter-spacing:.2em}
#cp .c25 .sm .sml{display:grid;gap:3px;width:min(780px,90vw)}
#cp .c25 .sm .smi{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:16px;align-items:baseline;padding:7px 12px;cursor:pointer;border:1px solid transparent}
#cp .c25 .sm .smi b{font-family:PS2P,monospace;font-weight:400;font-size:16px;color:var(--tx);white-space:nowrap}
#cp .c25 .sm .smi span{font-size:calc(17px * var(--ts));color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .sm .smi.on{border-color:var(--acc)}
#cp .c25 .sm .smi.hero{grid-template-columns:minmax(0,1fr);gap:6px;padding:10px 12px}#cp .c25 .sm .smi.hero b{font-size:16px}#cp .c25 .sm .smi.hero span{color:var(--tx);white-space:normal}
@media (min-width:700px){#cp .c25 .sm .smt{font-size:32px}}@media (min-width:1100px){#cp .c25 .sm .smt{font-size:48px}#cp .c25 .sm .smi.hero b{font-size:24px}} /* (10 Nov, night: the label face on its 8 px grid, 16 / 24 / 32 / 48, not clamped in between) */
#cp .c25 .sm .smi.on b{color:var(--acc)}
#cp .c25 .sm .smi.dis b,#cp .c25 .sm .smi.dis span{opacity:.45}
#cp .c25 .sm .smf{font-family:PS2P,monospace;font-size:8px;color:var(--dim);letter-spacing:.125em;text-align:center;line-height:1.8}
#cp .c25 .sm .artbox{width:780px;max-width:90vw;aspect-ratio:780/120;display:flex;align-items:center;justify-content:center}
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
  el.innerHTML = `<div class="smb"><div class="lgo"></div><div class="sms">SELECT MODE</div><div class="sml"></div><div class="artbox"><canvas class="ins2" width="${GAG_W * GAG_U}" height="${GAG_H * GAG_U}" role="img" aria-label="a little pixel scene"></canvas></div>
    <div class="smf">&uarr; &darr; AND ENTER &nbsp;·&nbsp; ESC COMES BACK HERE</div><span class="bt smx" role="button" tabindex="0">CLOSE<kbd>ESC</kbd></span></div>`
  host.appendChild(el)
  // (1 Nov, night; playtest: a mouse user could not leave the menu) a CLOSE in the corner, and a click outside the box
  el.querySelector('.smx').addEventListener('click', () => { sound.play('back'); close() })
  el.addEventListener('click', (e) => { if (e.target === el) { sound.play('back'); close() } })
  let i = 0, open = false, idle = null, logo = o.logo ?? 1
  // the title, three ways (the M option): stacked letters, a pixel home-run arc over the name, or a marquee of chasing bulbs
  const LOGO = {
    1: '<div class="smt">NUKE<br>NAVIGATOR</div>',
    2: '<div class="lg2"><svg viewBox="0 0 560 120">' + Array.from({ length: 26 }, (_, k) => { const t = k / 25, x = 30 + t * 500, y = 108 - 96 * 4 * t * (1 - t); return '<rect x="' + (x - 4).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" width="8" height="8" fill="var(--' + (k === 25 ? 'acc' : k % 2 ? 'tx' : 'dim') + ')"/>' }).join('') + '</svg><div class="smt">NUKE NAVIGATOR</div></div>',
    3: '<div class="lg3"><div class="smt">NUKE<br>NAVIGATOR</div></div>',
  }
  const paintLogo = () => { el.querySelector('.lgo').innerHTML = LOGO[logo] ?? LOGO[1] }
  paintLogo()
  // the bottom of the menu (28 Oct, Andrew, in place of 1 PLAYER FREE PLAY): little pixel cartoons, now the twelve in menugags25.js (10 Nov: Q1 and Q2, his picks,
  // no words in them). Each plays once, start to finish, then a random other one comes; nothing steps through them.
  // Drawn at 12 frames a second; one still frame, the punchline, under reduced motion.
  const cv = el.querySelector('.ins2'), cx2 = cv.getContext('2d'), SCENES = GAGS
  let sceneKey = 'snag', lastKey = null
  const KEYS = Object.keys(SCENES)
  let artT0 = 0
  const paintArt = () => cv.setAttribute('aria-label', SCENES[sceneKey].label) // (no names, no counter, no way to step through them: 10 Nov, Andrew: "just having them is enough")
  const setScene = (k) => { sceneKey = k; lastKey = k; artT0 = performance.now(); lastTick = -1; paintArt() }
  const pickScene = () => { const keys = KEYS.filter((k) => k !== lastKey); setScene(keys[Math.floor(Math.random() * keys.length)]) }
  const still = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  function scene(t) { drawGag(cx2, sceneKey, t, getComputedStyle(host).getPropertyValue('--acc').trim() || '#f0802a') }
  let raf = 0, lastTick = -1
  const loop = (now) => {
    if (!open) { raf = 0; return }
    const tk = Math.floor(now / (1000 / 12))
    if (tk !== lastTick) {
      lastTick = tk
      const e = (now - artT0) / 1000
      if (e >= SCENES[sceneKey].dur) pickScene()
      scene((now - artT0) / 1000)
    }
    raf = requestAnimationFrame(loop)
  }
  const list = el.querySelector('.sml')
  const paint = () => {
    list.innerHTML = items.map((it, n) => `<div class="smi${n === i ? ' on' : ''}${it.off?.() ? ' dis' : ''}${it.hero ? ' hero' : ''}" data-n="${n}" role="button" aria-label="${it.name}"><b>${it.name}</b><span>${typeof it.blurb === 'function' ? it.blurb() : it.blurb}</span></div>`).join('') /* (12 Nov: a line can be live, DEJA-VU's count and its latest) */
    { const sn = el.querySelector('.snd'); if (sn) sn.textContent = sound.on() ? 'ON' : 'OFF' }
    list.querySelectorAll('.smi').forEach((x) => {
      x.addEventListener('mouseenter', () => { if (i !== Number(x.dataset.n)) { i = Number(x.dataset.n); sound.play('move'); paint() } })
      x.addEventListener('click', () => { i = Number(x.dataset.n); pick() })
    })
  }
  const kick = () => { clearTimeout(idle); if (o.onIdle) idle = setTimeout(function tick() { if (open) { o.onIdle(); idle = setTimeout(tick, o.idleEvery ?? 7000) } }, o.idleAfter ?? 20000) }
  const pick = () => { const it = items[i]; if (it.off?.()) { sound.play('back'); return } sound.play('pick'); close(); it.run() }
  function show(k) { if (k) { const n = items.findIndex((it) => it.k === k); if (n >= 0) i = n } if (!open) pickScene(); open = true; el.classList.add('open'); paint(); kick(); if (still) scene(SCENES[sceneKey].still); else if (!raf) raf = requestAnimationFrame(loop); o.onOpen?.() }
  function close() { open = false; el.classList.remove('open'); clearTimeout(idle); o.onClose?.() }
  addEventListener('keydown', (e) => {
    if (!open || e.ctrlKey || e.metaKey || e.altKey) return
    kick()
    if (e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % items.length; sound.play('move'); paint() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i = (i - 1 + items.length) % items.length; sound.play('move'); paint() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() }
    else if (e.key === 'Escape') { e.preventDefault(); sound.play('back'); close() }
    else if ((e.key === 'j' || e.key === 'J') && o.onJukebox) { e.preventDefault(); sound.play('pick'); close(); o.onJukebox() }
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); if (!sound.on()) director.stopAll(); paint(); sound.play('move') }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) { i = Number(e.key) - 1; pick() }
    e.stopImmediatePropagation()
  }, true)
  el.addEventListener('pointermove', kick)
  // scene: which loop is up (and, for the tests, set one: k, drawn at t when given)
  return { show, close, isOpen: () => open, el, setLogo(n) { logo = n; paintLogo() }, scenes: Object.keys(SCENES), scene(k, t) { if (k && SCENES[k]) { setScene(k); if (t != null) scene(t) } return sceneKey } }
}
