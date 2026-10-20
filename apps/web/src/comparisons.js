// Random speed and distance comparisons from the curated library.
// Picks favor San Francisco and weird items, never repeat a category back to back, and always say
// "N times as fast as X" or "N times the length of X", never "N Xs".

const NICE = [0.1, 0.2, 0.25, 0.3, 1 / 3, 0.4, 0.5, 0.6, 2 / 3, 0.7, 0.75, 0.8, 0.9, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50]
const WORDS = [[0.1, 'a tenth'], [0.2, 'a fifth'], [0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half'], [2 / 3, 'two-thirds'], [0.75, 'three-quarters']]
const THEME_WEIGHT = { sf: 25, weird: 25, general: 1 }
const THE_RE = /\b(Bridge|Tower|Building|Pyramid|Statue|Cathedral|Dam|Canal|Falls|Arch|Wall|Needle|Palace|Titanic|Colosseum|Parthenon|Basilica|Church|Temple|Mosque|Monument|Obelisk|Lighthouse|Hotel)\b/

export async function loadLibrary(url = '/comparisons.json') {
  const rows = await (await fetch(url)).json()
  return rows.map((r) => ({
    name: r.n, kind: r.k === 's' ? 'speed' : 'length', v: r.v,
    theme: r.t === 's' ? 'sf' : r.t === 'w' ? 'weird' : 'general', cat: r.c, fame: r.f || 0,
    reviewed: !!r.r, url: r.u || '', dim: r.d || 'length', note: r.x || '', countOk: !!r.o,
  }))
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function indefinite(name) {
  const lower = name.charAt(0).toLowerCase() + name.slice(1)
  return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + lower
}

// "a cable car", "the Statue of Liberty", "Taipei 101", "the world's longest hot dog"
export function withArticle(r) {
  const n = r.name
  if (/^(a|an|the) /i.test(n)) return n.charAt(0).toLowerCase() + n.slice(1)
  if (/^[a-z]/.test(n)) return 'a ' + n
  if (r.cat.startsWith('animal')) return indefinite(n)
  if (THE_RE.test(n)) return 'the ' + n
  return n
}

function number(q) {
  if (q >= 1e9) return `${trim((q / 1e9).toFixed(1))} billion`
  if (q >= 1e6) return `${trim((q / 1e6).toFixed(1))} million`
  if (q >= 1000) {
    const mag = 10 ** (Math.floor(Math.log10(q)) - 1) // two significant figures: 23,896 -> 24,000
    return (Math.round(q / mag) * mag).toLocaleString('en-US')
  }
  if (q >= 10) return String(Math.round(q))
  if (q >= 2) return trim(q.toFixed(1))
  return trim(q.toFixed(2))
}
const trim = (s) => s.replace(/\.?0+$/, '')

function fractionWord(q) {
  for (const [v, w] of WORDS) if (Math.abs(q - v) / v < 0.04) return w
  return null
}

export function speedPhrase(q, r) {
  const who = withArticle(r)
  if (q > 55) return `about ${number(q)} times as fast as ${who}`
  if (q >= 1.15) return Math.abs(q - 2) < 0.06 ? `twice as fast as ${who}` : `${number(q)} times as fast as ${who}`
  if (q >= 0.85) return `about as fast as ${who}`
  const w = fractionWord(q)
  return `${w ?? `about ${Math.round(q * 100)}%`} as fast as ${who}`
}

export function lengthPhrase(q, r) {
  const who = withArticle(r)
  const dim = r.dim
  if (q > 55) return `about ${number(q)} times the ${dim} of ${who}`
  if (q >= 1.15) return Math.abs(q - 2) < 0.06 ? `twice the ${dim} of ${who}` : `${number(q)} times the ${dim} of ${who}`
  if (q >= 0.85) return `about the same ${dim} as ${who}`
  const w = fractionWord(q)
  return w ? `${w} the ${dim} of ${who}` : `about ${Math.round(q * 100)}% of the ${dim} of ${who}`
}

export function pick(lib, kind, amountSI, rand = Math.random, recent = []) {
  const cands = []
  for (const r of lib) {
    if (r.kind !== kind) continue
    const q = amountSI / r.v
    let err = null
    if (q >= 0.1 && q <= 55) {
      err = Math.min(...NICE.map((c) => Math.abs(q - c) / c))
      if (err >= 0.05) continue
    } else if (r.countOk && q > 55 && q < 1e12) {
      err = 0.02 // absurd-count mode for tiny or very slow things
    } else continue
    // curated sf/weird items always count; generic Wikidata items must be reasonably famous
    if (r.theme === 'general' && r.fame < (kind === 'speed' ? 30 : 18)) continue
    const fameW = r.theme === 'general' ? Math.min(6, Math.max(0.05, (r.fame / 30) ** 2)) : 1 + r.fame / 60
    let w = (THEME_WEIGHT[r.theme] ?? 1) * fameW * (1 - (err / 0.05) * 0.5)
    if (q > 55) w *= 1.5
    if (recent.includes(r.cat)) w *= 0.15
    if (recent.includes(r.name)) w *= 0.01
    cands.push({ r, q, w })
  }
  if (!cands.length) return null
  let t = rand() * cands.reduce((s, c) => s + c.w, 0)
  for (const c of cands) {
    t -= c.w
    if (t <= 0) return finish(c, kind)
  }
  return finish(cands[cands.length - 1], kind)
}

function finish({ r, q }, kind) {
  return { rec: r, q, phrase: kind === 'speed' ? speedPhrase(q, r) : lengthPhrase(q, r) }
}
