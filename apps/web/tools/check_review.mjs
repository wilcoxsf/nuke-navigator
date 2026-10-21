// Loads the text review page, clicks through a few cards and prints the report, to prove the page works.
import { chromium } from 'playwright-core'

const url = 'file:///' + (process.argv[2] ?? 'C:/Users/andrewwi/Documents/NukeNavigator/ui-options/text-review.html')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } })
page.on('pageerror', (e) => console.log('[page error]', e.message))
await page.goto(url)
console.log('cards in first group:', await page.locator('.card').count())
await page.locator('.card .y').nth(0).click()
await page.locator('.card .x').nth(1).click()
await page.locator('nav button').nth(14).click()
await page.locator('.card .y').nth(0).click()
console.log('count text:', await page.locator('#count').innerText())
console.log((await page.evaluate(() => report())).split('\n').slice(0, 6).join('\n'))
await page.screenshot({ path: 'C:/Users/andrewwi/dev/nuke-navigator-new/scratch/shots/text-review.png' })
await browser.close()
