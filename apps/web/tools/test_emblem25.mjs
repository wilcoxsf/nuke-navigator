// EMBLEM MAKER without a browser (2 Nov 2026): the sticker art is well formed, emblems pack and unpack exactly (the default, 200 seeded random ones and a maxed-out
// one, which has to stay under 1,200 characters), garbage never throws, gamer tags clean up the way Andrew wants (xX_SplashDaddy_Xx survives), and drawEmblem
// paints the 32 by 32 square and nothing outside it. The DOM editor is not exercised here.
// Usage (from apps/web): node tools/test_emblem25.mjs
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const M = await import(pathToFileURL(resolve(here, '../src/cockpits/emblem25.js')).href)
const { SHOWN, EMBLEM_N, STICKERS, EMBLEM_COLORS, BG_STYLES, MIRRORS, DEFAULT_EMBLEM, encodeEmblem, decodeEmblem, normEmblem, randomEmblem, drawEmblem, emblemPixels, emblemDataURL, cleanTag, EMBLEM_CSS, emblemEditor } = M

let fails = 0
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : extra) }
const J = (v) => JSON.stringify(v)
// mulberry32: a small seeded generator so the random emblems are the same every run
const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const validEmblem = (e) => !!e && BG_STYLES.includes(e.bg?.style) && [e.bg.a, e.bg.b].every((c) => Number.isInteger(c) && c >= 0 && c < 16) && Array.isArray(e.layers) && e.layers.length <= 16 &&
  e.layers.every((l) => STICKERS.some((s) => s.id === l.s) && [l.c, l.c2].every((c) => c >= 0 && c < 16) && l.k >= 1 && l.k <= 4 && l.r >= 0 && l.r <= 3) &&
  Array.isArray(e.paint) && e.paint.length === 1024 && e.paint.every((p) => Number.isInteger(p) && p >= -1 && p < 16) && MIRRORS.includes(e.mirror) && typeof e.under === 'boolean'

// ---- the basics ----
check('exports', EMBLEM_N === 32 && EMBLEM_COLORS.length === 16 && typeof EMBLEM_CSS === 'string' && typeof emblemEditor === 'function', `N ${EMBLEM_N} colors ${EMBLEM_COLORS.length}`)
check('palette has the house colors', ['#ff7a00', '#9dff00', '#5ce1ff', '#e8e1c9', '#030403', '#8a8f99'].every((c) => EMBLEM_COLORS.includes(c)) && new Set(EMBLEM_COLORS).size === 16)
check('css selectors all scoped to #cp .c25 .emb', EMBLEM_CSS.replace(/@media[^{]*\{/g, '').split('}').map((r) => r.split('{')[0].trim()).filter(Boolean).every((sel) => sel.split(',').every((s) => s.trim().startsWith('#cp .c25 .emb'))))

// ---- stickers ----
const bad = STICKERS.filter((s) => { const w = s.rows[0]?.length; return !w || w > 16 || s.rows.length < 4 || s.rows.length > 16 || w < 4 || s.rows.some((r) => r.length !== w || /[^#+.]/.test(r)) || !s.rows.join('').includes('#') })
check(`stickers: ${STICKERS.length} (at least 30)`, STICKERS.length >= 30)
check('stickers rectangular, 4 to 16 a side, only # + .', bad.length === 0, bad.map((s) => s.id).join(' '))
check('sticker ids unique, names in caps', new Set(STICKERS.map((s) => s.id)).size === STICKERS.length && STICKERS.every((s) => s.name === s.name.toUpperCase()))
const want = ['skull', 'flame', 'bolt', 'crown', 'star', 'ball', 'bats', 'bat', 'glove', 'wing', 'sword', 'gull', 'sealion', 'cablecar', 'gate', 'fog', 'kayak', 'splash', 'nuke', 'rad', 'rocket', 'dice', 'money', 'diamond', 'fist', 'heart', 'eye', 'shades', 'garlic', 'hotdog', 'ghost', 'trophy', 'chevrons', 'shield', 'ring', 'frame', 'tri']
{ // (11 Nov) the picker: his twelve keepers and his thirteen new ones, in his order; the rest hidden but still drawn in saved emblems; CHAOS-style randoms use only the shown ones
  const mine = ['flame', 'skull', 'bolt', 'ball', 'bats', 'bat', 'glove', 'sealion', 'kayak', 'nuke', 'money', 'crab', 'seagull', 'hotdog2', 'finger', 'joint', 'cablecar2', 'bridge', 'atom', 'bike', 'ak', 'poo', 'pyramid', 'wave', 'beer']
  check('the sticker picker shows exactly his 25, in his order', SHOWN.map((x) => x.id).join() === mine.join(), SHOWN.map((x) => x.id).join())
  const used = new Set(); for (let i = 0; i < 200; i++) for (const l of randomEmblem(seeded(i + 7)).layers) used.add(l.s)
  check('random emblems only use stickers in the picker', [...used].every((id) => mine.includes(id)), [...used].filter((id) => !mine.includes(id)).join())
  const old = normEmblem({ layers: [{ s: 'crown' }, { s: 'wing' }] }); check('an old emblem with a hidden sticker still decodes and draws', decodeEmblem(encodeEmblem(old)).layers.length === 2 && emblemPixels(old).some((v) => v >= 0))
}
check('every asked-for sticker is there', want.every((id) => STICKERS.some((s) => s.id === id)), want.filter((id) => !STICKERS.some((s) => s.id === id)).join(' '))

// ---- packing ----
const rt = (v) => { const e = normEmblem(v), s = encodeEmblem(e), d = decodeEmblem(s); return { ok: J(d) === J(e), s, e, d } }
const d0 = rt(DEFAULT_EMBLEM)
check(`round trip DEFAULT (${d0.s.length} chars)`, d0.ok && validEmblem(d0.d))
const rng = seeded(25), misses = []
let longest = 0
for (let i = 0; i < 200; i++) { const v = randomEmblem(rng), r = rt(v); longest = Math.max(longest, r.s.length); if (!r.ok || !validEmblem(r.d) || J(v) !== J(r.e)) misses.push(i) }
check(`round trip 200 random emblems (longest ${longest} chars)`, misses.length === 0, 'misses at ' + misses.slice(0, 10).join(' '))
check('random emblems are not all alike', new Set(Array.from({ length: 20 }, () => encodeEmblem(randomEmblem(rng)))).size === 20)
// the worst case: 16 layers at the far corners of every setting and paint that is pure noise over all 17 values
const r2 = seeded(7), maxed = {
  bg: { style: 'RINGS', a: 15, b: 9 }, mirror: 'BOTH', under: true,
  layers: Array.from({ length: 16 }, (_, i) => ({ s: STICKERS[STICKERS.length - 1 - i].id, c: 15 - i, c2: i, x: i % 2 ? 63 : -32, y: i % 3 ? -32 : 63, k: 4, r: 3, fx: 1, fy: 1 })),
  paint: Array.from({ length: 1024 }, () => Math.floor(r2() * 17) - 1),
}
const dm = rt(maxed)
check(`round trip maxed (16 layers, noisy paint): ${dm.s.length} chars, under 1200`, dm.ok && dm.s.length < 1200 && dm.d.layers.length === 16, `len ${dm.s.length}`)
const stripes = rt({ ...maxed, paint: Array.from({ length: 1024 }, (_, i) => ((i >> 3) % 3) - 1) })
check(`round trip run-length paint (${stripes.s.length} chars)`, stripes.ok)
const solid = rt({ ...maxed, paint: new Array(1024).fill(4) })
check(`round trip one-color paint (${solid.s.length} chars)`, solid.ok)
check('encoded strings are URL-safe', [d0.s, dm.s, stripes.s].every((s) => /^[A-Za-z0-9_-]*$/.test(s)))
check('out of range values clamp (x 999, k 9, r -1, color 40)', (() => { const e = normEmblem({ layers: [{ s: 'skull', x: 999, y: -999, k: 9, r: -1, c: 40 }] }), l = e.layers[0]; return l.x === 63 && l.y === -32 && l.k === 4 && l.r === 3 && l.c === 1 && rt(e).ok })())
check('unknown sticker layers drop out', normEmblem({ layers: [{ s: 'nope' }, { s: 'bat' }] }).layers.length === 1)

// ---- garbage in ----
const junk = ['', 'zzz', 'A', '!!!!', '====', 'AQ', 'AQAA', 'AQAAEQ', 'AQAAAQ', '\u{1F480}\u{1F480}', null, undefined, 42, {}, [], { layers: 'x', paint: 7, bg: 5 }]
for (let i = 0; i < 300; i++) { const n = Math.floor(rng() * 900); junk.push(Array.from({ length: n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[Math.floor(rng() * 64)]).join('')) }
// and real strings with a byte flipped or the tail cut off
for (let i = 0; i < 100; i++) { const s = encodeEmblem(randomEmblem(rng)), k = Math.floor(rng() * s.length); junk.push(s.slice(0, k), s.slice(0, k) + (s[k] === 'A' ? 'B' : 'A') + s.slice(k + 1)) }
let thrown = 0, invalid = 0
for (const s of junk) { try { if (!validEmblem(decodeEmblem(s))) invalid++ } catch { thrown++ } }
check(`decode garbage (${junk.length} strings): never throws, always valid`, thrown === 0 && invalid === 0, `thrown ${thrown} invalid ${invalid}`)
check('decode of empty and zzz gives the default', J(decodeEmblem('')) === J(normEmblem(DEFAULT_EMBLEM)) && J(decodeEmblem('zzz')) === J(normEmblem(DEFAULT_EMBLEM)))

// ---- gamer tags ----
const tags = [
  ['xX_SplashDaddy_Xx', 'xX_SplashDaddy_Xx'], ['[SFG]Wallop', '[SFG]Wallop'], ['  [SFG] Wallop  ', '[SFG]Wallop'], ['Splash Daddy \u{1F4A6}\u{1F525}', 'SplashDaddy'],
  ['n00b.sl4yer-99', 'n00b.sl4yer-99'], ['ab', ''], ['', ''], [null, ''], ['[TOOLONG]Name', '[TOOL]Name'], ['[]Name', 'Name'], ['Na[m]e!!', 'Name'], ['\u{1F480}\u{1F480}\u{1F480}', ''],
  ['a'.repeat(40), 'a'.repeat(18)], ['[SFG]ab', ''], ['caféRacer', 'cafRacer'], ['<script>x', 'scriptx'],
]
const tagMiss = tags.filter(([i, o]) => cleanTag(i) !== o)
check(`cleanTag (${tags.length} cases)`, tagMiss.length === 0, tagMiss.map(([i, o]) => `${J(i)} -> ${J(cleanTag(i))} want ${J(o)}`).join('; '))

// ---- drawing ----
const fake = () => { const calls = []; return { calls, fillStyle: '', imageSmoothingEnabled: true, fillRect(x, y, w, h) { calls.push([x, y, w, h, this.fillStyle]) } } }
let drawOk = true, why = ''
for (const [name, v, px] of [['default', DEFAULT_EMBLEM, 10], ['maxed', maxed, 3], ['random', randomEmblem(seeded(3)), 1], ['encoded', dm.s, 2], ['garbage', 'zzz', 4]]) {
  const g = fake()
  try { drawEmblem(g, v, px) } catch (e) { drawOk = false; why += `${name} threw ${e.message}; `; continue }
  const W = 32 * px, area = g.calls.reduce((a, c) => a + c[2] * c[3], 0)
  const inside = g.calls.every(([x, y, w, h]) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= W && y + h <= W)
  const colors = g.calls.every((c) => EMBLEM_COLORS.includes(c[4]))
  if (!inside || area !== W * W || !colors || g.imageSmoothingEnabled) { drawOk = false; why += `${name} inside ${inside} area ${area}/${W * W} colors ${colors}; ` }
}
check('drawEmblem fills exactly the 32x32 square in palette colors', drawOk, why)
// the pixels: the default has its baseball in white in the middle, a sticker turned four ways keeps its pixel count, clipping drops what falls off
const P = emblemPixels(DEFAULT_EMBLEM)
check('default emblem: white baseball at the center, burst behind', P[16 * 32 + 16] === 15 && new Set(P).size >= 5)
const count = (v) => { const p = emblemPixels(v); return p.filter((c) => c === 3).length }
const one = (o) => ({ bg: { style: 'SOLID', a: 0, b: 0 }, layers: [{ s: 'gull', c: 3, c2: 3, x: 16, y: 16, k: 1, ...o }] })
const base = count(one({}))
check('quarter turns and flips keep the sticker whole', [0, 1, 2, 3].every((r) => count(one({ r })) === base && count(one({ r, fx: 1, fy: 1 })) === base) && count(one({ k: 2 })) === base * 4, `base ${base}`)
check('a sticker hanging off the edge is clipped, not wrapped', count(one({ x: -4 })) < base && emblemPixels(one({ x: -4 }))[31] === 0)
check('a quarter turn really turns (gull rotated is not the gull)', J([...emblemPixels(one({ r: 1 }))]) !== J([...emblemPixels(one({}))]))
const under = { bg: { style: 'SOLID', a: 0, b: 0 }, layers: [{ s: 'frame', c: 3, c2: 3, x: 16, y: 16 }], paint: Array.from({ length: 1024 }, () => 9) }
check('paint over by default, PAINT UNDER puts it below the stickers', emblemPixels(under)[8 * 32 + 8] === 9 && emblemPixels({ ...under, under: true })[8 * 32 + 8] === 3)
check('emblemDataURL without a document returns empty', emblemDataURL(DEFAULT_EMBLEM) === '')

console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
