// Study 25 park life (Oracle only): the scoreboard behind center field is a live LED board, and pixel seagulls circle the outfield the way they gather late at Oracle,
// scattering when a ball leaves the park. The board shows two lines of text (the batter, TRACKING, the distance, HOME RUN flashing), and on top of that plays
// the Dodger gags (30 Oct, Andrew: "Every other board show let's kill I only want dodger gags on the board, that's literally it"): one after a Giants home run
// against the Dodgers, and one now and then while the board idles.
// The board is 72 x 36 LEDs of 0.61 m, sized to the screen of Oracle's own board in the park model; the animations use the middle 22 rows.
// One animation plays at a time, with at most two waiting.
// Over the board, the ORACLE PARK sign and its clock are bulbs too (29 Oct): the sign glows and reacts to home runs, the clock tells the time of the swing.
// Later on 29 Oct the sign and its clock were rebuilt in voxels from a photo of the real one, with the eight World Series pennants above (Q2, Q3; the bulbs are Q1).
import { FONT } from './vox25.js'
import { ORANGE } from './orange25.js'
export function initPark25(api, col, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const at = (bear, r, h) => { const b = (bear * Math.PI) / 180; return toWorld([r * Math.sin(b), r * Math.cos(b), h]) }
  const parts = []

  // ---- the LED board: a buffer of color codes per LED, drawn as round bulbs ----
  // the logic grid is 72 x 22 (every animation is drawn on it); the board itself has GHT rows, the logic rows centered with dark rows above and below
  const GW = 72, GH = 22, GHT = 36, ROW0 = 12, TB = 11, S = 10, LED = 0.614, LEDH = 0.611, SH = Math.round((S * LEDH) / LED)
  const buf = new Uint8Array(GW * GH), tbuf = new Uint8Array(GW * TB) // the gag, and the band its words go in (rows ROW0 - TB to ROW0)
  const ledAt = (j, i) => { const ly = j - ROW0, ty = j - (ROW0 - TB); return ly >= 0 && ly < GH ? buf[ly * GW + i] : ty >= 0 && ty < TB ? tbuf[ty * GW + i] : 0 }
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
      const i = n % GW, j = Math.floor(n / GW), k = ledAt(j, i)
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
    const old = yr < 2000, bg = old ? '#141414' : ORANGE.o, fg = old ? ORANGE.o : '#141414', txt = String(yr), logo = LOGO[old ? 'NY' : 'SF']
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
  // THE CLOCK PANICS (1 Nov, from GPT's second red team, Andrew's pick): a very long home run and the hands take off, faster and faster for three seconds (three
  // times round), overshoot by twelve minutes, stop dead, then the minute hand creeps back a minute at a time, with a little wait between, to the right time
  const PANIC = { up: 3, over: 3.6, wait: 4.2, end: 6.6, laps: 3, past: 12 }
  function panicAt(sp) {
    const t = sp.t, P = PANIC, top = sp.base + P.laps * 720
    if (t < P.up) return sp.base + P.laps * 720 * (t / P.up) ** 3
    if (t < P.over) return top + P.past * ease((t - P.up) / (P.over - P.up))
    if (t < P.wait) return top + P.past
    const k = Math.min(1, (t - P.wait) / (P.end - P.wait - 0.2)), steps = Math.floor(k * P.past), f = k * P.past - steps
    return top + P.past - steps - ease(Math.min(1, f * 3)) // a minute, a pause, a minute
  }
  function clockPanic() { if (o.still) return; const base = clk.live ? sfNow() : clk.target ?? clk.shown; clk.spin = { panic: true, t: 0, base }; clk.shown = base }
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
    if (clk.spin?.panic) { const sp = clk.spin; sp.t += dt; clk.shown = panicAt(sp); if (sp.t >= PANIC.end) { clk.spin = null; clk.shown = clk.live ? sfNow() : sp.base } }
    else if (clk.spin) { const sp = clk.spin; sp.t += dt; const k = ease(sp.t / sp.dur); clk.shown = sp.from + (sp.to - sp.from) * k; if (sp.t >= sp.dur) { clk.spin = null; clk.shown = clk.live ? sfNow() : clk.target } }
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
  const FIX = { b: '#5fd3ff', y: '#f2bc40', r: '#e4002b', g: '#8a8f99', n: '#a8713f', d: '#4a4f58', e: '#3fa34d' } // e: grass green (30 Oct, later: MOWED IN)
  const CODES = ' aowbyrgnde'
  const ci = (ch) => Math.max(0, CODES.indexOf(ch))
  let band = false // while set, put() writes into the caption band
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (band) { if (x >= 0 && x < GW && y >= 0 && y < TB) tbuf[y * GW + x] = ci(ch); return } if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = ci(ch) }
  const off = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < GW && y >= 0 && y < GH) buf[y * GW + x] = 0 }
  const rect = (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, ch) }
  const line = (x0, y0, x1, y1, ch) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch) }
  // a sprite at double size (the rivalry's players)
  const big = (spr, x, y) => { for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) { const c = spr[j][i]; if (c !== '.' && c !== ' ') { put(x + i * 2, y + j * 2, c); put(x + i * 2 + 1, y + j * 2, c); put(x + i * 2, y + j * 2 + 1, c); put(x + i * 2 + 1, y + j * 2 + 1, c) } } }
  const blit = (spr, x, y, flip = false) => { for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) { const c = spr[j][flip ? spr[j].length - 1 - i : i]; if (c !== '.' && c !== ' ') put(x + i, y + j, c) } }
  // text in Press Start 2P at 8 px (8 LEDs tall); clip = [y0, y1) keeps only those rows (the odometer roll)
  const tw = (s) => { gx.font = '8px PS2P'; return Math.round(gx.measureText(s).width) }
  // x = 'c' centers it, or loops it sideways when it is wider than the board (on the animation's clock)
  let animT = 0, hush = false
  function text(s, x, y, ch = 'a', clip = null) {
    if (hush) return // a kill just happened: let it land
    const toBand = gagOn && y <= 1, dst = toBand ? tbuf : buf, rows = toBand ? TB : GH
    if (toBand) y = 2
    const plain = s.replace(/[MW]/g, ' ') // drawn by hand below
    gx.clearRect(0, 0, GW, GH); gx.fillStyle = '#fff'; gx.font = '8px PS2P'; gx.textBaseline = 'top'
    let x2 = null
    if (x === 'c') { const w = tw(s); if (w <= GW) x = Math.round((GW - w) / 2); else { x = Math.round(2 - ((animT * 26) % (w + 24))); x2 = x + w + 24 } }
    gx.fillText(plain, x, y); if (x2 != null) gx.fillText(plain, x2, y)
    const px = gx.getImageData(0, 0, GW, GH).data
    for (let j = 0; j < rows; j++) { if (clip && (j < clip[0] || j >= clip[1])) continue; for (let i = 0; i < GW; i++) if (px[(j * GW + i) * 4 + 3] > 110) dst[j * GW + i] = ci(ch) }
    for (const ox of x2 != null ? [x, x2] : [x]) [...s].forEach((c, k) => { const g = BIG[c]; if (g) for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (g[j][i] === '#') { const xx = ox + k * 8 + i, yy = y + j; if (xx >= 0 && xx < GW && yy >= 0 && yy < rows) dst[yy * GW + xx] = ci(ch) } })
  }
  // SLIM (31 Oct): a 5 by 7 face, six LEDs a letter, so a punch of up to eleven letters fits the band standing still (POINT TAKEN, NO FEEDING, EXTRA MEAT)
  const SLIM = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'], C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'], E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'], M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'], O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'], S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'], '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  }
  // the band in SLIM, centered (during a gag; otherwise the board's own text)
  function slim(s, ch = 'a') {
    if (!gagOn) { text(s, 'c', 0, ch); return }
    if (hush) return
    const w = [...s].reduce((a, c) => a + (c === ' ' ? 4 : 6), -1), x0 = Math.round((GW - w) / 2)
    let x = x0
    for (const c of s) { const g = SLIM[c]; if (g) for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') { const xx = x + i; if (xx >= 0 && xx < GW) tbuf[(2 + j) * GW + xx] = ci(ch) } x += c === ' ' ? 4 : 6 }
  }
  const BIG = { M: ['#.....#', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#.....#', '#.....#'], W: ['#.....#', '#.....#', '#.....#', '#..#..#', '#.#.#.#', '##...##', '#.....#'] }
  let gagOn = false // a gag is drawing (its words go to the band)
  let lines = ['NUKE NAVIGATOR', ''], color = null, flash = 0, scroll = 0, marquee = true
  const ready = document.fonts?.load?.('8px PS2P').catch(() => {}) ?? Promise.resolve()
  // the two lines of text: centered when they fit, scrolling when they do not (or in the idle marquee)
  function drawLines() {
    const row = (s, y) => { if (!s) return; const w = tw(s); if (marquee || w > GW - 2) text(s, GW - (scroll % (w + 24 + GW)), y); else text(s, 'c', y) }
    if (lines[1]) { row(lines[0], 2); row(lines[1], 12) } else row(lines[0], 7)
  }
  function paint() {
    const c = col(), on = flash > 0 && Math.floor(flash * 6) % 2 ? c.tx : color ?? c.acc
    const P = [null, on, c.acc, c.tx, FIX.b, FIX.y, FIX.r, FIX.g, FIX.n, FIX.d, FIX.e]
    if (gStyle !== 4) { paintVoxBoard(P); return }
    ox.fillStyle = '#050505'; ox.fillRect(0, 0, out.width, out.height)
    for (let y = 0; y < GHT; y++) for (let x = 0; x < GW; x++) {
      const k = ledAt(y, x)
      ox.fillStyle = k ? P[k] : '#1a1a1a'
      ox.beginPath(); ox.ellipse(x * S + S / 2, y * SH + SH / 2, S * (k ? 0.44 : 0.3), SH * (k ? 0.44 : 0.3), 0, 0, Math.PI * 2); ox.fill()
    }
    tex.needsUpdate = true
  }

  // ---- the sprites (one character per LED: o accent, w bone, b water, y gold, r red, g grey, n brown, d dark grey) ----
  const DODGER = ['.bb.', '.ww.', 'bwwb', '.ww.', '.ww.', '.dd.', 'd..d'] // the small one, thrown by the catapult
  const SPR = {
    crab: [['rr...........rr', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '.r.r.r...r.r.r.', 'r.r.r.....r.r.r'],
      ['.rr.........rr.', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '..r.r.r.r.r.r..', '.r.r.r...r.r.r.']],
    seal: [['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'gggggggggggg..', 'gggggggggggg..', '.ggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
      ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'ggggggggggggg.', '......gggggg..', 'gggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg']],
    gull: [['d.....d', '.g...g.', '..wwwy.'], ['..wwwy.', '.g...g.', 'd.....d']], // (31 Oct: the park's gull, grey wings with dark tips and a yellow bill)
  }

  // ---- the animations: each draws a frame at time t (seconds), over dur seconds; a = its arguments ----
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  const water = (t, y0 = 19) => { for (let x = 0; x < GW; x++) { put(x, y0 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); put(x, GH - 1, 'b') } }
  const ground = () => line(0, GH - 1, GW - 1, GH - 1, 'd')
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
  const SKEL = ['..wwww..', '.w.ww.w.', '..wwww..', '...ww...', '.wwwwww.', 'w.w..w.w', 'w.wwww.w', '..w..w..', '..wwww..', '...ww...', '..w..w..', '..w..w..', '..w..w..', '.ww..ww.']
  const SHIRT = ['oo..oo', 'oooooo', '.oooo.', '.oooo.']
  const disc = (cx, cy, r, ch, sy = 1) => { const ry = Math.ceil(r * sy), rx = Math.ceil(r); for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x + (y * y) / (sy * sy) <= r * r) put(cx + x, cy + y, ch) }
  // ---- the players (30 Oct, Andrew: "The giants player needs to have an SF on his shirt and the dodgers player an LA to make it abundantly clear"): 11 by 14 LEDs,
  // drawn one to one. The Giant in a black cap and his orange jersey with SF across it in bone; the Dodger in a blue cap and a blue jersey with LA in white (30 Oct, later: "inverse of what you have now"). The bill
  // points the way he faces, so the letters never mirror
  const LET = { S: ['###', '#..', '###', '..#', '###'], F: ['###', '#..', '##.', '#..', '#..'], L: ['#..', '#..', '#..', '#..', '###'], A: ['.#.', '#.#', '###', '#.#', '#.#'] }
  const chest = (word, shirt, ink) => [0, 1, 2, 3, 4].map((j) => [...word].map((c) => LET[c][j].replace(/#/g, ink).replace(/\./g, shirt)).join(shirt)) // 7 wide
  const kit = (cap, shirt, ink, word, dir) => [
    '...' + cap.repeat(5) + '...', dir > 0 ? '...' + cap.repeat(7) + '.' : '.' + cap.repeat(7) + '...',
    '...wwwww...', '...wdwdw...', '...wwwww...',
    '.' + shirt.repeat(9) + '.',
    ...chest(word, shirt, ink).map((c, j) => (j === 4 ? 'w' : shirt) + shirt + c + shirt + (j === 4 ? 'w' : shirt)), // arms, the letters, his hands
    '..ggg.ggg..', '..gg...gg..', '.ddd...ddd.',
  ]
  const SFG = kit('d', 'o', 'w', 'SF', 1), SFGL = kit('d', 'o', 'w', 'SF', -1), LAD = kit('b', 'b', 'w', 'LA', -1), LADR = kit('b', 'b', 'w', 'LA', 1)
  const run = (spr, f) => [...spr.slice(0, 11), ...(f ? ['..gg...gg..', '.gg.....gg.', 'dd.......dd'] : ['...ggggg...', '....ggg....', '...dd.dd...'])] // his legs, running
  const headless = (spr) => [...Array(5).fill('...........'), ...spr.slice(5)]
  const upside = (spr) => spr.slice().reverse()
  // LOU SEAL (the Giants' mascot): a sea lion in the cap and the home jersey, SF in orange, his flippers out of the sleeves
  const LOU = ['...ddodd...', '...ddddddd.', '...ggggg...', '..ggggdgg..', '..gggggggg.', '...gggggdw.', '....ggg....', '.wwwwwwwww.',
    ...chest('SF', 'w', 'o').map((c) => 'gw' + c + 'wg'), 'gg.ggggg.gg']
  // her (SHE LEFT HIM): blonde, a red dress; and the man with the cart (BIPPED): a beanie, a beard, a long brown coat
  const WIFE = ['..yyyyy..', '.yyyyyyy.', '.ywwwwwy.', '.ywdwdwy.', '.ywwwwwy.', '.yy.w.yy.', '..rrrrr..', '.rrrrrrr.', 'w.rrrrr.w', '..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', '..w...w..', '.dd...dd.']
  const MAN = ['..nnn..', '.nnnnn.', '.wwwww.', '.wdwdw.', '.ggggg.', '..ggg..', 'nnnnnnn', 'nnnnnnn', 'nnnnnnn', 'wnnnnnw', '.nnnnn.', '.dd.dd.', '.dd.dd.', 'dd..dd.']
  // three-by-five letters for the small words (a thought bubble, what she says)
  const MINI = { A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
    F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'], K: ['#.#', '#.#', '##.', '#.#', '#.#'],
    L: ['#..', '#..', '#..', '#..', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['###', '#..', '###', '..#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], "'": ['#', '#', '.', '.', '.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '!': ['#', '#', '#', '.', '#'], '.': ['.', '.', '.', '.', '#'], $: ['.#.', '###', '##.', '.##', '###'], ...DIG }
  const mstep = (c) => (c === ' ' ? 3 : (MINI[c]?.[0].length ?? 3) + 1)
  const miniW = (s) => [...s].reduce((w, c) => w + mstep(c), -1)
  const mini = (s, x, y, ch, scene = false) => { const bd = gagOn && !scene && y <= 7; if (bd) { band = true; y = y <= 1 ? 0 : 6 } if (x === 'c') x = Math.round((GW - miniW(s)) / 2); for (const c of s) { const g = MINI[c]; if (g) blit(g.map((r) => r.replace(/#/g, ch)), x, y); x += mstep(c) } band = false }
  // a bubble round mini text, its box from (x, y); a speech bubble's tail runs to (tx, ty), a thought bubble trails two dots there instead
  const bubble = (lines, x, y, tx, ty, thought = false) => {
    const w = Math.max(...lines.map(miniW)) + 4, h = lines.length * 6 + 3
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) off(x + i, y + j)
    line(x + 1, y, x + w - 2, y, 'g'); line(x + 1, y + h - 1, x + w - 2, y + h - 1, 'g'); line(x, y + 1, x, y + h - 2, 'g'); line(x + w - 1, y + 1, x + w - 1, y + h - 2, 'g')
    lines.forEach((s, k) => mini(s, x + 2, y + 2 + k * 6, 'w', true))
    const bx = Math.min(Math.max(tx, x + 2), x + w - 3), by = y + h - 1
    if (thought) { put(tx, ty, 'w'); rect((tx + bx) / 2, (ty + by) / 2, 2, 2, 'w') } else line(bx, by, tx, ty, 'g')
  }
  // SPLAT: what every kill now leaves behind, from t0 at (x, y): a burst of red, a geyser that keeps pumping, an eyeball on a string of nerve, a bone, a tooth,
  // a heart still beating on the ground, and a pool spreading out along the bottom row (30 Oct, later, Andrew: "More crazy cartoonish 'wtf' gore for all of these gags")
  const splat = (t, t0, x, y, k = 1) => {
    const u = t - t0
    if (u < 0) return
    if (u < 0.45) hush = true // (GPT's rule: the splat gets a moment of quiet)
    if (u < 1.6) for (let i = 0; i < 40 * k; i++) { const a = -Math.PI * (0.05 + hash(i + 300) * 0.9), v = (8 + hash(i + 301) * 26) * k, px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 20 * u * u; if (py < GH) put(px, py, i % 9 ? 'r' : 'w') } // the burst
    if (u < 3.4) for (let i = 0; i < 8; i++) { const s2 = (u * 2.2 + i / 8) % 1; put(x + (hash(i + 320) - 0.5) * 3 * s2, y - s2 * 9 * k + s2 * s2 * 10 * k, 'r') } // the geyser, pumping
    const fly = (i, ch, v, a, f) => { const px = x + Math.cos(a) * v * Math.min(u, f), py = Math.min(GH - 2, y + Math.sin(a) * v * Math.min(u, f) + 18 * Math.min(u, f) ** 2); return [Math.round(px), Math.round(py)] }
    const [ex, ey] = fly(0, 'w', 22 * k, -2.3, 1.1); rect(ex, ey, 2, 2, 'w'); put(ex + (u < 1.1 ? 0 : 1), ey + 1, 'b'); line(ex + 2, ey + 1, ex + 2 + Math.min(4, u * 6), ey + 3, 'r') // the eye on its nerve
    const [bx, by] = fly(1, 'w', 26 * k, -0.6, 1.0); rect(bx, by, 4, 1, 'w'); put(bx - 1, by - 1, 'w'); put(bx + 4, by + 1, 'w') // a bone
    const [tx, ty] = fly(2, 'w', 30 * k, -1.2, 0.9); put(tx, ty, 'w') // a tooth
    if (u > 0.8) { const [hx, hy] = fly(3, 'r', 14 * k, -0.3, 0.8), beat = Math.floor(t * 5) % 2; rect(hx, hy - beat, 2 + beat, 2 + beat, 'r') } // the heart, still going
    const pool = Math.min(26 * k, u * 9); for (let i = -pool; i <= pool; i++) put(x + i, GH - 2, 'r')
  }
  const ANIM = {
    // ---- THE RIVALRY (29 Oct, later, Andrew: "a giants player fucking up a dodger player ... spy vs. spy shit. Gore, blood"; 29 Oct, night: "insanely comical 'oh no
    // DING (30 Oct, GPT review, his "change"): the cable car hits him and he ends up stuck to the front footboard, dangling by his insides; the gripman punches a
    // ticket and drops it on him as it rolls on
    runover: { dur: 8.0, still: 3.4, draw(t) {
      line(0, 20, GW - 1, 20, 'g'); line(0, 21, GW - 1, 21, 'd'); for (let x = 1; x < GW; x += 4) put(x, 21, 'g') // the rails, the slot
      const W = 38, x = Math.round(t < 2.4 ? -W - 2 + t * 24 : -W - 2 + 2.4 * 24 + (t - 2.4) * 7), hit = 46, past = x + W >= hit
      if (!past) blit(LAD, hit - 1, 6)
      else for (let i = 0; i < 12; i++) put(hit - 6 + ((i * 7) % 18), 19 + (i % 2), 'r')
      const rider = (px, up) => { rect(px, 8, 2, 1, 'd'); rect(px, 9, 2, 1, 'w'); rect(px, 10, 2, 3, 'o'); rect(px, 13, 2, 3, 'g'); if (up) { put(px - 1, 8, 'w'); put(px + 2, 8, 'w') } }
      if (x < GW + 4) {
        rect(x - 1, 6, W + 2, 1, 'w'); rect(x, 7, W, 1, 'r'); rect(x + 18, 5, 2, 1, 'y')
        for (const px of [0, 4, 9, 28, 33, W - 1]) line(x + px, 8, x + px, 15, 'y')
        rect(x + 10, 8, 18, 8, 'r'); for (let i = 0; i < 4; i++) rect(x + 11 + i * 4, 9, 3, 3, 'y'); rect(x + 10, 12, 18, 1, 'w')
        rect(x, 13, 10, 1, 'n'); rect(x + 28, 13, 10, 1, 'n')
        rect(x - 1, 16, W + 2, 1, 'n'); rect(x, 17, W, 1, 'd'); rect(x + 4, 18, 3, 2, 'd'); rect(x + W - 7, 18, 3, 2, 'd'); line(x + 19, 17, x + 19, 21, 'g')
        rider(x + 2, false); rider(x + 6, false); rider(x + 35, false); rider(x + 30, false); line(x + 32, 15, x + 34, 9, 'g')
        if (past) { // him, hung off the front footboard by his insides, dragged along
          const fx = x + W + 1, tw = Math.floor(t * 9) % 2
          for (let i = 0; i < 7; i++) put(fx + i, 16 + Math.round(Math.sin(i * 1.3 + t * 8)), 'r')
          rect(fx + 7, 18, 8, 2, 'b'); rect(fx + 15, 18, 3, 2, 'w'); put(fx + 16, 18, 'd'); rect(fx + 18, 18, 2, 2, 'b'); rect(fx + 5, 19 + tw, 2, 1, 'g')
          if (t > 3.4) { const u = Math.min(1, (t - 3.4) / 0.8); rect(x + 34 + u * (fx + 9 - x - 34), 8 + u * 9 + Math.sin(u * 9) * 1.2, 2, 1, 'w') } // the punched ticket, fluttering down onto him
        }
      }
      splat(t, 2.0, 46, 16)
      text(t < 2.0 ? (Math.floor(t * 4) % 2 ? 'DING' : '') : t < 4.6 ? 'DING' : 'NO STOPS', 'c', 0, 'y')
    } },
    // GULP (GPT review, his "fix"): a Dodger treading water, a sea lion under him, the water red; then it comes back up and spits out his whole skeleton, cap on,
    // still trying to swim
    sealsnack: { dur: 8.2, still: 5.4, draw(t) {
      water(t, 16)
      const lx = 40
      if (t < 2.2) { blit(LAD.slice(0, 10), lx - 2, 7); if (Math.floor(t * 4) % 2) { rect(lx - 4, 9, 2, 2, 'w'); rect(lx + 9, 9, 2, 2, 'w') } }
      const rise = t < 2 ? 0 : t < 2.6 ? (t - 2) / 0.6 : t < 3.4 ? 1 : t < 4.2 ? Math.max(0, 1 - (t - 3.4) / 0.6) : t < 4.6 ? (t - 4.2) / 0.4 : 1
      if (rise > 0) blit(SPR.seal[(t > 2.3 && t < 3.0) || (t > 4.6 && t < 5.2) ? 1 : 0], lx - 3, 20 - rise * 11)
      if (t > 2.6) for (let i = 0; i < 26; i++) put(lx - 8 + ((i * 11) % 26), 16 + (i % 4) + Math.sin(t * 3 + i) * 0.6, 'r')
      if (t > 4.8) { const u = Math.min(1, (t - 4.8) / 0.6), sx = lx + 6 + u * 14, sy = 9 - Math.sin(u * Math.PI) * 6 + u * 6; blit(SKEL.slice(0, 9), sx, sy); rect(sx + 1, sy - 1, 6, 1, 'b'); if (u >= 1) { const f = Math.floor(t * 6) % 2; put(sx - 1, sy + 5 - f, 'w'); put(sx + 8, sy + 5 - (1 - f), 'w') } } // spat out, cap on, paddling
      splat(t, 2.6, 40, 15)
      text(t < 2.2 ? 'HELP' : t < 4.8 ? 'CHUM TIME' : 'LOW TIDE', 'c', 0, t < 2.2 ? 'b' : 'w')
    } },
    // LEAVES IN THE 3RD (GPT review, his "keep" with its changes): the thought, the run, the traffic; a skeleton at the wheel; the car behind signals to merge, its
    // driver a skeleton too, and the whole line inches forward one LED
    leaves3rd: { dur: 9.4, still: 7.6, draw(t) {
      ground()
      if (t < 2.4) { blit(LADR, 3, 7); if (t > 0.3) bubble(['BEAT THE', 'TRAFFIC'], 22, 0, 14, 8, true); return }
      if (t < 4.4) {
        const u = t - 2.4
        text('BOT 3', 'c', 0, 'w')
        rect(58, 9, 2, 12, 'g'); rect(68, 9, 2, 12, 'g'); line(58, 9, 69, 9, 'g'); for (let x = 61; x < 68; x += 2) line(x, 10, x, 20, 'd')
        const x = 3 + ease(u / 1.9) * 43, f = Math.floor(t * 10) % 2
        blit(run(LADR, f), x, 7)
        for (let i = 1; i < 4; i++) put(x - i * 2, 18 + (i % 2), 'g')
        return
      }
      const T = t - 2.2, C = ['r', 'y', 'b', 'w', 'g', 'o'], inch = T >= 6.2 ? 1 : 0
      C.forEach((c, i) => {
        const x0 = -6 + i * 13 + inch
        rect(x0, 15, 12, 4, c); rect(x0 + 3, 11, 6, 4, c); rect(x0 + 4, 12, 4, 2, 'd'); rect(x0 + 1, 19, 2, 2, 'd'); rect(x0 + 9, 19, 2, 2, 'd')
        if (Math.floor(T * 3 + i) % 2) put(x0, 16, 'r')
        const skull = () => { put(x0 + 5, 12, 'w'); put(x0 + 6, 12, 'w'); put(x0 + 5, 13, 'w'); put(x0 + 4, 12, 'g'); put(x0 + 7, 13, 'g') }
        if (c === 'b') { if (T < 5.0) { put(x0 + 5, 12, 'b'); put(x0 + 5, 13, 'w') } else skull() }
        if (c === 'y' && T > 5.6) { skull(); if (Math.floor(T * 4) % 2) put(x0 + 11, 15, 'o') } // the car behind: a skeleton too, signaling to merge
      })
      text(T < 5.0 ? 'FINAL' : 'GRIDLOCK', 'c', 0, T < 5.0 ? 'w' : Math.floor(T * 3) % 2 ? 'b' : 'w')
    } },
    // BIPPED: he parks on King Street and walks to the game; a brick, the window; and while he is gone a man pulling a shopping cart climbs in through the hole and
    // makes himself at home in the driver's seat (30 Oct, Andrew: "For bipped let's have a homeless person get in the car")
    bipped: { dur: 10.4, still: 7.4, draw(t) {
      ground()
      const cx = Math.round(-30 + ease(t / 0.9) * 46), smashed = t >= 2.8, inside = t >= 5.0
      rect(cx, 14, 26, 5, 'b'); rect(cx + 5, 10, 14, 4, 'b'); rect(cx + 2, 19, 4, 2, 'd'); rect(cx + 19, 19, 4, 2, 'd'); put(cx + 25, 15, 'y'); put(cx, 15, 'r')
      if (!smashed) rect(cx + 6, 11, 12, 2, 'g') // the glass
      else { rect(cx + 6, 11, 12, 2, 'd'); for (const [i, j] of [[6, 11], [8, 12], [11, 11], [17, 12], [15, 11]]) put(cx + i, j, 'w') } // a hole with a jagged rim
      if (t > 1.0 && t < 2.6) blit(LADR, 44 + ((t - 1.0) / 1.5) * 32, 7) // off to the game
      if (t > 2.4 && t < 2.8) { const k = (t - 2.4) / 0.4; rect(70 - k * 48, 2 + k * 9, 2, 2, 'n') } // the brick
      if (smashed && t < 3.6) for (let i = 0; i < 12; i++) { const u = t - 2.8; put(cx + 8 + (i % 6) * 2 + (i - 6) * u * 4, 12 + u * 10 * (0.5 + (i % 3) * 0.3) + u * u * 12, 'w') }
      // the man and his cart: he walks in pulling it, leaves it by the back bumper and climbs over the trunk and in through the hole
      const cart = (x) => { line(x, 13, x + 9, 13, 'g'); line(x, 17, x + 9, 17, 'g'); line(x, 13, x + 1, 17, 'g'); line(x + 9, 13, x + 8, 17, 'g'); for (const [i, c] of [[2, 'y'], [4, 'w'], [6, 'b']]) rect(x + i, 11, 2, 2, c); rect(x + 1, 18, 1, 1, 'd'); rect(x + 8, 18, 1, 1, 'd'); line(x + 9, 13, x + 11, 11, 'g') }
      if (t > 3.4) {
        const k = ease((t - 3.4) / 1.0), mx = 74 - k * 30, climb = Math.max(0, Math.min(1, (t - 4.4) / 0.6))
        cart(Math.max(mx + 9, 58))
        if (!inside) blit(MAN, mx - climb * 12, 7 - climb * 6)
        else blit(MAN.slice(0, 5), cx + 12, 7) // in the driver's seat, his beanie and beard over the door
      }
      if (t > 5.8) { const k = ease((t - 5.8) / 0.8); blit(LAD, 74 - k * 30, 7); if (t > 6.6 && t < 7.2) text('?!', 56, 0, 'w') }
      if (t > 7.2 && Math.floor(t * 8) % 2) { put(cx + 27, 14, 'y'); put(cx + 28, 13, 'y'); put(cx + 28, 15, 'y') } // he honks at him
      text(t < 1.0 ? 'KING ST' : t < 3.0 ? '' : t < 5.8 ? (Math.floor(t * 5) % 2 ? 'BIPPED' : '') : t < 7.2 ? '' : 'MOVED IN', 'c', 0, t < 5.8 ? 'r' : 'w')
    } },
    // WOOD CHIPPER (30 Oct, Andrew: "I want them fed in from the top head first kicking their legs"): the Giant holds him up by the ankles over the hopper, lets go, and
    // he goes in head first, his legs kicking until the last of them is gone; blue, white and red out of the chute and over the whole board, then his shoes
    chipper: { dur: 8.6, still: 2.2, draw(t) {
      ground()
      const drop = 1.1, sh = t > drop && t < 4.4 ? Math.floor(t * 30) % 2 : 0, kick = Math.floor(t * 12) % 2
      blit(SFG, 14, 7)
      // him, upside down, his shoes at the top; after the drop he sinks in, and only what is above the hopper's mouth (row 11) shows
      const y0 = t < drop ? -2 : Math.min(14, -2 + ((t - drop) / 3.0) * 16), jig = t < drop ? Math.round(Math.sin(t * 9)) : kick
      const me = upside(LAD).map((r, j) => (j < 3 && t >= drop ? (kick ? ['dd.......dd', '.gg.....gg.', '..gg...gg..'] : ['...dd.dd...', '....ggg....', '...ggggg...'])[j] : r))
      me.forEach((r, j) => { const y = Math.round(y0) + j; if (y < 11) blit([r], 30 + jig, y) })
      if (t < drop) line(24, 12, 31, 0, 'o') // the Giant's arm, up to the ankles
      else { line(14, 12, 12, 6, 'o'); line(24, 12, 26, 6, 'o') } // and then both up
      rect(27 + sh, 15, 20, 5, 'y'); rect(27 + sh, 17, 20, 1, 'o'); rect(29 + sh, 20, 3, 1, 'd'); rect(42 + sh, 20, 3, 1, 'd') // the chipper
      line(27 + sh, 11, 30 + sh, 15, 'g'); line(44 + sh, 11, 41 + sh, 15, 'g'); rect(25 + sh, 11, 3, 1, 'g'); rect(44 + sh, 11, 3, 1, 'g') // the hopper
      line(47 + sh, 16, 55 + sh, 8, 'g'); line(47 + sh, 17, 56 + sh, 8, 'g') // the chute
      for (let i = 0; i < 70; i++) {
        const born = 1.4 + (i / 70) * 2.8, u = t - born
        if (u < 0) continue
        const x = 56 + (-55 + hash(i) * 75) * u, y = 8 + (-10 - hash(i + 7) * 16) * u + 22 * u * u
        put(x, Math.min(GH - 1, y), 'bwrr'[i % 4])
      }
      const n = Math.max(0, Math.min(140, Math.round((t - 1.7) * 45))) // on the lens
      for (let i = 0; i < n; i++) put(Math.floor(hash(i + 500) * GW), Math.floor(hash(i + 900) * GH), i % 7 ? 'r' : 'b')
      if (t > 4.4 && t < 5.4) for (const d of [0, 3]) { const u = t - 4.4 - d * 0.05; rect(56 + u * 14 + d, 8 - u * 10 + u * u * 16, 2, 1, 'd') } // his shoes, last
      splat(t, 1.4, 56, 8, 0.8) // the gore
      if (t < 1.1) text('FEED ME', 'c', 0, 'w'); else if (t > 4.8) text('MULCHED', 'c', 0, Math.floor(t * 5) % 2 ? 'r' : 'w')
    } },
    // ALCATRAZ (redone, 30 Oct, later: "can we put him on a real island? I liked the throwing away of the key"): one shot of the Rock in the bay: the cell on it, the
    // lighthouse, the Giant; the bars slam, the key goes into the bay and a sea lion takes it; the days, the beard, the bones; then the door opens, and he falls apart
    alcatraz: { dur: 9.8, still: 2.0, draw(t) {
      for (let x = 0; x < GW; x++) { put(x, 18 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); line(x, 19, x, GH - 1, (x + Math.floor(t * 3)) % 9 ? 'b' : 'w') } // the bay
      for (let x = 10; x < 64; x++) { const top = 17 - Math.round(Math.min(x - 10, 63 - x, 4) * 0.5); line(x, top, x, GH - 1, x % 3 ? 'g' : 'd') } // the Rock
      line(60, 4, 60, 15, 'w'); line(61, 4, 61, 15, 'w'); rect(60, 3, 2, 1, Math.floor(t * 2) % 2 ? 'y' : 'd') // the lighthouse
      const bars = (off) => { for (let k = 0; k < 6; k++) { const bx = 33 + k * 4 + off; line(bx, 2, bx, 15, 'g') } line(33 + off, 2, 53 + off, 2, 'g'); line(33 + off, 15, 53 + off, 15, 'g') }
      const day = t < 3.4 ? 0 : t < 4.8 ? 99 : 9999, bone = t >= 6.0, free = t >= 7.4
      if (!bone) { blit(LAD.slice(0, 13), 37, 2); const beard = day === 99 ? 3 : day === 9999 ? 7 : 0; if (beard) rect(41, 7, 3, beard, 'g') }
      else if (!free) { blit(SKEL.slice(0, 13), 38, 2); rect(39, 1, 6, 1, 'b') }
      else { for (let i = 0; i < 12; i++) put(36 + ((i * 5) % 12), 15 - (i % 2), 'w'); rect(40, 14, 4, 1, 'b') } // a heap of bones, the cap
      const shut = Math.min(1, t / 0.8), open = free ? Math.min(16, (t - 7.4) * 30) : 0
      bars(Math.round((1 - shut) * 24) + Math.round(open))
      blit(SFG.slice(0, 13), 14, 2) // the Giant, on the Rock
      if (t > 1.0 && t < 1.8) blit(['.yyy....', 'yy.yyyyy', '.yyy..y.'], 25, 7) // the key, held up
      if (t > 1.8 && t < 2.6) { const k = (t - 1.8) / 0.8; rect(25 - k * 22, 7 - Math.sin(k * Math.PI) * 6 + k * 10, 3, 1, 'y') } // over his shoulder, into the bay
      if (t > 2.6 && t < 3.0) for (let i = 0; i < 6; i++) { const v = t - 2.6; put(3 + (i - 3) * v * 8, 18 - v * 12 + v * v * 30, 'w') }
      if (t > 2.8 && t < 4.4) { const rise = Math.min(1, (t - 2.8) / 0.3) - Math.max(0, (t - 3.9) / 0.5); if (rise > 0) blit(SPR.seal[t > 3.0 && t < 3.4 ? 1 : 0], -4, 22 - rise * 10) } // a sea lion takes it
      const marks = day === 99 ? 8 : day === 9999 ? 16 : 0; for (let m = 0; m < marks; m++) line(46 + (m % 4) * 2, 4 + Math.floor(m / 4) * 3, 46 + (m % 4) * 2, 5 + Math.floor(m / 4) * 3, 'w')
      text(t < 1.0 ? 'ALCATRAZ' : t < 1.8 ? 'LIFE' : t < 3.4 ? 'NO KEY' : t < 4.8 ? 'DAY 99' : t < 7.4 ? 'DAY 9999' : 'PAROLED', 'c', 0, t < 7.4 ? 'w' : 'e')
    } },
    // T-SHIRT CANNON (GPT review, his "change"): Lou Seal, point blank; the head is gone and the free shirt floats down onto the body, which stands up straight and
    // shows off the logo
    tshirt: { dur: 8.4, still: 2.3, draw(t) {
      ground()
      const lx = 33, fire = 2.0, rec = t > fire && t < fire + 0.3 ? -2 : 0
      blit(LOU, 1 + rec, 7)
      const cannon = () => { for (let d = 0; d < 3; d++) line(9 + rec, 15 + d, 27 + rec, 9 + d, 'g'); rect(9 + rec, 17, 3, 3, 'd'); rect(26 + rec, 8, 2, 5, 'g') }
      if (t < fire) { blit(LAD, lx - 2, 7); cannon(); text('FREE T-SHIRT', 'c', 0, 'o'); return }
      const u = t - fire
      if (u < 1.4) for (let i = 0; i < 28; i++) { const a = -Math.PI * hash(i) * 1.1, v = 10 + hash(i + 3) * 22, x = lx + 4 + Math.cos(a) * v * u + 6 * u, y = 9 + Math.sin(a) * v * u + 18 * u * u; put(x, Math.min(GH - 1, y), 'rrrbww'[i % 6]) }
      const proud = u > 2.6 ? Math.floor(t * 3) % 2 : 0
      blit(headless(LAD), lx - 2, 7 - proud)
      if (u < 2.4) for (let i = 0; i < 6; i++) { const s = (u * 2.5 + i / 6) % 1; put(lx + 3 + (i - 2.5) * s * 2, 11 - s * 9 + s * s * 10, 'r') }
      const land = Math.min(1, u / 2.4), sx = lx - 1 + Math.sin(u * 5) * 4 * (1 - land), sy = -2 + land * 14 - proud
      if (land < 1) blit(SHIRT, sx + 2, sy)
      else { rect(lx - 1, 12 - proud, 9, 5, 'o'); blit(chest('SF', 'o', 'w'), lx, 12 - proud) } // the shirt on him, SF out front
      cannon()
      splat(t, 2.0, 37, 10, 1.2)
      text(u < 1.0 ? 'BOOM' : u > 2.6 ? 'ONE SIZE' : '', 'c', 0, u < 1.0 ? 'y' : 'w')
    } },
    // STEAMROLLER (30 Oct, Andrew: "has to be a bigger machine"): the full height of the board, a drum taller than he is, the Giant up under the canopy; flat as a
    // pennant, then run up a pole as one
    steamroller: { dur: 9.6, still: 1.3, draw(t) {
      ground()
      const lx = 40, x = Math.round(-48 + (t / 4.0) * 124), flat = x + 42 >= lx + 2
      if (!flat) blit(LAD, lx - 2, 7)
      else if (t < 4.4) { rect(lx - 3, 20, 16, 1, 'b'); put(lx - 3, 20, 'w'); put(lx - 2, 20, 'b'); rect(lx + 9, 20, 4, 1, 'd'); put(lx + 1, 20, 'd'); for (let i = 0; i < 6; i++) put(lx - 5 + i * 4, GH - 1, 'r') }
      if (x < GW + 4) {
        const dc = x + 34, a = t * 5
        disc(dc, 13, 8, 'g'); for (let k = 0; k < 4; k++) line(dc, 13, dc + Math.cos(a + (k * Math.PI) / 2) * 7, 13 + Math.sin(a + (k * Math.PI) / 2) * 7, 'd'); disc(dc, 13, 2, 'd') // the drum, turning
        rect(x + 25, 3, 18, 2, 'y'); rect(x + 25, 3, 2, 8, 'y'); rect(x + 41, 3, 2, 8, 'y') // the yoke over it
        rect(x, 9, 26, 10, 'y'); rect(x, 12, 26, 1, 'o'); rect(x + 2, 15, 20, 1, 'd') // the body
        rect(x + 4, 0, 16, 1, 'y'); line(x + 5, 1, x + 5, 8, 'y'); line(x + 18, 1, x + 18, 8, 'y') // the canopy
        blit(SFG.slice(0, 9), x + 7, 1) // the Giant at the wheel
        disc(x + 8, 17, 4, 'd'); disc(x + 8, 17, 1, 'g') // the back wheel
        line(x + 1, 1, x + 1, 8, 'g'); for (let i = 0; i < 3; i++) put(x + 1 - ((t * 9 + i * 3) % 9), ((i + Math.floor(t * 6)) % 2), 'g') // the stack, puffing
      }
      if (t >= 4.4) {
        line(62, 7, 62, 20, 'g'); put(62, 6, 'y')
        const k = ease((t - 4.4) / 0.8)
        if (k < 1) rect(lx - 3 + k * (62 - lx - 13), 20 - k * 12, 16 - k * 4, 1, 'b')
        else { // him as a pennant: cap, face, jersey, legs, tapering away from the pole, waving
          const rows = [['b', 12], ['w', 11], ['b', 9], ['b', 8], ['g', 6], ['d', 4]]
          rows.forEach(([c, len], r) => { for (let i = 0; i < len; i++) { const yy = 8 + r + Math.round(Math.sin(i * 0.6 - t * 6) * 0.8 * (i / 9)); put(61 - i, yy, r === 1 && (i === 3 || i === 6) ? 'd' : r === 2 && i === 5 ? 'w' : c) } })
          splat(t, 1.6, 42, 19, 1.3) // the gore
      text('NEW PENNANT', 'c', 0, 'o')
        }
      }
    } },
    // THE BIRDS (GPT review, his "fix"): SF gulls, petty: they eat him to the bone; one finds an eyeball, swallows it, coughs it up into another one's beak, and that
    // one flies off with it looking around
    birds: { dur: 9.0, still: 3.4, draw(t) {
      ground()
      const lx = 32, top = 7, eaten = Math.max(0, Math.min(1, (t - 2.2) / 2.4))
      if (t < 5.6) {
        blit(LAD, lx - 2, top)
        const rows = Math.round(eaten * 14)
        for (let j = 0; j < rows; j++) { for (let i = -2; i < 9; i++) off(lx + i, top + j); blit([SKEL[j]], lx, top + j) }
        if (t > 2.0 && t < 4.6) { const w = Math.floor(t * 10) % 2; line(lx - 1, top + 6, lx - 3, top + 2 + w * 2, 'w'); line(lx + 8, top + 6, lx + 10, top + 2 + (1 - w) * 2, 'w') }
      } else { const k = Math.min(1, (t - 5.6) / 0.5); if (k < 1) blit(SKEL, lx, top + k * 8); else { for (let i = 0; i < 12; i++) put(lx - 2 + ((i * 5) % 12), 20 - (i % 2), 'w'); rect(lx + 3, 18, 3, 2, 'w'); put(lx + 4, 18, 'd') } }
      const N = t < 5.6 ? 16 : 0
      for (let i = 0; i < N; i++) {
        let x, y
        if (t < 2.0) { const a = t * (1.5 + (i % 3) * 0.4) + i * 0.7, r = 26 - t * 8; x = lx + 4 + Math.cos(a) * r; y = 3 + Math.sin(a) * r * 0.25 + t * 2 }
        else if (t < 4.8) { x = lx - 2 + hash(i) * 12 + Math.sin(t * 20 + i); y = top + hash(i + 5) * 13 + (Math.sin(t * 25 + i * 3) > 0 ? 1 : 0) }
        else { const u = t - 4.8; x = lx + 4 + (hash(i) - 0.5) * 2 * u * 30; y = 12 - u * (10 + hash(i + 2) * 14) }
        blit(SPR.gull[Math.floor(t * 8 + i) % 2], x - 3, y - 1)
      }
      if (t > 2.4 && t < 4.8) for (let i = 0; i < 12; i++) { const s = (t * 2 + i / 12) % 1; put(lx + 4 + (hash(i) - 0.5) * 30 * s, 10 - 8 * s + 14 * s * s, 'r') }
      if (t >= 5.6) { // the eyeball, passed beak to beak
        const g1 = [24, 15], g2 = [46, 15], eye = (x, y, look) => { rect(x, y, 2, 2, 'w'); put(x + (look ? 1 : 0), y + 1, 'b') }
        blit(SPR.gull[0], g1[0] - 3, g1[1] - 1); blit(SPR.gull[Math.floor(t * 8) % 2], g2[0] - 3 + (t > 7.4 ? (t - 7.4) * 30 : 0), g2[1] - 1 - (t > 7.4 ? (t - 7.4) * 14 : 0))
        if (t < 6.2) eye(lx + 3 - (t - 5.6) * 12, 19, false) // dragged off the heap
        else if (t < 6.6) { if (Math.floor(t * 10) % 2) put(g1[0], g1[1] + 1, 'w') } // swallowed, a bulge
        else if (t < 7.2) { const k = (t - 6.6) / 0.6; eye(g1[0] + k * (g2[0] - g1[0]), g1[1] - 4 * Math.sin(k * Math.PI), false) } // coughed up, into the other beak
        else { const u = Math.max(0, t - 7.4); eye(g2[0] + 1 + u * 30, g2[1] + 1 - u * 14, Math.floor(t * 3) % 2) } // and away, looking around
      }
      splat(t, 2.4, 36, 12, 0.8)
      text(t < 2.0 ? 'NO FRIES' : t < 5.6 ? 'TOO LATE' : 'MORE?', 'c', 0, t >= 2.0 && t < 5.6 ? 'r' : 'w')
    } },
    // EARTHQUAKE (30 Oct, later, Andrew: "the eathquake has to be a building toppling on someone not a house falling from the sky"): no Giant. The board shakes, the
    // brick building beside him cracks at the base and goes over like a tree, flat on him; his legs stick out the far side twitching, and then the gore
    quake: { dur: 8.4, still: 3.4, draw(t) {
      const sh = t > 0.9 && t < 3.2 ? (Math.floor(t * 24) % 2 ? 1 : -1) : 0, lx = 30, fall = 1.8, land = 2.7, down = t >= land
      for (let x = 0; x < GW; x++) put(x + sh, GH - 1, 'd')
      if (t > 1.0 && t < 3.2) for (let x = 20; x < GW; x += 7) { put(x + sh, 20, 'n'); put(x + 1 + sh, 19, 'n') } // the cracks
      if (!down) blit(LAD, lx - 2 + (t > 1.4 ? sh : 0), 7)
      if (t > 1.4 && !down && Math.floor(t * 8) % 2) { put(lx - 3, 12, 'b'); put(lx + 9, 12, 'b') } // his arms up
      // the building: 10 wide, 24 tall (its top off the board), brick with rows of windows, a fire escape; it pivots on its bottom right corner and falls to the right, onto him
      const W = 10, H = 24, px = 15, py = 21, a = t < fall ? Math.sin(t * 30) * 0.02 * (t > 0.9 ? 1 : 0) : Math.min(Math.PI / 2, ((t - fall) / (land - fall)) ** 2 * (Math.PI / 2))
      const ca = Math.cos(a), sa = Math.sin(a)
      for (let j = 0; j < H; j += 0.5) for (let i = 0; i < W; i += 0.5) {
        const lx2 = i - W, ly2 = -j // from the pivot: left of it, up from it
        const x = px + lx2 * ca - ly2 * sa, y = py + lx2 * sa + ly2 * ca
        const ii = Math.floor(i), jj = Math.floor(j)
        const c = jj === H - 1 ? 'd' : (ii % 3 === 1 && jj % 3 === 1 && jj > 1) ? (hash(ii * 7 + jj) > 0.5 ? 'y' : 'd') : ii === W - 1 && jj % 2 ? 'g' : (ii + jj) % 4 === 0 ? 'r' : 'n'
        put(x, y, c)
      }
      if (down) {
        const u = t - land, tw = Math.floor(t * 9) % 2
        rect(40, 20, 6, 1, 'g'); rect(46, 19 + tw, 2, 2 - tw, 'd'); rect(46, 20, 2, 1, 'd') // his legs out the far side, a shoe twitching
        if (u < 0.5) for (let i = 0; i < 16; i++) put(15 + i * 2 + (i % 2), 20 - u * 12 * ((i % 3) + 1), 'g') // the dust
      }
      splat(t, land, 41, 18, 1.3) // the gore
      if (t < 0.9) text('NICE NITE', 'c', 0, 'w')
      else if (t < land) text('QUAKE!', 34, 0, 'w')
      else if (t < 4.6) text('CRUNCH', 'c', 0, 'r')
      else mini('NOT UP TO CODE', 'c', 1, 'y')
    } },
    // BATTING PRACTICE (GPT review, his "fix"): thirty-one holes; the last pitch knocks his head back into the hopper, the machine takes it for a ball, feeds it and
    // fires it back through what is left of him
    bp: { dur: 8.4, still: 3.4, draw(t) {
      ground()
      const sp = Math.floor(t * 20) % 2
      line(11, 16, 7, 20, 'g'); line(11, 16, 15, 20, 'g')
      line(6, 5, 16, 5, 'g'); line(6, 16, 16, 16, 'g'); line(6, 5, 6, 16, 'g'); line(16, 5, 16, 16, 'g')
      for (const wy of [8, 13]) { disc(11, wy, 2, 'd'); put(11 + (sp ? 1 : -1), wy, 'w'); put(11, wy + (sp ? -1 : 1), 'w') }
      rect(17, 10, 4, 2, 'g'); rect(1, 0, 6, 3, 'n'); put(2, 0, 'w'); put(4, 0, 'w'); line(5, 3, 9, 5, 'g')
      const lx = 48, t0 = 0.6, gap = 0.09, NH = 31, hits = Math.max(0, Math.min(NH, Math.floor((t - t0 - 0.2) / gap) + 1)), last = 3.9, back = 5.2
      for (let n = 0; n < NH; n++) { const u = (t - t0 - n * gap) / 0.2; if (u >= 0 && u < 1) put(21 + u * (lx - 23 + (n % 9)), 10.5 + (((n * 5) % 10) - 2) * u, 'w') }
      const head = (x, y) => { rect(x, y, 4, 1, 'b'); rect(x, y + 1, 4, 3, 'w'); put(x + 1, y + 2, 'd'); put(x + 3, y + 2, 'd') }
      const body = t < last ? LAD : headless(LAD)
      if (t < back + 0.2) {
        const me = body.slice(); blit(me, lx - 2, 7)
        for (let n = 0; n < hits; n++) { const hx = lx - 1 + Math.floor(hash(n + 40) * 9), hy = 7 + 5 + Math.floor(hash(n + 80) * 9); off(hx, hy); if (n % 3 === 0) put(hx, hy + 1, 'r') }
      } else { for (let i = 0; i < 18; i++) if (hash(i + 7) > 0.35) put(lx - 3 + i, 20, i < 3 ? 'b' : i > 12 ? 'd' : 'w'); for (let i = 0; i < 8; i++) put(lx - 4 + i * 3, GH - 1, 'r') }
      if (t > last && t < 4.6) { const k = (t - last) / 0.7; head(lx + 1 - k * (lx - 2), 9 - Math.sin(k * Math.PI) * 9 - k * 9) } // knocked back into the hopper
      else if (t >= 4.6 && t < back) { const k = (t - 4.6) / 0.6; head(3 + k * 6, k * 9) } // fed down to the wheels
      else if (t >= back && t < back + 0.5) { const k = (t - back) / 0.5; head(17 + k * 60, 9) } // and fired back, through him
      for (let n = 0; n < hits; n++) put(lx + 10 + (n % 12), 20 - Math.floor(n / 12), 'w')
      splat(t, back + 0.15, lx + 3, 11, 1.1)
      text(t < 0.6 ? 'B.P.' : t < 2.0 ? '105 MPH' : t < back ? `HITS: ${hits}` : 'RELOAD', 'c', 0, t < back ? 'w' : 'y')
    } },
    // DRIVERLESS (GPT review, his "change": "that's fucking hilarious"): no one at the wheel; it hits him, backs over him, again and again; then a little arm comes out
    // of the window with a card reader, and his severed hand taps it
    driverless: { dur: 8.6, still: 2.6, draw(t) {
      ground()
      const K = [[0, -30], [0.9, 24], [1.4, 24], [2.0, 6], [2.5, 34], [3.0, 8], [3.5, 36]]
      let x = 36; for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t < K[i + 1][0]) { const k = (t - K[i][0]) / (K[i + 1][0] - K[i][0]); x = K[i][1] + (K[i + 1][1] - K[i][1]) * k; break }
      x = Math.round(x)
      const lx = 40, hit = t > 0.75, passes = [0.75, 2.0, 2.5, 3.0, 3.5].filter((p) => t >= p).length
      if (!hit) blit(LAD, lx - 2, 7)
      else { rect(lx - 4, 20, 16, 1, 'b'); put(lx - 4, 20, 'w'); rect(lx + 8, 20, 4, 1, 'd'); for (let i = 0; i < passes * 5; i++) put(lx - 8 + hash(i + 11) * 26, i % 2 ? 20 : GH - 1, 'r') }
      rect(x, 14, 24, 5, 'w'); rect(x + 4, 10, 15, 4, 'w'); rect(x + 5, 11, 13, 2, 'd'); rect(x + 3, 19, 4, 2, 'd'); rect(x + 17, 19, 4, 2, 'd'); put(x + 23, 15, 'y'); put(x, 15, 'r')
      rect(x + 10, 8, 3, 2, 'g'); put(x + 10 + (Math.floor(t * 12) % 3), 8, 'y')
      if (t > 4.8) { // the arm, the reader, his hand
        const k = Math.min(1, (t - 4.8) / 0.6), rx = x + 5 - k * 14
        line(x + 6, 12, rx + 2, 15, 'g'); rect(rx, 14, 3, 4, 'g'); put(rx + 1, 15, t > 6.4 && Math.floor(t * 6) % 2 ? 'y' : 'd')
        const tap = t > 5.8 && t < 6.6, hy = tap ? 17 - Math.round(Math.sin(((t - 5.8) / 0.8) * Math.PI) * 2) : 20
        rect(rx - 4, hy, 3, 1, 'w'); put(rx - 2, hy - 1, 'w'); put(rx - 5, hy, 'r') // the hand
      }
      splat(t, 0.75, 44, 17)
      text(t < 0.75 ? 'WAYMO' : t < 4.4 ? 'RETRY' : t < 5.8 ? 'ARRIVED' : 'TIP 25%', 'c', 0, t < 4.4 ? 'w' : 'y')
    } },
    // CRAB SNIP (30 Oct, later: "let's just end it at half off"): the Crazy Crab cuts him in half at the belt; the top half drags itself off, the legs run in circles
    crabsnip: { dur: 7.0, still: 2.3, draw(t) {
      ground()
      const lx = 36, snip = 1.8, cx = t < 3.8 ? -16 + Math.min(1, t / 1.6) * 38 : 22 - (t - 3.8) * 24
      blit(SPR.crab[Math.floor(t * 8) % 2], cx, 12)
      if (t < snip) blit(LAD, lx - 2, 7)
      else {
        const u = t - snip, run = Math.floor(t * 10) % 2, lxx = lx + Math.sin(u * 3) * 14
        big([run ? '.dd.' : 'd..d', run ? 'd..d' : '.dd.'], lxx, 17); for (let i = 0; i < 4; i++) { const s2 = (u * 3 + i / 4) % 1; put(lxx + 3 + (i - 1.5) * s2 * 2, 16 - s2 * 6 + s2 * s2 * 7, 'r') }
        const ty = Math.min(10, 7 + u * u * 12), tx = lx - 2 - Math.min(1, u) * 6 - Math.max(0, u - 1) * 3; blit(LAD.slice(0, 11), tx, ty); rect(tx + 1, ty + 11, 9, 1, 'r')
      }
      splat(t, snip, lx + 4, 15)
      text(t < snip ? 'CRAZY CRAB' : 'HALF OFF', 'c', 0, t < snip ? 'r' : 'w')
    } },
    // DODGER DOG (rethought, 30 Oct, later: "I'm unclear about what the ending is"): he is the hot dog in the bun; mustard, ketchup, three bites, head first; then the
    // Giant picks his teeth with one of the Dodger's bones
    hotdog: { dur: 8.4, still: 3.0, draw(t) {
      ground()
      const bites = [2.4, 3.2, 4.0].filter((b) => t >= b).length, gone = t >= 4.8, bx = 14 - bites * 12
      if (!gone) {
        rect(bx + 2, 15, 34, 3, 'n'); rect(bx + 3, 10, 32, 2, 'n')
        rect(bx - 2, 12, 2, 3, 'b'); rect(bx, 12, 4, 3, 'w'); put(bx + 1, 13, 'd'); rect(bx + 4, 12, 22, 3, 'b'); mini('LA', bx + 12, 12, 'w', true); rect(bx + 26, 12, 10, 3, 'g')
        if (t > 0.6) { const n = Math.min(30, (t - 0.6) * 40); for (let i = 0; i < n; i++) put(bx + 4 + i, 11 + (Math.floor(i / 2) % 2), 'y') }
        if (t > 1.1) { const n = Math.min(30, (t - 1.1) * 40); for (let i = 0; i < n; i++) put(bx + 5 + i, 12 - (Math.floor(i / 2) % 2), 'r') }
        if (bites < 3) for (let x = 0; x < 10; x++) for (let y = 9; y < 19; y++) off(x, y)
        if (t > 2.0) for (let i = 0; i < bites * 6; i++) put(10 + hash(i) * 6, 16 + hash(i + 4) * 4, 'r')
      }
      blit(SFG, 0, 7)
      if ([2.4, 3.2, 4.0].some((b) => t >= b && t < b + 0.3)) rect(4, 11, 3, 1, 'r')
      if (gone) { const pick = Math.round(Math.sin(t * 10)); line(10, 13, 14, 10 + pick, 'o'); line(14, 10 + pick, 6, 11, 'w'); put(5, 11, 'w') } // a bone for a toothpick
      splat(t, 2.4, 10, 13, 0.7)
      text(t < 2.4 ? 'DODGER DOG' : t < 4.8 ? 'CHOMP' : 'WORTH IT', 'c', 0, t < 2.4 ? 'w' : 'o')
    } },
    // THE ROLL-UP (9 Nov, Andrew: "a dodger rolled into a joint and smoked"): he lies down on a giant rolling paper, the Giant rolls him up, licks it, lights the end,
    // takes three long puffs as it burns down toward the cap, and blows the smoke out
    rollup: { dur: 9.0, still: 3.0, draw(t) {
      ground()
      blit(SFG, 2, 7)
      if (t < 1.8) { rect(22, 18, 40, 2, 'w'); blit(LADR, 34, 4 + Math.round(Math.min(1, t / 0.8) * 3)) } // the paper, and the Dodger lying down on it
      else if (t < 3.6) { // rolled: a fat white tube with his cap out of one end and his cleats out of the other
        const k = Math.min(1, (t - 1.8) / 0.8), y = Math.round(16 - k * 2), th = Math.round(4 - k)
        rect(24, y, 34, th, 'w'); rect(58, y, 3, 2, 'b'); rect(21, y + th - 2, 3, 2, 'd')
        if (t > 2.8) for (let x = 24; x < 24 + (t - 2.8) * 42 && x < 58; x++) put(x, y - 1, 'b') // the lick along the seam
      } else { // to his mouth, lit, burning down toward the cap
        const burn = t < 4.6 ? 0 : Math.min(22, (t - 4.6) * 6), x1 = 44 - burn
        rect(12, 10, x1 - 12, 2, 'w'); rect(10, 10, 2, 2, 'b') // the cap end in the Giant's mouth
        const glow = t > 3.9 && Math.sin(t * 9) > -0.3
        rect(x1, 10, 2, 2, t < 3.9 ? 'g' : glow ? 'r' : 'o')
        if (t > 3.6 && t < 4.4) { put(x1 + 3, 9 + Math.round(Math.sin(t * 30)), 'y'); put(x1 + 3, 11, 'o'); rect(x1 + 4, 10, 3, 2, 'g') } // the lighter
        for (let i = 0; i < 10; i++) { const a = (t * 0.7 + i * 0.37) % 2.2, sx = x1 + 1 + Math.sin(i * 1.7 + t) * 2 + a * 2, sy = 9 - a * 3.4; if (t > 4.2 && sy > 1) put(sx, sy, i % 3 ? 'g' : 'd') } // the smoke off the end
        if (t > 7.0) { const u = t - 7.0; for (let i = 0; i < 26; i++) put(14 + u * 18 + hash(i) * 12, 9 + (hash(i + 7) - 0.5) * (4 + u * 6), hash(i + 3) > 0.5 ? 'g' : 'w') } // he blows it out
      }
      text(t < 1.8 ? 'LIE DOWN' : t < 2.8 ? 'ROLL HIM UP' : t < 3.6 ? 'LICK IT' : t < 4.6 ? 'LIGHT IT' : t < 7.0 ? 'PUFF PUFF' : 'SKUNK WEED' /* (9 Nov, Andrew: "Dodger kush is a lame name") */, 'c', 0, t < 7.0 ? 'w' : 'o')
    } },
    // WATERBOARD (GPT review, his "change"): head down on the plank under the rally towel; SAY IT, NEVER, the cooler, GO GIANTS; and behind him a line of Dodgers waits
    // its turn while the Giant fetches a fresh cooler
    waterboard: { dur: 9.6, still: 4.0, draw(t) {
      ground()
      const P = (i) => [17 + i, Math.round(17 - i * 0.22)], pour = t > 2.8 && t < 5.6, kick = pour && Math.floor(t * 10) % 2
      for (let i = -2; i <= 32; i++) { const [x, y] = P(i); put(x, y + 3, 'n') }
      line(P(3)[0], P(3)[1] + 4, P(3)[0], 20, 'n'); line(P(28)[0], P(28)[1] + 4, P(28)[0], 20, 'n')
      for (let i = 0; i < 30; i++) { const [x, y] = P(i), c = i < 2 ? 'b' : i < 6 ? 'o' : i < 17 ? 'b' : i < 26 ? 'g' : 'd', th = i < 17 ? 2 : 1; for (let d = -th; d <= th; d++) put(x, y + d - (i >= 26 && kick ? 2 : 0), c) }
      mini('LA', 25, P(9)[1] - 2, 'w'); for (const i of [7, 21]) line(P(i)[0], P(i)[1] - 2, P(i)[0], P(i)[1] + 2, 'd')
      const fresh = t > 7.4, gx = fresh ? 1 - Math.min(1, (t - 7.4) / 0.4) * 0 : 1
      blit(SFG, gx, 7)
      const tip = pour ? 1 : 0
      rect(11, 5 + tip, 7, 5, 'o'); rect(11, 4 + tip, 7, 1, fresh && Math.floor(t * 4) % 2 ? 'y' : 'w'); line(10, 12, 12, 9, 'o')
      if (pour) { line(17, 10, 18, 15, 'b'); line(18, 10, 19, 15, 'b'); for (let i = 0; i < 8; i++) { const s = (t * 2 + i / 8) % 1; put(15 + (i - 4) * s * 2, 15 - s * 6 + s * s * 10, 'b') } for (let i = 0; i < 3; i++) put(21 + i * 2, 12 - ((t * 6 + i) % 5), 'w') }
      if (t > 1.6 && t < 2.8) bubble(['NEVER'], 34, 0, 24, 12)
      if (t > 6.2 && t < 7.4) bubble(['GO GIANTS'], 30, 0, 24, 12)
      if (t > 7.4) { const k = Math.min(1, (t - 7.4) / 0.8); for (let q = 0; q < 2; q++) blit(LAD, 51 + q * 11 + Math.round((1 - k) * 20) + (Math.floor(t * 5 + q) % 2), 7) } // the line, waiting, shaking
      text(t < 1.6 ? 'SAY IT' : pour ? (Math.floor(t * 4) % 2 ? 'GLUG' : '') : t > 5.6 && t < 6.2 ? 'SAY IT' : t >= 7.4 ? 'NEXT' : '', 'c', 0, 'w')
    } },
    // IRON MAIDEN (GPT review, his "change"): in, the door, the ooze; out full of holes; a beer, and it pours out of every hole; he tries to plug them with his own
    // eyeballs, and one gets pushed back out and rolls away
    ironmaiden: { dur: 9.6, still: 2.6, draw(t) {
      ground()
      const mx = 44, shut = t < 1.8 ? 0 : Math.min(1, (t - 1.8) / 0.3) - (t > 4.0 ? Math.min(1, (t - 4.0) / 0.4) : 0), sh = t > 2.1 && t < 2.4 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0
      const holes = [...Array(14)].map((_, n) => [1 + Math.floor(hash(n + 40) * 9), 4 + Math.floor(hash(n + 80) * 10)])
      rect(mx + sh, 4, 14, 17, 'g'); rect(mx + 2 + sh, 8, 10, 12, 'd'); for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) put(mx + 2 + i * 2 + (j % 2) + sh, 9 + j * 3, 'w')
      put(mx + 4 + sh, 5, 'd'); put(mx + 9 + sh, 5, 'd'); line(mx + 5 + sh, 6, mx + 8 + sh, 6, 'd')
      const gx = t < 1.0 ? 4 : t < 1.8 ? 4 + (t - 1.0) * 10 : t < 4.8 ? 12 : 4
      const dx = t < 1.0 ? 22 : t < 1.8 ? 22 + ((t - 1.0) / 0.8) * 23 : t < 4.8 ? 45 : t < 5.6 ? 45 - ((t - 4.8) / 0.8) * 23 : 22
      const plug = t > 7.0, noEyes = plug
      if (shut < 1 || t < 1.8) { const me = LAD.slice(); if (t > 4.0) for (const [hx, hy] of holes) me[hy] = me[hy].slice(0, hx) + '.' + me[hy].slice(hx + 1); if (noEyes) me[3] = '...wrwrw...'; blit(me, dx + sh, 7) }
      const dw = Math.round(9 * (1 - shut))
      if (shut >= 1) { rect(mx + 2 + sh, 8, 10, 12, 'g'); line(mx + 7 + sh, 8, mx + 7 + sh, 19, 'd'); for (const y of [9, 14, 19]) { put(mx + 3 + sh, y, 'd'); put(mx + 10 + sh, y, 'd') } }
      else { rect(mx + 14 + sh, 4, dw, 17, 'g'); for (let j = 0; j < 5; j++) if (dw > 2) put(mx + 14 + sh, 6 + j * 3, 'w') }
      blit(SFG, gx, 7)
      if (t > 2.2 && t < 4.4) { const p = Math.min(12, (t - 2.2) * 6); rect(mx + 7 - p, 21, p * 2, 1, 'r'); for (let i = 0; i < 3; i++) put(mx + 13 + sh, 8 + ((t * 8 + i * 4) % 12), 'r') }
      if (t > 5.6) {
        const cupx = t < 6.0 ? 16 : 25, cupy = t < 6.0 ? 15 : 10
        rect(cupx, cupy, 2, 3, 'y'); put(cupx, cupy - 1, 'w'); put(cupx + 1, cupy - 1, 'w')
        if (t > 6.2) for (const [n, [hx, hy]] of holes.entries()) { if (plug && n < 2) continue; for (let k = 0; k < 4; k++) { const s = ((t - 6.2) * 2 + k / 4) % 1, dir = hx < 5 ? -1 : 1; put(dx + hx + dir * s * 7, 7 + hy + s * s * 7, 'y') } }
        if (plug) { const [ax, ay] = holes[0], [bx2, by2] = holes[1]; rect(dx + ax, 7 + ay, 1, 1, 'w'); if (t < 7.8) rect(dx + bx2, 7 + by2, 1, 1, 'w'); else { const u = t - 7.8; rect(dx + bx2 + u * 4 - u * u * 0, Math.min(19, 7 + by2 + u * 14), 2, 2, 'w'); put(dx + bx2 + u * 4 + (Math.floor(t * 6) % 2), Math.min(20, 8 + by2 + u * 14), 'b'); rect(dx + bx2 - 1 - u * 18, 19, 2, 2, 'w') } } // two eyes in two holes; one shot out, rolling away
      }
      text(t < 1.8 ? 'GET IN' : t < 2.8 ? (t > 2.1 ? 'CLANG' : '') : t < 5.6 ? '' : t < 6.2 ? 'DRAFT?' : t < 7.0 ? 'CHEERS' : t < 7.8 ? 'LEAKY' : 'NO REFILL', 'c', 0, t > 2.1 && t < 2.8 ? 'y' : 'w')
    } },
    // SHE LEFT HIM (30 Oct, Andrew: "a dodger fans wife leaving him because he's a loser"): on the couch in his cap; she has a suitcase and one line for him; a Giant is
    // waiting at the door and she goes off on his arm; a rain cloud sets up over the couch
    wifeleaves: { dur: 11, still: 2.0, draw(t) {
      ground()
      rect(2, 9, 4, 9, 'n'); rect(2, 17, 22, 2, 'n'); rect(22, 14, 3, 4, 'n'); for (const x of [3, 22]) rect(x, 19, 1, 2, 'd') // the couch
      blit(LADR.slice(0, 11), 6, 4); rect(12, 15, 8, 2, 'g'); rect(18, 17, 2, 3, 'g'); rect(18, 20, 4, 1, 'd') // him, sitting
      const open = t > 4.0 && t < 6.0
      line(56, 5, 56, 20, 'n'); line(70, 5, 70, 20, 'n'); line(56, 5, 70, 5, 'n') // the door frame
      if (t > 3.8 && t < 4.6) blit(SFGL, 58, 7) // a Giant, waiting
      const wx = t < 3.2 ? 34 : t < 4.4 ? 34 + ((t - 3.2) / 1.2) * 13 : 47 + (t - 4.4) * 22
      if (t < 6.0) { blit(WIFE, wx, 7); rect(wx + 9, 15, 5, 4, 'g'); put(wx + 11, 14, 'd') } // her and the suitcase
      if (t > 4.6 && t < 6.0) blit(SFG, 58 + (t - 4.6) * 22, 7) // off on his arm
      if (!open || t < 3.8) { rect(57, 6, 13, 15, 'n'); put(67, 13, 'y') } // the door, shut
      if (t > 0.6 && t < 1.7) bubble(["YOU'RE A"], 24, -2, 38, 7); else if (t >= 1.7 && t < 2.8) bubble(['LOSER!'], 28, -2, 38, 7)
      if (t > 2.8 && t < 3.6) text('?', 18, 0, 'w')
      if (t > 7.0) { rect(4, 0, 15, 3, 'g'); for (let i = 0; i < 6; i++) put(5 + i * 2 + (i % 2), 3 + ((t * 9 + i * 2) % 3), 'b') } // a cloud of his own
      if (t > 6.0 && t < 7.4) text('SHE LEFT', 'c', 0, 'w')
      if (t >= 7.4) { mini('FOR A', 'c', 1, 'w'); mini('GIANTS FAN', 'c', 7, 'o') }
    } },
    // THE BRIDGE (30 Oct, Andrew: "a dodger fan jumping off the bridge because his wife left him"): on the Golden Gate in the fog with a broken heart in a thought
    // bubble; over the rail, the jump, the long way down, the splash, and his cap floating in the bay until a sea lion tries it on
    bridgejump: { dur: 11.2, still: 1.6, draw(t) {
      if (t < 3.6) {
        rect(4, 0, 2, 22, 'o'); rect(10, 0, 2, 22, 'o'); for (const y of [3, 9]) rect(4, y, 8, 1, 'o') // a tower
        for (let x = 12; x < GW; x++) { const y = Math.round(1 + (x - 12) * 0.16); put(x, y, 'o'); if (x % 8 === 0) line(x, y + 1, x, 14, 'o') } // the main cable and the suspenders
        for (let i = 0; i < 10; i++) put((i * 17 + t * 6) % GW, 4 + ((i * 5) % 9), 'g') // fog
        const climb = Math.max(0, Math.min(1, (t - 1.8) / 0.8)), jump = t > 3.0 ? t - 3.0 : 0
        const x = 40 + climb * 4, y = 6 - climb * 5 + (t > 2.6 && t < 3.0 ? 1 : 0) - jump * 10 + jump * jump * 70
        if (y < GH) blit(LADR, x, y)
        line(0, 15, GW - 1, 15, 'o'); for (let x2 = 0; x2 < GW; x2 += 6) line(x2, 16, x2, 19, 'o'); rect(0, 20, GW, 2, 'o') // the rail and the deck, in front of him
        if (t < 1.8) { // a broken heart in a thought bubble
          line(57, 0, 70, 0, 'g'); line(57, 10, 70, 10, 'g'); line(56, 1, 56, 9, 'g'); line(71, 1, 71, 9, 'g')
          blit(['.rr..rr.', 'rrr..rrr', 'rr..rrrr', '.rrr.rr.', '..r..r..', '...rr...'], 60, 2)
          put(52, 8, 'w'); rect(54, 6, 2, 2, 'w')
        }
        if (jump) text('AAAAH', 'c', 0, 'w')
        return
      }
      const u = t - 3.6
      rect(0, 0, GW, 1, 'o') // the deck, far above
      for (let x = 0; x < GW; x++) { put(x, 15 + (Math.sin(x * 0.5 + t * 3) > 0.6 ? 0 : 1), 'b'); line(x, 16, x, GH - 1, (x + Math.floor(t * 3)) % 11 ? 'b' : 'w') }
      const fy = -14 + u * 30
      if (fy < 15) upside(LAD).forEach((r, j) => { if (fy + j < 15) blit([r], 30, fy + j) }) // head first
      if (u > 0.95 && u < 1.7) for (let i = 0; i < 12; i++) { const v = u - 0.95; put(35 + (i - 6) * v * 6, 15 - v * 22 * (0.6 + (i % 3) * 0.2) + v * v * 40, 'w') } // the splash
      const sea = u > 3.0 ? Math.min(1, (u - 3.0) / 0.5) : 0
      if (u > 2.0) { const capy = sea > 0.9 ? 22 - sea * 10 - 1 : 15 + Math.round(Math.sin(t * 3)); rect(sea > 0.9 ? 31 : 33, capy, 4, 1, 'b'); put(sea > 0.9 ? 35 : 37, capy, 'b') } // his cap
      if (sea) blit(SPR.seal[0], 26, 22 - sea * 10)
      if (t > 3.6) splat(t, 4.55, 35, 15) // the gore
      if (u < 2.2) text(u < 1.0 ? 'AAAAH' : 'SPLASH', 'c', 0, 'w'); else { mini('STILL PAID', 'c', 0, 'o'); mini('THE TOLL', 'c', 6, 'o') }
    } },
    // ---- 30 Oct, later: his six from the list of fifteen (Andrew: "I don't want cute I want 'jesus christ'") ----
    // HUMAN BAT: the Giant holds him upside down by the ankles and takes a level cut with him; his head is the barrel. The ball and the head both go out, into the Cove,
    // where two kayakers beat each other with their paddles for the head
    humanbat: { dur: 10.6, still: 1.5, draw(t) {
      if (t < 3.6) {
        ground()
        const hx = 30, hy = 11, hit = 1.5, sw = Math.max(0, Math.min(1, (t - 1.2) / 0.3)), ph = t < 1.2 ? Math.PI * 0.85 + 0.12 * Math.sin(t * 6) : Math.PI * 0.85 * (1 - sw) - (t > hit ? Math.min(0.9, (t - hit) * 2) : 0)
        const len = Math.cos(ph) >= 0 ? 24 : 12, ex = hx + Math.cos(ph) * len, ey = hy - Math.sin(ph) * 3 - (Math.cos(ph) < 0 ? 6 * -Math.cos(ph) : 0)
        const body = (head) => { for (let i = 0; i <= 24; i++) { const f = i / 24, x = hx + (ex - hx) * f, y = hy + (ey - hy) * f, c = f < 0.12 ? 'd' : f < 0.45 ? 'g' : f < 0.85 ? 'b' : head ? (f < 0.95 ? 'w' : 'b') : null; if (c) { put(x, y, c); put(x, y + 1, c); if (f > 0.45 && f < 0.85) put(x, y - 1, c) } } } // him as the bat: shoes in the hands, the LA end, the head
        if (t < 1.2) { blit(upside(LAD), 8, 4 + Math.round(Math.sin(t * 6))); blit(SFG, 19, 7); line(21, 12, 14, 4, 'o'); line(28, 12, 16, 4, 'o') } // held up by the ankles
        else if (Math.cos(ph) < 0) { body(t < hit); blit(SFG, 19, 7) } else { blit(SFG, 19, 7); body(t < hit) }
        if (t < hit) { const k = Math.min(1, t / hit); rect(70 - k * (70 - hx - 24), 10, 2, 2, 'w') } // the pitch
        else { const u = t - hit; rect(hx + 26 + u * 40, 10 - u * 22 + u * u * 6, 2, 2, 'w'); rect(hx + 24 + u * 30, 9 - u * 16 + u * u * 4, 3, 2, 'b'); rect(hx + 24 + u * 30, 11 - u * 16 + u * u * 4, 3, 2, 'w') } // the ball and his head, going
        splat(t, hit, hx + 23, 11, 0.9)
        text(t < 1.2 ? 'BATTER UP' : t < hit ? '' : 'GONE', 'c', 0, t < hit ? 'w' : 'o')
        return
      }
      const u = t - 3.6
      water(t, 16)
      const head = (x, y, look) => { rect(x, y, 5, 1, 'b'); rect(x, y + 1, 5, 3, 'w'); put(x + 1 + look, y + 2, 'd'); put(x + 3 + look, y + 2, 'd') }
      if (u < 0.6) { const k = u / 0.6; head(30 + k * 10, k * 13, 0) } // in it comes
      if (u > 0.6 && u < 1.0) for (let i = 0; i < 8; i++) { const v = u - 0.6; put(42 + (i - 4) * v * 10, 15 - v * 14 + v * v * 30, 'w') }
      const k = Math.min(1, Math.max(0, (u - 1.0) / 1.6)), bx = Math.round(-14 + k * 38), netted = u > 2.8
      rect(bx, 17, 14, 1, 'n'); rect(bx + 1, 18, 12, 1, 'n'); blit(['.dd.', '.ww.', 'oooo', 'oooo'], bx + 5, 13) // a kayak, a Giants fan in it
      if (u > 1.0 && !netted) head(40, 14 + Math.round(Math.sin(t * 3)), 0)
      if (netted) { const hx = bx + 14, hy = 8; line(bx + 8, 14, hx, hy + 4, 'g'); line(hx - 1, hy + 4, hx + 5, hy + 4, 'w'); line(hx - 1, hy, hx - 1, hy + 4, 'w'); line(hx + 5, hy, hx + 5, hy + 4, 'w'); head(hx, hy, Math.floor(t * 2) % 2) } // netted, held up
      else line(bx + 8, 14, bx + 13, 12, 'g')
      text(u < 1.0 ? 'SPLASH' : u < 2.8 ? 'MINE' : 'SOUVENIR', 'c', 0, u < 1.0 ? 'b' : 'w')
    } },
    // CRAB POT (redone, 30 Oct, later: "unreadable right now no face on the giants guy crabs are too big that needs a whole redo"): the Giant on the pier, all of him;
    // the pot goes down with the Dodger in it; it comes up full of crabs, and four small crabs walk off with his cap, a shoe, an eye and a bone
    crabpot: { dur: 9.0, still: 5.8, draw(t) {
      for (let x = 0; x < GW; x++) { put(x, 15 + (Math.sin(x * 0.5 + t * 3) > 0.6 ? 0 : 1), 'b'); for (let y = 17; y < GH; y++) put(x, y, (x + y * 3) % 11 ? 'd' : 'b') } // the bay
      rect(0, 14, 24, 1, 'n'); for (const x of [3, 12, 21]) line(x, 15, x, GH - 1, 'n') // the pier
      blit(SFG, 6, 0) // the Giant on it
      const px = 34, depth = t < 1.6 ? 8 + (t / 1.6) * 9 : t < 3.6 ? 17 : t < 4.8 ? 17 - ((t - 3.6) / 1.2) * 9 : 8, up = t >= 4.8
      line(16, 5, px + 4, Math.round(depth), 'g')
      for (let i = 0; i < 9; i++) { put(px + i, depth, 'g'); put(px + i, depth + 5, 'g') } for (let j = 0; j <= 5; j++) for (const i of [0, 4, 8]) put(px + i, depth + j, 'g') // the pot
      if (t < 1.8) { rect(px + 1, depth + 1, 7, 2, 'b'); rect(px + 3, depth + 3, 3, 2, 'w'); put(px + 4, depth + 4, 'd') }
      if (t > 1.8 && t < 3.8) for (let i = 0; i < 5; i++) put(px + 2 + ((i * 3) % 6), 16 - ((t * 6 + i * 2) % 2), 'w')
      if (t > 2.2 && t < 4.8) for (let i = 0; i < 24; i++) put(px - 4 + hash(i) * 18, 17 + hash(i + 9) * 4, 'r')
      if (!up && t > 4.0) for (let i = 0; i < 3; i++) put(px + 2 + i * 2, depth + 2, 'r')
      if (up) {
        const crab = (x, y, f) => blit(f ? ['r...r', '.rrr.', 'r.r.r'] : ['.r.r.', 'rrrrr', '.r.r.'], x, y)
        const k = Math.min(1, (t - 5.0) / 2.4), f = Math.floor(t * 8) % 2
        const C = [[px + 10 + k * 26, (x) => { rect(x, 10, 5, 1, 'b'); rect(x + 1, 9, 3, 1, 'b') }], [px + 4 + k * 14, (x) => rect(x + 1, 10, 3, 1, 'd')], [px - 2 + k * 6, (x) => { rect(x - 2, 9, 2, 2, 'w'); put(x - 1, 10, 'b') }], [px + 16 + k * 20, (x) => rect(x, 10, 5, 1, 'w')]]
        C.forEach(([x, extra]) => { crab(Math.round(x), 11, f); extra(Math.round(x)) }) // the cap, a shoe, an eye, a bone
      }
      if (up) splat(t, 4.8, px + 4, 10, 0.5)
      text(t < 1.6 ? 'CRAB POT' : t < 3.6 ? 'SOAK' : t < 4.8 ? 'HAUL' : 'MKT PRICE', 'c', 0, t < 4.8 ? 'w' : 'y')
    } },
    // BART DOORS (30 Oct, later: "make it in the middle of the train"): the train fills the board, its doors in the middle; he runs for them, they close on him, and
    // when it pulls out the half of him inside goes too; the other half is left on the platform, hopping in circles
    bartdoors: { dur: 9.0, still: 2.6, draw(t) {
      line(0, 20, GW - 1, 20, 'g'); line(0, 21, GW - 1, 21, 'd')
      const go = 3.0, tx = t < go ? 0 : (t - go) ** 2 * 18, shut = t >= 2.2, door = 36, close = Math.min(1, Math.max(0, (t - 1.8) / 0.4))
      for (let c = -1; c < 3; c++) { const x0 = Math.round(tx + c * 74 - 1); rect(x0, 5, 72, 14, 'g'); rect(x0, 14, 72, 1, 'b'); for (let i = 4; i < 70; i += 8) if (Math.abs(i - door) > 6) rect(x0 + i, 7, 5, 4, 'd'); rect(x0, 19, 72, 1, 'd'); rect(x0 + 72, 5, 2, 14, 'd') } // the train, its cars
      const gap = Math.round(5 * (1 - close)) // the doors: open, then closing on him
      rect(Math.round(tx) + door - 6, 6, 6 - gap, 13, 'w'); rect(Math.round(tx) + door + gap, 6, 6 - gap, 13, 'w')
      if (!shut) {
        const runX = 4 + ease(Math.min(1, t / 1.9)) * 27
        blit(run(LADR, Math.floor(t * 10) % 2), runX, 6)
        for (let y = 6; y < 19; y++) for (let x = door - gap; x < door + gap; x++) if (x < runX || x > runX + 10) put(x, y, 'd') // the dark inside the open door
      } else {
        blit(LADR.map((r) => r.slice(6)), Math.round(tx) + door, 6) // the half that made it, going with the train
        const u = t - 2.2, hop = Math.abs(Math.sin(u * 7)) * 3, cx2 = t < go + 0.6 ? door - 6 : door - 6 + Math.cos((u - 1.4) * 3) * 8 - 8
        if (t > go + 0.4 || true) blit(LADR.map((r) => r.slice(0, 6)), cx2, 6 - (t > go ? hop : 0))
        for (let i = 0; i < 4; i++) { const s2 = (u * 2 + i / 4) % 1; put(cx2 + 6 + s2 * 3, 8 + s2 * 8, 'r') }
        splat(t, 2.2, door, 12, 0.8)
      }
      text(t < 1.8 ? 'BART' : t < 2.2 ? 'CLOSING' : t < go + 1.0 ? 'DING DONG' : 'OAKLAND', 'c', 0, t < go + 1.0 ? 'w' : 'b')
    } },
    // GROUNDSKEEPER (mowed in, redone, 30 Oct, later: "I want something where they're raking him too"): he is lying on the outfield; the Giant mows over him, then rakes
    // what is left into stripes; from above the stripes are the outfield's checks, and the red squares spell LA
    mowedin: { dur: 10.0, still: 6.4, draw(t) {
      if (t < 6.0) {
        for (let x = 0; x < GW; x++) for (let y = 17; y < GH; y++) put(x, y, (Math.floor(x / 6) + y) % 2 ? 'e' : 'd')
        const lx = 30
        if (t < 3.0) {
          const mx = -22 + (t / 2.0) * 100, over = mx + 18 > lx
          if (!over) { rect(lx, 15, 12, 2, 'b'); rect(lx - 3, 15, 3, 2, 'w'); rect(lx + 12, 15, 4, 2, 'g'); rect(lx + 16, 15, 2, 2, 'd'); put(lx - 4, 15, 'b') }
          else for (let i = 0; i < 26; i++) put(lx - 4 + hash(i + 50) * 22, 15 + (i % 2), i % 4 ? 'r' : 'b')
          if (mx < GW + 2) { rect(mx, 11, 18, 5, 'y'); rect(mx + 2, 16, 4, 2, 'd'); rect(mx + 13, 16, 4, 2, 'd'); blit(SFG.slice(0, 8), mx + 4, 3) // the mower, the Giant on it
            if (over && Math.abs(mx + 9 - lx - 6) < 14) for (let i = 0; i < 16; i++) { const s2 = (t * 4 + i / 16) % 1; put(mx - 2 - s2 * 18, 12 - s2 * 10 + s2 * s2 * 14, i % 3 ? 'r' : 'e') } }
          splat(t, 0.9, lx + 6, 14, 0.9)
          text(t < 0.9 ? 'GROUNDSKEEPER' : 'MOW', 'c', 0, 'w')
        } else { // the rake: the Giant drags him into stripes
          const u = t - 3.0, rx = 6 + (u % 1.0) * 50, pass = Math.floor(u)
          for (let i = 0; i < 26; i++) { const x0 = lx - 4 + hash(i + 50) * 22, x = Math.min(x0 + pass * 4 + (rx > x0 ? 4 : 0), GW - 1); put(Math.round(x / 6) * 6 + (i % 3), 15 + (i % 2), i % 4 ? 'r' : 'b') } // raked into lines
          blit(SFG, rx - 12, 4); line(rx - 2, 12, rx + 3, 16, 'n'); line(rx + 1, 16, rx + 5, 16, 'n') // the Giant and his rake
          text('RAKE', 'c', 0, 'w')
        }
        return
      }
      const L = { L: ['#..', '#..', '#..', '#..', '###'], A: ['###', '#.#', '###', '#.#', '#.#'] }
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const sx = Math.floor(x / 3), sy = Math.floor((y - 1) / 3), lx2 = sx - 8, inL = sy >= 1 && sy < 6 && ((lx2 >= 0 && lx2 < 3 && L.L[sy - 1][lx2] === '#') || (lx2 >= 4 && lx2 < 7 && L.A[sy - 1][lx2 - 4] === '#'))
        put(x, y, inL ? 'r' : (sx + sy) % 2 ? 'e' : 'd')
      }
      text('MOWED IN', 'c', 0, 'w')
    } },
    // ---- 30 Oct, later: eight from GPT's twenty, his picks (2, 5, 8, 10, 11, 15, 18, 20) ----
    // RENT CTRL: a cozy one-bedroom; the Giant turns the knob on the wall and the walls come in, and in, until the Dodger is the apartment, eyes out of both windows; a
    // tiny Giant with a suitcase moves in through a little door in his skull
    rentctrl: { dur: 8.6, still: 4.6, draw(t) {
      ground()
      const sq = t < 1.6 ? 0 : t < 3.4 ? (t - 1.6) / 1.8 * 0.5 : t < 5.6 ? 0.5 + (t - 3.4) / 2.2 * 0.4 : 0.9
      const L = Math.round(27 + sq * 4.4), R = Math.round(39 - sq * 4.4), top = Math.round(6 + sq * 6), w = R - L - 1, h = 20 - top
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const si = Math.min(10, Math.floor((i / w) * 11)), sj = Math.min(13, Math.floor((j / h) * 14)), ch = LAD[sj][si]; if (ch !== '.') put(L + 1 + i, top + 1 + j, ch) } // him, squeezed to fit
      rect(L - 1, top, 2, 21 - top, 'n'); rect(R, top, 2, 21 - top, 'n'); rect(L - 1, top - 1, R - L + 3, 1, 'n') // the walls, the ceiling
      const wy = top + Math.round(h * 0.25); off(L - 1, wy); off(L, wy); off(R, wy); off(R + 1, wy) // a window each side
      rect(L - 4, 12, 2, 2, 'y'); put(L - 4 + (Math.floor(t * 6) % 2), 11, 'y') // the knob
      blit(SFG, 2, 7); line(12, 12, L - 3, 12, 'o')
      if (sq > 0.2) for (let i = 0; i < 6; i++) { const s = (t * 2.5 + i / 6) % 1; put(L - 2 - s * 10, wy + s * s * 8, i % 3 ? 'r' : 'w'); put(R + 2 + s * 10, wy + s * s * 8, i % 3 ? 'r' : 'w') } // out of the windows
      if (sq > 0.6) { const ey = Math.floor(t * 2) % 2; rect(L - 3, wy, 2, 2, 'w'); put(L - 3 + ey, wy + 1, 'b'); rect(R + 2, wy, 2, 2, 'w'); put(R + 2 + ey, wy + 1, 'b') } // his eyes, out of the windows
      if (t > 6.2) { const k = Math.min(1, (t - 6.2) / 1.0); rect(L + 2, top + 1, 3, 2, 'd'); const tx = 14 + k * (L + 3 - 14); rect(tx, top - 3 + 2 * k, 2, 3, 'o'); put(tx + 2, top - 1 + 2 * k, 'n') } // the door in his skull; a little Giant and his suitcase, moving in
      splat(t, 1.9, (L + R) / 2, 14, 0.7)
      text(t < 1.6 ? 'COZY 1BR' : t < 3.4 ? 'SQUEEZE' : t < 6.2 ? '$4900/MO' : 'LEASED', 'c', 0, t < 6.2 ? 'w' : 'o')
    } },
    // NO TP (merch drop, redone, 30 Oct, later: "the same effect but a giants player wiping their ass in a stall with no tp left"): the roll in the stall is empty; a hand
    // comes out under the door and pulls the loose thread on the Dodger's jersey; he unravels into the stall, blue, then red, down to the bones
    merch: { dur: 9.0, still: 3.4, draw(t) {
      ground()
      rect(4, 3, 2, 18, 'g'); rect(24, 3, 2, 18, 'g'); rect(6, 3, 18, 15, 'd'); rect(6, 3, 18, 1, 'g') // the stall, its door, the gap under it
      rect(9, 18, 3, 3, 'o'); rect(16, 18, 3, 3, 'o'); rect(8, 20, 4, 1, 'w'); rect(16, 20, 4, 1, 'w') // the Giant's legs under the door, his pants round his ankles
      rect(27, 9, 3, 3, 'w'); put(28, 10, 'n') // the roll holder outside, empty
      const lx = 44, un = Math.max(0, Math.min(1, (t - 2.0) / 3.0)), rows = Math.round(un * 14)
      if (t < 6.0) {
        blit(LAD.map((r, j) => (j >= 14 - rows ? '...........' : r)), lx - 2, 7)
        for (let j = 0; j < rows; j++) blit([SKEL[13 - j]], lx - 1, 20 - j)
        if (t > 1.0) { const ty = 20 - rows, c = rows > 9 ? 'r' : 'b'; line(lx - 3, ty, 24, 19, c); line(lx - 3, ty + 1, 24, 20, c) } // the strand, under the door
        if (t > 0.6 && t < 2.0) rect(24 + Math.min(1, (t - 0.6) / 0.6) * (lx - 28), 19, 3, 1, 'w') // the hand reaching for the thread
      } else { const k = Math.min(1, (t - 6.0) / 0.4); blit(SKEL, lx - 1, 7 + k * 6) }
      if (t > 6.6) for (let i = 0; i < 6; i++) put(6 + ((t * 9 + i * 3) % 18), 2 - (i % 2), 'b') // the flush
      splat(t, 4.6, lx + 3, 12, 0.6)
      text(t < 2.0 ? 'NO TP' : t < 5.0 ? 'TWO-PLY' : t < 6.6 ? 'SOFT' : 'FLUSH', 'c', 0, t < 6.6 ? 'w' : 'b')
    } },
    // LOMBARD (redone, 30 Oct, later: "we don't even need the giants fan and it should be taller"): the whole board is Lombard Street; he trips at the top and rolls
    // down all eight hairpins, a smear at every bend, and lands at the bottom in a heap with his cap on top
    lombard: { dur: 8.4, still: 4.0, draw(t) {
      const Z = [[6, 1], [64, 3], [8, 6], [64, 8], [8, 11], [64, 13], [8, 16], [64, 18], [8, 21]]
      for (let i = 0; i + 1 < Z.length; i++) { line(Z[i][0], Z[i][1], Z[i + 1][0], Z[i + 1][1], 'g') } // the street
      for (let i = 1; i < Z.length - 1; i++) { rect(Z[i][0] + (i % 2 ? 1 : -3), Z[i][1] - 2, 3, 2, 'e') } // the hedges at the bends
      const go = 1.0, seg = 0.6, u = Math.max(0, t - go), k = Math.min(Z.length - 1.001, u / seg), i = Math.floor(k), f = k - i
      const x = Z[i][0] + (Z[i + 1][0] - Z[i][0]) * f, y = Z[i][1] + (Z[i + 1][1] - Z[i][1]) * f - 3, done = u / seg >= Z.length - 1, passed = Math.min(Z.length - 1, Math.floor(u / seg))
      for (let b = 1; b <= passed; b++) { const [bx, by] = Z[b]; rect(bx - 2, by - 1, 5, 2, 'r'); put(bx, by - 2, 'w') }
      if (t < go) { blit(LADR.slice(0, 11), 2, -10 + Math.round(t * 4)); text('LOMBARD ST', 'c', 0, 'w') } // at the top, about to trip
      else if (!done) { const r = Math.floor(t * 10) % 4; disc(x, y, 3, 'b'); put(x + [2, 0, -2, 0][r], y + [0, 2, 0, -2][r], 'w'); put(x - [2, 0, -2, 0][r], y - [0, 2, 0, -2][r], 'w'); put(x, y, 'w') }
      else { rect(2, 18, 9, 3, 'r'); rect(4, 17, 5, 1, 'b'); rect(5, 16, 3, 1, 'b'); if (t > 7.0) { rect(12, 19, 2, 2, 'w'); put(13 - (Math.floor(t * 3) % 2), 20, 'b') } }
      for (let b = 1; b <= passed; b++) splat(t, go + b * seg, Z[b][0], Z[b][1] - 2, 0.35)
      if (t >= go) text(!done ? `TURN ${Math.min(8, passed + 1)}` : 'SCENIC', 'c', 0, done ? 'y' : 'w')
    } },
    // STUBHUB (seat upgrade, redone, 30 Oct, later: "a dodger buying a ticket on stubhub for $132"): no Giant; he buys the seat on his phone, sits, and the seat folds
    // him up once for each fee, ribs out the back, until he is all in it, his eyes blinking in the headrest
    seat: { dur: 8.8, still: 4.6, draw(t) {
      ground()
      const hx = 34, hy = 16, F = [2.6, 3.6, 4.6, 5.6], n = F.filter((x) => t >= x).length, fold = Math.min(1, n * 0.27)
      const a = Math.PI / 2 - fold * 1.3, bx = hx + Math.cos(a) * 11, by = hy - Math.sin(a) * 11
      rect(hx, hy, 11, 2, 'o'); line(hx + 2, hy + 2, hx + 2, 20, 'g'); line(hx + 9, hy + 2, hx + 9, 20, 'g') // the seat
      if (t < 1.8) { blit(LADR, 12 + Math.min(1, t / 1.2) * 4, 7); rect(27, 11, 2, 3, 'g'); put(27, 12, Math.floor(t * 4) % 2 ? 'e' : 'w') } // buying it on his phone
      else if (n < 4) { for (let i = 0; i <= 10; i++) { const f = i / 10, x = hx + 1 + (bx - hx) * f, y = hy - 1 + (by - hy) * f; put(x, y, f < 0.75 ? 'b' : 'w'); put(x + 1, y, f < 0.75 ? 'b' : 'w'); put(x + 2, y, f < 0.75 ? 'w' : 'w') } rect(hx + 3, hy - 2, 8, 2, 'g'); rect(hx + 11, hy - 1, 2, 6, 'g') } // sitting in it
      if (n >= 1 && n < 4) for (let i = 0; i < n * 2; i++) put(hx - 1 - (i % 2), hy - 3 - i, 'w') // ribs out the back
      if (n >= 1) for (let i = 0; i < 5; i++) { const s2 = (t * 2.4 + i / 5) % 1; put(hx + 5 + (i - 2) * s2 * 2, hy - s2 * 8 + s2 * s2 * 9, 'r') }
      for (let i = 0; i <= 11; i++) { const f = i / 11; put(hx + (bx - hx) * f, hy + (by - hy) * f, 'o'); put(hx - 1 + (bx - hx) * f, hy + (by - hy) * f, 'o') } // the back, folding
      rect(bx - 2, by - 3, 4, 3, 'd')
      if (n >= 4) { const b2 = Math.floor(t * 3) % 3 === 0; put(bx - 1, by - 2, b2 ? 'd' : 'w'); put(bx + 1, by - 2, b2 ? 'd' : 'w') } // his eyes in the headrest
      F.forEach((x0) => splat(t, x0, hx + 5, hy - 3, 0.5))
      text(t < 1.2 ? 'STUBHUB' : t < 2.6 ? '$132' : n < 4 ? '+ FEES' : 'ALL IN', 'c', 0, n < 4 ? 'w' : 'y')
    } },
    // SECURITY CHECK (redone, 30 Oct, later: "the gore needs to land much clearer"): the Giant wands him at the gate; every beep, one whole piece of him comes off and
    // goes in the bin, a gusher from the stump each time: an arm, the other arm, a leg, the head; the last beep is the cap, waved through on its puddle
    bagcheck: { dur: 9.0, still: 4.4, draw(t) {
      ground()
      const T = [1.8, 3.0, 4.2, 5.4], n = T.filter((x) => t >= x).length, clear = t >= 6.6, lx = 14
      rect(50, 12, 1, 9, 'g'); rect(61, 12, 1, 9, 'g'); rect(50, 20, 12, 1, 'g') // the bin
      const fill = Math.min(6, n * 1.5); for (let y = 0; y < fill; y++) for (let x = 51; x < 61; x++) put(x, 19 - y, (x * 3 + y * 7) % 5 ? 'r' : (x + y) % 3 ? 'b' : 'w')
      rect(66, 3, 2, 18, 'n'); rect(66, 3, 6, 2, 'n') // the gate
      // him, a piece less each beep: right arm (col 10), left arm (col 0), a leg, the head
      if (n < 4) {
        const me = LADR.map((r, j) => {
          let row = r
          if (n >= 1 && j >= 5 && j <= 10) row = row.slice(0, 10) + '.'
          if (n >= 2 && j >= 5 && j <= 10) row = '.' + row.slice(1)
          if (n >= 3 && j >= 11) row = row.slice(0, 5) + '......'
          return row
        })
        const hop = n >= 3 ? Math.round(Math.abs(Math.sin(t * 6)) * 2) : 0
        blit(me, lx, 7 - hop)
        const stumps = [[lx + 10, 12 - hop], [lx, 12 - hop], [lx + 7, 18 - hop]].slice(0, n)
        for (const [sx, sy] of stumps) for (let i = 0; i < 4; i++) { const s2 = (t * 3 + i / 4) % 1; put(sx + (sx > lx + 5 ? 1 : -1) * s2 * 4, sy - s2 * 6 + s2 * s2 * 8, 'r') } // the stumps, gushing
      } else if (!clear) { blit(headless(LADR).map((r, j) => (j >= 5 && j <= 10 ? '.' + r.slice(1, 10) + '.' : j >= 11 ? r.slice(0, 5) + '......' : r)), lx, 7 + Math.min(6, Math.round((t - 5.4) * 12))); for (let i = 0; i < 6; i++) { const s2 = (t * 3 + i / 6) % 1; put(lx + 5 + (i - 3) * s2, 12 - s2 * 10 + s2 * s2 * 12, 'r') } } // headless, sinking
      // each piece flying into the bin
      const P = [(x, y) => { rect(x, y, 2, 5, 'b'); rect(x, y + 5, 2, 1, 'w') }, (x, y) => { rect(x, y, 2, 5, 'b'); rect(x, y + 5, 2, 1, 'w') }, (x, y) => { rect(x, y, 2, 3, 'g'); rect(x, y + 3, 3, 1, 'd') }, (x, y) => { rect(x, y, 5, 1, 'b'); rect(x, y + 1, 5, 3, 'w'); put(x + 1, y + 2, 'd'); put(x + 3, y + 2, 'd') }]
      T.forEach((x0, i) => { if (t > x0 && t < x0 + 0.6) { const k = (t - x0) / 0.6; P[i](Math.round(lx + 5 + k * (52 - lx)), Math.round(10 - Math.sin(k * Math.PI) * 10 + k * 4)) } })
      if (clear) { const cx = 18 + Math.min(1, (t - 6.8) / 1.0) * 44; rect(cx - 3, 20, 10, 1, 'r'); rect(cx, 19, 5, 1, 'b'); rect(cx + 1, 18, 3, 1, 'b') } // the cap, on its puddle, waved through
      blit(SFGL, 34, 7)
      const wx = 28, beep = !clear && t > 1.4 && Math.floor(t * 8) % 2
      line(35, 13, wx, 11, 'g'); put(wx, 10, clear ? 'e' : beep ? 'r' : 'g')
      T.forEach((x0) => splat(t, x0, lx + 5, 12, 0.6))
      text(t < 1.6 ? 'SECURITY CHECK' : !clear ? (Math.floor(t * 4) % 2 ? 'BEEP' : '') : 'CLEARED', 'c', 0, clear ? 'e' : t < 1.6 ? 'w' : 'r')
    } },
    // NO REENTRY (simplified, 30 Oct, later: "it's not always clear what's going on"): the way out is a revolving door; he goes in, it spins faster and faster, the
    // glass goes red, and his head rolls back out the park side; the Giant stops it with his foot and wants to see a hand stamp
    noreentry: { dur: 8.6, still: 3.6, draw(t) {
      ground()
      const DX = 36, W = 16, spin = t < 1.8 ? t * 0.6 : 1.08 + (t - 1.8) ** 2 * 3.2, inside = t >= 1.8, mess = Math.max(0, Math.min(1, (t - 3.0) / 1.8)), stop = t > 5.4
      const sp = stop ? 1.08 + 3.6 ** 2 * 3.2 + (t - 5.4) * 0.3 : spin
      rect(DX - 1, 4, W + 2, 1, 'g'); rect(DX - 1, 20, W + 2, 1, 'g'); line(DX - 1, 4, DX - 1, 20, 'g'); line(DX + W, 4, DX + W, 20, 'g') // the housing
      if (!inside) blit(run(LADR, Math.floor(t * 10) % 2), 10 + ease(t / 1.8) * 22, 7)
      else if (t < 3.0) { const f = Math.floor(t * 12) % 2; blit(f ? LADR : LAD, DX + 3 + Math.round(Math.sin(sp * 4) * 2), 7) } // going round with it
      for (let y = 5; y < 20; y++) for (let x = DX; x < DX + W; x++) if (hash(x * 13 + y * 7) < mess) put(x, y, hash(x + y * 3) < 0.15 ? 'w' : hash(x * 5 + y) < 0.2 ? 'b' : 'r') // the glass, red
      for (let k = 0; k < 4; k++) { const a = sp * 2 + (k * Math.PI) / 2, x = DX + W / 2 + Math.cos(a) * (W / 2 - 1); if (Math.sin(a) > 0) line(x, 5, x, 19, 'w') } // the panels, going round
      if (stop) { const k = Math.min(1, (t - 5.4) / 1.0), x = DX - 4 - k * 14; rect(x, 17, 4, 1, 'b'); rect(x, 18, 4, 3, 'w'); put(x + 1 + (Math.floor(t * 8) % 2), 19, 'd') } // his head rolls back out, into the park
      blit(SFG, 4, 7); if (t > 6.4) { line(12, 20, 17, 20, 'd'); rect(13, 9, 3, 2, 'r'); put(14, 8, 'g') } // the foot on it; the stamp, held out
      splat(t, 3.0, DX + 8, 12, 1.0)
      text(t < 1.8 ? 'LEAVING?' : t < 5.4 ? 'SPIN' : 'STAMP?', 'c', 0, t < 5.4 ? 'w' : 'y')
    } },
    // ---- 30 Oct, night: his five from the ten (Andrew: "I like 1, 3, 4, 5, 7"; the cove one, Giants fans throw him in) ----
    // MUNI WAIT: he lies down across the Muni tracks to end it; the train never comes; the days go by and he is bones; then it comes, all at once
    muniwait: { dur: 9.4, still: 4.6, draw(t) {
      ground(); line(0, 19, GW - 1, 19, 'g'); for (let x = 1; x < GW; x += 3) put(x, 20, 'n') // the rails, the ties
      line(60, 6, 60, 18, 'g'); rect(56, 3, 9, 4, 'r'); mini('MUNI', 57, 4, 'w', true) // the stop
      const day = t < 3.0 ? 0 : t < 4.0 ? 1 : 2, bones = t >= 4.0, train = t >= 6.0, tx = Math.round(GW + 4 - (t - 6.0) * 120)
      if (t < 1.2) blit(LADR, 18 + t * 8, 7) // walking to the tracks
      else if (!bones || tx > 44) {
        if (!bones) { rect(24, 17, 3, 2, 'b'); rect(27, 17, 3, 2, 'w'); rect(30, 17, 8, 2, 'b'); rect(38, 17, 6, 2, 'g'); rect(44, 17, 2, 2, 'd'); if (day >= 1) rect(30, 16, 4, 1, 'g') } // lying across the rails; a beard coming in
        else { rect(24, 16, 3, 1, 'b'); rect(27, 17, 3, 2, 'w'); put(28, 17, 'd'); for (let x = 30; x < 46; x += 2) { put(x, 17, 'w'); put(x, 18, 'w') } for (let i = 0; i < 4; i++) put(31 + i * 4, 16, 'g') } // bones, cobwebs
      }
      if (train && tx < GW) { rect(tx, 8, 40, 10, 'o'); rect(tx, 12, 40, 1, 'w'); for (let i = 3; i < 38; i += 6) rect(tx + i, 9, 4, 3, 'd'); rect(tx + 4, 18, 4, 1, 'd'); rect(tx + 30, 18, 4, 1, 'd'); mini('N', tx + 2, 13, 'w', true) } // the N Judah, at last
      if (train && tx <= 44) for (let i = 0; i < 16; i++) { const u = t - 6.3; put(30 + (hash(i) - 0.7) * u * 60, 17 - u * 20 * hash(i + 3) + u * u * 30, i % 3 ? 'w' : 'g') } // the bones, everywhere
      splat(t, 6.3, 34, 17, 0.5)
      text(t < 1.2 ? 'MUNI' : t < 3.0 ? 'NEXT 4 MIN' : t < 4.0 ? 'DAY 40' : t < 6.0 ? 'DAY 9000' : 'ARRIVING', 'c', 0, t < 6.0 ? 'w' : 'o')
    } },
    // FOGHORN: he climbs into the mouth of the Golden Gate's foghorn and waits; the fog comes in; the horn goes off and blows him out over the bay as a pink mist
    foghorn: { dur: 8.8, still: 3.4, draw(t) {
      for (let x = 0; x < GW; x++) { put(x, 18 + (Math.sin(x * 0.5 + t * 3) > 0.6 ? 0 : 1), 'b'); line(x, 19, x, GH - 1, 'b') } // the bay
      rect(2, 0, 3, 18, 'o'); rect(9, 0, 3, 18, 'o'); rect(2, 4, 10, 1, 'o'); rect(0, 17, 30, 1, 'o') // a tower, the footing
      const blow = t >= 4.4, sh = blow && t < 5.4 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0
      rect(14 + sh, 9, 8, 6, 'g'); for (let i = 0; i < 6; i++) line(22 + i + sh, 10 - Math.floor(i / 2), 22 + i + sh, 14 + Math.floor(i / 2), 'g'); rect(16 + sh, 15, 2, 2, 'd') // the horn, its bell facing the bay
      if (t < 2.0) blit(LADR, 30 - Math.min(1, t / 1.6) * 2, 4) // walking up
      else if (!blow) { rect(28, 11, 4, 2, 'g'); rect(32, 11, 2, 2, 'd'); rect(28, 13, 4, 1, 'b') } // his legs sticking out of the bell
      if (t > 2.4) { const k = Math.min(1, (t - 2.4) / 1.6); for (let i = 0; i < 60 * k; i++) put(hash(i) * GW + Math.sin(t + i) * 2, hash(i + 40) * 16, 'g') } // the fog
      if (blow && t < 7.0) { const u = t - 4.4; for (let i = 0; i < 80; i++) { const r = hash(i) * u * 30, a = (hash(i + 7) - 0.5) * 0.9; put(28 + Math.cos(a) * r, 12 + Math.sin(a) * r + u * u * 2, i % 5 ? 'r' : i % 2 ? 'w' : 'b') } for (let i = 0; i < 12; i++) line(28 + i * 3, 12 - i * 0.6, 30 + i * 3, 12 - i * 0.6, u < 0.6 ? 'w' : 'd') } // the blast, and him in it
      if (blow) rect(40 + (t - 4.4) * 9, 16 + Math.min(2, (t - 4.4) * 2), 4, 1, 'b') // his cap, on the water
      splat(t, 4.4, 30, 12, 0.7)
      text(t < 2.0 ? 'FOGHORN' : t < 4.4 ? 'WAIT FOR IT' : t < 6.0 ? 'BWAAAMP' : 'PINK FOG', 'c', 0, t < 6.0 ? 'w' : 'r')
    } },
    // THIRD RAIL: on the BART tracks he grabs the third rail; the board flashes his skeleton like an X-ray; his cap blows off; he is done to a crisp and falls to ash
    thirdrail: { dur: 8.4, still: 2.6, draw(t) {
      ground(); line(0, 20, GW - 1, 20, 'g'); rect(0, 18, GW, 1, 'y'); for (let x = 2; x < GW; x += 8) put(x, 17, 'd') // the rails, the third rail on its posts
      rect(44, 5, 27, 7, 'y'); mini('DANGER', 46, 6, 'd', true) // the sign
      const zap = t >= 1.8 && t < 4.2, crisp = t >= 4.2, lx = 26
      if (t < 1.8) blit(LADR, 10 + Math.min(1, t / 1.4) * 16, 7)
      else if (zap) { const f = Math.floor(t * 14) % 2; if (f) blit(SKEL, lx + 1, 7); else blit(LADR, lx, 7); for (let i = 0; i < 6; i++) { const a = hash(Math.floor(t * 12) + i) * Math.PI * 2; line(lx + 5, 13, lx + 5 + Math.cos(a) * 9, 13 + Math.sin(a) * 6, 'y') } line(lx + 9, 17, lx + 10, 18, 'y') } // the X-ray, the sparks
      else { const k = Math.min(1, (t - 5.2) / 1.0); if (t < 5.2) { blit(LADR.map((r) => r.replace(/[bwg]/g, 'd')), lx, 7); for (let i = 0; i < 4; i++) put(lx + 3 + i * 2, 6 - ((t * 6 + i * 2) % 5), 'g') } else for (let i = 0; i < 30; i++) put(lx + (i % 10) + k * hash(i) * 6, 20 - Math.floor(i / 10) * (1 - k) * 3, 'd') } // charred, smoking; then ash
      if (t > 2.0) { const u = Math.min(1.6, t - 2.0); rect(lx + 3 + u * 8, 6 - u * 9 + u * u * 6, 5, 1, 'b') } // his cap, blown off
      splat(t, 1.8, lx + 5, 12, 0.6)
      text(t < 1.8 ? 'BART' : zap ? (Math.floor(t * 6) % 2 ? 'ZZZZT' : '') : 'RAILED', 'c', 0, zap ? 'y' : 'w')
    } },
    // $19 IPA: he reads the price on a ballpark beer, his eyes bulge, his heart jumps out of his chest, and he is dead before he hits the ground; the Giant drinks it
    ipa: { dur: 8.4, still: 3.2, draw(t) {
      ground()
      rect(30, 14, 26, 7, 'n'); rect(30, 14, 26, 1, 'y') // the stand
      rect(46, 3, 12, 8, 'd'); mini('$19', 47, 5, 'y', true) // the price
      const drop = t >= 3.0, lx = 18
      rect(38, 10, 3, 4, 'y'); rect(38, 9, 3, 1, 'w') // the beer
      if (!drop) { const me = LADR.map((r, j) => (j === 3 && t > 1.6 ? '...wwdwwd..'.slice(0, 11) : r)); blit(me, lx, 7); if (t > 1.6) { rect(lx + 4, 9, 2, 2, 'w'); rect(lx + 7, 9, 2, 2, 'w'); put(lx + 5, 10, 'd'); put(lx + 8, 10, 'd') } } // reading it; then the eyes
      if (t > 2.4 && t < 4.0) { const k = (t - 2.4) / 1.6; rect(lx + 4 + k * 8, 14 - Math.sin(k * Math.PI) * 8 + k * 4, 2 + (Math.floor(t * 8) % 2), 2, 'r') } // the heart, out
      if (drop) { const k = Math.min(1, (t - 3.0) / 0.4); if (k < 1) blit(LADR, lx - k * 4, 7 + k * 6); else { rect(lx - 6, 19, 9, 2, 'b'); rect(lx + 3, 19, 4, 2, 'g'); rect(lx - 9, 19, 3, 2, 'w'); put(lx - 8, 19, 'd') } } // down, flat
      if (t > 4.6) { const k = Math.min(1, (t - 4.6) / 1.0); blit(SFGL, 70 - k * 30, 7); if (t > 5.8) { rect(37, 7, 3, 3, 'y'); line(41, 11, 38, 9, 'o') } } // the Giant, his beer now
      splat(t, 3.4, lx - 2, 18, 0.5)
      text(t < 1.6 ? 'COLD ONE' : t < 3.0 ? '$19' : t < 5.8 ? 'FLATLINE' : 'CHEERS', 'c', 0, t < 3.0 ? 'w' : t < 5.8 ? 'r' : 'o')
    } },
    // COVE DIVE: two Giants fans on the wall tie a cinder block marked LAD to his ankles, swing him one, two, three, and over he goes; down he goes, the sea lions
    // take what they want on the way, and all that comes back up is a bubble and his cap
    covedive: { dur: 9.0, still: 2.4, draw(t) {
      for (let x = 0; x < 26; x++) for (let y = 15; y < GH; y++) put(x, y, (x + (y % 2) * 2) % 4 ? 'n' : 'd') // the wall
      for (let x = 26; x < GW; x++) { put(x, 15 + (Math.sin(x * 0.5 + t * 3) > 0.6 ? 0 : 1), 'b'); for (let y = 16; y < GH; y++) if ((x + y) % 5 === 0) put(x, y, 'b') } // the Cove
      blit(SFG, 1, 1); blit(SFG, 14, 1)
      const sw = t < 3.0 ? Math.sin(t * Math.PI * 1.4) : 0, fly = t >= 3.0, u = t - 3.0
      if (!fly) { const x = 9 + sw * 6; rect(x - 3, 9, 3, 3, 'w'); put(x - 2, 10, 'd'); rect(x, 9, 8, 3, 'b'); rect(x + 8, 9, 3, 2, 'g'); rect(x + 11, 8, 5, 5, 'g'); put(x + 13, 10, 'd') } // him, swung between them, the block on his ankles
      else { const k = Math.min(1, u / 0.9), x = 15 + k * 30, y = u < 0.9 ? 8 - Math.sin(k * Math.PI) * 6 + k * 7 : Math.min(20, 15 + (u - 0.9) * 6); rect(x, y, 6, 2, 'b'); rect(x + 6, y, 2, 2, 'w'); rect(x - 4, y + 1, 4, 3, 'g') } // over, and down
      if (u > 0.9 && u < 1.3) for (let i = 0; i < 8; i++) put(45 + (i - 4) * (u - 0.9) * 10, 15 - (u - 0.9) * 16 * (1 - Math.abs(i - 4) * 0.2), 'w')
      if (u > 1.4 && u < 3.6) { blit(SPR.seal[Math.floor(t * 4) % 2], 40 + Math.sin(t * 2) * 3, 14); for (let i = 0; i < 10; i++) put(42 + hash(i) * 14, 17 + hash(i + 2) * 4, 'r') } // the sea lions, on the way down
      if (u > 3.8) { put(47, 15 - ((t * 4) % 3), 'w'); rect(44, 15, 4, 1, 'b') } // a bubble, his cap
      splat(t, 4.6, 46, 18, 0.4)
      text(t < 3.0 ? (t < 1.0 ? 'ONE' : t < 2.0 ? 'TWO' : 'THREE') : u < 1.4 ? '' : 'SPLASH HIT', 'c', 0, t < 3.0 ? 'o' : 'b')
    } },
    // ---- 31 Oct (Andrew's picks from GPT's list: "I like mission burrito, parking boot, bison, transamerica pyramid (point taken is fucking hilarious)") ----
    // MISSION BURRITO: he lies down on the taqueria counter on a giant tortilla; the two sides fold over him; a cleaver chops it in three; the middle slice, turned
    // to us, has his blue cap in it
    burrito: { dur: 9.4, still: 6.2, draw(t) {
      ground(); rect(8, 16, 56, 2, 'n'); rect(8, 16, 56, 1, 'y'); rect(10, 18, 2, 3, 'd'); rect(60, 18, 2, 3, 'd') // the counter
      mini('TAQUERIA', 'c', 1, 'y', true)
      const lie = t >= 1.2, wrapped = t >= 3.0, chop1 = t >= 3.7, chop2 = t >= 4.5, face = t >= 5.3
      const body = (x, y) => { rect(x, y, 2, 2, 'b'); rect(x + 2, y, 3, 3, 'w'); put(x + 3, y + 1, 'd'); rect(x + 5, y, 9, 3, 'b'); put(x + 8, y + 1, 'w'); put(x + 10, y + 1, 'w'); rect(x + 14, y + 1, 5, 2, 'g'); rect(x + 19, y, 2, 3, 'd') } // lying down, head left
      if (!lie) blit(run(LADR, Math.floor(t * 6) % 2), -12 + Math.min(1, t / 1.0) * 30, 2)
      if (lie && !wrapped) {
        rect(6, 15, 58, 1, 'y'); for (let x = 8; x < 62; x += 5) put(x, 15, 'n') // the tortilla under him
        body(24, 12)
        if (t >= 1.6) { const k = ease((t - 1.6) / 1.4), L = 16 // the two sides fold up and over
          for (const [hx, a0, a1] of [[22, 180, 0], [48, 0, 180]]) { const a = ((a0 + (a1 - a0) * k) * Math.PI) / 180; for (let i = 0; i <= L; i++) { const px = hx + Math.cos(a) * i, py = 15 - Math.sin(a) * i; put(px, py, i % 5 === 2 ? 'n' : 'y'); put(px, py - 1, 'y') } } }
      }
      if (wrapped) {
        const sl = (x0, dx, w) => { rect(x0 + dx, 10, w, 6, 'y'); for (let i = 0; i < w; i += 3) put(x0 + dx + i, 11 + (i % 2) * 2, 'n') }
        const a = chop1 ? -Math.min(3, (t - 3.7) * 10) : 0, c = chop2 ? Math.min(3, (t - 4.5) * 10) : 0
        sl(20, a, 10); if (!face) sl(30, 0, 10); sl(40, c, 10)
        put(19 + a, 12, 'y'); put(19 + a, 13, 'y'); put(50 + c, 12, 'y'); put(50 + c, 13, 'y') // the round ends
        if (!chop2) { const w = Math.floor(t * 8) % 2; put(51 + c, 11 + w, 'd'); put(52 + c, 11 + w, 'd') } // his shoes, kicking, until the second chop
        if (chop1) { line(29 + a, 10, 29 + a, 15, 'r'); put(29 + a, 12, 'w') } // the cut faces
        if (chop2) { line(40 + c, 10, 40 + c, 15, 'r'); put(40 + c, 13, 'w'); for (let i = 0; i < 4; i++) put(41 + c + i, 16, 'r') }
        if (face) { disc(35, 12, 5, 'y'); disc(35, 12, 4, 'r'); rect(33, 11, 4, 2, 'b'); put(33, 13, 'b'); put(38, 10, 'w'); put(32, 14, 'w'); put(37, 14, 'g') } // the middle slice turned to us: his cap in it, a bone, a tooth
      }
      for (const [tc, x] of [[3.7, 25], [4.5, 36]]) { const u = t - (tc - 0.35); if (u > 0 && u < 0.75) { const y = u < 0.35 ? -10 + (u / 0.35) * 18 : 8 - Math.max(0, u - 0.5) * 50; rect(x, y, 10, 8, 'g'); rect(x, y + 7, 10, 1, 'w'); rect(x + 3, y - 4, 3, 4, 'n') } } // the cleaver
      splat(t, 3.7, 30, 13, 0.6)
      if (t < 1.6) slim('ONE SUPER', 'w'); else if (t < 3.4) slim('WRAP IT', 'y'); else if (t < 5.3) slim(Math.floor(t * 3) % 2 ? 'CHOP' : '', 'r'); else slim('EXTRA MEAT', 'r')
    } },
    // PARKING BOOT: he stands by his car on a red curb; a giant orange boot rolls in and clamps his ankles, then keeps closing, folding him down into it like an
    // accordion from the feet up until only his cap is left on top of it; the ticket flutters down onto the cap
    boot: { dur: 9.0, still: 6.0, draw(t) {
      ground(); line(0, GH - 1, 34, GH - 1, 'r') // the red curb
      rect(2, 13, 28, 5, 'g'); rect(8, 9, 15, 4, 'g'); rect(10, 10, 5, 2, 'b'); rect(17, 10, 5, 2, 'b'); disc(8, 18, 2, 'd'); disc(24, 18, 2, 'd'); rect(28, 14, 2, 1, 'y') // the car
      const ticketDown = t >= 5.2
      if (!ticketDown) rect(21, 10, 2, 2, 'w') // the ticket, under the wiper
      const k0 = Math.min(1, Math.max(0, (t - 0.8) / 0.8)), bx = 46 + (1 - ease(k0)) * 30, sq = Math.min(1, Math.max(0, (t - 2.0) / 2.8)), hb = Math.round(10 * (1 - ease(sq)))
      // him: the cap, and under it the face to the knees (sprite rows 2 to 11) squeezed into hb rows over the jaw on his ankles; once the top jaw is on, the cap rides on it
      const src = LAD, clamp = t >= 1.6, mid = Array.from({ length: hb }, (_, r) => src[2 + Math.round((r * 9) / Math.max(1, hb - 1))])
      if (!clamp) blit(src, 34, 7)
      else { blit(mid, 34, 19 - hb); blit(src.slice(0, 2), 34, 15 - hb) }
      if (sq > 0 && sq < 1) for (let i = 0; i < 6; i++) { const u = (t * 3 + i / 6) % 1; put(33 - u * 6, 18 - hb / 2 - u * 3 + u * u * 8, 'r'); put(46 + u * 6, 18 - hb / 2 - u * 3 + u * u * 8, 'r') } // squirting out both sides
      // the boot: a jaw on his ankles, a jaw on top of what is left of him, the big orange body with its lock; it all rolls in together
      const top = 17 - hb
      rect(Math.max(32, bx - 16), 19, bx - Math.max(32, bx - 16), 2, 'o'); if (clamp) rect(32, top, bx - 32, 2, 'o')
      rect(bx, Math.min(top, 12), 8, 21 - Math.min(top, 12), 'o'); disc(bx + 4, 16, 2, 'y'); put(bx + 4, 16, 'd')
      if (ticketDown) { const u = Math.min(1, (t - 5.2) / 1.4), x = 21 + u * 16 + Math.sin(u * 9) * 2, y = 10 + u * (top - 14); rect(x, y, 2, 2, 'w'); put(x, y, 'd') } // the ticket, onto the cap
      splat(t, 2.4, 39, 17, 0.4)
      slim(t < 0.8 ? 'NO PARKING' : t < 2.0 ? 'BOOTED' : t < 5.0 ? (Math.floor(t * 2) % 2 ? 'TIGHTER' : '') : 'EXPIRED', t < 2.0 ? 'o' : t < 5.0 ? 'r' : 'o')
    } },
    // GOLDEN GATE PARK BISON: he holds out a peanut to the bison; it lowers its head, charges, and launches him; he comes down skewered on the stake of a park sign;
    // a Giant walks up and turns the sign around
    bison: { dur: 9.8, still: 7.6, draw(t) {
      ground()
      // the sign: two posts, one sharpened and standing up past the board; the board's back, then (turned) its front
      line(7, 0, 7, 21, 'n'); put(7, 0, 'w'); line(15, 8, 15, 21, 'n')
      const fl = t < 6.0 ? 1 : Math.abs(Math.cos(Math.min(1, (t - 6.0) / 0.6) * Math.PI)), front = t >= 6.3, bw = Math.max(1, Math.round(17 * fl))
      rect(11 - bw / 2, 8, bw, 11, 'n'); if (!front) for (let y = 10; y < 19; y += 3) line(11 - bw / 2, y, 11 + bw / 2 - 1, y, 'd')
      if (front) { rect(3, 8, 17, 11, 'w'); disc(11, 13, 4.6, 'r'); disc(11, 13, 3.4, 'w'); rect(9, 12, 4, 2, 'y'); put(9, 12, 'n'); put(12, 13, 'n'); line(8, 10, 14, 16, 'r'); line(8, 11, 13, 16, 'r') } // the front: no peanuts
      // the bison, half the frame: hump, head down when it charges, horns, beard, legs that run
      const ch = t >= 2.4 && t < 4.6, cx = t < 2.4 ? 42 : t < 2.9 ? 42 - ((t - 2.4) / 0.5) * 12 : t < 4.6 ? 30 : 30 + (t - 4.6) * 40, dn = t >= 1.8 && t < 4.6 ? 2 : 0
      disc(cx + 17, 13, 9, 'n', 0.6); disc(cx + 9, 10, 6, 'd'); rect(cx, 9 + dn, 8, 7, 'd'); rect(cx + 1, 16 + dn, 5, 2, 'd'); put(cx + 2, 11 + dn, 'w'); put(cx + 1, 8 + dn, 'w'); put(cx, 7 + dn, 'w'); put(cx + 6, 8 + dn, 'w'); put(cx + 7, 7 + dn, 'w')
      const st = ch ? Math.floor(t * 10) % 2 : 0; for (const [lx, o] of [[8, 0], [12, 1], [21, 0], [25, 1]]) rect(cx + lx + (st === o ? 1 : 0), 17, 2, 4, 'd'); put(cx + 27, 11, 'd'); put(cx + 28, 12, 'd')
      if (ch && t < 2.9) for (let i = 0; i < 5; i++) put(cx + 28 + hash(i + Math.floor(t * 9)) * 6, 19 + hash(i + 3) * 2, 'g') // dust
      // him: holding out the peanut; launched; skewered
      const u = t - 2.75
      if (u < 0) { blit(LADR, 23, 7); line(33, 12, 36, 12, 'b'); rect(37, 12, 2, 1, 'y') }
      else if (u < 1.0) { const k = u / 1.0, x = 23 - k * 21, y = 7 - Math.sin(k * Math.PI) * 9 - k * 6; blit(Math.floor(t * 8) % 2 ? upside(LADR) : LADR, x, y) } // tumbling through the air
      else { rect(0, 1, 2, 2, 'b'); rect(2, 1, 3, 3, 'w'); put(3, 2, 'd'); rect(5, 1, 5, 3, 'b'); rect(10, 2, 4, 2, 'g'); rect(14, 2, 2, 2, 'd'); line(7, 0, 7, 4, 'n'); put(7, 0, 'w'); for (let i = 0; i < 3; i++) put(7, 5 + ((t * 5 + i * 2) % 3), 'r') } // on the stake, dripping
      if (t >= 5.4) { const k = Math.min(1, (t - 5.4) / 0.5); blit(k < 1 ? run(SFGL, Math.floor(t * 6) % 2) : SFGL, 72 - k * 52, 7) } // the Giant walks up to the sign
      splat(t, 3.75, 7, 3, 0.45)
      slim(t < 1.8 ? 'NICE BISON' : t < 2.75 ? 'UH OH' : t < 6.3 ? '' : 'NO FEEDING', t < 1.8 ? 'w' : t < 2.75 ? 'y' : 'r')
    } },
    // POINT TAKEN (the Transamerica Pyramid): he stands at its foot and looks up; the top of the pyramid creaks, folds down at its point like a spear and runs him
    // through; it rises back into the skyline with his blue cap on the tip
    pyramid: { dur: 9.0, still: 6.6, draw(t) {
      ground()
      const AX = 36, AY = 3, HY = 11, hw = (y) => ((y - AY) * 5.5) / 18 // the pyramid: apex at (36, 3), base 11 wide on the ground, tall and thin; the top hinges at its right corner at y 11
      for (let y = HY; y <= 20; y++) { const w = hw(y); line(AX - w, y, AX + w, y, y % 2 ? 'g' : 'w') }
      const hx = AX + hw(HY), hy = HY
      const th = t < 1.8 ? 0 : t < 2.6 ? Math.sin(t * 30) * 0.05 : t < 3.0 ? ((t - 2.6) / 0.4) ** 2 * 1.65 : t < 4.6 ? 1.65 : t < 5.6 ? 1.65 * (1 - ease((t - 4.6) / 1.0)) : 0
      const rot = (x, y) => { const dx = x - hx, dy = y - hy, c = Math.cos(th), sn = Math.sin(th); return [hx + dx * c - dy * sn, hy + dx * sn + dy * c] }
      const P = [rot(AX, AY), rot(AX - hw(HY), HY), rot(hx, HY)]
      const inT = (px, py) => { const [[x1, y1], [x2, y2], [x3, y3]] = P, d = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1), a = ((x2 - px) * (y3 - py) - (y2 - py) * (x3 - px)) / d, b = ((x3 - px) * (y1 - py) - (y3 - py) * (x1 - px)) / d; return a >= -0.02 && b >= -0.02 && 1 - a - b >= -0.02 }
      for (let y = -2; y < GH; y++) for (let x = 20; x < GW; x++) if (inT(x + 0.5, y + 0.5)) put(x, y, (y + Math.round(th * 3)) % 2 ? 'g' : 'w')
      const [tx, ty] = P[0]
      // him: walking up, looking up, run through, then on the ground without his cap
      const hit = t >= 3.0
      if (t < 1.4) blit(run(LAD, Math.floor(t * 6) % 2), 64 - Math.min(1, t / 1.4) * 22, 7)
      else if (!hit) { blit(LADR.map((r, j) => (j === 3 ? '...wdwdw...' : j === 4 ? '...wwwww...' : r)), 42, 7); if (t > 1.8) mini('?', 47, 1, 'w', true) } // looking up
      else if (t < 4.6) { blit(headless(LADR), 42, 7); rect(45, 8, 5, 3, 'r'); line(tx, ty, 47, 11, 'w') } // run through
      else { rect(42, 19, 13, 2, 'b'); rect(55, 19, 2, 2, 'r'); for (let i = 0; i < 18; i++) put(40 + i, 21 - 1, 'r') } // flat, headless
      if (hit) { const ct = t < 4.6 ? [47, 8] : [tx, ty - 2]; rect(ct[0] - 1, ct[1], 3, 2, 'b') } // his cap, on the tip
      splat(t, 3.0, 47, 9, 0.6)
      slim(t < 1.8 ? 'LOOK UP' : t < 2.6 ? 'CREAK' : t < 4.6 ? '' : 'POINT TAKEN', t < 2.6 ? 'w' : 'r')
    } },
  }
  // the gags; a shuffled bag, so every gag plays before any plays twice and never the same one twice in a row
  const GAGS = ['rollup', 'muniwait', 'foghorn', 'thirdrail', 'ipa', 'covedive', 'bagcheck', 'noreentry', 'rentctrl', 'merch', 'lombard', 'seat', 'humanbat', 'crabpot', 'bartdoors', 'mowedin', 'runover', 'sealsnack', 'leaves3rd', 'bipped', 'chipper', 'alcatraz', 'tshirt', 'steamroller', 'birds', 'quake', 'bp', 'driverless', 'crabsnip', 'hotdog', 'waterboard', 'ironmaiden', 'wifeleaves', 'bridgejump', 'burrito', 'boot', 'bison', 'pyramid']
  let bag = [], lastGag = null
  function nextGag() {
    if (!bag.length) { bag = GAGS.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] } if (bag[bag.length - 1] === lastGag) bag.unshift(bag.pop()) }
    lastGag = bag.pop(); return lastGag
  }
  const PRIORITY = {}
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
  // the gags run a little slower than they were drawn (30 Oct, Andrew: "each of these gags could be a little longer so people can make more sense of them - just a little slower")
  const PACE = 0.8
  function frame(dt) {
    buf.fill(0); tbuf.fill(0)
    if (cur) {
      cur.t += dt * PACE
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : cur.t // reduced motion: a gag holds its one still frame for its length
      animT = tt; hush = false; gagOn = true
      A.draw(tt, cur.a); gagOn = false
      if (cur.t >= A.dur) { played.push(cur.name); cur = null; if (!queue.length) idle(idleText) }
    } else if (queue.length && (wait -= dt) <= 0) {
      const n = queue.shift(); cur = { name: n.name, a: n.a, t: 0 }; idleT = 0; wait = 0
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : 0
      animT = tt; gagOn = true; A.draw(tt, cur.a); gagOn = false
    } else {
      drawLines()
      // idle: the board scrolls the batter's name, and now and then a gag plays
      if (marquee && !flash && o.idleAnims !== false && (idleT += dt) > 26 + Math.random() * 14) { idleT = 0; play(nextGag()) }
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
      vox(h, ORANGE.o, 0.26, 0.16, 0.55, 0, 0.2, 1.65); vox(h, ORANGE.o, 0.2, 0.1, 0.4, 0, 0.08, 1.58)
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
    text: () => lines.join(' / '), gulls: () => gulls.length, makeGull: () => voxGull(), // (31 Oct: the happenings borrow the park's own gull) scattered: () => gulls.filter((g) => g.out > 0).length,
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
    setClock, clockPanic, panicking: () => !!clk.spin?.panic, clock: () => { const m = ((clk.shown % 720) + 720) % 720; return { h: Math.floor(m / 60) || 12, m: Math.floor(m % 60), live: clk.live, hm: clk.hm ?? null, spinning: !!clk.spin } },
    sign, clockFace, signState: () => (sfx ? sfx.kind : gleam ? 'gleam' : 'idle'),
    set gullsOn(v) { for (const g of gulls) g.m.visible = v },
    // the gulls' faces (W1 to W3), and for the tests: the face each gull wears
    set gullFace(n) { if (n !== face) setFace(n) }, gullFaces: () => gulls.map((g) => g.m.userData.head?.children.length ?? 0), faceNow: () => face,
    board, names: () => Object.keys(ANIM), anim: () => cur?.name ?? null, queued: () => queue.map((q) => q.name), played: () => [...played],
    // for the tests: how many LEDs are lit right now, and the board's size in LEDs
    litCount: () => buf.reduce((s, k) => s + (k ? 1 : 0), 0), size: [GW, GH], ascii: () => Array.from({ length: GHT }, (_, j) => Array.from({ length: GW }, (_, i) => (ledAt(j, i) ? '#' : '.')).join('')),
    dur: (n) => ANIM[n]?.dur, pace: PACE,
    // draw one frame of an animation at time t right now (the next tick redraws); returns how many LEDs it lit, and the board as a picture when asked
    peek(n, tt, a = {}, pic = false) { buf.fill(0); tbuf.fill(0); animT = tt; hush = false; gagOn = true; ANIM[n].draw(tt, a); gagOn = false; paint(); return { lit: buf.reduce((s, k) => s + (k ? 1 : 0), 0), url: pic ? out.toDataURL() : null } },
    // the rivalry: the next gag from the bag (c25 plays it after a Giants home run against the Dodgers), the whole list, and for the tests a hash of the board
    nextGag, gags: () => [...GAGS], still: (n) => ANIM[n]?.still ?? null, sig: () => { let h = 0; for (let i = 0; i < buf.length; i++) h = (h * 31 + buf[i]) | 0; return h },
    // the wind on the pennants: { fromDeg, mph, cfDeg? } (null: the gentle wave), and what is set
    set wind(w) { setWind(w) }, windNow: () => (windNow ? { ...windNow } : null),
    set rate(k) { rate = Math.max(0.1, Math.min(8, k)) },
  }
}
