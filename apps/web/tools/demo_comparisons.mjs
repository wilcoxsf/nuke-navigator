// Prints sample comparisons for a few home runs. Usage: node tools/demo_comparisons.mjs [seed]
import { readFileSync } from 'node:fs'
import { mulberry32, pick } from '../src/comparisons.js'

const rows = JSON.parse(readFileSync(new URL('../public/comparisons.json', import.meta.url), 'utf8'))
const lib = rows.map((r) => ({
  name: r.n, kind: r.k === 's' ? 'speed' : 'length', v: r.v,
  theme: r.t === 's' ? 'sf' : r.t === 'w' ? 'weird' : 'general', cat: r.c, fame: r.f || 0,
  reviewed: !!r.r, url: r.u || '', dim: r.d || 'length', note: r.x || '', countOk: !!r.o,
}))
const rand = mulberry32(Number(process.argv[2] ?? 7))
const FT = 0.3048
const MPH = 0.44704
const recent = []
for (const [label, kind, amt] of [
  ['108 mph off the bat', 'speed', 108 * MPH], ['95 mph off the bat', 'speed', 95 * MPH], ['117 mph off the bat', 'speed', 117 * MPH],
  ['392 ft home run', 'length', 392 * FT], ['420 ft home run', 'length', 420 * FT], ['465 ft moonshot', 'length', 465 * FT],
]) {
  console.log(`\n${label}:`)
  for (let i = 0; i < 6; i++) {
    const p = pick(lib, kind, amt, rand, recent)
    if (!p) { console.log('  (nothing)'); break }
    recent.push(p.rec.cat, p.rec.name); while (recent.length > 12) recent.shift()
    console.log(`  [${p.rec.theme.padEnd(7)}] ${p.phrase}`)
  }
}
