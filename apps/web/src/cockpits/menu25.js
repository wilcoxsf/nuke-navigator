// Study 25 SELECT screen: a video-game mode menu over the park (up and down to choose, Enter to start, Esc to come back to it, number keys jump straight to a line,
// S switches the sound). While it sits idle the park behind it replays the longest home runs (attract mode, run by the study through onIdle).
import { sound } from './sfx25.js'

export const MENU_CSS = `
#cp .c25 .sm{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:color-mix(in srgb,var(--k) 90%,transparent);pointer-events:auto}
#cp .c25 .sm.open{display:flex}
#cp .c25 .sm .smb{display:grid;gap:16px;justify-items:center;max-width:min(920px,94vw);max-height:94vh;overflow:auto;padding:10px 12px}
#cp .c25 .sm .smt{font-family:PS2P,monospace;font-size:clamp(22px,4.2vw,46px);color:var(--acc);letter-spacing:.04em;text-align:center;line-height:1.15;text-shadow:4px 4px 0 var(--ln)}
#cp .c25 .sm .sms{font-family:PS2P,monospace;font-size:10px;color:var(--dim);letter-spacing:.2em}
#cp .c25 .sm .sml{display:grid;gap:3px;width:min(780px,90vw)}
#cp .c25 .sm .smi{display:grid;grid-template-columns:22px minmax(0,auto) minmax(0,1fr);gap:16px;align-items:baseline;padding:7px 12px;cursor:pointer;border:1px solid transparent}
#cp .c25 .sm .smi .cur{font-family:PS2P,monospace;font-size:14px;color:var(--acc);visibility:hidden}
#cp .c25 .sm .smi b{font-family:PS2P,monospace;font-weight:400;font-size:clamp(11px,1.5vw,15px);color:var(--tx);white-space:nowrap}
#cp .c25 .sm .smi span{font-size:calc(17px * var(--ts));color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .sm .smi.on{border-color:var(--acc)}
#cp .c25 .sm .smi.on .cur{visibility:visible;animation:smblink .8s steps(1) infinite}
#cp .c25 .sm .smi.on b{color:var(--acc)}
#cp .c25 .sm .smi.dis b,#cp .c25 .sm .smi.dis span{opacity:.45}
#cp .c25 .sm .smf{font-family:PS2P,monospace;font-size:9px;color:var(--dim);letter-spacing:.12em;text-align:center;line-height:1.8}
#cp .c25 .sm .ins{font-family:PS2P,monospace;font-size:11px;color:var(--tx);animation:smblink 1.1s steps(1) infinite}
@keyframes smblink{50%{opacity:0}}
#cp .c25 .sm .lg2{display:grid;justify-items:center}
#cp .c25 .sm .lg2 svg{display:block;width:min(560px,80vw);height:auto;margin-bottom:-6px}
#cp .c25 .sm .lg3{padding:14px;background:radial-gradient(circle,var(--acc) 38%,transparent 42%) 0 0/14px 14px;animation:smchase .5s steps(2) infinite}
#cp .c25 .sm .lg3>div{background:var(--k);padding:16px 26px}
@keyframes smchase{to{background-position:14px 0}}
@media (prefers-reduced-motion:reduce){#cp .c25 .sm .lg3{animation:none}}
@media (prefers-reduced-motion:reduce){#cp .c25 .sm .smi.on .cur,#cp .c25 .sm .ins{animation:none}}
@media (max-width:600px){#cp .c25 .sm .smi{grid-template-columns:18px minmax(0,1fr);gap:4px 10px}#cp .c25 .sm .smi .cur{grid-column:1}#cp .c25 .sm .smi b{grid-column:2}#cp .c25 .sm .smi span:not(.cur){grid-column:2;white-space:normal;font-size:calc(15px * var(--ts))}}
`

// items: [{ k, name, blurb, run(), off?() }]; the menu owns the keyboard while it is open
export function selectMenu(host, items, o = {}) {
  const el = document.createElement('div')
  el.className = 'sm'
  el.innerHTML = `<div class="smb"><div class="lgo"></div><div class="sms">SELECT MODE</div><div class="sml"></div><div class="ins">1 PLAYER &nbsp; FREE PLAY</div>
    <div class="smf">UP / DOWN TO CHOOSE &nbsp; ENTER TO START &nbsp; ESC COMES BACK HERE<br>SOUND: <span class="snd"></span> (S)</div></div>`
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
  const list = el.querySelector('.sml')
  const paint = () => {
    list.innerHTML = items.map((it, n) => `<div class="smi${n === i ? ' on' : ''}${it.off?.() ? ' dis' : ''}" data-n="${n}" role="button" aria-label="${it.name}"><span class="cur">&gt;</span><b>${it.name}</b><span>${it.blurb}</span></div>`).join('')
    el.querySelector('.snd').textContent = sound.on() ? 'ON' : 'OFF'
    list.querySelectorAll('.smi').forEach((x) => {
      x.addEventListener('mouseenter', () => { if (i !== Number(x.dataset.n)) { i = Number(x.dataset.n); sound.play('move'); paint() } })
      x.addEventListener('click', () => { i = Number(x.dataset.n); pick() })
    })
  }
  const kick = () => { clearTimeout(idle); if (o.onIdle) idle = setTimeout(function tick() { if (open) { o.onIdle(); idle = setTimeout(tick, o.idleEvery ?? 7000) } }, o.idleAfter ?? 20000) }
  const pick = () => { const it = items[i]; if (it.off?.()) { sound.play('back'); return } sound.play('pick'); close(); it.run() }
  function show(k) { if (k) { const n = items.findIndex((it) => it.k === k); if (n >= 0) i = n } open = true; el.classList.add('open'); paint(); kick(); o.onOpen?.() }
  function close() { open = false; el.classList.remove('open'); clearTimeout(idle); o.onClose?.() }
  addEventListener('keydown', (e) => {
    if (!open || e.ctrlKey || e.metaKey || e.altKey) return
    kick()
    if (e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % items.length; sound.play('move'); paint() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i = (i - 1 + items.length) % items.length; sound.play('move'); paint() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() }
    else if (e.key === 'Escape') { e.preventDefault(); sound.play('back'); close() }
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); paint(); sound.play('move') }
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) { i = Number(e.key) - 1; pick() }
    e.stopImmediatePropagation()
  }, true)
  el.addEventListener('pointermove', kick)
  return { show, close, isOpen: () => open, el, setLogo(n) { logo = n; paintLogo() } }
}
