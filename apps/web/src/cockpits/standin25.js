// Stand-in batter pictures for players without a photo (28 Oct, Andrew: the poster filter over a generic face "looks absolutely awful"). Five flat pixel-art options,
// drawn in device pixels on a whole-pixel grid with smoothing off, in the panel's ink, accent, dim and ground plus one skin tone. Figures are posed as joints in a
// 34 by 46 unit box (facing left, toward the pitcher; ground at y 45) and rasterized cell by cell, so one pose serves a sprite, a silhouette and a bulb portrait.
//   1 slugger: a pixel batter in his stance   2 jersey: the back of a framed jersey   3 card: a baseball card with a silhouette in the photo
//   4 shadow: a silhouette mid-swing with his long shadow on the dirt   5 bulbs: a scoreboard bulb portrait with the name in bulbs underneath
// 29 Oct (Andrew locked D1, "but you gotta get the skin color, team jersey, height, and handedness right"): the slugger wears his team's kit (home whites or road greys, the
// helmet and trim in team colors), stands as tall as he is against a lineup height chart, takes a skin tone when one is known, bats from his side; and a few players
// get a mascot instead (MASCOTS: the panda for Pablo Sandoval, the giraffe for Brandon Belt).
export const STANDIN_STYLES = [
  { c: 1, name: 'PIXEL SLUGGER', desc: 'a hand-made pixel batter in his stance, number on the chest' },
  { c: 2, name: 'JERSEY BACK', desc: 'the back of his jersey, framed, name across the shoulders' },
  { c: 3, name: 'BASEBALL CARD', desc: 'a pixel card with his silhouette, a name banner and a team pennant' },
  { c: 4, name: 'SHADOW AT THE PLATE', desc: 'a silhouette mid-swing under the lights, long shadow on the dirt' },
  { c: 5, name: 'SCOREBOARD BULBS', desc: 'an old scoreboard bulb portrait with his name in lights' },
]
const SKIN = '#b07650'
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const W1 = 1, O2 = 2, D3 = 3, K4 = 4, S5 = 5 // cell colors: ink, accent, dim, ground, skin
const H6 = 6, SH7 = 7, B8 = 8, G9 = 9, F10 = 10, F11 = 11, SP12 = 12, CH13 = 13, MK14 = 14 // the helmet, its shine, the bat, batting gloves; fur dark and light, spots; the height chart and his mark on it
// team kits: helmet and trim (lettering, socks, gloves); home teams wear white (the Giants their cream), visitors grey
const KITS = { SF: ['#1b1b1b', '#fd5a1e'], LAD: ['#005a9c', '#005a9c'], SD: ['#2f241d', '#ffc425'], AZ: ['#a71930', '#a71930'], ARI: ['#a71930', '#a71930'], COL: ['#33006f', '#33006f'],
  NYY: ['#0c2340', '#0c2340'], NYM: ['#002d72', '#ff5910'], PHI: ['#e81828', '#e81828'], ATL: ['#13274f', '#ce1141'], MIA: ['#1b1b1b', '#00a3e0'], WSH: ['#ab0003', '#ab0003'],
  CHC: ['#0e3386', '#0e3386'], STL: ['#c41e3a', '#c41e3a'], MIL: ['#12284b', '#ffc52f'], CIN: ['#c6011f', '#c6011f'], PIT: ['#1b1b1b', '#fdb827'], HOU: ['#002d62', '#eb6e1f'],
  TEX: ['#003278', '#c0111f'], SEA: ['#0c2c56', '#005c5c'], LAA: ['#ba0021', '#ba0021'], ATH: ['#003831', '#efb21e'], OAK: ['#003831', '#efb21e'], TOR: ['#134a8e', '#134a8e'],
  BAL: ['#1b1b1b', '#df4601'], BOS: ['#0c2340', '#bd3039'], TB: ['#092c5c', '#8fbce6'], KC: ['#004687', '#004687'], MIN: ['#002b5c', '#d31145'], CLE: ['#0c2340', '#e31937'],
  DET: ['#0c2340', '#fa4616'], CWS: ['#1b1b1b', '#27251f'] }
export function kitFor(team, home) {
  const [helmet, trim] = KITS[team] ?? KITS.SF
  return { helmet, trim, jersey: home ? (team === 'SF' || !KITS[team] ? '#f1e6cf' : '#f2f0ea') : '#a3a6ab' }
}
// players who get an animal at the plate in place of the slugger (Andrew's two, 29 Oct; the rest wait for his yes): id, kind, number
export const MASCOTS = { 467055: { kind: 'panda', name: 'PABLO SANDOVAL', num: '48', h: 70, why: 'KUNG FU PANDA' }, 474832: { kind: 'giraffe', name: 'BRANDON BELT', num: '9', h: 75, why: 'BABY GIRAFFE' } }
const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const lum = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }

// 5 by 7 font, a row per base-32 character (bit 16 is the left column)
const B32 = '0123456789abcdefghijklmnopqrstuv'
const F57 = {
  0: 'ehjlphe', 1: '4c4444e', 2: 'eh1248v', 3: 'v2421he', 4: '26aiv22', 5: 'vgu11he', 6: '68guhhe', 7: 'v124888', 8: 'ehhehhe', 9: 'ehhf12c',
  A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'uhhhhhu', E: 'vgguggv', F: 'vgguggg', G: 'ehgnhhf', H: 'hhhvhhh', I: 'e44444e', J: '72222ic', K: 'hikokih',
  L: 'ggggggv', M: 'hrllhhh', N: 'hhpljhh', O: 'ehhhhhe', P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih', S: 'fgge11u', T: 'v444444', U: 'hhhhhhe', V: 'hhhhha4',
  W: 'hhhllla', X: 'hha4ahh', Y: 'hhha444', Z: 'v1248gv', '-': '000v000', '.': '00000cc', "'": 'c480000', ',': '0000c48', '/': '11248gg', '#': 'aavavaa', '?': 'eh12404', ' ': '0000000',
}
// lit cells of a string in the 5x7 font, cb(x, y); bold thickens each stroke one cell right; returns the width in cells
function text57(t, bold, cb) {
  let x = 0
  for (const ch of t) { const r = F57[ch] ?? F57['?']; for (let y = 0; y < 7; y++) { const v = B32.indexOf(r[y]); for (let i = 0; i < 5; i++) if (v & (16 >> i)) { cb(x + i, y); if (bold) cb(x + i + 1, y) } } x += bold ? 7 : 6 }
  return Math.max(0, x - 1)
}
// 3 by 5 digits for the chest number, a row per octal digit
const F35 = ['75557', '26227', '71747', '71317', '55711', '74717', '74757', '71222', '75757', '75717']

// names: plain caps without accents; candidates from the full name down to the surname ("LUIS ROBERT JR." keeps the JR.)
const clean = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
function nameCands(name) {
  const full = clean(name), p = full.split(' ')
  if (p.length < 2) return [full]
  const sfx = /^(JR\.?|SR\.?|II|III|IV)$/.test(p[p.length - 1]), last = sfx && p.length > 2 ? p.slice(-2).join(' ') : p[p.length - 1]
  return [...new Set([full, p[0][0] + '. ' + p.slice(1).join(' '), last, sfx ? p[p.length - 2] : last])]
}
// the first candidate that fits maxW: PS2P at multiples of 8 device px (its pixels land on whole device pixels) down to about 7 css px, then VT down to 11 css px,
// then the last candidate cut short. Returns {t, font, px, w, a} with a the cap height above the baseline
function fitText(g, cands, maxW, maxPx, d, minVt = 11) {
  const tries = []
  for (const t of cands) for (let px = Math.max(8, Math.floor(maxPx / 8) * 8); px >= Math.max(8, 7 * d - 1); px -= 8) tries.push([t, 'PS2P', px])
  for (const t of cands) for (let px = Math.round(maxPx * 1.5); px >= Math.round(minVt * d); px -= Math.max(1, Math.round(d))) tries.push([t, 'VT', px])
  const mk = (t, f, px) => { g.font = `${px}px ${f}, monospace`; return { t, font: g.font, px, w: g.measureText(t).width, a: Math.round(g.measureText('H').actualBoundingBoxAscent || px * 0.7) } }
  for (const [t, f, px] of tries) { const r = mk(t, f, px); if (r.w <= maxW) return r }
  let t = cands[cands.length - 1], px = Math.round(minVt * d)
  while (t.length > 1 && mk(t + '.', 'VT', px).w > maxW) t = t.slice(0, -1)
  return t.length > 1 ? mk(t + '.', 'VT', px) : null
}
// text at whole pixels; x is the left edge, or the center when al is 'c'
function say(g, F, x, yb, col, al) { if (!F) return; g.font = F.font; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(F.t, Math.round(al === 'c' ? x - F.w / 2 : al === 'r' ? x - F.w : x), Math.round(yb)) }

// shapes in pose units, each a test (x, y, e) with e the extra radius of an outline pass
const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? clamp01(((x - a[0]) * dx + (y - a[1]) * dy) / L) : 0; return [Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t), t] }
const cap = (a, b, r0, r1 = r0) => (x, y, e) => { const [q, t] = segD(x, y, a, b); return q <= r0 + (r1 - r0) * t + e }
const disc = (c, r) => (x, y, e) => Math.hypot(x - c[0], y - c[1]) <= r + e
const poly = (pts, r = 0) => (x, y, e) => {
  let ins = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins }
  if (ins) return true
  for (let i = 0; i < pts.length; i++) if (segD(x, y, pts[i], pts[(i + 1) % pts.length])[0] <= r + e) return true
  return false
}
// parts {s, c, ol, on, clip} back to front into a cw by ch grid; cell (i, j) samples the pose at (ox + (i + .5) / f, oy + (j + .5) / f); ol adds a ground-colored
// outline where the part crosses what is already drawn; on parts paint only over what is there; flip mirrors left-right (lefties)
function raster(parts, f, cw, ch, ox, oy, flip) {
  const G = new Uint8Array(cw * ch)
  for (const p of parts) for (const [col, e] of p.ol ? [[K4, 1 / f], [p.c, 0]] : [[p.c, 0]]) for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const q = j * cw + (flip ? cw - 1 - i : i)
    if ((p.on || e) && !G[q]) continue
    const x = ox + (i + 0.5) / f, y = oy + (j + 0.5) / f
    if ((!p.clip || p.clip(x, y)) && p.s(x, y, e)) G[q] = col
  }
  return G
}
// poses: hd head, sf/sb shoulders (front, back), hf/hb hips, kf/kb knees, ff/fb feet, ef/eb elbows, hn hands, bt bat tip; back: bat behind the body
const STANCE = { hd: [15, 12], sf: [12.5, 18], sb: [20, 18], hf: [13.5, 28], hb: [19.5, 28], kf: [10, 35], ff: [8.5, 43], kb: [22.5, 35], fb: [23, 43], ef: [16, 20.5], eb: [25.5, 17], hn: [21.5, 13.5], bt: [27, 1.5], back: true }
const SWING = { hd: [26.5, 13.5], sf: [24, 19], sb: [30, 18.5], hf: [25, 28.5], hb: [30.5, 28], kf: [21.5, 35.5], ff: [19, 43], kb: [32.5, 36], fb: [36, 42.5], ef: [20, 22], eb: [24, 25], hn: [16.5, 23.5], bt: [1.5, 19.5], back: false, look: 1.2 }
function batterParts(P, kind = 'human') {
  const [hx, hy] = P.hd, look = P.look ?? 0, an = kind !== 'human', armC = kind === 'panda' ? F10 : kind === 'giraffe' ? F11 : S5
  const leg = (h, k, f) => [{ s: cap(h, k, 2.5, 2.1), c: W1 }, { s: cap(k, f, 2.1, 1.6), c: W1 }, { s: cap(lerp(k, f, 0.5), f, 1.85, 1.6), c: O2, on: 1 }, { s: cap([f[0] - 2.3, f[1] + 0.7], [f[0] + 0.7, f[1] + 0.7], 1.2), c: D3 }]
  const bat = { s: cap(P.hn, P.bt, 0.7, 1.35), c: B8, ol: 1 }
  // heads: the batter in his helmet; the panda (white head, dark ears and eye patches); the giraffe (a long spotted neck, the head up top, two ossicones)
  const head = kind === 'panda' ? [
    { s: disc([hx - 2.3, hy - 3.3], 1.7), c: F10, ol: 1 }, { s: disc([hx + 2.7, hy - 3.1], 1.7), c: F10, ol: 1 },
    { s: disc([hx, hy + 0.3], 4.1), c: SP12, ol: 1 }, { s: disc([hx - 1.9, hy + 0.2], 1.5), c: F10, on: 1 }, { s: disc([hx - 2.1, hy], 0.5), c: SP12, on: 1 },
    { s: disc([hx - 3.7, hy + 1.9], 0.75), c: F10, on: 1 }, { s: cap([hx - 3.2, hy + 3], [hx - 1.8, hy + 3.2], 0.35), c: F10, on: 1 },
  ] : kind === 'giraffe' ? [
    { s: cap([hx + 0.8, P.sf[1] - 1], [hx + 0.2, hy + 1], 1.6, 1.2), c: F11, ol: 1 },
    ...[0.25, 0.5, 0.75].map((u) => ({ s: disc([hx + 0.8 - 0.6 * u + (u === 0.5 ? 0.5 : -0.4), P.sf[1] - 1 + (hy + 1 - P.sf[1] + 1) * u], 0.65), c: SP12, on: 1 })),
    { s: cap([hx + 0.2, hy - 1.6], [hx - 0.2, hy - 4.4], 0.45), c: F11 }, { s: disc([hx - 0.2, hy - 4.5], 0.75), c: SP12 },
    { s: cap([hx + 1.7, hy - 1.4], [hx + 1.6, hy - 4.1], 0.45), c: F11 }, { s: disc([hx + 1.6, hy - 4.2], 0.75), c: SP12 },
    { s: cap([hx + 2.6, hy - 0.6], [hx + 4.2, hy - 1.4], 0.55), c: F11 },
    { s: cap([hx + 1, hy], [hx - 4, hy + 1.6], 2.5, 1.7), c: F11, ol: 1 }, { s: disc([hx - 0.4, hy - 0.4], 0.6), c: K4, on: 1 }, { s: disc([hx - 4.3, hy + 1.8], 0.5), c: SP12, on: 1 },
  ] : [
    { s: cap([hx + 0.6, hy + 2], [hx + 1.2, P.sf[1] - 0.8], 1.5), c: S5 }, // neck
    { s: disc([hx, hy + 0.3], 3.3), c: S5, ol: 1 }, // head
    { s: disc([hx + 0.5, hy - 1], 3.7), c: H6, clip: (x, y) => y < hy - 0.8 + look * 0.3 }, // helmet shell
    { s: disc([hx - 0.6, hy - 3], 0.75), c: SH7, on: 1, clip: (x, y) => y < hy - 0.8 }, // its shine, so a black helmet shows on the dark ground
    { s: cap([hx - 2, hy - 1 + look * 0.4], [hx - 5.2, hy - 0.5 + look], 0.75), c: H6 }, // brim
    { s: disc([hx + 1.8, hy + 0.2], 1.6), c: H6, clip: (x, y) => y < hy + 1.8 }, // earflap
    { s: disc([hx - 1.6, hy + 0.6 + look * 0.5], 0.55), c: K4, on: 1 }, // eye
  ]
  return [
    ...(P.back ? [bat] : []),
    ...leg(P.hb, P.kb, P.fb), ...leg(P.hf, P.kf, P.ff).map((p) => ({ ...p, ol: p.on ? 0 : 1 })),
    { s: poly([[P.sf[0] - 1, P.sf[1] - 0.5], [P.sb[0] + 1, P.sb[1] - 0.5], [P.hb[0] + 0.5, P.hb[1]], [P.hf[0] - 0.5, P.hf[1]]], 1.2), c: W1 }, // torso
    { s: cap([P.hf[0], P.hf[1] - 0.6], [P.hb[0], P.hb[1] - 0.6], 0.75), c: K4, on: 1 }, // belt
    { s: cap(P.sb, P.eb, 1.8, 1.6), c: W1, ol: 1 }, { s: cap(P.eb, P.hn, 1.3, 1.1), c: armC, ol: 1 }, // back arm
    ...head,
    { s: cap(P.sf, P.ef, 1.8, 1.6), c: W1, ol: 1 }, { s: cap(P.ef, P.hn, 1.2, 1.1), c: armC, ol: 1 }, // front arm
    ...(kind === 'giraffe' ? [{ s: disc(lerp(P.ef, P.hn, 0.45), 0.55), c: SP12, on: 1 }] : []),
    { s: disc(P.hn, 1.7), c: an ? armC : G9, ol: 1 }, // batting gloves (paws for the animals)
    ...(P.back ? [] : [bat]),
  ]
}
// figure mask grid: 1 where anything is drawn
const maskOf = (G) => G.map((v) => (v ? 1 : 0))

// draws cells of a grid at s device px each from (x0, y0); pal maps cell values to colors (missing = skip)
function blit(g, G, cw, ch, s, x0, y0, pal) {
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const col = pal[G[j * cw + i]]; if (col) { g.fillStyle = col; g.fillRect(x0 + i * s, y0 + j * s, s, s) } }
}
// a pixel disc of radius r device px centered on the cell (cx, cy) of pitch p, drawn as row spans
function pdisc(g, x, y, r) { for (let dy = -r; dy < r; dy++) { const hw = Math.round(Math.sqrt(r * r - (dy + 0.5) * (dy + 0.5))); if (hw > 0) g.fillRect(x - hw, y + dy, hw * 2, 1) } }

// 1 PIXEL SLUGGER: the stance sprite (34 by 46 cells) on a little patch of dirt with the plate; number big in the accent on the side he faces, name underneath
// his height sets how tall he stands (6 ft 8 in fills the box); behind him a lineup chart every half foot from 5 ft to 6 ft 6 in, his own height marked in the accent on it
const HREF = 80
function slugger(g, w, h, d, o, P, fl) {
  const m = Math.round(6 * d)
  const nm = o.name ? fitText(g, nameCands(o.name), w - 2 * m, Math.min(w / 18, h / 14, 16 * d), d) : null, tb = nm ? nm.a + m : 0
  const s = Math.max(1, Math.min(Math.floor((h - 2 * m - tb) / 48), Math.floor((w - 2 * m) / 40))), cw = 40, ch = 48
  const kind = o.kind ?? 'human', inch = Math.max(62, Math.min(HREF, o.height ?? 74)), f = (kind === 'giraffe' ? 0.92 : 1) * (inch / HREF)
  const pose = kind === 'giraffe' ? { ...STANCE, hd: [15.5, 5.5] } : STANCE
  const G = raster(batterParts(pose, kind), f, cw, ch, 17.5 - 20.5 / f, 45.5 - 45.5 / f, fl)
  const rowOf = (inches) => Math.round(45 - (inches / HREF) * 44)
  for (const hh of [60, 66, 72, 78]) { const j = rowOf(hh); for (let i = 0; i < cw; i += 2) if (!G[j * cw + i]) G[j * cw + i] = CH13 }
  const back = fl ? 0 : cw - 4 // the chart's tick marks on the side behind him
  if (o.height) { const j = rowOf(o.height); for (let i = 0; i < 4; i++) G[j * cw + back + i] = MK14 }
  // chest number in the accent, only on the jersey (an arm across it hides part, like it would)
  if (o.num) { const ds = String(o.num).slice(0, 2), n = ds.length, cx = Math.round(fl ? cw - 1 - (20 + f) : 20 + f), ny = Math.round(45 - 23 * f), x0 = cx - Math.floor((n * 4 - 1) / 2); for (let k = 0; k < n; k++) { const r = F35[+ds[k]] ?? F35[0]; for (let y = 0; y < 5; y++) for (let i = 0; i < 3; i++) if (+r[y] & (4 >> i)) { const q = (ny + y) * cw + x0 + k * 4 + i; if (G[q] === W1) G[q] = O2 } } }
  // ground under him: a dim shadow, the plate in front toward the pitcher
  const gx = (u) => (fl ? cw - 1 - u : u)
  for (let i = 6; i <= 33; i++) for (const j of [46, 47]) if (!G[j * cw + gx(i)] && (j === 46 || (i > 8 && i < 31))) G[j * cw + gx(i)] = D3
  for (let i = 14; i <= 21; i++) G[46 * cw + gx(i)] = W1
  for (let i = 15; i <= 20; i++) G[47 * cw + gx(i)] = W1
  const ah = ch * s, x0 = Math.round((w - cw * s) / 2), y0 = m + Math.max(0, Math.round((h - 2 * m - tb - ah) / 2))
  blit(g, G, cw, ch, s, x0, y0, P)
  // the chart's feet, and his height by its mark
  const tiny = (t, j, col) => { const F = fitText(g, [t], 10 * s, Math.max(8 * d, 3.2 * s), d, 8); if (F) say(g, F, fl ? x0 + s : x0 + cw * s - s, y0 + j * s - s, col, fl ? 'l' : 'r') }
  for (const [t, hh] of [["5'", 60], ["6'", 72]]) if (!o.height || Math.abs(rowOf(hh) - rowOf(o.height)) > 2) tiny(t, rowOf(hh), '#4e4e4e') // a foot mark gives way to his own
  if (o.height) tiny(`${Math.floor(o.height / 12)}'${o.height % 12}"`, rowOf(o.height), P[MK14])
  // number and team in the corner he faces
  const side = fl ? w - m : m, al = fl ? 'r' : 'l'
  if (o.num) { const N = fitText(g, ['#' + o.num], (w - cw * s) / 2 + 10 * s, Math.min(w / 8, h / 7, 24 * d), d); if (N && N.font.includes('PS2P')) { say(g, N, side, m + N.a, lum(P[O2]) < 0.16 ? P[W1] : P[O2], al); if (o.team) { const T = fitText(g, [clean(o.team)], N.w * 2, N.px / 2, d); say(g, T, side, m + N.a + Math.round(4 * d) + (T?.a ?? 0), P[D3], al) } } }
  say(g, nm, w / 2, h - m, P[W1], 'c')
}

// 2 JERSEY BACK: a cream jersey with arms spread in a dim frame on a dark mat, name in ground color with an accent drop across the shoulders, the number in bold
// block digits outlined in the accent; a small accent plaque with the team underneath. No number (YOU): the name goes big where the number would be
function jersey(g, w, h, d, o, P) {
  const m = Math.round(4 * d), s = Math.max(1, Math.round(Math.min(w, h) / 110)), cw = Math.floor((w - 2 * m) / s), ch = Math.floor((h - 2 * m) / s)
  const x0 = Math.round((w - cw * s) / 2), y0 = Math.round((h - ch * s) / 2), R = (i, j, a, b, col) => { g.fillStyle = col; g.fillRect(x0 + i * s, y0 + j * s, a * s, b * s) }
  const fb = Math.max(2, Math.round(Math.min(cw, ch) * 0.035)) // frame width
  R(0, 0, cw, ch, P[D3]); R(fb, fb, cw - 2 * fb, ch - 2 * fb, P[K4]); R(fb, fb, cw - 2 * fb, 1, '#000'); R(fb, fb, 1, ch - 2 * fb, '#000')
  // jersey in a 64 by 46 unit box inside the mat
  const plq = o.team ? Math.max(5, Math.round(ch * 0.09)) : 0, iw = cw - 2 * fb - 4, ih = ch - 2 * fb - 4 - (plq ? plq + 2 : 0)
  const f = Math.min(iw / 64, ih / 46), jw = Math.round(64 * f), jh = Math.round(46 * f), jx = fb + 2 + Math.round((iw - jw) / 2), jy = fb + 2 + Math.round((ih - jh) / 2)
  const body = [[4, 11], [19, 4], [26, 2.5], [32, 4.2], [38, 2.5], [45, 4], [60, 11], [55.5, 22.5], [46, 18.5], [46.5, 45], [17.5, 45], [18, 18.5], [8.5, 22.5]]
  const parts = [
    { s: poly(body, 0.4), c: W1 },
    { s: cap([4.6, 12.5], [8.7, 21.5], 1.4), c: O2, on: 1 }, { s: cap([59.4, 12.5], [55.3, 21.5], 1.4), c: O2, on: 1 }, // sleeve trim
    { s: poly([[26, 2.5], [32, 4.2], [38, 2.5]], 1.1), c: O2, on: 1 }, // collar
    { s: cap([17.5, 45], [46.5, 45], 0.6), c: D3, on: 1 }, // hem
  ]
  const G = raster(parts, f, jw, jh, 0, 0, false)
  blit(g, G, jw, jh, s, x0 + jx * s, y0 + jy * s, P)
  const big = o.num ? String(o.num).slice(0, 2) : o.name && clean(o.name).length <= 3 ? clean(o.name) : '', top = o.num || !big ? o.name : null
  // big block letters: bold 5x7 scaled by b cells, ground fill with an accent outline
  if (big) {
    const n = big.length, bw = n * 7 - 1, b = Math.max(1, Math.min(Math.floor((26 * f) / bw), Math.floor((19 * f) / 7))), tw = bw * b, bx = jx + Math.round((jw - tw) / 2), by = jy + Math.round(25 * f) - Math.round((7 * b) / 2) + Math.round(3 * f)
    const cells = new Set(); text57(big, true, (x, y) => { for (let a = 0; a < b; a++) for (let c = 0; c < b; c++) cells.add((bx + x * b + a) + ',' + (by + y * b + c)) })
    const ow = Math.max(1, Math.round(b / 3))
    g.fillStyle = P[O2]; for (const k of cells) { const [x, y] = k.split(',').map(Number); g.fillRect(x0 + (x - ow) * s, y0 + (y - ow) * s, (2 * ow + 1) * s, (2 * ow + 1) * s) }
    g.fillStyle = P[K4]; for (const k of cells) { const [x, y] = k.split(',').map(Number); g.fillRect(x0 + x * s, y0 + y * s, s, s) }
  }
  if (top) {
    const N = fitText(g, nameCands(top).slice(-1), 26 * f * s, 4.2 * f * s, d, 9), dy = Math.max(1, Math.round(d))
    if (N) { const cx = x0 + (jx + jw / 2) * s, yb = y0 + (jy + 11.5 * f) * s; say(g, N, cx + dy, yb + dy, P[O2], 'c'); say(g, N, cx, yb, P[K4], 'c') }
  }
  if (plq) {
    const T = fitText(g, [clean(o.team)], cw * s, (plq - 2) * s, d)
    if (T) { const pw = Math.ceil(T.w / s) + 6, px = Math.round((cw - pw) / 2), py = ch - fb - plq - 1; R(px, py, pw, plq, P[O2]); say(g, T, x0 + (px + pw / 2) * s, y0 + (py + plq / 2) * s + T.a / 2, P[K4], 'c') }
  }
}

// 3 BASEBALL CARD: an accent card with a bright photo window and the batter in ground-color silhouette on a dim strip of grass, a name ribbon across the bottom,
// the team in a pennant top left and the number in a round badge top right
function card(g, w, h, d, o, P, fl) {
  const m = Math.round(3 * d), s = Math.max(2, Math.round(Math.min(w, h) / 85))
  let CH = Math.floor((h - 2 * m) / s), CW = Math.round((CH * 5) / 7)
  if (CW > Math.floor((w - 2 * m) / s)) { CW = Math.floor((w - 2 * m) / s); CH = Math.round((CW * 7) / 5) }
  const x0 = Math.round((w - CW * s) / 2), y0 = Math.round((h - CH * s) / 2), R = (i, j, a, b, col) => { g.fillStyle = col; g.fillRect(x0 + i * s, y0 + j * s, a * s, b * s) }
  R(1, 0, CW - 2, CH, P[O2]); R(0, 1, CW, CH - 2, P[O2]) // card stock, corners clipped
  const bw = Math.max(3, Math.round(CW * 0.075)), nm = o.name ? fitText(g, nameCands(o.name), (CW - 2 * bw - 2) * s, CW * s * 0.1, d) : null
  const bh = nm ? Math.ceil(nm.a / s) + 4 : 0, pw = CW - 2 * bw, ph = CH - 2 * bw - Math.round(bh / 2) - 1
  R(bw - 1, bw - 1, pw + 2, ph + 2, P[K4]); R(bw, bw, pw, ph, P[W1]) // photo window with a thin ground rule
  const gr = Math.round(ph * 0.84) // ground row in the photo
  R(bw, bw + gr, pw, ph - gr, P[D3])
  const f = (gr * 0.9) / 46, G = raster(batterParts(STANCE), f, pw, ph, 16.5 - pw / (2 * f), 45 - gr / f, fl)
  blit(g, maskOf(G), pw, ph, s, x0 + bw * s, y0 + bw * s, { 1: P[K4] })
  // name ribbon: ground band across the card with notched dim tails
  if (nm) {
    const by = bw + ph - Math.round(bh / 2), tl = Math.max(2, Math.round(bw * 0.7))
    for (let j = 0; j < bh; j++) { const notch = Math.abs(j - (bh - 1) / 2) < bh / 4 ? 1 : 0; R(bw - tl + notch, by + j + 1, tl, 1, P[D3]); R(CW - bw - notch, by + j + 1, tl, 1, P[D3]) }
    R(bw - 1, by, pw + 2, bh, P[K4])
    say(g, nm, x0 + (CW / 2) * s, y0 + (by + bh / 2) * s + nm.a / 2, P[W1], 'c')
  }
  // pennant: a ground triangle off a dim stick, team inside in the accent
  if (o.team) {
    const T = fitText(g, [clean(o.team).slice(0, 3)], pw * s * 0.3, Math.max(8 * Math.round(d), CW * s * 0.07), d)
    if (T) {
      const th = Math.ceil(T.a / s) + 4, tl = Math.ceil(T.w / s) + Math.round(th * 1.3) + 2, px = fl ? bw + pw - 2 - tl : bw + 2, py = bw + 2
      for (let j = 0; j < th; j++) { const len = Math.round(tl * (1 - Math.abs(j - (th - 1) / 2) / ((th - 1) / 2 + 1))); R(fl ? px + tl - len : px, py + j, len, 1, P[K4]) }
      R(fl ? px + tl : px - 1, py - 1, 1, th + 3, P[D3])
      say(g, T, x0 + (fl ? px + tl - 2 : px + 2) * s, y0 + (py + th / 2) * s + T.a / 2, P[O2], fl ? 'r' : 'l')
    }
  }
  // number badge: a ground disc with the number in ink, 5x7 cells
  if (o.num) {
    const t = String(o.num).slice(0, 2), tw = text57(t, true, () => {}), r = Math.ceil(Math.max(tw, 7) / 2) + 2, cx = fl ? bw + r + 1 : bw + pw - r - 1, cy = bw + r + 1
    g.fillStyle = P[K4]; pdisc(g, x0 + cx * s, y0 + cy * s, r * s)
    g.fillStyle = P[W1]; text57(t, true, (x, y) => g.fillRect(x0 + (cx - Math.floor(tw / 2) + x) * s, y0 + (cy - 4 + y) * s, s, s))
  }
}

// 4 SHADOW AT THE PLATE: night game. A bone silhouette mid-swing on an accent strip of dirt, his shadow thrown long across it by a light tower behind the pitcher,
// the ball just off the bat; on the horizon the left-field wall with the bottle and the glove
function shadow(g, w, h, d, o, P, fl) {
  const s = Math.max(2, Math.round(Math.min(w, h) / 90)), cw = Math.ceil(w / s), ch = Math.ceil(h / s), R = (i, j, a, b, col) => { g.fillStyle = col; g.fillRect(i * s, j * s, a * s, b * s) }
  const X = (i) => (fl ? cw - 1 - i : i), RX = (i, j, a, b, col) => R(fl ? cw - i - a : i, j, a, b, col)
  const m = Math.round(5 * d), nm = o.name ? fitText(g, nameCands(o.name), w - 2 * m, Math.min(w / 18, h / 14, 16 * d), d) : null
  // from the bottom: the name band, the dirt (deep enough to hold the shadow), the figure standing on it
  const d1 = ch - (nm ? Math.ceil((nm.a + 2 * m) / s) : 1), gy = d1 - Math.round(ch * 0.2), hz = Math.round(gy - ch * 0.26), d0 = gy - Math.round(ch * 0.05)
  R(0, 0, cw, ch, P[K4])
  // horizon: the wall line, a light tower behind the pitcher (the light comes from his side), the bottle and the glove out past the far side
  R(0, hz, cw, 1, P[D3])
  const tx = Math.round(cw * 0.1), tw = Math.max(5, Math.round(cw * 0.06)), th = Math.round(hz * 0.55)
  RX(tx + Math.floor(tw / 2), hz - th, 1, th, P[D3]); RX(tx, hz - th - 3, tw, 3, P[D3])
  for (let i = 0; i < tw; i += 2) RX(tx + i, hz - th - 2, 1, 1, P[W1])
  const bx = Math.round(cw * 0.86), bh = Math.round(hz * 0.3), bw = Math.max(3, Math.round(bh / 4)) // the Coca-Cola bottle
  RX(bx, hz - bh, bw, bh, P[D3]); RX(bx + Math.floor(bw / 3), hz - bh - Math.round(bh / 3), Math.max(1, Math.ceil(bw / 3)), Math.round(bh / 3), P[D3])
  const gx = Math.round(cw * 0.72), gr = Math.max(3, Math.round(bh * 0.35)) // the old-timey glove
  for (let j = -gr; j <= 0; j++) { const hw = Math.round(Math.sqrt(gr * gr - j * j)); RX(gx - hw, hz + j, hw * 2 + 1, 1, P[D3]) }
  for (let k = 0; k < 3; k++) RX(gx - gr + 1 + k * Math.max(2, Math.round(gr * 0.6)), hz - gr - 1, 1, 1, P[D3])
  R(0, d0, cw, d1 - d0, P[O2]) // the dirt
  // chalk: the front line of the box, and the plate under him
  const fh = gy - Math.max(2, Math.round(ch * 0.08)), f = fh / 46, fw = Math.round(46 * f), oy = gy - fh, px0 = Math.round(cw * 0.42) - Math.round(26 * f)
  RX(px0 + Math.round(17 * f), gy + 1, Math.round(12 * f), 1, P[W1]); RX(px0 + Math.round(18 * f), gy + 2, Math.round(10 * f), 1, P[W1])
  const G = maskOf(raster(batterParts(SWING), f, fw, fh, -6, 0, false))
  // shadow: the figure laid flat on the dirt, thrown right and toward us, squashed to the depth of the dirt
  // (sampled from the shadow's side, so it comes out solid rather than in streaks)
  const sq = Math.min(0.45, (d1 - gy - 1.5) / fh), sk = 1.1
  for (let sy = gy; sy < d1; sy++) for (let sx = px0 - 2; sx < cw + 2; sx++) {
    let hit = 0
    for (let up = Math.floor((sy - gy) / sq); up < (sy - gy + 1) / sq && !hit; up++) { const j = fh - 1 - up, i = sx - px0 - Math.round(up * sk); if (j >= 0 && i >= 0 && i < fw && G[j * fw + i]) hit = 1 }
    if (hit) RX(sx, sy, 1, 1, P[K4])
  }
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) if (G[j * fw + i]) RX(px0 + i, oy + j, 1, 1, P[W1])
  // the ball just off the barrel, with a dotted trail back to it
  const bt = SWING.bt, ballx = px0 + Math.round((bt[0] + 6 - 4) * f), bally = oy + Math.round((bt[1] - 5) * f), bs = Math.max(2, Math.round(f))
  RX(ballx, bally, bs, bs, P[W1])
  for (let k = 1; k <= 3; k++) RX(ballx + k * (bs + 2), bally + k * Math.max(1, Math.round(bs / 2)), 1, 1, P[D3])
  if (nm) say(g, nm, fl ? w - m : m, h - m, P[W1], fl ? 'r' : 'l')
}

// 5 SCOREBOARD BULBS: a bulb board, unlit bulbs as small dim dots, lit ones in ink and the accent. The portrait is the stance cropped to the head, hands and bat;
// the number in big accent bulbs on the side he faces; the name in 5x7 bulbs underneath, the surname or a frozen scroll if it runs long
function bulbs(g, w, h, d, o, P, fl) {
  const p = Math.max(4, Math.floor(Math.min(h / 64, w / 72))), cw = Math.floor(w / p), ch = Math.floor(h / p), x0 = Math.round((w - cw * p) / 2), y0 = Math.round((h - ch * p) / 2)
  const L = new Uint8Array(cw * ch), put = (i, j, v) => { if (i >= 0 && j >= 0 && i < cw && j < ch) L[j * cw + i] = v }, tw57 = (t) => text57(t, false, () => {})
  // the name at the bottom: the longest form that fits one line, else the surname split at its hyphen or space onto two, else a frozen scroll cut at a whole letter
  const name = o.name ? clean(o.name) : '', cands = name ? nameCands(name) : [], room = cw - 4
  let lines = cands.find((t) => tw57(t) <= room)
  lines = lines ? [lines] : []
  if (name && !lines.length) {
    const t = cands[cands.length - 1], k = t.lastIndexOf('-') > 0 ? t.lastIndexOf('-') + 1 : t.lastIndexOf(' ')
    if (k > 0 && tw57(t.slice(0, k).trim()) <= room && tw57(t.slice(k).trim()) <= room) lines = [t.slice(0, k).trim(), t.slice(k).trim()]
    else lines = [t.slice(0, Math.floor((room + 1) / 6))]
  }
  const ty = ch - 1 - lines.length * 8
  lines.forEach((t, n) => { const tx = Math.floor((cw - tw57(t)) / 2); text57(t, false, (x, y) => put(tx + x, ty + n * 8 + y, W1)) })
  // portrait: stance crop x 6..30, y 0..25, as tall as the space above the name
  const top = 1, ph = (lines.length ? ty - 2 : ch - 2) - top, f = ph / 25, pw = Math.round(24 * f)
  const PG = raster(batterParts(STANCE), f, pw, ph, 6, 0, fl)
  // the portrait centered; the number in big accent bulbs in the empty corner above the brim, on the side he faces
  const px = Math.floor((cw - pw) / 2)
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) { const v = PG[j * pw + i]; if (v && v !== K4) put(px + i, top + j, [O2, D3, H6, SH7, G9].includes(v) ? O2 : W1) }
  const num = o.num ? String(o.num).slice(0, 2) : ''
  if (num) {
    const nw1 = num.length * 7 - 1, nb = Math.max(1, Math.min(3, Math.floor((7.2 * f - 2) / 7), Math.floor((px + pw * 0.3 - 2) / nw1))), nx = fl ? cw - 2 - nw1 * nb : 2
    text57(num, true, (x, y) => { for (let a = 0; a < nb; a++) for (let b = 0; b < nb; b++) put(nx + x * nb + a, top + 1 + y * nb + b, O2) })
  }
  const rOn = Math.max(1.5, p * 0.42), rOff = Math.max(1, Math.round(p * 0.16))
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const v = L[j * cw + i], cx = x0 + i * p + Math.floor(p / 2), cy = y0 + j * p + Math.floor(p / 2)
    if (v) { g.fillStyle = P[v]; pdisc(g, cx, cy, Math.round(rOn)) } else { g.fillStyle = P[D3]; g.fillRect(cx - Math.floor(rOff / 2), cy - Math.floor(rOff / 2), rOff, rOff) }
  }
}

const STYLE_FN = { 1: slugger, 2: jersey, 3: card, 4: shadow, 5: bulbs }
// draws style c into canvas cv filling a W by H css-pixel box; o = { ink, acc, k, dim, name, num, hand, team, ratio } (ratio: device px per css px, the screen's by
// default). Canvas text uses the page's PS2P and VT, so call it after document.fonts has them
export function drawStandIn(cv, c, W, H, o = {}) {
  const d = o.ratio ?? Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
  W = Math.max(60, Math.floor(W)); H = Math.max(60, Math.floor(H))
  const w = Math.round(W * d), h = Math.round(H * d)
  cv.width = w; cv.height = h; if (cv.style) { cv.style.width = W + 'px'; cv.style.height = H + 'px' }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, w, h)
  const P = { [W1]: o.ink || '#e8e1c9', [O2]: o.acc || '#f0802a', [D3]: o.dim || '#6d6a60', [K4]: o.k || '#0b0c0b', [S5]: o.skin || SKIN, [H6]: o.acc || '#f0802a', [SH7]: o.acc || '#f0802a', [B8]: o.ink || '#e8e1c9', [G9]: o.dim || '#6d6a60',
    [F10]: '#3d3d3d', [F11]: '#e3b04b', [SP12]: '#f3f1ea', [CH13]: '#2a2a2a', [MK14]: o.acc || '#f0802a' }
  // the slugger in his kit (the other styles keep the panel's colors): jersey, trim, a helmet lifted off the dark ground if it is near black, a wood bat
  if (c === 1 && o.kit) {
    const hm = lum(o.kit.helmet) < 0.1 ? '#2b2b2b' : o.kit.helmet
    Object.assign(P, { [W1]: o.kit.jersey, [O2]: o.kit.trim, [H6]: hm, [SH7]: mix(hm, '#ffffff', 0.4), [B8]: '#c9975b', [G9]: o.kit.trim })
    if (o.kind === 'giraffe') P[SP12] = '#8a5528'
  }
  const op = { ...o, num: o.num != null && String(o.num).trim() !== '' ? String(o.num).trim() : null, team: o.team ? String(o.team) : null, name: o.name ? String(o.name) : null }, fn = STYLE_FN[c] ?? slugger
  fn(g, w, h, d, op, P, o.hand === 'L')
  return { w: W, h: H }
}
