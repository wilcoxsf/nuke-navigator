// Study 25 hitter types (4 Nov, Andrew: "the profile shouldn't just say 'up the middle' it should have different classifications for everything - 'lob hitter who pulls' or
// whatever. We should have like 50 of these and see how players fit into them - think about how to classify"). Every hitter in the replay set with 12 or more balls (their
// balls of 335 ft and more since July 2023, and every home run) is read on three things, and named by them:
//   THE ANGLE: the middle of their launch angles, against the other hitters (the lowest third LINE-DRIVE, the highest MOONBALL, the rest the textbook angle, no word)
//   WHERE: their average spray angle (negative is pulled, to their own side) and how wide it runs (the middle half): 11 degrees pulled or more WHO PULLS; 3 degrees
//     the other way or more WHO GOES OPPO; a middle half 32 degrees wide or more WHO SPRAYS IT; otherwise WHO STAYS UP THE MIDDLE (the cuts split the 32 hitters
//     with 12 or more balls 11 / 3 / 8 / 10)
//   THE POWER: the middle of their exit speeds, against the others (the top third MASHER, the bottom PUNCHER, the rest THUMPER)
// so 3 x 3 x 4 = 36 types ("MOONBALL MASHER WHO PULLS"), and twelve badges on top for what stands out (SPLASH HITTER, NO-DOUBTER, WALL SCRAPER ...): 48 in all.
// Thresholds come from the hitters themselves (thirds), so the types spread out over the people in the set rather than all landing in one.

export const ANGLES = { 'LINE-DRIVE': 'keeps it low and hard', '': 'at the textbook angle', MOONBALL: 'lifts it high' }
export const SPRAYS = { PULL: ['WHO PULLS', 'pulls it to their own side'], OPPO: ['WHO GOES OPPO', 'goes the other way'], SPRAY: ['WHO SPRAYS IT', 'uses the whole field'], STRAIGHTAWAY: ['WHO STAYS UP THE MIDDLE', 'hits it up the middle'] }
export const POWERS = { MASHER: 'harder than almost anyone here', THUMPER: 'with solid, steady contact', PUNCHER: 'without much thunder, but enough' }
export const BADGES = [
  ['SPLASH HITTER', 'two or more of the home runs would land in McCovey Cove'],
  ['NO-DOUBTER', 'five or more home runs, typically 410 ft or more'],
  ['WALL SCRAPER', 'five or more home runs, three in ten under 375 ft'],
  ['TRIPLES ALLEY TAMER', 'two or more home runs out to Triples Alley, the hardest part of the park, and one in six of theirs that would go out here'],
  ['LINE HUGGER', 'one in five of the balls goes within 10 degrees of a foul line'],
  ['CHEAP PORCH', 'most of the home runs that would go out here go down the right-field line'],
  ['BLEACHER BUM', 'six in ten of the home runs that would go out here land in the left-field bleachers'],
  ['ARCADE GAMER', 'three or more home runs, and a third of theirs, would land in the right-field arcade'],
  ['EXIT-VELO KING', 'hit one 112 mph or harder'],
  ['OPPO BOMBER', 'two or more home runs the other way that would go out here, and one in five of theirs'],
  ['SWITCH-HITTER', 'hits from both sides'],
  ['ALL OR NOTHING', 'five or more home runs, and four in ten of the deep balls are home runs'],
]
export const nameOf = (angle, power, where) => [angle, power, SPRAYS[where][0]].filter(Boolean).join(' ')
export const TYPES = Object.keys(ANGLES).flatMap((a) => Object.keys(POWERS).flatMap((p) => Object.keys(SPRAYS).map((s) => nameOf(a, p, s))))

const q = (v, k) => { const x = [...v].sort((p, r) => p - r); return x.length ? x[Math.min(x.length - 1, Math.floor(k * x.length))] : null }
// balls: [{ ev, la, dir, ft, hr, s }] for one hitter; out: [{ gone, b, area }] their home runs flown here (heat25 player)
export function readHitter(balls, out = []) {
  if (!balls.length) return null
  const hand = (b) => (b.s === 'L' ? -1 : 1), spray = balls.map((b) => b.dir * hand(b))
  const pull = spray.filter((x) => x < -15).length / balls.length, oppo = spray.filter((x) => x > 15).length / balls.length
  const hrs = balls.filter((b) => b.hr), hft = hrs.map((b) => b.ft)
  return {
    n: balls.length, hr: hrs.length, pull, oppo, mid: 1 - pull - oppo,
    line: balls.filter((b) => Math.abs(b.dir) >= 35).length / balls.length,
    ev: q(balls.map((b) => b.ev), 0.5), la: q(balls.map((b) => b.la), 0.5), evMax: Math.max(...balls.map((b) => b.ev)),
    ev25: q(balls.map((b) => b.ev), 0.25), ev75: q(balls.map((b) => b.ev), 0.75), la25: q(balls.map((b) => b.la), 0.25), la75: q(balls.map((b) => b.la), 0.75),
    hrFt: q(hft, 0.5), hrMax: hft.length ? Math.max(...hft) : null, short: hrs.length ? hft.filter((f) => f < 375).length / hrs.length : 0,
    sides: new Set(balls.map((b) => b.s)).size, sprayMean: spray.reduce((t, x) => t + x, 0) / spray.length, sprayWide: q(spray, 0.75) - q(spray, 0.25), spray,
    splash: out.filter((x) => x.gone && x.area === 'cove').length, arcade: out.filter((x) => x.gone && x.area === 'arcade').length, bleach: out.filter((x) => x.gone && x.area === 'bleachers').length,
    oppoOut: out.filter((x) => x.gone && x.spray > 15).length, rfLine: out.filter((x) => x.gone && x.b >= 30).length, alley: out.filter((x) => x.gone && x.b >= 7 && x.b < 22).length, outHere: out.filter((x) => x.gone).length,
    dirs: balls.map((b) => b.dir), evs: balls.map((b) => b.ev), las: balls.map((b) => b.la), hrDirs: hrs.map((b) => b.dir), hrEvs: hrs.map((b) => b.ev), hrLas: hrs.map((b) => b.la),
    side: new Set(balls.map((b) => b.s)).size > 1 ? 'S' : balls[0].s,
  }
}
// the cuts for the angle and the power: thirds over everyone read
export function cutsOf(reads) {
  const r = reads.filter(Boolean)
  return { la: [q(r.map((x) => x.la), 1 / 3), q(r.map((x) => x.la), 2 / 3)], ev: [q(r.map((x) => x.ev), 1 / 3), q(r.map((x) => x.ev), 2 / 3)] }
}
export function typeOf(h, cuts) {
  if (!h) return null
  const angle = h.la < cuts.la[0] ? 'LINE-DRIVE' : h.la > cuts.la[1] ? 'MOONBALL' : '' // (strictly: the medians are whole degrees, so the middle keeps the ties)
  const where = h.sprayMean <= -11 ? 'PULL' : h.sprayMean >= 3 ? 'OPPO' : h.sprayWide >= 32 ? 'SPRAY' : 'STRAIGHTAWAY'
  const power = h.ev >= cuts.ev[1] ? 'MASHER' : h.ev <= cuts.ev[0] ? 'PUNCHER' : 'THUMPER'
  const name = nameOf(angle, power, where)
  const say = `${ANGLES[angle]}, ${SPRAYS[where][1]}, ${POWERS[power]}`.toUpperCase()
  const badges = []
  if (h.splash >= 2) badges.push('SPLASH HITTER')
  if (h.hr >= 5 && h.hrFt >= 410) badges.push('NO-DOUBTER')
  else if (h.hr >= 5 && h.short >= 0.3) badges.push('WALL SCRAPER')
  const share = (k) => (h.outHere ? k / h.outHere : 0)
  if (h.alley >= 2 && share(h.alley) >= 1 / 6) badges.push('TRIPLES ALLEY TAMER')
  if (h.line >= 0.2) badges.push('LINE HUGGER')
  if (h.outHere >= 3 && h.rfLine / h.outHere > 0.5) badges.push('CHEAP PORCH')
  if (h.outHere >= 3 && share(h.bleach) >= 0.6) badges.push('BLEACHER BUM')
  if (h.arcade >= 3 && share(h.arcade) >= 1 / 3) badges.push('ARCADE GAMER')
  if (h.evMax >= 112) badges.push('EXIT-VELO KING')
  if (h.oppoOut >= 2 && share(h.oppoOut) >= 0.2) badges.push('OPPO BOMBER')
  if (h.sides > 1) badges.push('SWITCH-HITTER')
  if (h.hr >= 5 && h.hr / h.n >= 0.4) badges.push('ALL OR NOTHING')
  return { name, angle, where, power, say, badges }
}
