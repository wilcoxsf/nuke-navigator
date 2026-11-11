// THE WALL ODDS (10 Nov 2026; Andrew: "Look at sharpening the other-park view with real landings"; science/otherpark_study.md, science/oracle_wall_fit.md).
// The app's flight is very good at saying whether a ball clears a wall (at Oracle, against the crest it flies against, 2.5% wrong on balls near the wall), but
// near the wall real balls go both ways. Fitted on real 2023-2026 balls in play near the wall, the chance a ball goes out given how far the flight clears the
// wall: P(out) = logistic(k x clearance_ft + a), Oracle's own, all 30 parks' pooled, and each park's own, in apps/web/public/wall_odds.json (written by
// science/otherpark_study.py, parks by science/park_odds_fit.py).
// Used where the question is a what-if: an away ball flown at Oracle, a dojo swing, a tweaked ball, the GONE IN N OF 30 PARKS count. A real ball at its own
// park needs no odds: what happened is known.
let ODDS = { SF: { k: 0.575, a: 1.585 }, all: { k: 0.450, a: -0.656 } } // (the 10 Nov fit, until the file comes in)
fetch('/wall_odds.json').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.SF && d?.all) { ODDS = d; dispatchEvent(new Event('nn-wallodds')) } }).catch(() => {}) // (GPT red team 8: the page repaints when the real odds arrive)
const sig = (z) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z))))
export function pOut(clearFt, park = 'SF') {
  if (clearFt == null || !Number.isFinite(clearFt)) return null
  // each park's own odds on its own crest (science/park_odds_fit.md: better than the pooled odds on 2026 balls), else Oracle's, else the pooled
  const o = ODDS.parks?.[park] ?? (park === 'SF' ? ODDS.SF : ODDS.all)
  return sig(o.k * clearFt + o.a)
}
// a flight's clearance at a wall, from the engine's verdict: over by clearBy, short of the top by short, or (never reached it, or foul) far short
export function clearanceOf(v) {
  if (!v) return null
  if (v.kind === 'GONE') return v.clearBy ?? 0
  if (v.kind === 'WALL') return -(v.short ?? 0)
  return -30
}
// "7 IN 10" from a chance
export const inTen = (p) => `${Math.max(1, Math.min(9, Math.round(p * 10)))} IN 10`
