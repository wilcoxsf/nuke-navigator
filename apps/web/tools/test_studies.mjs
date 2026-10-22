// Exercises studies 2 and 3 for real (no frozen time): keys on the button strip, then typed commands at the terminal prompt. Prints what changed so it can be checked.
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:5174'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const open = async (cp) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } })
  page.on('pageerror', (e) => console.log(`[cp${cp} page error]`, e.message))
  await page.goto(`${base}/?mode=dojo&ui=K&cp=${cp}&seed=7`)
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady, null, { timeout: 180000 })
  await page.waitForTimeout(1500)
  return page
}
// study 2: arm the speed slot with 1, push it up five, commit with Enter
{
  const p = await open(12)
  const before = await p.textContent('.slot[data-i="0"] b')
  const stateBefore = await p.evaluate(() => window.__dojo?.verdict?.kind)
  await p.keyboard.press('1')
  for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowUp')
  const mid = await p.textContent('.slot[data-i="0"] b')
  const previewText = await p.textContent('#c12v .hd')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(5200)
  console.log('study 2: speed', before, '->', mid, '| verdict while previewing:', previewText, '| first kind', stateBefore)
  console.log('study 2: tally', (await p.textContent('#c12c')).replace(/\s+/g, ' '), '| log', (await p.textContent('#c12l')).replace(/\s+/g, ' '))
  console.log('study 2: verdict after commit:', (await p.textContent('#c12v .st')), '/', (await p.textContent('#c12v .hd')))
  await p.screenshot({ path: 'C:/Users/andrewwi/dev/nuke-navigator-new/scratch/shots/test-s12.png' })
  await p.close()
}
// study 3: type commands
{
  const p = await open(13)
  for (const line of ['ev 112', 'dir l30', 'wind out 6', 'swing']) { await p.keyboard.type(line, { delay: 20 }); await p.keyboard.press('Enter'); await p.waitForTimeout(700) }
  await p.waitForTimeout(6000)
  console.log('study 3: terminal ->', (await p.textContent('#c13l')).replace(/\s+/g, ' ').slice(-420))
  await p.screenshot({ path: 'C:/Users/andrewwi/dev/nuke-navigator-new/scratch/shots/test-s13.png' })
  await p.close()
}
await browser.close()
