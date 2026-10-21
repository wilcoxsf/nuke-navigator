// What the Dojo shouts. Heads are Andrew's approved lines from the text review (21 Oct 2026); FLY and POP-UP had every line rejected, so they carry plain words. A swing is sorted into a state (nuke, splash hit, wall scraper, ...); each state has headline options (a string, or a list of "beats"
// that appear one by one while the ball is in the air, ending on the landing) and sub-lines that fill in the numbers.
// Tokens: {ft} landing distance, {ev} exit speed, {la} launch angle, {peak} peak height, {hang} hang time, {clear} feet over the wall,
// {short} feet under the wall top, {dir} direction label, {zone} part of the park, {wall} wall height.
// No flags, no narrator, no "about"; every line is a prediction, not a measurement.

export const STATES = {
  GONE: {
    label: 'HOME RUN', tone: 'gone',
    heads: [['IT...', 'IS...', 'OUTTA HERE!'], 'IT IS NOT COMING BACK', 'CERTIFIED DINGER', 'SO LONG, SPHERE', 'BYE BYE BASEBALL'],
    subs: ['{ft} ft, {clear} ft over the wall'],
  },
  NUKE: {
    label: 'NUKE', tone: 'nuke',
    heads: [['IT...', 'IS...', 'ORBITAL!'], ['THE BALL...', 'HAS LEFT...', 'THE ZIP CODE!'], 'CALL THE AUTHORITIES', 'GEOLOGICAL EVENT', 'THAT BALL HAS A PASSPORT NOW'],
    subs: ['{ft} ft, {clear} ft over the wall'],
  },
  SPLASH: {
    label: 'SPLASH HIT', tone: 'splash',
    heads: [['IT...', 'IS...', 'IN THE COVE!'], ['KAYAKERS...', 'LOOK UP...', 'SPLASH HIT!'], 'GONE SWIMMING', 'CANNONBALL'],
    subs: ['{ft} ft, into the water'],
  },
  SCRAPER: {
    label: 'WALL SCRAPER', tone: 'scraper',
    heads: [['IT...', 'IS...', 'JUST ENOUGH!'], 'BY THE SKIN OF ITS SEAMS'],
    subs: ['Clears the wall by {clear} ft'],
  },
  WALL: {
    label: 'OFF THE WALL', tone: 'wall',
    heads: ['A DOUBLE, PROBABLY', 'WALL BALL', 'THE WALL HELD'],
    subs: ['{ft} ft out, short of the top by {short} ft'],
  },
  CLOSE: {
    label: 'SO CLOSE', tone: 'close',
    heads: [['IT...', 'IS...', 'NOT QUITE OUT OF HERE!'], 'INCHES!', 'THE WALL WON'],
    subs: ['Short of the top by {short} ft'],
  },
  FLY: {
    label: 'FLY BALL', tone: 'play',
    heads: ['IN PLAY'],
    subs: ['{ft} ft, {hang} s of hang time'],
  },
  WARNING: {
    label: 'WARNING TRACK', tone: 'play',
    heads: ['DIRT UNDERFOOT'],
    subs: ['{ft} ft, close to the wall'],
  },
  LINER: {
    label: 'LINE DRIVE', tone: 'play',
    heads: ['DIRECTLY AT SOMEBODY'],
    subs: ['{ev} mph at {la} degrees'],
  },
  GROUNDER: {
    label: 'GROUND BALL', tone: 'play',
    heads: ['WORM BURNER', 'DIRT BALL'],
    subs: ['{ev} mph at {la} degrees'],
  },
  POPUP: {
    label: 'POP-UP', tone: 'play',
    heads: ['POP FLY'],
    subs: ['Peak {peak} ft, lands {ft} ft out'],
  },
  FOUL: {
    label: 'FOUL BALL', tone: 'foul',
    heads: ['WRONG SIDE OF THE LINE', 'HOOKED IT'],
    subs: ['Foul by {off} degrees'],
  },
  POLE: {
    label: 'FAIR BY A HAIR', tone: 'scraper',
    heads: ['POLE ALERT'],
    subs: ['Within {off} degrees of the pole'],
  },
}

export function countCallouts() {
  return Object.values(STATES).reduce((n, s) => n + s.heads.length, 0)
}

// Sorts a swing into a state. `res` is the Dojo flight result, `landing` is where a homer or foul came down ('STANDS' | 'SPLASH' | 'STREET' | null).
export function classify(res, state, landing, wallFt = 0) {
  const v = res.verdict
  const off = Math.abs(res.landB) - 45
  if (v.kind === 'GONE') {
    if (landing === 'SPLASH') return 'SPLASH'
    if (res.landFt >= 460 || (v.clearBy >= 60 && state.ev >= 108)) return 'NUKE'
    if (v.clearBy < 4) return 'SCRAPER'
    return 'GONE'
  }
  if (v.kind === 'WALL') return v.short < 3 ? 'CLOSE' : 'WALL'
  if (v.kind === 'FOUL') return v.wallFt && Math.abs(off) < 1.5 ? 'POLE' : 'FOUL' // the pole needs a ball that reached the wall
  // in play
  if (state.la < 10) return 'GROUNDER'
  if (state.la > 50) return 'POPUP'
  if (state.la < 25 && state.ev >= 92) return 'LINER'
  if (wallFt && res.landFt >= wallFt - 25) return 'WARNING' // came down within 25 ft of the wall
  return 'FLY'
}

export function pickHead(stateKey, rng, recent) {
  const heads = STATES[stateKey].heads
  let i = 0
  for (let k = 0; k < 8; k++) { i = Math.floor(rng() * heads.length); if (!recent.includes(`${stateKey}:${i}`)) break }
  recent.push(`${stateKey}:${i}`)
  while (recent.length > 24) recent.shift()
  const h = heads[i]
  return Array.isArray(h) ? h : [h]
}

export function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : vars[k]))
}

export function pickSub(stateKey, rng) {
  const subs = STATES[stateKey].subs
  return subs[Math.floor(rng() * subs.length)]
}
