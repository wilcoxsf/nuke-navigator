// What the Dojo shouts. A swing is sorted into a state (nuke, splash hit, wall scraper, ...); each state has headline options (a string, or a list of "beats"
// that appear one by one while the ball is in the air, ending on the landing) and sub-lines that fill in the numbers.
// Tokens: {ft} landing distance, {ev} exit speed, {la} launch angle, {peak} peak height, {hang} hang time, {clear} feet over the wall,
// {short} feet under the wall top, {dir} direction label, {zone} part of the park, {wall} wall height.
// No flags, no narrator, no "about"; every line is a prediction, not a measurement.

export const STATES = {
  GONE: {
    label: 'HOME RUN', tone: 'gone',
    heads: [
      ['IT...', 'IS...', 'OUTTA HERE!'], ['BACK...', 'BACK...', 'GONE!'], ['GOING...', 'GOING...', 'GONE!'], ['WAY BACK...', 'WAY BACK...', 'SEE YA!'],
      ['DEEP...', 'DEEPER...', 'BYE BYE BASEBALL!'], ['THERE IT GOES...', 'AND IT\'S...', 'GONE!'], ['UP...', 'UP...', 'AND OUT!'], ['LOOK OUT...', 'BELOW...', 'DINGER!'],
      'OUTTA HERE!', 'SEE YA!', 'GONE!', 'BYE BYE BASEBALL!', 'TATER TIME!', 'DINGER!', 'PACK IT UP!', 'LONG GONE!', 'CHICKEN DINNER!', 'BOMBS AWAY!',
      'TOUCH \'EM ALL!', 'SO LONG, SPHERE!', 'THAT BALL HAS A NEW HOME', 'TOSSED THE SALAD OVER THE WALL', 'GOODBYE, HORSEHIDE', 'DOWNTOWN!', 'DEEP AND GONE', 'THE WALL SAYS HELLO, THEN GOODBYE',
    ],
    subs: ['{ft} ft, {clear} ft over the wall', '{ev} mph at {la} degrees: gone', 'Clears the wall by {clear} ft', 'Peak {peak} ft, lands {ft} ft out', '{hang} s in the air, {ft} ft of it sideways'],
  },
  NUKE: {
    label: 'NUKE', tone: 'nuke',
    heads: [
      ['IT...', 'IS...', 'ORBITAL!'], ['THE BALL...', 'HAS LEFT...', 'THE ZIP CODE!'], ['BRACE...', 'BRACE...', 'NUCLEAR!'],
      'NUCLEAR!', 'ABSOLUTELY NUKED', 'CALL NASA', 'GEOLOGICAL EVENT', 'SEISMIC!', 'THAT\'S A PROJECTILE, NOT A BASEBALL', 'NOBODY ASKED FOR THIS MUCH BALL',
      'EVACUATE THE BLEACHERS', 'A TREATY WAS VIOLATED', 'CLEARED THE WALL, THE STREET AND THE FUTURE', 'RETURN-TO-SENDER IS NOT AN OPTION', 'ICBM DINGER', 'THE STADIUM FILED A COMPLAINT',
    ],
    subs: ['{ft} ft, {clear} ft over the wall', 'A {ev} mph launch. The air itself had questions', 'Peak {peak} ft: that is a small hill of ball', 'Cleared by {clear} ft with room to spare, and then some more room'],
  },
  SPLASH: {
    label: 'SPLASH HIT', tone: 'splash',
    heads: [
      ['IT...', 'IS...', 'SPLASH!'], ['OVER THE ROOF...', 'AND INTO...', 'THE BAY!'], ['KAYAKERS...', 'LOOK UP...', 'SPLASH HIT!'],
      'SPLASH HIT!', 'SPLASH!', 'McCOVEY COVE, YOU\'RE UP', 'KAYAK ALERT', 'GONE SWIMMING', 'BAY BAPTISM', 'SAILED INTO THE BAY', 'CANNONBALL!', 'THE FISH ARE CONFUSED',
      'SOMEONE IN A KAYAK JUST GOT RICH', 'FROM THE PLATE TO THE POND', 'DIVE DIVE DIVE', 'THE BAY HAS ACCEPTED YOUR OFFERING',
    ],
    subs: ['Over the right-field arcade and into the water: {ft} ft', 'Splash hit, {ft} ft, cleared the wall by {clear} ft', '{ev} mph, {la} degrees, wet', 'Peak {peak} ft, then a long way down'],
  },
  SCRAPER: {
    label: 'WALL SCRAPER', tone: 'scraper',
    heads: [
      ['IT...', 'IS...', 'JUST ENOUGH!'], ['CLIPPING...', 'THE TOP...', 'GONE!'], ['DOES IT...', 'DOES IT...', 'BARELY!'],
      'BARELY!', 'JUST ENOUGH!', 'SCRAPED IT!', 'BY A WHISKER!', 'COUNTS!', 'FRINGE DINGER!', 'WALL SCRAPER!', 'CLOSEST SHAVE', 'THE SLIMMEST OF MARGINS', 'HOME RUN BY A HAIRCUT', 'AND NOT A FOOT TO SPARE',
    ],
    subs: ['Clears the wall by {clear} ft. That counts', '{ft} ft: over by the width of a bat', 'A {wall} ft wall, cleared by {clear} ft', 'Every inch of the {ft} ft was needed'],
  },
  WALL: {
    label: 'OFF THE WALL', tone: 'wall',
    heads: [
      ['DEEP...', 'DEEP...', 'OFF THE WALL!'], ['IT\'S...', 'GOING...', 'THUD!'],
      'OFF THE WALL!', 'THUD!', 'RANG IT!', 'DOUBLE OFF THE BRICK', 'THE WALL SAYS NO', 'BRICKED IT!', 'THE WALL GOT A PIECE', 'CLANG!', 'WARNING TRACK POWER', 'WALL BALL!', 'ONE HOP OFF THE PADDING',
    ],
    subs: ['Hits the wall {short} ft below the top', '{ft} ft out, {wall} ft of wall, short by {short} ft', '{ev} mph, {la} degrees: a double, maybe more', 'Height at the wall: {cross} ft; the wall is {wall} ft'],
  },
  CLOSE: {
    label: 'SO CLOSE', tone: 'close',
    heads: [
      ['IT...', 'IS...', 'SO CLOSE!'], ['UP...', 'UP...', 'ARGH!'],
      'SO CLOSE!', 'INCHES!', 'THE WALL WON', 'BY THIS MUCH', 'ARGH!', 'HEARTBREAK ON THE WARNING TRACK', 'A FOOT SHORT', 'THE WALL BLINKED. NOT ENOUGH', 'NEARLY HISTORY',
    ],
    subs: ['Short by {short} ft', 'Hit the wall {short} ft under the top', '{ft} ft: one more mph and it is gone', 'Missed the top of the wall by {short} ft'],
  },
  FLY: {
    label: 'IN PLAY', tone: 'play',
    heads: [
      'CAN OF CORN', 'NOBODY\'S HOME RUN', 'DEEP, NOT DEEP ENOUGH', 'GLOVE WORK', 'LAZY FLY', 'OUT. PROBABLY.', 'SAFE IN THE GLOVE', 'THE OUTFIELDER SAYS HI', 'HANGS UP, COMES DOWN', 'WARNING-TRACK FLY',
      ['UP...', 'UP...', 'AND DOWN.'], ['HIGH...', 'AND...', 'CAUGHT.'],
    ],
    subs: ['{ft} ft, {hang} s of hang time', 'In play: {ft} ft, wall at {wallft} ft', '{ev} mph at {la} degrees, short of the wall', 'Peak {peak} ft; lands {ft} ft out'],
  },
  WARNING: {
    label: 'WARNING TRACK', tone: 'play',
    heads: ['WARNING TRACK!', 'RUNNING OUT OF ROOM', 'THE OUTFIELDER FEELS DIRT', 'DEEP! AND HE\'S THERE', 'TRACK POWER'],
    subs: ['{ft} ft: {short} ft from the wall', 'Dies on the warning track, {ft} ft', '{ev} mph at {la} degrees; a few feet more and it is gone'],
  },
  LINER: {
    label: 'LINE DRIVE', tone: 'play',
    heads: ['LASER!', 'ROPED IT!', 'LINE-DRIVE LASER', 'HIT ON A WIRE', 'HIT IT AT SOMEBODY', 'RIPPED, AND RIGHT AT HIM'],
    subs: ['{ev} mph, {la} degrees: a rope', 'Line drive, {ft} ft', '{hang} s from bat to ground'],
  },
  GROUNDER: {
    label: 'GROUND BALL', tone: 'play',
    heads: ['WORM BURNER', 'DIRT BALL', 'ROLLER', 'TWO-HOPPER', 'TOPPED IT'],
    subs: ['{ev} mph at {la} degrees: all dirt', 'Ground ball, {ft} ft', 'Nothing in the air worth a mention'],
  },
  POPUP: {
    label: 'POP-UP', tone: 'play',
    heads: ['POP-UP!', 'PRAYER TO THE SKY', 'INFIELD FLY, PLEASE', 'ALL ALTITUDE, NO ATTITUDE', 'SKY-HIGH, GOING NOWHERE'],
    subs: ['Peak {peak} ft, lands {ft} ft out', '{hang} s of hang time for a {ft} ft ball', '{la} degrees: too much loft'],
  },
  FOUL: {
    label: 'FOUL BALL', tone: 'foul',
    heads: [
      ['OH...', 'IT\'S...', 'FOUL.'], ['FAIR...', 'FAIR...', 'FOUL!'],
      'FOUL BALL!', 'WRONG SIDE OF THE LINE', 'A GIFT FOR A FAN', 'CATCH IT, KID!', 'FOUL TERRITORY', 'STRIKE, ACTUALLY', 'HOOKED IT', 'SLICED INTO THE STANDS', 'FAIR? NOPE', 'THE LINE WAS RIGHT THERE',
    ],
    subs: ['Foul by {off} degrees', '{ft} ft of foul ball', '{ev} mph, {la} degrees: the line wins', 'Peak {peak} ft, off to the {side}'],
  },
  POLE: {
    label: 'FAIR BY A HAIR', tone: 'scraper',
    heads: [['FAIR...', 'OR FOUL...', 'POLE!'], 'FAIR BY A HAIR!', 'POLE DANCER!', 'THE POLE SAYS FAIR', 'A COAT OF PAINT AWAY', 'HUGS THE POLE'],
    subs: ['Within {off} degrees of the pole at {ft} ft', 'Comes down at the foul pole: {ft} ft', 'Fair, foul or neither, depending on paint'],
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
