// the weird-states pass, round two (10 Nov, evening): a visit that starts with the sound off; J twice; the jukebox and the menu on a phone
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:5195'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}${ok ? '' : '  ' + JSON.stringify(info).slice(0, 400)}`)
async function open(w, h, pre) {
  const page = await browser.newPage({ viewport: { width: w, height: h } }), errs = []
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  if (pre) await page.addInitScript(pre)
  await page.goto(URL + '/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  return { page, errs }
}
// 1. the sound off from the last visit: no song starts on a click; SKIP turns it on
{
  const { page, errs } = await open(1827, 992, () => { try { localStorage.setItem('nn-snd', '0') } catch {} })
  await page.mouse.click(5, 5); await page.waitForTimeout(3000)
  const a = await page.evaluate(() => ({ playing: window.__mix25.jukebox.playing(), on: window.__nnSoundStats?.().on }))
  say(a.playing === null && a.on === false, '1a the sound left off: a click starts no song', a)
  await page.keyboard.press('j'); await page.waitForTimeout(800)
  const t = await page.evaluate(() => document.querySelector('#jkn')?.textContent.replace(/\s+/g, ' ').trim())
  say(/NOTHING PLAYING YET/.test(t ?? ''), '1b the jukebox says nothing is playing', t)
  await page.keyboard.press('j'); await page.waitForTimeout(600)
  const j2 = await page.evaluate(() => ({ open: document.querySelector('#c25m')?.classList.contains('open'), title: document.querySelector('#c25mt')?.textContent }))
  say(j2.open === true && /J U K E B O X/.test(j2.title ?? ''), '1c J again with it open: it stays open (J is not a toggle) and nothing breaks', j2)
  await page.click('#c25mb [data-song] b'); await page.waitForTimeout(900)
  const b = await page.evaluate(() => ({ playing: window.__mix25.jukebox.playing(), on: window.__nnSoundStats?.().on }))
  say(!!b.playing && b.on === true, '1d picking a song with the sound off turns it on and plays it', b)
  say(errs.length === 0, '1e no page errors', errs)
  await page.close()
}
// 2. a phone: the jukebox in one column, nothing past the screen; the menu with six lines
{
  const { page, errs } = await open(390, 844)
  await page.mouse.click(5, 5); await page.keyboard.press('j'); await page.waitForTimeout(900)
  const j = await page.evaluate(() => { const b = document.querySelector('#c25m .box')?.getBoundingClientRect(), wide = [...document.querySelectorAll('#c25mb *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.className || e.tagName).slice(0, 5); return { box: b && [Math.round(b.left), Math.round(b.right)], wide, cols: getComputedStyle(document.querySelector('.jkc')).gridTemplateColumns, sx: document.scrollingElement.scrollWidth > innerWidth } })
  say(j.wide.length === 0 && !j.sx && !/ /.test(j.cols.trim()), '2a the jukebox on a phone: one column, nothing past the edge', j)
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(800)
  const m = await page.evaluate(() => ({ open: document.querySelector('.c25 .sm')?.classList.contains('open'), n: document.querySelectorAll('.c25 .sm .smi').length, last: [...document.querySelectorAll('.c25 .sm .smi b')].pop()?.textContent, out: [...document.querySelectorAll('.c25 .sm .smi')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length }))
  say(m.open && m.n === 6 && m.last === 'JUKEBOX' && m.out === 0, '2b the menu on a phone: six lines, JUKEBOX last, all on screen', m)
  say(errs.length === 0, '2c no page errors', errs)
  await page.close()
}
await browser.close()
