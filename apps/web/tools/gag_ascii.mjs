// The menu gags as text (10 Nov 2026): runs src/cockpits/menugags25.js in Node against a fake canvas and prints frames one character a pixel, so the art can be
// checked without screenshots (Andrew: no screenshots of the Nuke Navigator UI). Usage: node tools/gag_ascii.mjs [gag] [t1,t2,...] [x0-x1]
import { GAGS, GW, GH, U, drawGag } from '../src/cockpits/menugags25.js'
const CH = { '#0b0b0b': '#', '#ffffff': 'o', '#f5f5f5': 'w', '#f1ead2': 'c', '#e9b48c': 's', '#b97a52': 's', '#1b1b1b': 'k', '#1f5fd6': 'B', '#3b4a6b': 'j', '#c8914f': '=', '#6b3f1d': 'g',
  '#d1102a': 'R', '#8e0b1d': 'r', '#1d5f97': '~', '#3d8ccc': '-', '#dff2ff': '*', '#2c6a33': ',', '#3a7d40': ',', '#94643a': '_', '#8a8f99': ':', '#5b616b': ':', '#e6e9ee': 'v', '#f2bc40': 'y',
  '#c8102e': 'R', '#d8452a': 'C', '#962b17': 'c', '#3a3f47': '%', '#b9bec6': '.', '#c3c8cf': '.', '#d3d7dd': '.', '#7a3b2a': 'H', '#5c2a1d': 'H', '#6e5a48': 'L', '#4d3e31': 'l', '#a8713f': 'd',
  '#aab2bd': 'S', '#2d6fd1': 'P', '#33363b': ' ', '#8a5a32': '=', '#6b4426': '=', '#5a0d12': 'm', '#2a2d33': ' ', '#ffe27a': '+', '#e2621b': 'O', '#7fb0d9': 'w', '#f0802a': 'O' }
function frame(k, t) {
  const g = Array.from({ length: GH }, () => Array(GW).fill(' ')), seen = new Set()
  const cx = { fillStyle: '#000', clearRect() {}, fillRect(x, y, w, h) { const c = CH[this.fillStyle.toLowerCase()] ?? (seen.add(this.fillStyle), '?'); for (let v = Math.floor(y / U); v < Math.ceil((y + h) / U); v++) for (let u = Math.floor(x / U); u < Math.ceil((x + w) / U); u++) if (v >= 0 && v < GH && u >= 0 && u < GW) g[v][u] = c } }
  drawGag(cx, k, t, '#f0802a')
  return { rows: g.map((r) => r.join('')), unknown: [...seen] }
}
const [k0, ts0, xr] = process.argv.slice(2)
const keys = k0 && k0 !== 'all' ? [k0] : Object.keys(GAGS)
const [x0, x1] = xr ? xr.split('-').map(Number) : [0, GW]
for (const k of keys) {
  const ts = ts0 ? ts0.split(',').map(Number) : [1, 2.2, GAGS[k].still, GAGS[k].dur - 0.5]
  for (const t of ts) { const f = frame(k, t); console.log(`== ${k} t=${t}${f.unknown.length ? ' unknown colors ' + f.unknown.join(' ') : ''}`); for (const r of f.rows) console.log(r.slice(x0, x1).replace(/\s+$/, '')) }
}
