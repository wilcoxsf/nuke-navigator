// Study 25 EMBLEM MAKER (2 Nov, home stretch, Andrew: "People should also be able to make like gamer tags like old COD for their Wallop Witness name, can we get some
// ridiculous art maker that's hard?"): a Call of Duty style emblem editor and a gamer tag for the name on THE WITNESS STAND. An emblem is a 32 by 32 pixel badge: a
// two-color backdrop (SOLID, SPLIT, STRIPES, CHECKER, BURST, RINGS), up to 16 sticker layers (pixel art below, each with two colors, a spot, a size of 1 to 4,
// quarter turns and flips) and a free paint layer on top (or under the stickers, PAINT UNDER). Colors are indices into one fixed 16-color palette, so a whole emblem
// packs into a few hundred bytes and travels as a short URL-safe string (encodeEmblem / decodeEmblem); the stand stores that string next to the tag.
// The editor (emblemEditor) is plain DOM, drawn into the host's modal; c25.js wires it in and injects EMBLEM_CSS. Nothing here touches document at import time,
// so node can import it for the tests (tools/test_emblem25.mjs).
export const EMBLEM_N = 32
const N = 32, NN = N * N
export const MAX_LAYERS = 16

// ---- the palette: house tokens first, then a Giants set, then the loud ones. Indices are stored, so the order never changes (add none, the packing has 4 bits) ----
export const EMBLEM_COLORS = ['#030403', '#e8e1c9', '#ff7a00', '#9dff00', '#5ce1ff', '#8a8f99', '#fd5a1e', '#27251f', '#efd19f', '#e4002b', '#2250d6', '#7b2fd0', '#ff5fa8', '#ffc21a', '#7a4a24', '#ffffff']
export const COLOR_NAMES = ['BLACK', 'BONE', 'SAFETY ORANGE', 'GEIGER', 'ICE', 'GREY', 'GIANTS ORANGE', 'GIANTS BLACK', 'GIANTS CREAM', 'RED', 'ROYAL BLUE', 'PURPLE', 'PINK', 'GOLD', 'BROWN', 'WHITE']
export const BG_STYLES = ['SOLID', 'SPLIT', 'STRIPES', 'CHECKER', 'BURST', 'RINGS']
export const MIRRORS = ['NONE', 'LR', 'UD', 'BOTH'] // the paint brush's symmetry: strokes are written mirrored, the drawing itself is never flipped

// ---- stickers: rows of '#' (color 1), '+' (color 2) and '.' (clear), '/' between rows. The list ORDER is stored in every saved emblem: append, never reorder ----
const gen = (w, h, f) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)).join(''))
const ART = [
  ['skull', 'SKULL', '...######.../.##########./############/############/##...##...##/#.++.##.++.#/##...##...##/#####..#####/.####..####./..########../..##.##.##../..########../...######...'],
  ['flame', 'FLAME', '.....#..../....##..../....###.../...####.../..#####.#./..######../.###+####./.##++####./##++++###./##+++++##./##++++++##/.#++++++#./..#++++#../...####...'],
  ['bolt', 'BOLT', '....#####/...#####./...####../..####.../..#######/.#######./.######../....###../...###.../...##..../..##...../..#....../.#.......'],
  ['crown', 'CROWN', '#.....##.....#/##....##....##/##...####...##/###.######.###/##############/##+###++###+##/##############/.############./.#++++++++++#./.############.'],
  ['star', 'STAR', '......#....../.....###...../.....#+#...../....##+##..../######+######/.#####+#####./..#########../...#######.../...#######.../..####.####../..###...###../.###.....###./.#.........#.'],
  ['ball', 'BASEBALL', '....####..../..########../.#+######+#./.##+####+##./###+####+###/####+##+####/####+##+####/###+####+###/.##+####+##./.#+######+#./..########../....####....'],
  ['bats', 'CROSSED BATS', '++..........##/+++........###/.+++......###./..+++....###../...+++..###.../....+++###..../.....+###...../......#+....../.....#..+...../....#....+..../...#......+.../..#........+../.#..........+./##..........++'],
  ['bat', 'BAT', '..........##/.........###/........###./.......###../......###.../.....###..../....##....../....#......./...#......../..+........./.+........../##..........'],
  ['glove', 'GLOVE', '.......##.##.../....##+##+##+##/....##+##+##+##/....##+##+##+##/.#..##+##+##+##/.##.##+##+##+##/.##+##########./..#+##########./..##+#########./...##########../...##++++####../....#########../.....#######...'],
  ['wing', 'WING', '.........#####/......########/....##########/..#####+######/.#####+#######/#####+##+#####/.###+##+##+###/..#+##+##+####/...#..#..#.###/..........#.##'],
  ['sword', 'SWORD', '...#.../..###../..#+#../..#+#../..#+#../..#+#../..#+#../..#+#../..#+#../..#+#../..#+#../#######/.#.+.#./...+.../...+.../..###..'],
  ['gull', 'GULL', '...###........../..#####........./..#.####......../++#######.....##/.+.########.###./....##########../.....########.../.......#####..../........+..+..../.......++.++....'],
  ['sealion', 'SEA LION', '....+++......./...+++++....../...+++++....../....+++......./.....#......../....###......./....#.##....../....#####...../.....#####..../.....######.../....#######.../...##.######../..##..#######./.##...########/......###..###/.....###....##'],
  ['cablecar', 'CABLE CAR', '.......#......../.......#......../.##############./################/#++#++#++#++#++#/#++#++#++#++#++#/################/#++++++++++++++#/################/.##############./..##........##../..##........##..'],
  ['gate', 'GOLDEN GATE', '..###..###../.+##....##+./.+########+./+.##....##.+/+.##....##.+/+.########.+/+.##....##.+/+.##....##.+/############/..##....##../..##....##../..##....##../.####..####./++++++++++++'],
  ['fog', 'KARL THE FOG', '.....###......../...#######.###../..############../.##############./######.##.######/#######..#######/.##############./................/.++++++..+++++../....++++++++....'],
  ['kayak', 'KAYAK', '..............++/.......##....++./.......##...+.../......####.+..../......###+#...../......##+#....../################/.##############./.++##########.../++..............'],
  ['splash', 'SPLASH', '#......#......#/.......#......./..#....#....#../...#..###..#.../#..#..###..#..#/.#.##.###.##.#./.#.#########.#./.##+#######+##./.##++#####++##./###+++###+++###/###############/.+++.+++++.+++.'],
  ['nuke', 'NUKE', '.....######...../...##########.../..####++++####../.##++######++##./################/################/.####++++++####./...##########.../......####....../....++####++..../...+++####+++.../......####....../.....######...../....########..../..############../################'],
  // three blades, the gaps up, down-left and down-right
  ['rad', 'RADIATION', gen(15, 15, (x, y) => { const dx = x - 7, dy = y - 7, d = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) * 180) / Math.PI; if (d <= 1.6) return '#'; if (d < 3 || d > 7.4) return '.'; return [-30, -150, 90].some((c) => Math.abs((((a - c) % 360) + 540) % 360 - 180) <= 30) ? '#' : '.' })],
  ['rocket', 'ROCKET', '....#..../...###.../..#####../..##+##../..#+++#../..##+##../..#####../..#####../.#######./##.###.##/#..###..#/#..###..#/..+.+.+../..+++++../...+++.../....+....'],
  ['dice', 'DICE', '.##########./############/##++####++##/##++####++##/############/#####++#####/#####++#####/############/##++####++##/##++####++##/############/.##########.'],
  ['money', 'MONEY BAG', '...##..##.../....####..../.....##...../...######.../..########../.#####+####./.####++++##./####+#+#####/#####+++####/######+#+###/####++++####/.#####+####./..########..'],
  ['diamond', 'DIAMOND', '...########.../..##+####+##../.##+##++##+##./##############/.##+######+##./..##+####+##../...##+##+##.../....##++##..../.....####...../......##......'],
  ['fist', 'FIST', '.##.##.##.##./#++#++#++#++#/#++#++#++#++#/#++#++#++#++#/#++#++#++#++#/##########++#/#+++++++++#+#/##########++#/.#++++++++++#/..#++++++++#./..##########./..#++++++++#./..##########.'],
  ['heart', 'HEART', '..###...###../.#+###.#####./#+###########/#+###########/#############/#############/.###########./..#########../...#######.../....#####..../.....###...../......#......'],
  ['eye', 'EYE', '.....######...../...##......##.../.##...++++...##./#....++##++....#/#...+++##+++...#/#....++##++....#/.##...++++...##./...##......##.../.....######.....'],
  ['shades', 'SHADES', '################/.+#####..+#####./.#+####..#+####./..####....####..'],
  ['garlic', 'GARLIC', '.....##...../.....##...../....####..../....####..../...######.../..##+##+##../.###+##+###./###+####+###/###+####+###/###+####+###/.###+##+###./..##+##+##../...######.../..+.+..+.+..'],
  ['hotdog', 'HOT DOG', '...++++++++++.../..++++++++++++../.##############./##.###.###.###.#/####.###.###.###/.##############./..++++++++++++../...++++++++++...'],
  ['ghost', 'GHOST', '...######.../..########../.##########./.##++##++##./###++##++###/###++##++###/############/#####..#####/#####..#####/############/############/############/##.###.###.#/#...#...#...'],
  ['trophy', 'TROPHY', '..##########../###+##########/#.#+########.#/#.#+########.#/.##+#########./...########.../....######..../.....####...../......##....../......##....../....######..../...#++++++#.../...########...'],
  ['chevrons', 'CHEVRONS', gen(13, 16, (x, y) => ([0, 5, 10].some((o) => { const t = y - o - Math.floor(Math.abs(x - 6) / 2); return t >= 0 && t < 3 }) ? '#' : '.'))],
  ['shield', 'SHIELD', '############/#++++++++++#/#++++++++++#/#++++++++++#/#++++++++++#/#++++++++++#/#++++++++++#/#++++++++++#/.#++++++++#./.#++++++++#./..#++++++#../...#++++#.../....#++#..../.....##.....'],
  ['ring', 'RING', gen(16, 16, (x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d <= 7.8 && d >= 5.6 ? '#' : '.' })],
  ['frame', 'FRAME', gen(16, 16, (x, y) => (x < 2 || y < 2 || x > 13 || y > 13 ? '#' : '.'))],
  ['tri', 'TRIANGLE', gen(15, 13, (x, y) => { const hw = ((y + 1) * 7.5) / 13, dx = Math.abs(x - 7); return dx > hw ? '.' : dx > hw - 1.6 || y >= 11 ? '#' : '+' })],
  ['crab', 'DUNGENESS', '.##..........##./#..#........#..#/#.##........##.#/.##..........##./..#..+....+..#../...##########.../..############../.##############./..############../.#.#.#....#.#.#./#.#.#......#.#.#'],
  ['bones', 'CROSSBONES', '##..........##/###........###/.###......###./...##....##.../....##..##..../.....####...../.....####...../....##..##..../...##....##.../.###......###./###........###/##..........##'],
  // a comic-book KAPOW: ten spikes, the middle in color 2
  ['kapow', 'KAPOW', gen(16, 16, (x, y) => { const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + Math.PI, t = ((a / (2 * Math.PI)) * 10) % 1, rad = 4.4 + 3.6 * (1 - Math.abs(t * 2 - 1)); return d > rad ? '.' : d > rad - 2.2 ? '#' : '+' })],
]
export const STICKERS = ART.map(([id, name, rows]) => ({ id, name, rows: typeof rows === 'string' ? rows.split('/') : rows }))
const BY_ID = new Map(STICKERS.map((s, i) => [s.id, i]))

// a sticker turned r quarter turns clockwise, then flipped on screen (fx left-right, fy up-down): { w, h, g } with g a row-major Uint8Array (0 clear, 1 color 1, 2 color 2)
const SHAPES = new Map()
function shape(id, r = 0, fx = 0, fy = 0) {
  const key = id + '|' + r + fx + fy
  if (SHAPES.has(key)) return SHAPES.get(key)
  let g = STICKERS[BY_ID.get(id)].rows.map((row) => [...row].map((ch) => (ch === '#' ? 1 : ch === '+' ? 2 : 0)))
  for (let t = 0; t < r; t++) { const H = g.length, W = g[0].length; g = Array.from({ length: W }, (_, y) => Array.from({ length: H }, (_, x) => g[H - 1 - x][y])) }
  if (fx) g = g.map((row) => row.slice().reverse())
  if (fy) g = g.slice().reverse()
  const s = { w: g[0].length, h: g.length, g: Uint8Array.from(g.flat()) }
  SHAPES.set(key, s)
  return s
}
// where a layer lands: x, y is its center in emblem pixels; the top left corner and the size after the turn and the scale
export function layerBox(l) { const s = shape(l.s, l.r, l.fx, l.fy), W = s.w * l.k, H = s.h * l.k; return { s, k: l.k, w: W, h: H, left: l.x - Math.floor(W / 2), top: l.y - Math.floor(H / 2) } }
// the x that puts a flipped copy of the layer exactly mirrored across the middle (TWIN, and the wing pairs in randomEmblem)
const twinX = (l) => ((shape(l.s, l.r).w * l.k) % 2 ? 31 : 32) - l.x

// ---- the value: { bg: { style, a, b }, layers: [{ s, c, c2, x, y, k, r, fx, fy }], paint: 1024 color indices row by row (-1 clear), mirror, under } ----
const ci = (v, d) => (Number.isInteger(v) && v >= 0 && v < 16 ? v : d)
const clampI = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
export function normLayer(l) {
  if (!l || typeof l !== 'object' || !BY_ID.has(l.s)) return null
  return { s: l.s, c: ci(l.c, 1), c2: ci(l.c2, 2), x: clampI(l.x, -32, 63, 16), y: clampI(l.y, -32, 63, 16), k: clampI(l.k, 1, 4, 1), r: ((clampI(l.r, -99, 99, 0) % 4) + 4) % 4, fx: l.fx ? 1 : 0, fy: l.fy ? 1 : 0 }
}
// any object in, a valid emblem out (fresh copy, fixed key order, numbers clamped, unknown stickers dropped)
export function normEmblem(v) {
  const o = v && typeof v === 'object' ? v : {}, bg = o.bg && typeof o.bg === 'object' ? o.bg : {}
  const style = BG_STYLES.includes(bg.style) ? bg.style : (Number.isInteger(bg.style) && BG_STYLES[bg.style]) || 'SOLID'
  const layers = (Array.isArray(o.layers) ? o.layers : []).map(normLayer).filter(Boolean).slice(0, MAX_LAYERS)
  const paint = new Array(NN).fill(-1), src = o.paint
  if (src && typeof src.length === 'number') for (let i = 0; i < NN; i++) paint[i] = ci(src[i], -1)
  return { bg: { style, a: ci(bg.a, 0), b: ci(bg.b, 1) }, layers, paint, mirror: MIRRORS.includes(o.mirror) ? o.mirror : 'NONE', under: !!o.under }
}
const toEmblem = (v) => (typeof v === 'string' ? decodeEmblem(v) : normEmblem(v ?? DEFAULT_EMBLEM))
const deepFreeze = (o) => { Object.values(o).forEach((x) => x && typeof x === 'object' && deepFreeze(x)); return Object.freeze(o) }
// the one everybody starts with: a baseball with a crown and wings on an orange burst
export const DEFAULT_EMBLEM = deepFreeze(normEmblem({
  bg: { style: 'BURST', a: 0, b: 6 },
  layers: [{ s: 'wing', c: 1, c2: 5, x: 9, y: 17 }, { s: 'wing', c: 1, c2: 5, x: 23, y: 17, fx: 1 }, { s: 'ball', c: 15, c2: 9, x: 16, y: 18 }, { s: 'crown', c: 13, c2: 9, x: 16, y: 7 }],
}))
export const blankEmblem = () => normEmblem({ bg: { style: 'SOLID', a: 0, b: 1 } })

// CHAOS: something ridiculous. A big centerpiece, a pile of stickers (some in mirrored pairs, some turned), now and then a sprinkle of mirrored paint
export function randomEmblem(rng = Math.random) {
  const R = (n) => Math.min(n - 1, Math.floor(rng() * n)), col = () => R(16), sid = () => STICKERS[R(STICKERS.length)].id
  const a = col(); let b = R(15); if (b >= a) b++
  const L = [{ s: sid(), c: col(), c2: col(), x: 14 + R(5), y: 14 + R(5), k: 2 + (rng() < 0.3 ? 1 : 0), r: rng() < 0.2 ? R(4) : 0, fx: R(2), fy: 0 }]
  const n = 3 + R(10)
  while (L.length < n) {
    const l = { s: sid(), c: col(), c2: col(), x: R(32), y: R(32), k: rng() < 0.25 ? 2 : 1, r: rng() < 0.3 ? R(4) : 0, fx: R(2), fy: rng() < 0.15 ? 1 : 0 }
    if (rng() < 0.4 && L.length + 2 <= MAX_LAYERS) { l.x = 2 + R(12); l.fx = 0; L.push(l, { ...l, fx: 1, x: twinX(l) }) } else L.push(l)
  }
  if (rng() < 0.2) L.reverse() // the centerpiece on top for once
  const paint = new Array(NN).fill(-1)
  if (rng() < 0.5) { const p1 = col(), p2 = col(), dots = 8 + R(60); for (let i = 0; i < dots; i++) { const x = R(16), y = R(32), c = rng() < 0.5 ? p1 : p2; paint[y * N + x] = c; paint[y * N + 31 - x] = c } }
  return normEmblem({ bg: { style: BG_STYLES[R(BG_STYLES.length)], a, b }, layers: L.slice(0, MAX_LAYERS), paint, mirror: MIRRORS[R(4)], under: rng() < 0.3 })
}

// ---- packing: version, flags, backdrop colors, layer count, 5 bytes a layer, then the paint as run lengths or bit-packed, whichever is shorter ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
function toB64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '') + (i + 2 < bytes.length ? B64[n & 63] : '')
  }
  return s
}
function fromB64(s) {
  const out = []; let acc = 0, bits = 0
  for (const ch of s) { const v = B64.indexOf(ch); if (v < 0) throw new Error('bad char'); acc = ((acc << 6) | v) & 0xffff; bits += 6; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255) } }
  return out
}
function paintRLE(vals) { // a byte per run: value (0 clear, 1-16 color + 1) in the low 5 bits, length 1-7 in the top 3, or 7 and a byte more for 8-263
  const out = []
  for (let i = 0; i < NN;) { const v = vals[i]; let j = i + 1; while (j < NN && vals[j] === v && j - i < 263) j++; const n = j - i; if (n <= 7) out.push(v | ((n - 1) << 5)); else out.push(v | (7 << 5), n - 8); i = j }
  return out
}
function paintBits(vals) { // a 17-bit mask of the values used, then each cell's index among them in just enough bits
  const used = [...new Set(vals)].sort((p, q) => p - q), mask = used.reduce((m, v) => m | (1 << v), 0), bits = Math.ceil(Math.log2(used.length)), idx = new Map(used.map((v, i) => [v, i]))
  const out = [mask & 255, (mask >> 8) & 255, (mask >> 16) & 255]; let acc = 0, n = 0
  for (const v of vals) { acc = (acc << bits) | idx.get(v); n += bits; while (n >= 8) { n -= 8; out.push((acc >> n) & 255) } acc &= (1 << n) - 1 }
  if (n) out.push((acc << (8 - n)) & 255)
  return out
}
export function encodeEmblem(v) {
  const e = normEmblem(v), bytes = [1, BG_STYLES.indexOf(e.bg.style) | (MIRRORS.indexOf(e.mirror) << 3) | ((e.under ? 1 : 0) << 5), (e.bg.a << 4) | e.bg.b, e.layers.length]
  for (const l of e.layers) bytes.push(BY_ID.get(l.s), (l.c << 4) | l.c2, l.x + 64, l.y + 64, (l.k - 1) | (l.r << 2) | (l.fx << 4) | (l.fy << 5))
  const vals = e.paint.map((p) => p + 1)
  if (vals.every((p) => p === 0)) bytes.push(0)
  else { const a = paintRLE(vals), b = paintBits(vals); bytes.push(...(a.length <= b.length ? [1, ...a] : [2, ...b])) }
  return toB64(bytes)
}
// never throws: garbage, an old version or a cut-off string gives the default emblem
export function decodeEmblem(s) {
  if (s && typeof s === 'object') return normEmblem(s)
  try {
    const B = fromB64(String(s ?? '').trim().replace(/=+$/, '')); let p = 0
    const rd = () => { if (p >= B.length) throw new Error('short'); return B[p++] }
    if (rd() !== 1) throw new Error('version')
    const f = rd(), ab = rd(), n = rd()
    if ((f & 7) >= BG_STYLES.length || n > MAX_LAYERS) throw new Error('flags')
    const layers = []
    for (let i = 0; i < n; i++) {
      const si = rd(), cc = rd(), x = rd() - 64, y = rd() - 64, t = rd()
      if (!STICKERS[si]) throw new Error('sticker')
      layers.push({ s: STICKERS[si].id, c: cc >> 4, c2: cc & 15, x, y, k: (t & 3) + 1, r: (t >> 2) & 3, fx: (t >> 4) & 1, fy: (t >> 5) & 1 })
    }
    const vals = new Array(NN).fill(0), mode = rd()
    if (mode === 1) { for (let i = 0; i < NN;) { const b = rd(), v = b & 31, lf = b >> 5, len = lf < 7 ? lf + 1 : rd() + 8; if (v > 16 || i + len > NN) throw new Error('run'); vals.fill(v, i, i + len); i += len } }
    else if (mode === 2) {
      const mask = rd() | (rd() << 8) | (rd() << 16), used = []; for (let v = 0; v <= 16; v++) if (mask & (1 << v)) used.push(v)
      if (!used.length || mask >> 17) throw new Error('mask')
      const bits = Math.ceil(Math.log2(used.length)); let acc = 0, have = 0
      for (let i = 0; i < NN; i++) { while (have < bits) { acc = ((acc << 8) | rd()) & 0xffff; have += 8 } have -= bits; const k = bits ? (acc >> have) & ((1 << bits) - 1) : 0; if (k >= used.length) throw new Error('index'); vals[i] = used[k] }
    } else if (mode !== 0) throw new Error('paint')
    return normEmblem({ bg: { style: BG_STYLES[f & 7], a: ab >> 4, b: ab & 15 }, layers, paint: vals.map((v) => v - 1), mirror: MIRRORS[(f >> 3) & 3], under: !!((f >> 5) & 1) })
  } catch { return normEmblem(DEFAULT_EMBLEM) }
}

// ---- drawing: the emblem as 1024 color indices, then runs of fillRect ----
function bgIndex(style, x, y) {
  if (style === 'SPLIT') return x + y > 31 ? 1 : 0
  if (style === 'STRIPES') return ((x + y) >> 2) & 1
  if (style === 'CHECKER') return ((x >> 2) ^ (y >> 2)) & 1
  if (style === 'BURST') return Math.floor(((Math.atan2(y - 15.5, x - 15.5) + Math.PI) / (2 * Math.PI)) * 12) & 1
  if (style === 'RINGS') return Math.floor(Math.hypot(x - 15.5, y - 15.5) / 3) & 1
  return 0
}
export function emblemPixels(v) {
  const e = toEmblem(v), px = new Int8Array(NN), ab = [e.bg.a, e.bg.b]
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) px[y * N + x] = ab[bgIndex(e.bg.style, x, y)]
  const paint = () => { for (let i = 0; i < NN; i++) if (e.paint[i] >= 0) px[i] = e.paint[i] }
  if (e.under) paint()
  for (const l of e.layers) {
    const B = layerBox(l), { s, k } = B
    for (let gy = 0; gy < s.h; gy++) for (let gx = 0; gx < s.w; gx++) {
      const t = s.g[gy * s.w + gx]; if (!t) continue
      const c = t === 1 ? l.c : l.c2
      for (let dy = 0; dy < k; dy++) { const Y = B.top + gy * k + dy; if (Y < 0 || Y >= N) continue; for (let dx = 0; dx < k; dx++) { const X = B.left + gx * k + dx; if (X >= 0 && X < N) px[Y * N + X] = c } }
    }
  }
  if (!e.under) paint()
  return px
}
// draws at px canvas pixels per emblem pixel from (ox, oy); crisp, a fillRect per run of one color in a row
export function drawEmblem(ctx, v, px = 1, ox = 0, oy = 0) {
  const P = emblemPixels(v)
  if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false
  for (let y = 0; y < N; y++) for (let x = 0; x < N;) {
    const c = P[y * N + x]; let e = x + 1; while (e < N && P[y * N + e] === c) e++
    ctx.fillStyle = EMBLEM_COLORS[c]; ctx.fillRect(ox + x * px, oy + y * px, (e - x) * px, px); x = e
  }
}
export function emblemDataURL(v, px = 4) {
  if (typeof document === 'undefined') return ''
  const c = document.createElement('canvas'); c.width = c.height = N * px
  const g = c.getContext('2d'); if (!g) return ''
  drawEmblem(g, v, px)
  return c.toDataURL('image/png')
}

// ---- gamer tags: letters (case kept), digits, _ - . and one clan tag up front in brackets, like [SFG]xX_SplashDaddy_Xx ----
// (the name part runs to 18 so xX_SplashDaddy_Xx, 17 long, survives whole; the clan tag is on top of that)
export const TAG_MIN = 3, TAG_MAX = 18, CLAN_MAX = 4
export function splitTag(s) {
  let t = String(s ?? '').trim(), clan = ''
  const m = /^\[([^\]]{0,16})\]/u.exec(t)
  if (m) { clan = m[1].replace(/[^A-Za-z0-9]/gu, '').slice(0, CLAN_MAX); t = t.slice(m[0].length) }
  return { clan, name: t.replace(/[^A-Za-z0-9_.-]/gu, '').slice(0, TAG_MAX) }
}
// the clean tag, or '' when the name part is under 3 characters
export function cleanTag(s) { const { clan, name } = splitTag(s); return name.length < TAG_MIN ? '' : (clan ? '[' + clan + ']' : '') + name }

// ---- the editor ----
export const EMBLEM_CSS = `
#cp .c25 .emb{display:grid;grid-template-columns:324px minmax(0,1fr);gap:16px;width:min(860px,100%);max-height:500px;box-sizing:border-box;color:var(--tx);font-family:var(--lf),monospace;font-size:var(--lsz,9px);line-height:1.25;letter-spacing:.02em;user-select:none;pointer-events:auto;text-align:left}
#cp .c25 .emb *{box-sizing:border-box}
#cp .c25 .emb .el,#cp .c25 .emb .er{display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0}
#cp .c25 .emb .cvw{width:324px;height:324px;border:2px solid var(--tx);box-shadow:3px 3px 0 var(--tx);background:var(--k);flex:none}
#cp .c25 .emb .cvw:focus-within{border-color:var(--acc);box-shadow:3px 3px 0 var(--acc)}
#cp .c25 .emb .cv{display:block;width:320px;height:320px;image-rendering:pixelated;cursor:grab;touch-action:none;outline:none}
#cp .c25 .emb[data-m="pnt"] .cv{cursor:crosshair}
#cp .c25 .emb .card{display:flex;align-items:center;gap:10px;height:44px;padding:4px 8px;border:1px solid var(--tx);background:var(--k);box-shadow:3px 3px 0 var(--acc);min-width:0;flex:none}
#cp .c25 .emb .card canvas{width:32px;height:32px;image-rendering:pixelated;flex:none}
#cp .c25 .emb .card b{font-family:var(--tf),monospace;font-weight:400;font-size:calc(22px * var(--ts,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:none;color:var(--tx)}
#cp .c25 .emb .card b.no{color:var(--dim)}
#cp .c25 .emb .tgr{display:flex;align-items:center;gap:8px}
#cp .c25 .emb .tin{flex:1;min-width:0;height:26px;font-family:var(--tf),monospace;font-size:calc(17px * var(--ts,1));background:var(--k);color:var(--tx);border:1px solid var(--tx);border-radius:0;padding:0 6px;text-transform:none;outline:none;user-select:text}
#cp .c25 .emb .tin:focus{border-color:var(--acc)}
#cp .c25 .emb .msg{min-height:12px;color:var(--acc)}
#cp .c25 .emb .lb{color:var(--dim);white-space:nowrap}
#cp .c25 .emb .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c25 .emb .row .gap{flex:1}
#cp .c25 .emb .bt{display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 7px;font-family:var(--lf),monospace;font-size:var(--lsz,9px);line-height:1;white-space:nowrap;box-shadow:0 3px 0 var(--e)}
#cp .c25 .emb .bt:hover{transform:translateY(-1px);box-shadow:0 4px 0 var(--e)}
#cp .c25 .emb .bt:active{transform:translateY(3px);box-shadow:0 0 0 var(--e)}
#cp .c25 .emb .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c25 .emb .bt.go{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .emb .bt.dim{opacity:.4}
#cp .c25 .emb .sv{margin-top:auto}
#cp .c25 .emb .sv .bt{height:28px;padding:0 18px}
#cp .c25 .emb .tabs{display:flex;gap:6px;flex:none}
#cp .c25 .emb .tabs .bt{flex:1;height:24px}
#cp .c25 .emb .tabs .bt.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .emb .pane{display:none;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto;overflow:hidden}
#cp .c25 .emb[data-m="stk"] .p-stk,#cp .c25 .emb[data-m="pnt"] .p-pnt,#cp .c25 .emb[data-m="bg"] .p-bg{display:flex}
#cp .c25 .emb .lys{display:flex;flex-direction:column;gap:2px;height:84px;flex:none;overflow-y:auto;overflow-x:hidden;border:1px solid var(--dim);padding:2px;scrollbar-width:thin}
#cp .c25 .emb .ly{display:flex;align-items:center;gap:8px;height:18px;flex:none;padding:0 4px;cursor:pointer;white-space:nowrap;overflow:hidden}
#cp .c25 .emb .ly:hover{background:color-mix(in srgb,var(--tx) 14%,transparent)}
#cp .c25 .emb .ly.on{background:var(--acc);color:var(--k)}
#cp .c25 .emb .ly canvas{width:16px;height:16px;image-rendering:pixelated;flex:none}
#cp .c25 .emb .ly i{font-style:normal;color:var(--dim)}
#cp .c25 .emb .ly.on i{color:var(--k)}
#cp .c25 .emb .none{color:var(--dim);padding:4px}
#cp .c25 .emb .stg{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px;max-height:113px;flex:none;overflow-y:auto;overflow-x:hidden;padding:1px 4px 4px 1px;scrollbar-width:thin}
#cp .c25 .emb .stk{height:34px;border:1px solid var(--dim);background:var(--k);display:flex;align-items:center;justify-content:center;cursor:pointer}
#cp .c25 .emb .stk:hover{border-color:var(--tx)}
#cp .c25 .emb .stk.on{border-color:var(--acc);box-shadow:2px 2px 0 var(--acc)}
#cp .c25 .emb .stk canvas{width:32px;height:32px;image-rendering:pixelated}
#cp .c25 .emb .swr{display:flex;align-items:center;gap:8px;flex:none}
#cp .c25 .emb .swr .lb{width:84px;flex:none;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .emb .sws{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:3px;flex:1;min-width:0}
#cp .c25 .emb .sw{height:18px;border:1px solid var(--dim);cursor:pointer}
#cp .c25 .emb .sw:hover{border-color:var(--tx)}
#cp .c25 .emb .sw.on{border:2px solid var(--tx);box-shadow:2px 2px 0 var(--acc)}
#cp .c25 .emb .xf{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;flex:none}
#cp .c25 .emb .stp{display:flex;align-items:center;gap:4px}
#cp .c25 .emb .stp .bt{width:20px;padding:0}
#cp .c25 .emb .stp b{display:inline-block;min-width:30px;text-align:center;font-weight:400;color:var(--tx)}
#cp .c25 .emb .hint{color:var(--dim);line-height:1.5}
#cp .c25 .emb .bgs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;flex:none}
#cp .c25 .emb .bgt{display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px 2px;border:1px solid var(--dim);background:var(--k);cursor:pointer;overflow:hidden}
#cp .c25 .emb .bgt:hover{border-color:var(--tx)}
#cp .c25 .emb .bgt.on{border-color:var(--acc);box-shadow:2px 2px 0 var(--acc);color:var(--acc)}
#cp .c25 .emb .bgt canvas{width:32px;height:32px;image-rendering:pixelated}
#cp .c25 .emb .acts{margin-top:auto;flex:none}
@media (max-width:900px){
#cp .c25 .emb{grid-template-columns:minmax(0,1fr);max-height:none;width:100%}
#cp .c25 .emb .cvw{width:min(324px,100%);height:auto;aspect-ratio:1/1;align-self:center}
#cp .c25 .emb .cv{width:100%;height:100%}
#cp .c25 .emb .sv{order:9}
}
`

// host: the element to build into; o: { value (encoded or object), tag, onSave(encoded, tag), onCancel(), sound: { play(name) } }. Returns { destroy, value, tag }.
export function emblemEditor(host, o = {}) {
  const doc = host?.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
  if (!doc) throw new Error('emblemEditor needs a DOM')
  const el = (tag, cls, txt) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n }
  const snd = (n) => { try { o.sound?.play?.(n) } catch { /* sound is a nicety */ } }
  const bt = (txt, fn, cls = '') => { const b = el('span', 'bt' + (cls ? ' ' + cls : ''), txt); b.tabIndex = 0; b.setAttribute('role', 'button'); b.addEventListener('click', (e) => { e.preventDefault(); fn(e) }); return b }
  const accent = () => { try { return getComputedStyle(root).getPropertyValue('--acc').trim() || '#ff7a00' } catch { return '#ff7a00' } }

  let E = toEmblem(o.value), sel = E.layers.length - 1, mode = 'stk', tool = 'brush', size = 1, pc = 2, pick = E.layers[sel]?.s ?? STICKERS[0].id, drag = null, lastNudge = -1e9
  const undo = [], redo = []
  const push = () => { undo.push(encodeEmblem(E)); if (undo.length > 60) undo.shift(); redo.length = 0 }
  const fixSel = () => { if (sel >= E.layers.length) sel = E.layers.length - 1; if (sel < 0 && E.layers.length) sel = E.layers.length - 1 }
  const change = (fn, s = 'pick') => { push(); fn(); fixSel(); snd(s); sync() }
  const say = (t) => { msg.textContent = t; if (t) snd('thud') }
  const cur = () => E.layers[sel]
  const setLayer = (patch) => { if (!cur()) return say('NO LAYER PICKED. PICK A STICKER'); change(() => { E.layers[sel] = normLayer({ ...E.layers[sel], ...patch }) }) }

  // ---- left: canvas, the calling card, the tag, save ----
  const root = el('div', 'emb'); root.dataset.m = mode
  const left = el('div', 'el'), cvw = el('div', 'cvw'), cv = el('canvas', 'cv')
  const PX = 10 * Math.min(3, Math.max(1, Math.round(doc.defaultView?.devicePixelRatio || 1)))
  cv.width = cv.height = N * PX; cv.tabIndex = 0; cv.setAttribute('aria-label', 'EMBLEM. DRAG TO MOVE OR PAINT, ARROWS NUDGE THE LAYER')
  const ctx = cv.getContext('2d'); cvw.append(cv)
  const card = el('div', 'card'), mini = el('canvas'), tgv = el('b'); mini.width = mini.height = N; card.append(mini, tgv)
  const mctx = mini.getContext('2d')
  const tgr = el('label', 'tgr'), tin = el('input', 'tin')
  Object.assign(tin, { type: 'text', maxLength: 28, spellcheck: false, autocomplete: 'off', placeholder: 'xX_YourName_Xx', value: String(o.tag ?? '') })
  tgr.append(el('span', 'lb', 'GAMER TAG'), tin)
  const msg = el('div', 'msg'), sv = el('div', 'row sv')
  sv.append(bt('SAVE', save, 'go'), bt('CANCEL', cancel))
  left.append(cvw, card, tgr, msg, sv)

  // ---- right: tabs, the three panes, the actions ----
  const right = el('div', 'er'), tabs = el('div', 'tabs'), tabB = {}
  for (const [m, t] of [['stk', 'STICKERS'], ['pnt', 'PAINT'], ['bg', 'BACKDROP']]) { tabB[m] = bt(t, () => { mode = m; root.dataset.m = m; snd('pick'); sync() }); tabs.append(tabB[m]) }
  const swatches = (label, fn) => {
    const row = el('div', 'swr'), sws = el('div', 'sws'), cells = EMBLEM_COLORS.map((c, i) => { const s = el('span', 'sw'); s.style.background = c; s.title = COLOR_NAMES[i]; s.addEventListener('click', () => fn(i)); sws.append(s); return s })
    row.append(el('span', 'lb', label), sws)
    return { row, set: (i) => cells.forEach((s, j) => s.classList.toggle('on', j === i)) }
  }
  const stepper = (label, dec, inc) => { const w = el('span', 'stp'), b = el('b'); w.append(el('span', 'lb', label), bt('-', dec), b, bt('+', inc)); return { w, b } }
  const choice = (label, items, fn) => { const row = el('div', 'row'), bs = items.map(([v, t]) => { const b = bt(t, () => fn(v)); b.dataset.v = v; return b }); row.append(el('span', 'lb', label), ...bs); return { row, set: (v) => bs.forEach((b) => b.classList.toggle('on', b.dataset.v === String(v))) } }
  const shapeCanvas = (s, c, c2, box) => {
    const cvs = el('canvas'); cvs.width = cvs.height = box; const g = cvs.getContext('2d'); if (!g) return cvs
    const f = Math.max(1, Math.floor(box / Math.max(s.w, s.h))), ox = (box - s.w * f) >> 1, oy = (box - s.h * f) >> 1
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const t = s.g[y * s.w + x]; if (t) { g.fillStyle = EMBLEM_COLORS[t === 1 ? c : c2]; g.fillRect(ox + x * f, oy + y * f, f, f) } }
    return cvs
  }

  // stickers pane
  const pS = el('div', 'pane p-stk'), lyHead = el('div', 'row'), lyN = el('span', 'lb'), gap = el('span', 'gap')
  lyHead.append(lyN, gap, bt('ADD', addLayer), bt('UP', () => moveLayer(1)), bt('DOWN', () => moveLayer(-1)), bt('DUP', dupLayer), bt('TWIN', twinLayer), bt('DEL', delLayer))
  lyHead.lastChild.title = 'DELETE THE LAYER'; lyHead.children[6].title = 'A FLIPPED COPY ON THE OTHER SIDE, FOR WING PAIRS'
  const lys = el('div', 'lys'), stg = el('div', 'stg')
  const tiles = STICKERS.map((s) => { const t = el('span', 'stk'); t.title = s.name; t.dataset.s = s.id; t.append(shapeCanvas(shape(s.id), 1, 2, 32)); t.addEventListener('click', () => pickSticker(s.id)); stg.append(t); return t })
  const sw1 = swatches('COLOR 1', (i) => setLayer({ c: i })), sw2 = swatches('COLOR 2', (i) => setLayer({ c2: i }))
  const xf = el('div', 'xf'), nud = (dx, dy) => () => { const l = cur(); if (l) setLayer({ x: l.x + dx, y: l.y + dy }) }
  const sX = stepper('X', nud(-1, 0), nud(1, 0)), sY = stepper('Y', nud(0, -1), nud(0, 1))
  const sK = stepper('SIZE', () => cur() && setLayer({ k: cur().k - 1 }), () => cur() && setLayer({ k: cur().k + 1 })), sR = stepper('TURN', () => cur() && setLayer({ r: cur().r + 3 }), () => cur() && setLayer({ r: cur().r + 1 }))
  const bFx = bt('FLIP H', () => cur() && setLayer({ fx: cur().fx ? 0 : 1 })), bFy = bt('FLIP V', () => cur() && setLayer({ fy: cur().fy ? 0 : 1 }))
  xf.append(sX.w, sY.w, sK.w, sR.w, bFx, bFy)
  pS.append(lyHead, lys, el('span', 'lb', 'STICKERS (CLICK = SWAP, ADD = NEW LAYER)'), stg, sw1.row, sw2.row, xf)

  // paint pane
  const pP = el('div', 'pane p-pnt')
  const cT = choice('TOOL', [['brush', 'BRUSH'], ['erase', 'ERASE'], ['fill', 'FILL']], (v) => { tool = v; snd('pick'); sync() })
  const cZ = choice('BRUSH', [[1, '1'], [2, '2'], [3, '3']], (v) => { size = Number(v); snd('pick'); sync() })
  const cM = choice('MIRROR', [['NONE', 'NONE'], ['LR', 'LEFT-RIGHT'], ['UD', 'UP-DOWN'], ['BOTH', 'BOTH']], (v) => change(() => { E.mirror = v }))
  const pRow = el('div', 'row'), bUnder = bt('PAINT UNDER', () => change(() => { E.under = !E.under })); pRow.append(bUnder, bt('CLEAR PAINT', () => change(() => { E.paint.fill(-1) }, 'thud')))
  const swP = swatches('PAINT', (i) => { pc = i; if (tool === 'erase') tool = 'brush'; snd('pick'); sync() })
  pP.append(cT.row, cZ.row, cM.row, pRow, swP.row, el('div', 'hint', 'DRAG ON THE EMBLEM TO PAINT. FILL TAKES THE WHOLE PATCH OF ONE COLOR YOU CLICK. PAINT SITS OVER THE STICKERS UNLESS PAINT UNDER IS ON.'))

  // backdrop pane
  const pB = el('div', 'pane p-bg'), bgs = el('div', 'bgs')
  const bgTiles = BG_STYLES.map((st) => { const t = el('span', 'bgt'), c = el('canvas'); c.width = c.height = N; t.append(c, el('span', '', st)); t.addEventListener('click', () => change(() => { E.bg.style = st })); bgs.append(t); return { t, c, st } })
  const swA = swatches('COLOR A', (i) => change(() => { E.bg.a = i })), swB = swatches('COLOR B', (i) => change(() => { E.bg.b = i }))
  const bRow = el('div', 'row'); bRow.append(bt('SWAP', () => change(() => { const a = E.bg.a; E.bg.a = E.bg.b; E.bg.b = a })))
  pB.append(el('span', 'lb', 'STYLE'), bgs, swA.row, swB.row, bRow)

  const acts = el('div', 'row acts'), bU = bt('UNDO', doUndo), bRd = bt('REDO', doRedo)
  acts.append(bU, bRd, el('span', 'gap'), bt('CHAOS', () => change(() => { E = randomEmblem(); sel = E.layers.length - 1 }, 'thud'), 'go'), bt('CLEAR', () => change(() => { E = blankEmblem(); sel = -1 }, 'thud')))
  acts.lastChild.title = 'START FROM NOTHING (UNDO BRINGS IT BACK)'; acts.children[3].title = 'A RIDICULOUS RANDOM EMBLEM'
  right.append(tabs, pS, pP, pB, acts)
  root.append(left, right)
  host.append(root)

  // ---- layer actions ----
  function pickSticker(id) {
    pick = id
    if (cur()) setLayer({ s: id })
    else addLayer()
  }
  function addLayer() {
    if (E.layers.length >= MAX_LAYERS) return say('SIXTEEN LAYERS IS THE LIMIT')
    const l = cur()
    change(() => { E.layers.push(normLayer({ s: pick, c: l?.c ?? 1, c2: l?.c2 ?? 2, x: 16, y: 16, k: 1 })); sel = E.layers.length - 1 })
  }
  function moveLayer(d) { const j = sel + d; if (!cur() || j < 0 || j >= E.layers.length) return snd('back'); change(() => { [E.layers[sel], E.layers[j]] = [E.layers[j], E.layers[sel]]; sel = j }, 'move') }
  function dupLayer() { if (!cur()) return say('NO LAYER PICKED'); if (E.layers.length >= MAX_LAYERS) return say('SIXTEEN LAYERS IS THE LIMIT'); change(() => { const l = cur(); E.layers.splice(sel + 1, 0, normLayer({ ...l, x: l.x + 2, y: l.y + 2 })); sel++ }) }
  function twinLayer() { if (!cur()) return say('NO LAYER PICKED'); if (E.layers.length >= MAX_LAYERS) return say('SIXTEEN LAYERS IS THE LIMIT'); change(() => { const l = cur(); E.layers.splice(sel + 1, 0, normLayer({ ...l, fx: l.fx ? 0 : 1, x: twinX(l) })); sel++ }) }
  function delLayer() { if (!cur()) return snd('back'); change(() => { E.layers.splice(sel, 1); sel = Math.min(sel, E.layers.length - 1) }, 'back') }
  function doUndo() { if (!undo.length) return snd('back'); redo.push(encodeEmblem(E)); E = decodeEmblem(undo.pop()); fixSel(); snd('back'); sync() }
  function doRedo() { if (!redo.length) return snd('back'); undo.push(encodeEmblem(E)); E = decodeEmblem(redo.pop()); fixSel(); snd('pick'); sync() }

  // ---- drawing the editor ----
  function draw() {
    if (ctx) {
      drawEmblem(ctx, E, PX)
      if (mode === 'pnt') {
        ctx.fillStyle = 'rgba(232,225,201,.16)'
        for (let i = 1; i < N; i++) { const w = i % 8 ? 1 : 2; ctx.fillRect(i * PX, 0, w, N * PX); ctx.fillRect(0, i * PX, N * PX, w) }
        ctx.fillStyle = accent()
        if (E.mirror === 'LR' || E.mirror === 'BOTH') ctx.fillRect(16 * PX - 1, 0, 3, N * PX)
        if (E.mirror === 'UD' || E.mirror === 'BOTH') ctx.fillRect(0, 16 * PX - 1, N * PX, 3)
      } else if (cur()) {
        const B = layerBox(cur()), lw = Math.max(2, PX / 5)
        ctx.strokeStyle = accent(); ctx.lineWidth = lw; ctx.setLineDash?.([PX / 2, PX / 2])
        ctx.strokeRect(B.left * PX + lw / 2, B.top * PX + lw / 2, B.w * PX - lw, B.h * PX - lw); ctx.setLineDash?.([])
      }
    }
    if (mctx) drawEmblem(mctx, E, 1)
    const { clan, name } = splitTag(tin.value)
    tgv.textContent = (clan ? '[' + clan + ']' : '') + name || 'NO TAG YET'
    tgv.classList.toggle('no', name.length < TAG_MIN)
  }
  function sync() {
    for (const m in tabB) tabB[m].classList.toggle('on', m === mode)
    const L = cur()
    lyN.textContent = 'LAYERS ' + E.layers.length + '/' + MAX_LAYERS
    const rows = E.layers.map((l, i) => {
      const r = el('div', 'ly' + (i === sel ? ' on' : '')), st = STICKERS[BY_ID.get(l.s)]
      r.append(shapeCanvas(shape(l.s, l.r, l.fx, l.fy), l.c, l.c2, 16), el('span', '', String(i + 1).padStart(2, '0') + ' ' + st.name), el('i', '', 'SIZE ' + l.k + (l.r ? ' TURN ' + l.r * 90 : '') + (l.fx ? ' FLIP H' : '') + (l.fy ? ' FLIP V' : '')))
      r.addEventListener('click', () => { sel = i; pick = l.s; snd('pick'); sync() })
      return r
    }).reverse() // the top layer first
    lys.replaceChildren(...(rows.length ? rows : [el('div', 'none', 'NO LAYERS. PICK A STICKER BELOW.')]))
    lys.querySelector('.ly.on')?.scrollIntoView?.({ block: 'nearest' })
    tiles.forEach((t) => t.classList.toggle('on', t.dataset.s === (L ? L.s : pick)))
    sw1.set(L ? L.c : -1); sw2.set(L ? L.c2 : -1)
    sX.b.textContent = L ? L.x : '-'; sY.b.textContent = L ? L.y : '-'; sK.b.textContent = L ? L.k : '-'; sR.b.textContent = L ? L.r * 90 : '-'
    bFx.classList.toggle('on', !!L?.fx); bFy.classList.toggle('on', !!L?.fy)
    cT.set(tool); cZ.set(size); cM.set(E.mirror); bUnder.classList.toggle('on', E.under); swP.set(tool === 'erase' ? -1 : pc)
    for (const b of bgTiles) { b.t.classList.toggle('on', b.st === E.bg.style); const g = b.c.getContext('2d'); if (g) drawEmblem(g, { bg: { ...E.bg, style: b.st } }, 1) }
    swA.set(E.bg.a); swB.set(E.bg.b)
    bU.classList.toggle('dim', !undo.length); bRd.classList.toggle('dim', !redo.length)
    draw()
  }

  // ---- the canvas: drag moves the layer (and a click picks the top layer under it), or paints ----
  const cellOf = (e) => { const r = cv.getBoundingClientRect(); return { x: Math.floor(((e.clientX - r.left) / (r.width || 1)) * N), y: Math.floor(((e.clientY - r.top) / (r.height || 1)) * N) } }
  const layerAt = (p) => {
    for (let i = E.layers.length - 1; i >= 0; i--) {
      const B = layerBox(E.layers[i]), gx = Math.floor((p.x - B.left) / B.k), gy = Math.floor((p.y - B.top) / B.k)
      if (p.x >= B.left && p.y >= B.top && gx < B.s.w && gy < B.s.h && B.s.g[gy * B.s.w + gx]) return i
    }
    return -1
  }
  const mirrored = (x, y) => { const m = E.mirror, out = [[x, y]]; if (m === 'LR' || m === 'BOTH') out.push([31 - x, y]); if (m === 'UD' || m === 'BOTH') out.push([x, 31 - y]); if (m === 'BOTH') out.push([31 - x, 31 - y]); return out }
  const dab = (x, y) => {
    const v = tool === 'erase' ? -1 : pc, o0 = -Math.floor((size - 1) / 2)
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) for (const [X, Y] of mirrored(x + o0 + dx, y + o0 + dy)) {
      if (X < 0 || Y < 0 || X >= N || Y >= N) continue
      if (E.paint[Y * N + X] !== v) { E.paint[Y * N + X] = v; drag.changed = true }
    }
  }
  const line = (a, b) => { let x = a.x, y = a.y; const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1; let err = dx + dy; for (let n = 0; n < 200; n++) { dab(x, y); if (x === b.x && y === b.y) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx } if (e2 <= dx) { err += dx; y += sy } } }
  const fill = (p) => {
    const P = emblemPixels(E)
    for (const [sx, sy] of mirrored(p.x, p.y)) {
      if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue
      const want = P[sy * N + sx], seen = new Uint8Array(NN), st = [sy * N + sx]
      while (st.length) { const i = st.pop(); if (seen[i] || P[i] !== want) continue; seen[i] = 1; if (E.paint[i] !== pc) { E.paint[i] = pc; drag.changed = true } const x = i % N; if (x > 0) st.push(i - 1); if (x < N - 1) st.push(i + 1); if (i >= N) st.push(i - N); if (i < NN - N) st.push(i + N) }
    }
  }
  const endDrag = () => {
    if (!drag) return
    if (drag.changed) { undo.push(drag.snap); if (undo.length > 60) undo.shift(); redo.length = 0; snd(drag.paint ? 'pick' : 'move') }
    drag = null; sync()
  }
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId) } catch { /* old browsers */ }
    const p = cellOf(e); msg.textContent = ''
    if (mode === 'pnt') {
      drag = { paint: true, snap: encodeEmblem(E), last: p, changed: false }
      if (tool === 'fill') { fill(p); endDrag() } else { line(p, p); draw() }
      return
    }
    const hit = layerAt(p)
    if (hit >= 0 && hit !== sel) { sel = hit; pick = E.layers[sel].s; snd('pick'); sync() }
    const l = cur(); if (!l) return
    drag = { snap: encodeEmblem(E), start: p, x0: l.x, y0: l.y, changed: false }
  })
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return
    const p = cellOf(e)
    if (drag.paint) { if (p.x !== drag.last.x || p.y !== drag.last.y) { line(drag.last, p); drag.last = p; draw() } return }
    const l = cur(); if (!l) return
    const x = clampI(drag.x0 + p.x - drag.start.x, -32, 63, l.x), y = clampI(drag.y0 + p.y - drag.start.y, -32, 63, l.y)
    if (x !== l.x || y !== l.y) { l.x = x; l.y = y; drag.changed = true; draw() }
  })
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag); cv.addEventListener('lostpointercapture', endDrag)

  // ---- keys: nothing leaves the editor (the cockpit has single-key shortcuts); Escape cancels, Ctrl+Z undoes, arrows nudge on the canvas ----
  const stop = (e) => e.stopPropagation()
  root.addEventListener('keydown', (e) => {
    e.stopPropagation()
    const inInput = e.target === tin, k = e.key
    if (k === 'Escape') { e.preventDefault(); return cancel() }
    if ((e.ctrlKey || e.metaKey) && !inInput && (k === 'z' || k === 'Z' || k === 'y' || k === 'Y')) { e.preventDefault(); return k.toLowerCase() === 'y' || e.shiftKey ? doRedo() : doUndo() }
    if (inInput) { if (k === 'Enter') { e.preventDefault(); save() } return }
    if ((k === 'Enter' || k === ' ') && e.target?.getAttribute?.('role') === 'button') { e.preventDefault(); e.target.click(); return }
    if (e.target !== cv || mode === 'pnt' || !cur()) return
    const step = e.shiftKey ? 4 : 1, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k]
    if (d) {
      e.preventDefault()
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now(), l = cur()
      if (now - lastNudge > 700) push() // a run of nudges is one undo step
      lastNudge = now
      E.layers[sel] = normLayer({ ...l, x: l.x + d[0], y: l.y + d[1] }); snd('move'); sync()
    } else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); delLayer() }
  })
  root.addEventListener('keyup', stop); root.addEventListener('keypress', stop)
  tin.addEventListener('input', () => { msg.textContent = ''; draw() })
  tin.addEventListener('blur', () => { const t = cleanTag(tin.value); if (t) tin.value = t; draw() })

  function save() {
    const t = cleanTag(tin.value)
    if (!t) { say('THE TAG NEEDS ' + TAG_MIN + ' TO ' + TAG_MAX + ' LETTERS, DIGITS, _ - OR .'); tin.focus(); return }
    tin.value = t; snd('pick')
    o.onSave?.(encodeEmblem(E), t)
  }
  function cancel() { snd('back'); o.onCancel?.() }

  sync()
  try { cv.focus({ preventScroll: true }) } catch { /* not attached yet */ }
  return {
    destroy() { drag = null; root.remove() },
    value: () => encodeEmblem(E),
    tag: () => cleanTag(tin.value),
  }
}
