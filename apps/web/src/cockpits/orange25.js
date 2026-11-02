// Study 25's one orange (2 Nov, Andrew: "make sure we're using the same orange or families of orange everywhere, there's some orange drift"). The interface had
// #f0802a and the park #fd5a1e, with strays (#f26b21 kayakers, #ff7a3c crab, #ff8a1c beak) round them. Everything orange now comes from here: the anchor, and its
// family mixed toward black or white, so a shadow side or a highlight is the same hue, not a new orange.
// OR in the side menu picks the anchor, five of them (2 Nov, later: "Give me 5 oranges to choose between"). The page starts on the stored one; a change after
// that is live (2 Nov, later: "Switching the orange makes the whole thing pull up again"): setOrange() changes the family in place, and recolor() walks the park
// and swaps the old family's colors for the new on every material and every instanced cube, so nothing reloads.
// 2 Nov, later (Andrew: "let's go safety orange, giants orange is reading as too red"): locked to SAFETY ORANGE; a stored pick no longer counts. The five stay listed.
export const ANCHORS = [
  { c: 1, name: 'C1 ORANGE', hex: '#f0802a', desc: "the interface's orange since 26 Oct: warm, a touch soft" },
  { c: 2, name: 'GIANTS ORANGE', hex: '#fd5a1e', desc: "the team's own: redder, the jersey and the seats" },
  { c: 3, name: 'SAFETY ORANGE', hex: '#ff7a00', desc: 'traffic-cone orange: the loudest, no red in it' },
  { c: 4, name: 'MANDARINE', hex: '#df7c18', desc: 'deeper and a little brown, like the old scoreboard bulbs' },
  { c: 5, name: 'TANGERINE', hex: '#ffa040', desc: 'lighter and yellower, almost the sun on the bay' },
]
export const ORANGE_LOCK = 3
const pick = () => ANCHORS.find((a) => a.c === ORANGE_LOCK)
const mix = (hex, to, t) => '#' + [1, 3, 5].map((i) => { const a = parseInt(hex.slice(i, i + 2), 16), b = parseInt(to.slice(i, i + 2), 16); return Math.round(a + (b - a) * t).toString(16).padStart(2, '0') }).join('')
// o the orange itself; dark a shadow side (sides of cubes, legs, an ember); deep the darkest; light a lit top; pale a glint
const family = (A) => ({ o: A, dark: mix(A, '#000000', 0.34), deep: mix(A, '#000000', 0.58), light: mix(A, '#ffffff', 0.28), pale: mix(A, '#ffffff', 0.55) })
let look = pick().c
export const ORANGE = family(pick().hex)
export const orangeLook = () => look
// to another anchor, in place (so code that reads ORANGE.o from now on gets the new one); returns old hex -> new hex for recolor()
export function setOrange(c) {
  const a = ANCHORS.find((x) => x.c === c)
  if (!a || c === look) return null
  const old = { ...ORANGE }, nu = family(a.hex), map = new Map()
  for (const k of Object.keys(nu)) map.set(old[k].slice(1).toLowerCase(), nu[k])
  Object.assign(ORANGE, nu)
  look = c
  return map
}
// every material color and instanced-cube color in the old family, in the new one
export function recolor(root, map) {
  if (!root || !map) return 0
  let n = 0, tmp = null
  const seen = new Set()
  root.traverse((ob) => {
    for (const m of [].concat(ob.material ?? [])) {
      if (!m?.color || seen.has(m)) continue
      seen.add(m)
      const to = map.get(m.color.getHexString()); if (to) { m.color.set(to); n++ }
    }
    if (ob.isInstancedMesh && ob.instanceColor) {
      tmp ??= ob.material?.color?.clone?.()
      if (!tmp) return
      let hit = false
      for (let i = 0; i < ob.count; i++) { ob.getColorAt(i, tmp); const to = map.get(tmp.getHexString()); if (to) { ob.setColorAt(i, tmp.set(to)); hit = true; n++ } }
      if (hit) ob.instanceColor.needsUpdate = true
    }
  })
  return n
}
