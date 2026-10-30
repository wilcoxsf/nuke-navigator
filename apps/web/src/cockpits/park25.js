// Study 25 park life (Oracle only): the scoreboard behind center field is a live LED board, and pixel seagulls circle the outfield the way they gather late at Oracle,
// scattering when a ball leaves the park. The board shows two lines of text (the batter, TRACKING, the distance, HOME RUN flashing), and on top of that plays a
// library of pixel animations (28 Oct, Andrew: "can we code a bunch of fun ones?"), each fired by what just happened:
//   CRAZY CRAB (a wall scraper or a ball just short)   SEA LION (a splash hit)   SPLASH ODOMETER (the splash count rolls over)   CABLE CAR (430 ft or more)
//   KARL (the fog eats the board)   GULL HEIST and GOLDEN GATE (idle)   GOLF SHOT, TOMAHAWK, CHASE SCENE, INSIDE JOB (the four OFF THE MENU home runs)
//   WALK-OFF   GRAND SLAM   GO-AHEAD and TIES IT (a scoreline flip)   MOONSHOT   TWEAK THE TATER   SO CLOSE (a dojo swing that just missed)
// The board is 72 x 36 LEDs of 0.61 m, sized to the screen of Oracle's own board in the park model; the animations use the middle 22 rows.
// One animation plays at a time, with at most two waiting.
// Over the board, the ORACLE PARK sign and its clock are bulbs too (29 Oct): the sign glows and reacts to home runs, the clock tells the time of the swing.
// Later on 29 Oct the sign and its clock were rebuilt in voxels from a photo of the real one, with the eight World Series pennants above (Q2, Q3; the bulbs are Q1).
import { FONT } from './vox25.js'
export function initPark25(api, col, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const at = (bear, r, h) => { const b = (bear * Math.PI) / 180; return toWorld([r * Math.sin(b), r * Math.cos(b), h]) }
  const parts = []

  // ---- the LED board: a buffer of color codes per LED, drawn as round bulbs ----
  // the logic grid is 72 x 22 (every animation is drawn on it); the board itself has GHT rows, the logic rows centered with dark rows above and below
  const GW = 72, GH = 22, GHT = 36, ROW0 = 7, S = 10, LED = 0.614, LEDH = 0.611, SH = Math.round((S * LEDH) / LED)
  const buf = new Uint8Array(GW * GH)
  const grid = document.createElement('canvas'); grid.width = GW; grid.height = GH
  const gx = grid.getContext('2d', { willReadFrequently: true })
  const out = document.createElement('canvas'); out.width = GW * S; out.height = GHT * SH
  const ox = out.getContext('2d')
  const tex = new THREE.CanvasTexture(out); tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace
  const board = new THREE.Mesh(new THREE.PlaneGeometry(GW * LED, GHT * LEDH), new THREE.MeshBasicMaterial({ map: tex, fog: false, side: THREE.DoubleSide }))
  // it replaces Oracle's own board (28 Oct, Andrew: 'wire that puppy in directly over it'): the real board in the park model sits between the two light towers, from
  // 28 Oct, night remeasure (Andrew: still higher than the real board), by casting rays at the park model from in front of it: the screen is a flat face 149 m out,
  // from 8 degrees left to 9 right and 13 to 35 m up (the bits at 36 to 52 m are the ORACLE PARK sign and its clock, which the first measure took for the board).
  // This one covers exactly that face (44 m by 22 m, centered half a degree right and 24 m up), a hair in front of it, with square LEDs 0.61 m across
  // 29 Oct, evening (Andrew: "Scoreboard is off center"): centred between the light towers (bearing 0) instead of on the model's own screen (half a degree right), whose
  // geometry is cut out now (c25.js)
  const bearing = o.boardBearing ?? 0, bh = o.boardH ?? 24
  board.position.copy(at(bearing, o.boardR ?? 148.4, bh))
  board.lookAt(at(bearing, 0, bh))
  scene.add(board)

  // ---- the board in voxels (29 Oct, evening, Andrew: "I think we should have it be voxel now that everything else is ... Give me like 3-4 basic voxel options"); G:
  //   1 CUBES: every LED a cube; the lit ones step forward a little   2 RELIEF: the lit ones stand out of the board, so the animations come off it in 3D
  //   3 FLIP DOTS: every LED a tile that flips over, dark side to color side, when it changes, like an old flip-dot board   4 BULBS: the flat bulb board from before
  // G1 to G3 sit in a dark voxel frame. The same 72 by 36 LEDs, the same animations
  const vboard = new THREE.Group(), bcube = new THREE.BoxGeometry(1, 1, 1), bd = new THREE.Object3D()
  vboard.position.copy(at(bearing, 148.35, bh)); vboard.lookAt(at(bearing, 0, bh)); scene.add(vboard)
  const NLED = GW * GHT, leds = new THREE.InstancedMesh(bcube, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), NLED)
  const ledX = (i) => (i + 0.5 - GW / 2) * LED, ledY = (j) => (GHT / 2 - j - 0.5) * LEDH
  leds.frustumCulled = false // its bounding sphere was taken before the LEDs were placed (red team)
  vboard.add(leds)
  {
    const fr = [], FV = 0.6, w = (GW * LED) / 2 + FV / 2, h = (GHT * LEDH) / 2 + FV / 2
    for (let x = -w; x <= w + 0.01; x += FV) fr.push([x, h], [x, -h])
    for (let y = -h + FV; y < h - 0.01; y += FV) fr.push([-w, y], [w, y])
    const fm = new THREE.InstancedMesh(bcube, new THREE.MeshLambertMaterial({ color: '#2b2e33', flatShading: true }), fr.length)
    fr.forEach(([x, y], i) => { bd.position.set(x, y, 0.1); bd.rotation.set(0, 0, 0); bd.scale.set(FV, FV, 0.9); bd.updateMatrix(); fm.setMatrixAt(i, bd.matrix) })
    vboard.add(fm)
    const back = new THREE.Mesh(bcube, new THREE.MeshBasicMaterial({ color: '#070707', fog: false })); back.scale.set(GW * LED, GHT * LEDH, 0.1); back.position.z = -0.25; vboard.add(back)
  }
  let gStyle = o.boardStyle ?? 1
  const ledK = new Int8Array(NLED).fill(-1), flipT = new Float32Array(NLED).fill(1), flipFrom = new Array(NLED).fill('#161616'), flipTo = new Array(NLED).fill('#161616')
  const bc = new THREE.Color()
  function placeLed(n, k, colr) {
    const i = n % GW, j = Math.floor(n / GW)
    bd.rotation.set(0, 0, 0)
    if (gStyle === 1) { bd.position.set(ledX(i), ledY(j), k ? 0.16 : 0); bd.scale.set(LED * 0.84, LEDH * 0.84, k ? 0.36 : 0.18) }
    else if (gStyle === 2) { const d = k ? 1.1 : 0.16; bd.position.set(ledX(i), ledY(j), d / 2 - 0.08); bd.scale.set(LED * 0.9, LEDH * 0.9, d) }
    else { const f = flipT[n]; bd.position.set(ledX(i), ledY(j), 0.05); bd.rotation.x = f < 1 ? Math.PI * f : 0; bd.scale.set(LED * 0.86, LEDH * 0.86, 0.06) }
    bd.updateMatrix(); leds.setMatrixAt(n, bd.matrix); leds.setColorAt(n, bc.set(colr))
  }
  // only the LEDs whose code changed are touched, unless the palette itself changed (a flash, a theme); 29 Oct red team: every LED was rebuilt every tick
  let palKey = ''
  function paintVoxBoard(P) {
    const pk = P.join(), all = pk !== palKey
    palKey = pk
    let n0 = 0
    for (let n = 0; n < NLED; n++) {
      const i = n % GW, j = Math.floor(n / GW), ly = j - ROW0, k = ly >= 0 && ly < GH ? buf[ly * GW + i] : 0
      if (!all && k === ledK[n] && (gStyle !== 3 || flipT[n] >= 1)) continue
      const colr = k ? P[k] : '#161616'
      n0++
      if (gStyle === 3) { if (k !== ledK[n] && ledK[n] !== -1 && !o.still) { flipFrom[n] = flipTo[n]; flipTo[n] = colr; flipT[n] = 0 } else if (flipT[n] >= 1) flipTo[n] = colr; ledK[n] = k; placeLed(n, k, flipT[n] < 0.5 ? flipFrom[n] : flipTo[n]); continue }
      ledK[n] = k; placeLed(n, k, colr)
    }
    if (n0) { leds.instanceMatrix.needsUpdate = true; leds.instanceColor.needsUpdate = true }
  }
  // the flips turn between board ticks
  let flipping = 0
  function flipStep(dt) {
    if (gStyle !== 3) return
    flipping = 0
    for (let n = 0; n < NLED; n++) if (flipT[n] < 1) { flipT[n] = Math.min(1, flipT[n] + dt / 0.22); flipping++; placeLed(n, ledK[n], flipT[n] < 0.5 ? flipFrom[n] : flipTo[n]) }
    if (flipping) { leds.instanceMatrix.needsUpdate = true; leds.instanceColor.needsUpdate = true }
  }
  const showBoard = () => { board.visible = vis && gStyle === 4; vboard.visible = vis && gStyle !== 4 }

  // ---- the ORACLE PARK sign and the clock over the board (29 Oct, Andrew: "breathe some life back into that"; the clock right for the moment) ----
  // Measured from in front like the board: the clock face is a disc 148.5 m out, dead center, 39.25 m up, 5.6 m across; the letters run 43 to 45.7 m up, from 3.75 degrees left
  // to 3.5 right. Both become bulbs like the board's, a hair in front of the model. The sign: ORACLE PARK in 5x7 bulbs between two rows of chaser bulbs. Idle it glows
  // bone, a gleam crosses it now and then and a bulb or two twinkles; a home run lights the letters in the accent one by one while the chasers run; a walk-off blinks the
  // lot; Karl dims it. The clock: twelve hour bulbs, sixty minute dots, bulb hands. DEJA-VU sets it to when the ball was hit and the hands spin back to it; the dojo runs
  // it on the time in San Francisco now, with a second hand.
  const SW = 67, SHT = 11, SP = 0.32, SS = 8, WORD = 'ORACLE PARK', LETS = []
  {
    const w = [...WORD].reduce((a, ch) => a + FONT[ch][0].length + 1, -1)
    let x = Math.floor((SW - w) / 2)
    ;[...WORD].forEach((ch, li) => { const g = FONT[ch]; g.forEach((r, y) => [...r].forEach((c, i) => { if (c === '#') LETS.push([x + i, y + 2, li]) })); x += g[0].length + 1 })
  }
  const sCan = document.createElement('canvas'); sCan.width = SW * SS; sCan.height = SHT * SS
  const sx = sCan.getContext('2d'), sTex = new THREE.CanvasTexture(sCan); sTex.colorSpace = THREE.SRGBColorSpace
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(SW * SP, SHT * SP), new THREE.MeshBasicMaterial({ map: sTex, fog: false, side: THREE.DoubleSide }))
  sign.position.copy(at(-0.12, 148.2, 44.35)); sign.lookAt(at(-0.12, 0, 44.35)); scene.add(sign)
  let sfx = null, gleam = null, gleamT = 8, fogged = false, signs = 0, vis = true
  showBoard()
  const lit = new Set(LETS.map(([x, y]) => x + ',' + y))
  function paintSign(dt) {
    const c = col()
    if (sfx) { sfx.t += dt; if (sfx.t > sfx.dur) sfx = null }
    if (!sfx && !gleam && (gleamT -= dt) <= 0) { gleam = { t: 0 }; gleamT = 22 + Math.random() * 16 }
    if (gleam && (gleam.t += dt) > 1.4) gleam = null
    sx.fillStyle = '#050505'; sx.fillRect(0, 0, sCan.width, sCan.height)
    const dim = fogged ? 0.45 : 1, t = sfx?.t ?? 0, twk = Math.floor(performance.now() / 260)
    const bulb = (x, y, colr, on) => { sx.globalAlpha = on ? dim : 1; sx.fillStyle = on ? colr : '#1a1a1a'; sx.beginPath(); sx.arc(x * SS + SS / 2, y * SS + SS / 2, SS * (on ? 0.44 : 0.28), 0, Math.PI * 2); sx.fill(); sx.globalAlpha = 1 }
    // the chasers: dark dots at rest; running in the accent on a home run, fast on a walk-off
    for (const y of [0, SHT - 1]) for (let x = 0; x < SW; x++) {
      const on = sfx && (x + (y ? 1 : 0) + Math.floor(t * (sfx.kind === 'walk' ? 22 : 12))) % 3 === 0
      bulb(x, y, c.acc, !!on)
    }
    for (let y = 1; y < SHT - 1; y++) for (let x = 0; x < SW; x++) if (!lit.has(x + ',' + y)) bulb(x, y, '', false)
    for (const [x, y, li] of LETS) {
      let k = c.tx
      if (sfx?.kind === 'hr') k = t > 0.15 + li * 0.13 ? c.acc : c.tx
      else if (sfx?.kind === 'walk') k = Math.floor(t * 6) % 2 ? c.acc : '#ffffff'
      else if (gleam && Math.abs(x - 2 * y - (gleam.t / 1.4) * (SW + 24) + 12) < 3) k = '#ffffff'
      else if ((x * 7 + y * 13 + twk) % 97 === 0) k = '#ffffff'
      bulb(x, y, k, true)
    }
    sTex.needsUpdate = true
  }

  // ---- THE REAL SIGN (Q2 and Q3; 29 Oct, later, Andrew sent a photo of it: "it should just be straight up in the model already ... if we have to cut off that part of the
  // model and make this voxel I'm fine with it"). The model's own sign is left out of the wire (main.js) and rebuilt in voxels from the photo: ORACLE PARK in tall
  // condensed slab-serif letters, cream faces inside a red neon outline, standing on the green steel arch over the board, which follows a curve so the middle letters
  // sit highest; two green columns either side of the clock and two farther out hold it up; the eight World Series pennants (1905 to 2014; the old ones black with
  // orange years, 2010, 2012 and 2014 orange with black) fly from poles above it. Q2 is the sign by day, Q3 at night (the neon brighter, a tube that flickers).
  // Local frame: x to the right as seen from home plate, y up (metres above the field), z toward home; the group stands 148.1 m out, dead center.
  const VX = 0.176
  const GLYPH = {
    O: ['.#####.', ...Array(13).fill('##...##'), '.#####.'],
    R: ['######.', '.##..##', '.##..##', '.##..##', '.##..##', '.##..##', '.#####.', '.##.##.', '.##..##', '.##..##', '.##..##', '.##..##', '.##..##', '.##..##', '###.###'],
    A: ['..###..', '..###..', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##', '###.###'],
    C: ['.#####.', '##...##', '##...##', ...Array(9).fill('##.....'), '##...##', '##...##', '.#####.'],
    L: ['####...', ...Array(12).fill('.##....'), '.##...#', '#######'],
    E: ['#######', '.##..##', '.##...#', '.##....', '.##....', '.##..#.', '.#####.', '.##..#.', '.##....', '.##....', '.##....', '.##....', '.##...#', '.##..##', '#######'],
    P: ['######.', '.##..##', '.##..##', '.##..##', '.##..##', '.##..##', '.#####.', ...Array(7).fill('.##....'), '####...'],
    K: ['###.###', '.##..#.', '.##.##.', '.##.#..', '.####..', '.###...', '.###...', '.####..', '.##.#..', '.##.##.', '.##..#.', '.##..##', '.##..##', '.##...#', '###.###'],
  }
  const vsign = new THREE.Group(), vcube = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D()
  vsign.position.copy(at(0, 148.1, 0)); vsign.lookAt(at(0, 0, 0)); scene.add(vsign)
  const archY = (x) => 43.0 - 0.0022 * x * x // the top of the arch beam
  // the letters: cells of each glyph (faces), and the ring of cells around them (the neon outline)
  const cells = [] // [x, y, kind 0 face 1 rim, letter]
  {
    const pitch = 10, space = 5, word = [...'ORACLE PARK']
    const total = word.reduce((a, ch) => a + (ch === ' ' ? space : pitch), 0) - 1
    let cx = -total / 2
    word.forEach((ch, li) => {
      if (ch === ' ') { cx += space; return }
      const g = GLYPH[ch], on = (i, j) => j >= 0 && j < 15 && i >= 0 && i < 7 && g[j][i] === '#'
      const midX = (cx + 4.5) * VX, base = archY(midX) + 0.18
      for (let j = -1; j <= 15; j++) for (let i = -1; i <= 7; i++) {
        const face = on(i, j), rim = !face && [-1, 0, 1].some((a) => [-1, 0, 1].some((b) => on(i + a, j + b)))
        if (face || rim) cells.push([(cx + 1 + i) * VX, base + (15 - j) * VX, rim ? 1 : 0, li])
      }
      cx += pitch
    })
  }
  const lmat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })
  const letters = new THREE.InstancedMesh(vcube, lmat, cells.length)
  cells.forEach(([x, y, k], i) => { dummy.position.set(x, y, k ? 0.04 : 0.1); dummy.scale.set(VX, VX, k ? VX * 1.6 : VX * 2); dummy.updateMatrix(); letters.setMatrixAt(i, dummy.matrix); letters.setColorAt(i, new THREE.Color(k ? '#d42a2f' : '#f1e4c4')) })
  vsign.add(letters)
  // the steel: the arch in stepped voxels, a thin rail behind the letters, the four columns, the clock's bezel
  const steel = []
  const SV = 0.35
  for (let x = -26; x <= 26.001; x += SV) { const y = Math.round(archY(x) / SV) * SV; steel.push([x, y - SV / 2, -0.1, SV], [x, y - SV * 1.5, -0.1, SV], [x, y - SV * 2.5, -0.1, SV]) }
  for (let x = -10.5; x <= 10.5; x += VX) steel.push([x, 45.35, -0.32, VX])
  for (const cx of [-3.6, 3.6, -12.2, 12.2]) for (let y = 35.3; y < archY(cx) - SV * 3; y += SV) steel.push([cx, y, -0.15, SV])
  for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; steel.push([Math.sin(a) * 3.05, 39.25 + Math.cos(a) * 3.05, 0.05, 0.32]) }
  const smat = new THREE.MeshLambertMaterial({ color: '#2d5d4f', flatShading: true })
  const beams = new THREE.InstancedMesh(vcube, smat, steel.length)
  steel.forEach(([x, y, z, w], i) => { dummy.position.set(x, y, z); dummy.scale.setScalar(w); dummy.updateMatrix(); beams.setMatrixAt(i, dummy.matrix) })
  vsign.add(beams)
  // the pennants (29 Oct, evening, Andrew sent two photos of them: "mirror those better"): the championship years. The old New York ones are black with the year and
  // the interlocking NY in orange; 2010, 2012 and 2014 are orange with the year and the SF in black; the first says EST. 1883. A pole each, a flag of 25 by 10 cubes;
  // they wave, more toward the free end
  const DIG = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '..#', '..#', '..#'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'] }
  // the logos, 5 by 7: the NY (the N's two posts with the Y's arms meeting in the middle, its stem below) and the SF (the S with the F's bar through it)
  const LOGO = { NY: ['#...#', '##.##', '#.#.#', '#.#.#', '#.#.#', '..#..', '.###.'], SF: ['.####', '#.#..', '.###.', '..#.#', '####.', '..#..', '..#..'] }
  const YEARS = [1883, 1905, 1921, 1922, 1933, 1954, 2010, 2012, 2014], FX = 0.11, FC = 25, FR = 10
  const flags = []
  const pmat = new THREE.MeshLambertMaterial({ color: '#c9ced3', flatShading: true })
  YEARS.forEach((yr, f) => {
    const px = -22.4 + f * 5.6, top = 52.2 - Math.abs(px) * 0.05, foot = archY(px)
    const pole = new THREE.Mesh(vcube, pmat); pole.scale.set(0.2, top + 0.3 - foot, 0.2); pole.position.set(px, (top + 0.3 + foot) / 2, -0.55); vsign.add(pole)
    const knob = new THREE.Mesh(vcube, fmatL('#d9b44a')); knob.scale.setScalar(0.22); knob.position.set(px, top + 0.42, -0.55); vsign.add(knob)
    const old = yr < 2000, bg = old ? '#141414' : '#fd5a1e', fg = old ? '#fd5a1e' : '#141414', txt = String(yr), logo = LOGO[old ? 'NY' : 'SF']
    const m = new THREE.InstancedMesh(vcube, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), FC * FR)
    let n = 0
    for (let r = 0; r < FR; r++) for (let c = 0; c < FC; c++) {
      const dc = c - 1, di = Math.floor(dc / 4), dx = dc % 4, dr = r - 3, lc = c - 18, lr = r - 2
      const ink = (dc >= 0 && di < 4 && dx < 3 && dr >= 0 && dr < 5 && DIG[txt[di]][dr][dx] === '#') || (lc >= 0 && lc < 5 && lr >= 0 && lr < 7 && logo[lr][lc] === '#')
      const est = yr === 1883 && r === 1 && c >= 1 && c <= 5 && c !== 2 && c !== 4 // a short underline-like mark over the year: EST., as far as 25 cubes allow
      const edge = old && (r === 0 || r === FR - 1 || c === FC - 1) // the black ones keep an orange hem, or they vanish on the night sky
      m.setColorAt(n++, new THREE.Color(ink || est || edge ? fg : bg))
    }
    vsign.add(m)
    flags.push({ m, px, top, ph: f * 0.9 })
  })
  function fmatL(c) { return new THREE.MeshLambertMaterial({ color: c, flatShading: true }) }
  let wave = 0
  // the wind (29 Oct, night, the wind layer sets it): { fromDeg, mph, cfDeg? }, fromDeg the compass direction it blows from; the pennants turn to stream downwind and
  // flutter harder and droop less as it picks up. cfDeg is the compass bearing from home plate to center field (about 75 at Oracle unless the caller says better);
  // with no wind set they wave gently along the sign as before
  const CF_DEG = 75
  let windNow = null, wdx = 1, wdz = 0, wAmp = 0.42, wFreq = 3.1, wDroop = 0.18
  function setWind(w) {
    windNow = w && Number.isFinite(w.fromDeg) && Number.isFinite(w.mph) ? { ...w } : null
    if (!windNow) { wdx = 1; wdz = 0; wAmp = 0.42; wFreq = 3.1; wDroop = 0.18; return }
    const ang = ((windNow.fromDeg + 180 - (windNow.cfDeg ?? CF_DEG)) * Math.PI) / 180 // downwind, clockwise from straight out to center field
    wdx = Math.sin(ang); wdz = -Math.cos(ang) // the sign's frame: x to the right as seen from home, z toward home
    const m = Math.min(1.8, Math.max(0.25, windNow.mph / 8))
    wAmp = 0.42 * m; wFreq = 3.1 * (0.6 + Math.min(2, windNow.mph / 12)); wDroop = 0.18 * Math.max(0.1, 1.2 - windNow.mph / 12)
  }
  function waveFlags(t) {
    wave = 0
    for (const fl of flags) {
      let n = 0
      for (let r = 0; r < FR; r++) for (let c = 0; c < FC; c++) {
        const k = (c + 1) / FC, u = FX * (c + 0.5), z = (o.still ? 0 : wAmp) * k * Math.sin(c * 0.4 - t * wFreq + fl.ph + r * 0.12), y = fl.top - FX * (r + 0.5) - wDroop * k * k
        dummy.position.set(fl.px + 0.1 + u * wdx - z * wdz, y, -0.55 + u * wdz + z * wdx); dummy.scale.setScalar(FX); dummy.updateMatrix(); fl.m.setMatrixAt(n++, dummy.matrix)
        wave += Math.abs(z)
      }
      fl.m.instanceMatrix.needsUpdate = true
    }
  }
  waveFlags(0)
  // the letters' colors each tick: cream faces and red neon by day (Q2), brighter neon at night with one tube that flickers (Q3); a gleam crosses the faces now and
  // then; a home run lights the outline in the accent letter by letter and flashes the faces; a walk-off blinks it all; Karl dims it
  const tmpC = new THREE.Color()
  let q = o.signStyle ?? 2, flick = -1, flickT = 0
  function paintVox(dt) {
    if (sfx) { sfx.t += dt; if (sfx.t > sfx.dur) sfx = null }
    if (!sfx && !gleam && (gleamT -= dt) <= 0) { gleam = { t: 0 }; gleamT = 22 + Math.random() * 16 }
    if (gleam && (gleam.t += dt) > 1.4) gleam = null
    const c = col(), night = q === 3, dim = fogged ? 0.55 : 1, t = sfx?.t ?? 0
    if (night && (flickT -= dt) <= 0) { flick = flick < 0 ? Math.floor(Math.random() * 10) : -1; flickT = flick < 0 ? 3 + Math.random() * 6 : 0.5 + Math.random() * 0.8 }
    const face0 = night ? '#fff4dc' : '#f1e4c4', rim0 = night ? '#ff3b3b' : '#d42a2f'
    // the few colors of the moment, parsed once a tick (red team: a string parse per cell per tick)
    const CC = {}, cc = (h) => (CC[h] ??= (() => { const x = new THREE.Color(h); if (dim !== 1) x.multiplyScalar(dim); return x })())
    cells.forEach(([x, y, k, li], i) => {
      let h = k ? rim0 : face0
      if (sfx?.kind === 'hr') { if (k && t > 0.15 + li * 0.13) h = c.acc; else if (!k && t > 0.15 + li * 0.13 && t < 0.45 + li * 0.13) h = '#ffffff' }
      else if (sfx?.kind === 'walk') h = Math.floor(t * 6) % 2 ? (k ? c.acc : '#ffffff') : h
      else if (!k && gleam && Math.abs(x / VX - 2 * (y - 43) / VX - ((gleam.t / 1.4) * 140 - 70)) < 4) h = '#ffffff'
      if (night && k && li === flick && Math.random() < 0.6) h = '#5a1414'
      letters.setColorAt(i, cc(h))
    })
    letters.instanceColor.needsUpdate = true
  }

  const showSign = () => { sign.visible = vis && q === 1; vsign.visible = vis; letters.visible = q !== 1; if (clockRef) clockRef.visible = vis && q === 1; if (vclockRef) vclockRef.visible = q !== 1 }
  let vclockRef = null, clockRef = null
  showSign()
  const CR = 2.85, CPX = 256
  const cCan = document.createElement('canvas'); cCan.width = cCan.height = CPX
  const cx = cCan.getContext('2d'), cTex = new THREE.CanvasTexture(cCan); cTex.colorSpace = THREE.SRGBColorSpace
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(CR, 48), new THREE.MeshBasicMaterial({ map: cTex, fog: false, side: THREE.DoubleSide }))
  clockFace.position.copy(at(0, 148.3, 39.25)); clockFace.lookAt(at(0, 0, 39.25)); scene.add(clockFace); clockRef = clockFace; clockFace.visible = q === 1
  // the time shown, in minutes after midnight (fractional); spin: a sweep from one time to another; live: the time in San Francisco, updated every paint
  const SF_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
  const sfNow = () => { const p = Object.fromEntries(SF_FMT.formatToParts(new Date()).map((x) => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60 }
  let clk = { shown: sfNow(), live: true, spin: null }
  function setClock(s) {
    if (!s || s.live) { clk = { shown: clk.shown, live: true, spin: { from: clk.shown, to: sfNow(), t: 0, dur: 0.9 } }; return }
    const [h, m] = String(s.hm).split(':').map(Number), to = h * 60 + m
    if (!isFinite(to)) return
    // back in time: the hands always run backward, at least once round, to the moment it was hit
    let d = ((clk.shown - to) % 720 + 720) % 720; if (d < 60) d += 720
    clk = { shown: clk.shown, live: false, hm: s.hm, spin: o.still ? null : { from: clk.shown, to: clk.shown - d, t: 0, dur: 1.5 }, target: to }
    if (o.still) clk.shown = to
  }
  // the voxel clock (29 Oct, evening, Andrew: "I want the clock to be a voxel clock"), for the real sign: a pale pink face of cubes, the red band round it with a white
  // dot every minute, the hours in black 3 by 5 digits, and the hands as bars of cubes that turn (the green bezel is the steel ring above); in the dojo a thin red
  // second hand. It sits in the sign's own frame, over the clock's place
  const vclock = new THREE.Group(); vclock.position.set(0, 39.25, 0.12); vsign.add(vclock); vclockRef = vclock
  {
    const face = [], ring = [], dots = [], nums = [], CV = 0.2
    for (let y = -2.9; y <= 2.9; y += CV) for (let x = -2.9; x <= 2.9; x += CV) { const r = Math.hypot(x, y); if (r < 2.55) face.push([x, y, 0]); else if (r < 2.95) ring.push([x, y, 0.02]) }
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; dots.push([Math.sin(a) * 2.75, Math.cos(a) * 2.75, 0.1]) }
    const NV = 0.13
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2, cx0 = Math.sin(a) * 2.05, cy0 = Math.cos(a) * 2.05, ds = String(h), w = ds.length * 4 - 1
      ;[...ds].forEach((ch, k) => DIG[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') nums.push([cx0 + (k * 4 + i - (w - 1) / 2) * NV, cy0 + (2 - j) * NV, 0.1]) })))
    }
    const put = (list, size, color, depth = size) => { const m = new THREE.InstancedMesh(vcube, new THREE.MeshLambertMaterial({ color, flatShading: true }), list.length); list.forEach(([x, y, z], i) => { dummy.position.set(x, y, z); dummy.scale.set(size, size, depth); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }); vclock.add(m); return m }
    put(face, CV, '#f3dfe3', 0.12); put(ring, CV, '#d8482e', 0.16); put(dots, 0.1, '#fbe9e9'); put(nums, NV, '#1a1a1a')
    const hand = (len, wd, color, z) => { const g = new THREE.Group(), list = []; for (let y = -0.3; y <= len; y += wd * 0.8) list.push([0, y, 0]); const m = new THREE.InstancedMesh(vcube, new THREE.MeshLambertMaterial({ color, flatShading: true }), list.length); list.forEach(([x, y], i) => { dummy.position.set(x, y, 0); dummy.scale.set(wd, wd * 0.9, 0.1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix) }); g.add(m); g.position.z = z; vclock.add(g); return g }
    vclock.userData.hands = [hand(1.35, 0.26, '#141414', 0.22), hand(2.15, 0.18, '#141414', 0.3), hand(2.3, 0.07, '#d42a2f', 0.36)]
    const cap = new THREE.Mesh(vcube, new THREE.MeshLambertMaterial({ color: '#141414', flatShading: true })); cap.scale.set(0.34, 0.34, 0.2); cap.position.z = 0.42; vclock.add(cap)
  }
  function turnVoxClock() {
    const m = ((clk.shown % 720) + 720) % 720, [hh, mm, ss] = vclock.userData.hands
    hh.rotation.z = -(m / 720) * Math.PI * 2; mm.rotation.z = -((m % 60) / 60) * Math.PI * 2
    ss.visible = clk.live && !clk.spin; ss.rotation.z = -(((clk.shown * 60) % 60) / 60) * Math.PI * 2
  }
  function paintClock(dt) {
    const c = col(), R = CPX / 2
    if (clk.spin) { const sp = clk.spin; sp.t += dt; const k = ease(sp.t / sp.dur); clk.shown = sp.from + (sp.to - sp.from) * k; if (sp.t >= sp.dur) { clk.spin = null; clk.shown = clk.live ? sfNow() : clk.target } }
    else if (clk.live) clk.shown = sfNow()
    const dimA = fogged ? 0.5 : 1
    if (q !== 1) { turnVoxClock(); return } // the voxel clock (the canvas one is the bulbs')
    cx.fillStyle = '#050505'; cx.fillRect(0, 0, CPX, CPX)
    const dot = (a, r, rad, colr) => { cx.fillStyle = colr; cx.beginPath(); cx.arc(R + Math.sin(a) * r, R - Math.cos(a) * r, rad, 0, Math.PI * 2); cx.fill() }
    cx.globalAlpha = dimA
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; if (i % 5) dot(a, R * 0.86, 3, '#3a3a3a'); else dot(a, R * 0.86, i ? 8 : 10, i ? c.tx : c.acc) }
    const hand = (a, len, step, rad, colr) => { for (let r = 14; r <= len; r += step) dot(a, r, rad, colr) }
    const m = ((clk.shown % 720) + 720) % 720
    hand((m / 720) * Math.PI * 2, R * 0.46, 11, 7, c.tx)
    hand(((m % 60) / 60) * Math.PI * 2, R * 0.7, 10, 5.5, c.tx)
    if (clk.live && !clk.spin) hand((((clk.shown * 60) % 60) / 60) * Math.PI * 2, R * 0.74, 9, 3, c.acc)
    dot(0, 0, 9, c.acc)
    cx.globalAlpha = 1
    cTex.needsUpdate = true
  }
  // palette: a = the text color of the moment (accent, or bone while flashing), o = accent, w = bone, then fixed colors for the sprites
  const FIX = { b: '#5fd3ff', y: '#f2bc40', r: '#e4002b', g: '#8a8f99', n: '#a8713f', d: '#4a4f58' }
  const CODES = ' aowbyrgnd'
  const ci = (ch) => Math.max(0, CODES.indexOf(ch))
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = ci(ch) }
  const off = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = 0 }
  const rect = (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, ch) }
  const line = (x0, y0, x1, y1, ch) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch) }
  // a sprite at double size (the rivalry's players)
  const big = (spr, x, y) => { for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) { const c = spr[j][i]; if (c !== '.' && c !== ' ') { put(x + i * 2, y + j * 2, c); put(x + i * 2 + 1, y + j * 2, c); put(x + i * 2, y + j * 2 + 1, c); put(x + i * 2 + 1, y + j * 2 + 1, c) } } }
  const blit = (spr, x, y, flip = false) => { for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) { const c = spr[j][flip ? spr[j].length - 1 - i : i]; if (c !== '.' && c !== ' ') put(x + i, y + j, c) } }
  // text in Press Start 2P at 8 px (8 LEDs tall); clip = [y0, y1) keeps only those rows (the odometer roll)
  const tw = (s) => { gx.font = '8px PS2P'; return Math.round(gx.measureText(s).width) }
  // x = 'c' centers it, or loops it sideways when it is wider than the board (on the animation's clock)
  let animT = 0
  function text(s, x, y, ch = 'a', clip = null) {
    gx.clearRect(0, 0, GW, GH); gx.fillStyle = '#fff'; gx.font = '8px PS2P'; gx.textBaseline = 'top'
    if (x === 'c') { const w = tw(s); if (w <= GW - 2) x = Math.round((GW - w) / 2); else { x = Math.round(2 - ((animT * 26) % (w + 24))); gx.fillText(s, x + w + 24, y) } }
    gx.fillText(s, x, y)
    const px = gx.getImageData(0, 0, GW, GH).data
    for (let j = 0; j < GH; j++) { if (clip && (j < clip[0] || j >= clip[1])) continue; for (let i = 0; i < GW; i++) if (px[(j * GW + i) * 4 + 3] > 110) buf[j * GW + i] = ci(ch) }
  }
  let lines = ['NUKE NAVIGATOR', ''], color = null, flash = 0, scroll = 0, marquee = true
  const ready = document.fonts?.load?.('8px PS2P').catch(() => {}) ?? Promise.resolve()
  // the two lines of text: centered when they fit, scrolling when they do not (or in the idle marquee)
  function drawLines() {
    const row = (s, y) => { if (!s) return; const w = tw(s); if (marquee || w > GW - 2) text(s, GW - (scroll % (w + 24 + GW)), y); else text(s, 'c', y) }
    if (lines[1]) { row(lines[0], 2); row(lines[1], 12) } else row(lines[0], 7)
  }
  function paint() {
    const c = col(), on = flash > 0 && Math.floor(flash * 6) % 2 ? c.tx : color ?? c.acc
    const P = [null, on, c.acc, c.tx, FIX.b, FIX.y, FIX.r, FIX.g, FIX.n, FIX.d]
    if (gStyle !== 4) { paintVoxBoard(P); return }
    ox.fillStyle = '#050505'; ox.fillRect(0, 0, out.width, out.height)
    for (let y = 0; y < GHT; y++) for (let x = 0; x < GW; x++) {
      const ly = y - ROW0, k = ly >= 0 && ly < GH ? buf[ly * GW + x] : 0
      ox.fillStyle = k ? P[k] : '#1a1a1a'
      ox.beginPath(); ox.ellipse(x * S + S / 2, y * SH + SH / 2, S * (k ? 0.44 : 0.3), SH * (k ? 0.44 : 0.3), 0, 0, Math.PI * 2); ox.fill()
    }
    tex.needsUpdate = true
  }

  // ---- the sprites (one character per LED: o accent, w bone, b water, y gold, r red, g grey, n brown, d dark grey) ----
  const GIANT = ['.oo.', '.ww.', 'oooo', '.oo.', '.oo.', '.dd.', 'd..d'], DODGER = ['.bb.', '.ww.', 'bwwb', '.ww.', '.ww.', '.dd.', 'd..d']
  const SPR = {
    crab: [['rr...........rr', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '.r.r.r...r.r.r.', 'r.r.r.....r.r.r'],
      ['.rr.........rr.', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '..r.r.r.r.r.r..', '.r.r.r...r.r.r.']],
    seal: [['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'gggggggggggg..', 'gggggggggggg..', '.ggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
      ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'ggggggggggggg.', '......gggggg..', 'gggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg']],
    gull: [['w.....w', '.w...w.', '..www..'], ['..www..', '.w...w.', 'w.....w']],
    fries: ['.y.y.y.', 'yy.y.yy', 'yyyyyyy', 'rrrrrrr', 'rwrwrwr', 'rrrrrrr', '.rrrrr.'],
    ball: ['.www.', 'wrwrw', 'wwwww', 'wrwrw', '.www.'],
    legs: [['w...w'], ['.w.w.']],
    glove: ['.n.n.n..', 'nnnnnnn.', 'nnnnnnnn', 'nnyyynnn', 'nnnnnnnn', '.nnnnnn.', '..nnnn..'],
    player: [['.w.', 'www', '.w.', 'w.w', 'w.w'], ['.o.', 'ooo', '.o.', 'o.o', 'o.o']],
    rocket: ['..w..', '.www.', '.www.', '.wbw.', '.www.', 'wwwww', 'w.w.w'],
    potato: ['...nnnnnn...', '.nnnnnnnnnn.', 'nnnynnnnnynn', 'nnnnnnnnnnnn', 'nnynnnnynnnn', 'nnnnnnnnnnnn', '.nnnnnnnynn.', '...nnnnnn...'],
    // the rivalry's players: a Giant (orange cap and jersey) and a Dodger (blue cap, white jersey, blue sleeves); 4 wide, 7 tall, dark legs
    face: ['...wwww...', '.wwwwwwww.', 'wwwwwwwwww', 'ww.ww.wwww', 'wwwwwwwwww', 'wwwwwwwwww', 'www....www', 'ww.wwww.ww', '.wwwwwwww.', '...wwww...'],
  }

  // ---- the animations: each draws a frame at time t (seconds), over dur seconds; a = its arguments ----
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  const water = (t, y0 = 19) => { for (let x = 0; x < GW; x++) { put(x, y0 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); put(x, GH - 1, 'b') } }
  function roll(a, b, x, y, t) { // an odometer: a rolls up and away, b rolls in under it, inside rows y .. y+9
    const k = Math.round(ease(t) * 10)
    text(a, x, y - k, 'o', [y - 1, y + 9]); text(b, x, y + 10 - k, 'o', [y - 1, y + 9])
  }
  // ---- for the rivalry, round two (29 Oct, night, Andrew: "insanely comical 'oh no jesus christ what the fuck that's deranged' gags. Surprise me") ----
  // cue: a sound at a beat, once per run (window.__nnSound, the sound layer; null while peeking, so a peek is silent); a key ending #n repeats a beat (the same sound)
  let fired = null
  const cue = (t, at, key) => { if (fired && t >= at && !fired.has(key)) { fired.add(key); window.__nnSound?.('gag-' + key.replace(/#\d+$/, ''), {}) } }
  const ground = () => line(0, GH - 1, GW - 1, GH - 1, 'd')
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
  const HEADLESS = ['....', '....', 'bwwb', '.ww.', '.ww.', '.dd.', 'd..d']
  const SKEL = ['..wwww..', '.w.ww.w.', '..wwww..', '...ww...', '.wwwwww.', 'w.w..w.w', 'w.wwww.w', '..w..w..', '..wwww..', '...ww...', '..w..w..', '..w..w..', '..w..w..', '.ww..ww.']
  const SHIRT = ['oo..oo', 'oooooo', '.oooo.', '.oooo.']
  // three-by-five letters for small labels (the LAD on the bucket)
  const MINI = { L: ['#..', '#..', '#..', '#..', '###'], A: ['.#.', '#.#', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'] }
  const mini = (s, x, y, ch) => [...s].forEach((c, k) => { const g = MINI[c]; if (g) blit(g.map((r) => r.replace(/#/g, ch)), x + k * 4, y) })
  const ring = (cx, cy, r, ch, sy = 1) => { const n = Math.max(8, Math.round(r * 7)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; put(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy, ch) } }
  const disc = (cx, cy, r, ch, sy = 1) => { const ry = Math.ceil(r * sy), rx = Math.ceil(r); for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x + (y * y) / (sy * sy) <= r * r) put(cx + x, cy + y, ch) }
  const ANIM = {
    crab: { dur: 4.6, draw(t) { const x = -16 + t * 20, f = Math.floor(t * 8) % 2; blit(SPR.crab[f], x, 12); if (Math.floor(t * 3) % 2) text('BOO!', 'c', 1, 'w'); else text('CRAZY CRAB', 'c', 1, 'r') } },
    seal: { dur: 4.2, draw(t) {
      water(t)
      const rise = ease(t / 1.2) - ease((t - 3.2) / 0.8), open = t > 1.3 && t < 2.1
      blit(SPR.seal[open ? 1 : 0], 30, 20 - rise * 11)
      if (t < 2.05) { const k = Math.min(1, t / 2.0); put(30 + k * 2, 1 + k * 11, 'w'); put(31 + k * 2, 1 + k * 11, 'w'); put(30 + k * 2, 2 + k * 11, 'w'); put(31 + k * 2, 2 + k * 11, 'w') }
      if (t > 2.1) text('GULP!', 2, 2, 'w')
    } },
    odometer: { dur: 3.4, draw(t, a) { text('SPLASHES', 'c', 1, 'b'); const n = a?.n ?? 1, s0 = '#' + (n - 1), s1 = '#' + n; roll(s0, s1, Math.round((GW - tw(s1)) / 2), 12, (t - 0.6) / 0.9) } },
    cable: { dur: 5.2, draw(t, a) {
      line(0, 1, GW, 1, 'g')
      const w = 34, x = Math.round(-w + ease(t / 3.4) * (GW / 2 + w / 2) - (t > 4.2 ? (t - 4.2) * 60 : 0))
      line(x + 22, 2, x + 18, 8, 'g')
      rect(x, 8, w, 1, 'w'); rect(x, 9, w, 10, 'r'); for (let i = 2; i < w - 2; i += 4) rect(x + i, 10, 2, 2, 'y')
      text(String(a?.ft ?? ''), x + 5, 12, 'w'); rect(x + 3, 19, 3, 2, 'g'); rect(x + w - 6, 19, 3, 2, 'g')
      line(0, GH - 1, GW, GH - 1, 'd')
      if (t > 3.0 && Math.floor(t * 4) % 2) text('DING', 52, 3, 'y')
    } },
    karl: { dur: 5.4, draw(t) {
      text(lines[0] || 'ORACLE PARK', 'c', 7, 'a')
      const front = (t / 3.2) * (GW + 10)
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (x > front - ((y * 7) % 5)) continue; if ((x + y + Math.floor(t * 6)) % 3) off(x, y); else put(x, y, 'd') }
      if (t > 3.6) text("KARL'S IN", 'c', 7, 'g')
    } },
    gulls: { dur: 5.6, draw(t) {
      const grab = 2.4, f = Math.floor(t * 6) % 2
      if (t < grab + 0.2) blit(SPR.fries, 33, 14)
      const gx0 = t < grab ? -8 + (t / grab) * 42 : 34 + (t - grab) * 22, gy = t < grab ? 2 + (t / grab) * 9 : 11 - (t - grab) * 4
      blit(SPR.gull[f], gx0, gy)
      if (t >= grab) blit(SPR.fries, gx0, gy + 3)
      text(t < grab ? 'GARLIC FRIES' : 'HEY!', t < grab ? 'c' : 4, t < grab ? 1 : 1, t < grab ? 'y' : 'w')
    } },
    bridge: { dur: 8, draw(t) {
      for (const tx of [18, 54]) { line(tx, 3, tx, 18, 'o'); line(tx + 1, 3, tx + 1, 18, 'o') }
      const cab = (x) => (x < 18 ? 3 + ((18 - x) / 18) * 5 : x < 54 ? 3 + 8 * (1 - ((x - 36) / 18) ** 2) : 3 + ((x - 54) / 18) * 5)
      for (let x = 0; x < GW; x++) { put(x, cab(x), 'o'); if (x % 3 === 0 && x !== 18 && x !== 54) line(x, cab(x) + 1, x, 13, 'd') }
      line(0, 14, GW, 14, 'o')
      for (let x = 0; x < GW; x++) if ((x + Math.floor(t * 3)) % 5) put(x, 20, 'b')
      const bx = ((t / 8) * (GW + 10)) - 6; rect(bx, 18, 5, 1, 'w'); put(bx + 2, 17, 'w')
    } },
    golf: { dur: 4.4, draw(t) {
      const sw = t < 1.0 ? -2.6 * ease(t) : -2.6 + 4.2 * ease((t - 1.0) / 0.35), hit = t > 1.2
      put(6, 8, 'w'); put(7, 8, 'w'); put(6, 9, 'w'); put(7, 9, 'w'); line(6, 10, 6, 15, 'w'); line(6, 15, 4, 19, 'w'); line(6, 15, 8, 19, 'w')
      line(6, 11, 6 + Math.sin(sw) * 8, 11 + Math.cos(sw) * 8, 'g')
      line(0, 20, GW, 20, 'd'); put(11, 19, 'y')
      if (!hit) put(11, 18, 'w'); else { const k = Math.min(1, (t - 1.2) / 2.4), x = 11 + k * 58, y = 18 - 4 * 15 * k * (1 - k); put(x, y, 'w') }
      if (t > 2.0) text('FORE!', 38, 3, 'o')
    } },
    tomahawk: { dur: 3.8, draw(t) {
      text('TOMAHAWK', 'c', 1, 'o')
      const th = t < 1.1 ? -1.9 + 0.3 * Math.sin(t * 8) : t < 1.35 ? -1.9 + 1.9 * ease((t - 1.1) / 0.25) : 0
      const px = 26, py = 18, L = 14, hx = px + Math.cos(th) * L, hy = py + Math.sin(th) * L
      line(px, py, hx, hy, 'n'); rect(hx - 1, hy - 2, 4, 4, 'g'); put(hx + 3, hy - 1, 'w'); put(hx + 3, hy, 'w')
      blit(SPR.ball, 41, 15)
      if (t > 1.35 && t < 2.2) for (let i = 0; i < 6; i++) put(42 + Math.cos(i) * (t - 1.35) * 14, 16 - Math.abs(Math.sin(i)) * (t - 1.35) * 12, 'y')
      line(0, 20, GW, 20, 'd')
    } },
    chase: { dur: 4.6, draw(t) {
      text('CHASE SCENE', 'c', 1, 'o')
      const f = Math.floor(t * 10) % 2, bx = ((t * 26) % (GW + 30)) - 8
      blit(SPR.ball, bx, 12); blit(SPR.legs[f], bx, 17)
      blit(SPR.glove, bx - 16 - Math.sin(t * 9) * 1.5, 11)
      for (let i = 1; i < 4; i++) put(bx - 3 - i * 2, 13 + (i % 2), 'g')
      line(0, 19, GW, 19, 'd')
    } },
    insidejob: { dur: 4.8, draw(t) {
      text('INSIDE JOB', 'c', 1, 'o')
      const sx = 26, sy = 8, open = ease((t - 2.4) / 0.5)
      rect(sx, sy, 20, 13, 'g'); rect(sx + 2, sy + 2, 16, 9, 'd')
      if (open < 1) { rect(sx + 2 + open * 16, sy + 2, 16 - open * 16, 9, 'g'); const a = t * 5, dx = sx + 10 + Math.cos(a) * 3, dy = sy + 6 + Math.sin(a) * 3; put(sx + 10, sy + 6, 'w'); put(dx, dy, 'y') }
      if (open >= 1) { const k = Math.min(1, (t - 2.9) / 1.2), x = sx + 8 + k * 26, y = sy + 5 - 9 * k * (1 - k) * 4; blit(SPR.ball, x, Math.min(16, y)) }
    } },
    walkoff: { dur: 5.2, draw(t) {
      if (Math.floor(t * 4) % 2) text('WALK-OFF!', 'c', 1, 'o')
      const hx = 36; put(hx - 1, 20, 'w'); put(hx, 20, 'w'); put(hx + 1, 20, 'w'); put(hx, 21, 'w')
      for (let i = 0; i < 6; i++) { const from = i < 3 ? -6 - i * 6 : GW + 4 + (i - 3) * 6, k = ease(t / 1.6), x = from + (hx - 1 + (i - 2.5) * 3 - from) * k, jump = t > 1.6 ? Math.abs(Math.sin(t * 7 + i)) * 4 : 0; blit(SPR.player[i % 2], x, 14 - jump) }
    } },
    slam: { dur: 5.6, draw(t) {
      const B = [[53, 20], [62, 14], [53, 8], [44, 14]]
      for (let i = 0; i < 4; i++) { const [x0, y0] = B[i], [x1, y1] = B[(i + 1) % 4]; line(x0, y0, x1, y1, 'd') }
      for (const [x, y] of B) rect(x - 1, y - 1, 2, 2, 'w')
      text('GRAND', 0, 2, 'o'); text('SLAM', 0, 12, 'o')
      let home = 0
      for (let r = 0; r < 4; r++) { // the runner on third, second, first, then the batter, each heading home in turn
        const start = 3 - r, k = Math.max(0, Math.min(1, (t - r * 0.9) / 1.2)), legs = r + 1, pos = start + k * legs
        if (k >= 1) { home++; continue }
        const seg = Math.floor(pos) % 4, f = pos - Math.floor(pos), [x0, y0] = B[seg], [x1, y1] = B[(seg + 1) % 4]
        rect(x0 + (x1 - x0) * f - 1, y0 + (y1 - y0) * f - 1, 2, 2, 'o')
      }
      text(String(home), 50, 11, 'y')
    } },
    flip: { dur: 4.4, draw(t, a) {
      text(a?.word ?? 'GO-AHEAD', 'c', 1, 'o')
      // team and runs with no space between (SF5 LAD4) so both fit across 72 LEDs; the batting team's runs roll over
      const bt = a?.bat ?? 'BAT', ft0 = `${a?.fld ?? 'FLD'}${a?.f ?? 0}`, s0 = String(a?.b0 ?? 0), s1 = String(a?.b1 ?? 1)
      const w = tw(bt) + Math.max(tw(s0), tw(s1)), x = Math.round((GW - w - tw(ft0) - 6) / 2)
      text(bt, x, 12, 'w'); roll(s0, s1, x + tw(bt), 12, (t - 1.0) / 0.9); text(ft0, x + w + 6, 12, 'w')
    } },
    moon: { dur: 4.8, draw(t) {
      for (let i = 0; i < 14; i++) { const x = (i * 37) % GW, y = (i * 11) % 18; if ((i + Math.floor(t * 3)) % 4) put(x, y, 'd') }
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) put(62 + x, 6 + y, 'g')
      const k = ease(t / 3.6), rx = 40 + k * 14, ry = 13 - k * 11
      blit(SPR.rocket, rx, ry); const fl = Math.floor(t * 10) % 2; put(rx + 2, ry + 7, fl ? 'o' : 'y'); put(rx + 1, ry + 7 + fl, 'y'); put(rx + 3, ry + 7 + fl, 'o')
      text('MOON', 2, 2, 'w'); text('SHOT', 2, 12, 'o')
    } },
    tater: { dur: 4.4, draw(t) {
      blit(SPR.potato, 4, 8)
      const a = Math.sin(t * 7) * 0.6 - 0.6, cx = 21, cy = 11, ex = cx + Math.cos(a) * 8, ey = cy + Math.sin(a) * 8
      line(cx, cy, ex, ey, 'g'); rect(ex - 1, ey - 1, 3, 3, 'g'); off(ex, ey); put(cx, cy, 'g')
      text('TWEAK', 32, 2, 'o'); text('TATER', 32, 12, 'o')
    } },
    // a ball off the board itself: the text breaks up and its pixels fall off, column by column
    glitch: { dur: 3.6, draw(t) {
      text('HOME RUN', 'c', 7, 'a')
      const snap = Uint8Array.from(buf); buf.fill(0)
      for (let x = 0; x < GW; x++) {
        const d = ((x * 73) % 17) / 17 * 1.1, fall = t < d ? 0 : 30 * (t - d) ** 2
        for (let y = GH - 1; y >= 0; y--) { const k = snap[y * GW + x]; if (!k) continue; const ny = Math.round(y + fall + (Math.sin(x * 9 + t * 40) > 0.7 && t < 0.6 ? 1 : 0)); if (ny < GH) buf[ny * GW + x] = (x + y) % 9 === 0 ? ci('w') : k }
      }
      if (t > 1.5) text('OUCH', 'c', 7, 'w')
    } },
    // ---- THE RIVALRY (29 Oct, later, Andrew: "a giants player fucking up a dodger player ... spy vs. spy shit. Gore, blood"): cartoon slapstick, a generic Giant (orange
    // cap and jersey) against a generic Dodger (blue cap, white jersey), no real players. They play after a Giants home run against the Dodgers, and now and then idle
    // (the players are drawn at double size, 8 by 14 LEDs, standing on row 20)
    anvil: { dur: 4.8, draw(t) {
      const gy = 20, lx = 46
      line(0, gy + 1, GW - 1, gy + 1, 'd')
      big(GIANT, 6, gy - 13)
      line(10, gy - 14, 10, 0, t < 1.0 ? 'g' : 'd'); if (t > 0.8 && t < 1.2) { put(9, 4, 'y'); put(11, 4, 'y'); put(10, 3, 'y') } // he cuts the rope
      const ay = t < 1.0 ? 0 : Math.min(gy - 5, (t - 1.0) ** 2 * 70), hit = ay >= gy - 5
      if (!hit) big(DODGER, lx, gy - 13)
      else {
        rect(lx - 2, gy, 12, 1, 'b'); rect(lx, gy - 1, 8, 1, 'w')
        for (let i = 0; i < 24; i++) { const k = Math.min(1, (t - 1.35) * 2.5), a = (i / 23) * Math.PI; put(lx + 4 + Math.cos(a) * (4 + k * (6 + (i % 4) * 3)), gy - Math.sin(a) * k * (2 + (i % 5) * 2), 'r') }
      }
      rect(lx - 3, ay, 14, 3, 'g'); rect(lx, ay + 3, 8, 2, 'g') // the anvil
      if (hit && t > 1.7) { text('SQUASHED', 'c', 0, 'r'); if (Math.floor(t * 4) % 2) text('HA', 15, 9, 'o') }
    } },
    dynamite: { dur: 5.2, draw(t) {
      const gy = 20, lx = 50
      line(0, gy + 1, GW - 1, gy + 1, 'd')
      big(GIANT, 4, gy - 13)
      const k = Math.min(1, t / 1.2), sx = 13 + k * 38, sy = gy - 10 - Math.sin(k * Math.PI) * 8
      if (t < 2.4) { big(DODGER, lx, gy - 13); rect(sx, sy, 4, 2, 'r'); if (Math.floor(t * 12) % 2) { put(sx + 4, sy - 1, 'y'); put(sx + 5, sy - 2, 'w') } if (t > 1.3) text('?', lx + 9, 4, 'w') }
      else {
        const u = t - 2.4, r = Math.min(14, u * 30), cx = lx + 4, cy = gy - 7
        if (u < 0.7) for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; put(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, i % 3 ? 'y' : 'o'); put(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.4, 'w') }
        // the pieces: the cap, two shoes, a hand, and a lot of red, each on its own arc
        const P = [['b', -2.2, 12], ['b', -1.9, 15], ['w', -1.2, 13], ['d', -0.6, 11], ['d', -2.6, 10], ['w', -0.3, 16], ['r', -1.6, 9], ['r', -1.0, 14], ['r', -2.0, 7], ['r', -0.8, 8], ['r', -1.4, 17], ['r', -2.4, 13]]
        for (const [c, a, v] of P) { const x = cx + Math.cos(a) * v * u * 2.2, y = cy + Math.sin(a) * v * u * 1.6 + 14 * u * u; if (y < gy) { put(x, y, c); put(x + 1, y, c) } else put(x, gy, c) }
        for (let i = 0; i < 16; i++) put(lx - 6 + ((i * 37) % 22), gy, 'r') // the mess on the ground
        if (u > 0.9) text('KA-BOOM', 'c', 0, 'y')
      }
    } },
    bonk: { dur: 5, draw(t) {
      const gy = 20, lx = 34
      line(0, gy + 1, GW - 1, gy + 1, 'd')
      big(GIANT, 18, gy - 13)
      const sw = t < 0.9 ? -2.3 + 0.2 * Math.sin(t * 9) : Math.min(0.5, -2.3 + (t - 0.9) * 14)
      for (const dd of [0, 1]) line(24, gy - 8 + dd, 24 + Math.cos(sw) * 14, gy - 8 + dd + Math.sin(sw) * 14, 'n') // the bat
      if (t < 1.05) big(DODGER, lx, gy - 13)
      else {
        const u = t - 1.05, hx = lx + 2 + u * 30, hy = gy - 13 - 12 * u + 10 * u * u // the head goes for a ride, cap and all
        if (hx < GW) { rect(hx, hy, 4, 2, 'b'); rect(hx, hy + 2, 4, 2, 'w') }
        for (let i = 1; i < 10; i++) { const v = u - i * 0.05; if (v > 0) put(lx + 3 + v * 30, gy - 13 - 12 * v + 10 * v * v + 3, 'r') }
        const fall = Math.min(1, u * 1.2)
        if (fall < 1) { big(['bwwb', '.ww.', '.ww.', '.dd.', 'd..d'], lx, gy - 9); for (let i = 0; i < 3; i++) put(lx + 3 + (i - 1) * Math.sin(u * 20 + i), gy - 11 - ((u * 9 + i * 2) % 5), 'r') } // the fountain
        else { rect(lx - 3, gy, 10, 1, 'w'); rect(lx - 3, gy - 1, 3, 1, 'b'); for (let i = 0; i < 6; i++) put(lx + 7 + i, gy, 'r') }
        if (u > 0.7) text('BONK', 'c', 0, 'o')
      }
    } },
    runover: { dur: 4.8, draw(t) {
      line(0, 20, GW, 20, 'g'); line(0, 21, GW, 21, 'd')
      const hit = 40, w = 28, x = Math.round(-w + (t / 2.6) * (GW + w) * 0.9)
      if (x + w < hit) { big(DODGER, hit, 6); if (Math.floor(t * 3) % 2) text('?!', hit - 2, 0, 'w') }
      else for (let i = 0; i < 18; i++) put(hit - 8 + ((i * 7) % 20), 20 - (i % 2), 'r') // what is left of him on the rails
      rect(x, 6, w, 1, 'w'); rect(x, 7, w, 12, 'r'); for (let i = 2; i < w - 2; i += 4) rect(x + i, 8, 2, 3, 'y'); rect(x + 3, 19, 3, 2, 'g'); rect(x + w - 6, 19, 3, 2, 'g')
      rect(x + 6, 12, 3, 2, 'w'); rect(x + 6, 14, 3, 3, 'o') // the Giant at the grip
      if (x + w >= hit) { rect(x + w - 1, 10, 2, 8, 'r'); put(x + w + 1, 12, 'b'); put(x + w + 1, 13, 'b') }
      if (t > 2.4) text('DING!', 'c', 0, 'y')
    } },
    sealsnack: { dur: 5.2, draw(t) {
      water(t, 16)
      const lx = 40
      if (t < 2.2) { big(['.bb.', '.ww.', 'bwwb'], lx, 11); if (Math.floor(t * 4) % 2) { rect(lx - 2, 9, 2, 2, 'w'); rect(lx + 8, 9, 2, 2, 'w') } text('HELP', 2, 0, 'b') } // a Dodger treading water in the Cove
      const rise = t < 2 ? 0 : t < 2.6 ? (t - 2) / 0.6 : t < 3.4 ? 1 : Math.max(0, 1 - (t - 3.4) / 0.6)
      if (rise > 0) blit(SPR.seal[t > 2.3 && t < 3.0 ? 1 : 0], lx - 3, 20 - rise * 11)
      if (t > 2.6) for (let i = 0; i < 26; i++) put(lx - 8 + ((i * 11) % 26), 16 + (i % 4) + Math.sin(t * 3 + i) * 0.6, 'r') // the water goes red
      if (t > 3.2) text('GULP', 'c', 0, 'w')
      if (t > 1.0) big(GIANT.slice(0, 5), 4, 6) // a Giant on the wall, waving
    } },
    // ---- 29 Oct, evening (Andrew: "more scoreboard animations") ----
    // LASER: a ball hit 112 mph or harder; the beam crosses the board, then the speed
    laser: { dur: 3.4, draw(t, a) {
      const k = ease(t / 0.55), x1 = Math.round(k * GW)
      for (let x = 0; x < x1; x++) { put(x, 11, 'w'); if ((x + Math.floor(t * 30)) % 3) { put(x, 10, 'r'); put(x, 12, 'r') } }
      if (t < 0.6) for (let i = 0; i < 5; i++) put(x1 - i * 3, 11 + ((i % 2) ? -2 : 2), 'y')
      if (t > 0.6) { if (Math.floor(t * 5) % 2) text('LASER', 'c', 1, 'r'); text(`${Math.round(a?.ev ?? 112)} MPH`, 'c', 14, 'w') }
    } },
    // NO DOUBT: a stamp slams down on a home run nobody had to watch land (410 to 430 ft), dust off the bottom edge
    nodoubt: { dur: 3.6, draw(t) {
      if (t < 0.3) { const k = 1 - t / 0.3, m = Math.round(k * 8); rect(4 - m, 4 - m, 64 + 2 * m, 1, 'g'); rect(4 - m, 17 + m, 64 + 2 * m, 1, 'g'); return }
      const sh = t < 0.45 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0
      for (let x = 4; x < 68; x++) { put(x + sh, 4, 'o'); put(x + sh, 17, 'o') } for (let y = 4; y < 18; y++) { put(4 + sh, y, 'o'); put(67 + sh, y, 'o') }
      text('NO DOUBT', 'c', 7, 'o')
      if (t < 1.2) for (let i = 0; i < 10; i++) { const d = (t - 0.3) * 18, ang = (i / 9) * Math.PI; put(36 + Math.cos(ang) * (34 + d), 18 + Math.sin(ang) * d * 0.25, 'g') }
    } },
    // FIREWORKS: a Giants home run at Oracle; three shells go up and break in orange, bone and gold, then the word
    fireworks: { dur: 4.4, draw(t, a) {
      for (const [t0, x, y, c1, c2] of [[0, 16, 6, 'o', 'y'], [0.6, 52, 5, 'w', 'o'], [1.2, 34, 8, 'y', 'w'], [2.0, 24, 7, 'o', 'w'], [2.6, 46, 6, 'y', 'o']]) {
        const u = t - t0
        if (u < 0) continue
        if (u < 0.5) { put(x, GH - 1 - (GH - 1 - y) * (u / 0.5), 'y'); continue }
        const v = u - 0.5, r = Math.min(8, v * 14)
        if (v > 1.4) continue
        for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2; put(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8 + v * v * 3, i % 2 ? c1 : c2); if (r > 3) put(x + Math.cos(ang) * (r - 2), y + Math.sin(ang) * (r - 2) * 0.8 + v * v * 3, c2) }
      }
      if (t > 3.0) text(a?.word ?? 'HOME RUN', 'c', 7, 'o')
    } },
    // KAYAK SCRAMBLE: after a splash hit, the kayaks race for the ball in the Cove; the one from the left gets it
    kayak: { dur: 4.8, draw(t) {
      water(t, 18)
      const by = t < 0.5 ? 2 + (t / 0.5) * 15 : 17, bx = 36
      if (t < 2.9) { put(bx, by, 'w'); put(bx + 1, by, 'w') }
      if (t > 0.5 && t < 0.9) for (let i = 0; i < 6; i++) put(bx + (i - 2.5) * (t - 0.5) * 12, 16 - Math.abs(i - 2.5) * (t - 0.5) * 5, 'w')
      const k = ease((t - 0.6) / 2.3), lx = Math.round(-10 + k * 41), rx = Math.round(GW + 2 - k * 30), f = Math.floor(t * 8) % 2
      const boat = (x, flip) => { rect(x, 17, 9, 1, 'n'); rect(x + 1, 18, 7, 1, 'n'); put(x + 4, 16, 'o'); line(x + 1, f ? 14 : 16, x + 7, f ? 16 : 14, 'y') }
      boat(lx, false); boat(rx, true)
      if (t > 2.9) { put(lx + 4, 15, 'w'); text('GOT IT!', 'c', 2, 'w') } else text('KAYAKS!', 'c', 2, 'b')
    } },
    // DOT RACE (idle): the old scoreboard race, three dots round a track, the crowd's pick decided by a hair
    dotrace: { dur: 6.4, draw(t, a) {
      const seed = a?.seed ?? 7, sp = [0, 1, 2].map((i) => 0.86 + (((seed * (i + 3) * 37) % 17) / 17) * 0.18)
      line(0, 9, GW - 1, 9, 'd'); line(0, 19, GW - 1, 19, 'd'); line(64, 9, 64, 19, 'w')
      const C = ['o', 'w', 'b'], N = ['ORANGE!', 'BONE!', 'BLUE!'], pos = sp.map((v, i) => Math.min(64, 2 + ease(t / 5) * 62 * v + Math.sin(t * 3 + i) * 1.5))
      pos.forEach((x, i) => rect(x, 10 + i * 3, 3, 3, C[i]))
      const win = pos.indexOf(Math.max(...pos))
      if (t < 4.6) text('DOT RACE', 'c', 0, 'y'); else if (Math.floor(t * 5) % 2) text(N[win], 'c', 0, C[win])
    } },
    // THE WAVE (idle): the crowd along the bottom, standing up as the wave goes by
    wave: { dur: 5.2, draw(t) {
      const wx = -6 + (t / 4.6) * (GW + 12)
      for (let x = 1; x < GW; x += 2) { const up = Math.max(0, 1 - Math.abs(x - wx) / 6), h = Math.round(up * 4); put(x, 20 - h, 'w'); put(x, 21 - h, (x / 2) % 3 ? 'o' : 'y'); if (h > 2) { put(x - 1, 19 - h, 'w'); put(x + 1, 19 - h, 'w') } }
      text('THE WAVE', 'c', 2, 'o')
    } },
    // BEACH BALL (idle): one gets loose in the bleachers and bounces along on the crowd's hands
    beachball: { dur: 5.6, draw(t) {
      for (let x = 0; x < GW; x += 3) { put(x, 21, 'g'); put(x + 1, 20, (x / 3) % 2 ? 'w' : 'o') }
      const x = -4 + (t / 5.2) * (GW + 8), hop = (t * 1.6) % 1, y = 16 - 5 * 4 * hop * (1 - hop), r = Math.floor(t * 6) % 4
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10) { const q = (Math.floor(((Math.atan2(j, i) + Math.PI) / (Math.PI / 2)) + r) % 4); put(x + i, y + j, 'wrby'[q]) } // a six-cube ball in four colors, turning
      if (hop < 0.12) { put(Math.round(x) + 1, 19, 'w'); put(Math.round(x) + 2, 19, 'w') }
      text('BOUNCE!', 'c', 1, 'y')
    } },
    soclose: { dur: 4.2, draw(t) {
      blit(SPR.face, 8, 6)
      for (const ex of [10, 13]) { const k = ((t * 1.6 + ex * 0.2) % 1) * 6; put(ex, 10 + k, 'b') }
      text('SO', 32, 2, 'w'); text('CLOSE', 32, 12, 'o')
    } },
    // ---- THE RIVALRY, ROUND TWO (29 Oct, night). His picks from the list of twenty, then eight of mine. Each has a still: the one frame shown under reduced motion ----
    // LEAVES IN THE 3RD: he bolts to beat the traffic; the traffic wins, and by the end he is a skeleton in a cobwebbed car
    leaves3rd: { dur: 6.6, still: 5.4, draw(t) {
      ground()
      if (t < 2.2) {
        cue(t, 0.1, 'leaves3rd-run')
        text(t < 1.1 ? 'BOT 3RD' : 'TO BEAT TRAFFIC', 'c', 0, t < 1.1 ? 'w' : 'b')
        rect(58, 9, 2, 12, 'g'); rect(68, 9, 2, 12, 'g'); line(58, 9, 69, 9, 'g'); for (let x = 61; x < 68; x += 2) line(x, 10, x, 20, 'd') // the gate
        const x = 2 + ease(t / 2.1) * 48, f = Math.floor(t * 10) % 2
        big([...DODGER.slice(0, 6), f ? 'd..d' : '.dd.'], x, 7)
        for (let i = 1; i < 4; i++) put(x - i * 2, 17 + (i % 2), 'g') // his dust
        return
      }
      cue(t, 2.3, 'leaves3rd-honk'); cue(t, 5.0, 'leaves3rd-sad')
      const C = ['r', 'y', 'b', 'w', 'g', 'o']
      C.forEach((c, i) => {
        const x0 = -6 + i * 13
        rect(x0, 15, 12, 4, c); rect(x0 + 3, 11, 6, 4, c); rect(x0 + 4, 12, 4, 2, 'd'); rect(x0 + 1, 19, 2, 2, 'd'); rect(x0 + 9, 19, 2, 2, 'd')
        if (Math.floor(t * 3 + i) % 2) put(x0, 16, 'r') // brake lights
        if (c !== 'b') return
        if (t < 5.0) { put(x0 + 5, 12, 'b'); put(x0 + 5, 13, 'w') } // him at the wheel
        else { put(x0 + 5, 12, 'w'); put(x0 + 6, 12, 'w'); put(x0 + 5, 13, 'w'); put(x0 + 4, 12, 'g'); put(x0 + 7, 13, 'g'); put(x0 + 7, 12, 'g') } // a skull and cobwebs
      })
      text(t < 3.0 ? '5TH' : t < 3.8 ? '7TH' : t < 4.6 ? '9TH' : t < 5.0 ? 'FINAL' : 'STILL HERE', 'c', 0, t < 5.0 ? 'w' : Math.floor(t * 3) % 2 ? 'b' : 'w')
    } },
    // BIPPED: he parks on King Street and walks to the game; a brick, the window, his bag gone, and a gull in the driver's seat honking at him
    bipped: { dur: 6.8, still: 5.0, draw(t) {
      ground()
      const cx = Math.round(-30 + ease(t / 0.9) * 46), smashed = t >= 2.5
      rect(cx, 14, 26, 5, 'b'); rect(cx + 5, 10, 14, 4, 'b'); rect(cx + 2, 19, 4, 2, 'd'); rect(cx + 19, 19, 4, 2, 'd'); put(cx + 25, 15, 'y'); put(cx, 15, 'r')
      if (!smashed) { rect(cx + 6, 11, 12, 2, 'g'); rect(cx + 13, 12, 3, 1, 'y') } // the glass, and his bag on the seat
      else { rect(cx + 6, 11, 12, 2, 'd'); for (const [i, j] of [[6, 11], [8, 12], [11, 11], [17, 12], [15, 11], [17, 11]]) put(cx + i, j, 'w') } // a hole with a jagged rim
      cue(t, 0.6, 'bipped-park')
      if (t > 1.0 && t < 2.3) blit(DODGER, 44 + ((t - 1.0) / 1.2) * 32, 14) // off to the game
      if (t > 2.1 && t < 2.5) { const k = (t - 2.1) / 0.4; rect(70 - k * 48, 2 + k * 9, 2, 2, 'n') } // the brick
      cue(t, 2.5, 'bipped-smash')
      if (smashed && t < 3.3) for (let i = 0; i < 12; i++) { const u = t - 2.5; put(cx + 8 + (i % 6) * 2 + (i - 6) * u * 4, 12 + u * 10 * (0.5 + (i % 3) * 0.3) + u * u * 12, 'w') }
      if (t > 3.0) { const k = ease((t - 3.0) / 0.7); if (k < 1) blit(SPR.gull[Math.floor(t * 8) % 2], -6 + k * (cx + 15), 2 + k * 8); else { rect(cx + 9, 11, 3, 2, 'w'); put(cx + 8, 11, 'y'); put(cx + 10, 11, 'd') } } // the gull takes the wheel
      cue(t, 3.1, 'bipped-gull')
      if (t > 3.6) { const k = ease((t - 3.6) / 0.8); blit(DODGER, 74 - k * 28, 14); if (t > 4.4 && t < 4.7) text('?!', 50, 4, 'w') }
      if (t > 4.7) { cue(t, 4.7, 'bipped-sting'); text('BIPPED', 'c', 0, Math.floor(t * 5) % 2 ? 'r' : 'w') } else if (t < 1.0) text('KING ST', 'c', 0, 'w')
      if (t > 5.6) { cue(t, 5.6, 'bipped-honk'); if (Math.floor(t * 8) % 2) { put(cx + 4, 9, 'y'); put(cx + 3, 8, 'y'); put(cx + 2, 9, 'y') } }
    } },
    // CATAPULT: a trebuchet slings him over the right-field wall into the Cove, where three sea lions in bibs are waiting
    catapult: { dur: 6.4, still: 2.2, draw(t) {
      line(0, GH - 1, 43, GH - 1, 'd')
      rect(44, 8, 3, 14, 'g'); line(44, 8, 46, 8, 'o') // the wall
      for (let x = 47; x < GW; x++) { put(x, 17 + (Math.sin(x * 0.6 + t * 4) > 0.5 ? 0 : 1), 'b'); line(x, 19, x, GH - 1, 'b') }
      line(4, 20, 10, 11, 'n'); line(16, 20, 10, 11, 'n'); line(4, 20, 16, 20, 'n') // the frame
      const a = t < 1.0 ? Math.PI + 0.5 : Math.max(0.9, Math.PI + 0.5 - (t - 1.0) * 7), L = 10, ex = 10 + Math.cos(a) * L, ey = 11 - Math.sin(a) * L
      line(10, 11, ex, ey, 'n'); rect(10 - Math.cos(a) * 4 - 1, 11 + Math.sin(a) * 4 - 1, 3, 3, 'g') // the arm and its counterweight
      blit(GIANT, 20, 14)
      const rel = 1.33
      cue(t, 0.3, 'catapult-creak'); cue(t, 1.0, 'catapult-fling'); cue(t, rel, 'catapult-scream'); cue(t, 2.55, 'catapult-splash'); cue(t, 2.9, 'catapult-chomp'); cue(t, 4.5, 'catapult-burp')
      const flip = Math.floor(t * 10) % 2, me = flip ? DODGER.slice().reverse() : DODGER
      if (t < rel) blit(DODGER.slice().reverse(), ex - 2, ey - 3) // upside down in the sling
      else if (t < 2.55) { const u = (t - rel) / 1.22, x = 12.7 + u * 47, y = 1.4 + u * 15.6 - 30 * u * (1 - u); blit(me, x - 2, y - 3) }
      // the sea lions and their bibs
      const dive = t > 2.75 && t < 4.3
      for (const [i, sx] of [[0, 51], [1, 58], [2, 65]]) { if (dive && i !== 1) continue; if (t > 4.3 && i !== 1) { rect(sx, 14, 3, 3, 'g'); put(sx + 1, 14, 'd'); rect(sx, 17, 3, 1, 'w'); continue } if (dive) continue; rect(sx, 14, 3, 3, 'g'); put(sx + 1, 14, 'd'); rect(sx, 17, 3, 1, 'w') }
      if (t > 2.55 && t < 3.1) for (let i = 0; i < 10; i++) { const u = t - 2.55; put(60 + (i - 5) * u * 10, 17 - u * 18 + u * u * 40, 'w') }
      if (t > 2.8) { const k = Math.min(1, (t - 2.8) / 1.0); for (let x = 50; x < GW; x++) for (let y = 17; y < GH; y++) if (hash(x * 31 + y) < k) put(x, y, 'r') } // the Cove goes red
      if (t > 4.4) { const u = t - 4.4; rect(59 + u * 6, 12 - u * 14 + u * u * 16, 3, 1, 'b') } // his cap, burped up
      text(t < 1.0 ? 'LOAD' : t < 2.6 ? 'FIRE!' : t < 4.4 ? 'DINNER' : 'BURP', 'c', 0, t < 2.6 ? 'o' : 'w')
    } },
    // PIANO: a whistle, a shadow, a grand piano; a sour chord, his legs twitching out from under it, and the keys everywhere
    piano: { dur: 5.6, still: 2.4, draw(t) {
      ground()
      const lx = 32, hitT = 1.42
      const piano = (x, y) => { rect(x, y, 18, 6, 'd'); line(x, y, x + 17, y, 'g'); rect(x, y + 6, 18, 2, 'w'); for (const i of [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16]) put(x + i, y + 6, 'd'); rect(x + 1, y + 8, 1, 3, 'd'); rect(x + 16, y + 8, 1, 3, 'd') }
      cue(t, 0.9, 'piano-whistle')
      if (t < hitT) {
        big(DODGER, lx, 7)
        if (t > 0.6) { const w = Math.round(2 + Math.min(1, (t - 0.6) / 0.8) * 16); rect(lx + 4 - w / 2, GH - 1, w, 1, 'g') } // the shadow
        if (t > 0.5) text('?', lx + 10, 0, 'w')
        piano(lx - 5, Math.round(-12 + Math.max(0, t - 0.9) ** 2 * 80))
        return
      }
      cue(t, hitT, 'piano-drop'); cue(t, 2.3, 'piano-twitch')
      const u = t - hitT, pool = Math.min(24, u * 14)
      rect(lx + 4 - pool, GH - 1, pool * 2 + 1, 1, 'r')
      piano(lx - 5, 10 + (u < 0.15 ? 1 : 0))
      const tw = Math.sin(t * 28) > 0 ? 1 : 0
      line(lx + 13, 20, lx + 17 + tw, 20, 'w'); line(lx + 13, 19, lx + 16 + (1 - tw), 18 + tw, 'w'); put(lx + 18 + tw, 20, 'b'); put(lx + 17 + (1 - tw), 18 + tw, 'b') // his legs
      if (u < 0.9) for (let i = 0; i < 8; i++) put(lx + 4 + (i - 4) * u * 12, 14 - u * 12 * ((i % 3) + 1) + u * u * 30, i % 2 ? 'w' : 'd') // keys
      text(u < 1.2 ? 'PLONK' : 'ENCORE?', 'c', 0, u < 1.2 ? 'w' : 'o')
    } },
    // GUILLOTINE: a drumroll, the blade, his head rolling into a bucket marked LAD, a fountain from the stump, and the crowd does the wave
    guillotine: { dur: 6.6, still: 2.9, draw(t) {
      ground()
      const drop = 1.5, cut = t >= drop + 0.08
      rect(24, 9, 2, 12, 'n'); rect(36, 9, 2, 12, 'n'); rect(24, 8, 14, 1, 'n') // the frame
      const by = t < drop ? 9 : Math.min(12, 9 + (t - drop) * 40)
      rect(26, by, 10, 2, 'g'); for (let i = 0; i < 10; i++) put(26 + i, by + 2 + (i > 4 ? 1 : 0), 'w') // the blade
      rect(2, 17, 22, 2, 'n'); line(4, 19, 4, 20, 'n'); line(21, 19, 21, 20, 'n') // the bench
      rect(4, 15, 6, 2, 'd'); rect(10, 15, 14, 2, 'w'); rect(15, 15, 2, 2, 'b') // him, lying on it
      rect(24, 13, 14, 2, 'n') // the board his neck is through
      rect(43, 14, 15, 7, 'g'); rect(44, 14, 13, 1, 'd'); mini('LAD', 45, 15, 'b') // the bucket
      cue(t, 0.0, 'guillotine-drum'); cue(t, drop, 'guillotine-chop'); cue(t, 2.45, 'guillotine-thunk'); cue(t, 3.4, 'guillotine-cheer')
      if (!cut) { rect(38, 12, 4, 1, 'b'); rect(38, 13, 4, 3, 'w'); put(40, 14, 'd') }
      else {
        const k = Math.min(1, (t - drop - 0.08) / 0.85)
        if (k < 1) { const hx = 38 + k * 12, hy = 12 - 24 * k * (1 - k) + k * 2; rect(hx, hy, 4, 1, 'b'); rect(hx, hy + 1, 4, 3, 'w'); put(hx + 1 + (Math.floor(t * 12) % 2), hy + 2, 'd') }
        else if (t < 3.0) for (let i = 0; i < 8; i++) put(46 + i * 1.5, 13 - (t - 2.45) * 12 * ((i % 3) + 1) + (t - 2.45) ** 2 * 30, 'r')
        if (t < 4.2) for (let i = 0; i < 9; i++) { const s = (t * 2.6 + i / 9) % 1; put(38 + s * 10, 14 - 11 * s + 14 * s * s, 'r'); put(38 + s * 9, 13 - 9 * s + 12 * s * s, 'r') } // the stump
        for (let i = 0; i < Math.min(12, (t - drop) * 6); i++) put(38 + i, 20, 'r')
      }
      if (t > 3.4) { const wx = -6 + ((t - 3.4) / 2.8) * (GW + 12); for (let x = 1; x < GW; x += 2) { const h = Math.round(Math.max(0, 1 - Math.abs(x - wx) / 5) * 4); if (h) { put(x, 21 - h, 'w'); put(x, 22 - h, 'o') } } }
      text(t < drop ? 'LAST WORDS?' : t < 2.6 ? 'CHOP' : t < 3.4 ? 'HEADS UP' : 'THE WAVE!', 'c', 0, t < drop ? 'w' : 'o')
    } },
    // WOOD CHIPPER: feet first; it chews, it shakes, and blue, white and red come out of the chute and over the whole board
    chipper: { dur: 6.4, still: 2.6, draw(t) {
      ground()
      const sh = t > 0.9 && t < 3.8 ? Math.floor(t * 30) % 2 : 0, into = Math.max(0, Math.min(1, (t - 0.5) / 2.6)), hx = 8 + into * 18
      // him, lying, head toward the Giant, feet in the hopper: only what is left of him is drawn (left of x 23)
      const body = [[0, 1, 'b'], [0, 2, 'b'], [2, 0, 'w'], [3, 0, 'w'], [2, 1, 'w'], [3, 1, 'd'], [2, 2, 'w'], [3, 2, 'w']]
      for (let i = 4; i < 10; i++) for (let j = 0; j < 3; j++) body.push([i, j, i === 6 ? 'b' : 'w'])
      for (let i = 10; i < 15; i++) body.push([i, 0, 'd'], [i, 2, 'd'])
      for (const [i, j, c] of body) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = hx * 2 - 8 + i * 2 + a; if (x < 23) put(x, 8 + j * 2 + b, c) }
      big(GIANT, 0, 7)
      rect(26 + sh, 12, 18, 8, 'y'); rect(26 + sh, 15, 18, 1, 'o'); rect(28 + sh, 19, 3, 2, 'd'); rect(39 + sh, 19, 3, 2, 'd') // the chipper
      line(20 + sh, 7, 26 + sh, 12, 'g'); line(20 + sh, 8, 26 + sh, 13, 'g'); rect(18 + sh, 7, 3, 2, 'g') // the hopper
      line(43 + sh, 12, 50 + sh, 5, 'g'); line(44 + sh, 12, 51 + sh, 5, 'g') // the chute
      cue(t, 0.3, 'chipper-start'); cue(t, 0.9, 'chipper-grind'); cue(t, 1.4, 'chipper-spray'); cue(t, 3.8, 'chipper-sputter')
      for (let i = 0; i < 70; i++) {
        const born = 0.9 + (i / 70) * 2.8, u = t - born
        if (u < 0) continue
        const x = 51 + (-55 + hash(i) * 75) * u, y = 5 + (-10 - hash(i + 7) * 16) * u + 22 * u * u
        put(x, Math.min(GH - 1, y), 'bwrr'[i % 4])
      }
      const n = Math.max(0, Math.min(140, Math.round((t - 1.2) * 45))) // on the lens
      for (let i = 0; i < n; i++) put(Math.floor(hash(i + 500) * GW), Math.floor(hash(i + 900) * GH), i % 7 ? 'r' : 'b')
      text(t < 0.9 ? 'FEED ME' : t < 3.8 ? '' : 'MULCHED', 'c', 0, Math.floor(t * 5) % 2 ? 'r' : 'w')
    } },
    // ALCATRAZ: the cell door slams on the Rock, the key goes into the bay, and a seal swallows it
    alcatraz: { dur: 6.6, still: 3.7, draw(t) {
      for (let x = 0; x < GW; x++) { put(x, 18 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); line(x, 20, x, GH - 1, (x + Math.floor(t * 4)) % 9 ? 'b' : 'w') }
      for (let x = 4; x < 38; x++) { const top = 16 - Math.round(1.5 * Math.sin((x - 4) * 0.1) + (x > 30 ? (x - 30) * 0.4 : 0)); line(x, top, x, 18, x % 3 ? 'g' : 'd') } // the Rock
      line(34, 9, 34, 15, 'w'); put(34, 8, Math.floor(t * 2) % 2 ? 'y' : 'd') // the lighthouse
      rect(8, 8, 20, 8, 'w'); rect(12, 9, 10, 6, 'd') // the cell block, one cell open to us
      const rattle = t > 3.7 ? (Math.floor(t * 16) % 2 ? 1 : -1) : 0
      blit(DODGER.slice(0, 6), 15 + rattle, 9)
      const shut = Math.min(1, t / 0.8)
      for (let k = 0; k < 5; k++) line(12 + k * 2 + (1 - shut) * 14, 9, 12 + k * 2 + (1 - shut) * 14, 14, 'g') // the bars slide shut
      blit(GIANT, 29, 9)
      cue(t, 0.75, 'alcatraz-slam'); cue(t, 1.6, 'alcatraz-toss'); cue(t, 2.6, 'alcatraz-plop'); cue(t, 3.3, 'alcatraz-gulp'); cue(t, 4.4, 'alcatraz-foghorn')
      if (t > 1.6 && t < 2.6) { const u = (t - 1.6) / 1.0; rect(32 + u * 24, 11 + u * 7 - 14 * u * (1 - u), 3, 1, 'y'); put(32 + u * 24, 10 + u * 7 - 14 * u * (1 - u), 'y') } // the key
      if (t > 2.6 && t < 3.0) for (let i = 0; i < 6; i++) { const u = t - 2.6; put(56 + (i - 3) * u * 8, 18 - u * 12 + u * u * 30, 'w') }
      if (t > 2.9) { const rise = Math.min(1, (t - 2.9) / 0.4) - Math.max(0, (t - 5.4) / 0.6); if (rise > 0) blit(SPR.seal[t > 3.1 && t < 3.5 ? 1 : 0], 52, 22 - rise * 10) }
      text(t < 1.4 ? 'THE ROCK' : t < 3.3 ? '' : t < 4.4 ? 'GULP' : 'NO PAROLE', 'c', 0, t < 4.4 ? 'w' : 'o')
      if (t > 1.4 && t < 3.3) text('LIFE', 44, 0, 'w')
    } },
    // T-SHIRT CANNON: point blank into his head. The head is gone, the body stands a moment, topples, and the free shirt flutters down onto him
    tshirt: { dur: 6.6, still: 1.9, draw(t) {
      ground()
      const lx = 30, fire = 1.5, rec = t > fire && t < fire + 0.3 ? -2 : 0
      big(GIANT, 2, 7)
      cue(t, 0.6, 'tshirt-pump'); cue(t, fire, 'tshirt-boom'); cue(t, fire + 0.05, 'tshirt-splat'); cue(t, fire + 1.8, 'tshirt-thud'); cue(t, fire + 3.1, 'tshirt-taps')
      if (t < fire) { big(DODGER, lx, 7); text('FREE SHIRT', 'c', 0, 'o') }
      else {
        const u = t - fire
        if (u < 1.4) for (let i = 0; i < 28; i++) { const a = -Math.PI * hash(i) * 1.1, v = 10 + hash(i + 3) * 22, x = lx + 4 + Math.cos(a) * v * u + 6 * u, y = 8 + Math.sin(a) * v * u + 18 * u * u; put(x, Math.min(GH - 1, y), 'rrrbww'[i % 6]) } // what was his head
        if (u > 0.5) for (let i = 0; i < 14; i++) put(lx + 4 + hash(i + 20) * 30, GH - 1, 'r')
        if (u < 1.4) { big(HEADLESS, lx, 7); for (let i = 0; i < 6; i++) { const s = (u * 2.5 + i / 6) % 1; put(lx + 3 + (i - 2.5) * s * 2, 10 - s * 9 + s * s * 10, 'r'); put(lx + 4 + (i - 2.5) * s * 2, 10 - s * 8 + s * s * 9, 'r') } }
        else if (u < 1.8) { const k = (u - 1.4) / 0.4; for (const dd of [0, 1, 2]) line(lx + 3 + dd, 20, lx + 3 + dd + k * 10, 10 + k * 8, 'w'); line(lx + 3, 20, lx + 6, 20, 'd') }
        else { rect(lx + 2, 18, 10, 2, 'w'); rect(lx + 5, 18, 2, 2, 'b'); rect(lx + 12, 18, 5, 2, 'd'); put(lx + 1, 18, 'r'); const p = Math.min(10, (u - 1.8) * 6); rect(lx - 4 - p, 20, 6 + p, 1, 'r') } // down, and the pool
        const su = t - fire - 0.1, sx = lx + 3 + Math.sin(su * 6) * 5 * Math.max(0, 1 - su / 3.4), sy = su < 0.5 ? 6 - su * 12 : Math.min(15, ((su - 0.5) / 2.7) * 15)
        blit(SHIRT, sx, sy)
        rect(10 + rec, 9, 18, 3, 'g'); rect(10 + rec, 10, 3, 4, 'd'); rect(26 + rec, 8, 2, 5, 'g') // the cannon (the muzzle where his head was)
        if (u < 0.5) text('BOOM', 'c', 0, 'y'); else if (u > 3.1) text(Math.floor(t * 2) % 2 ? 'R.I.P.' : 'FREE SHIRT', 'c', 0, 'w')
        return
      }
      rect(10 + rec, 9, 18, 3, 'g'); rect(10 + rec, 10, 3, 4, 'd'); rect(26 + rec, 8, 2, 5, 'g')
    } },
    // STEAMROLLER: flat as a pennant, then run up a pole as one
    steamroller: { dur: 7.0, still: 2.4, draw(t) {
      ground()
      const lx = 40, x = Math.round(-30 + (t / 3.2) * 110), front = x + 26, flat = front >= lx + 2
      cue(t, 0.0, 'steamroller-rumble'); cue(t, 1.3, 'steamroller-crunch'); cue(t, 3.6, 'steamroller-peel'); cue(t, 4.6, 'steamroller-fanfare')
      if (!flat) big(DODGER, lx, 7)
      else if (t < 3.6) { rect(lx - 3, 20, 16, 1, 'w'); put(lx - 3, 20, 'b'); put(lx - 2, 20, 'b'); rect(lx + 9, 20, 4, 1, 'd'); put(lx + 1, 20, 'd'); for (let i = 0; i < 6; i++) put(lx - 5 + i * 4, GH - 1, 'r') }
      if (x < GW + 4) {
        disc(x + 21, 15, 5, 'g'); disc(x + 21, 15, 1, 'd') // the drum
        rect(x, 11, 16, 7, 'y'); rect(x + 2, 13, 12, 1, 'o'); rect(x + 3, 5, 8, 6, 'y'); rect(x + 4, 6, 6, 3, 'd'); put(x + 6, 7, 'o'); put(x + 6, 8, 'w'); rect(x + 2, 17, 5, 4, 'd')
        line(x + 13, 2, x + 13, 10, 'g'); for (let i = 0; i < 3; i++) put(x + 13 - ((t * 9 + i * 3) % 9), 1 - i * 0 + ((i + Math.floor(t * 6)) % 2), 'g') // the stack, puffing
      }
      if (t >= 3.6) {
        line(62, 7, 62, 20, 'g'); put(62, 6, 'y')
        const k = ease((t - 3.6) / 0.8)
        if (k < 1) rect(lx - 3 + k * (62 - lx - 13), 20 - k * 12, 16 - k * 4, 1, 'w')
        else { // him as a pennant: cap, face, jersey, legs, tapering away from the pole, waving
          const rows = [['b', 12], ['w', 11], ['w', 9], ['w', 8], ['d', 6], ['d', 4]]
          rows.forEach(([c, len], r) => { for (let i = 0; i < len; i++) { const yy = 8 + r + Math.round(Math.sin(i * 0.6 - t * 6) * 0.8 * (i / 9)); put(61 - i, yy, r === 1 && (i === 3 || i === 6) ? 'd' : r === 2 && i === 5 ? 'b' : c) } })
          text('NEW PENNANT', 'c', 0, 'o')
        }
      }
    } },
    // GULL STRIKE (The Birds): the flock gathers, comes down on him and eats him to the bone; one flies off with his cap
    birds: { dur: 7.4, still: 3.4, draw(t) {
      ground()
      const lx = 32, top = 7
      cue(t, 0.2, 'birds-caw'); cue(t, 2.0, 'birds-swarm'); cue(t, 2.2, 'birds-scream'); cue(t, 3.0, 'birds-peck'); cue(t, 5.6, 'birds-bones')
      const eaten = Math.max(0, Math.min(1, (t - 2.2) / 2.4))
      if (t < 5.6) {
        big(DODGER, lx, top)
        const rows = Math.round(eaten * 14)
        for (let j = 0; j < rows; j++) { for (let i = 0; i < 8; i++) off(lx + i, top + j); blit([SKEL[j]], lx, top + j) }
        if (t > 2.0 && t < 4.6) { const w = Math.floor(t * 10) % 2; line(lx - 1, top + 6, lx - 3, top + 2 + w * 2, 'w'); line(lx + 8, top + 6, lx + 10, top + 2 + (1 - w) * 2, 'w') } // flailing
      } else {
        const k = Math.min(1, (t - 5.6) / 0.5)
        if (k < 1) blit(SKEL, lx, top + k * 8)
        else { for (let i = 0; i < 12; i++) put(lx - 2 + ((i * 5) % 12), 20 - (i % 2), 'w'); rect(lx + 3, 18, 3, 2, 'w'); put(lx + 4, 18, 'd') } // a heap, the skull on top
      }
      for (let i = 0; i < 16; i++) {
        let x, y
        if (t < 2.0) { const a = t * (1.5 + (i % 3) * 0.4) + i * 0.7, r = 26 - t * 8; x = lx + 4 + Math.cos(a) * r; y = 3 + Math.sin(a) * r * 0.25 + t * 2 }
        else if (t < 4.8) { x = lx - 2 + hash(i) * 12 + Math.sin(t * 20 + i); y = top + hash(i + 5) * 13 + (Math.sin(t * 25 + i * 3) > 0 ? 1 : 0) }
        else { const u = t - 4.8; x = lx + 4 + (hash(i) - 0.5) * 2 * u * 30; y = 12 - u * (10 + hash(i + 2) * 14) }
        blit(SPR.gull[Math.floor(t * 8 + i) % 2], x - 3, y - 1)
      }
      if (t > 2.4 && t < 4.8) for (let i = 0; i < 12; i++) { const s = (t * 2 + i / 12) % 1; put(lx + 4 + (hash(i) - 0.5) * 30 * s, 10 - 8 * s + 14 * s * s, 'r') } // bits of him
      if (t > 4.8) { const u = t - 4.8; rect(lx + 6 + u * 24, 4 - u * 9, 3, 1, 'b'); blit(SPR.gull[Math.floor(t * 8) % 2], lx + 5 + u * 24, 1 - u * 9) } // the one with the cap
      text(t < 2.0 ? 'CAW' : t < 4.8 ? (Math.floor(t * 4) % 2 ? 'AAAAH' : 'HELP') : 'THE BIRDS', 'c', 0, t < 4.8 && t >= 2.0 ? 'r' : 'w')
    } },
    // EARTHQUAKE: the ground opens under only him and closes again; the Giant beside him never spills his beer
    quake: { dur: 6.4, still: 2.0, draw(t) {
      const sh = t > 0.6 && t < 2.8 ? (Math.floor(t * 24) % 2 ? 1 : -1) : 0, lx = 44, open = t > 1.3 && t < 2.6 ? Math.min(1, (t - 1.3) / 0.3) : 0
      cue(t, 0.6, 'quake-rumble'); cue(t, 1.3, 'quake-crack'); cue(t, 1.5, 'quake-scream'); cue(t, 2.6, 'quake-slam'); cue(t, 3.8, 'quake-sip')
      for (let x = 0; x < GW; x++) { const gap = open > 0 && Math.abs(x - (lx + 4)) < 7 * open; if (gap) { put(x, GH - 1, (x + Math.floor(t * 10)) % 3 ? 'r' : 'o') } else put(x + sh, GH - 1, 'd') }
      if (open > 0) for (const s of [-1, 1]) { const ex = lx + 4 + s * 7 * open; line(ex, 19, ex, GH - 1, 'n') }
      if (t > 0.8 && t < 2.8) for (let x = 2; x < GW; x += 9) put(x + sh, 20, 'n')
      big(GIANT, 12 + sh, 7)
      const sip = Math.max(0, Math.min(1, (t - 3.6) / 0.4)) - Math.max(0, Math.min(1, (t - 4.6) / 0.4)), cx = 22 - sip * 3, cy = 12 - sip * 3
      rect(cx, cy, 3, 3, 'y'); rect(cx, cy - 1, 3, 1, 'w') // the beer, perfectly level the whole time
      if (t < 1.4) big(DODGER, lx + sh, 7)
      else if (t < 2.5) { const y = 7 + (t - 1.4) ** 2 * 60; big(DODGER, lx, y); line(lx - 1, y + 2, lx - 2, y - 2, 'w'); line(lx + 8, y + 2, lx + 9, y - 2, 'w') }
      if (t > 2.6 && t < 3.1) for (let i = 0; i < 10; i++) { const u = t - 2.6; put(lx + 4 + (i - 5) * u * 10, 20 - u * 8 * (i % 3), 'g') }
      if (t > 2.7) { const u = Math.min(1, (t - 2.7) / 0.5); rect(lx + 2 + u * 3, 20 - 6 * u * (1 - u) * 4, 4, 1, 'b') } // his cap, all that comes back up
      text(t < 0.6 ? 'NICE NIGHT' : t < 1.4 ? 'QUAKE!' : t < 2.6 ? 'AAAAAH' : t < 3.8 ? '' : 'NOT A DROP', 'c', 0, t < 3.8 ? 'w' : 'y')
    } },
    // BALLOON (mine): the Giant puts the helium hose in his mouth and keeps it there
    balloon: { dur: 6.0, still: 2.7, draw(t) {
      ground()
      big(GIANT, 2, 7)
      rect(12, 14, 4, 7, 'g'); rect(12, 13, 4, 1, 'w') // the tank
      const pop = 3.0, k = Math.min(1, t / pop), r = 3 + k * k * 9, cx = 42, cy = 13 - k * 3
      cue(t, 0.2, 'balloon-hiss'); cue(t, 1.6, 'balloon-stretch'); cue(t, pop, 'balloon-pop'); cue(t, pop + 0.2, 'balloon-rain')
      if (t < pop) {
        line(14, 13, cx - r, cy + 1, 'd')
        disc(cx, cy, r, 'w', 0.9); rect(cx - 2, cy - r * 0.9 - 1, 4, 1, 'b')
        const ew = k > 0.6 ? 2 : 1; rect(cx - 3, cy - r * 0.4, ew, ew, 'd'); rect(cx + 2, cy - r * 0.4, ew, ew, 'd')
        put(cx - r - 1, cy, 'b'); put(cx + r + 1, cy, 'b'); line(cx - 1, cy + r * 0.9, cx - 1, cy + r * 0.9 + 2, 'd'); line(cx + 1, cy + r * 0.9, cx + 1, cy + r * 0.9 + 2, 'd')
        text(t < 1.0 ? 'HELIUM' : 'E'.repeat(2 + Math.floor(k * 6)), 'c', 0, t < 1.0 ? 'w' : 'y')
        return
      }
      const u = t - pop
      for (let i = 0; i < 44; i++) { const a = hash(i) * Math.PI * 2, v = 8 + hash(i + 1) * 30, x = cx + Math.cos(a) * v * u, y = cy + Math.sin(a) * v * u * 0.7 + 14 * u * u; put(x, Math.min(GH - 1, y), 'rwwb'[i % 4]) }
      for (let i = 0; i < 30; i++) put(Math.floor(hash(i + 70) * GW), Math.floor(hash(i + 90) * GH + u * 14) % GH, 'r') // and it rains
      rect(cx - 2 + Math.sin(u * 4) * 3, Math.min(20, -2 + u * 7), 4, 1, 'b')
      text(u < 1.0 ? 'POP!' : 'OOPS', 'c', 0, u < 1.0 ? 'y' : 'w')
    } },
    // BATTING PRACTICE (mine): the pitching machine on 105, thirty-odd balls, every one a hole in him, until there is more hole than Dodger
    bp: { dur: 6.4, still: 3.4, draw(t) {
      ground()
      line(6, 20, 10, 13, 'g'); line(14, 20, 10, 13, 'g'); rect(6, 8, 10, 5, 'g')
      const sp = Math.floor(t * 20) % 2; rect(7, 9, 3, 3, sp ? 'd' : 'w'); rect(12, 9, 3, 3, sp ? 'w' : 'd') // the wheels
      const lx = 48, t0 = 0.6, gap = 0.09, NH = 34, hits = Math.max(0, Math.min(NH, Math.floor((t - t0 - 0.2) / gap) + 1))
      cue(t, 0.2, 'bp-whir'); for (let n = 0; n < hits; n++) cue(t, 0, 'bp-thwack#' + n); cue(t, 4.6, 'bp-collapse')
      for (let n = 0; n < NH; n++) { const u = (t - t0 - n * gap) / 0.2; if (u >= 0 && u < 1) put(16 + u * (lx - 16 + (n % 8)), 10 + (n % 7), 'w') }
      if (t < 4.6) {
        const jerk = hits && hits < NH && Math.floor(t / gap) % 2 ? 1 : 0
        big(DODGER, lx + jerk, 7)
        for (let n = 0; n < hits; n++) { const hx = lx + jerk + Math.floor(hash(n + 40) * 8), hy = 7 + Math.floor(hash(n + 80) * 14); off(hx, hy); if (n % 3 === 0) put(hx, hy + 1, 'r') }
      } else { for (let i = 0; i < 16; i++) if (hash(i + 7) > 0.35) put(lx - 2 + i, 20, i < 3 ? 'b' : i > 11 ? 'd' : 'w'); for (let i = 0; i < 8; i++) put(lx - 4 + i * 3, GH - 1, 'r') }
      for (let n = 0; n < hits; n++) put(lx + 10 + (n % 12), 20 - Math.floor(n / 12), 'w') // the balls, piling up behind him
      text(t < 0.6 ? 'B.P.' : t < 4.6 ? `${hits} HITS` : 'SWISS CHEESE', 'c', 0, t < 4.6 ? 'w' : 'y')
    } },
    // LIGHTNING (mine): the Giant points his bat at the sky; the X-ray flicker, a crisp, a pile of ash, and the wind takes the ash
    lightning: { dur: 5.8, still: 1.7, draw(t) {
      ground()
      const lx = 58, z = 1.4
      rect(lx - 6, 1, 20, 3, 'g'); for (let i = 0; i < 22; i++) put(lx - 7 + i, Math.round(1 + Math.sin(i * 0.9)), 'g') // the cloud
      big(GIANT, 6, 7); line(14, 12, 21, 3, 'n')
      cue(t, 0.2, 'lightning-rumble'); cue(t, z, 'lightning-zap'); cue(t, z + 0.3, 'lightning-sizzle'); cue(t, 3.6, 'lightning-crumble'); cue(t, 4.4, 'lightning-wind')
      if (t < z) big(DODGER, lx, 7)
      else if (t < z + 1.0) {
        let x0 = lx + 4, y0 = 4; for (let s = 0; s < 4; s++) { const x1 = lx + 4 + (s % 2 ? -3 : 3), y1 = 4 + s; line(x0, y0, x1, y1 + 0, 'y'); x0 = x1; y0 = y1 } line(x0, y0, lx + 4, 7, 'y')
        if (Math.floor(t * 14) % 2) blit(SKEL, lx, 7); else big(DODGER, lx, 7)
      } else if (t < 3.6) {
        big(DODGER.map((r) => r.replace(/[bw]/g, 'd')), lx, 7)
        if (Math.floor(t * 3) % 3) { put(lx + 2, 9, 'w'); put(lx + 5, 9, 'w') } // he blinks
        for (let i = 0; i < 4; i++) put(lx + 2 + i * 2 + Math.sin(t * 5 + i), 6 - ((t * 6 + i * 2) % 6), 'g')
      } else {
        const k = Math.min(1, (t - 3.6) / 0.5), drift = Math.max(0, t - 4.4) * 12
        for (let i = 0; i < 30; i++) { const x = lx - 1 + (i % 10) + drift * (0.4 + hash(i) * 0.9), y = 20 - Math.floor(i / 10) * (1 - k) * 4 - (drift ? hash(i + 3) * drift * 0.2 : 0); put(x, k < 1 ? 7 + (i % 14) + k * (13 - (i % 14)) : y, 'd') }
        rect(lx + 3, 20, 4, 1, 'b')
      }
      text(t < z ? 'STORMY' : t < z + 1.0 ? 'ZZZT' : t < 3.6 ? 'CRISPY' : t < 4.4 ? '' : 'POOF', 2, 0, t < z + 1.0 ? 'y' : 'w')
    } },
    // BOWLING (mine): ten little Dodgers for pins, one big ball, a strike
    bowling: { dur: 6.2, still: 2.3, draw(t) {
      ground()
      big(GIANT, 2, 7)
      const hitT = 2.0, PIN = ['bb', 'ww', 'bw', 'ww', 'dd'], LAY = ['bwbwd', 'bwwwd']
      const P = [[54, 10], [58, 10], [62, 10], [66, 10], [56, 12], [60, 12], [64, 12], [58, 14], [62, 14], [60, 16]]
      cue(t, 0.6, 'bowling-roll'); cue(t, hitT, 'bowling-crash'); cue(t, hitT + 0.1, 'bowling-screams'); cue(t, hitT + 0.5, 'bowling-strike')
      if (t < hitT) P.forEach(([x, y]) => blit(PIN, x, y))
      else P.forEach(([x0, y0], i) => {
        const u = t - hitT, vx = (hash(i) - 0.3) * 40, vy = -10 - hash(i + 3) * 14, x = x0 + vx * u, y = y0 + vy * u + 22 * u * u
        if (y < 16) { blit(Math.floor(t * 10 + i) % 2 ? PIN : LAY, x, y); put(x - vx * 0.03, y + 4, 'r') } else { blit(LAY, x0 + vx * Math.min(u, 0.6), 19); put(x0 + vx * Math.min(u, 0.6) + 5, 20, 'r') }
      })
      const bx = t < 0.6 ? 12 : 12 + ((t - 0.6) / (hitT - 0.6)) * 40, rot = Math.floor(t * 8) % 4
      disc(bx, 17, 3, 'g'); put(bx + [1, 0, -1, 0][rot], 16 + [0, 1, 0, -1][rot], 'd'); put(bx + [0, -1, 0, 1][rot], 16 + [1, 0, -1, 0][rot], 'd')
      text(t < hitT ? 'BOWL' : Math.floor(t * 6) % 2 ? 'STRIKE!' : 'X X X', 'c', 0, t < hitT ? 'w' : 'o')
    } },
    // WHACK-A-DODGER (mine): five holes, heads pop up, the mallet comes down; then all five at once, and a mallet the width of the board
    whack: { dur: 6.8, still: 2.9, draw(t) {
      ground()
      const H = [8, 22, 36, 50, 64], S = [[1, 0.4], [3, 1.1], [0, 1.8], [4, 2.5], [2, 3.2]], smack = 0.45
      for (const hx of H) rect(hx - 3, 20, 7, 1, 'n')
      const head = (hx, k) => { const y = 20 - k * 5; rect(hx - 2, y, 4, 1, 'b'); rect(hx - 2, y + 1, 4, 3, 'w'); put(hx - 1, y + 2, 'd'); put(hx + 1, y + 2, 'd') }
      const squash = (hx, u) => { rect(hx - 4, 20, 9, 1, 'r'); rect(hx - 2, 19, 4, 1, 'b'); if (u < 1.0) { put(hx - 1 - u * 10, 19 - u * 14 + 20 * u * u, 'w'); put(hx + 1 + u * 10, 19 - u * 14 + 20 * u * u, 'w') } }
      let score = 0, mx = null, my = 6, wide = false
      S.forEach(([hi, p], i) => { const u = t - p, hx = H[hi]; cue(t, p, 'whack-pop#' + i); cue(t, p + smack, 'whack-bonk#' + i); if (u < 0) return; if (u < smack) { head(hx, Math.min(1, u / 0.15)); mx = hx; my = u > smack - 0.12 ? 8 + ((u - (smack - 0.12)) / 0.12) * 6 : 6 } else { score++; squash(hx, u - smack) } })
      const all = 4.4, U = t - all // the finale
      cue(t, all, 'whack-pop#9'); cue(t, all + 0.5, 'whack-bonk#9'); cue(t, all + 0.9, 'whack-ding')
      if (U >= 0) { if (U < 0.5) { H.forEach((hx) => head(hx, Math.min(1, U / 0.15))); wide = true; my = U > 0.3 ? 8 + ((U - 0.3) / 0.2) * 6 : 4 } else { score = 10; H.forEach((hx) => squash(hx, U - 0.5)) } }
      if (wide) { rect(0, my, GW, 3, 'g'); line(GW - 1, my, GW - 1, 0, 'n') } else if (mx != null) { rect(mx - 3, my, 7, 3, 'g'); line(mx + 3, my + 1, mx + 9, 0, 'n') }
      text(`WHACK ${score}`, 'c', 0, 'o')
    } },
    // DRIVERLESS (mine): a car with nobody in it hits him, stops, thinks about it, and backs over him, and again, and again
    driverless: { dur: 6.8, still: 2.6, draw(t) {
      ground()
      const K = [[0, -30], [0.9, 24], [1.4, 24], [2.0, 6], [2.5, 34], [3.0, 8], [3.5, 36], [4.4, 36], [5.6, 90]]
      let x = K[K.length - 1][1]; for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t < K[i + 1][0]) { const k = (t - K[i][0]) / (K[i + 1][0] - K[i][0]); x = K[i][1] + (K[i + 1][1] - K[i][1]) * k; break }
      x = Math.round(x)
      const lx = 40, hit = t > 0.75, passes = [0.75, 2.0, 2.5, 3.0, 3.5].filter((p) => t >= p).length
      cue(t, 0.0, 'driverless-whir'); [0.75, 2.0, 2.5, 3.0, 3.5].forEach((p, i) => cue(t, p, 'driverless-bump#' + i)); cue(t, 4.4, 'driverless-chime')
      if (!hit) big(DODGER, lx, 7)
      else { rect(lx - 4, 20, 16, 1, 'w'); put(lx - 4, 20, 'b'); rect(lx + 8, 20, 4, 1, 'd'); for (let i = 0; i < passes * 5; i++) put(lx - 8 + hash(i + 11) * 26, i % 2 ? 20 : GH - 1, 'r') }
      rect(x, 14, 24, 5, 'w'); rect(x + 4, 10, 15, 4, 'w'); rect(x + 5, 11, 13, 2, 'd'); rect(x + 3, 19, 4, 2, 'd'); rect(x + 17, 19, 4, 2, 'd'); put(x + 23, 15, 'y'); put(x, 15, 'r') // nobody at the wheel
      rect(x + 10, 8, 3, 2, 'g'); put(x + 10 + (Math.floor(t * 12) % 3), 8, 'y') // the spinning sensor
      text(t < 0.75 ? 'NO DRIVER' : t < 4.4 ? 'RECALCULATING' : 'ARRIVED', 'c', 0, t < 4.4 ? 'w' : 'y')
    } },
    // CRAB SNIP (mine): the Crazy Crab cuts him in half at the belt; the top half crawls, the legs run in circles
    crabsnip: { dur: 6.2, still: 2.3, draw(t) {
      ground()
      const lx = 40, snip = 1.8, cx = t < 3.8 ? -16 + Math.min(1, t / 1.6) * 42 : 26 - (t - 3.8) * 24
      cue(t, 0.1, 'crabsnip-scuttle'); cue(t, snip, 'crabsnip-snip'); cue(t, snip + 0.1, 'crabsnip-squirt'); cue(t, snip + 0.3, 'crabsnip-scream')
      blit(SPR.crab[Math.floor(t * 8) % 2], cx, 12)
      if (t < snip) big(DODGER, lx, 7)
      else {
        const u = t - snip, run = Math.floor(t * 10) % 2, lxx = lx + Math.sin(u * 3) * 14
        big([run ? '.dd.' : 'd..d', run ? 'd..d' : '.dd.'], lxx, 17); for (let i = 0; i < 4; i++) { const s = (u * 3 + i / 4) % 1; put(lxx + 3 + (i - 1.5) * s * 2, 16 - s * 6 + s * s * 7, 'r') } // the legs, running, a fountain on top
        const ty = Math.min(17, 7 + u * u * 30); big(DODGER.slice(0, 4), lx - Math.min(1, u) * 6 - Math.max(0, u - 1) * 3, ty); put(lx - 2, ty + 8, 'r') // the top half, dragging itself away
      }
      text(t < snip ? 'CRAZY CRAB' : t < 4.0 ? 'SNIP SNIP' : 'HALF OFF', 'c', 0, t < snip ? 'r' : 'w')
    } },
    // DODGER DOG (mine): he is the hot dog; mustard, ketchup, three bites, head first, and a burp with his cap in it
    hotdog: { dur: 6.6, still: 3.0, draw(t) {
      ground()
      const bites = [2.4, 3.2, 4.0].filter((b) => t >= b).length, gulp = t >= 4.8, bx = 14 - bites * 12
      cue(t, 0.6, 'hotdog-squirt'); cue(t, 1.1, 'hotdog-squirt#2'); [2.4, 3.2, 4.0].forEach((b, i) => cue(t, b, 'hotdog-chomp#' + i)); cue(t, 4.8, 'hotdog-burp')
      if (!gulp) {
        rect(bx + 2, 15, 34, 3, 'n'); rect(bx + 3, 10, 32, 2, 'n') // the bun
        rect(bx - 2, 12, 2, 3, 'b'); rect(bx, 12, 4, 3, 'w'); put(bx + 1, 13, 'd'); rect(bx + 4, 12, 22, 3, 'w'); rect(bx + 10, 12, 3, 3, 'b'); rect(bx + 26, 12, 10, 3, 'd') // him
        if (t > 0.6) { const n = Math.min(30, (t - 0.6) * 40); for (let i = 0; i < n; i++) put(bx + 4 + i, 11 + (Math.floor(i / 2) % 2), 'y') }
        if (t > 1.1) { const n = Math.min(30, (t - 1.1) * 40); for (let i = 0; i < n; i++) put(bx + 5 + i, 12 - (Math.floor(i / 2) % 2), 'r') }
        if (bites < 3) for (let x = 0; x < 10; x++) for (let y = 9; y < 19; y++) off(x, y) // what is in his mouth is gone
        if (t > 2.0) for (let i = 0; i < bites * 6; i++) put(10 + hash(i) * 6, 16 + hash(i + 4) * 4, 'r')
      }
      big(GIANT, 0, 7)
      const chewing = [2.4, 3.2, 4.0].some((b) => t >= b && t < b + 0.3); if (chewing) rect(2, 10, 4, 1, 'r')
      if (gulp) { const u = t - 4.8; rect(8 + u * 26, 8 - u * 14 + u * u * 18, 4, 1, 'b'); if (u < 0.6) for (let i = 0; i < 6; i++) put(9 + i * 2, 8 - i % 2, 'y') }
      text(t < 0.6 ? 'DODGER DOG' : t < 2.4 ? 'RELISH?' : t < 4.8 ? 'CHOMP' : t < 5.6 ? 'BURP' : 'DELISH', 'c', 0, t < 2.4 ? 'w' : 'o')
    } },
    // ---- idle bits: the kiss cam, The Machine; and the IPO, for the happenings ----
    // KISS CAM: two fans in the heart; the one in Dodger blue shoves the other out of it, the heart cracks, and the park boos
    kisscam: { dur: 6.8, still: 3.4, draw(t) {
      const sc = 1 + 0.05 * Math.sin(t * 6), crack = t > 3.2 ? Math.min(2, (t - 3.2) * 6) : 0
      for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); put(36 + x * 1.1 * sc + Math.sign(x) * crack, 13.5 + y * 0.45 * sc, 'r') }
      if (crack) for (let y = 8; y < 21; y++) put(36 + ((y % 2) ? 1 : -1), y, 'd')
      cue(t, 0.0, 'kisscam-music'); cue(t, 2.6, 'kisscam-shove'); cue(t, 3.0, 'kisscam-boo')
      const sfx = t < 2.6 ? 26 : 26 - (t - 2.6) * 40, sfy = t < 2.6 ? 9 : 9 - (t - 2.6) * 10 + (t - 2.6) ** 2 * 30
      big(['.oo.', '.ww.', 'oooo'], sfx, sfy + 1); big(['.bb.', '.ww.', 'bwwb'], 38, 10)
      if (t > 2.4 && t < 3.0) line(38, 14, 34, 13, 'w')
      if (t > 3.0) { line(38, 13, 45, 16, 'b'); line(45, 13, 38, 16, 'b') } // arms crossed
      if (t < 2.6) for (let i = 0; i < 4; i++) { const s = (t * 0.8 + i / 4) % 1; put(36 + Math.sin(s * 9 + i) * 3, 15 - s * 14, 'r') }
      text(t < 3.0 ? 'KISS CAM' : Math.floor(t * 4) % 2 ? 'BOOOO' : 'BOO!', 'c', 0, t < 3.0 ? 'w' : 'o')
    } },
    // THE MACHINE: Brian Wilson's 2010 bit; the bearded closer is interviewed, and a figure in a black leather suit, mask and chains walks by behind him, stops,
    // looks at us, and walks on; the closer crosses his arms in his X and points up
    themachine: { dur: 8.0, still: 4.0, draw(t) {
      ground()
      cue(t, 0.8, 'themachine-chains'); cue(t, 2.2, 'themachine-chains#2'); cue(t, 3.0, 'themachine-sting'); cue(t, 3.4, 'themachine-salute')
      const mxx = t < 3.0 ? 74 - ((t - 0.8) / 2.2) * 44 : t < 4.4 ? 30 : 30 - ((t - 4.4) / 3.0) * 44, step = Math.floor(t * 5) % 2, still = t >= 3.0 && t < 4.4
      if (t > 0.8) { big(['.dd.', '.dd.', 'dddd', 'dddd', '.dd.', '.dd.', still ? 'd..d' : step ? '.d.d' : 'd.d.'], mxx, 7); put(mxx + 2, 9, 'w'); put(mxx + 5, 9, 'w'); line(mxx + 2, 11, mxx + 5, 11, 'g'); line(mxx, 13, mxx + 7, 18, 'g'); line(mxx + 7, 13, mxx, 18, 'g'); if (still) put(mxx + 3, 9 + (Math.floor(t * 4) % 2), 'w') } // mask, eyes, zipper, chains
      big(['.dd.', '.ww.', 'dddd', 'owwo', '.ww.', '.dd.', 'd..d'], 14, 7) // the closer, the beard
      line(30, 11, 24, 11, 'g'); rect(23, 10, 2, 2, 'd') // the microphone
      if (t > 3.4 && t < 4.6) { line(14, 12, 21, 17, 'o'); line(21, 12, 14, 17, 'o') } // the X
      if (t >= 4.6 && t < 6.0) line(20, 12, 24, 1, 'o') // and up
      text(t < 0.8 ? 'POSTGAME' : t < 3.0 ? 'THE MACHINE' : t < 4.6 ? '' : 'FEAR THE BEARD', 'c', 0, t < 3.0 ? 'w' : 'o')
    } },
    // IPO: a gong, a ticker that only goes up, and cash coming down
    ipo: { dur: 6.0, still: 2.4, draw(t, a) {
      const tick = a?.tick ?? 'NUKE', pct = a?.pct ?? 312
      cue(t, 0.4, 'ipo-gong'); cue(t, 1.0, 'ipo-ding'); cue(t, 1.2, 'ipo-cash')
      if (t > 0.4 && t < 0.65) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if ((x + y) % 2) put(x, y, 'y')
      if (t > 0.4 && t < 1.6) ring(36, 11, (t - 0.4) * 40, 'y', 0.6)
      text('$' + tick, 2, 1, 'w'); for (let j = 0; j < 6; j++) line(64 - j, 2 + j, 64 + j, 2 + j, 'y')
      text(`${Math.round(ease((t - 0.6) / 1.8) * pct)}%`, 'c', 12, 'y')
      if (t > 1.2) for (let i = 0; i < 30; i++) { const x = hash(i) * GW + Math.sin(t * 5 + i) * 2, y = (t - 1.2) * 8 * (0.6 + hash(i + 9)) - hash(i + 3) * 12; if (y >= 0 && y < GH) rect(x, y, 2, 1, i % 3 ? 'y' : 'w') }
    } },
  }
  // the gags: his eleven, the first five and eight more; a shuffled bag, so every gag plays before any plays twice and never the same one twice in a row
  const GAGS = ['anvil', 'dynamite', 'bonk', 'runover', 'sealsnack', 'leaves3rd', 'bipped', 'catapult', 'piano', 'guillotine', 'chipper', 'alcatraz', 'tshirt', 'steamroller', 'birds', 'quake', 'balloon', 'bp', 'lightning', 'bowling', 'whack', 'driverless', 'crabsnip', 'hotdog']
  let bag = [], lastGag = null
  function nextGag() {
    if (!bag.length) { bag = GAGS.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] } if (bag[bag.length - 1] === lastGag) bag.unshift(bag.pop()) }
    lastGag = bag.pop(); return lastGag
  }
  const PRIORITY = { glitch: 10, walkoff: 9, slam: 8, flip: 7, golf: 6, tomahawk: 6, chase: 6, insidejob: 6, seal: 5, nodoubt: 3, kayak: 3, laser: 3, fireworks: 2, odometer: 4, cable: 4, crab: 3, soclose: 3, tater: 3, moon: 3, karl: 2, gulls: 1, bridge: 1, dotrace: 1, wave: 1, beachball: 1, anvil: 6, dynamite: 6, bonk: 6, runover: 6, sealsnack: 6, ipo: 3, kisscam: 1, themachine: 1 }
  for (const g of GAGS) PRIORITY[g] = 6
  let cur = null, queue = [], wait = 0, idleT = 0, played = []
  // play now (if the board is free) or wait; delay holds it back, e.g. until HOME RUN has flashed
  // now: something the viewer just did (TWEAK THE TATER, Karl, MOONSHOT) cuts in ahead of everything
  function play(name, a = {}, delay = 0, now = false) {
    if (!ANIM[name]) return false
    if (now) { cur = null; queue = [{ name, a, p: 99 }, ...queue].slice(0, 2); wait = 0; return true }
    queue.push({ name, a, p: PRIORITY[name] ?? 1 })
    queue.sort((x, y) => y.p - x.p)
    if (queue.length > 2) queue.length = 2
    if (!cur) wait = Math.max(wait, delay)
    return true
  }
  function frame(dt) {
    buf.fill(0)
    if (cur) {
      cur.t += dt
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : cur.t // reduced motion: a gag holds its one still frame for its length
      animT = tt
      A.draw(tt, cur.a)
      if (cur.t >= A.dur) { played.push(cur.name); cur = null; if (!queue.length) idle(idleText) }
    } else if (queue.length && (wait -= dt) <= 0) {
      const n = queue.shift(); cur = { name: n.name, a: n.a, t: 0 }; idleT = 0; wait = 0; fired = new Set()
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : 0
      animT = tt; A.draw(tt, cur.a)
    } else {
      drawLines()
      // idle: now and then a gull steals fries or the bridge shows, while the board just scrolls the batter's name
      if (marquee && !flash && o.idleAnims !== false && (idleT += dt) > 26 + Math.random() * 14) { idleT = 0; const I = ['gulls', 'bridge', 'dotrace', 'wave', 'beachball', 'kisscam', 'themachine', 'GAG', 'GAG', 'GAG']; let n = I[Math.floor(Math.random() * I.length)]; if (n === 'GAG') n = nextGag(); play(n, { seed: Math.floor(Math.random() * 1000) }) }
    }
    paint()
  }
  ready.then(() => frame(0))
  // the sign and the clock at the board's pace; a clock in mid-spin every frame
  let sAcc = 0
  let flagT = 0
  parts.push((dt) => { flipStep(dt); return true })
  parts.push((dt) => { sAcc += dt; flagT += dt; if (clk.spin) paintClock(dt); if (sAcc >= 0.09) { if (q === 1) paintSign(sAcc); else paintVox(sAcc); if (!clk.spin) paintClock(sAcc); if (vis) waveFlags(flagT); sAcc = 0 } return true })
  let acc = 0, rate = 1 // rate: the tests play the board faster (the software renderer gives it a frame every few seconds)
  parts.push((dt) => {
    acc += dt * rate
    if (flash > 0) flash = Math.max(0, flash - dt)
    if (acc < 0.09) return true
    scroll += 1
    frame(acc); acc = 0
    return true
  })
  // a status line (TRACKING, the distance, HOME RUN) cuts short an idle animation but waits behind an event one
  const show = (a, b = '', c = null, fl = 0) => { lines = [a, b]; color = c; flash = fl; marquee = false; scroll = 0; if (cur && (PRIORITY[cur.name] ?? 1) <= 1) cur = null; if (!cur) frame(0) }
  let idleText = 'NUKE NAVIGATOR  ·  ORACLE PARK'
  function idle(txt) { idleText = txt ?? idleText; lines = [idleText, '']; color = null; flash = 0; marquee = true; scroll = 0 }

  // ---- seagulls: voxel gulls (28 Oct, night: everything in the park is voxels), a body and two three-cube wings that flap, circling the outfield; a home run scatters them ----
  // 29 Oct, later (Andrew: "can we give there flapping seagulls faces?"): a head out front with a face, in one of three looks (W in the mixer):
  //   1 WESTERN GULL: a white head, black eyes, the yellow bill with the red spot the gulls at Oracle really have   2 CARTOON: a big head, googly eyes, a cross brow,
  //   an orange bill   3 SHADES: the western gull in black sunglasses
  const gulls = [], cube = new THREE.BoxGeometry(1, 1, 1), gm = new THREE.MeshLambertMaterial({ color: '#e8e6df', flatShading: true }), gt = new THREE.MeshLambertMaterial({ color: '#8a8f99', flatShading: true })
  const fm = {}, fmat = (c) => (fm[c] ??= new THREE.MeshLambertMaterial({ color: c, flatShading: true }))
  const vox = (g, c, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(cube, fmat(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m }
  let face = o.gullFace ?? 1
  function voxHead(style) {
    const h = new THREE.Group(), W = '#f4f2ea', K = '#111111', Y = '#f2c230', RD = '#d8262c'
    if (style === 2) {
      vox(h, W, 0.8, 0.75, 0.75, 0, 0.3, 1.05)
      for (const sx of [-1, 1]) { vox(h, '#ffffff', 0.12, 0.34, 0.34, sx * 0.44, 0.42, 1.18); vox(h, K, 0.06, 0.16, 0.16, sx * 0.5, 0.4, 1.26); vox(h, K, 0.1, 0.08, 0.36, sx * 0.44, 0.66, 1.16).rotation.x = sx * 0.0 + 0.35 }
      vox(h, '#ff8a1c', 0.26, 0.16, 0.55, 0, 0.2, 1.65); vox(h, '#ff8a1c', 0.2, 0.1, 0.4, 0, 0.08, 1.58)
      return h
    }
    vox(h, W, 0.55, 0.5, 0.55, 0, 0.22, 0.98)
    if (style === 3) { vox(h, K, 0.66, 0.13, 0.12, 0, 0.3, 1.22); for (const sx of [-1, 1]) vox(h, K, 0.12, 0.15, 0.34, sx * 0.3, 0.3, 1.08) }
    else for (const sx of [-1, 1]) vox(h, K, 0.06, 0.11, 0.11, sx * 0.29, 0.31, 1.08)
    vox(h, Y, 0.16, 0.12, 0.42, 0, 0.16, 1.44)
    vox(h, RD, 0.1, 0.07, 0.08, 0, 0.08, 1.56) // the red spot on the lower bill
    return h
  }
  function voxGull() {
    const m = new THREE.Group(), body = new THREE.Mesh(cube, gm)
    body.scale.set(0.7, 0.6, 1.6); m.add(body)
    const wing = (side) => { const w = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cube, k === 2 ? gt : gm); c.scale.set(0.8, 0.25, 0.8 - k * 0.15); c.position.x = side * (0.75 + k * 0.78); w.add(c) } m.add(w); return w }
    m.userData.wings = [wing(-1), wing(1)]
    m.userData.head = voxHead(face); m.add(m.userData.head)
    return m
  }
  function setFace(n) { face = n; for (const g of gulls) { g.m.remove(g.m.userData.head); g.m.userData.head = voxHead(n); g.m.add(g.m.userData.head) } }
  for (let i = 0; i < (o.gulls ?? 10); i++) {
    const m = voxGull()
    scene.add(m)
    const g = { m, c: at(Math.random() * 70 - 35, 80 + Math.random() * 60, 0), r: 14 + Math.random() * 22, h: 32 + Math.random() * 26, a: Math.random() * Math.PI * 2, w: (0.25 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6, out: 0, v: null }
    m.position.set(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
    gulls.push(g)
  }
  let t = 0
  parts.push((dt) => {
    t += dt
    for (const g of gulls) {
      g.a += g.w * dt
      const home = new THREE.Vector3(g.c.x + Math.cos(g.a) * g.r, g.h, g.c.z + Math.sin(g.a) * g.r)
      if (g.out > 0) { g.out -= dt; g.m.position.addScaledVector(g.v, dt); g.v.y += 1.5 * dt }
      else g.m.position.lerp(home, Math.min(1, dt * 0.8))
      const flap = o.still ? 0.2 : Math.sin(t * (g.out > 0 ? 16 : 7) + g.ph) * 0.45
      const dir = g.out > 0 ? Math.atan2(g.v.z, g.v.x) : g.a + Math.sign(g.w) * Math.PI / 2
      g.m.rotation.y = -dir + Math.PI / 2 // the body's length (z) along the flight
      g.m.userData.wings[0].rotation.z = -flap; g.m.userData.wings[1].rotation.z = flap
    }
    return true
  })
  function scatter() { if (o.still) return; for (const g of gulls) { g.out = 5 + Math.random() * 3; const a = Math.random() * Math.PI * 2; g.v = new THREE.Vector3(Math.cos(a) * 14, 9 + Math.random() * 8, Math.sin(a) * 14) } }

  // the board keeps its own wall clock (steps of up to half a second): the engine hands frames a clamped step, so on a slow device a 4.6 s crab took 45 s
  let wall = performance.now()
  api.NN.frames.push(() => { const now = performance.now(), dt = Math.min(0.5, (now - wall) / 1000); wall = now; for (let i = parts.length - 1; i >= 0; i--) if (!parts[i](dt)) parts.splice(i, 1) })
  return {
    show, idle, scatter, play,
    // a new swing takes the board: whatever the last one left playing or waiting is dropped
    clear() { cur = null; queue = []; wait = 0 },
    text: () => lines.join(' / '), gulls: () => gulls.length, scattered: () => gulls.filter((g) => g.out > 0).length,
    set visible(v) { vis = v; showBoard(); showSign(); for (const g of gulls) g.m.visible = v },
    // the board's look (G1 to G4), and for the tests: the look, how many LEDs stand forward, how many tiles are mid-flip
    set boardStyle(n) { if (n === gStyle) return; gStyle = n; ledK.fill(-1); flipT.fill(1); showBoard(); paint() }, boardNow: () => gStyle, vboard,
    ledsOut: () => { let n = 0; for (let i = 0; i < NLED; i++) if (ledK[i] > 0) n++; return n }, flipping: () => flipping,
    // the sign: Q1 the bulbs, Q2 the real sign in voxels by day, Q3 at night; and for the tests, how many voxels it has, the flags and how far they wave
    set signStyle(n) { if (n === q) return; q = n; showSign(); paintClock(0); if (q !== 1) paintVox(0) }, signNow: () => q,
    signVox: () => (letters.visible ? cells.length : 0), flags: () => flags.length, flagWave: () => wave, vsign,
    // the sign's moments ('hr', or 'walk' for a walk-off), Karl dimming it and the clock, and the clock: { hm: 'HH:MM' } for a real ball, { live: true } for now in San Francisco
    signFx(kind) { sfx = { kind, t: 0, dur: kind === 'walk' ? 5 : 3.6 }; gleam = null; signs++ }, signCount: () => signs,
    set fog(v) { fogged = !!v },
    setClock, clock: () => { const m = ((clk.shown % 720) + 720) % 720; return { h: Math.floor(m / 60) || 12, m: Math.floor(m % 60), live: clk.live, hm: clk.hm ?? null, spinning: !!clk.spin } },
    sign, clockFace, signState: () => (sfx ? sfx.kind : gleam ? 'gleam' : 'idle'),
    set gullsOn(v) { for (const g of gulls) g.m.visible = v },
    // the gulls' faces (W1 to W3), and for the tests: the face each gull wears
    set gullFace(n) { if (n !== face) setFace(n) }, gullFaces: () => gulls.map((g) => g.m.userData.head?.children.length ?? 0), faceNow: () => face,
    board, names: () => Object.keys(ANIM), anim: () => cur?.name ?? null, queued: () => queue.map((q) => q.name), played: () => [...played],
    // for the tests: how many LEDs are lit right now, and the board's size in LEDs
    litCount: () => buf.reduce((s, k) => s + (k ? 1 : 0), 0), size: [GW, GH],
    dur: (n) => ANIM[n]?.dur,
    // draw one frame of an animation at time t right now (the next tick redraws); returns how many LEDs it lit, and the board as a picture when asked
    peek(n, tt, a = {}, pic = false) { const f = fired; fired = null; buf.fill(0); animT = tt; ANIM[n].draw(tt, a); fired = f; paint(); return { lit: buf.reduce((s, k) => s + (k ? 1 : 0), 0), url: pic ? out.toDataURL() : null } },
    // the rivalry: the next gag from the bag (c25 plays it after a Giants home run against the Dodgers), the whole list, and for the tests a hash of the board
    nextGag, gags: () => [...GAGS], still: (n) => ANIM[n]?.still ?? null, sig: () => { let h = 0; for (let i = 0; i < buf.length; i++) h = (h * 31 + buf[i]) | 0; return h },
    // the wind on the pennants: { fromDeg, mph, cfDeg? } (null: the gentle wave), and what is set
    set wind(w) { setWind(w) }, windNow: () => (windNow ? { ...windNow } : null),
    set rate(k) { rate = Math.max(0.1, Math.min(8, k)) },
  }
}
