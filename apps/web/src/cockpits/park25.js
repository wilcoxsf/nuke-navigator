// Study 25 park life (Oracle only): the scoreboard behind center field is a live LED board, and pixel seagulls circle the outfield the way they gather late at Oracle,
// scattering when a ball leaves the park. The board shows two lines of text (the batter, TRACKING, the distance, HOME RUN flashing), and on top of that plays
// the Dodger gags (30 Oct, Andrew: "Every other board show let's kill I only want dodger gags on the board, that's literally it"): one after a Giants home run
// against the Dodgers, and one now and then while the board idles.
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
  const DODGER = ['.bb.', '.ww.', 'bwwb', '.ww.', '.ww.', '.dd.', 'd..d'] // the small one, thrown by the catapult
  const SPR = {
    crab: [['rr...........rr', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '.r.r.r...r.r.r.', 'r.r.r.....r.r.r'],
      ['.rr.........rr.', 'r.r.........r.r', '.rr..w...w..rr.', '...r.w...w.r...', '....rrrrrrr....', '..rrrrrrrrrrr..', '..rrrrrrrrrrr..', '..r.r.r.r.r.r..', '.r.r.r...r.r.r.']],
    seal: [['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'gggggggggggg..', 'gggggggggggg..', '.ggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg'],
      ['.....gggg.....', '...gggggggg...', '..gggwgggggg..', 'ggggggggggggg.', '......gggggg..', 'gggg..gggggg..', '......ggggggg.', '......gggggggg', '.....ggggggggg', '....gggggggggg']],
    gull: [['w.....w', '.w...w.', '..www..'], ['..www..', '.w...w.', 'w.....w']],
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
  // drawn one to one. The Giant in a black cap and his orange jersey with SF across it in bone; the Dodger in a blue cap and home whites with LA in blue. The bill
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
  const SFG = kit('d', 'o', 'w', 'SF', 1), SFGL = kit('d', 'o', 'w', 'SF', -1), LAD = kit('b', 'w', 'b', 'LA', -1), LADR = kit('b', 'w', 'b', 'LA', 1)
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
    L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], "'": ['#', '#', '.', '.', '.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '!': ['#', '#', '#', '.', '#'], '.': ['.', '.', '.', '.', '#'] }
  const mstep = (c) => (c === ' ' ? 3 : (MINI[c]?.[0].length ?? 3) + 1)
  const miniW = (s) => [...s].reduce((w, c) => w + mstep(c), -1)
  const mini = (s, x, y, ch) => { if (x === 'c') x = Math.round((GW - miniW(s)) / 2); for (const c of s) { const g = MINI[c]; if (g) blit(g.map((r) => r.replace(/#/g, ch)), x, y); x += mstep(c) } }
  // a bubble round mini text, its box from (x, y); a speech bubble's tail runs to (tx, ty), a thought bubble trails two dots there instead
  const bubble = (lines, x, y, tx, ty, thought = false) => {
    const w = Math.max(...lines.map(miniW)) + 4, h = lines.length * 6 + 3
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) off(x + i, y + j)
    line(x + 1, y, x + w - 2, y, 'g'); line(x + 1, y + h - 1, x + w - 2, y + h - 1, 'g'); line(x, y + 1, x, y + h - 2, 'g'); line(x + w - 1, y + 1, x + w - 1, y + h - 2, 'g')
    lines.forEach((s, k) => mini(s, x + 2, y + 2 + k * 6, 'w'))
    const bx = Math.min(Math.max(tx, x + 2), x + w - 3), by = y + h - 1
    if (thought) { put(tx, ty, 'w'); rect((tx + bx) / 2, (ty + by) / 2, 2, 2, 'w') } else line(bx, by, tx, ty, 'g')
  }
  const ANIM = {
    // ---- THE RIVALRY (29 Oct, later, Andrew: "a giants player fucking up a dodger player ... spy vs. spy shit. Gore, blood"; 29 Oct, night: "insanely comical 'oh no
    // jesus christ what the fuck that's deranged' gags. Surprise me"; 30 Oct: "I only want dodger gags on the board, that's literally it"): cartoon slapstick, a
    // generic Giant against a generic Dodger, no real players. One after a Giants home run against the Dodgers, and one now and then while the board idles.
    // Each has a still: the one frame shown under reduced motion. No sounds (30 Oct: "I don't want sound effects for these")
    // KA-BOOM: a stick of dynamite lobbed into his hands; the cap, two shoes, a hand and a lot of red, each on its own arc
    dynamite: { dur: 5.2, draw(t) {
      const gy = 20, lx = 50
      line(0, gy + 1, GW - 1, gy + 1, 'd')
      blit(SFG, 2, gy - 13)
      const k = Math.min(1, t / 1.2), sx = 13 + k * 38, sy = gy - 10 - Math.sin(k * Math.PI) * 8
      if (t < 2.4) { blit(LAD, lx - 2, gy - 13); rect(sx, sy, 4, 2, 'r'); if (Math.floor(t * 12) % 2) { put(sx + 4, sy - 1, 'y'); put(sx + 5, sy - 2, 'w') } if (t > 1.3) text('?', lx + 9, 4, 'w') }
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
    // BONK (30 Oct, Andrew: "bat needs to swing horizontally not vertically"): a level swing seen side on. The bat starts behind him, comes round end-on through
    // the zone and out flat at head height, and the Dodger's head goes for a ride, cap and all
    bonk: { dur: 5.4, still: 1.25, draw(t) {
      ground()
      const lx = 36, hx = 15, hy = 10, hit = 1.2, sw = Math.max(0, Math.min(1, (t - 0.9) / 0.3))
      blit(SFG, 5, 7)
      const end = (p) => [hx + Math.cos(p) * (Math.cos(p) >= 0 ? 22 : 11), hy - Math.sin(p) * 3] // long out front, short behind him (foreshortened), a little up on the far side
      const ph = t < 0.9 ? Math.PI * 0.85 + 0.1 * Math.sin(t * 7) : Math.PI * 0.85 * (1 - sw) - (t > hit ? Math.min(0.9, (t - hit) * 2) : 0) // the waggle, the swing, the follow-through
      if (sw > 0 && sw < 1) for (let k = 1; k <= 4; k++) { const [x, y] = end(ph + k * 0.3); put(x, y, 'g') } // the whoosh
      const [ex, ey] = end(ph)
      line(hx, hy, ex, ey, 'n'); line(hx, hy + 1, ex, ey + 1, 'n')
      if (t < hit) { blit(LAD, lx - 2, 7); return }
      const u = t - hit, hx2 = lx + 1 + u * 30, hy2 = 7 - 12 * u + 10 * u * u
      if (hx2 < GW) { rect(hx2, hy2, 5, 2, 'b'); rect(hx2, hy2 + 2, 5, 3, 'w'); put(hx2 + 1, hy2 + 3, 'd'); put(hx2 + 3, hy2 + 3, 'd') }
      for (let i = 1; i < 10; i++) { const v = u - i * 0.05; if (v > 0) put(lx + 3 + v * 30, 11 - 12 * v + 10 * v * v, 'r') }
      if (u < 0.85) { blit(headless(LAD), lx - 2, 7); for (let i = 0; i < 4; i++) put(lx + 3 + (i - 1.5) * Math.sin(u * 20 + i), 11 - ((u * 9 + i * 2) % 6), 'r') } // the fountain
      else { rect(lx - 4, 19, 9, 2, 'w'); rect(lx + 5, 19, 5, 2, 'g'); rect(lx + 10, 19, 2, 2, 'd'); for (let i = 0; i < Math.min(14, (u - 0.85) * 12); i++) put(lx - 5 - i, 20, 'r') }
      if (u > 0.6) text('BONK', 'c', 0, 'o')
    } },
    // DING (30 Oct, Andrew: "The cable car not clearly a cable car"): a Powell Street car side on: the roof and its overhang, the bell, the open ends with brass poles
    // and riders hanging off them, the closed middle with its windows and cream band, the gripman up front with his lever, the running board, the grip down into
    // the slot. It does not stop for anyone, least of all him
    runover: { dur: 6.2, still: 1.6, draw(t) {
      line(0, 20, GW - 1, 20, 'g'); line(0, 21, GW - 1, 21, 'd'); for (let x = 1; x < GW; x += 4) put(x, 21, 'g') // the rails, the slot
      const W = 38, x = Math.round(-W - 2 + t * 24), hit = 46, past = x + W >= hit
      if (!past) { blit(LAD, hit - 1, 6); if (x + W > hit - 16 && Math.floor(t * 3) % 2) text('?!', hit + 9, 0, 'w') }
      else for (let i = 0; i < 20; i++) put(hit - 6 + ((i * 7) % 24), 19 + (i % 2), 'r') // what is left of him on the rails
      const rider = (px, up) => { rect(px, 8, 2, 1, 'd'); rect(px, 9, 2, 1, 'w'); rect(px, 10, 2, 3, 'o'); rect(px, 13, 2, 3, 'g'); if (up) { put(px - 1, 8, 'w'); put(px + 2, 8, 'w') } }
      if (x < GW + 4) {
        rect(x - 1, 6, W + 2, 1, 'w'); rect(x, 7, W, 1, 'r'); rect(x + 18, 5, 2, 1, 'y') // the roof, its overhang, the bell
        for (const px of [0, 4, 9, 28, 33, W - 1]) line(x + px, 8, x + px, 15, 'y') // the brass poles at the open ends
        rect(x + 10, 8, 18, 8, 'r'); for (let i = 0; i < 4; i++) rect(x + 11 + i * 4, 9, 3, 3, 'y'); rect(x + 10, 12, 18, 1, 'w') // the closed middle: its windows, the cream band
        rect(x, 13, 10, 1, 'n'); rect(x + 28, 13, 10, 1, 'n') // the benches
        rect(x - 1, 16, W + 2, 1, 'n'); rect(x, 17, W, 1, 'd'); rect(x + 4, 18, 3, 2, 'd'); rect(x + W - 7, 18, 3, 2, 'd'); line(x + 19, 17, x + 19, 21, 'g') // the running board, the trucks, the grip
        const cheer = past && Math.floor(t * 6) % 2
        rider(x + 2, cheer); rider(x + 6, !cheer && past); rider(x + 35, cheer)
        rider(x + 30, false); line(x + 32, 15, x + 34, 9, 'g') // the gripman and his lever
        put(x - 4, 9, 'w'); put(x - 4, 8, 'd'); line(x - 3, 10, x - 1, 14, 'o'); line(x - 3, 10, x, 9, 'w'); line(x - 1, 14, x - 2, 16, 'g') // a rider hanging right off the back pole
      }
      const ding = Math.floor(t * 4) % 2
      text(t < 2.1 ? (ding ? 'DING' : '') : t < 4.6 ? 'DING!' : 'NO STOPPING', 'c', 0, 'y')
    } },
    // GULP: a Dodger treading water in the Cove, a Giant waving from the wall, and a sea lion comes up under him
    sealsnack: { dur: 5.2, draw(t) {
      water(t, 16)
      const lx = 40
      if (t < 2.2) { blit(LAD.slice(0, 10), lx - 2, 7); if (Math.floor(t * 4) % 2) { rect(lx - 2, 9, 2, 2, 'w'); rect(lx + 8, 9, 2, 2, 'w') } text('HELP', 2, 0, 'b') } // a Dodger treading water in the Cove
      const rise = t < 2 ? 0 : t < 2.6 ? (t - 2) / 0.6 : t < 3.4 ? 1 : Math.max(0, 1 - (t - 3.4) / 0.6)
      if (rise > 0) blit(SPR.seal[t > 2.3 && t < 3.0 ? 1 : 0], lx - 3, 20 - rise * 11)
      if (t > 2.6) for (let i = 0; i < 26; i++) put(lx - 8 + ((i * 11) % 26), 16 + (i % 4) + Math.sin(t * 3 + i) * 0.6, 'r') // the water goes red
      if (t > 3.2) text('GULP', 'c', 0, 'w')
      if (t > 1.0) blit(SFG.slice(0, 10), 2, 6) // a Giant on the wall, waving
    } },
    // LEAVES IN THE 3RD: in his seat it comes to him in a thought bubble (30 Oct, Andrew: "let's have a thought bubble for 'gotta beat the traffic'"); he bolts, the traffic
    // wins, and by the end he is a skeleton in a cobwebbed car
    leaves3rd: { dur: 9.0, still: 7.6, draw(t) {
      ground()
      if (t < 2.4) { blit(LADR, 3, 7); if (t > 0.3) bubble(['GOTTA BEAT', 'THE TRAFFIC'], 22, 0, 14, 8, true); return }
      if (t < 4.4) {
        const u = t - 2.4
        text('BOT 3RD', 'c', 0, 'w')
        rect(58, 9, 2, 12, 'g'); rect(68, 9, 2, 12, 'g'); line(58, 9, 69, 9, 'g'); for (let x = 61; x < 68; x += 2) line(x, 10, x, 20, 'd') // the gate
        const x = 3 + ease(u / 1.9) * 43, f = Math.floor(t * 10) % 2
        blit(run(LADR, f), x, 7)
        for (let i = 1; i < 4; i++) put(x - i * 2, 18 + (i % 2), 'g') // his dust
        return
      }
      const T = t - 2.2, C = ['r', 'y', 'b', 'w', 'g', 'o']
      C.forEach((c, i) => {
        const x0 = -6 + i * 13
        rect(x0, 15, 12, 4, c); rect(x0 + 3, 11, 6, 4, c); rect(x0 + 4, 12, 4, 2, 'd'); rect(x0 + 1, 19, 2, 2, 'd'); rect(x0 + 9, 19, 2, 2, 'd')
        if (Math.floor(T * 3 + i) % 2) put(x0, 16, 'r') // brake lights
        if (c !== 'b') return
        if (T < 5.0) { put(x0 + 5, 12, 'b'); put(x0 + 5, 13, 'w') } // him at the wheel
        else { put(x0 + 5, 12, 'w'); put(x0 + 6, 12, 'w'); put(x0 + 5, 13, 'w'); put(x0 + 4, 12, 'g'); put(x0 + 7, 13, 'g'); put(x0 + 7, 12, 'g') } // a skull and cobwebs
      })
      text(T < 3.0 ? '5TH' : T < 3.8 ? '7TH' : T < 4.6 ? '9TH' : T < 5.0 ? 'FINAL' : 'STILL HERE', 'c', 0, T < 5.0 ? 'w' : Math.floor(T * 3) % 2 ? 'b' : 'w')
    } },
    // BIPPED: he parks on King Street and walks to the game; a brick, the window; and while he is gone a man pulling a shopping cart climbs in through the hole and
    // makes himself at home in the driver's seat (30 Oct, Andrew: "For bipped let's have a homeless person get in the car")
    bipped: { dur: 8.8, still: 7.4, draw(t) {
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
        const k = ease((t - 3.4) / 1.0), mx = -18 + k * 26, climb = Math.max(0, Math.min(1, (t - 4.4) / 0.6))
        cart(Math.min(mx - 12, -4))
        if (!inside) blit(MAN, mx + climb * 12, 7 - climb * 7)
        else { rect(cx + 13, 11, 3, 1, 'n'); rect(cx + 13, 12, 3, 1, 'w'); put(cx + 15, 12, 'g') } // in the driver's seat: his beanie, his face, his beard
      }
      if (t > 5.8) { const k = ease((t - 5.8) / 0.8); blit(LAD, 74 - k * 28, 7); if (t > 6.6 && t < 7.2) text('?!', 56, 0, 'w') }
      if (t > 7.2 && Math.floor(t * 8) % 2) { put(cx + 27, 14, 'y'); put(cx + 28, 13, 'y'); put(cx + 28, 15, 'y') } // he honks at him
      text(t < 1.0 ? 'KING ST' : t < 3.0 ? '' : t < 5.8 ? (Math.floor(t * 5) % 2 ? 'BIPPED' : '') : t < 7.2 ? '' : 'MOVED IN', 'c', 0, t < 5.8 ? 'r' : 'w')
    } },
    // CATAPULT: a trebuchet slings him over the right-field wall into the Cove, where three sea lions in bibs are waiting
    catapult: { dur: 6.4, still: 2.2, draw(t) {
      line(0, GH - 1, 43, GH - 1, 'd')
      rect(44, 8, 3, 14, 'g'); line(44, 8, 46, 8, 'o') // the wall
      for (let x = 47; x < GW; x++) { put(x, 17 + (Math.sin(x * 0.6 + t * 4) > 0.5 ? 0 : 1), 'b'); line(x, 19, x, GH - 1, 'b') }
      line(4, 20, 10, 11, 'n'); line(16, 20, 10, 11, 'n'); line(4, 20, 16, 20, 'n') // the frame
      const a = t < 1.0 ? Math.PI + 0.5 : Math.max(0.9, Math.PI + 0.5 - (t - 1.0) * 7), L = 10, ex = 10 + Math.cos(a) * L, ey = 11 - Math.sin(a) * L
      line(10, 11, ex, ey, 'n'); rect(10 - Math.cos(a) * 4 - 1, 11 + Math.sin(a) * 4 - 1, 3, 3, 'g') // the arm and its counterweight
      blit(SFG, 18, 7)
      const rel = 1.33
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
    // WOOD CHIPPER (30 Oct, Andrew: "I want them fed in from the top head first kicking their legs"): the Giant holds him up by the ankles over the hopper, lets go, and
    // he goes in head first, his legs kicking until the last of them is gone; blue, white and red out of the chute and over the whole board, then his shoes
    chipper: { dur: 7.0, still: 2.2, draw(t) {
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
      if (t > 4.8) text('MULCHED', 'c', 0, Math.floor(t * 5) % 2 ? 'r' : 'w')
    } },
    // ALCATRAZ (30 Oct, Andrew: "tough to read right now, let's see if we can do better"): three plain shots instead of one busy one. The cell, close: the bars
    // slam shut on him and the Giant holds up the key. The Rock, wide: the key goes into the bay and a sea lion swallows it. The cell again: DAY 1, DAY 365, DAY 9999,
    // the tally on the wall and his beard down to the floor
    alcatraz: { dur: 9.6, still: 2.0, draw(t) {
      const KEY = ['.yyy.......', 'yy.yyyyyyyy', '.yyy...y.y.']
      const bars = (off) => { for (let k = 0; k < 7; k++) { const bx = 34 + k * 4 + off; if (bx < GW) line(bx, 6, bx, 20, 'g') } line(34 + off, 6, 58 + off, 6, 'g'); line(34 + off, 20, 58 + off, 20, 'g') }
      if (t < 3.0) {
        ground(); blit(LAD, 41, 7)
        const shut = Math.min(1, t / 0.9), rattle = t > 0.9 && t < 1.2 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0
        bars(Math.round((1 - shut) * 30) + rattle)
        blit(SFG, 6, 7)
        if (t > 1.4) blit(KEY, 17, 9 + Math.round(Math.sin(t * 6)))
        text(t < 0.9 ? 'ALCATRAZ' : t < 1.6 ? 'CLANG' : 'LIFE', 'c', 0, t < 0.9 ? 'w' : t < 1.6 ? 'y' : 'o')
        return
      }
      if (t < 6.0) {
        const u = t - 3.0
        for (let x = 0; x < GW; x++) { put(x, 17 + (Math.sin(x * 0.5 + t * 4) > 0.6 ? 0 : 1), 'b'); line(x, 18, x, GH - 1, (x + Math.floor(t * 4)) % 9 ? 'b' : 'w') }
        for (let x = 2; x < 38; x++) { const top = 15 - Math.round(1.5 * Math.sin((x - 2) * 0.12)); line(x, top, x, 17, x % 3 ? 'g' : 'd') } // the Rock
        rect(6, 10, 20, 5, 'w'); for (let i = 0; i < 6; i++) put(8 + i * 3, 12, 'd') // the cell house
        line(30, 8, 30, 14, 'w'); line(31, 8, 31, 14, 'w'); rect(30, 7, 2, 1, Math.floor(t * 2) % 2 ? 'y' : 'd') // the lighthouse
        if (u > 0.4 && u < 1.4) { const k = (u - 0.4) / 1.0; rect(22 + k * 34, 9 + k * 9 - 16 * k * (1 - k), 4, 1, 'y'); put(22 + k * 34, 8 + k * 9 - 16 * k * (1 - k), 'y') } // the key
        if (u > 1.4 && u < 1.9) for (let i = 0; i < 6; i++) { const v = u - 1.4; put(56 + (i - 3) * v * 8, 17 - v * 12 + v * v * 30, 'w') }
        if (u > 1.6) { const rise = Math.min(1, (u - 1.6) / 0.4) - Math.max(0, (u - 2.6) / 0.4); if (rise > 0) blit(SPR.seal[u > 1.9 && u < 2.3 ? 1 : 0], 50, 22 - rise * 10) }
        text(u < 1.4 ? 'THE KEY' : u < 2.0 ? 'PLOP' : 'GULP', 'c', 0, 'w')
        return
      }
      const u = t - 6.0, day = u < 0.9 ? 1 : u < 1.8 ? 365 : 9999
      ground(); blit(LAD, 41, 7)
      const beard = day === 1 ? 0 : day === 365 ? 4 : 9; if (beard) rect(45, 12, 3, beard, 'g')
      const marks = day === 1 ? 1 : day === 365 ? 12 : 40; for (let m = 0; m < marks; m++) line(4 + (m % 10) * 3, 8 + Math.floor(m / 10) * 3, 4 + (m % 10) * 3, 9 + Math.floor(m / 10) * 3, 'w') // the tally on the wall
      bars(0)
      text(u < 2.8 ? `DAY ${day}` : 'NO PAROLE', 'c', 0, u < 2.8 ? 'w' : 'o')
    } },
    // T-SHIRT CANNON: Lou Seal (30 Oct, Andrew: "let's get lou seal firing it") puts one point blank into his head. The head is gone, the body stands a moment, topples,
    // and the free shirt flutters down onto him
    tshirt: { dur: 7.0, still: 2.3, draw(t) {
      ground()
      const lx = 33, fire = 2.0, rec = t > fire && t < fire + 0.3 ? -2 : 0
      blit(LOU, 1 + rec, 7)
      const cannon = () => { for (let d = 0; d < 3; d++) line(9 + rec, 15 + d, 27 + rec, 9 + d, 'g'); rect(9 + rec, 17, 3, 3, 'd'); rect(26 + rec, 8, 2, 5, 'g') } // up from under his flipper, the muzzle at the head
      if (t < fire) { blit(LAD, lx - 2, 7); cannon(); text(t < 0.9 ? 'LOU SEAL' : 'FREE SHIRT', 'c', 0, 'o'); return }
      const u = t - fire
      if (u < 1.4) for (let i = 0; i < 28; i++) { const a = -Math.PI * hash(i) * 1.1, v = 10 + hash(i + 3) * 22, x = lx + 4 + Math.cos(a) * v * u + 6 * u, y = 9 + Math.sin(a) * v * u + 18 * u * u; put(x, Math.min(GH - 1, y), 'rrrbww'[i % 6]) } // what was his head
      if (u > 0.5) for (let i = 0; i < 14; i++) put(lx + 4 + hash(i + 20) * 30, GH - 1, 'r')
      if (u < 1.4) { blit(headless(LAD), lx - 2, 7); for (let i = 0; i < 6; i++) { const s = (u * 2.5 + i / 6) % 1; put(lx + 3 + (i - 2.5) * s * 2, 11 - s * 9 + s * s * 10, 'r'); put(lx + 4 + (i - 2.5) * s * 2, 11 - s * 8 + s * s * 9, 'r') } }
      else if (u < 1.8) { const k = (u - 1.4) / 0.4; for (const dd of [0, 1, 2]) line(lx + 2 + dd, 20, lx + 2 + dd + k * 10, 12 + k * 7, 'w'); line(lx + 2, 20, lx + 5, 20, 'd') }
      else { rect(lx + 1, 18, 11, 2, 'w'); rect(lx + 4, 18, 3, 2, 'b'); rect(lx + 12, 18, 5, 2, 'g'); put(lx, 18, 'r'); const p = Math.min(10, (u - 1.8) * 6); rect(lx - 5 - p, 20, 6 + p, 1, 'r') } // down, and the pool
      const su = u - 0.1, sx = lx + 3 + Math.sin(su * 6) * 5 * Math.max(0, 1 - su / 3.4), sy = su < 0.5 ? 6 - su * 12 : Math.min(15, ((su - 0.5) / 2.7) * 15)
      blit(SHIRT, sx, sy)
      cannon()
      if (u < 0.5) text('BOOM', 'c', 0, 'y'); else if (u > 3.1) text(Math.floor(t * 2) % 2 ? 'R.I.P.' : 'FREE SHIRT', 'c', 0, 'w')
    } },
    // STEAMROLLER (30 Oct, Andrew: "has to be a bigger machine"): the full height of the board, a drum taller than he is, the Giant up under the canopy; flat as a
    // pennant, then run up a pole as one
    steamroller: { dur: 8.0, still: 1.3, draw(t) {
      ground()
      const lx = 40, x = Math.round(-48 + (t / 4.0) * 124), flat = x + 42 >= lx + 2
      if (!flat) blit(LAD, lx - 2, 7)
      else if (t < 4.4) { rect(lx - 3, 20, 16, 1, 'w'); put(lx - 3, 20, 'b'); put(lx - 2, 20, 'b'); rect(lx + 9, 20, 4, 1, 'd'); put(lx + 1, 20, 'd'); for (let i = 0; i < 6; i++) put(lx - 5 + i * 4, GH - 1, 'r') }
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
      const eaten = Math.max(0, Math.min(1, (t - 2.2) / 2.4))
      if (t < 5.6) {
        blit(LAD, lx - 2, top)
        const rows = Math.round(eaten * 14)
        for (let j = 0; j < rows; j++) { for (let i = -2; i < 9; i++) off(lx + i, top + j); blit([SKEL[j]], lx, top + j) }
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
    // EARTHQUAKE (30 Oct, Andrew: "I want a house falling on the dodger player, no giant player. Gruesome crushed by house"): the board shakes, and a painted lady comes
    // down out of the sky on him, Wizard of Oz style; his shoes stick out from under it and twitch, he squirts out both sides, and an eye rolls away
    quake: { dur: 7.6, still: 3.6, draw(t) {
      const sh = t > 0.9 && t < 3.0 ? (Math.floor(t * 24) % 2 ? 1 : -1) : 0, lx = 56, land = 2.6, down = t >= land, X = 47
      for (let x = 0; x < GW; x++) put(x + sh, GH - 1, 'd')
      if (t > 1.0 && t < 3.0) for (let x = 2; x < 44; x += 7) { put(x + sh, 20, 'n'); put(x + 1 + sh, 19, 'n') } // the cracks
      if (!down) {
        blit(LAD, lx - 2 + sh, 7)
        if (t > 1.7) { const w = Math.round(4 + ((t - 1.7) / 0.9) * 20); rect(X + 12 - w / 2, 21, w, 1, 'g'); if (Math.floor(t * 8) % 2) { put(lx - 3, 13, 'w'); put(lx + 9, 13, 'w') } } // the shadow, his arms up
      } else {
        const u = t - land, tw = Math.floor(t * 9) % 2
        rect(X - 7, 20, 7, 1, 'g'); rect(X - 9, 19 + tw, 2, 2 - tw, 'd'); rect(X - 9, 20, 2, 1, 'd') // his legs out from under it, a shoe twitching
        put(X + 24, 20, 'w') // a hand, the other side
        if (u < 1.2) for (let i = 0; i < 10; i++) { const s = (u * 1.8 + i / 10) % 1; put(X - 1 - s * 14, 20 - s * 9 + s * s * 12, 'r'); put(X + 24 + s * 10, 19 - s * 8 + s * s * 11, 'r') } // he squirts out both sides
        const pool = Math.min(30, u * 16); rect(X - 9 - pool, 21, pool, 1, 'r')
        const ex = X - 10 - Math.min(1, u / 1.6) * 22, bounce = u < 1.6 ? Math.abs(Math.sin(u * 7)) * 3 * (1 - u / 1.6) : 0 // the eye
        rect(ex, 19 - bounce, 2, 2, 'w'); put(ex + (u < 1.6 ? Math.floor(u * 8) % 2 : 1), 19 - bounce + (u < 1.6 ? 0 : 1), 'b')
        if (u < 0.5) for (let i = 0; i < 12; i++) put(X - 4 + i * 3 + (i % 2), 20 - u * 10 * ((i % 3) + 1), 'g') // dust
      }
      // the painted lady: a peaked roof, a round gable window, gingerbread, a bay window, the door with a window over it
      const hy = down ? 2 : Math.round(-21 + Math.max(0, (t - 1.7) / 0.9) ** 2 * 23)
      if (t > 1.7) {
        for (let j = 0; j < 7; j++) { const a = X + 11 - 2 * j, b = X + 12 + 2 * j; line(a, hy + j, b, hy + j, 'd'); put(a, hy + j, 'w'); put(b, hy + j, 'w') }
        rect(X + 11, hy + 3, 2, 2, 'w')
        rect(X + 1, hy + 7, 22, 12, 'y'); rect(X + 1, hy + 7, 22, 1, 'w'); line(X + 1, hy + 8, X + 1, hy + 18, 'w'); line(X + 22, hy + 8, X + 22, hy + 18, 'w')
        for (let i = 0; i < 10; i++) put(X + 2 + i * 2, hy + 8, 'r')
        rect(X + 3, hy + 9, 6, 8, 'w'); rect(X + 4, hy + 10, 4, 2, 'b'); rect(X + 4, hy + 13, 4, 2, 'b') // the bay window
        rect(X + 15, hy + 9, 4, 2, 'b'); rect(X + 15, hy + 12, 4, 7, 'r'); put(X + 18, hy + 15, 'y') // the door
      }
      if (t < 0.9) text('NICE NIGHT', 'c', 0, 'w')
      else if (t < land) text('QUAKE!', 2, 0, 'w')
      else if (t < 4.2) text('CRUNCH', 2, 0, 'r')
      else mini('FIXER UPPER', 2, 1, 'y')
    } },
    // BALLOON (mine): the Giant puts the helium hose in his mouth and keeps it there
    balloon: { dur: 6.0, still: 2.7, draw(t) {
      ground()
      blit(SFG, 0, 7)
      rect(13, 14, 4, 7, 'g'); rect(13, 13, 4, 1, 'w') // the tank
      const pop = 3.0, k = Math.min(1, t / pop), r = 3 + k * k * 9, cx = 42, cy = 13 - k * 3
      if (t < pop) {
        line(15, 13, cx - r, cy + 1, 'd')
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
    // BATTING PRACTICE (mine): the pitching machine (30 Oct, Andrew: "needs to go sideways"), side on, its two wheels one over the other and the ball out between them
    // straight at him, the bucket feeding it from the top; thirty-odd balls, every one a hole in him, until there is more hole than Dodger
    bp: { dur: 6.8, still: 3.4, draw(t) {
      ground()
      const sp = Math.floor(t * 20) % 2
      line(11, 16, 7, 20, 'g'); line(11, 16, 15, 20, 'g') // the stand
      line(6, 5, 16, 5, 'g'); line(6, 16, 16, 16, 'g'); line(6, 5, 6, 16, 'g'); line(16, 5, 16, 16, 'g') // the frame
      for (const wy of [8, 13]) { disc(11, wy, 2, 'd'); put(11 + (sp ? 1 : -1), wy, 'w'); put(11, wy + (sp ? -1 : 1), 'w') } // the wheels, spinning
      rect(17, 10, 4, 2, 'g') // the mouth
      rect(1, 0, 6, 3, 'n'); put(2, 0, 'w'); put(4, 0, 'w'); line(5, 3, 9, 5, 'g') // the bucket and its feed
      const lx = 48, t0 = 0.6, gap = 0.09, NH = 34, hits = Math.max(0, Math.min(NH, Math.floor((t - t0 - 0.2) / gap) + 1))
      for (let n = 0; n < NH; n++) { const u = (t - t0 - n * gap) / 0.2; if (u >= 0 && u < 1) put(21 + u * (lx - 23 + (n % 9)), 10.5 + (((n * 5) % 10) - 2) * u, 'w') }
      if (t < 4.6) {
        const jerk = hits && hits < NH && Math.floor(t / gap) % 2 ? 1 : 0
        blit(LAD, lx - 2 + jerk, 7)
        for (let n = 0; n < hits; n++) { const hx = lx - 2 + jerk + 1 + Math.floor(hash(n + 40) * 9), hy = 7 + Math.floor(hash(n + 80) * 14); off(hx, hy); if (n % 3 === 0) put(hx, hy + 1, 'r') }
      } else { for (let i = 0; i < 18; i++) if (hash(i + 7) > 0.35) put(lx - 3 + i, 20, i < 3 ? 'b' : i > 12 ? 'd' : 'w'); for (let i = 0; i < 8; i++) put(lx - 4 + i * 3, GH - 1, 'r') }
      for (let n = 0; n < hits; n++) put(lx + 10 + (n % 12), 20 - Math.floor(n / 12), 'w') // the balls, piling up behind him
      text(t < 0.6 ? 'B.P.' : t < 4.6 ? `${hits} HITS` : 'SWISS CHEESE', 'c', 0, t < 4.6 ? 'w' : 'y')
    } },
    // DRIVERLESS (mine): a car with nobody in it hits him, stops, thinks about it, and backs over him, and again, and again
    driverless: { dur: 6.8, still: 2.6, draw(t) {
      ground()
      const K = [[0, -30], [0.9, 24], [1.4, 24], [2.0, 6], [2.5, 34], [3.0, 8], [3.5, 36], [4.4, 36], [5.6, 90]]
      let x = K[K.length - 1][1]; for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t < K[i + 1][0]) { const k = (t - K[i][0]) / (K[i + 1][0] - K[i][0]); x = K[i][1] + (K[i + 1][1] - K[i][1]) * k; break }
      x = Math.round(x)
      const lx = 40, hit = t > 0.75, passes = [0.75, 2.0, 2.5, 3.0, 3.5].filter((p) => t >= p).length
      if (!hit) blit(LAD, lx - 2, 7)
      else { rect(lx - 4, 20, 16, 1, 'w'); put(lx - 4, 20, 'b'); rect(lx + 8, 20, 4, 1, 'd'); for (let i = 0; i < passes * 5; i++) put(lx - 8 + hash(i + 11) * 26, i % 2 ? 20 : GH - 1, 'r') }
      rect(x, 14, 24, 5, 'w'); rect(x + 4, 10, 15, 4, 'w'); rect(x + 5, 11, 13, 2, 'd'); rect(x + 3, 19, 4, 2, 'd'); rect(x + 17, 19, 4, 2, 'd'); put(x + 23, 15, 'y'); put(x, 15, 'r') // nobody at the wheel
      rect(x + 10, 8, 3, 2, 'g'); put(x + 10 + (Math.floor(t * 12) % 3), 8, 'y') // the spinning sensor
      text(t < 0.75 ? 'NO DRIVER' : t < 4.4 ? 'RECALCULATING' : 'ARRIVED', 'c', 0, t < 4.4 ? 'w' : 'y')
    } },
    // CRAB SNIP (mine): the Crazy Crab cuts him in half at the belt; the top half crawls, the legs run in circles
    crabsnip: { dur: 6.2, still: 2.3, draw(t) {
      ground()
      const lx = 40, snip = 1.8, cx = t < 3.8 ? -16 + Math.min(1, t / 1.6) * 42 : 26 - (t - 3.8) * 24
      blit(SPR.crab[Math.floor(t * 8) % 2], cx, 12)
      if (t < snip) blit(LAD, lx - 2, 7)
      else {
        const u = t - snip, run = Math.floor(t * 10) % 2, lxx = lx + Math.sin(u * 3) * 14
        big([run ? '.dd.' : 'd..d', run ? 'd..d' : '.dd.'], lxx, 17); for (let i = 0; i < 4; i++) { const s = (u * 3 + i / 4) % 1; put(lxx + 3 + (i - 1.5) * s * 2, 16 - s * 6 + s * s * 7, 'r') } // the legs, running, a fountain on top
        const ty = Math.min(10, 7 + u * u * 12), tx = lx - 2 - Math.min(1, u) * 6 - Math.max(0, u - 1) * 3; blit(LAD.slice(0, 11), tx, ty); rect(tx + 1, ty + 11, 9, 1, 'r') // the top half, dragging itself away
      }
      text(t < snip ? 'CRAZY CRAB' : t < 4.0 ? 'SNIP SNIP' : 'HALF OFF', 'c', 0, t < snip ? 'r' : 'w')
    } },
    // DODGER DOG (mine): he is the hot dog; mustard, ketchup, three bites, head first, and a burp with his cap in it
    hotdog: { dur: 6.6, still: 3.0, draw(t) {
      ground()
      const bites = [2.4, 3.2, 4.0].filter((b) => t >= b).length, gulp = t >= 4.8, bx = 14 - bites * 12
      if (!gulp) {
        rect(bx + 2, 15, 34, 3, 'n'); rect(bx + 3, 10, 32, 2, 'n') // the bun
        rect(bx - 2, 12, 2, 3, 'b'); rect(bx, 12, 4, 3, 'w'); put(bx + 1, 13, 'd'); rect(bx + 4, 12, 22, 3, 'w'); rect(bx + 10, 12, 3, 3, 'b'); rect(bx + 26, 12, 10, 3, 'd') // him
        if (t > 0.6) { const n = Math.min(30, (t - 0.6) * 40); for (let i = 0; i < n; i++) put(bx + 4 + i, 11 + (Math.floor(i / 2) % 2), 'y') }
        if (t > 1.1) { const n = Math.min(30, (t - 1.1) * 40); for (let i = 0; i < n; i++) put(bx + 5 + i, 12 - (Math.floor(i / 2) % 2), 'r') }
        if (bites < 3) for (let x = 0; x < 10; x++) for (let y = 9; y < 19; y++) off(x, y) // what is in his mouth is gone
        if (t > 2.0) for (let i = 0; i < bites * 6; i++) put(10 + hash(i) * 6, 16 + hash(i + 4) * 4, 'r')
      }
      blit(SFG, 0, 7)
      const chewing = [2.4, 3.2, 4.0].some((b) => t >= b && t < b + 0.3); if (chewing) rect(4, 11, 3, 1, 'r')
      if (gulp) { const u = t - 4.8; rect(8 + u * 26, 8 - u * 14 + u * u * 18, 4, 1, 'b'); if (u < 0.6) for (let i = 0; i < 6; i++) put(9 + i * 2, 8 - i % 2, 'y') }
      text(t < 0.6 ? 'DODGER DOG' : t < 2.4 ? 'RELISH?' : t < 4.8 ? 'CHOMP' : t < 5.6 ? 'BURP' : 'DELISH', 'c', 0, t < 2.4 ? 'w' : 'o')
    } },
    // WATERBOARD: strapped to a plank head down, an orange rally towel over his face; the Giant wants two words out of him and pours the Gatorade cooler until he says
    // them, and a crab from the Cove comes out with the water
    waterboard: { dur: 9.4, still: 4.0, draw(t) {
      ground()
      const P = (i) => [17 + i, Math.round(17 - i * 0.22)], pour = t > 2.8 && t < 5.6, kick = pour && Math.floor(t * 10) % 2 // along the plank, head end low at the left
      for (let i = -2; i <= 32; i++) { const [x, y] = P(i); put(x, y + 3, 'n') }
      line(P(3)[0], P(3)[1] + 4, P(3)[0], 20, 'n'); line(P(28)[0], P(28)[1] + 4, P(28)[0], 20, 'n')
      for (let i = 0; i < 30; i++) {
        const [x, y] = P(i), c = i < 2 ? 'b' : i < 6 ? 'o' : i < 17 ? 'w' : i < 26 ? 'g' : 'd', th = i < 17 ? 2 : 1
        for (let d = -th; d <= th; d++) put(x, y + d - (i >= 26 && kick ? 2 : 0), c)
      }
      mini('LA', 25, P(9)[1] - 2, 'b'); for (const i of [7, 21]) line(P(i)[0], P(i)[1] - 2, P(i)[0], P(i)[1] + 2, 'd') // the straps
      blit(SFG, 1, 7)
      const tip = pour ? 1 : 0
      rect(11, 5 + tip, 7, 5, 'o'); rect(11, 4 + tip, 7, 1, 'w'); line(10, 12, 12, 9, 'o') // the cooler, tipped when he pours
      if (pour) { line(17, 10, 18, 15, 'b'); line(18, 10, 19, 15, 'b'); for (let i = 0; i < 8; i++) { const s = (t * 2 + i / 8) % 1; put(15 + (i - 4) * s * 2, 15 - s * 6 + s * s * 10, 'b') } for (let i = 0; i < 3; i++) put(21 + i * 2, 12 - ((t * 6 + i) % 5), 'w') } // the water, the splashes, bubbles
      if (t > 1.6 && t < 2.8) bubble(['NEVER'], 34, 0, 24, 12)
      if (t > 6.6 && t < 8.2) bubble(['GO GIANTS'], 30, 0, 24, 12)
      if (t > 7.6) { const k = Math.min(1, (t - 7.6) / 1.4); blit(['r...r', '.rrr.', 'r.r.r'], 18 + k * 30, P(Math.min(29, k * 30))[1] - 4) } // the crab, off down the plank
      text(t < 1.6 ? 'SAY IT' : pour ? (Math.floor(t * 4) % 2 ? 'GLUG' : '') : t > 5.6 && t < 6.6 ? 'SAY IT' : t >= 8.2 ? 'COVE WATER' : '', 'c', 0, 'w')
    } },
    // IRON MAIDEN: the Giant shoves him in and slams the door; it oozes; it opens and he walks out fine, more or less, and the Giant hands him a beer
    ironmaiden: { dur: 8.8, still: 2.6, draw(t) {
      ground()
      const mx = 44, shut = t < 1.8 ? 0 : Math.min(1, (t - 1.8) / 0.3) - (t > 4.0 ? Math.min(1, (t - 4.0) / 0.4) : 0), sh = t > 2.1 && t < 2.4 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0
      const holes = [...Array(14)].map((_, n) => [1 + Math.floor(hash(n + 40) * 9), 4 + Math.floor(hash(n + 80) * 10)])
      // the maiden: an iron coffin with a face, spikes inside; the door hinged on its right
      rect(mx + sh, 4, 14, 17, 'g'); rect(mx + 2 + sh, 8, 10, 12, 'd'); for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) put(mx + 2 + i * 2 + (j % 2) + sh, 9 + j * 3, 'w')
      put(mx + 4 + sh, 5, 'd'); put(mx + 9 + sh, 5, 'd'); line(mx + 5 + sh, 6, mx + 8 + sh, 6, 'd')
      const gx = t < 1.0 ? 4 : t < 1.8 ? 4 + (t - 1.0) * 10 : t < 4.8 ? 12 : 4 // the Giant, shoving, then back
      const dx = t < 1.0 ? 22 : t < 1.8 ? 22 + ((t - 1.0) / 0.8) * 23 : t < 4.8 ? 45 : t < 5.6 ? 45 - ((t - 4.8) / 0.8) * 23 : 22 // him
      if (shut < 1 || t < 1.8) { const me = LAD.slice(); if (t > 4.0) for (const [hx, hy] of holes) me[hy] = me[hy].slice(0, hx) + '.' + me[hy].slice(hx + 1); blit(me, dx + sh, 7) }
      const dw = Math.round(9 * (1 - shut)) // the door, swung open to the right, closing
      if (shut >= 1) { rect(mx + 2 + sh, 8, 10, 12, 'g'); line(mx + 7 + sh, 8, mx + 7 + sh, 19, 'd'); for (const y of [9, 14, 19]) { put(mx + 3 + sh, y, 'd'); put(mx + 10 + sh, y, 'd') } }
      else { rect(mx + 14 + sh, 4, dw, 17, 'g'); for (let j = 0; j < 5; j++) if (dw > 2) put(mx + 14 + sh, 6 + j * 3, 'w') }
      blit(SFG, gx, 7)
      if (t > 2.2 && t < 4.4) { const p = Math.min(12, (t - 2.2) * 6); rect(mx + 7 - p, 21, p * 2, 1, 'r'); for (let i = 0; i < 3; i++) put(mx + 13 + sh, 8 + ((t * 8 + i * 4) % 12), 'r') } // it oozes
      if (t > 5.6) { // a beer for him, and every hole a fountain
        const cupx = t < 6.0 ? 16 : 25, cupy = t < 6.0 ? 15 : 10
        rect(cupx, cupy, 2, 3, 'y'); put(cupx, cupy - 1, 'w'); put(cupx + 1, cupy - 1, 'w')
        if (t > 6.2) for (const [hx, hy] of holes) for (let k = 0; k < 4; k++) { const s = ((t - 6.2) * 2 + k / 4) % 1, dir = hx < 5 ? -1 : 1; put(dx + hx + dir * s * 7, 7 + hy + s * s * 7, 'y') }
      }
      text(t < 1.8 ? 'GET IN' : t < 2.8 ? (t > 2.1 ? 'CLANG' : '') : t < 4.0 ? (Math.floor(t * 4) % 2 ? 'OUCH' : '') : t < 5.6 ? '' : t < 6.2 ? 'THIRSTY?' : 'HOLEY MOLEY', 'c', 0, t > 2.1 && t < 2.8 ? 'y' : 'w')
    } },
    // THE RACK (the medieval stretcher): he lies on the rack, the Giant cranks, and he gets taller a notch at a time, the board keeping count, until he comes apart
    rack: { dur: 8.4, still: 3.6, draw(t) {
      ground()
      const snap = 5.6, n = Math.max(0, Math.min(11, Math.floor((t - 0.8) / 0.4))), s = n * 2, a = n * (Math.PI / 2) + (t > 0.8 && t < snap ? ((t - 0.8) % 0.4) * 4 : 0)
      rect(3, 17, 53, 2, 'n'); line(5, 19, 5, 20, 'n'); line(53, 19, 53, 20, 'n'); disc(4, 15, 2, 'n'); disc(54, 15, 2, 'n') // the rack, a roller at each end
      const hx = 54 + Math.cos(a) * 4, hy = 15 + Math.sin(a) * 4; line(54, 15, hx, hy, 'g') // the crank
      blit(SFGL, 59, 7); line(59, 13, hx, hy, 'o')
      // him on his back, head at the left: the cap, the face, the jersey (LA), the pants, the shoes; ropes from his wrists and his ankles to the rollers
      const xa = 8, lt = 8 + s / 2, lp = 6 + s / 2, gap = t < snap ? 0 : Math.min(9, (t - snap) * 30), jerk = t < snap && (t - 0.8) % 0.4 < 0.08 ? 1 : 0
      line(4, 15, xa - 1, 14, 'g')
      rect(xa, 12, 2, 5, 'b'); rect(xa + 2, 12, 4, 5, 'w'); put(xa + 3, 12, 'd'); put(xa + 5, 12, 'd') // looking up
      rect(xa + 6, 12, lt, 5, 'w'); mini('LA', xa + 6 + Math.round(lt / 2) - 3, 12, 'b')
      const px = xa + 6 + lt + gap + jerk
      rect(px, 13, lp, 3, 'g'); rect(px + lp, 12, 2, 5, 'd'); line(px + lp + 2, 14, 52, 15, 'g')
      if (gap) for (let i = 0; i < 12; i++) { const u = ((t - snap) * 1.5 + i / 12) % 1; put(xa + 6 + lt + gap / 2 + (i - 6) * u * 2, 14 - u * 12 + u * u * 16, 'r') } // what is between
      const inch = 73 + n * 3
      text(t < snap ? `${Math.floor(inch / 12)}'${inch % 12}"` : t < 6.6 ? 'SNAP' : 'TWO FOR ONE', 'c', 0, t < snap ? 'w' : 'r')
    } },
    // SHE LEFT HIM (30 Oct, Andrew: "a dodger fans wife leaving him because he's a loser"): on the couch in his cap; she has a suitcase and one line for him; a Giant is
    // waiting at the door and she goes off on his arm; a rain cloud sets up over the couch
    wifeleaves: { dur: 9.4, still: 2.0, draw(t) {
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
      if (t >= 7.4) { mini('FOR A', 28, 1, 'w'); mini('GIANTS', 28, 7, 'o'); mini('FAN', 28, 13, 'o') }
    } },
    // THE BRIDGE (30 Oct, Andrew: "a dodger fan jumping off the bridge because his wife left him"): on the Golden Gate in the fog with a broken heart in a thought
    // bubble; over the rail, the jump, the long way down, the splash, and his cap floating in the bay until a sea lion tries it on
    bridgejump: { dur: 9.6, still: 1.6, draw(t) {
      if (t < 3.6) {
        rect(4, 0, 2, 22, 'o'); rect(10, 0, 2, 22, 'o'); for (const y of [3, 9]) rect(4, y, 8, 1, 'o') // a tower
        for (let x = 12; x < GW; x++) { const y = Math.round(1 + (x - 12) * 0.16); put(x, y, 'o'); if (x % 4 === 0) line(x, y + 1, x, 14, 'o') } // the main cable and the suspenders
        for (let i = 0; i < 10; i++) put((i * 17 + t * 6) % GW, 4 + ((i * 5) % 9), 'g') // fog
        const climb = Math.max(0, Math.min(1, (t - 1.8) / 0.8)), jump = t > 3.0 ? t - 3.0 : 0
        const x = 40 + climb * 4, y = 6 - climb * 5 + (t > 2.6 && t < 3.0 ? 1 : 0) - jump * 10 + jump * jump * 70
        if (y < GH) blit(LADR, x, y)
        line(0, 15, GW - 1, 15, 'o'); for (let x2 = 0; x2 < GW; x2 += 2) line(x2, 16, x2, 19, 'o'); rect(0, 20, GW, 2, 'o') // the rail and the deck, in front of him
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
      text(u < 1.0 ? 'AAAAH' : u < 2.2 ? 'SPLASH' : 'STILL PAID THE TOLL', 'c', 0, u < 2.2 ? 'w' : 'o')
    } },
  }
  // the gags; a shuffled bag, so every gag plays before any plays twice and never the same one twice in a row
  const GAGS = ['dynamite', 'bonk', 'runover', 'sealsnack', 'leaves3rd', 'bipped', 'catapult', 'chipper', 'alcatraz', 'tshirt', 'steamroller', 'birds', 'quake', 'balloon', 'bp', 'driverless', 'crabsnip', 'hotdog', 'waterboard', 'ironmaiden', 'rack', 'wifeleaves', 'bridgejump']
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
    buf.fill(0)
    if (cur) {
      cur.t += dt * PACE
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : cur.t // reduced motion: a gag holds its one still frame for its length
      animT = tt
      A.draw(tt, cur.a)
      if (cur.t >= A.dur) { played.push(cur.name); cur = null; if (!queue.length) idle(idleText) }
    } else if (queue.length && (wait -= dt) <= 0) {
      const n = queue.shift(); cur = { name: n.name, a: n.a, t: 0 }; idleT = 0; wait = 0
      const A = ANIM[cur.name], tt = o.still && A.still != null ? A.still : 0
      animT = tt; A.draw(tt, cur.a)
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
    dur: (n) => ANIM[n]?.dur, pace: PACE,
    // draw one frame of an animation at time t right now (the next tick redraws); returns how many LEDs it lit, and the board as a picture when asked
    peek(n, tt, a = {}, pic = false) { buf.fill(0); animT = tt; ANIM[n].draw(tt, a); paint(); return { lit: buf.reduce((s, k) => s + (k ? 1 : 0), 0), url: pic ? out.toDataURL() : null } },
    // the rivalry: the next gag from the bag (c25 plays it after a Giants home run against the Dodgers), the whole list, and for the tests a hash of the board
    nextGag, gags: () => [...GAGS], still: (n) => ANIM[n]?.still ?? null, sig: () => { let h = 0; for (let i = 0; i < buf.length; i++) h = (h * 31 + buf[i]) | 0; return h },
    // the wind on the pennants: { fromDeg, mph, cfDeg? } (null: the gentle wave), and what is set
    set wind(w) { setWind(w) }, windNow: () => (windNow ? { ...windNow } : null),
    set rate(k) { rate = Math.max(0.1, Math.min(8, k)) },
  }
}
