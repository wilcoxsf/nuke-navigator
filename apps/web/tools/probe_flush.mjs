// 12 Nov (Andrew's screenshot: "where who and sort are currently still higher than nuke it"): NUKE IT, WHERE? WHO? SORT THE SHOTS?, the arrows and the dropdown: one height, one bottom line
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const vp of [{ width: 1600, height: 900 }, { width: 1280, height: 760 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
  const page = await browser.newPage({ viewport: vp })
  await page.route('**/api.open-meteo.com/**', (r) => r.abort())
  await page.goto((process.argv[2] || 'http://localhost:5195') + '/?ui=K&cp=25&seed=7&ir=0&menu=0')
  await page.waitForFunction(() => window.__ready && window.__ready() && window.__cpReady && window.__mix25, null, { timeout: 180000 }); await page.waitForTimeout(3000)
  const r = await page.evaluate(() => [['NUKE', '#c25nk'], ['WHERE', '#c25fw'], ['WHO', '#c25fo'], ['SORT', '#c25pp'], ['ARROW', '#c25ch .stp'], ['DROP', '#c25nt']].map(([k, s]) => { const e = document.querySelector(s); if (!e) return [k, null]; const b = e.getBoundingClientRect(); return [k, Math.round(b.top), Math.round(b.bottom), Math.round(b.height)] }))
  const bots = r.filter((x) => x[1] != null).map((x) => x[2]), hs = r.filter((x) => x[1] != null).map((x) => x[3])
  const ok = Math.max(...bots) - Math.min(...bots) <= 2 && Math.max(...hs) - Math.min(...hs) <= 2
  console.log(`${ok ? 'OK ' : 'ODD'} ${vp.width}x${vp.height} one height, one bottom line  ${JSON.stringify(r)}`)
  await page.close()
}
await browser.close()
