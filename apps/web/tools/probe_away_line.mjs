// one-off probe (10 Nov, evening): an away home run's top-left line names the park in its color with the feet over that park's wall; Fenway's wall face is a sheet,
// not posts; the pitched ball is white; the crossing redoes itself when only the wind changes (GPT red team 3)
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1827, height: 992 } }), errs = []
page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await page.route('**/api.open-meteo.com/**', (r) => r.abort())
await page.goto('http://localhost:5195/?mode=dojo&ui=K&cp=25&seed=7&ir=0&menu=0')
await page.waitForFunction(() => window.__ready && window.__ready() && window.__dojoReady && window.__cpReady && window.__mix25, null, { timeout: 180000 })
await page.waitForTimeout(1500)
const say = (ok, what, info) => console.log(`${ok ? 'OK ' : 'ODD'} ${what}  ${JSON.stringify(info).slice(0, 500)}`)
await page.evaluate(() => window.__mix25.ball((b) => b.hr && b.park === 'BOS')); await page.waitForTimeout(1500)
const w = await page.evaluate(() => { let g = null; window.__cp.NN.scene.traverse((o) => { if (o.name === 'awaywall25') g = o }); return g ? { kids: g.children.map((c) => c.type + (c.isInstancedMesh ? ':' + c.count : '')), venue: window.__mix25.awayWall()?.venue } : null })
say(w && w.kids.includes('Mesh') && w.kids.filter((k) => k.startsWith('Mesh:')).length === 1, 'Fenway: the wall is a line of cubes on top and one sheet for the face', w)
const pre = await page.evaluate(() => ({ html: document.querySelector('#c25rd .vd .vs')?.innerHTML, head: document.querySelector('#c25rd .vd .vh')?.textContent }))
say(/FENWAY PARK/.test(pre.html ?? '') && /color:/.test(pre.html ?? ''), 'before the swing: THE REAL ONE: HOME RUN AT FENWAY PARK, the park in color', pre)
await page.evaluate(() => { window.__f0 = window.__mix25.fires() }); await page.click('#c25nk')
let ballCol = null
for (let k = 0; k < 40; k++) { await page.waitForTimeout(300); const c = await page.evaluate(() => { let col = null; window.__cp.NN.scene.traverse((o) => { if (o.isMesh && o.renderOrder === 30 && o.material?.color && o.scale.x === 0.5) col = '#' + o.material.color.getHexString() }); return col }); if (c) { ballCol = c; break } }
say(ballCol === '#f4f1e8', 'the pitched ball flies white', { ballCol })
for (let k = 0; k < 80 && !(await page.evaluate(() => window.__mix25.fires() > window.__f0 && !!(window.__cp.anim?.() && window.__cp.anim().exploded))); k++) await page.waitForTimeout(400)
await page.waitForTimeout(1200)
const post = await page.evaluate(() => ({ html: document.querySelector('#c25rd .vd .vs')?.innerHTML, cross: window.__mix25.awayWall()?.cross }))
say(/FT OVER THE WALL AT|JUST OVER THE WALL AT/.test(post.html ?? '') && /FENWAY PARK/.test(post.html ?? ''), 'after it lands: N FT OVER THE WALL AT FENWAY PARK, from Fenway\'s own wall', post)
// the dojo with OTHER PARKS: changing only the wind redoes the crossing
await page.evaluate(() => document.querySelector('#c25tabs [data-tab="whatif"]').click()); await page.waitForTimeout(1200)
await page.evaluate(() => { window.__mix25.dojoPark('COL'); Object.assign(window.__cp.state, { ev: 108, la: 29, dir: -18, wind: 0, xwind: 0 }); window.__cp.update() }); await page.waitForTimeout(2000)
const c0 = await page.evaluate(() => window.__mix25.awayWall())
await page.evaluate(() => { Object.assign(window.__cp.state, { wind: -12 }); window.__cp.update() }); await page.waitForTimeout(2000)
const c1 = await page.evaluate(() => window.__mix25.awayWall())
say(!!c0?.cross && JSON.stringify(c0.cross) !== JSON.stringify(c1?.cross ?? null), 'OTHER PARKS: a wind change alone moves the crossing', { c0, c1 })
say(errs.length === 0, 'no page errors', errs)
await browser.close()
