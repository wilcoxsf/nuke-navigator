// THE SONG SLOTS (9 Nov, Andrew's picks from new-songs.html: "I want basically only songs"). Which song plays after a landing. The songs themselves are short
// chiptune clips in the git-ignored public/songs_private.json (copyrighted: the private friends' site only), built by Documents/NukeNavigator/songbook.
// Rare things always win (tier A, first match). The common ones (night games, September, Mondays...) would play after most home runs and starve the rest, so
// they go into a weighted draw with the landing moment's own song and the default (BYE BYE, BABY! for a Giants home run, LIKE A ROLLING STONE's chorus for an
// opponent's at Oracle). The draw is seeded by the ball, so the same real home run always gets the same song. A song missing from the file is skipped.
const MOMENT_SONG = { dog: 'hounddog', gull: 'billiejean', glove: 'hotline', hotdog: 'greenonions', seal: 'lobster', pinata: 'sexcandy', ufo: 'bodysnatchers', hatch: 'psycho',
  zap: 'sawlight', mole: 'apunk', claw: 'oye', hand: 'blackmagic', pinball: 'getaround', tornado: 'twist', mushroom: 'crazy', nuked: 'crazy', cove: 'water' }
export const SONG_NAMES = { getlucky: 'GET LUCKY', starboy: 'STARBOY', bluemonday: 'BLUE MONDAY', hounddog: 'HOUND DOG', billiejean: 'BILLIE JEAN', traininvain: 'TRAIN IN VAIN',
  hotline: 'HOTLINE BLING', greenonions: 'GREEN ONIONS', taxman: 'TAXMAN', freefallin: "FREE FALLIN'", underpressure: 'UNDER PRESSURE', reaper: "(DON'T FEAR) THE REAPER",
  lobster: 'ROCK LOBSTER', weeps: 'WHILE MY GUITAR GENTLY WEEPS', howitfeels: "YOU DON'T KNOW HOW IT FEELS", partitura: 'A.M. 180', sexcandy: 'SEX AND CANDY',
  femme: 'FEMME FATALE', bodysnatchers: 'BODYSNATCHERS', rollingstone: 'LIKE A ROLLING STONE', psycho: 'PSYCHO KILLER', theregoes: 'THERE SHE GOES AGAIN',
  sawlight: 'I SAW THE LIGHT', roxanne: 'ROXANNE', blister: 'BLISTER IN THE SUN', water: 'WATER NO GET ENEMY', consent: 'AGE OF CONSENT', marquee: 'MARQUEE MOON',
  apunk: 'A-PUNK', sevennation: 'SEVEN NATION ARMY', oye: 'OYE COMO VA', blackmagic: 'BLACK MAGIC WOMAN', getaround: 'I GET AROUND', california: "CALIFORNIA DREAMIN'",
  september: 'SEPTEMBER', lowrider: 'LOW RIDER', superstition: 'SUPERSTITION', rehab: 'REHAB', ymca: 'Y.M.C.A.', saturdaynight: "SATURDAY NIGHT'S ALRIGHT",
  bennie: 'BENNIE AND THE JETS', park: 'SATURDAY IN THE PARK', satisfaction: 'SATISFACTION', twist: 'TWIST AND SHOUT', crazy: 'CRAZY TRAIN', centerfield: 'CENTERFIELD',
  piece: 'PIECE OF MY HEART', dock: 'THE DOCK OF THE BAY', caroline: 'SWEET CAROLINE', byebye: 'BYE BYE, BABY!', moveonup: 'MOVE ON UP', entertainer2: 'THE ENTERTAINER',
  imperial2: 'THE IMPERIAL MARCH', sf: 'I LEFT MY HEART IN SAN FRANCISCO' }
// the weights in the draw (Andrew, 9 Nov: SUPERSTITION "is a banger let's have more often")
const W = { superstition: 3, moment: 2, def: 1, roxanne: 0.6, september: 0.8 }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return ((h >>> 0) % 100000) / 100000 }

// c: { hr, key, ft, b (the real ball, or null for your own swing), giants (a Giants batter), stamp (WALK-OFF, GO-AHEAD, GRAND SLAM...), off (off the menu), hang (s),
//      odds (the model's chance, 0-1), goneN (parks it is gone in, of 30), here (gone at Oracle), moment (the landing moment's name), nearMiss, poleMiss, loss, second }
// have(id): is that song in the file. Returns { id, why } or null.
export function songFor(c, have) {
  const b = c.b, A = (id, why) => (have(id) ? { id, why } : null)
  if (!c.hr) {
    if (c.key === 'WALL') return A('piece', 'off the wall, stays in')
    if (c.nearMiss) return A('satisfaction', 'a near miss')
    if (c.poleMiss) return A('weeps', 'a foul that just misses the pole')
    return null
  }
  const day = b?.d ? new Date(b.d + 'T12:00:00Z').getUTCDay() : null, mon = b?.d ? Number(String(b.d).slice(5, 7)) : null, dom = b?.d ? Number(String(b.d).slice(8, 10)) : null
  const opp = b ? (c.giants ? (b.tb === 'Top' ? b.ht : b.at) : (b.tb === 'Top' ? b.at : b.ht)) : null // the other side from the batter's team
  const night = b?.tm ? Number(String(b.tm).slice(0, 2)) >= 17 : null
  const vsDodgers = !!b && ((b.ht === 'SF' && b.at === 'LAD') || (b.ht === 'LAD' && b.at === 'SF')), dodgerHR = vsDodgers && !c.giants
  // tier A: first match wins
  const tierA = [
    [c.stamp && /WALK-OFF/.test(c.stamp), 'sf', 'a walk-off'],
    [dodgerHR, 'imperial2', 'a Dodger home run against the Giants'],
    [c.giants && vsDodgers, 'rehab', 'a Giants home run against the Dodgers'],
    [c.odds != null && c.odds < 0.1, 'getlucky', 'the model gave it under one in ten'],
    [c.second, 'theregoes', "the batter's second home run of the game"],
    [c.stamp === 'GO-AHEAD', 'moveonup', 'a go-ahead home run'],
    [c.here && c.goneN === 1, 'howitfeels', 'gone only here, in no other park'],
    [b && b.park === 'BOS', 'caroline', 'a home run at Fenway'],
    [c.off, 'entertainer2', 'off the menu'],
    [c.hang >= 7, 'starboy', 'a moonshot, seven seconds or more in the air'],
    [c.key === 'SPLASH' && c.giants, 'dock', 'a Giants splash into the Cove'],
    [day === 5 && dom === 13, 'superstition', 'Friday the 13th'],
  ]
  for (const [ok, id, why] of tierA) if (ok) { const r = A(id, why); if (r) return r }
  // tier B: a weighted draw among everything that fits
  const pool = []
  const add = (ok, id, why, w = 1) => { if (ok && have(id)) pool.push({ id, why, w: W[id] ?? w }) }
  add(b && b.in >= 9, 'reaper', 'the ninth inning or later')
  add(b && b.in === 7, 'sevennation', 'the seventh inning')
  add(b && b.sk === 2, 'underpressure', 'two strikes')
  add(c.hang >= 6 && c.hang < 7, 'freefallin', 'six seconds in the air')
  add(b && b.la < 22, 'lowrider', 'a line drive')
  add(day === 5, 'superstition', 'a Friday')
  add(day === 1, 'bluemonday', 'a Monday')
  add(day === 6 && night === true, 'saturdaynight', 'a Saturday night game')
  add(day === 6 && night === false, 'park', 'a Saturday day game')
  add(c.giants && ['SD', 'LAA', 'OAK', 'ATH'].includes(opp), 'california', 'against the Padres, Angels or A\'s')
  add(b && b.temp >= 85, 'blister', 'a hot day')
  add(night === true, 'roxanne', 'under the lights')
  add(mon === 9, 'september', 'September')
  add(c.giants && c.loss, 'traininvain', 'a Giants home run in a loss')
  const ms = MOMENT_SONG[c.moment]; if (ms) add(true, ms, 'the ' + c.moment + ' moment', W.moment)
  if (b && c.giants) add(true, 'byebye', 'a Giants home run', W.def)
  else if (b && b.park === 'SF') add(true, 'rollingstone', "an opponent's home run at Oracle", W.def)
  if (!pool.length) return null
  const tot = pool.reduce((s, x) => s + x.w, 0)
  let r = hash(b ? `${b.gm}|${b.b}|${b.in}|${b.ft}` : `${c.ft}|${c.hang}|${c.moment}`) * tot
  for (const x of pool) { r -= x.w; if (r <= 0) return { id: x.id, why: x.why } }
  return { id: pool[pool.length - 1].id, why: pool[pool.length - 1].why }
}
export { MOMENT_SONG }
