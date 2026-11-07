// Study 25, THE BUILD: Study 24 cut down to Andrew's picks of 26 Oct (C1 orange at Oracle, W1 GHOST lines, V3 METER), with what he asked for on top:
//   the park is the hero in every layout (L1 AS ASKED, L2 AT THE PLATE, L3 BROADCAST); the swing art is gone; THE PITCH is a bigger zone with no numbers and every
//   pitch stat around it, tagged OFF THE MENU (GOLF SHOT, TOMAHAWK, CHASE SCENE, INSIDE JOB) when a home run came off a pitch outside the zone; CONTACT, SIDE ON
//   draws the pitch in, the bat through and the ball out at their true angles; the histograms get a labeled peak, the rate at this ball, hover numbers and an
//   ORACLE ONLY switch; the replay (DINGER DEJA-VU) has no number strip and a TWEAK THE TATER button that carries the home run into the Dojo; a SELECT menu
//   chooses the mode; another park takes its team's color; sound and pixel effects (hit-stop, trail, fireworks, Cove splash and kayaks, Karl's fog); an ODDS
//   RECEIPT mockup. Still open on the mixer: L (layout), P (frame: P1 LEGEND or P5 CORNERS), A (art: A2 POSTER or A3 WOODCUT), T (pixel type sets, type25.js).
// 28 Oct, his picks and asks: L2 and P5 by default; instant replay, fireworks, CRT and three type sets cut; a MENU button with its ESC keycap; a pitch-movement arrow on
//   the zone (R); a score bug with the win chance before and after and the swing's WPA (S); Karl toned down (K); the bay moving behind the park (B, water25.js);
//   landing moments where the ball comes down (F1, moments25.js) and an optional camera push (Z); a library of scoreboard animations (park25.js); pixel icons for the
//   panel titles (I); faces drawn on a canvas at screen resolution (A2, A4 to A7, faces25.js); and the pitch on its fitted path (pitchcam25.js).
// 28 Oct, second round: the arrow shows the break the pitch had (gravity in), not an as-if-spinless one; a pitch color (Y) for the arrow, the side view and the
//   PITCH ARC drawn on the park on PLAY IT (H, no more cut behind the plate); black water; T16, I2 and A2 as defaults; no hover tilt; sliders in the dojo strip.
// 28 Oct, night: L2 P5 A2 T16 F1 I2 R3 S1 K1 B1 Z2 H1 locked (out of the mixer; the options dock in the park corner holds what is still open: Y pitch color, U ball arc,
//   D stand-in batter, M menu title); the arrow is the movement a batter feels (against an average four-seamer); everything in the park is voxels (vox25.js, flight25.js);
//   SEAT SEANCE calls a seat (seance25.js); the camera LOOKs at whatever a feature is about; the fun line (similes, the Moon, Coors, tonight's air) replaces Moonshot;
//   TWEAK THE TATER keeps the real ball's spin and says what your change did; the menu is five lines.
// 29 Oct: U2, D1 and M1 locked too; still open: Y pitch color, X the dots in the arc (at the zenith and where it cleared the wall), E the ball's seams. The modes stand apart:
//   DINGER DOJO is a blank swing with its controls top left, TWEAK THE TATER only changes a real home run, SHOT CALLER is its own mode (click or type a seat: every swing
//   that gets there, most common first, and PLAY IT flies them). The ORACLE PARK sign over the board lives and its clock tells the time of the swing (park25.js); the
//   stand-in wears his team's kit at his own height, and a few players get an animal (standin25.js).
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, THEMES, applyTheme, pressEl, makeControls, makeSession, finishUI, loadDists } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons, loadReplay, loadPool, ballsLike, rollTo } from './skel3.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBust, artMetrics } from './art.js'
import { loadGenericFaces, genericFace } from './batter3d.js'
import { landingParty, NUKE_MARK_LOOKS } from '../landing.js'
import { seatSeance25 } from '../seance25.js'
import { shotCaller, GRID } from '../shotcaller.js'
import { loadWhatIf, whatIfP } from '../whatif.js'
import { loadDaily, enrichDay, oracleCheck, dingerPicks } from '../daily.js'
import { loadLibrary, pick, mulberry32 } from '../comparisons.js'
import { TYPES, TYPE_FONTS, typeVars } from './type25.js'
import { hist25 } from './hist25.js'
import { sliceSVG, sliceCaption, ballSVG } from './slice25.js'
import { MENU_CSS, selectMenu } from './menu25.js'
import { PIXCTL, PIXCTL_CSS, DESIGNS, initPixCtl } from './pixctl25.js'
import { sound } from './sfx25.js'
import { initFx25 } from './fx25.js'
import { initPark25 } from './park25.js'
import { initCoke25 } from './coke25.js'
import { initDiamond25 } from './diamond25.js'
import { initGhost25 } from './ghost25.js'
import { keepReadable, readable } from './vox25.js'
import { screenTags, setTagStyle, setTagTie } from './stag25.js'
import { LAND_LOOKS } from './landnum25.js'
import { witnessStats, witnessStore, windowOpen, openKeys, gameKey, BOARDS, rankBoard, TROPHIES } from './witness25.js'
import { initHappen25 } from './happen25.js'
import { initPoles25, POLE_LOOKS } from './poles25.js'
import { initWind25 } from './wind25.js'
import { initControls25 } from './controls25.js'
import { initShadow25 } from './shadow25.js'
import { initMySeat25 } from './myseat25.js'
import { initMoments25 } from './moments25.js'
import { initImpact25, IMPACTS, COVES } from './impact25.js'
import { initTouches25 } from './touches25.js'
import { initHeat25, ZONES, GRADS, FIELDS, SEATS, CONTRASTS, PILLAR_HEIGHTS, PILLAR_SHAPES, PILLAR_WAYS, PILLAR_PAINTS, BLAST_CAMS, BOMB_DROPS, SIDE_SHADES } from './heat25.js'
import { BADGES as HIT_BADGES } from './hitter25.js'
import { initStage25, RUNNER_LOOKS } from './stage25.js'
import { parkHit as parkHitM } from '../seance.js'
import { EMBLEM_CSS, emblemEditor, emblemDataURL, DEFAULT_EMBLEM, encodeEmblem } from './emblem25.js'
import { initWater25 } from './water25.js'
import { drawFace, FACE_STYLES } from './faces25.js'
import { initPitchArc, breakOf, feltBreak } from './pitchcam25.js'
import { initFlight25, ARCS, LINE_FILLS } from './flight25.js'
import { STANDIN_STYLES, drawStandIn, kitFor, MASCOTS } from './standin25.js'
import { loadModels, cloneModel } from './models25.js'
import { jukebox, loadPrivateSongs } from './music25.js'
import { constellation, posterPNG } from './show25.js'
import { ORANGE, ANCHORS, orangeLook, setOrange, recolor } from './orange25.js'

const LSA = { 1: 'WEAK', 2: 'TOPPED', 3: 'UNDER', 4: 'FLARE OR BURNER', 5: 'SOLID CONTACT', 6: 'BARREL' }
const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVEBALL', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const f = (v, d = 1, u = '') => (v == null || v !== v ? '--' : (typeof v === 'number' ? v.toFixed(d) : v) + u)
const clock = (ax) => { if (ax == null) return '--'; const h = ((((ax + 180) / 30) % 12) + 12) % 12, hh = Math.floor(h) || 12, mm = Math.round((h % 1) * 60); return `${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}` }
// names Andrew chose on 26 Oct; one place to change them
const NAMES = { witness: 'WALLOP WITNESS', offMenu: 'OFF THE MENU', low: 'GOLF SHOT', high: 'TOMAHAWK', away: 'CHASE SCENE', inside: 'INSIDE JOB', tweak: 'TWEAK THE TATER', replay: 'DINGER DÉJÀ-VU', dojo: 'DINGER DOJO', shot: 'SHOT CALLER' }

// panel icons (I, 28 Oct, Andrew: a pitcher for the pitch, a batter for the contact, bars for the histograms), drawn as pixels: # the title color, a the accent
const ICONS = {
  pitch: {
    1: ['...##...', '...##...', '..####..', '..#.##..', '...##...', '...##...', '..#..#..', '..#..#..'],
    2: ['....##.a', '....##.#', '...####.', '..#.##..', '...##...', '...###..', '..#...#.', '.#.....#'],
    3: ['...##.', '...##.', '.####.', '..##..', '.#..#.', '#....#'],
  },
  // the contact panel: a bat meeting the ball (28 Oct, Andrew asked for a bat and ball here)
  slice: {
    1: ['.....##.', '....###.', '...###..', '..###.##', '.###..##', '###.....', '##......', '#.......'],
    2: ['.....##.', '....###.', '...###aa', '..###.aa', '.###....', '###.....', '##......', '#.......'],
    3: ['...##.', '..###.', '.###aa', '###.aa', '##....', '#.....'],
  },
  hists: {
    1: ['........', '.....#..', '.....#..', '...#.#..', '...#.#.#', '.#.#.#.#', '.#.#.#.#', '########'],
    2: ['........', '.....a..', '.....a..', '...#.a..', '...#.a.#', '.#.#.a.#', '.#.#.a.#', '########'],
    3: ['....a.', '..#.a.', '..#.a#', '#.#.a#', '#.#.a#', '######'],
  },
}
// the dojo's controls (29 Oct, later, Andrew: "stop numbering things (speed, angle) - let's have a fun icon for each"): a ball with whoosh lines, a launch ramp, the
// field with an arrow up it, a thermometer, a windsock. # the label color, a the accent
const SLOT_ICONS = {
  ev: ['......###.', '####.#a#a#', '..##.#a#a#', '####.#a#a#', '......###.'],
  la: ['.........', '.......##', '.....##..', '...##....', '..#.a....', '.#...a...', '#########'],
  dir: ['..#####..', '.#..a..#.', '#..aaa..#', '.#..a..#.', '..#.a.#..', '...#a#...', '....#....'],
  temp: ['..##..', '.#..#.', '.#..#.', '.#aa#.', '.#aa#.', '#aaaa#', '#aaaa#', '.####.'],
  wind: ['#........', '#aa##aa#.', '#aa##aa##', '#aa##aa#.', '#........', '#........', '#........', '###......'],
}
// and the rest of the boxes (29 Oct, evening, Andrew: the Deja-vu icons "should be the norm for the boxes literally across everything"): the park, the batter, a seat
// for CALL A SEAT, a target for SHOT CALLER, a ball landing for LANDING PARTY, a crystal ball for SEAT SEANCE, a receipt, stars, and a swinging bat for the dojo
Object.assign(ICONS, {
  park: { 2: ['........', '.######.', '#......#', '#..aa..#', '#.a..a.#', '.#.aa.#.', '..#..#..', '...##...'] },
  batter: { 2: ['..####..', '.######.', '.####aa.', '..###...', '...##...', '.######.', '########', '########'] },
  seat: { 2: ['.#####..', '.#...#..', '.#...#..', '.#####..', '########', '#aaaaaa#', '.#....#.', '.#....#.'] },
  shot: { 2: ['...##...', '.#....#.', '#..##..#', '##.aa.##', '##.aa.##', '#..##..#', '.#....#.', '...##...'] },
  landing: { 2: ['.....##.', '....##..', '...##...', '........', '.a.#.a..', '..a#a...', 'aaa#aaa.', '########'] },
  seance: { 2: ['..####..', '.#a...#.', '#a.....#', '#......#', '.#....#.', '..####..', '.######.', '########'] },
  receipt: { 2: ['.######.', '.#....#.', '.#a##.#.', '.#....#.', '.#a##.#.', '.#....#.', '.#.#.##.', '.##.#.#.'] },
  stars: { 2: ['a......#', '........', '...#....', '..###..a', '...#....', '........', '.a....#.', '........'] },
  swing: { 2: ['......##', '.....##.', '....##..', 'a..##...', '.a##....', '..a.....', '...aa...', '........'] },
})
const PANEL_WORDS = { pitch: '/ T H E &nbsp; P I T C H /', slice: '/ C O N T A C T , &nbsp; S I D E &nbsp; O N /', hists: '/ V S &nbsp; A L L /' }
const PANEL_NAMES = { pitch: 'THE PITCH', slice: 'CONTACT, SIDE ON', hists: 'VS ALL' }
const iconSVG = (rows, px, name) => `<svg class="ico" width="${rows[0].length * px}" height="${rows.length * px}" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" role="img" aria-label="${name}"><title>${name}</title>${rows.flatMap((r, y) => [...r].map((c, x) => (c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === 'a' ? 'var(--acc)' : 'currentColor'}"/>`))).join('')}</svg>`

// another park borrows its team's color as the accent (readable on the near-black ground); Oracle keeps C1 orange
const TEAM_ACC = { ARI: '#e0455a', ATL: '#e8365a', ATH: '#efb21e', BAL: '#f2691e', BOS: '#e24a55', CHC: '#4a7dff', CWS: '#c4ced4', CIN: '#e8344c', CLE: '#ef3e4a', COL: '#9b6bff', DET: '#fa6a2e', HOU: '#eb6e1f', KC: '#74b4fa', LAA: '#e3304a', LAD: '#3d8fe0', MIA: '#00a3e0', MIL: '#ffc52f', MIN: '#e63a62', NYM: '#ff5910', NYY: '#8fb3e8', PHI: '#ef3340', PIT: '#fdb827', SD: '#ffc425', SEA: '#14b8a6', STL: '#e8455d', TB: '#8fbce6', TEX: '#e33b47', TOR: '#3f8ae6', WSH: '#e0303c' }

// ---- what is still open (the mixer); codes keep Study 24's numbers so A3 or T1 means the same thing in both ----
export const AXES = {
  L: { name: 'LAYOUT', opts: [
    { c: 1, name: 'AS ASKED', desc: 'your arrangement: the batter and the contact on the left, the histograms and the pitch on the right', why: 'the baseline you described' },
    { c: 2, name: 'AT THE PLATE', desc: 'left rail: the pitch, then the contact side on. Right rail: the batter, then the histograms', why: 'each rail answers one question. Left: what happened at the plate, the same moment from the catcher and from the side. Right: who hit it and how it ranks' },
    { c: 3, name: 'BROADCAST', desc: 'the park across the top at its biggest, four cards under it: batter, pitch, contact, how it ranks', why: 'it reads left to right in the order it happened, like a TV replay package, and the park gets the most room' },
  ] },
  P: { name: 'PANEL FRAME', opts: [{ c: 1, name: 'LEGEND', desc: 'title set into the top border' }, { c: 5, name: 'CORNERS', desc: 'crop-mark corners only, title inside' }] },
  // A2 and A4 to A7 draw on a canvas at screen resolution (faces25.js); A3 is the braille text style from 27 Oct
  A: { name: 'ART', opts: [
    { c: 2, name: 'POSTER', desc: 'your pick, now drawn a dot every 1.5 pixels (it was a braille character every 2.5)', canvas: 'poster' },
    { c: 3, name: 'WOODCUT', desc: 'braille text, adaptive threshold, high contrast (27 Oct)', id: 'braille-thresh' },
    { c: 4, name: 'HEDCUT', desc: FACE_STYLES.hedcut.note, canvas: 'hedcut' },
    { c: 5, name: 'CROSS-HATCH', desc: FACE_STYLES.hatch.note, canvas: 'hatch' },
    { c: 6, name: 'INK AND WASH', desc: FACE_STYLES.wash.note, canvas: 'wash' },
    { c: 7, name: 'PEN AND INK', desc: FACE_STYLES.pen.note, canvas: 'pen' },
  ] },
  T: { name: 'TYPE', opts: TYPES.map((t) => ({ c: t.c, name: t.name, desc: t.desc, T: t, hide: t.hide })) },
  F: { name: 'LANDING', opts: [
    { c: 1, name: 'LANDING MOMENTS', desc: 'something happens where the ball comes down: a glove in the seats, a sea lion in the Cove, dust off the wall; the gulls scatter', style: 'moments' },
    { c: 2, name: 'CONFETTI', desc: 'orange and bone confetti flutters down on a home run instead', style: 'confetti' },
    { c: 3, name: 'QUIET', desc: 'no landing moments and no gulls: the trail, the splash and the scoreboard only', style: 'none' },
  ] },
  I: { name: 'PANEL ICONS', opts: [
    { c: 1, name: 'SET', desc: 'pixel icons for titles: the pitcher set, a bat and ball, plain bars' },
    { c: 2, name: 'ACTION', desc: 'the pitcher at release, the bat meeting the ball, the bars with this ball lit (your pick)' },
    { c: 3, name: 'TINY', desc: 'smaller versions of ACTION, for tight headers' },
    { c: 0, name: 'WORDS', desc: 'the spaced-out text titles from 27 Oct' },
  ] },
  R: { name: 'PITCH ARROW', opts: [
    { c: 1, name: 'BREAK', desc: 'one arrow from where the pitch was headed 40 ft out to where it crossed: the bend it really had, gravity included (R key)' },
    { c: 2, name: 'SIDE + DROP', desc: 'the same bend in its two parts: the sideways break along the top, then the drop (or rise) into the ball' },
    { c: 3, name: 'PATH', desc: 'the pitch itself over its last 40 ft, as the catcher saw it' },
    { c: 0, name: 'OFF', desc: 'no arrow' },
  ] },
  // the pitch's own color (28 Oct): the arrow on the zone, the pitch line in the side view, the pitch arc in the park, the arc dots and the ball's stitches; the hit keeps
  // the accent. 29 Oct, Andrew: ten of them, all set against the orange (cool hues across from it on the wheel, bright enough on the black)
  Y: { name: 'PITCH COLOR', opts: [
    { c: 1, name: 'SKY', desc: 'a clear mid blue, straight across the wheel from the orange', col: '#6da7de' },
    { c: 2, name: 'MINT', desc: 'cold mint green, the one you liked on the dots', col: '#3ee6a0' },
    { c: 3, name: 'ICE', desc: 'a bright icy cyan, the loudest against the orange', col: '#5ce1ff' },
    { c: 4, name: 'ELECTRIC', desc: 'a saturated electric blue', col: '#4d7cff' },
    { c: 5, name: 'TEAL', desc: 'a deep sea teal, like the Cove on a sunny day', col: '#19c3b4' },
    { c: 6, name: 'LILAC', desc: 'a soft violet', col: '#a79be0' },
    { c: 7, name: 'ULTRAVIOLET', desc: 'a strong blue-violet, a night-game color', col: '#8f63ff' },
    { c: 8, name: 'SEAFOAM', desc: 'a pale mint, quieter than MINT', col: '#a3f0d6' },
    { c: 9, name: 'GLACIER', desc: 'a very pale blue, close to white with a cold tint', col: '#bfe3ff' },
    { c: 10, name: 'NEON LIME', desc: 'a hot yellow-green, the most arcade one', col: '#9dff4f' },
  ] },
  S: { name: 'SITUATION', opts: [
    { c: 1, name: 'SCORE BUG', desc: 'a TV-style bug in the park corner: inning, outs, runners, count, score, and the win chance before and after' },
    { c: 2, name: 'READOUT LINE', desc: 'the same as one line of text under the distance (the header had no room left)' },
    { c: 3, name: 'BATTER CARD', desc: 'the same inside the batter panel, under the face' },
  ] },
  K: { name: 'KARL', opts: [
    { c: 1, name: 'WHISPER', desc: 'a faint cold-grey fog low over the bay and outfield' },
    { c: 2, name: 'MARINE LAYER', desc: 'a bit thicker, same color and place' },
    { c: 3, name: 'PEA SOUP', desc: 'the bright fog from 27 Oct, for comparison' },
  ] },
  B: { name: 'BAY WATER', opts: [
    { c: 1, name: 'SWELL', desc: 'the Cove and the bay rise and fall a foot, slowly' },
    { c: 2, name: 'SHIMMER', desc: 'still water; a few lines brighten and fade as they drift' },
    { c: 3, name: 'SHORE LINES', desc: 'faint lines roll in toward the seawall like small waves' },
    { c: 4, name: 'WAKES', desc: 'still water; now and then a faint V-wake crosses the Cove' },
    { c: 5, name: 'RIPPLE RINGS', desc: 'the first version water: soft two-tone patches with rings inside them that grow and shrink as the swell moves (30 Oct, his ask)' },
    { c: 6, name: 'FAINT RINGS', desc: 'the ripple rings as thin dim lines only, no lighter patches (31 Oct)' },
    { c: 7, name: 'PEAKS ONLY', desc: 'only the small rings at the tops of the swell, opening and closing; mostly black water' },
    { c: 8, name: 'BROKEN RINGS', desc: 'faint ripple rings in drifting pieces' },
    { c: 9, name: 'WIDE AND SLOW', desc: 'one faint ring per swell, twice the size, half the speed' },
    { c: 10, name: 'WIDE AND SLOW, DIM', desc: 'the same rings at about two thirds the brightness (31 Oct: less contrast)' },
    { c: 11, name: 'WIDE AND SLOW, DIMMER', desc: 'the same rings at under half the brightness' },
    { c: 12, name: 'WIDE AND SLOW, BARELY', desc: 'the same rings at a quarter of the brightness: you see them only if you look' },
    { c: 0, name: 'STILL', desc: 'no motion on the water' },
  ] },
  V: { name: 'STANDS', opts: [
    { c: 5, name: 'LOWER BOWL', desc: 'the stands cut 9 m up: the decks and the clubs go, the lower bowl stays all the way round (31 Oct, later: his pick, first)' },
    { c: 1, name: 'ALL', desc: 'the whole park' },
    { c: 2, name: 'NO UPPER DECKS', desc: 'everything over 13 m up in the stands taken away (the board, the sign and center field stay)' },
    { c: 3, name: 'NO FOUL GROUND', desc: 'everything outside the foul lines taken away, the stands behind the plate too; the field stays' },
    { c: 4, name: 'FAIR AND LOW', desc: 'both: just the field and the lower stands from line to line' },
    // 31 Oct (Andrew: "a few mediums between no upper decks and no foul ground - maybe cut off at varying levels of low / close?"): the stands cut lower, or the
    // foul-ground stands kept only near the lines (the outfield wall and the arcade always stay)
    { c: 6, name: 'FIELD LEVEL', desc: 'the stands cut 5 m up: a few rows round the field, the wall and the arcade' },
    { c: 7, name: 'FOUL: CLOSE', desc: 'past the foul lines only the stands within 14 m of the line stay, all the way up' },
    { c: 8, name: 'FOUL: FRONT ROWS', desc: 'past the foul lines only the first 6 m of seats stay' },
    { c: 9, name: 'LOW AND CLOSE', desc: 'the stands cut 7 m up, and past the foul lines only the first 10 m of seats' },
    // 31 Oct (Andrew: "I think lower bowl is the right v ... Give me 5 more options riffing on this"); every cut now takes any piece that reaches over the line
    { c: 10, name: 'BOWL 7 M', desc: 'the lower bowl cut lower, 7 m up' },
    { c: 11, name: 'BOWL 11 M', desc: 'the lower bowl cut higher, 11 m up: a few more rows' },
    { c: 12, name: 'STEPPED BOWL', desc: '11 m up behind the plate stepping down to 6 m at the foul poles' },
    { c: 13, name: 'BOWL, NO BLEACHERS', desc: 'the lower bowl at 9 m, and the left-field bleachers gone too' },
    { c: 14, name: 'BOWL, FOUL CLOSE', desc: 'the lower bowl at 9 m, and past the foul lines only the seats within 14 m of the line' },
  ] },
  Z: { name: 'CAMERA', opts: [{ c: 1, name: 'STILL', desc: 'the camera stays put (Z key)' }, { c: 2, name: 'PUSH', desc: 'a slow push toward where the ball lands, then back; no shake (Z key; on by default since 28 Oct)' }] },
  H: { name: 'PITCH ARC', opts: [{ c: 1, name: 'ON', desc: 'PLAY IT draws the pitch on the park on its real path and break, in the pitch color, then the hit flies' }, { c: 0, name: 'OFF', desc: 'PLAY IT goes straight to the hit' }] },
  U: { name: 'BALL ARC', opts: ARCS }, // U, not V: V and Y look alike in the pixel type
  D: { name: 'STAND-IN BATTER', opts: STANDIN_STYLES }, // for a batter with no photo, and you in the dojo
  M: { name: 'MENU TITLE', opts: [{ c: 1, name: 'STACKED', desc: 'the name in two big lines' }, { c: 2, name: 'ARC', desc: 'a pixel home-run arc over the name' }, { c: 3, name: 'MARQUEE', desc: 'the name inside a border of chasing bulbs' }] },
  // 29 Oct, Andrew: a dot in the arc at the zenith and where it cleared the wall, in its own color (white, the pitch color, or something new)
  X: { name: 'ARC DOTS', opts: [
    { c: 1, name: 'WHITE', desc: 'pure white dots, the brightest thing in the park', col: '#ffffff' },
    { c: 2, name: 'PITCH COLOR', desc: 'the dots in the pitch color (Y): the pitch and the marks on the hit match', col: null },
    { c: 3, name: 'LEMON', desc: 'a new color: bright lemon yellow', col: '#ffe14d' },
    { c: 4, name: 'HOT PINK', desc: 'a new color: hot pink, used nowhere else', col: '#ff4fa3' },
    { c: 5, name: 'MINT', desc: 'a new color: cold mint green, the opposite of the orange arc', col: '#3ee6a0' },
  ] },
  // the Coke bottle and the glove in left field (29 Oct, later, Andrew: "build voxel coke bottle and mitt instead of having the 3D models")
  C: { name: 'COKE CORNER', opts: [
    { c: 1, name: 'GLASS', desc: 'the bottle in voxels, green contour glass with a red label band and cap; the glove in tan leather' },
    { c: 2, name: 'COKE RED', desc: 'a red voxel bottle with a white wave across it; the same glove' },
  ] },
  // the ORACLE PARK sign over the board (29 Oct, later, Andrew sent a photo of the real one)
  Q: { name: 'THE SIGN', opts: [
    { c: 1, name: 'BULBS', desc: 'ORACLE PARK in round bulbs between two rows of chasers, the clock in bulbs' },
    { c: 2, name: 'THE REAL SIGN', desc: 'the real one in voxels, from your photo: tall cream letters in a red neon outline on the green arch, the pink clock face, the eight World Series pennants flying above' },
    { c: 3, name: 'REAL SIGN, NIGHT', desc: 'the same at night: the neon brighter and one tube that flickers' },
  ] },
  // the scoreboard in voxels (29 Oct, evening, Andrew: "give me like 3-4 basic voxel options to choose from with a couple animations so I can see what's what")
  G: { name: 'SCOREBOARD', opts: [
    { c: 1, name: 'CUBES', desc: 'every LED a cube in a dark voxel frame; the lit ones step forward a little' },
    { c: 2, name: 'RELIEF', desc: 'the lit LEDs stand a metre out of the board, so the crab, the cable car and the words come off it in 3D' },
    { c: 3, name: 'FLIP DOTS', desc: 'every LED a tile that flips over, dark side to color side, when it changes, like an old flip-dot board' },
    { c: 4, name: 'BULBS', desc: 'the flat round-bulb board from before, for comparison' },
  ] },
  // the three groups of STATS BEFORE THIS SHOT (29 Oct, evening, Andrew: "come up with better names for the 3 of those ... give me options")
  O: { name: 'STAT GROUP NAMES', opts: [
    { c: 1, name: 'CARD, LAB, RABBIT HOLE', desc: 'THE BACK OF THE CARD, THE STATCAST LAB, THE RABBIT HOLE', names: ['THE BACK OF THE CARD', 'THE STATCAST LAB', 'THE RABBIT HOLE'] },
    { c: 2, name: 'BOX SCORE, FRONT OFFICE, NO LIFE', desc: 'BOX SCORE, FRONT OFFICE, NO LIFE', names: ['BOX SCORE', 'FRONT OFFICE', 'NO LIFE'] },
    { c: 3, name: 'BASICS, NERDS, ABYSS', desc: 'THE BASICS, THE NERDS, THE ABYSS', names: ['THE BASICS', 'THE NERDS', 'THE ABYSS'] },
    { c: 4, name: 'GRANDPA, LAPTOP, BASEMENT', desc: 'GRANDPA STATS, LAPTOP STATS, BASEMENT STATS', names: ['GRANDPA STATS', 'LAPTOP STATS', 'BASEMENT STATS'] },
  ] },
  // the gulls' faces (29 Oct, later, Andrew: "can we give there flapping seagulls faces?")
  W: { name: 'GULL FACES', opts: [
    { c: 1, name: 'WESTERN GULL', desc: 'a white head, black eyes and the yellow bill with the red spot the gulls at Oracle really have' },
    { c: 2, name: 'CARTOON', desc: 'a big head, googly eyes, a cross brow and an orange bill: the fry thieves' },
    { c: 3, name: 'SHADES', desc: 'the western gull in black sunglasses' },
  ] },
  // the dojo controls' labels (29 Oct, later): no numbers, an icon each; 31 Oct (Andrew: "pixel controls for the wind, temp, on the LHS - let's make it a sock and
  // thermometer ... a semi-diagetic pixel control of an angle / arc ... a ton of options for all of the LHS dojo controls"): open again, with the pixel instruments
  // (pixctl25.js) in five looks and a big-arcs layout in two; J2 (the sliders) first, as it was
  J: { name: 'DOJO CONTROLS', opts: [
    { c: 8, name: 'BIG ARCS', desc: 'the angle and the aim side by side and big, the air and the wind side by side under them, the speed (a roadrunner on a rail) under those; each drawing picked in THE LAB (31 Oct: his favorite, first)' },
    { c: 2, name: 'SLIDERS', desc: 'the icons with the word beside them (SPEED, ANGLE, AIM, AIR, WIND), the number and a slider (as it was)' },
    { c: 1, name: 'SLIDERS, ICONS ONLY', desc: 'a pixel icon for each control, no words: a ball with whoosh lines, a launch ramp, the field with an arrow, a thermometer, a windsock' },
    { c: 3, name: 'PIXEL ROWS', desc: 'the same drawings in a row each' },
    { c: 5, name: 'GAME BOY', desc: 'the same drawings in four greens on a green screen' },
    { c: 6, name: 'CHALKBOARD', desc: 'the same drawings in dusty chalk on a dugout chalkboard, the values in yellow chalk' },
    { c: 7, name: 'BLUEPRINT', desc: 'the same drawings as white lines on blueprint blue' },
  ] },
  // the Shot Caller frontier's look (29 Oct, later)
  N: { name: 'FRONTIER', opts: [
    { c: 1, name: 'CELLS + RIDGE', desc: 'every speed and angle that gets there lit, brighter the more common, with the ridge line through the middle', cells: true, ridge: true },
    { c: 2, name: 'RIDGE', desc: 'just the ridge line, the ways that get there as dots on it', cells: false, ridge: true },
    { c: 3, name: 'CELLS', desc: 'just the lit cells, no line', cells: true, ridge: false },
  ] },
  // and the stitches on the new ball (the pixel ball on the zone and in the side view, and the voxel ball in flight)
  E: { name: 'BALL SEAMS', opts: [
    { c: 1, name: 'PITCH COLOR', desc: 'the stitches in the pitch color (Y), your lean', col: null },
    { c: 2, name: 'BONE', desc: 'the stitches in a darker bone, quiet on the white hide', col: '#b3a888' },
    { c: 3, name: 'NONE', desc: 'a plain white ball, no stitches', col: '#f2efe6' },
    { c: 4, name: 'RED', desc: 'red stitches, as it was', col: '#e4002b' },
  ] },
}
// THE LAB (31 Oct): the mixer has used every letter, so the newer choices live here, two letters each, kept on this device (and ?lab=BI2-BC3 for a link); they
// are listed under OPTIONS after the mixer. NUKE IT (31 Oct, Andrew: "let's make it nuke it and let's always have like a fun little nuclear bomb icon. Give me options on
// both icon and color"): one button, the same place in every mode, its own color
// the icons are drawn by rule (31 Oct, later, Andrew: "the icon should be a like nuclear atom bomb. Give me better pixel icons"): '#' the button's ink, 'g' a mid grey,
// 'w' bone, 'y' yellow, 'r' red
const trefoil = (x, y, cx, cy, R) => { const dx = x - cx, dy = cy - y, r = Math.hypot(dx, dy), a = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360; if (r < R * 0.22) return true; return r > R * 0.36 && r < R && [90, 210, 330].some((c) => Math.abs(((a - c + 540) % 360) - 180) < 30) }
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
// 1 Nov (Andrew: "I like fat man, falling atom bomb, and the atom. Can we make each just a little higher fidelity? Right now they're hard to read"): those three on a
// 24 by 24 grid, in passes: cells(f) fills by rule, atomOn() draws three orbits a cell wide round a nucleus. 'd' is the ink's shadow side, 'k' black, 'R' dark red
const nukePaint = (N, ...passes) => { const g = Array.from({ length: N }, () => Array(N).fill('.')), set = (x, y, c) => { const i = Math.floor(x), j = Math.floor(y); if (i >= 0 && j >= 0 && i < N && j < N) g[j][i] = c }; for (const p of passes) p(set, N); return g.map((r) => r.join('')) }
const cells = (f) => (set, N) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = f(x + 0.5, y + 0.5); if (c) set(x, y, c) } }
const atomOn = (cx, cy, rx, ry, ink, nr, electrons) => (set) => {
  for (const t of [0, Math.PI / 3, (2 * Math.PI) / 3]) for (let a = 0; a < 900; a++) { const th = (a / 900) * Math.PI * 2, u = Math.cos(th) * rx, v = Math.sin(th) * ry; set(cx + u * Math.cos(t) - v * Math.sin(t) + 0.5, cy + u * Math.sin(t) + v * Math.cos(t) + 0.5, ink) }
  for (let y = cy - nr - 1; y <= cy + nr + 1; y++) for (let x = cx - nr - 1; x <= cx + nr + 1; x++) { const dx = Math.floor(x) + 0.5 - cx, dy = Math.floor(y) + 0.5 - cy, r = Math.hypot(dx, dy); if (r < nr) set(x, y, Math.hypot(dx + nr * 0.4, dy + nr * 0.4) < nr * 0.38 ? 'w' : dx + dy > nr * 0.55 ? 'O' : 'o') }
  if (electrons) for (const [t, th] of [[0, 0.5], [Math.PI / 3, 3.6], [(2 * Math.PI) / 3, 2.1]]) { const u = Math.cos(th) * rx, v = Math.sin(th) * ry, ex = cx + u * Math.cos(t) - v * Math.sin(t), ey = cy + u * Math.sin(t) + v * Math.cos(t); for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(ex + i - 0.5, ey + j - 0.5, 'w') }
}
// 1 Nov, later (Andrew: "let's make the middle of the atom and the current yellow area in falling atom bomb giants orange and have those be the two finalists"):
// the other four are gone; 'o' is Giants orange, 'O' its shadow
export const NUKE_ICONS = {
  3: { name: 'FALLING ATOM BOMB', rows: nukePaint(24, cells((x, y) => { // nose down, three fins up, the radiation sign on its side, speed lines streaming up past it
    if ((Math.abs(x - 2.5) < 0.5 && y > 3 && y < 10) || (Math.abs(x - 21.5) < 0.5 && y > 2 && y < 8) || (Math.abs(x - 20.5) < 0.5 && y > 11 && y < 15)) return 'd'
    const dx = Math.abs(x - 12)
    if (y > 1 && y < 8 && ((dx > 2.4 && dx < 2.4 + (8 - y) * 0.7 && y > 2) || dx < 0.5)) return '#'
    if (y > 2.5 && y < 9 && dx < 1.4 + (y - 2.5) * 0.45) return 'd'
    const w = y < 8.5 ? 0 : y < 10 ? 4 + (y - 8.5) : y < 15 ? 5.6 : 5.6 * Math.sqrt(Math.max(0, 1 - ((y - 15) / 7.8) ** 2))
    if (dx >= w) return
    if (Math.hypot(x - 12, y - 14.6) < 4) return trefoil(x, y, 12, 14.6, 3.7) ? 'k' : 'o'
    if (x < 12 - w * 0.35 && x > 12 - w * 0.8 && y > 9.5 && y < 13) return 'w'
    return x > 12 + w * 0.45 ? 'd' : '#'
  })) },
  5: { name: 'ATOM', rows: nukePaint(24, atomOn(12, 12, 10.6, 3.9, '#', 2.9, true)) }, // three orbits, an electron riding each, a shaded red nucleus
}
// nuclear greens (31 Oct, later, Andrew: "I want the nuke color to read as like nuclear green"; outside his palette library at his ask), and the acid yellow from before
const NUKE_COLORS = { 1: ['NUCLEAR GREEN', '#5dff3a'], 2: ['GEIGER', '#9dff00'], 3: ['URANIUM GLASS', '#ccff00'], 4: ['REACTOR', '#00ff9c'], 5: ['ACID YELLOW', '#dee000'] }
export const LAB = {
  BI: { name: 'NUKE IT: ICON', opts: [3, 5].map((c) => ({ c, name: NUKE_ICONS[c].name, desc: 'the little bomb on the button: the two finalists, Giants orange in the middle (1 Nov)' })) },
  BC: { name: 'NUKE IT: COLOR', def: 2, opts: Object.entries(NUKE_COLORS).map(([c, [n, hex]]) => ({ c: Number(c), name: n, desc: hex, hex })) },
  BS: { name: 'NUKE IT: BUTTON', def: 2, opts: [ // (1 Nov, later: "Outline fills on hover 100%") // (1 Nov: "tone it down just a little? Maybe only have the button outlined by that")
    { c: 1, name: 'OUTLINE', desc: 'a dark button, the color only in its edge, the word and the bomb' },
    { c: 2, name: 'OUTLINE, FILLS ON HOVER', desc: 'the same, and it fills with the color while you point at it' },
    { c: 3, name: 'SMOLDER', desc: 'a dark button with a little of the color in it, a darker edge' },
    { c: 4, name: 'LIT WORD', desc: 'a dark button with a grey edge: only the word and the bomb carry the color' },
    { c: 5, name: 'SOLID', desc: 'filled with the color, as it was' },
  ] },
  // the 3D controls in the park (controls25.js): the Y-forks first (31 Oct, later: "I like chunky y fork but still want more options there")
  SL: { name: 'SLINGSHOT (IN THE PARK)', def: 5, opts: [
    { c: 1, name: 'CHUNKY Y-FORK', desc: 'a thick fork, broad orange bands, a notched angle arc beside it; the ball in the bands a real voxel baseball (1 Nov)' },
    { c: 5, name: 'WRIST ROCKET', desc: 'a steel fork with an arm brace behind it, black rubber bands, a leather pouch' },
    { c: 6, name: 'TREE BRANCH', desc: 'a forked branch in bark, a twig off one arm, tan bands and a pouch' },
    { c: 7, name: 'GIANTS FORK', desc: 'black arms, an orange stem in bands, orange tips' },
    { c: 8, name: 'DOUBLE BANDS', desc: 'a wide fork, two bands a side, a big pouch: the heavy one' },
    { c: 2, name: 'PINBALL PLUNGER', desc: 'a steel housing and barrel, a spring back to the ball' },
    { c: 3, name: 'BAT CATAPULT', desc: 'a big bat from a pivot to the ball, a stop post for the angle' },
    { c: 4, name: 'BALLISTA', desc: 'a rail, a steel bow, an orange string to the ball' },
  ] },
  SK: { name: 'WINDSOCK (IN THE PARK)', opts: [
    { c: 5, name: 'HOLLOW SOCK', desc: 'like the ones on the foul poles, bigger and finer: open rings, orange and white, a hoop at the mast (31 Oct, later: his ask)' },
    { c: 6, name: 'HOLLOW SOCK, FINE', desc: 'the same with more rings and more cubes round each: a smoother tube' },
    { c: 1, name: 'AIRPORT SOCK', desc: 'a cuff and five solid bands, still but for a flutter at the tail' },
    { c: 2, name: 'WEATHER VANE', desc: 'an arrow along the wind, longer the stronger, compass pegs under it' },
    { c: 3, name: 'STAIR-STEP PENNANT', desc: 'four rectangles rising to the horizontal as it blows' },
    { c: 4, name: 'GIANTS PENNANT', desc: 'orange felt edged in white with GIANTS on it in black, reading the right way from wherever you look (1 Nov)' },
  ] },
  TH: { name: 'THERMOMETER (IN THE PARK)', opts: [ // (31 Oct, later: "needs to stay a mercury thermo but it looks cheap rn, give me more options there")
    { c: 5, name: 'GLASS TUBE', desc: 'a clear tube with a glint down it, a steel cap, a red bulb, ticks every 10 degrees and 40, 70, 100 in voxels' },
    { c: 6, name: 'PORCH BOARD', desc: 'the tube on a wooden board with dark ticks, like a porch thermometer' },
    { c: 7, name: 'ENAMEL SIGN', desc: 'the tube on an orange enamel sign, F at the top' },
    { c: 8, name: 'CHROME CASE', desc: 'the tube in a steel case with a window and bolts' },
    { c: 1, name: 'MERCURY TOWER', desc: 'the first one, cleaner (1 Nov): a white case, a solid red column and bulb, three notches' },
  ] },
  // the words in the park (stag25.js; 31 Oct, later: "the diagetic zenith, cleared the wall, distance still needs to be voxel. Give me options for that too")
  TG: { name: 'PARK TAGS', def: 5, opts: [
    { c: 5, name: 'QUIET BOARD', desc: 'on a board, smaller, the caption in grey: the number carries it (1 Nov: "I like voxel on a board, but it\'s still pretty loud")' },
    { c: 1, name: 'VOXEL, STEADY', desc: 'voxel letters held at one size on the screen, placed clear of everything' },
    { c: 2, name: 'VOXEL ON A BOARD', desc: 'the same on a dark board, like a little scoreboard' },
    { c: 3, name: 'VOXEL NUMBER ONLY', desc: 'just the number in voxels, no caption' },
    { c: 4, name: 'PIXEL TYPE', desc: 'flat pixel type on a dark strip (the last version)' },
    { c: 6, name: 'BIG NUMBER', desc: 'the number large on its board, the caption small and grey: the digits are the landmark (GPT red team II, B8)' },
  ] },
  // (1 Nov: "difficult to tell what they're referring to with voxel number only - maybe we make them the same color as their ice blue line? ... maybe we connect them via a line too?")
  // (1 Nov, later: GPT red team II, B6, left to me as an option)
  TF: { name: 'PARK TAGS: WHEN', opts: [
    { c: 1, name: 'ALL STAY', desc: 'each tag comes up as the ball passes its point and stays' },
    { c: 2, name: 'ONE AT A TIME', desc: 'only the newest: ZENITH at the top, the wall as it crosses, LANDED when it comes down; the posts stay for the rest' },
    { c: 3, name: 'ON HOVER', desc: 'ZENITH and CLEARED THE WALL only while the pointer is on their cube; the landing distance has the park to itself' },
  ] },
  // the Coke bottle (coke25.js; 1 Nov, later, from GPT red team II B1 and B2, Andrew on the leftovers: "if you want to institute any as options be my guest")
  CB: { name: 'COKE BOTTLE', opts: [
    { c: 1, name: 'AS IS', desc: 'the open green frame, the red label, the slides' },
    { c: 2, name: 'LIVING BOTTLE', desc: 'thicker ribs at the base and shoulder; on a home run toward left field, orange and white bubbles race up and burst from the mouth' },
    { c: 3, name: 'SODA LANTERN', desc: 'the label lit from inside, the green staves flickering unevenly' },
  ] },
  // the ball's shadow (shadow25.js; 1 Nov, later, Andrew of GPT's A2 THE SHADOW LANDS FIRST: "I like the idea of an A2 shadow dig that")
  SH: { name: 'BALL SHADOW', opts: [
    { c: 1, name: 'STRAIGHT DOWN', desc: 'a dark spot right under the ball, over the grass, the wall and the seats' },
    { c: 2, name: 'LOW SUN', desc: 'an afternoon sun low in the southwest: the shadow runs out ahead of the ball and meets it where it lands' },
    { c: 3, name: 'OFF', desc: 'no shadow' },
  ] },
  TT: { name: 'PARK TAGS: TIE', def: 2, opts: [ // (1 Nov, later: "I think color only is sufficient for tags")
    { c: 1, name: 'LINE AND COLOR', desc: 'the number in its post\'s color (ICE for the zenith and the wall), and a dashed line from the tag to its point' },
    { c: 2, name: 'COLOR ONLY', desc: 'the number in its post\'s color, no line' },
    { c: 3, name: 'LINE ONLY', desc: 'a dashed line from the tag to its point, the number in its old color' },
    { c: 4, name: 'NEITHER', desc: 'as it was' },
  ] },
  // LANDING PARTY in the park (landing.js; 31 Oct, later: "show the top 5 other ones as like points on the map")
  LP: { name: 'LANDING PARTY MARKS', def: 16, opts: [ // (3 Nov, later: "Atom bomb little boy it is") // (1 Nov, later: "I like numbered pins for landing party the most"; 3 Nov: "I now don't want numbers at all")
    ...NUKE_MARK_LOOKS,
    { c: 8, name: 'LOUD PIN, POINTS', desc: 'the one in focus a tall orange stake with its number big; the other five a point where each came down (3 Nov)' },
    { c: 6, name: 'NUMBERED FLAGS', desc: 'the six on stakes with numbered flags; the one in focus orange and taller (1 Nov, his pick)' },
    { c: 1, name: 'DOTS', desc: 'the next five as dots where they came down; the one in focus lit, with its tag' },
    { c: 2, name: 'NUMBERED PINS', desc: 'the six on short stakes with their numbers in voxels; the one in focus orange' },
    { c: 7, name: 'SHORT PINS', desc: 'the numbered pins on stubs a third as tall, the numbers just over the spots (home stretch)' },
    { c: 3, name: 'FLAGS', desc: 'the next five as little orange-and-white flags' },
    { c: 4, name: 'TRAILS', desc: 'the next five as faint flights ending in dots' },
    { c: 5, name: 'HALO', desc: 'a faint ring round where all six came down, and a dot for each' },
  ] },
  // 1 Nov, evening (Andrew: no LANDED, the feet alone as a chunky voxel number over the spot, "give me like 5 options"): landnum25.js
  // BLAST RADIUS (heat25.js; 3 Nov, later: "Give me a ton of options on this, gradient colors, how to visualize it, you name it")
  // (4 Nov, evening, Andrew: "continue to give me options fire ice and fire, glacier, arctic, and dodgers"): the four, ARCTIC first (his favorite)
  BG: { name: 'BLAST RADIUS: COLORS', def: 30, opts: [30, 4, 24, 2].map((c) => GRADS.find((g) => g.c === c)) },
  FV: { name: 'BLAST RADIUS: THE FIELD', def: 4, opts: FIELDS }, // (4 Nov: "I like the wall line and warning track")
  SV: { name: 'BLAST RADIUS: THE SEATS', def: 1, opts: SEATS },
  BK: { name: 'BLAST RADIUS: CONTRAST', def: 2, opts: CONTRASTS }, // (4 Nov: "let me see what it looks like with more contrast")
  // 4 Nov, later (Andrew: "Def pillars for the seats - give me more options on how far they go up and down, how smooth they are")
  PH: { name: 'BLAST RADIUS: PILLAR HEIGHT', def: 2, opts: PILLAR_HEIGHTS },
  PS: { name: 'BLAST RADIUS: PILLAR SHAPE', def: 1, opts: PILLAR_SHAPES },
  PD: { name: 'BLAST RADIUS: WHICH STANDS TALL', def: 1, opts: PILLAR_WAYS },
  // 4 Nov, evening (GPT's red team: the pillars melt into the real seats; the front rows hide the back ones from down the middle; Andrew: "9a but give me options,
  // 10a sure but give me options again")
  PP: { name: 'BLAST RADIUS: PILLAR PAINT', def: 1, opts: PILLAR_PAINTS },
  CM: { name: 'BLAST RADIUS: CAMERA', def: 1, opts: BLAST_CAMS },
  BD: { name: 'BLAST RADIUS: THE BOMBS ARRIVE', def: 1, opts: BOMB_DROPS }, // (4 Nov, evening: the surprise round)
  // 4 Nov, night (Andrew: "Shaded sides great pick I love it, give me options for levels of shading"; CONTRAILS: "Yes to 1 for when you click on a player, as long
  // as it's not way too loud")
  PK: { name: 'BLAST RADIUS: SIDE SHADE', def: 2, opts: SIDE_SHADES },
  // 4 Nov, night: the park itself as the chart (stage25.js), off to start; 5 Nov: the light towers and the flight trails gone, the runners as lit bases
  GR: { name: 'ON BASE', def: 1, opts: RUNNER_LOOKS },
  // 5 Nov (Andrew: "make the line grey and then it turns orange as the ball flies over it ... give me some fun things for how the line goes from grey to orange")
  LF: { name: 'THE FLIGHT LINE: FILL', def: 2, opts: LINE_FILLS },
  // 5 Nov (Andrew picked crater, dogpile, a fault line, the Dodger fan on a stretcher, pinball, a black hole and a portal): the seat moments; the deck plays them all in
  // turn, a pick plays only that one so it can be looked at
  MO: { name: 'LANDING MOMENT', def: 1, opts: [['THE DECK', '', 'every seat moment in turn, shuffled'], ['PINATA', 'pinata', 'a donkey pinata swings down on a rope; the ball smashes it and candy rains down'], ['TINY TORNADO', 'tornado', 'a twister spins up out of the seat, carries the ball round and up, and throws it into the sky'], ['WHACK-A-MOLE', 'mole', 'the ball bounces up high and comes back down on a mole; he comes back up in a little Giants batting helmet'], ['JACK-IN-THE-BOX', 'jack', 'a box comes up, the lid flips and a clown head springs out with the ball in its open mouth'], ['HAND OF GOD', 'hand', 'a ray of light comes down out of a white cloud and a giant hand reaches down it and takes the ball'], ['THE BALL HATCHES', 'hatch', 'once the dust settles it swells into an egg, cracks, and a gull climbs out and flies off'], ['LIGHTNING ROD', 'zap', 'a rod shoots up, a bolt comes down onto it twice, the ball left smoking and glowing'], ['TOILET FLUSH', 'flush', 'a toilet comes up; the ball goes round the bowl and down'], ['CLAW MACHINE', 'claw', 'an arcade claw grabs it, drops it, grabs it again and hauls it off'], ['CRATER', 'crater', 'it lands like a meteor: the seats blow out into a smoking rim'], ['PINBALL', 'pinball', 'bumpers pop up out of the seats and it pings between them'], ['UFO', 'ufo', 'a saucer drops in and beams it up']].map(([name, kind, desc], i) => ({ c: i + 1, name, kind, desc })) },
  CN: { name: 'BLAST RADIUS: CONTRAILS', def: 1, opts: [{ c: 1, name: 'FAINT', desc: "a hairline for each of the player's home runs, bone, green and a touch brighter for the ones that go out here" }, { c: 2, name: 'ONLY THE GONE ONES', desc: 'only the ones that would go out here, in green' }, { c: 3, name: 'OFF', desc: 'no flights, only the bombs' }] },
  // 2 Nov, night (Andrew: "We can do better on voxel effects when it lands. I'd like the option for a scuba diver ... some oomph"): impact25.js
  LI: { name: 'LANDING IMPACT', def: 2, opts: IMPACTS },
  CV: { name: 'THE COVE', def: 3, opts: COVES },
  // 2 Nov, night (Andrew: "the arcs should feel like a probability cloud / frontier not just 2-5 arcs"): shotcaller.js
  // 3 Nov (Andrew: "semi opaque and eschew the voxel art in this instance ... Give me 5 different cloud options"): all five in the frontier's color and strength
  SA: { name: 'SHOT CALLER: THE WAYS IN', def: 1, opts: [
    { c: 1, name: 'RIBBONS', desc: 'a see-through tube for each way in, thicker and stronger the more common' },
    { c: 2, name: 'FOG', desc: 'soft round puffs wherever the ways go, densest where the most common do' },
    { c: 3, name: 'SHEET', desc: 'one see-through skin stretched across the ways, in order of launch angle' },
    { c: 4, name: 'HAIR', desc: 'a thin line for each way, like a long exposure' },
    { c: 5, name: 'CORE AND RIM', desc: 'the most common half of the swings as one strong band, the rest as faint threads round it' },
  ] },
  LN: { name: 'LANDING NUMBER', opts: LAND_LOOKS }, // 2 Nov (Andrew: "I want count up"; later: "count up directly over the ball and count up where it lands")
  // 2 Nov, later (Andrew: "pitch color until it's gone, after which I want to see both orange and the nuke color (geiger yeah?)"): the pitch color before the wall, always
  LC: { name: 'COUNT-UP COLOR', opts: [{ c: 1, name: 'ORANGE', desc: 'the pitch color (ICE) until the ball clears the wall, orange from there' }, { c: 2, name: 'GEIGER', desc: 'the pitch color (ICE) until the ball clears the wall, then the green of NUKE IT' }] },
  // 2 Nov (Andrew: "make sure we're using the same orange or families of orange everywhere"; later: "Give me 5 oranges"): which orange is THE orange (orange25.js), live
  OR: { name: 'THE ORANGE', opts: ANCHORS.map((a) => ({ c: a.c, name: a.name, desc: a.hex + ': ' + a.desc, hex: a.hex })) },
  // 1 Nov, evening (Andrew: "The foul poles are basically unseeable right now - could we make them white and/or orange and/or yellow?"): poles25.js
  FP: { name: 'FOUL POLES', def: 1, opts: POLE_LOOKS.map((l) => ({ c: l.c, name: l.name, desc: l.c === 4 ? 'an orange pole with a white screen down its fair side' : 'the pole and its screen in ' + l.name.toLowerCase() })) },
  // the dojo's drawings on the left (pixctl25.js), five each, his picks first (31 Oct, later: RUNNING, GROUND RAY, DIAMOND, UPRIGHT, WIND PAD)
  ...Object.fromEntries([['CS', 'ev', 'SPEED', 4], ['CA', 'la', 'ANGLE', 1], ['CD', 'dir', 'AIM', 2], ['CT', 'temp', 'AIR', 4], ['CW', 'wind', 'WIND', 1]].map(([L2, k, w, def]) => [L2, { name: 'DOJO ' + w, def, opts: DESIGNS[k].map((n, i) => ({ c: i + 1, name: n, desc: 'the ' + w.toLowerCase() + ' control on the left (J8, J3, J5 to J7)' })).sort((a, b) => (b.c === def) - (a.c === def)) }])),
}
// an icon as one path per color, px a 16th of its width (the 16 grid ones and the 24 grid ones come out the same size); ink and its shadow can be CSS colors
const nukeSVG = (n, px = 3, ink = '#0b0b0b', shade) => {
  const rows = (NUKE_ICONS[n] ?? NUKE_ICONS[3]).rows, N = rows[0].length, C = { '#': ink, d: shade ?? `color-mix(in srgb,${ink} 52%,#000)`, k: '#0b0b0b', g: '#5a5f68', w: '#f4f2ea', r: '#e4002b', R: '#8c0a1e', y: '#ffd23f', o: ORANGE.o, O: ORANGE.dark }, P = {}
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (C[ch]) P[ch] = (P[ch] ?? '') + `M${i} ${j}h1v1h-1z` }))
  return `<svg class="nki" width="${16 * px}" height="${16 * px}" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-hidden="true">${Object.entries(P).map(([ch, d]) => `<path style="fill:${C[ch]}" d="${d}"/>`).join('')}</svg>`
}
const ORDER = ['L', 'P', 'A', 'T', 'F', 'I', 'R', 'Y', 'S', 'K', 'B', 'V', 'Z', 'H', 'U', 'D', 'M', 'X', 'E', 'N', 'J', 'W', 'Q', 'C', 'O', 'G']
// locked 28 Oct, night (Andrew): these are set and leave the mixer; a code can still load another value (the tests do), but the dock and the header show only what is open.
// 29 Oct: U2 PIXEL LINE, D1 PIXEL SLUGGER, M1 STACKED too
// 29 Oct, later: X2 (the arc dots in the pitch color) and E1 (the stitches in the pitch color) as well
// 29 Oct, evening: Y3 ICE, N1, J2, W1, Q2 (with a voxel clock), C1 GLASS
// 29 Oct, later still: G2 RELIEF and O2 BOX SCORE / FRONT OFFICE / NO LIFE
// 1 Nov, evening (Andrew: "no more options"): V5 LOWER BOWL and J8 BIG ARCS, what he has been looking at, so the header's MIX goes
const LOCKED = { L: 2, P: 5, A: 2, T: 16, F: 1, I: 2, R: 3, S: 1, K: 1, B: 12, Z: 1 /* 5 Nov: STILL, the push killed */, H: 1, U: 2, D: 1, M: 1, X: 2, E: 1, Y: 3, N: 1, W: 1, Q: 2, C: 1, G: 2, O: 2, V: 5, J: 8 }
// and the lab's settled ones (1 Nov, evening: "falling atom bomb fucking spectacular", GEIGER, OUTLINE FILLS ON HOVER, STRAIGHT DOWN, ONE AT A TIME, LIVING BOTTLE,
// COLOR ONLY, NUMBERED PINS, MERCURY TOWER, GIANTS PENNANT, QUIET BOARD, his dojo drawings): they win over a stored lab; a ?lab= code still loads another (the tests)
// 2 Nov: FP4, ORANGE AND WHITE foul poles ("Orange and white foul poles")
const LAB_LOCK = { OR: 3 /* 2 Nov: SAFETY ORANGE ("giants orange is reading as too red") */, LN: 2 /* OVER THE BALL ("that shit is sick") */, LC: 2 /* GEIGER */, FP: 4, BI: 3, BC: 2, BS: 2, SH: 1, TF: 3 /* 2 Nov, later: "zenith and cleared the wall show up when you hover over that cube and that's it" */, CB: 2, TT: 2, /* LP open again (2 Nov, home stretch: SHORT PINS to try; NUMBERED PINS stays the default) */ TH: 1, SK: 4, TG: 5, CS: 4, CA: 1, CD: 2, CT: 4, CW: 1,
  // 3 Nov, later (Andrew: "You can lock everything else now that we've already decided on and take those out of options"): the slingshot, LITTLE BOY, BIG IMPACT, the Cove
  // either way, Shot Caller's RIBBONS
  SL: 5, LP: 16 /* "Atom bomb little boy it is" */, LI: 2, CV: 3, SA: 1 /* "I like ribbons" */,
  // 4 Nov, later: BLAST RADIUS's settled ones ("Love track and wall"; "Def pillars for the seats"; "Down for stretched")
  FV: 4, SV: 2, BK: 2,
  // 4 Nov, later ("I like blocky pillars, and yes to easy stands tall"); 4 Nov, night ("I still like arctic the most"; "Still a fan of medium book that"; "Shaded
  // sides great pick I love it"; "Bombing run for sure, yep to chronologically"; "I like the down the middle angle but needs to be way more zoomed out")
  PS: 1, PD: 1, BG: 30, PH: 2, PP: 4, BD: 1,
  // 5 Nov ("as first shown on shading"); the camera open again, with views that each show the whole park; "Love ripple for the flight line nice job"
  PK: 2, LF: 2 }
const OPEN = ORDER.filter((k) => !(k in LOCKED))
// 1 Nov, night (Andrew: "dinger deja vu, dinger dojo, shot caller, wallop witness. I think those are the 4 marquee modes and everything else slots within those"; "keys 1-4
// more modes and esc still pulls the menu up"): the four, in order, as tabs across the header; Wallop Witness is a panel over the park, the other three are modes
// 3 Nov, later (Andrew: "we need more fun names than heatmap - this now feels to me like its whole own mode"): BLAST RADIUS, the fifth, is the dojo's air with the heat map on
const TABS = [['replay', 'DINGER DÉJÀ-VU'], ['whatif', 'DINGER DOJO'], ['shot', 'SHOT CALLER'], ['witness', 'WALLOP WITNESS'], ['blast', 'BLAST RADIUS']]
const HDR_AX = OPEN // what is still open sits in the header
// 30 Oct (Andrew: "how do I tweak options now"): the dock lists every choice, open ones first, then the locked ones (marked); trying a locked one lasts until a reload
const DOCK = [...OPEN, ...Object.keys(LAB).filter((k) => !(k in LAB_LOCK))] // (31 Oct, later: only what is open, and the lab; 1 Nov, evening: the lab's open ones)
const DEF = { ...Object.fromEntries(OPEN.map((k) => [k, AXES[k].opts[0].c])), ...LOCKED } // an open choice starts at its first option
// the calling card in WALLOP WITNESS (2 Nov, night): the emblem in crisp pixels beside the tag, on YOUR GAMES and on every row of the stand
const CARD_CSS = `
#cp .c25 .wemb{image-rendering:pixelated;display:inline-block;vertical-align:middle;border:1px solid var(--tx);flex:none;box-shadow:2px 2px 0 var(--e)}
#cp .c25 .wemb.none{border-style:dashed;border-color:var(--dim);box-shadow:none}
#cp .c25 .ww .wcard{flex-wrap:wrap;row-gap:6px}
#cp .c25 .ww .wcc{display:inline-flex;align-items:center;gap:10px;color:var(--tx)}
#cp .c25 .ww .wcc b{font-family:var(--tf),monospace;font-weight:400;font-size:calc(22px * var(--ts));text-transform:none;color:var(--acc)}
#cp .c25 .ww .wrn{display:flex;align-items:center;gap:8px;min-width:0}
#cp .c25 .ww .wrn em{font-style:normal;text-transform:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cp .c25 .ww.wcd{display:flex;justify-content:center}
`
// 2 Nov, night (Andrew: "I looked at this on a small laptop screen and it absolutely fucking fried it ... for a small laptop screen we need SOMETHING better"): under
// 1500 by 820 (and over the phone layout's 900 wide) the cockpit goes COMPACT (class cmp): the type scales down with the screen (to 0.8 at most), the rails narrow so
// the park keeps its room, and the park's readout, the verdict chip, the ball chooser and NUKE IT shrink; under 700 tall (cmp2) the readout keeps one comparison
const compactK = () => (innerWidth < 900 || (innerWidth >= 1500 && innerHeight >= 820) ? 1 : Math.max(0.8, Math.min(1, innerWidth / 1600, innerHeight / 880)))
const optOf = (k, c) => AXES[k].opts.find((o) => o.c === c) ?? AXES[k].opts[0]
export function parseMix(s) {
  const m = { ...DEF }
  for (const [, k, n] of (s ?? '').toUpperCase().matchAll(/([A-Z])(\d+)/g)) if (AXES[k]?.opts.some((o) => o.c === Number(n))) m[k] = Number(n)
  return m
}
export const mixCode = (m) => ORDER.map((k) => k + m[k]).join(' ')

// ---- layouts: the park takes the most room in every one; the dojo adds the number strip as a last row, the replay has none (class ns) ----
const RAIL = 'clamp(280px,19vw,380px)', RAIL2 = 'clamp(300px,21vw,420px)'
const LAY = {
  1: { cols: `${RAIL} minmax(0,1fr) ${RAIL2}`, rows: ['48px', 'minmax(0,.62fr)', 'minmax(0,.38fr)', 'minmax(0,1fr)'], areas: ['hdr hdr hdr', 'batter park hists', 'slice park hists', 'slice park pitch'] },
  2: { cols: `${RAIL2} minmax(0,1fr) ${RAIL}`, rows: ['48px', 'minmax(0,.62fr)', 'minmax(0,.38fr)', 'minmax(0,1fr)'], areas: ['hdr hdr hdr', 'pitch park batter', 'pitch park hists', 'slice park hists'] },
  3: { cols: 'minmax(0,.72fr) minmax(0,1.2fr) minmax(0,1.1fr) minmax(0,1.2fr)', rows: ['48px', 'minmax(0,2.25fr)', 'minmax(0,1fr)'], areas: ['hdr hdr hdr hdr', 'park park park park', 'batter pitch slice hists'] },
}
const LAYOUT_CSS = `
#cp .c25{position:absolute;inset:10px;display:grid;gap:14px}
#cp .c25>.hdr{grid-area:hdr}#cp .c25>.park{grid-area:park}#cp .c25>.pitch{grid-area:pitch}#cp .c25>.batter{grid-area:batter}#cp .c25>.slice{grid-area:slice}#cp .c25>.hists{grid-area:hists}#cp .c25>.strip{grid-area:strip}
#cp .c25.ns>.strip{display:none}
#cp .c25.ns .tly{display:none}
` + Object.entries(LAY).map(([n, L]) => {
  const w = L.areas[0].split(' ').length, strip = Array(w).fill('strip').join(' '), q = (a) => a.map((x) => `"${x}"`).join(' ')
  // the dojo has no batter card (30 Oct, later, Andrew: "in dinger dojo you don't need the top right at all anymore. You can kill the your swing / the slugger"): its
  // cell goes to the panel under it (or over it)
  const noBat = L.areas.map((row, r) => row.split(' ').map((a, c) => (a === 'batter' ? L.areas[r + 1]?.split(' ')[c] ?? L.areas[r - 1]?.split(' ')[c] ?? a : a)).join(' '))
  return `#cp .c25.L${n}{grid-template-columns:${L.cols};grid-template-rows:${L.rows.join(' ')} 84px;grid-template-areas:${q([...L.areas, strip])}}\n#cp .c25.L${n}.ns{grid-template-rows:${L.rows.join(' ')};grid-template-areas:${q(L.areas)}}\n@media (min-width:900px){#cp .c25.L${n}.wi:not(.ns){grid-template-areas:${q([...noBat, strip])}}#cp .c25.L${n}.wi.ns,#cp .c25.L${n}.shot{grid-template-areas:${q(noBat)}}}`
}).join('\n') + '\n@media (min-width:900px){#cp .c25.wi .pnl.batter,#cp .c25.shot .pnl.batter{display:none}}'
  + `\n@media (min-width:900px){#cp .c25.cmp.L1{grid-template-columns:clamp(236px,18vw,380px) minmax(0,1fr) clamp(262px,19vw,420px)}#cp .c25.cmp.L2{grid-template-columns:clamp(262px,19vw,420px) minmax(0,1fr) clamp(262px,18vw,380px)}#cp .c25.c25.cmp{inset:6px;gap:8px}}` // (2 Nov, night: COMPACT) // (desktop only: the phone keeps its card tabs; 31 Oct, Andrew: "no stand in batter - kill that whole area completely for dojo": the dojo with its controls top left as well)
const FRAME_CSS = `
#cp .c25 .pnl{overflow:visible}
#cp .c25.P1 .pnl>.t{top:-6px}
#cp .c25.P5 .pnl{border-color:transparent;background:
  linear-gradient(var(--tx),var(--tx)) top left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) top right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top right/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom right/1px 14px no-repeat,var(--k)}
#cp .c25.P5 .pnl.park{background:
  linear-gradient(var(--tx),var(--tx)) top left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) top right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top right/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom right/1px 14px no-repeat}
#cp .c25.P5 .pnl>.t{top:6px;left:12px;background:transparent;color:var(--dim);padding:0}
#cp .c25 .pnl>.t.ic{line-height:0;padding:0 5px}
#cp .c25 .pnl>.t.ic .ico{display:block}
#cp .c25.P1 .pnl>.t.ic{top:-8px}
#cp .c25.P5 .pnl>.t.ic{top:5px;padding:0;color:var(--tx)}
`
// phones (under 900 px wide): the park on top, a tab row choosing one card under it, the number strip in two rows in the dojo only
const PHONE_CSS = `
#cp .c25>.ptabs{display:none}
@media (max-width:900px){
#cp .c25.c25{inset:6px;gap:8px;grid-template-columns:minmax(0,1fr);grid-template-rows:48px minmax(0,1.25fr) 26px minmax(0,1fr) 104px;grid-template-areas:"hdr" "park" "ptabs" "card" "strip"}
#cp .c25.c25.ns{grid-template-rows:48px minmax(0,1.25fr) 26px minmax(0,1fr);grid-template-areas:"hdr" "park" "ptabs" "card"}
#cp .c25.c25>.batter,#cp .c25.c25>.slice,#cp .c25.c25>.hists,#cp .c25.c25>.pitch{grid-area:card;display:none;z-index:1}
#cp .c25.c25[data-card="batter"]>.batter,#cp .c25.c25[data-card="hists"]>.hists,#cp .c25.c25[data-card="pitch"]>.pitch{display:block}
#cp .c25.c25[data-card="slice"]>.slice{display:grid}
#cp .c25>.ptabs{grid-area:ptabs;display:flex;gap:6px;align-items:stretch}
#cp .c25>.ptabs .bt{flex:1;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 3px 0 var(--e);pointer-events:auto}
#cp .c25 .hdr .lt>.ps,#cp .c25 .hdr .mx[data-ax],#cp .c25 .hdr #c25vw{display:none}
#cp .c25 .hdr .h2{overflow-x:auto;overflow-y:hidden;gap:14px;scrollbar-width:none}
#cp .c25 .rd{max-width:57%;left:10px;top:12px}
#cp .c25 .rd .big{font-size:calc(44px * var(--ts))}
#cp .c25 .rd .big i{font-size:calc(18px * var(--ts))}
#cp .c25 .rd .sub,#cp .c25 .rd .lbl{font-size:calc(14px * var(--ts));white-space:normal}
#cp .c25 .rd .gn{font-size:calc(14px * var(--ts))}
#cp .c25 .rd .meter s{width:7px;height:12px}
#cp .c25 .chip{right:8px;top:10px;max-width:36%;padding:5px 8px}
#cp .c25 .rd .vd{display:none}#cp .c25 .chip .hd,#cp .c25 .chip .sb{display:block}#cp .c25 .chip:not(.has),#cp .c25 .chip.has{display:block;border:1px solid var(--tx);background:var(--k);padding:5px 8px} /* (3 Nov: phones keep the verdict in its chip; the readout has no room for it) */
#cp .c25 .chip .hd{font-size:calc(17px * var(--ts))}
#cp .c25 .chip .sb{font-size:calc(12px * var(--ts))}
#cp .c25 .bsel,#cp .c25.c25.ns .bsel{left:8px;right:8px;bottom:52px;font-size:calc(13px * var(--ts))} /* (phones: the chooser over the button, full width) */
#cp .c25 .nuke{right:6px;bottom:6px;height:40px;min-width:0;padding:0 8px;gap:6px}#cp .c25 .nuke b{font-size:11px}#cp .c25 .nuke i{display:none}#cp .c25 .nuke .nkw{width:24px;height:30px}#cp .c25 .nuke .nkw svg{width:auto;height:24px}
#cp .c25 .bsel .bt{padding:3px 6px}
#cp .c25 .tly{display:none}
#cp .c25.c25.c25 .park .bug.bug{display:none}
#cp .c25.S1 .batter .bugc.on,#cp .c25.S3 .batter .bugc.on{display:grid}
#cp .c25 .pnl>.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 24px)}
#cp .c25 .hists .hsw{top:4px}
#cp .c25 .strip .bt .ps{display:block;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c25 .strip{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:6px}
#cp .c25 .strip .bt{padding:4px 26px 14px 6px}#cp .c25 .strip .bt .sld{left:6px;right:26px;bottom:2px}
#cp .c25 .strip .bt b{font-size:calc(17px * var(--ts))}
#cp .c25 .strip .bt .ud{right:3px;gap:2px}
#cp .c25 .strip .bt .ud i{width:16px;height:13px;line-height:11px}
#cp .c25 .strip .bt.hot{grid-column:3;grid-row:2}
#cp .c25 .mod .box{padding:30px 12px 14px;max-width:96vw}
#cp .c25 .bul,#cp .c25 .bay{min-width:0}
#cp .c25 .bcards{grid-template-columns:repeat(2,minmax(0,1fr))}
#cp .c25 .btab .r{grid-template-columns:minmax(0,1fr) 40px 44px 40px 40px 46px 64px;gap:6px;font-size:calc(13px * var(--ts))}
#cp .c25 .bayt .r{grid-template-columns:44px 40px 46px 56px 60px 56px 1fr;gap:4px;font-size:calc(13px * var(--ts))}
#cp .c25 .legend,#cp .c25 .allst,#cp .c25 .tys{grid-template-columns:minmax(0,1fr)}
#cp .c25 .ddbig{font-size:calc(34px * var(--ts))}
#cp .c25 .banner{font-size:22px}
#cp .c25.c25.ns.dj{grid-template-rows:48px minmax(0,1.25fr) 26px minmax(0,1fr) 104px;grid-template-areas:"hdr" "park" "ptabs" "card" "strip"}
#cp .c25.c25.ns.dj>.strip{grid-area:strip;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));padding:0}
#cp .c25.c25.dj>.strip::before{display:none}
#cp .c25.c25.dj>.strip .bt{flex-direction:column;align-items:stretch;padding:4px 26px 14px 6px}
#cp .c25.c25.dj>.strip .bt .ps{width:auto}
#cp .c25.c25.dj>.strip .bt b{text-align:left}
#cp .c25.c25.ns.dj .bsel{right:8px}
#cp .c25.c25.ns.dj .tly{display:none}
}
`
const TYPE_CSS = TYPE_FONTS + `
#cp .c25{font-family:var(--tf),monospace;font-size:calc(20px * var(--ts));letter-spacing:var(--sp,.02em)}
#cp .c25 .ps,#cp .c25 .pnl>.t,#cp .c25 .hdr .bt,#cp .c25 .hdr .grp,#cp .c25 .mod h3,#cp .c25 .allst h5,#cp .c25 .strip .bt .ps,#cp .c25 .mx,#cp .c25 .hsw .bt{font-family:var(--lf),monospace;font-size:var(--lsz);font-weight:var(--lw,400);line-height:1.25}
#cp .c25 .strip .bt.hot b{font-family:var(--lf),monospace;font-size:calc(var(--lsz) * 1.9)}
#cp .c25 .num,#cp .c25 .rd .big.num{font-family:var(--nf),monospace;font-weight:var(--nw,400)}
#cp .c25 svg text{font-family:var(--tf),monospace}
`

export async function build(root, api, U) {
  const { css, loadParks, evalParks, windowSync } = U
  const BASE = `
#cp .c25 .hdr{display:grid;grid-template-rows:22px 22px;gap:4px;min-width:0}
#cp .c25 .hdr .h1{display:flex;justify-content:space-between;align-items:center;gap:12px;white-space:nowrap;min-width:0}
#cp .c25 .hdr .h2{display:flex;justify-content:flex-start;align-items:center;gap:22px;white-space:nowrap;min-width:0}
#cp .c25 .hdr .tabs{display:flex;gap:8px}
#cp .c25 .hdr .tab{display:inline-flex;align-items:center;gap:7px;padding-right:10px}
#cp .c25 .hdr .tab kbd{font:inherit;font-size:.8em;color:var(--dim);border:1px solid currentColor;padding:0 4px;line-height:1.2}
#cp .c25 .hdr .tab.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .hdr .tab.on kbd{color:var(--k)}
#cp .c25 .bsel .bt.ball{border-color:var(--acc)}
#cp .c25.shot:not(.called) #c25rd,#cp .c25.shot:not(.called) #c25v{visibility:hidden}
@media (max-width:700px){#cp .c25 .bsel select,#cp .c25 .bsel .bt.ball{display:none}#cp .c25 .bsel .r1:not(:has(> :not(.ball))){display:none}}
#cp .c25 .bsel select{font:inherit;font-size:.92em;background:var(--k);color:var(--tx);border:1px solid var(--tx);padding:1px 4px;margin:0 6px;pointer-events:auto;cursor:pointer;max-width:12em}
#cp .c25 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c25 .hdr .grp{display:flex;gap:6px;align-items:center;color:var(--dim)}
@media (max-width:1500px){#cp .c25 .hdr .h2 .gl{display:none}#cp .c25 .hdr .h2{gap:10px}}
@media (max-width:1400px){#cp .c25 .hdr .bt{padding:0 6px}#cp .c25 .hdr .h1 .grp{gap:4px}#cp .c25 .hdr .rt{gap:10px}}
#cp .c25 .zg.anim .pb{animation:c25pin .5s steps(8) both;transform-box:fill-box;transform-origin:center}
@keyframes c25pin{from{transform:translate(var(--dx),var(--dy)) scale(.15)}to{transform:none}}
#cp .c25 .sfig.anim .sb,#cp .c25 .sfig.anim .sl,#cp .c25 .zg.anim .pa{animation:c25app .01s steps(1) both}
#cp .c25 .zg.anim .pa{animation-delay:.5s}
#cp .c25 .sfig.anim .sb{animation-delay:.5s}
#cp .c25 .sfig.anim .sl{animation-delay:.62s}
@keyframes c25app{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){#cp .c25 .zg.anim .pb,#cp .c25 .sfig.anim .sb,#cp .c25 .sfig.anim .sl,#cp .c25 .zg.anim .pa{animation:none}}
#cp .c25 .hdr .bt{height:19px;padding:0 8px;display:inline-flex;align-items:center;line-height:1;box-shadow:0 3px 0 var(--e)}
#cp .c25 .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c25 .hdr .bt.mx{padding:0 6px;min-width:28px;justify-content:center}
#cp .c25 .hdr #c25mn{background:var(--acc);color:var(--k);border-color:var(--acc);gap:6px}
#cp .c25 .hdr kbd{font-family:inherit;font-size:.8em;line-height:1;border:1px solid var(--k);padding:1px 3px}
#cp .c25 .hdr .lt{display:flex;align-items:center;gap:12px;min-width:0;position:relative}
#cp .c25 .hdr #c25ti{cursor:pointer;pointer-events:auto;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .hdr .lt{position:relative}
#cp .c25 .hdr .mhint{position:absolute;left:calc(100% + 14px);top:-1px;z-index:5;background:var(--acc);color:var(--k);font-family:PS2P,monospace;font-size:9px;padding:5px 7px;white-space:nowrap;display:none;pointer-events:none;box-shadow:3px 3px 0 var(--tx)}
#cp .c25 .hdr .mhint.go{display:block;animation:c25mh 4s steps(4) 1 forwards}
@keyframes c25mh{0%,80%{opacity:1}100%{opacity:0}}
#cp .c25 .mx.ch{border-color:var(--acc);color:var(--acc)}
#cp .c25 .win{pointer-events:none}
#cp .c25 .rd{position:absolute;left:18px;top:14px;pointer-events:none;max-width:calc(100% - 320px)}
#cp .c25 .rd .big{font-size:70px;line-height:.9;display:block;white-space:nowrap}
#cp .c25 .rd .big i{font-style:normal;font-size:26px;color:var(--dim)}
#cp .c25 .rd .lbl{display:block;color:var(--dim);font-size:16px;margin-top:2px}
#cp .c25 .rd .sub{display:block;color:var(--dim);font-size:18px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .lpr[data-n]{cursor:pointer}
#cp .c25 .lpr[data-n]:hover b,#cp .c25 .lpr[data-n]:focus b,#cp .c25 .lpr.pt b{color:var(--acc)}
#cp .c25 .lpr[data-n]:hover .nm,#cp .c25 .lpr[data-n]:focus .nm,#cp .c25 .lpr.pt .nm{text-decoration:underline}
#cp .c25 .rd.pick>*{display:none}#cp .c25 .rd.pick::before{content:'PICK A SEAT';display:block;font-family:PS2P,monospace;font-size:26px;color:var(--tx)}#cp .c25 .rd.pick::after{content:'CLICK ONE IN THE PARK, OR TYPE IT TOP LEFT';display:block;margin-top:10px;color:var(--dim)}#cp .c25 .chip.pick{display:none}
#cp .c25 .rd .gn{color:var(--acc);font-size:18px;margin-top:6px;pointer-events:auto;cursor:pointer;display:inline-block}
#cp .c25 .rd .fun{color:var(--tx);font-size:16px;margin-top:4px;max-width:620px;line-height:1.2}
#cp .c25 .rd .fun span{display:block}
@media (max-width:900px){#cp .c25 .rd .fun{font-size:12px}}
@media (max-width:420px){#cp .c25 .rd .fun span+span{display:none}} /* the narrowest phones keep the distance line only: two lines ran into the ball chooser */
#cp .c25 .rd .sub,#cp .c25 .rd .lbl,#cp .c25 .rd .gn,#cp .c25 .rd .fun{background:color-mix(in srgb,var(--k) 86%,transparent);width:fit-content;max-width:100%;padding-right:6px;box-sizing:border-box} /* readable over the park and the board */
#cp .c25 .rd .fun.typed{animation:c25ty 1.1s steps(28) both}
@keyframes c25ty{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@media (prefers-reduced-motion:reduce){#cp .c25 .rd .fun.typed{animation:none}}
#cp .c25 .rd .meter{display:flex;gap:3px;margin-top:8px;align-items:center}
#cp .c25 .rd .meter s{display:block;width:12px;height:16px;border:1px solid var(--tx);text-decoration:none}
#cp .c25 .rd .meter s.on{background:var(--acc);border-color:var(--acc)}
#cp .c25 .rd .meter em{font-style:normal;margin-left:10px;font-size:22px}
#cp .c25 .chip{position:absolute;right:14px;top:14px;max-width:300px;padding:8px 12px;background:var(--k);border:1px solid var(--tx);text-align:right;pointer-events:none}
#cp .c25 .chip .hd{font-size:24px;line-height:1}
#cp .c25 .chip.hr .hd{color:var(--acc)}
#cp .c25 .chip.hr.done .hd{color:var(--nk)}#cp .c25 .chip.hr.done{border-color:var(--nk)}
#cp .c25 .pnl.p,#cp .c25 .ptabs,#cp .c25 .strip,#cp .c25 .bsel,#cp .c25 .tly,#cp .c25 .bug,#cp .c25 .rd,#cp .c25 .chip{transition:opacity .35s}
#cp .c25.quiet .pnl.p,#cp .c25.quiet .ptabs,#cp .c25.quiet .strip,#cp .c25.quiet .bsel,#cp .c25.quiet .tly,#cp .c25.quiet .bug,#cp .c25.quiet .rd,#cp .c25.quiet .chip{opacity:.1}
#cp .c25 .nuke.dorm{opacity:.35;filter:grayscale(1)}
#cp .c25 .bt.hot.dim{opacity:.4}
#cp .c25 .chip .sb{font-size:15px;color:var(--dim);margin-top:3px}
#cp .c25 .chip .st{display:inline-block;margin-top:8px;font-family:PS2P,monospace;font-size:12px;letter-spacing:.04em;background:var(--acc);color:var(--k);padding:5px 7px;transform:rotate(-3deg)}
#cp .c25 .rd .sit{color:var(--tx);font-size:15px;margin-top:6px}
#cp .c25 .rd .vd{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}
#cp .c25 .rd .vd .vh{font-weight:400;font-size:calc(26px * var(--ts));line-height:1;color:var(--tx)}
#cp .c25 .rd .vd.hr .vh{color:var(--acc)}
#cp .c25 .rd .vd.hr.done .vh{color:var(--nk)}
#cp .c25 .rd .vd .vs{font-style:normal;font-size:calc(14px * var(--ts));color:var(--dim)}
#cp .c25 .chip .hd,#cp .c25 .chip .sb{display:none}
#cp .c25 .chip:not(.has){display:none}
#cp .c25 .chip.has{border:0;background:transparent;padding:0}
#cp .c25 .chip .st{margin-top:0}
@media (min-width:900px){
#cp .c25.cmp .rd{left:12px;top:10px;max-width:calc(100% - 250px)}
#cp .c25.cmp .rd .big{font-size:50px}#cp .c25.cmp .rd .big i{font-size:19px}
#cp .c25.cmp .rd .lbl{font-size:13px}#cp .c25.cmp .rd .sub,#cp .c25.cmp .rd .gn{font-size:14px;margin-top:3px}#cp .c25.cmp .rd .sit{font-size:13px;margin-top:4px}
#cp .c25.cmp .rd .fun{font-size:13px;max-width:460px;margin-top:3px}#cp .c25.cmp2 .rd .fun span+span{display:none}
#cp .c25.cmp .rd .meter{margin-top:5px}#cp .c25.cmp .rd .meter s{width:8px;height:11px}#cp .c25.cmp .rd .meter em{font-size:16px;margin-left:8px}
#cp .c25.cmp .chip{right:10px;top:10px;padding:5px 9px;max-width:230px}#cp .c25.cmp .chip .hd{font-size:19px}#cp .c25.cmp .chip .sb{font-size:12px}#cp .c25.cmp .chip .st{font-size:10px;margin-top:5px}
#cp .c25.cmp .bug{right:10px;transform:scale(.86);transform-origin:top right}
#cp .c25.cmp .bsel,#cp .c25.cmp.ns .bsel{left:12px;bottom:8px;right:180px;font-size:13px;gap:3px}#cp .c25.cmp .bsel .bt{padding:2px 6px}
#cp .c25.cmp .nuke{right:10px;bottom:8px;height:44px;min-width:160px;padding:0 10px 0 8px;gap:8px}#cp .c25.cmp .nuke b{font-size:13px}#cp .c25.cmp .nuke .nkw{width:30px;height:32px}#cp .c25.cmp .nuke .nkw svg{height:26px;width:auto}#cp .c25.cmp .nuke i{margin-bottom:5px}
}
#cp .c25 .bsel{position:absolute;left:18px;bottom:12px;right:236px;display:grid;gap:4px;font-size:17px}
#cp .c25.ns .bsel{right:236px}
#cp .c25 .nuke{position:absolute;right:16px;bottom:12px;height:58px;min-width:204px;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:0 16px 0 12px;background:var(--nkbg,var(--nk,#dee000));color:var(--nktx,#0b0b0b);--nki:var(--nktx,#0b0b0b);cursor:pointer;pointer-events:auto;z-index:3;user-select:none;box-shadow:inset 0 0 0 var(--nkb,0px) var(--nkc,transparent),4px 4px 0 color-mix(in srgb,var(--nk,#dee000) var(--nksh,35%),#000);transition:transform .08s,box-shadow .08s}
/* 1 Nov (Andrew: "the button is just so lurid - can we tone it down just a little? Maybe only have the button outlined by that"; "It should just raise like the other buttons - no wiggling"): five ways to wear the color (NUKE IT: BUTTON in THE LAB) */
#cp .c25 .nuke.nk1,#cp .c25 .nuke.nk2{--nkbg:#0d0f0c;--nktx:var(--nk);--nkb:2px;--nkc:var(--nk);--nksh:22%}
#cp .c25 .nuke.nk2:hover{--nkbg:var(--nk);--nktx:#0b0b0b}
#cp .c25 .nuke.nk3{--nkbg:color-mix(in srgb,var(--nk) 15%,#0b0b0b);--nktx:var(--nk);--nkb:2px;--nkc:color-mix(in srgb,var(--nk) 55%,#000);--nksh:18%}
#cp .c25 .nuke.nk4{--nkbg:#0d0f0c;--nktx:var(--nk);--nkb:1px;--nkc:#3a3f46;--nksh:0%}
#cp .c25 .nuke:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 var(--nkb,0px) var(--nkc,transparent),4px 6px 0 color-mix(in srgb,var(--nk,#dee000) var(--nksh,35%),#000)}
#cp .c25 .nuke b{font-family:PS2P,monospace;font-weight:400;font-size:17px;letter-spacing:.02em;white-space:nowrap}
#cp .c25 .nuke i{font-style:normal;font-family:var(--lf),monospace;font-size:10px;opacity:.6;align-self:flex-end;margin:0 0 8px auto}
#cp .c25 .nuke .nkw{display:flex;align-items:center;justify-content:center;width:42px;height:42px;flex:none}
#cp .c25 .nuke.go{transform:translate(3px,3px);box-shadow:inset 0 0 0 var(--nkb,0px) var(--nkc,transparent),1px 1px 0 color-mix(in srgb,var(--nk,#dee000) var(--nksh,35%),#000)}
#cp .c25 .nuke:focus-visible{outline:2px solid var(--tx);outline-offset:3px}
@media (prefers-reduced-motion:reduce){#cp .c25 .nuke,#cp .c25 .nuke:hover{transition:none}}
#cp .c25 .strip .bt.hot{display:none}
#cp .c25 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c25 .bsel .r2{color:var(--dim);background:var(--k);justify-self:start;padding:1px 4px 1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c25.wi .bsel .r2{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2} /* (1 Nov: the result came last and was the part cut off) */
#cp .c25 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c25 .bsel .bt.hot{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .tly{position:absolute;right:16px;bottom:80px;width:170px;font-size:15px;display:grid;gap:1px;pointer-events:none;text-align:right}
#cp .c25 .tly div{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .tly div.n{color:var(--acc)}
#cp .c25 .tly .c{color:var(--tx)}
#cp .c25 .tly .c span{color:var(--dim)}
#cp .c25 .cflash{position:absolute;inset:0;background:var(--tx);opacity:0;pointer-events:none}
#cp .c25 .cflash.go{animation:c25fl .16s steps(2) 1}
@keyframes c25fl{0%{opacity:.22}100%{opacity:0}}
#cp .c25 .banner{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-family:PS2P,monospace;font-size:34px;color:var(--k);background:var(--acc);padding:12px 18px;white-space:nowrap;pointer-events:none;display:none;box-shadow:6px 6px 0 var(--tx)}
#cp .c25 .banner.go{display:block;animation:c25bn 2.6s steps(6) 1 forwards}
#cp .c25 .banner i{font-style:normal;display:block;font-size:.42em;margin-top:8px;text-align:center}
@keyframes c25bn{0%{transform:translate(-50%,-50%) scale(.4)}12%{transform:translate(-50%,-50%) scale(1.08)}20%{transform:translate(-50%,-50%) scale(1)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1)}}
@media (prefers-reduced-motion:reduce){#cp .c25 .banner.go{animation:none}#cp .c25 .cflash.go{animation:none}}
#cp .c25 .batter{container-type:size}
#cp .c25 .batter .bin{position:absolute;inset:24px 12px 8px;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;gap:4px}
#cp .c25 .bug{position:absolute;right:14px;top:100px;max-width:calc(100% - 28px);background:var(--k);border:1px solid var(--tx);padding:6px 9px;display:none;gap:5px;pointer-events:none;font-size:15px;line-height:1.1}
#cp .c25.S1 .park .bug.on{display:grid}
#cp .c25 .bug .br1{display:flex;align-items:center;gap:9px;white-space:nowrap}
#cp .c25 .bug .inn{font-family:PS2P,monospace;font-size:10px}
#cp .c25 .bug .dia{display:block;flex:none}
#cp .c25 .bug .outs{display:flex;gap:3px}
#cp .c25 .bug .outs i{display:block;width:7px;height:7px;border:1px solid var(--tx);border-radius:50%}
#cp .c25 .bug .outs i.on{background:var(--acc);border-color:var(--acc)}
#cp .c25 .bug .sc b{font-weight:400;color:var(--dim)}
#cp .c25 .bug .sc em{font-style:normal;color:var(--acc);margin-left:2px}
#cp .c25 .bug .wb{display:flex;gap:2px}
#cp .c25 .bug .wb s{flex:1;height:8px;border:1px solid var(--ln);text-decoration:none}
#cp .c25 .bug .wb s.a{background:var(--dim);border-color:var(--dim)}
#cp .c25 .bug .wb s.g{background:var(--acc);border-color:var(--acc)}
#cp .c25 .bug .wb s.l{border:1px dashed var(--acc)}
#cp .c25 .bug .wl{display:flex;justify-content:space-between;gap:10px;white-space:nowrap;color:var(--dim)}
#cp .c25 .bug .wl span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .bug .wl b{font-weight:400;color:var(--tx)}
#cp .c25 .bug .wl b.up{color:var(--acc)}
#cp .c25 .batter .bugc{grid-row:3;position:static;max-width:none;border:none;padding:2px 0 0;background:none;border-top:1px dashed var(--ln)}
#cp .c25.S3 .batter .bugc.on{display:grid}
#cp .c25 .fbox{position:relative;min-height:0;min-width:0;overflow:hidden;grid-row:2}
#cp .c25 .fbox .art,#cp .c25 .fbox .fcv{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;color:var(--tx)}
#cp .c25 .info{grid-row:1;display:flex;gap:8px;align-items:baseline;min-width:0;white-space:nowrap}
#cp .c25 .info b{font-weight:400;font-size:20px;line-height:1;overflow:hidden;text-overflow:ellipsis;min-width:0}
#cp .c25 .info span{color:var(--dim);font-size:15px;line-height:1.1;flex:none}
#cp .c25 .info .row{display:flex;gap:4px;margin-left:auto;flex:none}
#cp .c25 .info .row .bt{font-size:13px;padding:1px 5px}
@container (max-width:300px){#cp .c25 .info{flex-wrap:wrap;row-gap:4px}#cp .c25 .info b{flex:1 1 100%}#cp .c25 .info .row{margin-left:0}}
#cp .c25 .slice{display:grid;grid-template-rows:minmax(0,1fr) auto;padding:24px 12px 8px}
#cp .c25 .slice .sfig{position:relative;min-height:0;overflow:hidden}
#cp .c25 .slice .sfig svg{position:absolute;left:0;top:0;max-width:100%;max-height:100%} /* never bigger than its box, even for the frame before a resize repaints it */
#cp .c25 .slice .cap{font-size:15px;line-height:1.15;color:var(--dim);padding-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#cp .c25 .hists>#c25hb{position:absolute;inset:24px 14px 6px;overflow:hidden}
#cp .c25 .hists .hsw{position:absolute;right:10px;top:-2px;display:flex;gap:4px;z-index:2}
#cp .c25.P5 .hists .hsw{top:3px}
#cp .c25 .hists .hsw .bt{height:16px;padding:0 6px;display:inline-flex;align-items:center;pointer-events:auto;box-shadow:0 2px 0 var(--e);background:var(--k)}
#cp .c25 .hists .hsw .bt.on{background:var(--tx);color:var(--k)}
#cp .c25 .hists .hg{display:grid;gap:4px 18px}
#cp .c25 .hists .h .lb{display:flex;justify-content:space-between;gap:4px 10px;font-size:15px;color:var(--dim);white-space:nowrap;min-width:0}
#cp .c25 .hists .h .lb>span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .hists .h .lb b{font-weight:400;color:var(--tx)}
#cp .c25 .hists .h .lb em{font-style:normal;color:var(--acc)}
#cp .c25 .hists .h .lb i{font-style:normal}
#cp .c25 .hists .h svg{display:block}
#cp .c25 .hists .h svg .hv{pointer-events:auto;cursor:crosshair}
#cp .c25 .hists .h svg .hv:hover{fill:var(--ln);fill-opacity:.5}
#cp .c25 .hists .key{font-size:13px;color:var(--dim);margin-top:4px;line-height:1.25}
#cp .c25 .hists .key i{display:inline-block;width:12px;height:9px;margin:0 4px 0 8px;vertical-align:middle}
#cp .c25 .hists .key i:first-child{margin-left:0}
#cp .c25 .hists .key .kb{background:var(--dim);opacity:.55}
#cp .c25 .hists .key .kl{height:0;border-top:2px solid var(--tx)}
#cp .c25 .hists .key .kd{height:0;border-top:1px dashed var(--tx)}
#cp .c25 .hists .key .ka{width:3px;background:var(--acc)}
#cp .c25 .hists .like{font-size:15px;color:var(--dim);margin-top:4px}
#cp .c25 .hists .like b{font-weight:400;color:var(--tx)}
#cp .c25 .rc{display:grid;gap:2px;font-size:16px;max-width:520px}
#cp .c25 .rc .rh{color:var(--dim);font-size:13px;margin-bottom:2px}
#cp .c25 .rc .rr{display:grid;grid-template-columns:minmax(0,1fr) auto 64px;gap:10px;white-space:nowrap}
#cp .c25 .rc .rr span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .rc .rr i{font-style:normal;color:var(--dim)}
#cp .c25 .rc .rr b{font-weight:400;text-align:right}
#cp .c25 .rc .rr b.up{color:var(--acc)}
#cp .c25 .rc .rr b.dn{color:var(--dim)}
#cp .c25 .rc .cut{border-top:1px dashed var(--dim);margin:3px 0}
#cp .c25 .rc .tot{font-size:20px}
#cp .c25 .lpl{display:grid;gap:3px;font-size:16px}
#cp .c25 .lph{color:var(--dim);font-size:14px;margin-bottom:3px}
#cp .c25 .lpr{display:grid;grid-template-columns:22px minmax(0,1.4fr) auto auto minmax(0,1fr);gap:10px;white-space:nowrap}
#cp .c25 .lpr:not(.nw){grid-template-columns:22px minmax(0,1fr) auto;column-gap:10px;row-gap:1px}#cp .c25 .lpr:not(.nw)>b{grid-row:1/3}#cp .c25 .lpr:not(.nw)>span:nth-child(3){grid-column:2;grid-row:2;color:var(--dim)}#cp .c25 .lpr:not(.nw)>span:nth-child(4){grid-column:3;grid-row:1;text-align:right}#cp .c25 .lpr:not(.nw)>span.wh{grid-column:3;grid-row:2;text-align:right}
#cp .c25 .lpr b{font-weight:400;color:var(--acc)}
#cp .c25 .lpr.on{color:var(--acc)}
#cp .c25 .lpr span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .lpr.nw{grid-template-columns:22px minmax(10em,16em) minmax(0,1fr);white-space:normal;align-items:baseline;padding:3px 0} /* WHAT'S NEW wraps (1 Nov: its rows were cut to a few words) */
#cp .c25 .lpr.nw span{overflow:visible}
#cp .c25 .lpr .wh{color:var(--dim)}
#cp .c25 .sel{display:grid;gap:3px;font-size:16px}
#cp .c25 .scall{display:grid;gap:2px;margin:0 0 6px;padding:6px 8px;border:1px solid var(--acc)}
#cp .c25 .scall span{font-family:PS2P,monospace;font-size:8px;letter-spacing:.14em;color:var(--dim)}
#cp .c25 .scall b{font-weight:400;color:var(--acc);font-size:calc(22px * var(--ts));line-height:1}
#cp .c25 .sbar{display:flex;height:12px;border:1px solid var(--tx);margin:2px 0 6px}
#cp .c25 .sbar i{display:block;height:100%}
#cp .c25 .lpr2{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
#cp .c25 .lpr2.go{cursor:pointer}#cp .c25 .lpr2.go:hover span,#cp .c25 .lpr2.go:focus span{color:var(--acc);text-decoration:underline}
#cp .c25 .lpr2 span{color:var(--dim);overflow:hidden;text-overflow:ellipsis}
#cp .c25 .lpr2 b{font-weight:400}
#cp .c25 .bay{display:grid;gap:8px;min-width:min(760px,80vw);font-size:18px}
#cp .c25 .bayh{font-size:64px;line-height:1;color:var(--acc)}
#cp .c25 .bays{color:var(--dim)}
#cp .c25 .bays.karl{color:var(--tx)}
#cp .c25 .bayt{display:grid;gap:2px;margin-top:6px}
#cp .c25 .bayt .r{display:grid;grid-template-columns:70px 70px 80px 100px 100px 110px 1fr;gap:8px;white-space:nowrap}
#cp .c25 .bayt .r.hd{color:var(--dim)}
#cp .c25 .bayt .r b{font-weight:400;color:var(--acc);text-align:right}
#cp .c25 .baya{color:var(--dim);font-size:14px;margin-top:6px}
#cp .c25 .bul{display:grid;gap:10px;min-width:min(1100px,86vw);font-size:17px}
#cp .c25 .bulh{color:var(--dim);font-size:16px}
#cp .c25 .bcards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#cp .c25 .bcard{border:1px solid var(--tx);padding:10px 12px;display:grid;gap:4px}
#cp .c25 .bcard span{color:var(--acc);font-size:14px}
#cp .c25 .bcard b{font-weight:400;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .bcard i{font-style:normal;color:var(--dim);font-size:15px}
#cp .c25 .btab{display:grid;gap:1px;max-height:44vh;overflow:auto}
#cp .c25 .btab .r{display:grid;grid-template-columns:minmax(0,1.6fr) 60px 70px 70px 60px 70px 110px;gap:10px;padding:2px 4px;white-space:nowrap;pointer-events:auto}
#cp .c25 .btab .r span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .btab .r.hd{color:var(--dim)}
#cp .c25 .btab .r.go{cursor:pointer}
#cp .c25 .btab .r.go:hover{background:var(--ln)}
#cp .c25 .btab .r b{font-weight:400}
#cp .c25 .btab .r b.y{color:var(--acc)}
#cp .c25 .btab .r b.n{color:var(--dim)}
#cp .c25 .btab .r.mo{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.2fr);font-size:20px}
#cp .c25 .btab .r.mo b{text-align:right}
#cp .c25 .ddk{color:var(--acc);font-size:16px}
#cp .c25 .ddbig{font-size:54px;line-height:1}
#cp .c25 .dds{color:var(--dim);font-size:18px}
#cp .c25 .ddrev{border-left:3px solid var(--acc);padding-left:10px}
#cp .c25 .ddb{display:flex;gap:16px;margin-top:8px}
#cp .c25 .ddb .bt{font-size:22px;padding:10px 26px;pointer-events:auto}
#cp .c25 .wgrid{display:grid;gap:6px;max-height:46vh;overflow:auto}
#cp .c25 .wm{display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:start}
#cp .c25 .wm>span{color:var(--dim);font-size:15px;padding-top:4px}
#cp .c25 .wm>div{display:flex;flex-wrap:wrap;gap:6px 6px}
#cp .c25 .wd{min-width:34px;padding:3px 6px;font-size:15px;text-align:center;pointer-events:auto;box-shadow:0 3px 0 var(--e)}
#cp .c25 .wd sup{color:var(--acc);font-size:12px;margin-left:2px}
#cp .c25 .wd.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .wd.on sup{color:var(--k)}
#cp .c25 .wd.shut{opacity:.38;cursor:not-allowed;box-shadow:none}
#cp .c25 .wd u{text-decoration:none;font-size:.75em;color:var(--dim);margin-left:1px}
#cp .c25 .wd.ask{outline:2px solid var(--acc);outline-offset:2px}
#cp .c25 .ww .wtabs{display:flex;gap:8px;margin-bottom:12px}
#cp .c25 .mod.wwm .box{width:min(1180px,94vw);height:min(820px,calc(100vh - 92px))}#cp .c25 .mod.wwm{align-items:flex-start;padding-top:72px}#cp .c25.wwopen>.hdr{position:relative;z-index:31}
#cp .c25 .ww .wkey{color:var(--dim);font-size:13px;margin:4px 0 8px}
#cp .c25 .ww #c25wold{margin-top:10px;display:inline-block}
#cp .c25 .ww .wme{display:flex;gap:14px;align-items:center;margin:8px 0;font-size:13px;color:var(--dim)}
#cp .c25 .ww .wme i{font-style:normal}
#cp .c25 .ww input{font:inherit;background:var(--k);color:var(--tx);border:1px solid var(--tx);padding:2px 6px;text-transform:uppercase;pointer-events:auto}
#cp .c25 .ww .wask{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0;padding:8px 10px;border:1px solid var(--acc)}
#cp .c25 .ww .wask b{color:var(--acc);font-weight:400}
#cp .c25 .ww .wmsg{color:var(--acc);margin:6px 0}
#cp .c25 .ww .wsg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 18px;margin:10px 0 16px}
#cp .c25 .ww .wst{display:grid;grid-template-columns:1fr auto;align-items:baseline;border-bottom:1px solid var(--e);padding-bottom:4px}
#cp .c25 .ww .wst span{color:var(--dim);font-size:13px}
#cp .c25 .ww .wst b{font-weight:400;font-size:18px;color:var(--tx)}
#cp .c25 .ww .wst i{grid-column:1/-1;font-style:normal;font-size:13px;color:var(--dim)}
#cp .c25 .ww .wst.wgo{cursor:pointer;pointer-events:auto}
#cp .c25 .ww .wst.wgo:hover b{color:var(--acc)}
#cp .c25 .ww .wts{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin:8px 0 16px}
#cp .c25 .ww .wtt{border:1px solid var(--acc);padding:8px 10px}
#cp .c25 .ww .wtt b{display:block;color:var(--acc);font-weight:400}
#cp .c25 .ww .wtt span{font-size:13px}
#cp .c25 .ww .wbds{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
#cp .c25 .ww .wr{display:grid;grid-template-columns:3em 1fr auto;gap:10px;padding:4px 0;border-bottom:1px solid var(--e)}
#cp .c25 .ww .wr span{color:var(--dim)}
#cp .c25 .ww .wr b{font-weight:400}
#cp .c25 .ww .wr i{font-style:normal;color:var(--acc)}
#cp .c25 .wd.shut.on{opacity:.7}
#cp .c25 .wd.open{border-color:var(--acc)}
#cp .c25 .wsum{display:grid;gap:4px}
#cp .c25 .strip{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding-bottom:6px}
#cp .c25 .strip .bt{padding:8px 34px 18px 10px;display:flex;flex-direction:column;justify-content:space-between;position:relative;min-width:0}
#cp .c25 .strip .bt .sld{position:absolute;left:10px;right:34px;bottom:4px;height:12px;margin:0;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;pointer-events:auto}
#cp .c25 .strip .bt .sld::-webkit-slider-runnable-track{height:2px;background:var(--dim)}
#cp .c25 .strip .bt .sld::-moz-range-track{height:2px;background:var(--dim)}
#cp .c25 .strip .bt .sld::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:12px;margin-top:-5px;background:var(--acc);border:0;border-radius:0}
#cp .c25 .strip .bt .sld::-moz-range-thumb{width:8px;height:12px;background:var(--acc);border:0;border-radius:0}
#cp .c25 .strip .bt.arm .sld::-webkit-slider-runnable-track{background:var(--k)}
#cp .c25 .strip .bt .ps{color:var(--dim);white-space:nowrap}
#cp .c25 .strip .bt .ps{display:flex;align-items:center;gap:6px;min-height:21px}
#cp .c25 .strip .bt .ps .ico{flex:none;color:var(--tx)}
#cp .c25 .strip .bt.arm .ps .ico{color:var(--k)}
#cp .c25 .strip .bt .ps em{font-style:normal}
#cp .c25 .strip .bt b.num[title]{cursor:text;pointer-events:auto}
#cp .c25 .strip .bt b.num[title]:hover{text-decoration:underline dotted var(--dim);text-underline-offset:4px}
#cp .c25 .strip .bt input.tv{width:4.2em;max-width:100%;font:inherit;color:var(--acc);background:transparent;border:0;border-bottom:1px solid var(--acc);padding:0;text-align:inherit;outline:none}
#cp .c25 .strip .bt.arm .ps{color:var(--k)}
#cp .c25 .strip .bt b{font-weight:400;font-size:26px;line-height:.9;white-space:nowrap;overflow:hidden}
#cp .c25 .strip .bt b .dv{font-style:normal;color:var(--acc);font-size:.62em;vertical-align:.25em}
#cp .c25 .strip .bt.arm b .dv{color:var(--k)}
#cp .c25 .strip .bt .ud{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;gap:4px}
#cp .c25 .strip .bt .ud i{display:block;width:18px;height:16px;border:1px solid currentColor;font-style:normal;font-size:13px;line-height:14px;text-align:center}
#cp .c25 .strip .bt.hot{padding:8px 10px 4px}
#cp .c25 .strip .bt.hot b{line-height:1.3;align-self:center;margin:auto}
#cp .c25 .mod{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);pointer-events:auto}
#cp .c25 .mod.open{display:flex}
#cp .c25 .mod .box{position:relative;background:var(--k);border:1px solid var(--tx);padding:34px 26px 22px;max-width:min(1500px,94vw);max-height:92vh;overflow:auto}
#cp .c25 .mod .x{position:absolute;right:10px;top:8px}
#cp .c25 .mod h3{position:absolute;left:14px;top:8px;margin:0;font-weight:400;color:var(--acc)}
#cp .c25 .pitch{container-type:size}
#cp .c25 .pitch .pin{position:absolute;inset:24px 14px 8px;overflow:hidden;display:grid;grid-template-columns:minmax(120px,44%) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:16px}
@container (orientation:portrait){#cp .c25 .pitch .pin{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(110px,54%) minmax(0,1fr);gap:8px}}
#cp .c25 .pitch .zg{position:relative;min-height:0;min-width:0}
#cp .c25 .pitch .zg svg{position:absolute;inset:0;width:100%;height:100%}
#cp .c25 .pitch .pl{display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;gap:2px 18px;align-content:start;min-width:0;min-height:0;overflow:hidden}
@container (orientation:portrait) and (min-width:300px){#cp .c25 .pitch .pl{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (orientation:landscape) and (min-width:560px){#cp .c25 .pitch .pl{grid-template-columns:repeat(2,minmax(0,1fr))}}
#cp .c25 .pitch .pl .r.wide{grid-column:1/-1}
#cp .c25 .pitch .pl .r{display:flex;justify-content:space-between;gap:10px;font-size:16px;line-height:19px;white-space:nowrap;min-width:0}
#cp .c25 .pitch .pl .r span{color:var(--dim);overflow:hidden;text-overflow:ellipsis}
#cp .c25 .pitch .pl .r b{font-weight:400}
#cp .c25 .pitch .pl .hd{grid-column:1/-1;font-size:22px;line-height:1;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .pitch .pl .om{grid-column:1/-1;font-size:15px;line-height:1.15;margin-bottom:4px;color:var(--dim)}
#cp .c25 .pitch .pl .om b{font-weight:400;color:var(--k);background:var(--acc);padding:0 4px;margin-right:6px;display:inline-block}
#cp .c25 .pitch .none{align-self:center;color:var(--dim);font-size:17px;grid-column:1/-1}
#cp .c25 .pitch .none b{font-weight:400;color:var(--tx)}
#cp .c25 .allst{display:grid;grid-template-columns:repeat(5,minmax(190px,1fr));gap:22px}
#cp .c25 .allst h5{font-weight:400;color:var(--acc);margin:0 0 6px}
#cp .c25 .allst .r{display:flex;justify-content:space-between;gap:10px;font-size:15px;line-height:17px;white-space:nowrap}
#cp .c25 .allst .r span{color:var(--dim)}
#cp .c25 .allst .r b{font-weight:400}
#cp .c25 .allst.bfa{grid-template-columns:repeat(3,minmax(230px,1fr))}
#cp .c25 .bfh{display:grid;gap:4px;margin:0 0 16px}
#cp .c25 .bfh b{font-weight:400;color:var(--acc);font-size:calc(26px * var(--ts))}
#cp .c25 .bfh span,#cp .c25 .bfs{color:var(--dim);font-size:13px;line-height:16px}
#cp .c25 .bfs{margin:0 0 8px;white-space:normal}
#cp .c25 .pk{display:grid;grid-template-columns:repeat(10,64px);gap:4px}
#cp .c25 .pk .tile{height:46px}
#cp .c25 .legend{display:grid;grid-template-columns:repeat(4,minmax(240px,1fr));gap:18px 26px}
#cp .c25 .legend h5{margin:0 0 6px;font-weight:400;color:var(--acc)}
#cp .c25 .legend .o{display:grid;grid-template-columns:34px minmax(0,1fr);gap:2px 8px;padding:3px 4px;cursor:pointer;font-size:16px;line-height:1.1;pointer-events:auto}
#cp .c25 .legend .o:hover{background:var(--ln)}
#cp .c25 .legend .o .sw{display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:-2px}#cp .c25 .legend .o .nki{vertical-align:-4px;margin-right:4px}
#cp .c25 .legend div:has(>h5.lab){grid-column:1/-1;border-top:1px solid var(--ln);padding-top:10px}#cp .c25 .legend h5.lab span{color:var(--dim);margin-left:10px}
#cp .c25 .legend .o.on{outline:1px solid var(--acc)}
#cp .c25 .legend .o b{font-weight:400;color:var(--acc)}
#cp .c25 .legend .o span{color:var(--dim);grid-column:2}
#cp .c25 .legend .o em{font-style:normal;color:var(--tx);grid-column:2}
#cp .c25 .legend .code{grid-column:1/-1;font-size:22px;margin-bottom:6px}
#cp .c25 .legend .fix{grid-column:1/-1;color:var(--dim);font-size:15px}
#cp .c25 .mmenu{position:absolute;left:12px;bottom:12px;z-index:7;width:290px;max-height:calc(100% - 96px);overflow:auto;display:none;padding:8px 10px 10px;background:var(--k);border:1px solid var(--acc);box-shadow:4px 4px 0 var(--ln);pointer-events:auto}#cp .c25 .mmenu.on{display:grid;gap:4px}#cp .c25 .mmenu .mh{display:flex;justify-content:space-between;align-items:center;color:var(--acc);font-size:calc(14px * var(--ts));margin-bottom:4px}#cp .c25 .mmenu .mi{display:grid;gap:1px;padding:4px 6px;border:1px solid transparent;cursor:pointer;color:var(--tx);font-size:calc(12px * var(--ts))}#cp .c25 .mmenu .mi em{font-style:normal;color:var(--dim);font-size:calc(10px * var(--ts));line-height:1.3}#cp .c25 .mmenu .mi:hover,#cp .c25 .mmenu .mi:focus-visible,#cp .c25 .mmenu .mi.on{border-color:var(--acc);outline:none}#cp .c25 .mmenu .mi.on{color:var(--acc)}
#cp .c25 .dock{position:absolute;right:12px;bottom:12px;z-index:6;width:300px;max-width:calc(100% - 24px);max-height:calc(100% - 24px);overflow:auto;display:none;gap:7px;align-content:start;padding:8px 10px 10px;background:var(--k);border:1px solid var(--tx);box-shadow:4px 4px 0 var(--ln);pointer-events:auto;font-size:15px;line-height:1.15;outline:none}
#cp .c25.dk .dock{display:grid}
#cp .c25.dk .tly{display:none}
#cp .c25.dk .bsel{right:332px}
#cp .c25 .dock .dh{display:flex;align-items:center;gap:6px}
#cp .c25 .dock .dh b{flex:1;font-family:PS2P,monospace;font-weight:400;font-size:9px;letter-spacing:.14em;color:var(--acc)}
#cp .c25 .dock .bt{padding:2px 6px}
#cp .c25 .dock .dx{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px}
#cp .c25 .dock .dx .bt{justify-content:center;padding:2px 0;min-width:0}
#cp .c25 .dock .dx .bt.on{background:var(--acc);border-color:var(--acc);color:var(--k)}
#cp .c25 .dock .dx .bt.lk:not(.on){color:var(--dim);border-color:var(--ln)}
#cp .c25 .dock .da{display:flex;justify-content:space-between;gap:8px;color:var(--acc);border-top:1px solid var(--ln);padding-top:6px}
#cp .c25 .dock .da span{color:var(--dim)}
#cp .c25 .dock .dl{display:grid;gap:1px}
#cp .c25 .dock .do{display:grid;grid-template-columns:30px minmax(0,1fr);gap:6px;padding:2px 5px;cursor:pointer;border:1px solid transparent;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .dock .do:hover{background:var(--ln)}
#cp .c25 .dock .do.on{border-color:var(--acc);color:var(--acc)}
#cp .c25 .dock .do .sw{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}#cp .c25 .dock .do .nki{vertical-align:-5px;margin-right:4px}#cp .c25 .dock .dx .bt.lb{color:var(--dim)}#cp .c25 .dock .dx .bt.lb.on{color:var(--acc)}
#cp .c25 .dock .do b{font-weight:400;color:var(--dim)}
#cp .c25 .dock .do.on b{color:var(--acc)}
#cp .c25 .dock .dd{color:var(--dim);font-size:14px;height:5.6em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical} /* a fixed height (1 Nov, night): a longer preview on hover used to push the list up under the pointer, so a click landed on the next option */
#cp .c25 .dock .dd.pv{color:var(--tx)} /* an option pointed at, not yet picked */
#cp .c25 .dock .df{display:flex;justify-content:space-between;align-items:center;gap:6px;color:var(--dim);font-size:13px}
@media (max-width:900px){#cp .c25 .dock{position:fixed;left:8px;right:8px;bottom:8px;width:auto;max-width:none;max-height:46vh;z-index:25}#cp .c25.dk .bsel{right:8px}}
#cp .c25 .tys{display:grid;grid-template-columns:repeat(3,minmax(300px,1fr));gap:14px}
#cp .c25.shot .pitch .pin{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)}
#cp .c25 .sfm{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr);gap:8px 10px;align-content:start;pointer-events:auto}
#cp .c25 .sfm .hd{grid-column:1/-1}
#cp .c25 .sfm label{display:grid;gap:3px;color:var(--dim);font-size:13px;min-width:0}
#cp .c25 .sfm select,#cp .c25 .sfm input{font:inherit;font-size:18px;color:var(--tx);background:var(--k);border:1px solid var(--tx);border-radius:0;padding:2px 4px;min-width:0;width:100%;box-sizing:border-box}
#cp .c25 .sfm select:focus,#cp .c25 .sfm input:focus{outline:1px solid var(--acc);border-color:var(--acc)}
#cp .c25 .sfm .bt{grid-column:1/-1;justify-self:start;padding:4px 14px}
#cp .c25 .sfm .sfn{grid-column:1/-1;color:var(--acc);font-size:15px;min-height:1.1em}
#cp .c25 .sfm .sfo{grid-column:1/-1;color:var(--dim);font-size:14px;line-height:1.2}
#cp .c25 .swy{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;white-space:nowrap;cursor:pointer;pointer-events:auto;padding:0 3px;border:1px solid transparent}
#cp .c25 .swy b{font-weight:400;color:var(--acc)}
#cp .c25 .swy span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .swy i{font-style:normal;color:var(--dim)}
#cp .c25 .swy.on{border-color:var(--acc)}
#cp .c25 .swy:hover{background:var(--ln)}
#cp .c25 .sfw{margin:4px 0 2px;pointer-events:auto}
#cp .c25 .sfhd{display:grid;gap:2px;margin:0 0 4px}
#cp .c25 .sfhd b{font-weight:400;color:var(--acc);font-size:calc(17px * var(--ts));line-height:1.1}
#cp .c25 .sfhd span{color:var(--dim);font-size:calc(14px * var(--ts));line-height:1.2}
#cp .c25 .sfx{margin-top:10px;grid-column:1/-1;min-width:0} /* the pitch list's two columns (portrait) must not split it */
#cp .c25 .sfx .swy{font-size:calc(13px * var(--ts))}
#cp .c25 .hm .hmp{display:flex;gap:8px;align-items:center;margin-bottom:8px;color:var(--dim);font-size:calc(12px * var(--ts))}
#cp .c25 .hm .hmt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}#cp .c25 .sel.hm{min-width:0;max-width:100%;overflow-wrap:anywhere}
#cp .c25.blast.hmwho .strip{display:none !important}#cp .c25.blast .rd,#cp .c25.blast .bsel,#cp .c25.blast .tly,#cp .c25.blast .nuke,#cp .c25.blast .slice,#cp .c25.blast .strip .bt[data-k="ev"],#cp .c25.blast .strip .bt[data-k="la"],#cp .c25.blast .strip .bt[data-k="dir"]{display:none !important} /* (4 Nov: BLAST RADIUS is the park and its map; the dojo's swing readout and ball buttons stand aside) */
#cp .c25 .hm .hmt .bt{pointer-events:auto;cursor:pointer;padding:2px 8px}
#cp .c25 .hm .hmt .bt.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .hm .hmo{display:grid;gap:4px;border:1px solid var(--acc);padding:10px 12px;margin-bottom:10px;min-height:104px;align-content:start}
#cp .c25 .hm .hmo b{font-weight:400;color:var(--tx);font-size:calc(14px * var(--ts))}
#cp .c25 .hm .hmo em{font-style:normal;color:var(--acc);font-size:calc(40px * var(--ts));line-height:1;letter-spacing:0.02em}
#cp .c25 .hm .hmo i{font-style:normal;color:var(--dim);font-size:calc(11px * var(--ts));line-height:1.35}
#cp .c25 .hm .hmo .hpin{color:var(--tx);font-size:calc(11px * var(--ts));border-top:1px solid var(--ln);padding-top:3px;margin-top:2px}
#cp .c25 .hm .hmp select{flex:1 1 auto;width:0;min-width:0;pointer-events:auto}
#cp .c25 .hm .hmk{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:10px;color:var(--dim);font-size:calc(11px * var(--ts))}
#cp .c25 .hm .hmk i{display:block;height:10px}
#cp .c25 .hm .lpr2 b i{font-style:normal;color:var(--dim);margin-left:6px}
#cp .c25 .hm .hpk{display:grid;gap:2px;border:1px solid var(--acc);padding:6px 8px;margin:6px 0}#cp .c25 .hm .hpk b{font-weight:400;color:var(--acc);font-size:calc(16px * var(--ts))}#cp .c25 .hm .hpk i{font-style:normal;color:var(--tx);font-size:calc(11px * var(--ts));line-height:1.3}
#cp .c25 .hm .hph svg{display:block;width:100%;height:20px}#cp .c25 .hm .hph span{display:flex;justify-content:space-between;color:var(--dim);font-size:calc(10px * var(--ts));margin:1px 0 5px}#cp .c25 .hm .hph i{font-style:normal}
#cp .c25 .hm .lpr2.hmup b i{color:var(--tx)}
#cp .c25 .hm .hlead{color:var(--tx);font-size:calc(13px * var(--ts));line-height:1.4;margin:6px 0}#cp .c25 .hm .hlead b{font-weight:400;color:var(--acc)}
#cp .c25 .hm .hpl{display:grid;grid-template-columns:76px 1fr;gap:9px;align-items:start;border:1px solid var(--acc);padding:6px;margin:6px 0}#cp .c25 .hm .hpl canvas{display:block;width:76px;height:76px}
#cp .c25 .hm .hpl .t1{display:block;font-weight:400;color:var(--acc);font-size:calc(14px * var(--ts));line-height:1.25}#cp .c25 .hm .hpl i{display:block;font-style:normal;color:var(--tx);font-size:calc(10px * var(--ts));line-height:1.35;margin-top:4px}
#cp .c25 .hm .hbg{display:inline-block;border:1px solid var(--dim);color:var(--tx);padding:1px 4px;margin:4px 4px 0 0;font-size:calc(10.5px * var(--ts))}
#cp .c25 .hm .hph em{font-style:normal;border:1px solid var(--acc);color:var(--acc);padding:0 3px;margin:0 4px}#cp .c25 .hm .hph .lg{color:var(--dim)}
#cp .c25 .hm .hty{max-height:44vh;overflow:auto;pointer-events:auto;margin-top:4px}#cp .c25 .hm .htr{display:grid;gap:2px;padding:4px 0;border-bottom:1px solid color-mix(in srgb,var(--dim) 25%,transparent)}
#cp .c25 .hm .htr b{font-weight:400;color:var(--tx);font-size:calc(11px * var(--ts))}#cp .c25 .hm .htr span{color:var(--dim);font-size:calc(10px * var(--ts));line-height:1.4}#cp .c25 .hm .htr.nb b{color:var(--dim)}#cp .c25 .hm .htr.me b{color:var(--acc)}
#cp .c25 .hm .hwho{color:var(--tx);cursor:pointer;pointer-events:auto;text-decoration:underline;text-decoration-color:var(--dim)}#cp .c25 .hm .hwho:hover,#cp .c25 .hm .hwho:focus-visible{color:var(--acc)}
#cp .c25 .hm .hws{flex:1 1 auto;min-width:0;display:flex;justify-content:space-between;align-items:center;gap:8px;pointer-events:auto;cursor:pointer;padding:4px 8px;font-size:calc(13px * var(--ts));color:var(--tx);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#cp .c25 .hm .hws .cv{flex:none;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid var(--acc)}#cp .c25 .hm .hws.on{color:var(--k)}#cp .c25 .hm .hws.on .cv{border-top:0;border-bottom:6px solid var(--acc)}
#cp .c25 .hm .hwl[hidden]{display:none}#cp .c25 .hm .hwi[hidden]{display:none}#cp .c25 .hm .hwq{position:sticky;top:0;z-index:1;font:inherit;font-size:12px;letter-spacing:.08em;background:var(--k);color:var(--tx);border:0;border-bottom:1px solid var(--acc);padding:7px 8px;outline:none;text-transform:uppercase}#cp .c25 .hm .hwq::placeholder{color:var(--dim,#8a8f99)}#cp .c25 .hm .hwl{display:grid;max-height:46vh;overflow:auto;pointer-events:auto;border:1px solid var(--acc);margin:-4px 0 8px;background:var(--k)}#cp .c25 .hm .hwi{display:flex;justify-content:space-between;gap:8px;padding:4px 8px;cursor:pointer;color:var(--tx);font-size:calc(12px * var(--ts))}#cp .c25 .hm .hwi em{font-style:normal;color:var(--dim);font-size:calc(10px * var(--ts))}#cp .c25 .hm .hwi:hover,#cp .c25 .hm .hwi:focus-visible{background:color-mix(in srgb,var(--acc) 22%,transparent);outline:none}#cp .c25 .hm .hwi.on{color:var(--acc)}
#cp .c25 .hm .hbg.one{border-color:var(--acc);color:var(--acc)}#cp .c25 .hm .lpr2 b i.up{color:var(--tx)}
#cp .c25 .hm .hseat{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin:2px 0 6px;font-size:calc(11px * var(--ts))}#cp .c25 .hm .hseat span:first-child{color:var(--dim)}#cp .c25 .hm .hseat b{font-weight:400;color:var(--acc)}#cp .c25 .hm .hseat .bt{pointer-events:auto;cursor:pointer;padding:1px 6px}
#cp .c25 .sfhd #c25rt{justify-self:end;grid-row:1;grid-column:1;position:relative;z-index:1;pointer-events:auto;cursor:pointer;font-size:calc(12px * var(--ts));padding:2px 8px;margin-bottom:-22px}
#cp .c25 .rgs{display:grid;gap:2px;margin:0 0 8px}
#cp .c25 .rgl{color:var(--dim);font-size:calc(11px * var(--ts));letter-spacing:.12em;margin-top:3px}
#cp .c25 .rg{display:grid;grid-template-columns:minmax(0,1fr);gap:1px}
#cp .c25 .pitch:has(.sfx .rgs) .sfo{display:none} /* (2 Nov, night) once a seat is called its ranges have the room the how-to took */
#cp .c25 .rg span{color:var(--tx);font-size:calc(15px * var(--ts));line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cp .c25 .rg span i{font-style:normal;color:var(--dim);font-size:.78em;letter-spacing:.08em;margin-right:4px}
#cp .c25 .rg em{font-style:normal;color:var(--dim);font-size:calc(11px * var(--ts))}
#cp .c25 .rgb{position:relative;display:flex;gap:1px;height:9px}
#cp .c25 .rgb i{flex:1;background:var(--acc)}
#cp .c25 .rgb u{position:absolute;top:-3px;bottom:-3px;width:3px;margin-left:-1px;background:var(--pc)}
#cp .c25 .sfw svg{display:block;max-width:100%;height:auto;cursor:crosshair;touch-action:none;outline:none}
#cp .c25 .sfw svg:focus-visible{outline:1px dashed var(--acc);outline-offset:2px}
#cp .c25 .sfro{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 6px;margin:2px 0 6px}
#cp .c25 .sfro b{font-weight:400;color:var(--acc);font-size:calc(22px * var(--ts));line-height:1}
#cp .c25 .sfro span{color:var(--dim);margin-right:6px}
#cp .c25 .sfro i{font-style:normal;color:var(--dim);flex-basis:100%}
#cp .c25.shot .hdr #c25lp,#cp .c25.shot .hdr #c25se,#cp .c25.shot .hdr #c25rc,#cp .c25.shot .hdr #c25sm{opacity:.45}
#cp .c25.ns.dj>.strip{display:grid;grid-area:pitch;grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(5,minmax(0,1fr));gap:8px;padding:24px 0 0}
#cp .c25.dj>.pitch{display:none}
#cp .c25 .strip>.swi{display:none}
#cp .c25.dj>.strip>.swi{display:block;position:absolute;left:0;top:2px;color:var(--tx);pointer-events:none}
#cp .c25.dj>.strip .bt{flex-direction:row;align-items:center;gap:10px;padding:3px 34px 13px 10px}
#cp .c25.dj>.strip .bt:not(.hot) b{font-size:22px}
#cp .c25.dj>.strip .bt .ps{flex:none;width:7.5em}
#cp .c25.dj>.strip .bt b{flex:1;text-align:right}
#cp .c25.dj>.strip .bt.hot{justify-content:center;padding:6px 10px}
#cp .c25.ns.dj .tly{display:grid}
#cp .c25.ns.dj .bsel{right:236px}
#cp .c25 .ty{border:1px solid var(--ln);padding:12px 14px;display:grid;gap:6px;cursor:pointer;pointer-events:auto;font-family:var(--tf),monospace;font-size:calc(20px * var(--ts));letter-spacing:var(--sp,.02em);min-width:0}
#cp .c25 .ty:hover{border-color:var(--tx)}
#cp .c25 .ty.on{border-color:var(--acc);outline:1px solid var(--acc)}
#cp .c25 .ty .tyl,#cp .c25 .ty .tyh{font-family:var(--lf),monospace;font-size:var(--lsz);font-weight:var(--lw,400)}
#cp .c25 .ty .tyl{color:var(--acc)}
#cp .c25 .ty .tyh{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .ty .tyb{font-family:var(--nf),monospace;font-weight:var(--nw,400);font-size:calc(66px * var(--ts));line-height:.95;white-space:nowrap}
#cp .c25 .ty .tyb i{font-style:normal;font-size:.38em;color:var(--dim)}
#cp .c25 .ty .tym{display:flex;gap:3px;align-items:center}
#cp .c25 .ty .tym s{display:block;width:10px;height:13px;border:1px solid var(--tx)}
#cp .c25 .ty .tym s.on{background:var(--acc);border-color:var(--acc)}
#cp .c25 .ty .tym em{font-style:normal;margin-left:8px;font-family:var(--nf),monospace;font-weight:var(--nw,400)}
#cp .c25 .ty .tyr{display:flex;justify-content:space-between;gap:10px;font-size:calc(16px * var(--ts));white-space:nowrap}
#cp .c25 .ty .tyr span{color:var(--dim);overflow:hidden;text-overflow:ellipsis}
#cp .c25 .ty .tyr b{font-weight:var(--nw,400);font-family:var(--nf),monospace}
#cp .c25 .ty .tyd{color:var(--dim);font-size:13px;font-family:DJV,monospace;letter-spacing:0;line-height:1.3}
#cp .c25 .ty .tyx{display:inline-flex;align-self:start;justify-self:start;font-family:var(--lf),monospace;font-size:var(--lsz);font-weight:var(--lw,400);border:1px solid var(--tx);padding:3px 8px}
`
  // every px font size in this study scales with the type set (T); labels in the label face keep their own size
  const scaled = (s) => s.replace(/font-size:(\d+(?:\.\d+)?)px/g, 'font-size:calc($1px * var(--ts))')
  css('cp25', SKEL_CSS + THEME_CSS + JUICE_CSS + ART_CSS + LAYOUT_CSS + FRAME_CSS + scaled(BASE) + TYPE_CSS + MENU_CSS + PIXCTL_CSS + PHONE_CSS + EMBLEM_CSS + CARD_CSS)
  root.classList.add('skel')
  window.__cpBead = 3.4
  window.__cpHold = 110 // the hit-stop: the ball waits at the plate for 110 ms before it leaves
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U, { hand: false }), ses = makeSession(api), NS = ctl.SLOTS.length
  const q = new URLSearchParams(location.search)
  const mix = q.get('mix') != null ? parseMix(q.get('mix')) : { ...parseMix(store('nn-mix25') ?? ''), ...LOCKED } // a stored mix keeps its open choices; the locks win over it
  let lastInput = -1e9, settleT = 0 // SETTLE (see render)
  const moving = () => performance.now() - lastInput < 260
  // undo in the dojo (1 Nov, later; an audit): each burst of changes (a drag, a run of key presses) is one step; Backspace goes back a step, 0 puts the blank swing
  // back. settled is the state as it last stood still (render() keeps it), pushed when a new burst starts
  const SNAP = ['ev', 'la', 'dir', 'temp', 'wind', 'xwind'], snap = () => Object.fromEntries(SNAP.map((k) => [k, api.state[k] ?? 0]))
  let undo = [], settled = null, settledT = 0, after = null, afterT = 0, burst = false, undoing = false
  // (3 Nov) a burst ends 300 ms after its last change, by the clock and not only by the timer: on a loaded machine the timer runs late and two steps became one.
  // The step back is the state after the last change before this burst (or the settled state, if that is newer: something else changed it since)
  function markInput() { const now = performance.now(), fresh = !burst || now - lastInput > 300; if (fresh && !undoing) { const back = after && afterT > settledT ? after : settled; if (back) { undo.push(back); if (undo.length > 50) undo.shift() } } after = snap(); afterT = now; burst = true; lastInput = now; clearTimeout(settleT); settleT = setTimeout(() => { burst = false; lpKey = ''; if (last) render(last) }, 300) }
  const labRead = (t) => Object.fromEntries([...(t ?? '').toUpperCase().matchAll(/([A-Z]{2})(\d+)/g)].filter(([, k, n]) => LAB[k]?.opts.some((o) => o.c === Number(n))).map(([, k, n]) => [k, Number(n)]))
  const lab = { ...Object.fromEntries(Object.entries(LAB).map(([k, a]) => [k, a.def ?? a.opts[0].c])), ...labRead((() => { try { return localStorage.getItem('nn-lab25') } catch { return '' } })()), ...LAB_LOCK, ...labRead(q.get('lab')) }
  const labCode = () => Object.entries(lab).map(([k, n]) => k + n).join('-')
  let applyLab = () => {}
  function setLab(k, n) { if (!LAB[k]?.opts.some((o) => o.c === n)) return; lab[k] = n; try { localStorage.setItem('nn-lab25', labCode()) } catch {} applyLab(k) }
  let pix = null, pixStyle = null // the pixel instruments on the left (J3 to J9), made once the strip is
  let life = null, fx = null, menu = null, pitchIn = 0, lastJingle = null, lastR = mix.R || 1, lastMoment = null, water = null, pitchCam = null, flight = null, push = null, look = null, playT = [], playing = false, songT = null, autoSong = false, uiReady = false, slotLabels = null, coke = null, cutN = 0, ghost = null, ctl3d = null, windFx = null, windKey = '', tonightWind = () => {}
  const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches // no camera push, no attract flights, the pitch drawn at once
  const cs0 = () => getComputedStyle(root)
  let last = null, mode = q.get('mode25') || 'replay', filter = 'giants', idx = 0, edited = false, balls = [], cur = null, bird = q.get('bird') === '1', modal = null, stepped = null

  root.innerHTML = `<div class="c25"><div class="hdr"><div class="h1"><span class="lt"><span class="bt" id="c25mn" aria-label="menu (Esc)">MENU<kbd>ESC</kbd></span><span class="ps" id="c25ti" role="button" title="open the menu">NUKE NAVIGATOR // ${NAMES.replay}</span><span class="mhint" id="c25mh">ESC = MENU, ANY TIME</span></span><span class="rt">
    <span class="grp" id="c25vw">VIEW <span class="bt" id="c25b">BIRD'S EYE</span><span class="bt" id="c25pk">PARK</span></span>
    <span class="grp" id="c25mx"${HDR_AX.length ? "" : " style=\"display:none\""}>MIX ${HDR_AX.map((k) => `<span class="bt mx" data-ax="${k}"></span>`).join('')}</span><span class="grp" id="c25og"><span class="bt" id="c25mm" aria-label="landing moments" title="every landing moment, on demand">MOMENTS</span><span class="bt" id="c25lg" aria-label="options (?)" title="options (?)">OPTIONS</span></span></span></div>
    <div class="h2"><span class="grp tabs" id="c25tabs" role="tablist">${TABS.map(([m, l], i) => `<span class="bt tab" data-tab="${m}" role="tab" tabindex="0" title="${l} (${i + 1})"><kbd>${i + 1}</kbd>${l}</span>`).join('')}</span>
    <span class="old" hidden><span class="bt" id="c25lp">LANDING PARTY</span><span class="bt" id="c25se">SEAT SEANCE</span><span class="bt" id="c25my">MY SEAT</span><span class="bt" id="c25sc">SHOT CALLER</span><span class="bt" id="c25rc">ODDS RECEIPT</span><span class="bt" id="c25sm">STAR MAP</span><span class="bt" id="c25bb">BAY BAROMETER</span><span class="bt" id="c25kl">KARL</span><span class="bt" id="c25bl">BLAST BULLETIN</span><span class="bt" id="c25ww">WALLOP WITNESS</span></span></div></div>
  <div class="pnl clear win park" id="c25h"><span class="t">/ O R A C L E &nbsp; P A R K /</span><div class="cflash" id="c25fl"></div>
    <div class="rd" id="c25rd"></div><div class="chip" id="c25v"><div class="hd"></div><div class="sb"></div><div class="st"></div></div><div class="bsel p" id="c25ch"></div><div class="tly" id="c25t"></div><div class="nuke" id="c25nk" role="button" tabindex="0" aria-label="nuke it"><span class="nkw"></span><b>NUKE IT</b><i>SPACE</i></div><div class="bug" id="c25bug"></div><div class="banner" id="c25bn"></div><div class="dock" id="c25dk" tabindex="-1" role="dialog" aria-label="options"></div></div>
  <div class="pnl p pitch"><span class="t">/ T H E &nbsp; P I T C H /</span><div class="pin"><div class="zg" id="c25zg"></div><div class="pl" id="c25pl"></div></div></div>
  <div class="pnl p batter"><span class="t">/ B A T T E R /</span><div class="bin"><div class="fbox" id="c25f"><pre class="art"></pre></div><div class="info" id="c25i"></div><div class="bug bugc" id="c25bugc"></div></div></div>
  <div class="pnl p slice"><span class="t">/ C O N T A C T , &nbsp; S I D E &nbsp; O N /</span><div class="sfig" id="c25sv"></div><div class="cap" id="c25cap"></div></div>
  <div class="pnl p hists" id="c25hi"><span class="t">/ V S &nbsp; A L L /</span><span class="hsw" id="c25hw"><span class="bt" data-w="mlb">ALL</span><span class="bt" data-w="sf">ORACLE</span></span><div id="c25hb"></div></div>
  <div class="ptabs p" id="c25pt">${[['batter', 'BATTER'], ['pitch', 'PITCH'], ['slice', 'CONTACT'], ['hists', 'VS ALL']].map(([k, l]) => `<span class="bt" data-card="${k}">${l}</span>`).join('')}</div>
  <div class="strip p" id="c25sl"><span class="swi">${iconSVG(ICONS.swing[2], 2, 'YOUR SWING')}</span>${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}" data-k="${s.k}"><span class="ps"></span><b class="num"${['ev', 'la', 'dir'].includes(s.k) ? ' title="click to type it"' : ''}></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span>${s.k === 'hand' ? '' : `<input type="range" class="sld" min="0" max="1000" step="1" aria-label="${s.label}">`}</div>`).join('')}<div class="bt hot" data-i="${ctl.SLOTS.length}"><span class="ps">ENTER</span><b>SWING</b></div></div>
  <div class="mod" id="c25m"><div class="box"><span class="bt x" id="c25cl" tabindex="0" role="button" aria-label="close">CLOSE</span><h3 id="c25mt"></h3><div id="c25mb"></div></div></div></div>`
  const E = (id) => root.querySelector(id), hero = E('#c25h'), grid = E('.c25')
  const setCard = (k) => { grid.dataset.card = k; root.querySelectorAll('#c25pt [data-card]').forEach((b) => b.classList.toggle('on', b.dataset.card === k)); if (last) render(last) }
  root.querySelectorAll('#c25pt [data-card]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setCard(b.dataset.card) }))
  setCard(q.get('card') ?? 'batter')

  // ---- the park wireframe: W1 GHOST ----
  const showWire = () => {
    api.NN.setDuo(null)
    const cs = getComputedStyle(root), t = { tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim(), acc: cs.getPropertyValue('--acc').trim() }
    api.NN.setPix({ pix: 0, mode: 0 })
    const rich = { fatHeavy: 1.8, faintAngle: 40, faintMin: 0.8, marks: true, wall: (b) => api.wallAt?.(b), accent: t.acc, stands: 'ghost', fun: true, funVox: true, step: 6, contourOuter: 40 }
    api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built, ...rich })
    showWire.built = true
  }
  // no hover tilt on buttons or panels (28 Oct, Andrew: 'super distracting'); a press still sinks the button
  let syncCam = null
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], top: [[0.3, 300, -50], [0.3, 0, -62]] }
  const camTo = (k) => { push = null; const req = look && !look.out ? look.req : null; look = null; const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); E('#c25b').classList.toggle('on', k === 'top'); E('#c25b').textContent = k === 'top' ? "BIRD'S EYE: ON" : "BIRD'S EYE"; if (req?.there) lookThere(req.there); else if (req?.side) lookSide(req.side); else if (req?.seat) lookSeat(req.seat); else if (req?.blast) lookBlast(); else if (req?.pts) lookAt(req.pts, req.rad) } // (2 Nov, night: the seat look, Shot Caller) // a look under way starts again from the new seat
  setTimeout(() => camTo(bird ? 'top' : 'home'), 60)
  const flipBird = () => { bird = !bird; camTo(bird ? 'top' : 'home') }
  E('#c25b').addEventListener('click', () => { pressEl(E('#c25b')); flipBird() })

  const getJSON = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : {} } catch { return {} } }
  const [parks, R, pool, D, facesRaw, bio, gamesJ] = await Promise.all([loadParks(), loadReplay(), loadPool(), loadDists(), getJSON('/faces_tone.json'), getJSON('/batter_bio.json'), getJSON('/giants_games.json')]) // bio: heights from the MLB Stats API (science/pull_batter_bio.py)
  const hasGen = await loadGenericFaces('composite')
  // the histogram panel shows one of: the histograms, LANDING PARTY (L), SEAT SEANCE (G), SHOT CALLER (C), the ODDS RECEIPT (O); the park markers belong to whichever is on
  const lp = landingParty(api, R.balls, { vox: true, dim: '#8a8f99', name: (b) => pname(b.b)?.[0]?.split(' ').slice(-1)[0] ?? '' }); lp.warm(); const se = seatSeance25(api), sc = shotCaller(api, R.balls, { vox: true, dim: '#8a8f99' })
  let show = ['lp', 'se', 'rc', 'sm'].includes(q.get('show')) ? q.get('show') : 'hist', lpKey = '', lpList = [], seKey = '', seRes = null, scRes = null, scSel = 0, shotPlayS = null
  if (q.get('show') === 'sc') mode = 'shot'
  const FEAT = [['#c25lp', 'lp'], ['#c25se', 'se'], ['#c25my', 'my'], ['#c25rc', 'rc'], ['#c25sm', 'sm']]
  // 29 Oct, evening (Andrew): SHOT CALLER is its own mode (the menu and C take you there), not a DEJA-VU button; STAR MAP and ODDS RECEIPT go ("I have no idea what
  // the star map is. I don't care about the odds receipt"); KARL comes in only when the forecast says fog, no button
  for (const id of ['#c25sc', '#c25rc', '#c25sm', '#c25kl']) E(id).style.display = 'none'
  const setShow = (k) => { if (!uiReady || mode === 'shot') return; show = show === k ? 'hist' : k; for (const [id, m] of FEAT) E(id).classList.toggle('on', show === m); lpKey = seKey = ''; if (!['lp', 'se', 'my', 'reel', 'hm'].includes(show)) unlook(); if (show !== 'reel') stopReelAll(); reelLooked = false; if (show !== 'se') { ghost?.hide(); if (cur && mode === 'replay') { const n = pname(cur.b); life?.idle(`${(n ? n[0] : 'BATTER ' + cur.b).toUpperCase()}  ·  ${cur.d}`) } } if (show !== 'lp') lp.clear(); if (show !== 'se') se.clear(); if (show !== 'my') { mySeat.clear(); myKey = '' } if (show !== 'hm') { heat?.clear(); hmKey = '' } if (show !== 'sm') { stars?.clear(); smKey = '' } if (last) render(last); paintTabs() } // (3 Nov: the tabs follow, BLAST RADIUS lit only while its map is on)
  for (const [id, m] of FEAT) { E(id).addEventListener('click', () => { if (!uiReady) return; pressEl(E(id)); sound.play('move'); if (mode === 'shot') setMode('replay'); setShow(m) }); E(id).classList.toggle('on', show === m) } // from Shot Caller, a feature takes you back to the replay with it on
  // SHOT CALLER is a mode of its own (29 Oct): the header button and C go in and out of it
  E('#c25sc').addEventListener('click', () => { pressEl(E('#c25sc')); sound.play('move'); if (uiReady) setMode(mode === 'shot' ? 'replay' : 'shot') })
  // (30 Oct, night) the Konami code: DODGER APOCALYPSE, five gags back to back
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  let kon = 0
  addEventListener('keydown', (e) => {
    kon = e.key === KONAMI[kon] || e.key.toLowerCase() === KONAMI[kon] ? kon + 1 : e.key === KONAMI[0] ? 1 : 0
    if (kon < KONAMI.length || !life) return
    kon = 0; banner('DODGER APOCALYPSE', 'FIVE IN A ROW'); sound.play('banner')
    let n = 0; const go = () => { if (n++ >= 5) return; const g = life.nextGag(); life.play(g, {}, 0, true); setTimeout(go, ((life.dur(g) ?? 8) / (life.pace ?? 1)) * 1000 + 600) }; go()
  })
  // a click on the park (not a drag) calls the shot in SHOT CALLER
  const bRay = new api.NN.THREE.Raycaster(), bNdc = new api.NN.THREE.Vector2()
  const boardHit = (e) => { const c = api.NN.renderer?.domElement; if (!c) return false; const r = c.getBoundingClientRect(); bNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); bRay.setFromCamera(bNdc, api.NN.camera); return [life.board, life.vboard].some((b) => b && b.visible !== false && bRay.intersectObject(b, true).length > 0) }
  let down = null
  const onPark = (e) => e.target === (api.NN.renderer?.domElement ?? null) || (!api.NN.renderer && e.target?.tagName === 'CANVAS' && !e.target.closest?.('.pnl.p, .sm, .mod')) // (red team: the face canvas and the menu's animation are canvases too)
  addEventListener('pointerdown', (e) => { down = onPark(e) ? [e.clientX, e.clientY] : null })
  addEventListener('pointerup', (e) => {
    if (!down || !onPark(e) || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return
    if (life && mode !== 'shot' && show !== 'hm' && boardHit(e)) { sound.play('pick'); life.play(life.nextGag(), {}, 0, true); return } // (30 Oct, night) click the scoreboard: the next gag
    if (mode !== 'shot' && show === 'my' && (myEdit || !mySaved())) { const p = sc.pick(e.clientX, e.clientY), x = p && seatOf(p); if (x?.what === 'seat') mySave(x); return } // MY SEAT: the click is your seat
    if (mode !== 'shot') return
    const spot = sc.pick(e.clientX, e.clientY)
    if (spot) shotAt(spot)
  })
  E('#c25bb').addEventListener('click', () => { if (!uiReady) return; pressEl(E('#c25bb')); openMod('bay') })
  const wim = await loadWhatIf() // the what-if model (public/whatif_model.json), if built
  // which park is loaded (?park=TEAM; main.js and dojo.js read the same parameter): its name on the park panel; Oracle-only features hide elsewhere
  const here = parks.parks.find((p) => p.abbr === (window.__parkX ?? 'SF')), atOracle = !here || here.abbr === 'SF'
  const spaced = (t) => '/ ' + t.toUpperCase().split(' ').map((w) => w.split('').join(' ')).join(' &nbsp; ') + ' /'
  if (!atOracle) { hero.querySelector('.t').innerHTML = spaced(here.name); for (const id of ['#c25lp', '#c25se', '#c25sc', '#c25bb', '#c25kl', '#c25sm']) E(id).style.display = 'none'; E('#c25hw [data-w="sf"]').style.display = 'none' }
  E('#c25pk').textContent = 'PARK: ' + (here?.abbr ?? 'SF')
  E('#c25pk').addEventListener('click', () => { pressEl(E('#c25pk')); openMod('parks') })
  const goPark = (abbr) => { const u = new URL(location.href); if (abbr === 'SF') u.searchParams.delete('park'); else u.searchParams.set('park', abbr); u.searchParams.set('mix', mixCode(mix).replace(/ /g, '')); u.searchParams.set('mode25', mode); u.searchParams.set('menu', '0'); if (mode === 'replay') { u.searchParams.set('ball', String(idx)); u.searchParams.set('filter', filter) } else { for (const k of ['ev', 'la', 'dir', 'hand', 'temp']) u.searchParams.set('w' + k, String(api.state[k])) } location.href = u.toString() }
  E('#c25bl').addEventListener('click', () => { pressEl(E('#c25bl')); openMod('bulletin') })
  E('#c25ww').addEventListener('click', () => { pressEl(E('#c25ww')); openMod('witness') })
  const goTab = (m) => { if (!uiReady) return; sound.play('move'); try { mmStop?.(); moments.clear() } catch (err) { void err } /* (red team 2.1, 2.2) */ if (m === 'witness') { if (modal !== 'witness') openMod('witness'); paintTabs(); return } if (wEd) { banner('YOUR CALLING CARD IS OPEN', 'SAVE IT OR CANCEL FIRST'); return } if (modal) closeMod(); if (m === 'blast') { if (mode !== 'whatif') setMode('whatif'); if (show !== 'hm') { Object.assign(api.state, NORMAL_NIGHT); api.update(); setShow('hm') } paintTabs(); return } if (show === 'hm') setShow('hm'); if (m !== mode) setMode(m); paintTabs() }
  // BLAST RADIUS's frame (5 Nov): its own zoom (windowSync above), and the park centred in what is left once the AIR and WIND boxes are counted out
  function blastFrame() {
    syncCam?.()
    if (show !== 'hm') return
    const sl = E('#c25sl')?.getBoundingClientRect(), W0 = window.__cpWindow
    if (!sl || !W0 || !sl.width) return
    const l = Math.max(W0.l, sl.right + 12), full = innerWidth - W0.l - W0.r, left = innerWidth - l - W0.r
    if (l > W0.l) api.NN.setWindow({ ...W0, l, z: W0.z * Math.max(0.6, left / Math.max(1, full)) })
  }
  // the header names what is on: the lit tab (BLAST RADIUS and WALLOP WITNESS sit over a mode), else the mode
  function paintCrumb() { const t = E('#c25ti'); if (!t) return; t.textContent = 'NUKE NAVIGATOR // ' + (modal === 'witness' ? NAMES.witness : show === 'hm' ? 'BLAST RADIUS' : mode === 'replay' ? NAMES.replay : mode === 'shot' ? NAMES.shot : stepped ? NAMES.tweak : NAMES.dojo) }
  function paintTabs() { paintCrumb(); grid.classList.toggle('wwopen', modal === 'witness'); const on = modal === 'witness' ? 'witness' : show === 'hm' ? 'blast' : mode; { const was = grid.classList.contains('blast'); grid.classList.toggle('blast', show === 'hm'); if (show !== 'hm') { grid.classList.remove('hmwho'); hmValk = '' } if (was !== (show === 'hm')) requestAnimationFrame(blastFrame); if (was && show !== 'hm') { heat?.cancel(); clearTimeout(hmTick) } } /* (red team 6: leaving it stops the work) */ if (ctl3d) ctl3d.visible = mode === 'whatif' && show !== 'hm'; { const fl = flight?.last?.(); if (fl) fl.visible = !(mode === 'shot' && !scRes) && show !== 'hm' } root.querySelectorAll('#c25tabs [data-tab]').forEach((t) => { t.classList.toggle('on', t.dataset.tab === on); t.setAttribute('aria-selected', String(t.dataset.tab === on)); if (t.dataset.tab === 'shot') t.style.display = atOracle ? '' : 'none' }) }
  root.querySelectorAll('#c25tabs [data-tab]').forEach((t) => { t.addEventListener('click', () => { pressEl(t); goTab(t.dataset.tab) }); t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pressEl(t); goTab(t.dataset.tab) } }) })
  const pname = (id) => R.players?.[String(id)] ?? null
  // OFF THE MENU: the pitch was outside the zone (by the ball's edge, so a pitch touching the zone is a strike); where it missed names it
  const offZone = (b) => {
    if (!b || b.px == null || b.pz == null) return null
    const r = 0.121, zl = 0.708, st = b.st ?? 3.4, sb = b.sb ?? 1.6
    const dx = Math.abs(b.px) - zl - r, dt = b.pz - st - r, db = sb - b.pz - r, off = Math.max(dx, dt, db)
    if (off <= 0) return null
    const inside = b.s === 'R' ? b.px < 0 : b.px > 0
    const where = off === dt ? 'high' : off === db ? 'low' : inside ? 'inside' : 'away'
    return { inches: off * 12, where, word: NAMES[where], side: where === 'high' ? 'ABOVE THE ZONE' : where === 'low' ? 'BELOW THE ZONE' : where === 'inside' ? 'OFF THE INSIDE EDGE' : 'OFF THE OUTSIDE EDGE' }
  }
  const situation = (b) => {
    if (!b || b.in == null) return null
    const on = (b.r1 ? 1 : 0) + (b.r2 ? 1 : 0) + (b.r3 ? 1 : 0), d = (b.bsc ?? 0) - (b.fsc ?? 0), runs = 1 + on
    const line = [`${b.tb === 'Top' ? 'TOP' : 'BOTTOM'} ${b.in}`, on === 0 ? 'BASES EMPTY' : on === 3 ? 'BASES LOADED' : on + ' ON', d === 0 ? 'TIED' : (d > 0 ? 'UP ' : 'DOWN ') + Math.abs(d), b.bl != null ? `${b.bl}-${b.sk}` : null, b.ou != null ? `${b.ou} OUT` : null, wpaOf(b) != null ? (b.bwe != null ? `${(b.tb === 'Top' ? b.at : b.ht) ?? 'BATTING TEAM'} WIN ${Math.round(b.bwe * 100)}% → ${Math.round(Math.max(0, Math.min(1, b.bwe + wpaOf(b))) * 100)}%` : `${(b.tb === 'Top' ? b.at : b.ht) ?? 'BATTING TEAM'} WIN CHANCE`) + ` (${wpaOf(b) >= 0 ? '+' : '-'}${Math.abs(Math.round(wpaOf(b) * 100))}% WPA)` : null].filter(Boolean).join(' · ')
    let stamp = null
    if (b.hr) {
      if (b.tb === 'Bot' && b.in >= 9 && d <= 0 && d + runs > 0) stamp = on === 3 ? 'WALK-OFF SLAM' : 'WALK-OFF'
      else if (on === 3) stamp = 'GRAND SLAM'
      else if (d <= 0 && d + runs > 0) stamp = 'GO-AHEAD'
      else if (d < 0 && d + runs === 0) stamp = 'TIES IT'
    }
    return { line, stamp }
  }
  // the score bug (S): the game as it stood when the pitch came in, and what the swing did to the batting team's chance of winning. bwe is Savant's bat_win_exp (before
  // the pitch, science/add_win_exp.py); WPA is delta_home_win_exp turned to the batting team's side. Runs scored are known for a home run (the batter plus everyone on).
  const wpaOf = (b) => (b?.dwe == null ? null : b.tb === 'Top' ? -b.dwe : b.dwe)
  function bugHTML(b) {
    if (!b || b.in == null) return ''
    const bat = b.tb === 'Top' ? b.at : b.ht, fld = b.tb === 'Top' ? b.ht : b.at, on = (b.r1 ? 1 : 0) + (b.r2 ? 1 : 0) + (b.r3 ? 1 : 0)
    const base = (x, y, lit) => `<rect x="${x}" y="${y}" width="7" height="7" transform="rotate(45 ${x + 3.5} ${y + 3.5})" fill="${lit ? 'var(--acc)' : 'none'}" stroke="var(--tx)" stroke-width="1.2"/>`
    const dia = `<svg class="dia" viewBox="0 0 30 22" width="30" height="22" aria-label="runners: ${[b.r1 && 'first', b.r2 && 'second', b.r3 && 'third'].filter(Boolean).join(', ') || 'none'}">${base(19, 9, b.r1)}${base(11.5, 2, b.r2)}${base(4, 9, b.r3)}</svg>`
    const outs = `<span class="outs" aria-label="${b.ou ?? 0} out">${[0, 1, 2].map((i) => `<i class="${i < (b.ou ?? 0) ? 'on' : ''}"></i>`).join('')}</span>`
    const w = wpaOf(b), w0 = b.bwe, w1 = w0 != null && w != null ? Math.max(0, Math.min(1, w0 + w)) : null
    const runs = b.hr ? 1 + on : null
    const score = `<span class="sc"><b>${bat ?? 'BAT'}</b> ${b.bsc ?? '-'}${runs != null ? `<em>&rarr;${(b.bsc ?? 0) + runs}</em>` : ''} &nbsp;<b>${fld ?? 'FLD'}</b> ${b.fsc ?? '-'}</span>`
    const P = (x) => Math.round(x * 100)
    let bar = ''
    if (w0 != null && w1 != null) {
      const lo = Math.min(w0, w1), hi = Math.max(w0, w1)
      bar = `<div class="wb" aria-label="win chance ${P(w0)}% before, ${P(w1)}% after">${Array.from({ length: 20 }, (_, i) => { const c = (i + 0.5) / 20; return `<s class="${c < lo ? 'a' : c < hi ? (w1 >= w0 ? 'g' : 'l') : ''}"></s>` }).join('')}</div>
        <div class="wl"><span>${bat ?? 'BATTING TEAM'} WIN CHANCE ${P(w0)}% &rarr; ${P(w1)}%</span><b class="${w >= 0 ? 'up' : 'dn'}" title="how much this swing moved the batting team's chance of winning">${w >= 0 ? '+' : '-'}${Math.abs(P(w))}% WPA</b></div>`
    } else if (w != null) bar = `<div class="wl"><span>${bat ?? 'BATTING TEAM'} WIN CHANCE</span><b class="${w >= 0 ? 'up' : 'dn'}" title="how much this swing moved the batting team's chance of winning">${w >= 0 ? '+' : '-'}${Math.abs(P(w))}% WPA</b></div>`
    return `<div class="br1"><span class="inn">${b.tb === 'Top' ? '&#9650;' : '&#9660;'}${b.in}</span>${dia}${outs}<span class="cnt">${b.bl ?? '-'}-${b.sk ?? '-'}</span>${score}</div>${bar}`
  }
  const seenDays = () => { try { return JSON.parse(store('nn-witness') ?? '[]').map((k) => String(k).slice(0, 10)) } catch { return [] } } // (a doubleheader's game is date#2)
  const big = (b) => { const st = situation(b)?.stamp; return b.hr && (/WALK-OFF|GRAND SLAM/.test(st ?? '') || (st === 'GO-AHEAD' && b.in >= 7)) }
  const filtered = () => (filter === 'big' ? R.balls.filter(big) : filter === 'mine' ? R.balls.filter((b) => b.hr && b.park === 'SF' && seenDays().includes(b.d)) : filter === 'giants' ? R.balls.filter((b) => b.g && b.hr) : filter === 'oracle' ? R.balls.filter((b) => b.park === 'SF' && b.hr) : filter === 'menu' ? R.balls.filter((b) => b.hr && offZone(b)) : R.balls)

  // ---- the mixer ----
  const themeKey = () => { if (atOracle) return 'orange'; const k = 'team' + here.abbr; THEMES[k] ??= { ...THEMES.orange, name: here.abbr, acc: TEAM_ACC[here.abbr] ?? THEMES.orange.acc }; return k }
  // STANDS (V, 30 Oct, later: "They're getting in the way right now"): the upper decks, foul ground, or both, taken out of the model and the wire rebuilt
  let standsNow = 1
  function setStands(v) {
    standsNow = v
    // h: the height the stands are cut at (fair ground never under 8.5 m, so the arcade and the wall stay); fl: past the foul lines, how far from the line the stands stay
    const h0 = api.toWorld([0, 0, 0]), cut = { 1: [Infinity, Infinity], 2: [13, Infinity], 3: [Infinity, 0], 4: [13, 0], 5: [9, Infinity], 6: [5, Infinity], 7: [Infinity, 14], 8: [Infinity, 6], 9: [7, 10], 10: [7, Infinity], 11: [11, Infinity], 12: [-1, Infinity], 13: [9, Infinity], 14: [9, 14] }[v] ?? [Infinity, Infinity], [h0c, fl] = cut, bleach = v === 13
    const hAt = (b) => (h0c < 0 ? 6 + 5 * Math.min(1, Math.max(0, (b - Math.PI / 4) / (Math.PI * 0.75))) : h0c) // STEPPED: 6 m at the poles, 11 m behind the plate
    const test = v === 1 ? null : (x, y, z) => { const dx = x - h0.x, dz = z - h0.z, d = Math.hypot(dx, dz), b = Math.abs(Math.atan2(dx, -dz)); const sb = Math.atan2(dx, -dz); return (y > (b < Math.PI / 4 ? Math.max(hAt(b), 8.5) : hAt(b)) && d > 35 && !(b < 0.45 && d > 105)) || (b > 0.8 && y > 0.8 && d > 18 && d * Math.sin(b - Math.PI / 4) > fl) || (bleach && sb < -0.12 && sb > -0.8 && d > 104 && y > 1.2) }
    window.__nn.maskStadium(test)
    if (showWire.built) showWire()
  }
  function applyMix(changed) {
    for (const k of ['L', 'P', 'F', 'I', 'S']) for (const o of AXES[k].opts) grid.classList.toggle(k + o.c, mix[k] === o.c)
    fx?.setStyle(optOf('F', mix.F).style); if (life) { life.gullsOn = mix.F !== 3; life.gullFace = mix.W; life.signStyle = mix.Q; life.boardStyle = mix.G }
    if (coke) coke.style = mix.C
    if (fx?.karlOn() && fx.karlLevel() !== mix.K) fx.karl(true, mix.K)
    if (water && water.mode() !== mix.B) water.setMode(mix.B)
    if (atOracle && window.__nn?.maskStadium && window.__nn.cutTest && standsNow !== mix.V) setStands(mix.V) // (after the model's own cuts)
    if (mix.R) lastR = mix.R // the R key brings back whichever arrow was last on
    if (flight && flight.style() !== mix.U) { flight.setStyle(mix.U); if (!api.anim?.()) api.update() }
    grid.style.setProperty('--pc', optOf('Y', mix.Y).col ?? 'var(--tx)')
    grid.style.setProperty('--mk', optOf('X', mix.X).col ?? 'var(--pc)'); grid.style.setProperty('--sc', optOf('E', mix.E).col ?? 'var(--pc)')
    if (changed) paintSeams()
    if (['X', 'Y'].includes(changed) && !api.anim?.()) api.update() // the arc's dots take the new color
    paintTitles(); slotLabels?.(); pixStyle?.()
    menu?.setLogo(mix.M)
    for (const [k, v] of Object.entries(typeVars(optOf('T', mix.T).T))) grid.style.setProperty('--' + k, k === 'ts' ? String(Number(v) * compactK()) : v)
    grid.classList.toggle('cmp', compactK() < 1); grid.classList.toggle('cmp2', innerWidth >= 900 && innerHeight < 700)
    if (!changed) { applyTheme(root, api, themeKey(), { park: true }); showWire() }
    root.querySelectorAll('.mx[data-ax]').forEach((b) => { const k = b.dataset.ax, o = optOf(k, mix[k]); b.textContent = k + mix[k]; b.title = `${AXES[k].name}: ${o.name}`; b.setAttribute('aria-label', b.title) })
    store('nn-mix25', mixCode(mix).replace(/ /g, ''))
    if (changed === 'L') syncMode()
    if (changed === 'L' || !changed) relayout()
    if (last) render(last)
    if (modal === 'mix' || modal === 'type' || modal === 'before') paintModal()
    paintDock()
  }
  // the three panel titles: pixel icons (I1 to I3, 2 px per pixel) or the old spaced words (I0); the histogram panel keeps the word titles of the features that borrow it
  const wordTitle = (el, h, key) => { const t = el.querySelector('.t'); if (mix.I && key && ICONS[key]) { const w = h.replace(/&nbsp;/g, ' ').replace(/[/]/g, '').replace(/\s+(?=\S)/g, (m) => (m.length > 1 ? ' ' : '')).trim(), ic = iconSVG(ICONS[key][mix.I] ?? ICONS[key][2], 2, w); if (t.dataset.h !== ic) { t.innerHTML = ic; t.dataset.h = ic } t.classList.add('ic'); return } t.innerHTML = h; t.dataset.h = ''; t.classList.remove('ic') }
  const titleHTML = (k) => (mix.I ? iconSVG(ICONS[k][mix.I], 2, PANEL_NAMES[k]) : PANEL_WORDS[k])
  function paintTitles() {
    wordTitle(root.querySelector('.c25>.park'), atOracle ? '/ O R A C L E &nbsp; P A R K /' : spaced(here.name), 'park'); wordTitle(root.querySelector('.c25>.batter'), '/ B A T T E R /', 'batter')
    for (const k of ['pitch', 'slice', 'hists']) {
      const t = root.querySelector(`.c25>.${k}>.t`)
      if (k === 'hists' && (show !== 'hist' || mode === 'shot')) continue
      if (k === 'pitch' && mode === 'shot') { wordTitle(root.querySelector('.c25>.pitch'), '/ C A L L &nbsp; A &nbsp; S E A T /', 'seat'); continue }
      const h = titleHTML(k); if (t.dataset.h !== h) { t.innerHTML = h; t.dataset.h = h } t.classList.toggle('ic', !!mix.I)
    }
  }
  const relayout = () => requestAnimationFrame(() => { syncCam?.(); camTo(bird ? 'top' : 'home') })
  // (3 Nov, Andrew, on a screengrab: "viewing from below cuts off the ribbons"): the camera stays over the park; orbiting down stops just above level with the field
  api.NN.controls.maxPolarAngle = Math.PI * 0.47
  { let k0 = compactK(), t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { const k = compactK(); grid.classList.toggle('cmp2', innerWidth >= 900 && innerHeight < 700); if (k === k0) return; k0 = k; grid.style.setProperty('--ts', String(Number(typeVars(optOf('T', mix.T).T).ts) * k)); grid.classList.toggle('cmp', k < 1); if (last) render(last) }, 150) }) } // (2 Nov, night: COMPACT follows the window)
  const stepAx = (k, d) => { const os = dockOpts(k), n = os.length, i = os.findIndex((o) => o.c === kVal(k)); kSet(k, os[(i + d + n) % n].c); const b = root.querySelector(`.mx[data-ax="${k}"]`); b?.classList.add('ch'); setTimeout(() => b?.classList.remove('ch'), 500) }
  root.querySelectorAll('.mx[data-ax]').forEach((b) => {
    b.addEventListener('click', (e) => { pressEl(b); sound.play('move'); stepAx(b.dataset.ax, e.shiftKey ? -1 : 1) })
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); pressEl(b); stepAx(b.dataset.ax, -1) })
  })
  // the options dock (28 Oct, Andrew: the full-screen OPTIONS legend hid what it changed): a small panel in the park's bottom-right corner.
  // Pick what to change along the top, click an option (or left and right) to try it with the whole screen still in view; up and down move between the things to change.
  // Options that only show when something happens get a SEE IT button: a ball flies (landing, camera, pitch arc), Karl rolls in, or the menu opens (its title).
  const dock = E('#c25dk')
  let dockAx = DOCK.includes(store('nn-dock25')) ? store('nn-dock25') : DOCK[0]
  const SEE = { G: 'PLAY A SHOW', O: 'SHOW ME', N: 'CALL A SEAT', Q: 'LOOK AT IT', C: 'LOOK AT IT', D: 'SHOW ME', F: 'FLY A BALL', Z: 'FLY A BALL', H: 'FLY A BALL', U: 'FLY A BALL', X: 'FLY A BALL', E: 'FLY A BALL', K: 'BRING IN KARL', M: 'OPEN THE MENU' }
  const dockOpts = (k) => (AXES[k] ? AXES[k].opts.filter((o) => !o.hide || mix[k] === o.c) : LAB[k].opts)
  const kVal = (k) => (AXES[k] ? mix[k] : lab[k]), kName = (k) => (AXES[k] ?? LAB[k]).name, kOpt = (k, c) => dockOpts(k).find((o) => o.c === c) ?? dockOpts(k)[0]
  const kSet = (k, c) => { if (AXES[k]) { mix[k] = c; applyMix(k) } else { setLab(k, c); paintDock() } }
  function paintDock() {
    if (!grid.classList.contains('dk')) return
    const k = dockAx, os = dockOpts(k), o = kOpt(k, kVal(k)), n = os.findIndex((x) => x.c === kVal(k))
    dock.innerHTML = `<div class="dh"><b>OPTIONS</b><span class="bt" data-dk="x" aria-label="close the options">X</span></div>
      <div class="dx" style="grid-template-columns:repeat(${Math.min(5, DOCK.length)},minmax(0,1fr))">${DOCK.map((a) => `<span class="bt${a === k ? ' on' : ''}${LAB[a] ? ' lb' : ''}" data-ax="${a}" title="${kName(a)}" aria-label="${kName(a)}">${a}${kVal(a)}</span>`).join('')}</div>
      <div class="da">${kName(k)}<span>${n + 1} OF ${os.length}</span></div>
      <div class="dl">${os.map((x) => `<div class="do${x.c === kVal(k) ? ' on' : ''}" data-c="${x.c}" role="button" aria-label="${k}${x.c} ${x.name}" title="${x.name}"><b>${k}${x.c}</b><span>${k === 'BI' ? nukeSVG(x.c, 1.5, 'var(--tx)') + ' ' : k === 'BC' ? `<i class="sw" style="background:${x.hex}"></i>` : ''}${x.name}</span></div>`).join('')}</div>
      <div class="dd">${(o.desc ?? '').toUpperCase()}</div>
      <div class="df">&larr; &rarr; TRY &nbsp; &uarr; &darr; WHAT${SEE[k] ? `<span class="bt" data-dk="see">${SEE[k]}</span>` : ''}</div>`
    dock.querySelectorAll('[data-ax]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); dockTo(b.dataset.ax) }))
    // (1 Nov, later; an audit) pointing at an option shows what it is before you pick it; the one that is on comes back when you leave
    { const dd = dock.querySelector('.dd'), own = dd.textContent; dock.querySelectorAll('.do').forEach((d) => { const x = os.find((y) => String(y.c) === d.dataset.c); d.addEventListener('mouseenter', () => { dd.textContent = `${k}${x.c} ${x.name}: ${(x.desc ?? '').toUpperCase()}`; dd.classList.add('pv') }); d.addEventListener('mouseleave', () => { dd.textContent = own; dd.classList.remove('pv') }) }) }
    dock.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { sound.play('move'); kSet(k, Number(b.dataset.c)); dock.focus({ preventScroll: true }) }))
    dock.querySelector('[data-dk="x"]').addEventListener('click', () => toggleDock(false))
    dock.querySelector('[data-dk="see"]')?.addEventListener('click', (e) => { pressEl(e.currentTarget); seeIt(k) })
  }
  const dockTo = (k) => { dockAx = k; store('nn-dock25', k); paintDock(); dock.focus({ preventScroll: true }) }
  const seeIt = (k) => { if (k === 'G') { life?.play(life.nextGag(), {}, 0, true); return } if (k === 'O') { if (mode !== 'replay') setMode('replay'); openMod('before'); return } if (k === 'Q' || k === 'C') { lookThere(k); return } if (k === 'N') { if (mode !== 'shot') setMode('shot'); if (!scRes) { const r = se.seatPoint('140', '12', '8'); if (!r.err) shotAt(r.at, { what: 'seat', sec: r.sec, area: r.area, row: r.row, seat: r.seat, line: r.line }) } return } if (k === 'D') { if (mode === 'replay') { const n = balls.findIndex((b) => !facesRaw[String(b.b)]); if (n >= 0) { idx = n; applyBall(balls[n]); paintChooser() } else setMode('whatif') } return } if (k === 'K') toggleKarl(true); else if (k === 'M') openMenu(null); else fire() }
  function toggleDock(on) {
    const v = on ?? !grid.classList.contains('dk')
    grid.classList.toggle('dk', v)
    if (v) { paintDock(); dock.focus({ preventScroll: true }) } else { dock.innerHTML = ''; dock.blur() }
  }
  // Enter and Space on a button reached with Tab (29 Oct red team: finishUI wires only the buttons there at startup, and most are drawn later)
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && e.target?.classList?.contains('bt') && e.target.matches(':focus-visible')) { e.preventDefault(); e.stopPropagation(); e.target.click() } })
  // the dock's own keys while it has focus; anything else falls through to the usual shortcuts
  dock.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || modal || !grid.classList.contains('dk')) return // a closed dock (still holding focus) leaves every key alone
    if (e.key === 'Enter' || e.key === ' ') { const t = e.target.closest?.('[data-c],[data-ax],[data-dk]'); if (!t) return; e.preventDefault(); e.stopPropagation(); t.click(); return } // (else Space still nukes it)
    const i = DOCK.indexOf(dockAx), n = DOCK.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { sound.play('move'); stepAx(dockAx, e.key === 'ArrowRight' ? 1 : -1) }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { sound.play('move'); dockTo(DOCK[(i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n]) }
    else if (e.key === 'Escape' || e.key === '?') toggleDock(false)
    else return
    e.preventDefault(); e.stopPropagation()
  })
  E('#c25lg').addEventListener('click', () => { if (!uiReady) return; pressEl(E('#c25lg')); toggleDock() })
  // the MOMENTS menu
  let mmStop = null // (stops what the menu has queued: a new swing and a tab change call it)
  { const mm = document.createElement('div'); mm.className = 'mmenu'; mm.setAttribute('role', 'dialog'); mm.setAttribute('aria-label', 'landing moments'); grid.appendChild(mm)
    const list = LAB.MO.opts.filter((x) => x.kind)
    mm.innerHTML = `<div class="mh"><span>LANDING MOMENTS</span><span class="bt" data-mm="x" aria-label="close">X</span></div><div class="mi" data-mm="all" tabindex="0">PLAY ALL<em>every one in turn, five seconds apart</em></div>` + list.map((x) => `<div class="mi" data-mm="${x.kind}" tabindex="0">${x.name}<em>${x.desc}</em></div>`).join('')
    let spot = null, allT = []
    // a seat in the left-field bleachers, 395 ft out, 14 degrees off center: the first surface under it in the park's own model
    const seatSpot = () => { if (spot) return spot; const b = (-14 * Math.PI) / 180, r = 395 * 0.3048, top = api.toWorld([r * Math.sin(b), r * Math.cos(b), 80]), h = parkHitM(api.NN, top, new api.NN.THREE.Vector3(0, -1, 0), 120); spot = h ? h.point.clone() : api.toWorld([r * Math.sin(b), r * Math.cos(b), 6]); return spot }
    const play = (kind) => { const at = seatSpot(); mm.querySelectorAll('.mi').forEach((m) => m.classList.toggle('on', m.dataset.mm === kind)); lookAt([at], 24); allT.push(setTimeout(() => { if (mm.classList.contains('on')) moments.try(kind, at.clone()) }, 450)) }
    const stopAll = () => { for (const t of allT) clearTimeout(t); allT = [] }
    mmStop = () => { stopAll(); if (mm.classList.contains('on')) moments.clear() }
    mm.addEventListener('click', (e) => { const t = e.target.closest('[data-mm]'); if (!t) return; sound.play('pick'); const k = t.dataset.mm; stopAll(); if (k === 'x') { mm.classList.remove('on'); moments.clear(); return } if (k === 'all') { list.forEach((x, i) => allT.push(setTimeout(() => { if (mm.classList.contains('on')) play(x.kind) }, i * 5200))); return } play(k) })
    mm.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const t = e.target.closest('[data-mm]'); if (t) { e.preventDefault(); e.stopPropagation(); t.click() } } if (e.key === 'Escape') { e.stopPropagation(); mmStop?.(); mm.classList.remove('on') } }) // (7 Nov, red team 7: as the X does)
    E('#c25mm').addEventListener('click', () => { if (!uiReady) return; pressEl(E('#c25mm')); sound.play('move'); if (mm.classList.contains('on')) mmStop?.(); else stopAll(); mm.classList.toggle('on'); if (mm.classList.contains('on')) mm.querySelector('.mi')?.focus() })
    window.__mix25moments = { play, list: () => list.map((x) => x.kind), spot: seatSpot }
  }

  function applyBall(b) {
    cur = b; edited = false
    cancelPlay(); pitchCam?.clear() // the last pitch arc belongs to the last ball, and a pitch still on its way is called off
    if (life) { const n = pname(b.b); life.idle(`${(n ? n[0] : 'BATTER ' + b.b).toUpperCase()}  ·  ${b.d}`); life.setClock(b.tm ? { hm: b.tm } : { live: true }) } // the clock: when it was hit, in that park's time
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false })
    api.setPreview(true); api.update()
  }
  // a blank swing (29 Oct, Andrew: TWEAK THE TATER only changes a real home run; DINGER DOJO starts from scratch)
  const DOJO0 = { ev: 103, la: 28, dir: 0, temp: 62, wind: 0, xwind: 0, carry: 1, dws: 0, tab: true }
  let dojoKeep = null
  function setMode(m) {
    if (mode === 'whatif' && m !== 'whatif' && !stepped) dojoKeep = { ...snap(), hand: api.state.hand } // (1 Nov, night: your own swing waits for you; a tweak of a real ball does not)
    if (m === 'shot' && !atOracle) m = 'replay' // Shot Caller knows Oracle's seats only
    if (uiReady && m !== mode) sound.play('mode-' + m) // a stinger for each mode
    cancelPlay(); flight?.setGhost(null); stepped = null // tweak() sets it again after this
    if (m !== 'shot') E('#c25nk')?.classList.remove('dorm')
    if (reel && m !== 'replay') stopReel()
    stopShot()
    if (mode === 'shot' && m !== 'shot') { sc.clear(); scRes = null; unlook() }
    if (m === 'shot' && show !== 'hist') setShow(show) // Shot Caller has the shared panel to itself
    mode = m
    if (m === 'replay' && R.balls.length) { stepped = null; balls = filtered(); if (!balls.length) { filter = 'giants'; balls = filtered() } idx = Math.min(idx, balls.length - 1); applyBall(balls[idx]) } else { if (m === 'replay') mode = 'whatif'; cur = null; Object.assign(api.state, DOJO0, { hand: youHand() }, mode === 'whatif' && dojoKeep ? dojoKeep : {}); life?.setClock({ live: true }); api.setPreview(true); api.update() }
    syncMode()
    relayout()
    paintChooser()
    if (uiReady) paintTabs()
    if (uiReady) paintBug() // (1 Nov, later: a fresh dojo swing has no game; in the dojo nothing else repaints it until a ball flies)
  }
  // the grid for the mode: ns (no number strip along the bottom: the replay, Shot Caller, and the dojo, whose controls sit top left in the pitch's place, dj); the title
  function syncMode() {
    const dj = mode === 'whatif' && !stepped && mix.L === 2 // the dojo's controls top left (on L2; the other layouts keep the strip along the bottom)
    grid.classList.toggle('ns', mode !== 'whatif' || dj); grid.classList.toggle('dj', dj); grid.classList.toggle('wi', mode === 'whatif'); grid.classList.toggle('shot', mode === 'shot')
    E('#c25sc').classList.toggle('on', mode === 'shot')
    if (ctl3d) ctl3d.visible = mode === 'whatif' && show !== 'hm' // (at once, not on the next frame's render)
    paintCrumb()
    paintTitles()
  }
  // TWEAK THE TATER: carry this home run into the dojo with its own numbers, and a way back to the same ball
  function tweak() {
    if (!cur) return
    const b = cur, from = { idx, filter, b }
    sound.play('pick')
    setMode('whatif'); stepped = from; syncMode(); relayout()
    // the real ball's own carry and side spin come along (28 Oct, night): untouched, the numbers fly the real flight, so every change you make is the only difference
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry ?? 1, dws: b.dws ?? 0, tab: false })
    from.real = { ev: b.ev, la: b.la, dir: b.dir, temp: b.temp, wind: 0, xwind: 0, hand: b.s === 'R' ? 1 : -1, carry: b.carry ?? 1, dws: b.dws ?? 0, tab: false }
    { const r0 = api.fly({ ...api.state }, {}), src = r0.visPath ?? r0.path; flight?.setGhost(src.filter((_, k) => k % 4 === 0).map((q) => api.toWorld(q.p))) }
    api.update(); from.ft = Math.round((window.__dojo ?? api.fly({ ...api.state }, {})).landFt); paintChooser()
  }
  // any real ball into TWEAK THE TATER (from a LANDING PARTY row): the replay goes to it first, so BACK TO THE REPLAY lands on it
  function tweakBall(b) {
    if (mode !== 'replay') setMode('replay')
    filter = 'all'; balls = filtered(); const i = balls.indexOf(b); if (i < 0) return
    idx = i; applyBall(b); paintChooser(); lpKey = ''; tweak()
  }
  function backToReplay() { const s = stepped; filter = s.filter; idx = s.idx; setMode('replay'); sound.play('back') }
  const step = (d) => { if (mode !== 'replay' || !balls.length) return; idx = (idx + d + balls.length) % balls.length; applyBall(balls[idx]); paintChooser(); sound.play('move') }
  // the ball's buttons (1 Nov, night: "landing party and seat seance are buttons on specific balls - both in deja vu and dojo")
  const BALL_WHY = { lp: 'the real Oracle home runs most like this one, as pins where they came down', se: 'hundreds of ghosts of this flight, and the seat they come down in', my: 'your seat, and the real home runs that came down near it', hm: 'how hard it is to get a ball out to each part of Oracle tonight, or how a hitter of your choosing would do here' }
  const ballBtns = () => atOracle ? [['lp', 'LANDING PARTY', 'L'], ['se', 'SEAT SEANCE', 'G'], ].map(([k, l, key]) => `<span class="bt ball${show === k ? ' on' : ''}" data-show="${k}" title="${l}${key ? ` (${key})` : ''}: ${BALL_WHY[k]}">${l}</span>`).join('') : ''
  const wireBall = (el) => el.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => { if (!uiReady) return; pressEl(b); sound.play('move'); setShow(b.dataset.show); paintChooser() }))
  const nightName = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  function paintChooser() {
    const el = E('#c25ch')
    { const nk = E('#c25nk'), w = nk?.offsetWidth ?? 0; if (w && innerWidth >= 900) { const r = w + (compactK() < 1 ? 22 : 30) + 'px'; if (el.style.right !== r) el.style.right = r } } // (3 Nov: the buttons wrap short of NUKE IT, however wide it is)
    grid.classList.toggle('called', !!scRes) // (1 Nov, night; playtest: before a seat is picked, Shot Caller showed the dojo's leftover numbers)
    if (mode === 'shot') { paintShotBar(el); return }
    if (mode !== 'replay') {
      const sb = stepped ? pname(stepped.b.b) : null
      el.innerHTML = `<div class="r1">${stepped ? '<span class="bt" id="c25back">BACK TO THE REPLAY</span><span class="bt" id="c25rst">RESET TO THE REAL BALL</span>' : ''}${ballBtns()}</div><div class="r2">${tweakLine()}</div>`
      wireBall(el)
      el.querySelector('#c25rst')?.addEventListener('click', (e) => { pressEl(e.currentTarget); sound.play('back'); Object.assign(api.state, stepped.real); api.update(); paintChooser() })
      el.querySelector('#c25back')?.addEventListener('click', () => { pressEl(el.querySelector('#c25back')); backToReplay() })
      return
    }
    const bn = pname(cur?.b), pn = pname(cur?.p)
    const nights = [...new Set(balls.map((b) => b.d))], perNight = new Map()
    for (const b of balls) perNight.set(b.d, (perNight.get(b.d) ?? 0) + 1)
    el.innerHTML = `<div class="r1"><span class="bt" data-st="-1" aria-label="newer ball" title="newer ([)">&lt;</span><span class="bt" data-st="1" aria-label="older ball" title="older (])">&gt;</span> BALL ${idx + 1} OF ${balls.length} <select id="c25nt" aria-label="go back to a night">${nights.map((d) => `<option value="${d}"${d === cur?.d ? ' selected' : ''}>${nightName(d)} · ${perNight.get(d)} HR</option>`).join('')}</select>
      ${[['giants', 'GIANTS HR'], ['oracle', 'ORACLE HR'], ['menu', NAMES.offMenu], ['big', 'BIG ONES'], ...(seenDays().length ? [['mine', 'MY GAMES']] : []), ['all', 'ALL']].map(([k, l]) => `<span class="bt${filter === k ? ' on' : ''}" data-f="${k}">${l}</span>`).join('')}<span class="bt${reel ? ' on' : ''}" id="c25rl" title="the walk-offs, grand slams and late go-ahead shots, back to back">${reel ? `REEL: ${(reel.i % Math.max(1, balls.length)) + 1} OF ${balls.length}` : 'REEL'}</span><span class="bt hot" id="c25tw" title="${NAMES.tweak} (X): this home run in the dojo, to change one thing">${NAMES.tweak}</span>${ballBtns()}</div>
      <div class="r2"><b>${bn ? bn[0].toUpperCase() : 'BATTER ' + cur?.b}</b> V ${pn ? pn[0].toUpperCase() : 'PITCHER'}  ${cur?.d ? nightName(cur.d) : ''}  ${cur?.park === 'SF' ? 'AT ORACLE' : `AT ${cur?.park ?? ''}, FLOWN HERE AT ORACLE`}${cur?.temp != null ? `  ${Math.round(cur.temp)}°F` : ''}</div>`
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { pressEl(b); step(Number(b.dataset.st)) }))
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); filter = b.dataset.f; balls = filtered(); idx = 0; applyBall(balls[0]); paintChooser() }))
    E('#c25tw').addEventListener('click', () => { pressEl(E('#c25tw')); tweak() })
    E('#c25rl').addEventListener('click', () => { pressEl(E('#c25rl')); if (reel) stopReel(); else startReel() })
    el.querySelector('#c25nt')?.addEventListener('change', (e) => { const i = balls.findIndex((b) => b.d === e.target.value); if (i < 0) return; sound.play('move'); idx = i; applyBall(balls[idx]); paintChooser() })
    wireBall(el)
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', x.textContent.trim()) }
  }
  // TWEAK THE TATER, made plain (28 Oct, night, Andrew: "really difficult to discern... think through this interface"): the strip is the swing (speed, angle, where it's
  // aimed) and the night (air, wind); each number says how far it is from the real ball; the line over the strip says, in words, what your changes did
  const FIELD = (d) => (Math.abs(d) <= 4 ? 'DEAD CENTER' : `${Math.round(Math.abs(d))}° ${Math.abs(d) >= 38 ? (d < 0 ? 'LF LINE' : 'RF LINE') : Math.abs(d) >= 20 ? (d < 0 ? 'LEFT FIELD' : 'RIGHT FIELD') : d < 0 ? 'LEFT-CENTER' : 'RIGHT-CENTER'}`)
  const UNIT = { ev: ' MPH', la: '°', temp: '°F', wind: ' MPH' }
  function slotText(k) {
    const v = api.state[k], r = mode !== 'replay' && stepped?.real ? stepped.real[k] : null, d = r == null ? 0 : Math.round(v - r)
    const xw = api.state.xwind ?? 0, main = k === 'dir' ? FIELD(v) : k === 'wind' ? (v === 0 && !xw ? 'CALM' : `${v ? `${Math.abs(v)} ${v > 0 ? 'OUT' : 'IN'}` : ''}${v && xw ? ' ' : ''}${xw ? `${Math.abs(xw)}${xw > 0 ? 'R' : 'L'}` : ''}`) : `${v}${UNIT[k] ?? ''}`
    return main + (d ? ` <i class="dv">${d > 0 ? '+' : ''}${d}</i>` : '')
  }
  function tweakLine() {
    if (!stepped?.real) return 'SPEED, ANGLE AND AIM ARE THE SWING; AIR AND WIND ARE THE NIGHT. SPACE TO NUKE IT.'
    const sb = pname(stepped.b.b), who = (sb ? sb[0] : 'BATTER ' + stepped.b.b).toUpperCase(), s = api.state, R0 = stepped.real
    const ch = [['ev', ' MPH'], ['la', '°'], ['dir', '° OF AIM'], ['temp', '° OF AIR'], ['wind', ' MPH OF WIND']].map(([k, u]) => { const d = s[k] - R0[k], t = Math.abs(d) < 1 ? d.toFixed(1) : String(Math.round(d)); return Math.abs(d) >= 0.05 ? `${d > 0 ? '+' : ''}${t}${u}` : null }).filter(Boolean)
    if (!ch.length) return `${who}'S REAL BALL, ${stepped.b.d}: ${stepped.ft} FT. CHANGE A NUMBER AND NUKE IT.`
    const fl = window.__dojo ?? api.fly({ ...api.state }, {}), now = Math.round(fl.landFt), dd = now - stepped.ft, gone = fl.verdict?.kind === 'GONE' // (the engine's own last flight, 31 Oct)
    return `${who}, ${stepped.b.d}, WITH ${ch.join(', ')}: <b>${now} FT</b> (${dd >= 0 ? '+' : ''}${dd}), ${gone ? 'STILL GONE' : 'NOT GONE'}${stepped.b.hr && !gone ? '. YOU TOOK AWAY A HOME RUN' : !stepped.b.hr && gone ? '. YOU MADE IT A HOME RUN' : ''}`
  }
  const slots = [...root.querySelectorAll('.strip .bt')]
  slots.forEach((el, i) => { if (ctl.SLOTS[i]) el.dataset.k = ctl.SLOTS[i].k }) // (BLAST RADIUS hides the swing's own three and keeps AIR and WIND)
  ctl.els = slots
  ctl.onArm = () => paintSlots()
  ctl.onChange = () => { edited = true; markInput(); paintSlots(); if (mode !== 'replay') { const r2 = E('#c25ch .r2'); if (r2) r2.innerHTML = tweakLine() } }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => { const d = e.target.closest('i[data-d]'); if (i === NS) { fire(); return } ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d)) })
    el.addEventListener('wheel', (e) => { if (i === NS) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  // the hit-stop follows the contact (1 Nov, night, the feel pass): 80 ms on a soft one, up to 190 ms on a 115 mph rocket, so the big ones land harder
  const holdFor = (ev) => Math.round(80 + 110 * Math.min(1, Math.max(0, (ev - 95) / 20)))
  const fire = () => { window.__cpHold = holdFor(api.state.ev); const nk = E('#c25nk'); nk?.classList.add('go'); setTimeout(() => nk?.classList.remove('go'), 140); if (mode === 'replay') { play(); return } if (mode === 'shot') { if (scRes?.ways?.length) playShot(); else banner('PICK A SEAT', 'CLICK ONE IN THE PARK, OR TYPE IT TOP LEFT'); return } ses.fire() }
  // (29 Oct red team: the arrows and +/- silently edited the real ball in DEJA-VU and Shot Caller, and Space swung behind an open modal)
  ctl.bind(fire, 'h', (kind) => !modal && (kind === 'fire' ? show !== 'hm' : mode === 'whatif' && (show !== 'hm' || (!hmWho && ['temp', 'wind'].includes(ctl.SLOTS[ctl.armed]?.k)))))
  E('#c25nk').addEventListener('click', () => { if (!uiReady) return; fire() })
  const paintSlots = () => { pix?.paint(); slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < NS); if (i < NS) { const bb = el.querySelector('b'); if (!bb.querySelector('input')) bb.innerHTML = slotText(ctl.SLOTS[i].k); const sl = el.querySelector('.sld'); if (sl && document.activeElement !== sl) sl.value = String(Math.round(ctl.frac(ctl.SLOTS[i].k) * 1000)) } }) }
  // sliders (28 Oct, Andrew: TWEAK THE TATER should have sliders): drag a slot's slider to set it; its keys stay with the slider, not the strip's arrow keys
  slots.forEach((el, i) => { const sl = el.querySelector('.sld'); if (!sl) return; sl.addEventListener('input', () => { ctl.arm(i); ctl.setFrac(i, Number(sl.value) / 1000); ctl.onChange() }); sl.addEventListener('keydown', (e) => { if (e.key !== 'Escape' && e.key !== 'Enter') e.stopPropagation() }); sl.addEventListener('wheel', (e) => e.stopPropagation()); sl.addEventListener('change', () => sl.blur()) }) // (red team: a dragged slider kept the focus and swallowed Enter, Esc and the shortcuts)
  // the labels: an icon each (J1), or the icon and the word (J2); the word stays in the title and for screen readers
  const SLOT_WORD = { ev: 'EXIT VELOCITY', la: 'LAUNCH ANGLE', dir: 'LAUNCH DIRECTION', temp: 'AIR TEMPERATURE', wind: 'WIND' } // his words, 29 Oct, evening
  const SLOT_SHORT = { ev: 'SPEED', la: 'ANGLE', dir: 'AIM', temp: 'AIR', wind: 'WIND' } // (31 Oct: with the pixel instruments the drawing is the icon; a short word beside it)
  const paintSlotLabels = () => slots.forEach((el, i) => { if (i >= NS) return; const k = ctl.SLOTS[i].k, w = SLOT_WORD[k] ?? ctl.SLOTS[i].label, ps = el.querySelector('.ps'), h = PIXCTL[mix.J] ? `<em>${SLOT_SHORT[k] ?? w}</em>` : (SLOT_ICONS[k] ? iconSVG(SLOT_ICONS[k], 3, w) : '') + (mix.J !== 1 || !SLOT_ICONS[k] ? `<em>${w}</em>` : ''); if (ps.dataset.h !== h) { ps.innerHTML = h; ps.dataset.h = h; el.title = w } })
  slotLabels = paintSlotLabels; paintSlotLabels()
  // the pixel instruments (J3 to J9): a drag sets the same numbers as the sliders
  pix = initPixCtl(slots.slice(0, NS).map((el, i) => ({ el, k: ctl.SLOTS[i].k })), {
    get: () => api.state, arm: (i) => ctl.arm(i), sound: (k) => sound.play(k),
    colors: () => { const cs = getComputedStyle(root); return { tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim(), acc: cs.getPropertyValue('--acc').trim() } },
    set: (k, v) => { if (k === 'wind') { if (v.wind === api.state.wind && v.xwind === (api.state.xwind ?? 0)) return; Object.assign(api.state, v); api.update() } else U.setP(api, k, v); ctl.onChange() },
  })
  pixStyle = () => { const st = PIXCTL[mix.J] ? mix.J : 0, sl = E('#c25sl'); sl.classList.toggle('px', !!st); sl.classList.toggle('big', !!PIXCTL[st]?.big); pix.setStyle(st) }
  // typing a number (29 Oct, later, Andrew: "allow people to type in speed angle direction too"): click the speed, the angle or the aim and type it; Enter or leaving
  // the box sets it, Esc puts it back. The aim takes 20L, L20, 20 L, -20 (left), 15R or 15 (right), C or CF (dead center)
  // plain numbers only (no 1e2 or 0x6E); the aim takes L or R (or LF, RF, LEFT, RIGHT) on either side, never both, never with a minus; out of range is refused
  const parseSlot = (k, t) => {
    t = String(t).trim().toUpperCase().replace(/°|MPH|DEG(REES)?/g, '').replace(/\s+/g, ' ').trim()
    const NUM = /^-?\d+(\.\d+)?$/, inRange = (v) => (v >= U.SPEC[k].lo && v <= U.SPEC[k].hi ? v : null)
    if (k !== 'dir') return NUM.test(t) ? inRange(Number(t)) : null
    if (/^(C|CF|CENTER|DEAD CENTER|0)$/.test(t)) return 0
    const m = t.match(/^(LEFT|RIGHT|LF|RF|L|R)? ?(-?\d+(?:\.\d+)?) ?(LEFT|RIGHT|LF|RF|L|R)?$/)
    if (!m || (m[1] && m[3]) || ((m[1] || m[3]) && m[2].startsWith('-'))) return null
    const side = (m[1] ?? m[3] ?? '')[0], v = Number(m[2])
    return inRange(side === 'L' ? -v : side === 'R' ? v : v)
  }
  const editTxt = (k) => { const v = api.state[k]; return k === 'dir' ? (v < 0 ? `${-v}L` : v > 0 ? `${v}R` : 'C') : String(v) }
  function editSlot(i) {
    const el = slots[i], k = ctl.SLOTS[i].k, b = el.querySelector('b.num')
    if (!['ev', 'la', 'dir'].includes(k) || b.querySelector('input')) return
    ctl.arm(i)
    b.innerHTML = `<input class="tv" value="${editTxt(k)}" maxlength="12" autocomplete="off" spellcheck="false" aria-label="type the ${SLOT_WORD[k].toLowerCase()}"${k === 'dir' ? '' : ' inputmode="decimal"'}>`
    const inp = b.querySelector('input')
    let done = false
    const end = (ok) => {
      if (done) return; done = true
      const same = inp.value.trim().toUpperCase() === editTxt(k).toUpperCase(), v = ok && !same ? parseSlot(k, inp.value) : null
      b.textContent = ''
      // (red team: leaving the box untouched rounded a real 104.7 mph to 105; a number out of range is refused, not quietly clamped)
      if (v != null) { sound.play('pick'); U.setP(api, k, v); ctl.onChange() } else if (ok && !same) sound.play('back')
      paintSlots()
    }
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); end(true) } else if (e.key === 'Escape') { e.preventDefault(); end(false) } })
    inp.addEventListener('blur', () => end(true))
    inp.addEventListener('click', (e) => e.stopPropagation())
    inp.focus(); inp.select()
  }
  slots.forEach((el, i) => { if (i < NS) el.querySelector('b.num').addEventListener('click', (e) => { e.stopPropagation(); editSlot(i) }) })

  // ---- odds: the final model for an unedited real ball where it was hit; the what-if model (or real balls like it) for anything else ----
  const elevAt = () => parks.parks.find((p) => p.abbr === (window.__parkX ?? 'SF'))?.elev_ft ?? 0
  const wiP = (x) => whatIfP(wim, x)
  const wiIn = (s, bear) => { const w = api.wallAt?.(bear) ?? [400, 8]; return { ev: s.ev, la: s.la, bear, hand: s.hand, temp: s.temp, elev: elevAt(), fence: w[0], wallh: w[1] } }
  function odds() {
    const s = api.state, at = window.__parkX ?? 'SF'
    if (mode === 'replay' && cur && !edited && cur.pm != null && cur.park === at) return { p: cur.pm, src: 'MODEL' }
    if (wim && last) return { p: wiP(wiIn(s, last.landB ?? s.dir)), src: at === 'SF' ? 'WHAT-IF MODEL' : 'WHAT-IF MODEL AT ' + at }
    const l = ballsLike(pool, s.ev, s.la, s.dir)
    return l.n ? { p: l.hr, src: `${l.n} REAL BALLS LIKE THIS` } : { p: null, src: 'NO REAL BALLS THAT CLOSE' }
  }
  const pct = (p) => (p == null ? '--' : p >= 0.995 ? '>99' : p < 0.005 ? '<1' : String(Math.round(p * 100)))

  // ---- pop-ups ----
  let iniCancel = null
  // (1 Nov, later; an audit) the focus goes into an open window and back where it was when it closes, so Tab and Enter never reach a button behind it
  let modFrom = null
  const openMod = (k) => { if (k === 'bay' && bay?.error) bay = null; if (!modal) { sound.play('modal-open'); modFrom = document.activeElement } modal = k; E('#c25m').classList.add('open'); E('#c25m').classList.toggle('wwm', k === 'witness'); paintModal(); E('#c25cl')?.focus?.({ preventScroll: true }); if (k === 'moon') life?.play('moon', {}, 0, true); if (uiReady) paintTabs() }
  const closeMod = () => { if (modal) sound.play('modal-close'); if (wEd) { wEd.destroy(); wEd = null } if (wTab === 'card') wTab = 'mine'; modal = null; E('#c25m').classList.remove('open', 'wwm'); iniCancel?.(); iniCancel = null; if (modFrom?.isConnected) modFrom.focus?.({ preventScroll: true }); modFrom = null; if (uiReady) paintTabs() }
  E('#c25cl').addEventListener('click', closeMod)
  E('#c25m').addEventListener('click', (e) => { if (e.target === E('#c25m')) closeMod() })
  function paintModal() {
    if (!modal) return
    const body = E('#c25mb')
    if (modal === 'mix') {
      E('#c25mt').textContent = '/ O P T I O N S /'
      body.innerHTML = `<div class="legend"><div class="code num">${mixCode(mix)}</div><div class="fix">LOCKED: ${Object.entries(LOCKED).map(([a, c]) => a + c + ' ' + optOf(a, c).name).join(' · ')}. CLICK AN OPTION TO TRY IT.</div>` + OPEN.map((k) => `<div><h5>${k} ${AXES[k].name}</h5>${AXES[k].opts.filter((o) => !o.hide || mix[k] === o.c).map((o) => `<div class="o${mix[k] === o.c ? ' on' : ''}" data-k="${k}" data-i="${o.c}"><b>${k}${o.c}</b>${o.name}<span>${(o.desc ?? "").toUpperCase()}</span>${o.why && o.c > 1 ? `<em>WHY: ${o.why.toUpperCase()}</em>` : ''}</div>`).join('')}</div>`).join('') + '</div>'
      body.querySelector('.legend').insertAdjacentHTML('beforeend', `<div><h5 class="lab">THE LAB <span>${labCode()}</span></h5></div>` + Object.entries(LAB).map(([k, a]) => `<div><h5>${k} ${a.name}</h5>${a.opts.map((o) => `<div class="o${lab[k] === o.c ? ' on' : ''}" data-lab="${k}" data-i="${o.c}"><b>${k}${o.c}</b>${k === 'BI' ? nukeSVG(o.c, 2, 'var(--tx)') + ' ' : k === 'BC' ? `<i class="sw" style="background:${o.hex}"></i>` : ''}${o.name}<span>${(o.desc ?? '').toUpperCase()}</span></div>`).join('')}</div>`).join(''))
      body.querySelectorAll('.o[data-lab]').forEach((o) => o.addEventListener('click', (e) => { e.stopImmediatePropagation(); sound.play('move'); setLab(o.dataset.lab, Number(o.dataset.i)); paintModal() }))
      body.querySelectorAll('.o:not([data-lab])').forEach((o) => o.addEventListener('click', () => { mix[o.dataset.k] = Number(o.dataset.i); sound.play('move'); applyMix(o.dataset.k) }))
      return
    }
    if (modal === 'before') { paintBefore(body); return }
    if (modal === 'type') { paintTypes(body); return }
    if (modal === 'moon') { paintMoon(body); return }
    if (modal === 'jukebox') { paintJukebox(body); return }
    if (modal === 'news') { // (30 Oct, night) what is new, and the things you would not find by looking
      E('#c25mt').textContent = "/ W H A T ' S   N E W /"
      const L = [['THE MENU', 'FOUR THINGS NOW: DINGER DÉJÀ-VU, DINGER DOJO, SHOT CALLER, WALLOP WITNESS (DAILY DINGER AND THE GAG REEL ARE GONE; THE GAGS STILL PLAY IN THE PARK)'],
        ['HOW FAR', 'WHERE A BALL COMES DOWN, ITS FEET IN BIG VOXEL DIGITS OVER THE SPOT'],
        ['WALLOP WITNESS', 'TICK A GAME WITHIN 72 HOURS OF FIRST PITCH; AFTER THAT IT IS CLOSED'],
        ['FOUL POLES AND BUBBLES', 'THE FOUL POLES STAND OUT NOW; THE COKE BOTTLE\'S BUBBLES FIZZ OUT OF THE NECK AND POP IN THE AIR'],
        ['SEAT SEANCE', 'A BALL THAT CLEARS THE LAST ROW IS CALLED PAST THE SEATS, NOT IN ONE'],
        ['KEYS', 'SPACE NUKE IT · U COPY A LINK TO THIS SWING · [ ] THE BALLS · M DOJO · C SHOT CALLER · X TWEAK IT · L LANDING PARTY · G SEANCE · W WEATHER · B BIRD\'S EYE · Z CAMERA PUSH · S SOUND · J SOUND · A STATS · T TYPE A BALL · ? OPTIONS · BACKSPACE UNDO · 0 A BLANK SWING · ESC MENU'],
        ['NUKE IT', 'ONE BUTTON, BOTTOM RIGHT OF THE PARK IN EVERY MODE (OR SPACE): PLAYS THE REAL ONE, SWINGS YOURS, FLIES THE SHOT CALLER WAYS; NOW DARK WITH A COLORED EDGE, FINER BOMBS'],
        ['THE PARK\'S TAGS, QUIETER', 'A SMALLER BOARD, THE CAPTION IN GREY, EACH NUMBER IN ITS POST\'S COLOR (PARK TAGS AND TIE IN THE SIDE MENU)'],
        ['THE BALL\'S SHADOW', 'A DARK SPOT RUNS OVER THE GRASS, THE WALL AND THE SEATS UNDER THE BALL (BALL SHADOW IN THE SIDE MENU: STRAIGHT DOWN OR A LOW SUN)'],
        ['NEW IN AND AROUND THE PARK', 'FIVE THINGS THE KAYAKERS IN THE COVE DO ON A SPLASH (ONE IS A DIVE), A HAT DOMINO IN THE ARCADE, A CRAB CROSSING, A HERON ON THE FOUL POLE, THE CLOCK PANICS ON A LONG ONE, THE GLOVE CATCHES THE FOG'],
        ['THE COKE BOTTLE', 'THREE LOOKS IN THE SIDE MENU: AS IS, LIVING BOTTLE (IT BUBBLES ON A HOME RUN TO LEFT), SODA LANTERN'],
        ['LANDING PARTY', 'NUMBERED PINS IN THE PARK; POINT AT A PIN FOR ITS FLIGHT (ITS ROW LIGHTS), CLICK IT TO TWEAK IT'],
        ['PASS IT ON', 'IN THE DOJO, U COPIES A LINK THAT OPENS A FRIEND ON EXACTLY YOUR SWING'],
        ['UNDO', 'BACKSPACE STEPS BACK THROUGH YOUR DOJO CHANGES; 0 PUTS THE BLANK SWING BACK; A DOUBLE-CLICK ON A 3D HANDLE PUTS THAT ONE BACK'],
        ['FINE TUNING', 'HOLD ALT WHILE DRAGGING THE SLINGSHOT, THE SOCK OR THE THERMOMETER FOR A TENTH AS MUCH; A WHEEL NOTCH OVER ONE IS ONE MPH OR ONE DEGREE (SHIFT: FIVE)'],
        ['IN THE PARK', 'THE SLINGSHOT, SOCK AND THERMOMETER KEEP ONE SIZE AT ANY ZOOM; A REAL BALL IN THE BANDS; GIANTS ON THE PENNANT, STRAIGHT OUT; LANDING PARTY AS NUMBERED PINS'],
        ['THE SIDE MENU (?)', 'THE LAST OPEN PICK: THE SLINGSHOT'],
        ['DOJO CONTROLS', 'BIG ARCS ON THE LEFT: DRAG THE DRAWINGS; THE SPEED IS A ROADRUNNER ON A RAIL (J IN THE HEADER FOR THE OTHER LAYOUTS)'],
        ['THE PARK\'S TAGS', 'VOXEL AGAIN, ON A LITTLE BOARD, ONE SIZE ON THE SCREEN AT ANY ZOOM, NEVER ON EACH OTHER (FOUR LOOKS IN THE SIDE MENU)'],
        ['A HOME RUN IN A CROSSWIND', 'A BALL CURVING ACROSS INTO A NEARER STRETCH OF WALL NOW COUNTS AS GONE (IT USED TO READ AS IN PLAY)'],
        ['SHOT CALLER', 'STARTS CLEAN: PICK A SEAT'], ['FASTER', 'THE DOJO ANSWERS AS YOU DRAG; THE CHARTS AND THE 30 PARKS CATCH UP WHEN YOU STOP'],
        ['NEW GAGS', 'MISSION BURRITO, PARKING BOOT, BISON, POINT TAKEN (GAG REEL)'], ['THE INNING', 'IN THE MENU: A GAME THAT NEVER ENDS; THE ART RUNS EACH SCENE TWICE, THEN ANOTHER'],
        ['STANDS', 'THE LOWER BOWL NOW (V5; MORE IN THE SIDE MENU); A BALL STILL COMES DOWN IN THE SEATS THAT ARE CUT AWAY'],
        ['BAY WATER', 'WIDE AND SLOW, BARELY THERE (B12)'],
        ['CLICK THE SCOREBOARD', 'IN THE PARK: IT PLAYS THE NEXT DODGER GAG'], ['FLOCKED', 'NOW AND THEN THE GULLS CARRY A DODGER FAN OUT OF THE STANDS'],
        ['↑↑↓↓←→←→ B A', 'TRY IT']]
      body.innerHTML = `<div class="lpl">${L.map(([a, b]) => `<div class="lpr nw"><b>&middot;</b><span class="nm">${a}</span><span class="wh">${b}</span></div>`).join('')}</div>`
      return
    }
    if (modal === 'bay') { paintBay(body); return }
    if (modal === 'bulletin' || modal === 'dinger') { paintDaily(body); return }
    if (modal === 'witness') { if (!body.querySelector('.wgrid') || !paintModal.keepW) paintWitness(body); paintModal.keepW = true; return }
    paintModal.keepW = false
    if (!last) return
    if (modal === 'parks') {
      E('#c25mt').textContent = '/ T H I R T Y   P A R K S /'
      const pr = evalParks(parks, api)
      body.innerHTML = `<div style="font-size:20px;margin-bottom:10px;color:var(--acc)">${goneLine(U.goneWord(parks, api, pr, goneReady))}</div><div class="pk">${tileHTML(pr)}</div><div class="baya">FEET OVER EACH WALL (+) OR SHORT OF IT (-); IN = IN PLAY. CLICK A PARK TO FLY THIS BALL THERE.</div>`
      body.querySelectorAll('.pk .tile').forEach((t, i) => { t.style.cursor = 'pointer'; t.style.pointerEvents = 'auto'; t.addEventListener('click', () => goPark(pr[i].p.abbr)) })
    } else {
      E('#c25mt').textContent = '/ E V E R Y   S T A T /'
      body.innerHTML = `<div class="allst">${statCols(last).map(([h, rows]) => `<div><h5>${h}</h5>${rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')}</div>`).join('')}</div>`
    }
  }
  // STATS BEFORE THIS SHOT (29 Oct, evening, Andrew: "all of their stats right before that point ... separate by normal stats, nerd stats, and masochist stats"): his season
  // up to this swing, from public/before_stats.json (science/build_before_stats.py): the card from his game logs (every game before the day), the Statcast and the deep
  // cuts from the batted-ball tables (to the at-bat before, this game's earlier balls included). O names the three groups.
  let before = undefined
  function paintBefore(body) {
    const b = mode === 'replay' ? cur : stepped?.b, nm = b ? pname(b.b) : null, O = optOf('O', mix.O)
    E('#c25mt').textContent = '/ S T A T S   B E F O R E   T H I S   S H O T /'
    if (!b) { body.innerHTML = `<div class="lph">PICK A REAL HOME RUN IN ${NAMES.replay} FIRST.</div>`; return }
    if (before === undefined) { before = null; getJSON('/before_stats.json').then((d) => { before = d && d.rows ? d : false; if (modal === 'before') paintModal() }); }
    if (!before) { body.innerHTML = `<div class="lph">${before === false ? 'THE STATS ARE NOT BUILT ON THIS MACHINE (SCIENCE/BUILD_BEFORE_STATS.PY).' : 'LOADING...'}</div>`; return }
    const row = before.rows[R.balls.indexOf(b)]
    if (!row) { body.innerHTML = '<div class="lph">NO STATS FOR THIS BALL.</div>'; return }
    const RATE = /^(AVG|OBP|SLG|OPS|BABIP|ISO|wOBA|xBA ON CONTACT|xwOBA ON CONTACT)$/, MPH = /EXIT VELO|BAT SPEED|HARDEST-HIT OUT/, DEG = /ANGLE(?! %)|SPREAD/, FTS = /DISTANCE|LONGEST|SWING LENGTH/
    const r3 = (v) => (Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^(-?)0/, '$1'))
    const f = (k, v) => v == null ? '--' : /^LUCK/.test(k) ? (v > 0 ? '+' : '') + r3(v) : RATE.test(k) ? r3(v) : / %$|PER FLY/.test(k) ? v.toFixed(1) + '%' : MPH.test(k) ? v.toFixed(1) + ' MPH' : DEG.test(k) ? Math.round(v) + '°' : FTS.test(k) ? (/SWING LENGTH/.test(k) ? v.toFixed(1) : Math.round(v)) + ' FT' : /DAYS/.test(k) ? v + (v === 1 ? ' DAY' : ' DAYS') : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v.toLocaleString()
    const sec = (h, sub, ks, vs) => `<div><h5>${h}</h5><div class="bfs">${sub}</div>${ks.map((k, i) => `<div class="r"><span>${k}</span><b>${f(k, vs[i])}</b></div>`).join('')}</div>`
    const thru = row.thru ? `EVERY GAME THROUGH ${row.thru}` : 'NO GAMES YET THIS SEASON'
    const today = row.today ? `, AND HIS ${row.today} EARLIER BALL${row.today === 1 ? '' : 'S'} IN PLAY TODAY` : ''
    body.innerHTML = `<div class="bfh"><b>${(nm ? nm[0] : 'BATTER ' + b.b).toUpperCase()}</b><span>${b.d.slice(0, 4)} SEASON, RIGHT BEFORE THIS SWING ON ${b.d}${b.in ? ', ' + (b.tb === 'Top' ? 'TOP' : 'BOTTOM') + ' ' + b.in : ''}</span></div><div class="allst bfa">` +
      sec(O.names[0], 'THE BACK OF HIS CARD: ' + thru.toUpperCase(), before.cols.n, row.n) + sec(O.names[1], 'GAME LOGS THROUGH THE DAY BEFORE, STATCAST THROUGH THE AT-BAT BEFORE' + today.toUpperCase(), before.cols.x, row.x) + sec(O.names[2], 'HOW SQUARE, HOW HARD, WHICH WAY, HOW UNLUCKY', before.cols.m, row.m) + '</div>'
  }
  // MOONSHOT: the same swing somewhere else. Oracle and Coors are flown by the engine; with no air the flight is the textbook parabola from a 3 ft contact
  // height (the Moon, Mars with its thin air left out, Jupiter's pull); under the Cove the engine flies it through water (air density times 830)
  function paintMoon(body) {
    E('#c25mt').textContent = '/ M O O N S H O T /'
    if (!last) return
    const s = api.state, v = s.ev * 0.44704, th = (s.la * Math.PI) / 180, h0 = 0.9
    const vac = (g) => { const vz = v * Math.sin(th), t = (vz + Math.sqrt(vz * vz + 2 * g * h0)) / g; return [(v * Math.cos(th) * t) / 0.3048, t] }
    const col = parks.parks.find((p) => p.abbr === 'COL'), cr = col ? api.fly({ ...s }, { hPa: col.hpa, wallFn: U.wallFnOf(parks, col) }) : null
    let wet = null
    try { const w = api.fly({ ...s, carry: 830 }, {}); if (isFinite(w.landFt) && w.landFt >= 0) wet = [w.landFt, w.hang] } catch {}
    const rows = [['ORACLE PARK', last.landFt, last.hang], cr ? ['COORS FIELD, A MILE UP', cr.landFt, cr.hang] : null, ['EARTH WITH NO AIR', ...vac(9.81)], ['MARS', ...vac(3.71)], ['THE MOON', ...vac(1.62)], ['JUPITER', ...vac(24.79)], wet ? ['UNDER MCCOVEY COVE', ...wet] : null].filter(Boolean)
    const moon = vac(1.62)
    let phrase = ''
    if (lib) { const p = pick(lib, 'length', moon[0] * 0.3048, mulberry32(Math.round(moon[0]))); if (p) phrase = 'ON THE MOON IT FLIES ' + p.phrase.toUpperCase() }
    const fmt = (x) => (x >= 10000 ? (x / 5280).toFixed(1) + ' MI' : Math.round(x).toLocaleString() + ' FT')
    body.innerHTML = `<div class="bul"><div class="bulh">${Math.round(s.ev)} MPH AT ${Math.round(s.la)}°, THE SAME SWING EVERYWHERE</div>
      <div class="btab">${rows.map(([w, d, t]) => `<div class="r mo"><span>${w}</span><b class="${w === 'THE MOON' ? 'y' : ''}">${fmt(d)}</b><span>${t.toFixed(1)} S IN THE AIR</span></div>`).join('')}
</div>
      ${phrase ? `<div class="dds">${phrase}</div>` : ''}<div class="baya">THE MOON, MARS AND JUPITER ARE FLOWN WITH NO AIR, FROM A 3 FT CONTACT HEIGHT. EVERYTHING ELSE GOES THROUGH THE FLIGHT ENGINE.</div></div>`
  }
  // SOUND (6 Nov, evening: the JUKEBOX list is gone, Andrew: "I don't think anyone is going to be clicking 'jukebox'... Let's kill the jukebox feature"): J opens the
  // mixer on its own (master, music, effects, crowd and bay); the songs play by themselves after the home runs that call for them
  function paintJukebox(body) {
    E('#c25mt').textContent = '/ S O U N D /'
    body.innerHTML = `<div class="bul"><div class="bulh">SOUND${sound.on() ? '' : ' · OFF: PRESS S'}</div>${sound.mixerHTML()}</div>`
    sound.bindMixer(body)
  }
  // the type picker: every pixel type set drawn with the same real pieces of the screen; click one to use it
  function paintTypes(body) {
    E('#c25mt').textContent = '/ P I C K   A   T Y P E /'
    const meter = (n) => Array.from({ length: 20 }, (_, i) => `<s${i < n ? ' class="on"' : ''}></s>`).join('')
    body.innerHTML = `<div class="tys">${AXES.T.opts.filter((o) => !o.hide || mix.T === o.c).map((o) => {
      const st = Object.entries(typeVars(o.T)).map(([k, x]) => `--${k}:${x}`).join(';')
      return `<div class="ty${mix.T === o.c ? ' on' : ''}" data-c="${o.c}" style="${st}"><div class="tyl">T${o.c} ${o.name}</div><div class="tyh">NUKE NAVIGATOR // ${NAMES.replay}</div>
        <div class="tyb">417<i> FT</i></div><div class="tym">${meter(12)}<em>62%</em></div>
        <div class="tyr"><span>EXIT SPEED</span><b>103.4 MPH</b></div><div class="tyr"><span>SWEEPER · 2,775 RPM</span><b>${NAMES.offMenu}</b></div>
        <span class="tyx">${NAMES.tweak}</span><div class="tyd">${o.desc}</div></div>`
    }).join('')}</div>`
    body.querySelectorAll('.ty').forEach((x) => x.addEventListener('click', () => { mix.T = Number(x.dataset.c); sound.play('pick'); applyMix('T') }))
  }
  // BAY BAROMETER: tonight's air at Oracle Park (Open-Meteo forecast, fetched once per visit) turned into feet of carry for one reference fly ball, flown through
  // the same engine and carry table as everything else, against a 62 F, 1015 hPa night. Wind is listed but not flown: it added nothing measurable in the model tests.
  let bay = null
  const OM = 'https://api.open-meteo.com/v1/forecast?latitude=37.7786&longitude=-122.3893&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover_low,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=2'
  const getBay = () => { if (!bay) bay = fetch(OM).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((j) => (bay = j)).catch(() => (bay = { error: true })); return bay }
  const REF = { ev: 103, la: 28, dir: 0, hand: 1, wind: 0, xwind: 0, carry: 1, dws: 0, tab: true }
  const carryFt = (t, hpa) => api.fly({ ...api.state, ...REF, temp: t }, { hPa: hpa }).landFt
  const compass = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8]
  const nowRow = (B) => { const H = B.hourly, i0 = Math.max(0, H.time.findIndex((t) => new Date(t).getTime() > Date.now() - 3600e3)); return { i0, low: H.cloud_cover_low[i0], vis: H.visibility[i0] } }
  const karlIn = (B) => { const r = nowRow(B); return r.low >= 60 || r.vis < 5000 }
  function paintBay(body) {
    E('#c25mt').textContent = '/ B A Y   B A R O M E T E R /'
    if (!bay || bay instanceof Promise) { body.innerHTML = '<div class="bay">READING THE BAY...</div>'; Promise.resolve(getBay()).finally(() => { if (modal === 'bay') paintBay(E('#c25mb')) }); return }
    if (bay.error) { body.innerHTML = '<div class="bay">COULD NOT REACH OPEN-METEO. TRY AGAIN LATER.</div>'; return }
    const H = bay.hourly, { i0 } = nowRow(bay)
    const base = carryFt(62, 1015), rows = []
    for (let i = i0; i < Math.min(H.time.length, i0 + 10); i++) rows.push({ t: H.time[i].slice(11, 16), T: H.temperature_2m[i], rh: H.relative_humidity_2m[i], p: H.surface_pressure[i], w: H.wind_speed_10m[i], wd: H.wind_direction_10m[i], low: H.cloud_cover_low[i], vis: H.visibility[i], d: carryFt(H.temperature_2m[i], H.surface_pressure[i]) - base })
    const r0 = rows[0], karl = karlIn(bay)
    const sgn = (x) => (x >= 0 ? '+' : '-') + Math.abs(x).toFixed(1)
    body.innerHTML = `<div class="bay"><div class="bayh num">${Math.abs(r0.d) < 0.5 ? 'NO DIFFERENCE' : `${sgn(r0.d)} FT`}</div>
      <div class="bays">A 103 MPH, 28° FLY TO CENTER RIGHT NOW, AGAINST THE SAME SWING ON A 62°, 1015 HPA NIGHT.</div>
      <div class="bays karl">${karl ? 'KARL IS IN' : 'KARL IS OUT'}: LOW CLOUD ${r0.low}%, VISIBILITY ${(r0.vis / 1609).toFixed(1)} MI</div>
      <div class="bayt"><div class="r hd"><span>TIME</span><span>TEMP</span><span>HUMID</span><span>PRESSURE</span><span>WIND</span><span>LOW CLOUD</span><span>CARRY</span></div>${rows.map((r) => `<div class="r"><span>${r.t}</span><span>${Math.round(r.T)}°</span><span>${r.rh}%</span><span>${Math.round(r.p)}</span><span>${Math.round(r.w)} ${compass(r.wd)}</span><span>${r.low}%</span><b>${sgn(r.d)} FT</b></div>`).join('')}</div>
      <div class="baya">WIND IS LISTED, NOT FLOWN: IT ADDED NOTHING MEASURABLE IN OUR TESTS. WEATHER DATA BY OPEN-METEO.COM (CC BY 4.0).</div></div>`
  }
  // ---- yesterday: BLAST BULLETIN and DAILY DINGER (the nightly job's newest day; in development a copied dry-run day) ----
  let daily = null
  const side = (b) => (Math.abs(b) < 4 ? 'TO DEAD CENTER' : Math.abs(b) > 30 ? 'DOWN THE ' + (b < 0 ? 'LEFT' : 'RIGHT') + '-FIELD LINE' : 'TO ' + (b < 0 ? 'LEFT' : 'RIGHT') + (Math.abs(b) > 12 ? ' FIELD' : '-CENTER'))
  const longDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
  function paintDaily(body) {
    if (!daily) {
      body.innerHTML = '<div class="bay">FETCHING YESTERDAY...</div>'
      daily = loadDaily().then((d) => { daily = d ? { day: d, balls: enrichDay(d, api, U, parks, wim) } : { error: true } }).finally(() => { if (modal === 'bulletin' || modal === 'dinger') paintModal() })
      return
    }
    if (daily instanceof Promise) return
    if (daily.error) { body.innerHTML = '<div class="bay">NO DAY TO SHOW YET: THE NIGHTLY JOB HAS NOT RUN.</div>'; return }
    if (modal === 'bulletin') paintBulletin(body); else paintDinger(body)
  }
  const oc = (b) => (b._o ??= oracleCheck(api, b))
  function loadIntoWhatIf(b) {
    const o = oc(b)
    closeMod(); setMode('whatif')
    Object.assign(api.state, { ...o.state }); edited = true
    api.setPreview(true); api.update()
  }
  function paintBulletin(body) {
    const { day, balls } = daily, hrs = balls.filter((b) => b.hr).sort((a, b) => b.ft - a.ft), games = Object.keys(day.games ?? {}).length
    E('#c25mt').textContent = '/ B L A S T   B U L L E T I N /'
    const top = (arr, f) => (arr.length ? arr.reduce((a, b) => (f(b) > f(a) ? b : a), arr[0]) : null)
    const longest = top(hrs, (b) => b.ft), hardest = top(hrs, (b) => b.ev), cheapest = top(hrs.filter((b) => b.odds != null), (b) => -b.odds), robbed = top(balls.filter((b) => !b.hr && b.odds != null && b.ft >= 340), (b) => b.odds)
    const gone = hrs.filter((b) => oc(b).gone).length
    const pk = (b) => b?.park?.abbr ?? b?.ht ?? ''
    const card = (lab, b, line) => (b ? `<div class="bcard"><span>${lab}</span><b>${b.name.toUpperCase()}</b><i>${line}</i></div>` : '')
    body.innerHTML = `<div class="bul"><div class="bulh">${longDate(day.meta?.date ?? '')} · ${hrs.length} HOME RUNS IN ${games} GAMES · ${gone} OF ${hrs.length} WOULD BE GONE AT ORACLE</div>
      <div class="bcards">${card('LONGEST', longest, `${longest?.ft} FT AT ${pk(longest)}`)}${card('HARDEST', hardest, `${hardest?.ev.toFixed(1)} MPH OFF THE BAT`)}${card('CHEAPEST', cheapest, `${pct(cheapest?.odds)}% ODDS AT CONTACT, ${cheapest?.ft} FT`)}${card('ROBBED', robbed, `${pct(robbed?.odds)}% ODDS, CAUGHT AT ${robbed?.ft} FT`)}</div>
      <div class="btab"><div class="r hd"><span>BATTER</span><span>PARK</span><span>EXIT</span><span>ANGLE</span><span>FT</span><span>ODDS</span><span>AT ORACLE</span></div>
      ${hrs.map((b, i) => `<div class="r go" data-i="${i}"><span>${b.name.toUpperCase()}</span><span>${pk(b)}</span><span>${b.ev.toFixed(1)}</span><span>${b.la}°</span><span>${b.ft}</span><span>${pct(b.odds)}%</span><b class="${oc(b).gone ? 'y' : 'n'}">${oc(b).gone ? 'GONE' : 'STAYS IN'}</b></div>`).join('')}</div>
      <div class="baya">CLICK A ROW TO FLY THAT SWING IN THE PARK. ODDS: THE WHAT-IF MODEL AT ITS OWN PARK. AT ORACLE: THE SAME SWING FITTED TO ITS REAL DISTANCE, FLOWN OVER THE ORACLE WALL.</div></div>`
    body.querySelectorAll('.r.go').forEach((r) => r.addEventListener('click', () => loadIntoWhatIf(hrs[Number(r.dataset.i)])))
  }
  function paintDinger(body) {
    const { day, balls } = daily, date = day.meta?.date ?? '', picks = dingerPicks(balls, date)
    E('#c25mt').textContent = '/ D A I L Y   D I N G E R /'
    let st = { a: [] }
    try { st = JSON.parse(store('nn-dd-' + date) ?? '{"a":[]}') } catch {}
    const i = Math.min(st.a.length, picks.length), you = st.a.filter((x, k) => picks[k] && x === !!picks[k].hr).length, model = picks.slice(0, i).filter((b) => (b.odds >= 0.5) === !!b.hr).length
    const head = `<div class="bulh">${longDate(date)} · ${picks.length} CLOSE CALLS FROM YESTERDAY · YOU ${you} · THE MODEL ${model}</div>`
    if (i >= picks.length) {
      body.innerHTML = `<div class="bul">${head}<div class="ddbig num">${you > model ? 'YOU BEAT THE MODEL' : you === model ? 'DEAD HEAT WITH THE MODEL' : 'THE MODEL WINS TODAY'}</div>${picks.map((b, k) => `<div class="lpr2"><span>${k + 1}. ${b.name.toUpperCase()}, ${b.ft} FT</span><b>${b.hr ? 'GONE' : 'NOT GONE'} · YOU ${st.a[k] === !!b.hr ? 'RIGHT' : 'WRONG'} · MODEL ${pct(b.odds)}%</b></div>`).join('')}<div class="ddb"><span class="bt hot" id="c25tobul">EVERY HOME RUN FROM YESTERDAY</span></div><div class="baya">A NEW SET ARRIVES WITH EACH NIGHT'S GAMES.</div></div>`
      body.querySelector('#c25tobul').addEventListener('click', (e) => { pressEl(e.currentTarget); openMod('bulletin') })
      return
    }
    const b = picks[i], prev = i > 0 ? picks[i - 1] : null
    const wall = b.park ? U.wallFnOf(parks, b.park)(Math.max(-45, Math.min(45, b.bear))) : null
    body.innerHTML = `<div class="bul">${head}
      ${prev ? `<div class="ddrev">LAST ONE: ${prev.name.toUpperCase()}, ${prev.ft} FT, ${prev.hr ? 'GONE' : 'NOT GONE'}. YOU WERE ${st.a[i - 1] === !!prev.hr ? 'RIGHT' : 'WRONG'}; THE MODEL SAID ${pct(prev.odds)}%.</div>` : ''}
      <div class="ddk">BALL ${i + 1} OF ${picks.length}</div>
      <div class="ddbig num">${b.ev.toFixed(1)} MPH · ${b.la}°</div>
      <div class="dds">${side(b.bear)} AT ${b.park?.name?.toUpperCase() ?? b.ht}${wall ? `, WHERE THE WALL IS ${Math.round(wall[0])} FT OUT AND ${Math.round(wall[1])} FT HIGH` : ''} · ${b.temp}° AT FIRST PITCH</div>
      <div class="ddb"><span class="bt hot" data-c="1">GONE</span><span class="bt" data-c="0">NOT GONE</span></div></div>`
    body.querySelectorAll('[data-c]').forEach((x) => x.addEventListener('click', () => { pressEl(x); sound.play(x.dataset.c === '1' ? 'pick' : 'back'); st.a.push(x.dataset.c === '1'); store('nn-dd-' + date, JSON.stringify(st)); paintDinger(body) }))
  }
  // ---- WALLOP WITNESS (1 Nov, night; Andrew: "wallop witness is still the mode and witness stand is the leaderboard"): log the Oracle games you were at, within 72
  // hours of first pitch, with your seat; what you saw, counted (witness25.js); and the WITNESS STAND, everyone's counts ranked, with the season's titles on top.
  // Shared through the Pages Function when it is there (functions/api/witness.js); in this browser only when it is not.
  let lib = null
  loadLibrary().then((l) => { lib = l }).catch(() => {})
  const wstore = witnessStore()
  let wChain = Promise.resolve() // (7 Nov, red team 4.8: one save at a time, in the order made)
  const wsave = (e) => (wChain = wChain.then(() => wstore.save(e), () => wstore.save(e)))
  let wEd = null, wPrefill = null, wPicked = false, wData = null, wTab = 'mine', wBoard = 'wins', wAsk = null, wMsg = '', wOff = null, wAll = false
  const G = (gamesJ?.games ?? [])
  const wNow = () => (q.get('now') ? Date.parse(q.get('now')) : Date.now())
  const wOpen = (k) => windowOpen(k, G, wNow())
  const hrsAt = new Map()
  for (const b of R.balls) if (b.park === 'SF' && b.hr) hrsAt.set(String(b.gm), (hrsAt.get(String(b.gm)) ?? 0) + 1)
  // each home run flown once, for its zenith and where it came down (the altitude and the golf game's closest)
  const wFlown = new Map(), wSeatAt = new Map()
  const flownOf = (b) => { const k = `${b.gm}|${b.ev}|${b.la}|${b.dir}`; if (!wFlown.has(k)) { const r = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, {}); wFlown.set(k, { peak: r.peakFt, at: api.findLanding?.(r.path)?.point ?? null }) } return wFlown.get(k) }
  const seatWorld = (s) => { const k = `${s.sec}|${s.row}|${s.seat}`; if (!wSeatAt.has(k)) { const r = se.seatPoint(s.sec, s.row, s.seat); wSeatAt.set(k, r.err ? null : r.at) } return wSeatAt.get(k) }
  const wOpts = { name: (id) => pname(id)?.[0] ?? null, peakFt: (b) => flownOf(b).peak, distToSeat: (b, s) => { if (s.row == null) return null; const a = flownOf(b).at, p = seatWorld(s); return a && p ? Math.hypot(a.x - p.x, a.z - p.z) / 0.3048 : null } }
  const wSeason = () => String(Math.max(...G.filter((g) => Date.parse(g.start ?? g.d) <= wNow()).map((g) => Number(g.d.slice(0, 4))), 2023))
  const wFmt = (n) => Math.round(n).toLocaleString('en-US'), wPct = (x) => (x == null ? '--' : `${Math.round(x * 100)}%`)
  const shortDate = (d) => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  function paintWitness(body) {
    E('#c25mt').textContent = '/ W A L L O P   W I T N E S S /'
    if (!wData) { wData = wstore.load().then((d) => { wData = d }).catch(() => { wData = { me: wstore.local(), all: [], shared: false } }).finally(() => { if (modal === 'witness') paintWitness(E('#c25mb')) }) }
    if (wData instanceof Promise) { body.innerHTML = '<div class="bay">OPENING THE BOOKS...</div>'; return }
    const me = { name: '', days: [], seats: {}, ...wData.me }
    if (!wPicked && wTab !== 'card') wTab = !(me.days?.length) && !openKeys(G, wNow()).length ? 'stand' : 'mine' // (7 Nov, red team 1: never over the editor) // (home stretch: nothing logged and no game open to log opens on the Stand, YOUR GAMES a click away)
    const tabs = `<div class="wtabs"><span class="bt${wTab === 'mine' ? ' on' : ''}" data-wt="mine">YOUR GAMES</span><span class="bt${wTab === 'stand' ? ' on' : ''}" data-wt="stand">THE WITNESS STAND</span></div>`
    // THE CALLING CARD (2 Nov, night, Andrew: "People should also be able to make like gamer tags like old COD for their wallop witness name, can we get some ridiculous
    // art maker that's hard?"): MAKE YOUR CALLING CARD opens the emblem maker (emblem25.js) in the panel; SAVE keeps the tag (the name on the stand) and the emblem
    if (wEd) return
    if (wTab === 'card') {
      body.innerHTML = '<div class="bul ww wcd"></div>'
      const done = () => { wEd?.destroy(); wEd = null; wTab = 'mine'; if (modal === 'witness') paintWitness(body) }
      wEd = emblemEditor(body.querySelector('.wcd'), { value: me.emblem || encodeEmblem(DEFAULT_EMBLEM), tag: me.tag || '', sound: { play: (k) => sound.play(k) }, onCancel: done,
        onSave: async (enc, tag) => {
          wEd?.destroy(); wEd = null; wTab = 'mine'; wMsg = 'SAVING...'; paintWitness(body)
          const next = { ...me, tag, emblem: enc, name: me.name || tag.replace(/^\[[^\]]*\]/, '').toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').slice(0, 20) }, r = (wData = { ...wData, me: next }, await wsave(next))
          if (r.ok) { wData = { ...wData, me: r.me ?? next }; wMsg = r.shared === false ? 'KEPT IN THIS BROWSER AS ' + tag + '; THE STAND DID NOT ANSWER' : 'ON THE STAND AS ' + tag } else wMsg = 'NOT SAVED. TRY AGAIN.'
          if (modal === 'witness') paintWitness(E('#c25mb'))
        } })
      return
    }
    body.innerHTML = `<div class="bul ww">${tabs}${wTab === 'stand' ? standHTML(me) : mineHTML(me)}</div>`
    body.querySelector('#c25wcard')?.addEventListener('click', (e) => { pressEl(e.currentTarget); sound.play('pick'); wPicked = true; wTab = 'card'; paintWitness(body) })
    // (2 Nov, night) a seat asked for comes filled in: the one I'M REALLY THERE sent, or else the one MY SEAT keeps
    if (wAsk) { let pf = wPrefill; if (!pf) try { pf = JSON.parse(store('nn-myseat25') || 'null') } catch { pf = null } if (pf) for (const [id, v] of [['#c25wsec', pf.sec], ['#c25wrow', pf.row], ['#c25wst', pf.seat]]) { const x = body.querySelector(id); if (x && !x.value) x.value = v ?? '' } }
    body.querySelectorAll('[data-wt]').forEach((x) => x.addEventListener('click', () => { pressEl(x); sound.play('move'); wTab = x.dataset.wt; wPicked = true; wMsg = ''; paintWitness(body) }))
    if (wTab === 'stand') { body.querySelectorAll('[data-bd]').forEach((x) => x.addEventListener('click', () => { pressEl(x); sound.play('move'); wBoard = x.dataset.bd; paintWitness(body) })); return }
    const save = async (next, ok) => { wMsg = 'SAVING...'; paintWitness(body); wData = { ...wData, me: next }; const r = await wsave(next); if (r.ok) { wData = { ...wData, me: r.me ?? next }; wMsg = r.shared === false ? ok + ' (IN THIS BROWSER; THE STAND DID NOT ANSWER)' : ok } else wMsg = r.refused?.length ? 'THAT GAME CLOSED: 72 HOURS AFTER FIRST PITCH' : 'NOT SAVED. TRY AGAIN.'; if (modal === 'witness') paintWitness(E('#c25mb')) }
    body.querySelectorAll('.wd').forEach((x) => x.addEventListener('click', () => {
      const k = x.dataset.d
      if (me.days.includes(k)) { pressEl(x); if (wOff !== k) { wOff = k; sound.play('move'); wMsg = `${shortDate(k)} IS LOGGED. CLICK IT AGAIN TO TAKE IT OFF`; paintWitness(body); return } wOff = null; sound.play('back'); const seats = { ...me.seats }; delete seats[k]; wAsk = null; save({ ...me, days: me.days.filter((y) => y !== k), seats }, 'TAKEN OFF'); return }
      wOff = null
      if (!wOpen(k)) { pressEl(x); sound.play('thud'); wMsg = 'THAT ONE CLOSED 72 HOURS AFTER FIRST PITCH'; paintWitness(body); return }
      pressEl(x); sound.play('pick'); wAsk = k; wMsg = ''; paintWitness(body); body.querySelector('#c25wsec')?.focus()
    }))
    const nm = body.querySelector('#c25wnm')
    nm?.addEventListener('change', () => { const name = nm.value.toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').slice(0, 20).trim(); save({ ...me, name }, name ? 'ON THE STAND AS ' + name : 'NAME CLEARED') })
    body.querySelector('#c25wno')?.addEventListener('click', () => { wAsk = null; wMsg = ''; sound.play('back'); paintWitness(body) })
    const go = () => {
      const sec = body.querySelector('#c25wsec').value.trim(), row = body.querySelector('#c25wrow').value.trim().toUpperCase(), seat = body.querySelector('#c25wst').value.trim()
      // (1 Nov, night; playtest: only outfield seats could be logged, and most friends sit elsewhere) any section at Oracle goes in; the outfield ones are
      // checked against the seat map so the golf game's closest works, the others are kept as typed
      if (!/^\d{3}$/.test(sec) || Number(sec) < 101 || Number(sec) > 399) { wMsg = 'A SECTION IS THREE DIGITS: 101 TO 152 DOWNSTAIRS, 200S AND 300S UP TOP'; sound.play('thud'); paintWitness(body); return }
      if (!row || !seat) { wMsg = 'ROW AND SEAT TOO'; sound.play('thud'); paintWitness(body); return }
      const r = se.seatPoint(sec, row, Number(seat)), inMap = se.SECTIONS?.some((x) => x[2] === sec)
      if (inMap && r.err) { wMsg = r.err; sound.play('thud'); paintWitness(body); return }
      const st = inMap ? { sec: r.sec, row: r.row, seat: r.seat } : { sec, row, seat: Number(seat) || seat }
      const k = wAsk; wAsk = null; wPrefill = null; sound.play('pick')
      save({ ...me, days: [...me.days, k], seats: { ...me.seats, [k]: st } }, `LOGGED: SEC ${st.sec} ROW ${st.row} SEAT ${st.seat}`)
    }
    body.querySelector('#c25wgo')?.addEventListener('click', go)
    // a home run in your stats plays in DEJA-VU (1 Nov, night; playtest: 'stats can't be clicked to replay that home run')
    body.querySelectorAll('.wgo').forEach((x) => x.addEventListener('click', () => { const [d, b, ft] = x.dataset.ball.split('|'); pressEl(x); sound.play('pick'); closeMod(); if (mode !== 'replay') setMode('replay'); filter = 'oracle'; balls = filtered(); const i = balls.findIndex((y) => y.d === d && String(y.b) === b && String(y.ft) === ft); if (i < 0) { paintTabs(); return } idx = i; applyBall(balls[idx]); paintChooser(); paintTabs(); const want = balls[idx]; setTimeout(() => { if (mode === 'replay' && cur === want && !modal) fire() }, 600) })) // (red team 2.6)
    body.querySelector('#c25wold')?.addEventListener('click', (e) => { pressEl(e.currentTarget); sound.play('move'); wAll = !wAll; paintWitness(body) })
    body.querySelectorAll('.wask input').forEach((x) => x.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); go() } if (e.key === 'Escape') { wAsk = null; wMsg = ''; paintWitness(body) } }))
    nm?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); nm.blur(); closeMod() } })
  }
  // YOUR GAMES: what you saw, then every home game since July 2023 by month; the open ones (inside their 72 hours) outlined, a click logs one and asks for the seat
  function mineHTML(me) {
    const s = witnessStats(G, R.balls, me, wOpts), openNow = openKeys(G, wNow())
    const row = (l, v, sub = '', ball = null) => `<div class="wst${ball ? ' wgo' : ''}"${ball ? ` data-ball="${ball.d}|${ball.b}|${ball.ft}" title="PLAY IT"` : ''}><span>${l}</span><b>${v}</b>${sub ? `<i>${sub}${ball ? ' · PLAY IT' : ''}</i>` : ''}</div>`
    const nameOf = (x) => (x?.name ?? (x ? 'BATTER ' + x.b : '')).toUpperCase()
    const stats = s.games ? `<div class="wsg">
      ${row('GAMES', s.games, `${s.wins} W · ${s.losses} L`)}
      ${row('THE JINX', wPct(s.winPct), `THE GIANTS AT HOME: ${wPct(s.theirPct)}${s.jinx != null ? ` · ${s.jinx >= 0 ? '+' : ''}${Math.round(s.jinx * 100)} POINTS WITH YOU THERE` : ''}`)}
      ${row('MARGIN', `+${s.winRuns} / -${s.lossRuns}`, 'RUNS WON BY, RUNS LOST BY')}
      ${row('GIANTS WALLOPS', s.giantsHR, `${s.allHR} HOME RUN${s.allHR === 1 ? '' : 'S'} IN ALL`)}
      ${row('FOOT-I-TUDE', wFmt(s.footitude) + ' FT', `${wFmt(s.giantsFeet)} FT OF IT GIANTS`)}
      ${s.altitude ? row('ALTITUDE', `${s.altitude.coit.toFixed(1)} COIT TOWERS`, `${s.altitude.twinPeaks.toFixed(2)} TWIN PEAKS, STACKED`) : ''}
      ${s.longest ? row('LONGEST', s.longest.ft + ' FT', nameOf(s.longest), s.longest) : ''}
      ${s.shortest ? row('SHORTEST', s.shortest.ft + ' FT', nameOf(s.shortest), s.shortest) : ''}
      ${s.closest ? row('CLOSEST TO YOUR SEAT', s.closest.away + ' FT', nameOf(s.closest), s.closest) : ''}
      ${s.hours != null ? row('HOURS AT ORACLE', s.hours.toFixed(1)) : ''}
      ${row('EXTRA INNINGS', s.extra)}${row('WALK-OFFS', s.walkoffs)}
      ${s.yourGuy ? row('YOUR GUY', nameOf(s.yourGuy), `${s.yourGuy.n} HOME RUN${s.yourGuy.n === 1 ? '' : 'S'} IN FRONT OF YOU`) : ''}
      ${s.topEv ? row('TOP EXIT SPEED', s.topEv.mph + ' MPH', nameOf(s.topEv), s.topEv) : ''}</div>` : '<div class="dds">NOTHING LOGGED YET.</div>'
    const ask = wAsk ? `<div class="wask"><b>${shortDate(wAsk)}: WHERE WERE YOU SITTING?</b> <label>SEC <input id="c25wsec" inputmode="numeric" maxlength="4" size="4"></label> <label>ROW <input id="c25wrow" maxlength="3" size="3"></label> <label>SEAT <input id="c25wst" inputmode="numeric" maxlength="3" size="3"></label> <span class="bt" id="c25wgo">LOG IT</span><span class="bt" id="c25wno">NOT THIS ONE</span></div>` : ''
    const byMonth = {}
    const season = wSeason(), keep = (g) => wAll || g.d.startsWith(season) || me.days.some((k) => k.startsWith(g.d.slice(0, 4)))
    for (const g of [...G].filter(keep).sort((a, b) => b.d.localeCompare(a.d) || b.dh - a.dh)) (byMonth[g.d.slice(0, 7)] ??= []).push(g)
    const cal = Object.entries(byMonth).map(([m, gs]) => `<div class="wm"><span>${new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span><div>${gs.map((g) => { const k = gameKey(g), n = hrsAt.get(String(g.pk)) ?? 0, on = me.days.includes(k) || me.days.includes(g.d), op = wOpen(k); return `<span class="bt wd${on ? ' on' : ''}${op ? ' open' : ' shut'}${wAsk === k ? ' ask' : ''}" data-d="${k}" title="${g.win ? 'W' : 'L'} ${g.sf}-${g.opp_r} V ${g.opp}${g.dh ? ' (GAME ' + g.dh + ')' : ''}${n ? ` · ${n} HOME RUN${n === 1 ? '' : 'S'}` : ''}${op ? ' · OPEN NOW' : ''}">${Number(g.d.slice(8))}${g.dh ? '<u>' + g.dh + '</u>' : ''}${n ? `<sup>${n}</sup>` : ''}</span>` }).join('')}</div></div>`).join('')
    return `<div class="bulh">LOG A GAME WITHIN 72 HOURS OF FIRST PITCH. ${openNow.length ? `OPEN NOW: ${openNow.map(shortDate).join(', ')}.` : 'NOTHING IS OPEN. THE NEXT HOME GAME OPENS AT FIRST PITCH.'}</div>
      <div class="wme wcard">${cardHTML(me, 48)}<span class="bt" id="c25wcard" role="button" tabindex="0">${me.tag || me.emblem ? 'EDIT YOUR CALLING CARD' : 'MAKE YOUR CALLING CARD'}</span><label>OR JUST A NAME <input id="c25wnm" maxlength="20" value="${(me.name ?? '').replace(/"/g, '')}" placeholder="NAME"></label>${wData.shared ? '' : '<i>KEPT IN THIS BROWSER FOR NOW</i>'}</div>
      ${ask}${wMsg ? `<div class="wmsg">${wMsg}</div>` : ''}${stats}<div class="wkey">EVERY HOME GAME. THE SMALL NUMBER IS ITS HOME RUNS. OUTLINED: OPEN NOW.</div><div class="wgrid">${cal}</div><span class="bt" id="c25wold">${wAll ? 'THIS SEASON ONLY' : 'SHOW OLDER SEASONS'}</span>`
  }
  // THE WITNESS STAND: one board at a time, everyone on it; the season's titles across the top (who holds each right now; Andrew hands them out at the end)
  // a calling card: the emblem (or an empty frame) and the tag, or the plain name, or nothing yet
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const embImg = (code, px) => { const u = code ? emblemDataURL(code, 2) : ''; return u ? `<img class="wemb" src="${u}" width="${px}" height="${px}" alt="">` : `<span class="wemb none" style="width:${px}px;height:${px}px"></span>` }
  const cardHTML = (me, px) => `<span class="wcc">${embImg(me.emblem, px)}<b>${esc(me.tag || me.name || 'NO TAG YET')}</b></span>`
  function standHTML(me) {
    const season = wSeason()
    const people = (wData.all?.length ? wData.all : [{ ...me, name: me.name || 'YOU' }]).map((p) => ({ name: p.tag || (p.name || 'NO NAME').toUpperCase(), entry: p }))
    const cardOf = new Map(people.map((p) => [p.name, p.entry])) // (2 Nov, night: a tag keeps its case; the emblem goes beside it)
    const all = people.map((p) => ({ name: p.name, stats: witnessStats(G, R.balls, p.entry, wOpts) })), now = people.map((p) => ({ name: p.name, stats: witnessStats(G, R.balls, p.entry, { ...wOpts, season }) }))
    const titles = TROPHIES.map((t) => { const b = BOARDS.find((x) => x.key === t.board), top = rankBoard(b, now).find((r) => r.value > 0); return `<div class="wtt"><b>${t.names[0]}</b><span>${top ? `${top.name} · ${wFmt(top.value)}${b.unit ? ' ' + b.unit : ''}` : 'UP FOR GRABS'}</span></div>` }).join('')
    const board = BOARDS.find((b) => b.key === wBoard) ?? BOARDS[0], ranked = rankBoard(board, all)
    const val = (v) => (board.pct ? `${v >= 0 ? '+' : ''}${Math.round(v * 100)}` : board.key === 'altitude' ? v.toFixed(1) : wFmt(v)) + (board.unit ? ' ' + board.unit : board.pct ? ' POINTS' : '')
    return `<div class="bulh">${season} TITLES, AS THEY STAND</div><div class="wts">${titles}</div>
      <div class="wbds">${BOARDS.filter((b) => b.key !== 'hours' || all.some((p) => p.stats.hours != null)).map((b) => `<span class="bt${b.key === board.key ? ' on' : ''}" data-bd="${b.key}">${b.title}</span>`).join('')}</div>
      <div class="wrk">${ranked.length ? ranked.map((r) => `<div class="wr"><span>${r.rank}</span><b class="wrn">${embImg(cardOf.get(r.name)?.emblem, 22)}<em>${esc(r.name)}</em></b><i>${val(r.value)}</i></div>`).join('') : '<div class="dds">NOBODY ON THIS BOARD YET.</div>'}</div>
      ${wData.shared ? '' : '<div class="dds">ONLY YOU UP THERE UNTIL THE STAND GOES LIVE.</div>'}`
  }
  function statCols(res) {
    const s = api.state, b = cur, v = res.verdict, bn = b ? pname(b.b) : null, pn = b ? pname(b.p) : null, o = odds()
    const runners = b ? [b.r1 ? '1B' : '', b.r2 ? '2B' : '', b.r3 ? '3B' : ''].filter(Boolean).join(' ') || 'NONE' : '--'
    const pr = parks.parks.length ? evalParks(parks, api) : [], gone = pr.length ? U.goneWord(parks, api, pr, goneReady) : '--'
    return [
      ['GAME', [['BATTER', bn ? `${bn[0]}${bn[1] ? ' #' + bn[1] : ''}` : b ? '#' + b.b : 'YOUR SWING'], ['BATS', b ? b.s : s.hand > 0 ? 'R' : 'L'], ['PITCHER', pn ? pn[0] : '--'], ['THROWS', b?.t ?? '--'], ['DATE', b?.d ?? '--'], ['PARK', b ? (b.park === 'SF' ? 'ORACLE PARK' : b.park) : 'ORACLE PARK'], ['INNING', b ? `${b.tb === 'Top' ? 'TOP' : 'BOT'} ${b.in ?? '--'}` : '--'], ['COUNT', b && b.bl != null ? `${b.bl}-${b.sk}` : '--'], ['OUTS', f(b?.ou, 0)], ['RUNNERS ON', runners], ['SCORE (BAT-FLD)', b && b.bsc != null ? `${b.bsc}-${b.fsc}` : '--'], ['TIME THROUGH ORDER', f(b?.tto, 0)], ['BATTER AGE', f(b?.agb, 0)], ['PITCHER AGE', f(b?.agp, 0)]]],
      ['PITCH', [['TYPE', b ? PITCH[b.pt] ?? b.pt ?? '--' : '--'], ['SPEED', f(b?.pv, 1, ' MPH')], ['EFFECTIVE SPEED', f(b?.eff, 1, ' MPH')], ['SPIN RATE', f(b?.rpm, 0, ' RPM')], ['SPIN TILT', b ? clock(b.ax) : '--'], ['SPIN AXIS', f(b?.ax, 0, '°')], ['RELEASE SIDE', f(b?.rx, 2, ' FT')], ['RELEASE HEIGHT', f(b?.rz, 2, ' FT')], ['EXTENSION', f(b?.ext, 1, ' FT')], ['ARM ANGLE', f(b?.arm, 0, '°')], ['PLATE X', f(b?.px, 2, ' FT')], ['PLATE Z', f(b?.pz, 2, ' FT')], ['ZONE', f(b?.zn, 0)], ['SIDE BREAK', b && b.hx != null ? `${b.hx.toFixed(1)} IN` : '--'], ['VERTICAL BREAK', b && breakOf(b) ? `${breakOf(b).v.toFixed(1)} IN` : '--'], ['INDUCED VERTICAL BREAK', b && b.hz != null ? `${b.hz.toFixed(1)} IN` : '--'], ['APPROACH ANGLE', f(b?.vaa, 1, '°')]]],
      ['SWING AND CONTACT', [['BAT SPEED', f(b?.bs, 1, ' MPH')], ['SWING LENGTH', f(b?.sl, 1, ' FT')], ['ATTACK ANGLE', f(b?.aa, 1, '°')], ['ATTACK DIRECTION', f(b?.ad, 1, '°')], ['SWING TILT', f(b?.tilt, 0, '°')], ['INTERCEPT X / Y', b && b.ix != null ? `${b.ix.toFixed(1)} / ${b.iy?.toFixed(1)} IN` : '--'], ['EXIT SPEED', `${(b?.ev ?? s.ev).toFixed(1)} MPH`], ['LAUNCH ANGLE', `${(b?.la ?? s.la).toFixed(1)}°`], ['GAP (LAUNCH - ATTACK)', b?.aa != null ? `${(b.la - b.aa).toFixed(1)}°` : '--'], ['LANDING BEARING', `${(b?.dir ?? s.dir).toFixed(1)}°`], ['HIT LOCATION', f(b?.hl, 0)], ['BALL TYPE', b?.bbt ? b.bbt.replace(/_/g, ' ').toUpperCase() : '--'], ['CONTACT QUALITY', b?.lsa ? LSA[b.lsa] ?? b.lsa : '--']]],
      ['RESULT AND VALUE', [['OUTCOME', b ? (b.ev_ ?? '').replace(/_/g, ' ').toUpperCase() : '--'], ['HOME RUN ODDS', o.p != null ? pct(o.p) + '%' : '--'], ['ODDS FROM', o.src], ['PROJECTED DISTANCE', b ? `${b.ft} FT` : '--'], ['EXPECTED AVG', f(b?.xba, 3)], ['EXPECTED WOBA', f(b?.xw, 3)], ['EXPECTED SLG', f(b?.xs, 3)], ['RUN VALUE', b?.dre != null ? (b.dre >= 0 ? '+' : '') + b.dre.toFixed(3) : '--'], ['WIN VALUE', b?.dwe != null ? (b.dwe >= 0 ? '+' : '') + (b.dwe * 100).toFixed(1) + '%' : '--'], ['ENGINE VERDICT', v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL' : 'IN PLAY'], ['PARKS WHERE GONE', gone], ['WALL HERE', v.wallFt ? `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT HIGH` : '--'], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(1)} FT` : '--']]],
      ['FLIGHT AND AIR', [['SIMULATED DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(2)} S`], ['CARRY FACTOR', b ? b.carry.toFixed(3) : '1.000'], ['SIDE SPIN OFFSET', b ? `${b.dws} RPM` : '0 RPM'], ['AIR DENSITY', res.rho.toFixed(3)], ['TEMPERATURE', `${Math.round(s.temp)} F`], ['HUMIDITY', f(b?.rh, 0, '%')], ['PRESSURE', f(b?.hpa, 0, ' HPA')], ['WIND', b?.wm != null ? `${b.wm} MPH` : '--'], ['WIND DIRECTION', f(b?.wd, 0, '°')], ['GUSTS', f(b?.wg, 0, ' MPH')], ['BACKSPIN (PRIOR)', `${Math.round(res.wb)} RPM`], ['SIDE SPIN (PRIOR)', `${Math.round(res.ws)} RPM`]]],
    ]
  }

  // ---- the SELECT menu (Esc or MENU opens it) and attract mode (idle on the menu: the park replays the longest home runs behind it) ----
  // (1 Nov, later; an audit) the ball you were on comes back when the menu closes: attract mode used to leave you on a random long one, maybe mid-flight
  let attractFrom = null
  const attract = () => {
    if (mode !== 'replay' || !balls.length || reduced) return
    attractFrom ??= { idx, filter }
    const long = balls.map((b, i) => [b, i]).filter(([b]) => b.ft >= 420)
    const [b, i] = long.length ? long[Math.floor(Math.random() * long.length)] : [balls[0], 0]
    idx = i; applyBall(b); paintChooser()
    setTimeout(() => { if (mode === 'replay' && attractFrom) api.fire() }, 300)
  }
  const unAttract = () => { const a = attractFrom; attractFrom = null; if (!a || mode !== 'replay') return; filter = a.filter; balls = filtered(); idx = Math.min(a.idx, balls.length - 1); if (balls[idx]) { applyBall(balls[idx]); paintChooser() } }
  // the menu (28 Oct, night, Andrew: "many of these are superfluous"): five lines. Moonshot and the Bay Barometer became the fun line under the distance, Thirty Parks is
  // GONE IN N PARKS (click it) and the PARK button, Blast Bulletin is Daily Dinger's results page, the highlight reel is the REEL button by PLAY IT, the jukebox is J
  // 1 Nov, evening (Andrew: "kill daily dinger ... no more options, no more gag reel, it's just dinger deja vu, dinger dojo, shot caller, wallop witness"): the four, and
  // WHAT'S NEW; the gags still play in the park and on a scoreboard click
  menu = selectMenu(grid, [
    { k: 'replay', name: NAMES.replay, hero: true, blurb: 'REAL GIANTS HOME RUNS FLY AGAIN, NEWEST FIRST, BACK TO ANY NIGHT', run: () => setMode('replay') },
    { k: 'dojo', name: NAMES.dojo, hero: true, blurb: 'HIT ONE YOURSELF: PICK THE SPEED, THE ANGLE AND THE AIM, THEN NUKE IT', run: () => setMode('whatif') },
    { k: 'shot', name: NAMES.shot, blurb: 'PICK A SEAT, CLICKED OR TYPED: EVERY SWING THAT PUTS A BALL THERE', run: () => setMode('shot'), off: () => !atOracle },
    { k: 'witness', name: NAMES.witness, blurb: 'LOG THE GAMES YOU WERE AT, THEN SEE WHERE YOU RANK ON THE WITNESS STAND', run: () => goTab('witness') },
    { k: 'blast', name: 'BLAST RADIUS', blurb: 'HOW HARD IT IS TO GET ONE OUT TO EVERY PART OF THE PARK TONIGHT, WHERE THEY HAVE COME DOWN, AND WHERE A HITTER OF YOURS WOULD', run: () => goTab('blast'), off: () => !atOracle },
  ], { onIdle: attract, onJukebox: () => openMod('jukebox'), onClose: () => { unAttract(); if (store('nn-mhint25') === '1') return; store('nn-mhint25', '1'); const h = E('#c25mh'); h.classList.remove('go'); void h.offsetWidth; h.classList.add('go') } })
  // three ways in (Andrew, 28 Oct: he could not find it): the MENU button with its ESC keycap, the title next to it, and Esc
  const menuKey = () => (modal === 'witness' ? 'witness' : show === 'hm' ? 'blast' : mode === 'replay' ? 'replay' : mode === 'shot' ? 'shot' : 'dojo')
  const openMenu = (el) => { if (el) pressEl(el); sound.play('pick'); menu.show(menuKey()) }
  E('#c25mn').addEventListener('click', () => openMenu(E('#c25mn')))
  // (1 Nov, later; an audit) each button with a key says it when you point at it
  for (const [id, k] of [['#c25lp', 'L'], ['#c25se', 'G'], ['#c25b', 'B'], ['#c25sc', 'C'], ['#c25nk', 'SPACE']]) { const el = E(id); if (el && !el.title) el.title = `${el.textContent.replace(/\s+/g, ' ').trim()} (${k})` }
  E('#c25ti').addEventListener('click', () => openMenu(null))

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && uiReady && e.target?.closest?.('input,select,textarea')) { e.target.blur(); if (modal) closeMod(); return } // (1 Nov, night; playtest: Esc did nothing inside a box)
    if (e.ctrlKey || e.metaKey || e.altKey || !uiReady || e.target?.closest?.('input,select,textarea')) return // typing a seat is not a shortcut
    if (e.repeat && !'[],.'.includes(e.key)) return // (1 Nov, later) a held key is one press, except stepping through the balls
    if (!atOracle && e.key === '3') { banner('SHOT CALLER IS ORACLE ONLY', 'IT KNOWS THE SEATS THERE'); return }
    if (!atOracle && 'lgcnwkLGCNWK'.includes(e.key)) return // 8: Oracle's own features stay off at other parks
    if (/^[1-5]$/.test(e.key) && modal && !e.repeat) { if (!wEd) goTab(TABS[Number(e.key) - 1][0]); return } // (7 Nov, red team 4.11: not while a calling card is being made, it would be lost)
    if (e.key === 'Escape') { if (modal) closeMod(); else if (grid.classList.contains('dk')) toggleDock(false); else { sound.play('back'); menu.show(menuKey()) } } // (the side menu closes before the menu opens)
    else if (modal) return
    else if (e.key === 'Backspace' && mode !== 'replay' && mode !== 'shot') { e.preventDefault(); const s0 = undo.pop(); if (!s0) { banner('NOTHING TO UNDO', 'BACKSPACE STEPS BACK THROUGH YOUR CHANGES'); return } undoing = true; Object.assign(api.state, s0); api.update(); ctl.onChange(); undoing = false; settled = snap(); banner('UNDONE', undo.length ? `${undo.length} MORE TO GO BACK` : 'BACK TO WHERE YOU STARTED') }
    else if (e.key === '0' && mode === 'whatif' && !stepped) { if (settled) undo.push(settled); undoing = true; Object.assign(api.state, DOJO0); api.update(); ctl.onChange(); undoing = false; settled = snap(); banner('A BLANK SWING', 'BACKSPACE TO UNDO') }
    else if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'b' || e.key === 'B') flipBird()
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
    else if ((e.key === 'a' || e.key === 'A') && (cur || stepped)) openMod('before')
    else if (e.key === '?') toggleDock()
    else if (e.key === 't' || e.key === 'T') openMod('type')
    else if (e.key === 'l' || e.key === 'L') { if (mode === 'shot') setMode('replay'); setShow('lp') } // (as the header buttons do: Shot Caller has no panels of its own)
    else if (e.key === 'g' || e.key === 'G') { if (mode === 'shot') setMode('replay'); setShow('se') }
    else if (/^[1-5]$/.test(e.key)) goTab(TABS[Number(e.key) - 1][0])
    else if (e.key === 'c' || e.key === 'C') setMode(mode === 'shot' ? 'replay' : 'shot')
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); if (!sound.on()) jukebox.stop(); sound.play('move'); banner(sound.on() ? 'SOUND ON' : 'SOUND OFF', 'S TO SWITCH') }
    else if ((e.key === 'x' || e.key === 'X') && mode === 'replay') tweak()
    else if (e.key === 'z' || e.key === 'Z') { /* (5 Nov: no more camera push) */ }
    else if (e.key === 'r' || e.key === 'R') { mix.R = mix.R ? 0 : lastR || 1; sound.play('move'); applyMix('R') }
    else if (e.key === 'j' || e.key === 'J') openMod('jukebox')
    else if ((e.key === 'u' || e.key === 'U') && mode === 'whatif') {
      const s = api.state, u = new URL(location.href); for (const k of [...u.searchParams.keys()]) if (k !== 't') u.searchParams.delete(k)
      u.searchParams.set('swing', [s.ev, s.la, s.dir, s.temp, s.wind, s.xwind ?? 0].map((x) => Math.round(x)).join('.'))
      const done = () => banner('LINK COPIED', 'SEND IT: IT OPENS ON THIS SWING'), miss = () => { history.replaceState(null, '', u); banner('THE LINK IS IN THE ADDRESS BAR', 'COPY IT FROM THERE') }
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(u.href).then(done, miss); else miss()
    }
  })
  api.setPreview(true)

  // ---- the pieces (each picture sits in its own box; the font is sized to fit that box) ----
  const ro = new ResizeObserver((ents) => { for (const en of ents) { const pre = en.target.querySelector('pre'); if (pre?._fit) fit(pre, en.target, pre._fit.lines, pre._fit.am) } if (last) { paintSide(); paintPanel(last); paintPitch(); if (optOf('A', mix.A).canvas) paintBatter() } })
  ro.observe(E('#c25hi')); ro.observe(E('.c25 .pitch')); ro.observe(E('#c25sv')); ro.observe(E('#c25f'))
  function fit(pre, box, lines, am) {
    if (!pre._fit) ro.observe(box)
    pre._fit = { lines, am }
    const cols = Math.max(...lines.map((l) => l.length))
    const fs = Math.max(3, Math.min(18, (box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)))
    pre.className = 'art ' + am.cls.replace(/^art\s*/, '')
    pre.style.fontSize = fs + 'px'
    pre.textContent = lines.join('\n')
  }
  const artStyle = () => STYLES.find((s) => s.id === optOf('A', mix.A).id) ?? STYLES[0]
  // the stand-in's look (29 Oct): his team's kit (home whites, road greys), his height (batter_bio.json), a mascot for a player who has one (none for now). In the dojo
  // and Shot Caller you are up, in the Giants' cream (WHO'S UP and its panda and giraffe are gone: 29 Oct, later, Andrew: "no nicknames for now on anything")
  const youK = 'you'
  const youHand = () => 1
  function standInOpts(id, c) {
    const b0 = cur ?? stepped?.b ?? null, bat = id ? pname(id) : null, ym = null, mc = id ? MASCOTS[id] : null
    const team = b0 ? (b0.tb === 'Top' ? b0.at : b0.ht) : 'SF', home = b0 ? b0.tb === 'Bot' : true
    return { ...c, name: ym ? ym.name : bat ? bat[0].toUpperCase() : id ? null : 'YOU', num: ym ? ym.num : bat?.[1] ? String(bat[1]) : null, hand: b0 ? b0.s : api.state.hand > 0 ? 'R' : 'L', team, kit: kitFor(team, home), height: ym ? ym.h : bio[id]?.h ?? null, kind: mc?.kind ?? 'human', skin: (id && facesRaw[id]?.skin) || undefined } // skin: from his headshot (science/bake_face_tones.py)
  }
  let faceKey = ''
  function paintBatter() {
    if (E('.c25>.batter')?.offsetParent === null) return // (31 Oct: the dojo and Shot Caller hide it; it was still drawn on every beat)
    const s = api.state, id = cur ? String(cur.b) : stepped ? String(stepped.b.b) : null, bat = id ? pname(id) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const real = id && facesRaw[id], gen = !real && id && hasGen ? genericFace('composite', id) : null
    const src = real ? faceSource(facesRaw[id]) : gen ? gen.src : drawBust(160)
    const box = E('#c25f'), enh = real ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : gen ? gen.enh : {}, cvs = optOf('A', mix.A).canvas
    let cv = box.querySelector('canvas')
    if ((!real || (id && MASCOTS[id])) && mix.D) {
      // no photo, or your own swing (28 Oct, night, Andrew: the stand-in "looks awful", five options on D): a drawn stand-in with the name, number and team, mirrored for lefties
      cv ??= box.appendChild(Object.assign(document.createElement('canvas'), { className: 'fcv' }))
      E('#c25f pre').style.display = 'none'; cv.style.display = ''
      const cs = cs0(), c = { ink: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim(), dim: cs.getPropertyValue('--dim').trim(), k: cs.getPropertyValue('--k').trim() }
      const so = standInOpts(id, c)
      const key = ['D' + mix.D, id ?? youK, so.hand, so.kind, so.team, so.height, box.clientWidth, box.clientHeight, c.ink, c.acc].join()
      if (document.fonts && !document.fonts.check('8px PS2P')) document.fonts.load('8px PS2P').then(() => { faceKey = ''; paintBatter() }).catch(() => {}) // the stand-ins letter in the pixel font
      if (key !== faceKey && box.clientWidth) { faceKey = key; drawStandIn(cv, mix.D, box.clientWidth - 2, box.clientHeight - 2, so) }
    } else if (cvs) {
      // a canvas style: drawn at the screen's resolution, square, centered in the box; redrawn only when the face, style, size or colors change
      cv ??= box.appendChild(Object.assign(document.createElement('canvas'), { className: 'fcv' }))
      E('#c25f pre').style.display = 'none'; cv.style.display = ''
      const cs = cs0(), c = { tx: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim() }, key = [id ?? 'you', cvs, box.clientWidth, box.clientHeight, c.tx, c.acc].join()
      if (key !== faceKey && src && box.clientWidth) { faceKey = key; drawFace(cv, src, cvs, box.clientWidth - 2, box.clientHeight - 2, { ink: c.tx, acc: c.acc }) }
    } else {
      if (cv) cv.style.display = 'none'
      E('#c25f pre').style.display = ''; faceKey = ''
      const st = artStyle(), am = artMetrics(st)
      // as many character columns as the box can show at a legible size (at least 4.5 px per character), finer for bigger boxes
      let cols = Math.max(24, Math.min(80, Math.round(box.clientWidth / 5))), lines = src ? renderArt(src, st, cols, enh).lines : null
      while (lines && cols > 24 && Math.min((box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)) < 4.5) { cols = Math.max(24, Math.round(cols * 0.85)); lines = renderArt(src, st, cols, enh).lines }
      if (lines) fit(E('#c25f pre'), box, lines, am)
    }
    const ym = null
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : ym ? ym.name : 'YOUR SWING'
    // (1 Nov, later; an audit) written only when it changes: rewritten on every beat, the STATS button was swapped out under the pointer mid-flight and lost clicks
    const info = `<b>${name.toUpperCase()}</b><span>${bat?.[1] ? '#' + bat[1] + ' · ' : ym ? '#' + ym.num + ' · ' : ''}${ym ? (youHand() > 0 ? 'R' : 'L') + ' · ' + ym.why : hand}</span>
      ${id ? '<div class="row"><span class="bt" id="c25bs" title="everything they had done this season up to this swing (A)">STATS BEFORE THIS SHOT</span></div>' : ''}`
    if (info !== E('#c25i')._html) {
      E('#c25i').innerHTML = E('#c25i')._html = info
      E('#c25bs')?.addEventListener('click', () => { pressEl(E('#c25bs')); openMod('before') })
    }
  }
  // CONTACT, SIDE ON
  function paintSide() {
    const s = api.state, box = E('#c25sv'), real = mode === 'replay' && cur && !edited, tw = mode !== 'replay' && stepped?.b
    // tweaking a real home run: the real pitch and bat stay (they didn't change), the ball goes out at your numbers
    const o = real ? { real: true, pz: cur.pz, st: cur.st, sb: cur.sb, vaa: cur.vaa, pv: cur.pv, aa: cur.aa, bs: cur.bs, la: cur.la, ev: cur.ev } : tw ? { real: true, pz: tw.pz, st: tw.st, sb: tw.sb, vaa: tw.vaa, pv: tw.pv, aa: tw.aa, bs: tw.bs, la: s.la, ev: s.ev } : { real: false, pz: 2.4, st: 3.4, sb: 1.6, la: s.la, ev: s.ev }
    if (!box.clientWidth || !box.clientHeight) return
    box.innerHTML = sliceSVG(o, box.clientWidth, box.clientHeight)
    box.classList.toggle('anim', real && performance.now() - pitchIn < 900)
    E('#c25cap').textContent = sliceCaption(o)
  }
  // THE PITCH: the zone from the catcher's seat, no numbers on it; a miss outside the zone is measured to the zone's edge
  function zone(b, W, H, off) {
    const zl = 0.708, st = b.st ?? 3.4, sb = b.sb ?? 1.6, m = 0.48
    const xr = zl + m, zt = st + m, zb = sb - m
    const S = Math.min((W - 4) / (2 * xr), (H - 4) / (zt - zb)), cx = W / 2, cy0 = 2 + (H - 4 - S * (zt - zb)) / 2
    const X = (x) => cx + x * S, Y = (z) => cy0 + (zt - z) * S
    let g = ''
    const zn = b.zn ?? 0
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const n = r * 3 + c + 1, x0 = X(-zl + (2 * zl * c) / 3), x1 = X(-zl + (2 * zl * (c + 1)) / 3), y0 = Y(st - ((st - sb) * r) / 3), y1 = Y(st - ((st - sb) * (r + 1)) / 3)
      g += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" fill="${n === zn ? 'var(--acc)' : 'none'}" fill-opacity=".28" stroke="var(--dim)" stroke-width="1"/>`
    }
    g += `<rect x="${X(-zl).toFixed(1)}" y="${Y(st).toFixed(1)}" width="${(2 * zl * S).toFixed(1)}" height="${((st - sb) * S).toFixed(1)}" fill="none" stroke="var(--tx)" stroke-width="2"/>`
    const px = Math.max(-xr + 0.06, Math.min(xr - 0.06, b.px)), pz = Math.max(zb + 0.06, Math.min(zt - 0.06, b.pz)), bsz = Math.max(12, Math.round((2 * Math.max(5, 0.121 * S)) / 8) * 8), rr = bsz / 2 // the pixel ball's size, in whole pixels of its 8-pixel art
    if (off) { const ex = Math.max(-zl, Math.min(zl, px)), ez = Math.max(sb, Math.min(st, pz)); g += `<line x1="${X(px).toFixed(1)}" y1="${Y(pz).toFixed(1)}" x2="${X(ex).toFixed(1)}" y2="${Y(ez).toFixed(1)}" stroke="var(--acc)" stroke-width="2" stroke-dasharray="3 3"/>` }
    g += moveArrow(b, X, Y, X(px), Y(pz), S, W, H, rr)
    g += ballSVG(X(px), Y(pz), bsz, 'pb', `--dx:${(cx - X(px)).toFixed(1)}px;--dy:${(Y((st + sb) / 2) - Y(pz)).toFixed(1)}px`) // the ball where it crossed, a pixel baseball at true size
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">${g}</svg>`
  }
  // the pitch arrow (R; 28 Oct, night, Andrew: the movement as the batter perceives it, so a dead-ahead four-seamer shows next to nothing): the break measured against an average
  // four-seamer from the same hand (feltBreak, pitchcam25.js), at true scale on the zone, catcher's view, in the pitch color (Y). R1 is one arrow from where the pitch looked
  // headed to where it crossed; R2 is the same as its two parts, sideways then down (or up); R3 (locked 28 Oct, night) is the path: dots from where it looked headed, bending into
  // the ball as the movement builds (it grows with the square of the time). Far ends are clipped at the box edge.
  function moveArrow(b, X, Y, bx, by, S, W, H, rr) {
    const k = feltBreak(b)
    if (!mix.R || !k) return ''
    const dx = (k.h / 12) * S, dy = -(k.v / 12) * S, L = Math.hypot(dx, dy), gap = rr + 2
    const inBox = (x, y) => x >= 3 && x <= W - 3 && y >= 3 && y <= H - 3
    const clip = (x0, y0, x1, y1) => { let t1 = 1; for (const [p, q] of [[x1 - x0, x0 - 3], [-(x1 - x0), W - 3 - x0], [y1 - y0, y0 - 3], [-(y1 - y0), H - 3 - y0]]) { if (p < 0) t1 = Math.min(t1, -q / p) } t1 = Math.max(0, t1); return [x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1] }
    const ln = (x0, y0, x1, y1, w = 2, dash = '') => `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--pc)" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
    const head = (x, y, vx, vy) => { const a = 0.6, n = 7; return [[Math.cos(a), Math.sin(a)], [Math.cos(-a), Math.sin(-a)]].map(([c, s2]) => ln(x, y, x - n * (vx * c - vy * s2), y - n * (vx * s2 + vy * c))).join('') }
    let g = ''
    if (mix.R === 1) {
      if (L < gap + 4) return ''
      const ux = dx / L, uy = dy / L, hx = bx - ux * gap, hy = by - uy * gap, [tx, ty] = clip(hx, hy, bx - dx, by - dy)
      g = ln(tx, ty, hx, hy) + head(hx, hy, ux, uy)
    } else if (mix.R === 2) {
      // the sideways leg along the top (dashed, from where it was headed), then the vertical leg down (or up) into the ball
      const sy = by - dy, vy = Math.sign(dy) || 1, ey = by - vy * gap
      const [s0x, s0y] = clip(bx, sy, bx - dx, sy)
      if (Math.abs(dx) > 2) g += ln(s0x, s0y, bx, sy, 2, '4 3')
      if (Math.abs(dy) > gap + 3) { const [cx2, cy2] = clip(bx, ey, bx, sy); g += ln(cx2, cy2, bx, ey) + head(bx, ey, 0, vy) }
    } else {
      const pts = Array.from({ length: 13 }, (_, i) => { const u = i / 12, w = 1 - u * u; return [bx - dx * w, by - dy * w] }).filter(([x, y]) => inBox(x, y) && Math.hypot(x - bx, y - by) > gap)
      pts.forEach(([x, y], i) => { const sz = 2 + (2 * i) / Math.max(1, pts.length - 1); g += `<rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="var(--pc)"/>` })
    }
    return `<g class="pa" data-r="${mix.R}" data-dx="${dx.toFixed(1)}" data-dy="${dy.toFixed(1)}">${g}</g>`
  }
  function paintPitch() {
    if (mode === 'shot') { paintSeatForm(); return }
    const b = mode === 'replay' ? cur : stepped?.b ?? null, zg = E('#c25zg'), pl = E('#c25pl') // tweaking: the real pitch, which your changes don't touch
    if (!b) {
      zg.innerHTML = ''; zg.style.display = 'none'
      const o = odds()
      pl.innerHTML = `<div class="none"><b>NO PITCH FOR A DOJO SWING</b><br>THE BALL IS NOT TIED TO A PITCH.<br>HOME RUN ODDS <b>${pct(o.p)}%</b> FROM ${o.src}</div>`
      return
    }
    zg.style.display = ''
    const off = offZone(b), pn = pname(b.p), bk = feltBreak(b)
    zg.innerHTML = zone(b, zg.clientWidth || 136, zg.clientHeight || 120, off)
    zg.classList.toggle('anim', performance.now() - pitchIn < 700)
    // most important first: rows drop from the end when the panel is short
    const rows = [['SPEED', f(b.pv, 1, ' MPH')], ['SPIN', f(b.rpm, 0, ' RPM')], ['BREAK', bk ? `${Math.abs(bk.h).toFixed(0)} IN ${(b.t === 'L' ? bk.h > 0 : bk.h < 0) ? 'ARM' : 'GLOVE'}` : '--'], [bk && bk.v > 0 ? 'RIDE' : 'DROP', bk ? `${Math.abs(bk.v).toFixed(0)} IN` : '--'], ['APPROACH', f(b.vaa, 1, '°')], ['COUNT', b.bl != null ? `${b.bl}-${b.sk}` : '--'],
      ['PITCHER', pn ? pn[0].toUpperCase() : '--', 1], ['THROWS', b.t === 'L' ? 'LEFT' : b.t === 'R' ? 'RIGHT' : '--'], ['HEIGHT', f(b.pz, 2, ' FT')], ['SIDE', f(b.px, 2, ' FT')], ['SPIN TILT', clock(b.ax)], ['EFFECTIVE', f(b.eff, 1, ' MPH')], ['EXTENSION', f(b.ext, 1, ' FT')], ['RELEASE H', f(b.rz, 2, ' FT')], ['ARM ANGLE', f(b.arm, 0, '°')]]
    const tag = off ? (b.hr ? `<div class="om"><b>${NAMES.offMenu}: ${off.word}</b>${off.inches.toFixed(1)} IN ${off.side}</div>` : `<div class="om">OUT OF THE ZONE: ${off.inches.toFixed(1)} IN ${off.side}</div>`) : ''
    pl.innerHTML = `<div class="hd">${(PITCH[b.pt] ?? b.pt ?? 'PITCH').toUpperCase()}</div>` + tag + rows.map(([a, c, wide]) => `<div class="r${wide ? ' wide' : ''}"><span>${a}</span><b>${c}</b></div>`).join('')
    const rs = [...pl.querySelectorAll('.r')]
    for (let n = rs.length; n > 2 && pl.scrollHeight > pl.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // LANDING PARTY in the shared panel: the real Oracle home runs most like this ball, numbered as in the park
  // HEAT MAP (heat25.js; 3 Nov, Andrew: "A live heatmap of how hard it is to hit home runs to different parts of oracle park. Pick a player and see how their specific
  // batter profile lends itself to oracle park - their own heatmap, every home run they've hit, what's easier and harder in different areas"): the fan in the park; here
  // the hitter to show (THE LEAGUE, or one of the replay set's), the air it is flown in, the seven parts of the park in words and a key
  // A NORMAL NIGHT (4 Nov, Andrew: "Should we have the basal conditions for wind be what 'normal' wind is?"): 271 Oracle nights since July 2023 (replay.json) had a median
  // 61 F and a median 11 mph of wind, out of the west-southwest on 266 of them, which the page would read as blowing out to center. But at Oracle that wind barely reaches
  // the ball: across 4,073 fly balls the reported wind moved them 2 percent of what the physics says it should (science/mlb_wind_test.md, asos_wind_test.md), the bowl
  // keeps it off. So a normal night is 61 F and calm at the ball, and BLAST RADIUS opens on it; the AIR and WIND controls still change it, live
  const NORMAL_NIGHT = { temp: 61, wind: 0, xwind: 0 }
  let stage = null, heat = null, hmKey = '', hmWho = '', hmLooked = false, hmMetric = 'hard', hmPin = null, hmOver = null, hmTick = 0, hmSeat = null, hmList = false
  let hmValk = '', hmHA = 'all' // (6 Nov) BLAST RADIUS with a player: the bombs ALL, AT ORACLE or AWAY
  const hmPeople = (() => { let L = null; return () => { if (L) return L; const n = new Map(), h = new Map(); for (const b of R.balls) if (b.ft >= 335 || b.hr) { n.set(String(b.b), (n.get(String(b.b)) ?? 0) + 1); if (b.hr) h.set(String(b.b), (h.get(String(b.b)) ?? 0) + 1) } L = [...n.entries()].filter(([, k]) => k >= 12).map(([id, k]) => ({ id, k, hr: h.get(id) ?? 0, name: hmName(id) })).sort((a, b) => b.k - a.k).slice(0, 60); return L } })()
  const hmName = (id) => (pname(id)?.[0] ?? 'BATTER ' + id).toUpperCase()
  const airWords = (a) => `${a.temp}°F, ${a.wind ? `${Math.abs(a.wind)} MPH ${a.wind > 0 ? 'OUT' : 'IN'}` : 'CALM'}${a.xwind ? `, ${Math.abs(a.xwind)} ACROSS` : ''}, ${a.hand > 0 ? 'A RIGHTY' : 'A LEFTY'}`
  const zoneOf = (vals, wts) => ZONES.map(([a, b, name]) => { let v = 0, w = 0; for (let i = 0; i < heat.N; i++) { const m = heat.mid(i); if (m >= a && m < b && vals[i] != null) { const k = wts ? wts[i] : 1; v += vals[i] * k; w += k } } return { name, v: w ? v / w : null, w } })
  // a piece of the park in words: where it is, and what it says in the view on
  const hmData = () => (hmWho ? heat.player(hmWho) : hmMetric === 'many' ? heat.many() : heat.ready()) // (pointing never works out a new night on the spot; HITTER TYPES shows HOW HARD)
  const placeOf = (c) => `${zoneOf0(c.b)}${c.kind === 'wedge' ? ', IN FRONT OF THE WALL' : `, ${2 + c.j * heat.ROW_FT} TO ${12 + c.j * heat.ROW_FT} FT PAST THE WALL`}` // (4 Nov, evening: the rows as they are cut)
  const zoneOf0 = (b) => (ZONES.find(([a, c]) => b >= a && b < c) ?? ZONES[3])[2]
  const pc1 = (x) => (x >= 0.095 ? Math.round(x * 100) + '%' : (Math.round(x * 1000) / 10).toFixed(1) + '%')
  function cellWords(c) {
    if (!c) return null
    const d = hmData(), M = hmWho ? 'player' : hmMetric === 'many' ? 'many' : 'hard'
    if (!d) return null
    if (M === 'hard') { const x = c.kind === 'wedge' ? d.wall[c.i] : d.seat[c.i][c.j]; return { place: placeOf(c), main: x ? `${x.ev} MPH` : 'OUT OF REACH', sub: x ? `THE SOFTEST EXIT SPEED THAT GETS A HOME RUN ${c.kind === 'wedge' ? 'OVER THE WALL THERE' : 'DOWN THERE'}: ${x.ev} MPH AT ${x.la}°${x.fill ? '. NO TESTED FLIGHT CAME DOWN IN THIS ONE ITSELF: THE MIDDLE OF THE TWO ON EITHER SIDE' : ''}` : 'NOTHING UP TO 132 MPH COMES DOWN THERE', ev: x?.ev ?? null } }
    if (M === 'many') { const n = c.kind === 'wedge' ? d.wedge[c.i] : d.seat[c.i][c.j]; return { place: placeOf(c), main: `${n} HOME RUN${n === 1 ? '' : 'S'}`, sub: c.kind === 'wedge' ? 'CAME DOWN SOMEWHERE OUT THIS WAY, SINCE JULY 2023' : 'CAME DOWN IN THESE SEATS, SINCE JULY 2023', n } }
    // a player (4 Nov, evening; the red team: say what the numbers are out of, and no percent from a handful)
    if (c.kind === 'wedge') { const n = d.n5[c.i], out = d.out5[c.i]; return { place: placeOf(c), main: `${pc1(d.field[c.i])} OF THEIR BALLS GO THIS WAY`, sub: n ? `${out} OF THE ${n} HOME RUN${n === 1 ? '' : 'S'} THEY HIT THIS WAY WOULD GO OUT HERE TONIGHT` : 'NONE OF THEIR HOME RUNS WENT THIS WAY' } }
    const sh = d.seat[c.i][c.j], k = d.hrSeat[c.i][c.j]
    return { place: placeOf(c), main: sh ? `${pc1(sh)} OF THEIR LIKELY LANDINGS` : '' /* (6 Nov: nothing said for a seat they do not land in) */, sub: `FROM ALL ${d.n} OF THEIR DEEP BALLS, FLOWN HERE AND A LITTLE TO EACH SIDE. ${k ? `${k} OF THEIR REAL HOME RUNS COME${k === 1 ? 'S' : ''} DOWN HERE` : 'NONE OF THEIR REAL HOME RUNS COMES DOWN HERE'}.` }
  }
  // the pointed-at box: what is under the pointer, and against the one kept (a click keeps one; a click on it again lets it go)
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], dayOf = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? '')); return m ? `${MON[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : String(d ?? '') }
  let hmBomb = null
  function paintHmOver() {
    const box = E('#c25hb .hmo'); if (!box) return
    if (hmBomb?.b) { const B = hmBomb.b, html = `<b>${hmName(B.b)} · ${dayOf(B.d)}</b><em>${B.ft} FT${B.park && B.park !== 'SF' ? ` AT ${B.park}` : ' AT ORACLE'}</em><i>${hmBomb.gone ? 'IT GOES OUT HERE TONIGHT' : 'IT STAYS IN HERE TONIGHT'} · CLICK TO WATCH IT IN DINGER DÉJÀ-VU</i>`; if (box.innerHTML !== html) box.innerHTML = html; return }
    const w = cellWords(hmOver), p = cellWords(hmPin)
    let html = w ? `<b>${w.place}</b><em>${w.main}</em><i>${w.sub}</i>` : `<i>${hmWho ? 'POINT AT THE FIELD OR THE SEATS, OR AT A BOMB FOR ITS DAY. CLICK A BOMB TO WATCH IT IN DINGER DÉJÀ-VU.' : 'POINT AT THE FIELD OR THE SEATS.'}</i>`
    if (p) { const diff = w && p.ev != null && w.ev != null && hmOver !== hmPin ? w.ev - p.ev : null; html += `<span class="hpin">KEPT: ${p.place}${p.main ? `, ${p.main}` : ""}${diff != null ? ` · THIS ONE TAKES ${Math.abs(diff)} MPH ${diff > 0 ? 'MORE' : diff < 0 ? 'LESS' : ''}${diff === 0 ? 'THE SAME' : ''}` : ''}</span>` }
    if (box.innerHTML !== html) box.innerHTML = html
  }
  function paintHeat() {
    const el = E('#c25hi'), hb = E('#c25hb'), s = api.state
    wordTitle(el, '/ B L A S T &nbsp; R A D I U S /', 'landing')
    const keepQ = (() => { const q = hb.querySelector('.hwq'); return q && hmList ? { v: q.value, f: document.activeElement === q, at: q.selectionStart ?? q.value.length } : null })() // (7 Nov: a search survives the panel redrawing)
    const key = [hmWho, hmMetric, Math.round(s.temp), Math.round(s.wind), Math.round(s.xwind ?? 0), s.hand].join() // (red team 7: the list being open is not part of it)
    if (key === hmKey && hb.querySelector('.hm')) return
    hmKey = key
    const who = hmWho, people = hmPeople()
    grid.classList.toggle('hmwho', !!who) // (6 Nov: AIR and WIND only for the whole map)
    if (!who) hmValk = '' // (7 Nov, red team 9: back to EVERYONE, so the same player plays it again)
    // (4 Nov, night, Andrew: "The 'who' selector feels way out of place vibes wise with this white drop down"): a pixel button that opens a list in the panel
    const cur0 = people.find((p) => p.id === who)
    const pick = `<div class="hmp">WHO <span class="bt hws${hmList ? ' on' : ''}" id="c25hmw" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="${hmList}">${cur0 ? cur0.name : 'EVERYONE'}<i class="cv"></i></span></div>` +
      `<div class="hwl" role="listbox"${hmList ? '' : ' hidden'}><input class="hwq" placeholder="SEARCH PLAYERS" aria-label="search players" autocomplete="off" spellcheck="false">${[{ id: '', name: 'EVERYONE', k: null }, ...people].map((p) => `<span class="hwi${p.id === who ? ' on' : ''}" role="option" tabindex="0" data-who="${p.id}" data-name="${String(p.name).toUpperCase().replace(/"/g, '')}">${p.name}${p.k != null ? `<em>${p.k} BALLS · ${p.hr} HR</em>` : ''}</span>`).join('')}</div>`
    const tabs = who ? `<div class="hmt hha">${[['all', 'ALL'], ['home', 'AT ORACLE'], ['away', 'AWAY']].map(([k, t]) => `<span class="bt${hmHA === k ? ' on' : ''}" data-ha="${k}" role="button" tabindex="0">${t}</span>`).join('')}</div>` : `<div class="hmt"><span class="bt${hmMetric === 'hard' ? ' on' : ''}" data-hm="hard">HOW HARD</span><span class="bt${hmMetric === 'many' ? ' on' : ''}" data-hm="many">HOW MANY</span></div>`
    const stops = (GRADS.find((g) => g.c === lab.BG) ?? GRADS[0]).stops
    const key2 = (_, lo, hi) => `<div class="hmk"><span>${lo}</span><i style="background:linear-gradient(90deg,${stops.join(',')})"></i><span>${hi}</span></div>`
    let body = ''
    if (!heat.gridReady()) { // (the landing grid first, a few wedges at a time, while the page keeps drawing)
      clearTimeout(hmTick); const click = () => { if (heat.gridReady() || show !== 'hm') return; sound.play('geiger', { vol: 0.22 }); hmTick = setTimeout(click, 40 + Math.random() * 160) }; click()
      heat.gridAsync(() => { clearTimeout(hmTick); if (show === 'hm') { hmKey = ''; paintHeat() } }, 24)
      hb.innerHTML = `<div class="sel hm">${pick}${tabs}<div class="lph">WORKING OUT TONIGHT'S AIR ACROSS THE PARK...</div></div>`; hmKey = ''; wireWho()
      return
    }
    if (!who && hmMetric !== 'many' && !heat.ready()) { // (worked out a few wedges at a time; the panel says so and fills in when it is done)
      // (the surprise round: a Geiger counter clicks, unevenly, while it works)
      clearTimeout(hmTick); const click = () => { if (heat.ready() || show !== 'hm') return; sound.play('geiger', { vol: 0.22 }); hmTick = setTimeout(click, 40 + Math.random() * 160) }; click()
      heat.hardAsync(() => { clearTimeout(hmTick); if (show === 'hm') { hmKey = ''; paintHeat() } setTimeout(() => heat.hitters(), 700) }) // (the hitter list too, so picking one is quick)
      hb.innerHTML = `<div class="sel hm">${pick}${tabs}<div class="lph">WORKING OUT TONIGHT'S AIR ACROSS THE PARK...</div></div>`; hmKey = ''; wireWho()
      return
    }
    const zoneRows = (fn) => ZONES.map(([a, b, name]) => { const r = { name, n: 0, out: 0, f: 0 }; for (let i = 0; i < heat.N; i++) { const m = heat.mid(i); if (m >= a && m < b) fn(r, i) } return r })
    if (!who && hmMetric !== 'many') {
      const H = heat.hard(); heat.show({ metric: 'hard', data: H }); setTimeout(() => { if (show === 'hm') heat.hitters() }, 900)
      const z = zoneOf(H.wall.map((m) => m?.ev ?? null)), zz = z.filter((r) => r.v != null)
      const normal = H.air.temp === NORMAL_NIGHT.temp && !H.air.wind && !H.air.xwind
      {
        // 4 Nov, evening (the red team's lead line; Andrew: 12a): the easiest part of the wall and the hardest, and the gap, from tonight's numbers
        const easy = zz.reduce((p, r) => (r.v < p.v ? r : p)), tough = zz.reduce((p, r) => (r.v > p.v ? r : p))
        // and (the red team: "the hard-mode legend is literally wrong") a key for each surface, each over its own range, from tonight's numbers
        const wl = H.wall.map((x) => x?.ev).filter((x) => x != null), sl = H.seat.flat().map((x) => x?.ev).filter((x) => x != null)
        body = `<div class="hlead">${easy.name} <b>${Math.round(easy.v)} MPH</b> · ${tough.name} <b>${Math.round(tough.v)} MPH</b> · ${Math.round(tough.v - easy.v)} MPH TOUGHER</div>` +
          `<div class="lph">THE SOFTEST EXIT SPEED THAT PUTS A HOME RUN THERE, AT ITS BEST LAUNCH ANGLE. ORANGER IS EASIER. ${normal ? `A NORMAL NIGHT AT ORACLE: 61°F, AND CALM AT THE BALL (THE WIND OVER THE PARK, 11 MPH MOST NIGHTS, BARELY REACHES IT IN THE BOWL). CHANGE THE AIR OR THE WIND TO SEE ANOTHER NIGHT.` : `LIVE WITH THE AIR: ${airWords(H.air)}.`}</div>` +
          `<div class="lph" style="margin-top:4px">OVER THE WALL, BY PART OF THE PARK</div>` + z.map((r) => `<div class="lpr2"><span>${r.name}</span><b>${r.v == null ? '--' : Math.round(r.v) + ' MPH'}</b></div>`).join('') +
          key2(null, `THE WALL ${Math.max(...wl)} MPH`, `${Math.min(...wl)} MPH`) + (sl.length ? key2(null, `THE SEATS ${Math.max(...sl)} MPH`, `${Math.min(...sl)} MPH`) : '') +
          `<div class="lph" style="margin-top:4px">EACH ONE COLORED OVER ITS OWN RANGE: POINT AT TWO PLACES TO COMPARE THE MPH.</div>`
      }
    } else if (!who) {
      const M = heat.many(); heat.show({ metric: 'many', data: M })
      // 4 Nov, evening (the red team: "463 ... do not reconcile to the 396 shown"): every recorded home run in one line or another, and the lines add up to all of them
      const T = M.tally, zs = zoneRows((r, i) => { r.n += M.wedge[i] }), top = zs.reduce((p, r) => (r.n > p.n ? r : p)), P = (n) => Math.round((100 * n) / Math.max(1, M.n)) + '%'
      body = `<div class="hlead">${top.name} GETS THE MOST: <b>${top.n}</b> OF ${M.n}</div>` +
        `<div class="lph">WHERE THE ${M.n} HOME RUNS HIT AT ORACLE SINCE JULY 2023 COME DOWN, EACH FLOWN AGAIN IN ITS OWN NIGHT'S AIR. BRIGHTER IS MORE, BLENDED WITH THE CELLS ROUND IT; POINT AT ONE FOR ITS OWN COUNT.</div>` +
        zs.map((r) => `<div class="lpr2"><span>${r.name}</span><b>${r.n} <i>${P(r.n)}</i></b></div>`).join('') +
        (T.short ? `<div class="lpr2"><span>FLOWN AGAIN, THEY STAY IN</span><b>${T.short} <i>${P(T.short)}</i></b></div>` : '') +
        (T.wrap ? `<div class="lpr2"><span>WRAPPED ROUND A POLE</span><b>${T.wrap} <i>${P(T.wrap)}</i></b></div>` : '') +
        `<div class="lpr2 hmup"><span>ALL OF THEM</span><b>${M.n} <i>100%</i></b></div>` + key2(null, 'NONE', 'MOST')
    } else {
      // 4 Nov, later (Andrew: "For each player I want like a 'customized heatmap' - the histograms should be LF vs RF with a little thing that says pull or not. Then
      // the profile shouldn't just say 'up the middle' it should have different classifications ... We should most certainly be using the player portraits"): the
      // portrait, their type and badges (hitter25.js), the map from all their balls with the bombs only for the real home runs, and three histograms, every ball in
      // grey with the home runs in bone over them; where they hit it runs left field to right field, with PULL on their pull side
      const P = heat.player(who), nm = hmName(who), Rd = P.read, Ty = P.type
      heat.show({ metric: 'player', data: P }); if (who !== hmValk && sound.on()) { clearTimeout(songT); if (jukebox.play('valkyries', { vol: 0.8, onEnd: () => { autoSong = false } })) { hmValk = who; autoSong = true } } // (6 Nov: the bombing run)
      const pc = (x) => Math.round(x * 100) + '%', med = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]
      const bars = (all, hrs, lo, hi, step, l, r) => {
        const n = Math.round((hi - lo) / step), bin = (v) => Math.max(0, Math.min(n - 1, Math.floor((v - lo) / step))), c = Array(n).fill(0), h = Array(n).fill(0)
        for (const v of all) c[bin(v)]++
        for (const v of hrs) h[bin(v)]++
        const mx = Math.max(1, ...c), w = 100 / n, bar = (k, i, fill) => `<rect x="${(i * w + 0.4).toFixed(2)}" y="${(24 - 22 * (k / mx)).toFixed(2)}" width="${(w - 0.8).toFixed(2)}" height="${(22 * (k / mx)).toFixed(2)}" fill="${fill}"/>`
        const m = all.length ? med(all) : null
        return `<div class="hph"><svg viewBox="0 0 100 26" preserveAspectRatio="none">${c.map((k, i) => bar(k, i, 'var(--dim)')).join('')}${h.map((k, i) => (k ? bar(k, i, 'var(--tx)') : '')).join('')}${m != null ? `<rect x="${(((m - lo) / (hi - lo)) * 100 - 0.5).toFixed(2)}" y="0" width="1" height="26" fill="var(--acc)"/>` : ''}<rect x="0" y="24.6" width="100" height="0.6" fill="var(--dim)"/></svg><span><i>${l}</i><i>${r}</i></span></div>`
      }
      const sideL = Rd.side === 'R' ? `<em>PULL ${pc(Rd.pull)}</em>` : Rd.side === 'L' ? `<em>OPPO ${pc(Rd.oppo)}</em>` : '', sideR = Rd.side === 'L' ? `<em>PULL ${pc(Rd.pull)}</em>` : Rd.side === 'R' ? `<em>OPPO ${pc(Rd.oppo)}</em>` : ''
      const zs = zoneRows((r, i) => { r.f += P.field[i]; r.n += P.n5[i]; r.out += P.out5[i] })
      { const lg = (pool?.rows ?? []).filter((x) => x[3] >= 335 && Math.abs(x[2]) <= 45), L = ZONES.map(([a, b]) => lg.filter((x) => x[2] >= a && x[2] < b).length / Math.max(1, lg.length)); zs.forEach((r, k) => { r.vs = Math.round((r.f - L[k]) * 100) }) }
      const badgeDesc = Object.fromEntries(HIT_BADGES), alone = (P.rank?.list ?? []).filter((x) => x.type.name === Ty.name).length === 1
      // the best seat to catch one (the surprise round): the cell the most of their likely landings come down in, as a seat; SIT THERE takes it to SHOT CALLER
      hmSeat = null
      if (P.best) { const c = P.best.cove ? { what: 'cove', line: 'MCCOVEY COVE', short: 'THE COVE' } : se.seatAt(P.best.c, 'STANDS'); hmSeat = { at: P.best.c, call: c } }
      const seatLine = hmSeat ? `<div class="hseat"><span>BEST SEAT TO CATCH ONE</span><b>${hmSeat.call.what === 'seat' ? `SEC ${hmSeat.call.sec} · ROW ${hmSeat.call.row}` : hmSeat.call.what === 'cove' ? 'IN A KAYAK IN THE COVE' : hmSeat.call.line}</b></div>` : ''
      body = `<div class="hpl"><canvas class="hpf"></canvas><div><b class="t1">${Ty.name}</b><i>${Ty.say}</i>${alone ? '<span class="hbg one" title="nobody else in the set is this type">THE ONLY ONE</span>' : ''}${Ty.badges.map((x) => `<span class="hbg" title="${badgeDesc[x] ?? ''}">${x}</span>`).join('')}</div></div>` + seatLine +
        `<div class="lph">${Rd.n} BALLS OF 335 FT AND UP SINCE JULY 2023, ANY PARK; ${P.hr} WENT OUT. THE MAP: ALL ${Rd.n} FLOWN HERE TONIGHT. THE BOMBS: THE ${P.hr} HOME RUNS, GREEN AND ORANGE FOR THE ONES HIT AT ORACLE, THE HOME TEAM'S COLORS FOR THE REST; ${P.hrOut} GO OUT HERE (THEIR TRAILS ARE GREEN). MOSTLY ${Math.round(Rd.ev25)} TO ${Math.round(Rd.ev75)} MPH, ${Math.round(Rd.la25)}° TO ${Math.round(Rd.la75)}°${P.hr ? `; HOME RUNS ${Math.round(Rd.hrFt)} FT TYPICAL, ${Math.round(Rd.hrMax)} THE LONGEST` : ''}.</div>` +
        `<div class="lph" style="margin-top:6px">WHERE THEY HIT IT <span class="lg">· GREY ALL, BONE HR</span></div>` + bars(Rd.dirs, Rd.hrDirs, -45, 45, 5, `LEFT FIELD${sideL}`, `${sideR}RIGHT FIELD`) +
        `<div class="lph">EXIT SPEED</div>` + bars(Rd.evs, Rd.hrEvs, 88, 120, 2, '88 MPH', '120') +
        `<div class="lph">LAUNCH ANGLE</div>` + bars(Rd.las, Rd.hrLas, 10, 50, 2.5, '10°', '50°') +
        `<div class="lph" style="margin-top:6px">THEIR SHARE · AGAINST THE LEAGUE · HR OUT HERE</div>` +
        zs.map((r) => `<div class="lpr2"><span>${r.name}</span><b>${pc(r.f)} <i class="${r.vs > 0 ? 'up' : ''}">${r.vs > 0 ? '+' : r.vs < 0 ? '-' : ''}${Math.abs(r.vs)}</i> <i>${r.n ? `${r.out} OF ${r.n} HR` : 'NO HR'}</i></b></div>`).join('') + key2(null, 'FEWEST', 'MOST')
    }
    hb.innerHTML = `<div class="sel hm">${pick}${tabs}<div class="hmo"></div>${body}</div>`
    wireWho()
    // the WHO button, its search and list, and the tabs: wired in every state of the panel (6 Nov: while the air was being worked out the panel showed them dead)
    function wireWho() {
      const sel = hb.querySelector('#c25hmw'), flip = (open = !hmList) => { hmList = open; sound.play('move'); const L = hb.querySelector('.hwl'); if (L) L.hidden = !hmList; sel?.classList.toggle('on', hmList); sel?.setAttribute('aria-expanded', String(hmList)); if (hmList) { const q = hb.querySelector('.hwq'); if (q) { q.value = ''; filt(''); q.focus() } else hb.querySelector('.hwi.on, .hwi')?.focus() } else sel?.focus() }
      const rows = () => [...hb.querySelectorAll('.hwi')].filter((r) => !r.hidden), filt = (v) => { const q = v.trim().toUpperCase(); hb.querySelectorAll('.hwi').forEach((r) => { r.hidden = !!q && !(r.dataset.name ?? '').includes(q) }) }
      sel?.addEventListener('click', () => { pressEl(sel); flip() })
      sel?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); flip() } })
      // (6 Nov, Andrew: "you should be able to search for players"): typing narrows the list; Enter takes the first one left, Down walks into the list
      const hq = hb.querySelector('.hwq')
      hq?.addEventListener('input', () => filt(hq.value))
    if (hq && keepQ) { hq.value = keepQ.v; filt(keepQ.v); if (keepQ.f) { hq.focus(); try { hq.setSelectionRange(keepQ.at, keepQ.at) } catch (err) { void err } } }
      hq?.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); rows()[0]?.click() } else if (e.key === 'ArrowDown') { e.preventDefault(); rows()[0]?.focus() } else if (e.key === 'Escape') { e.preventDefault(); flip(false) } })
      hb.querySelectorAll('.hwi').forEach((it) => it.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const all = rows(), k = all.indexOf(it), n = k + (e.key === 'ArrowDown' ? 1 : -1); if (n < 0) hq?.focus(); else all[Math.min(all.length - 1, n)]?.focus() } if (e.key === 'Escape') { e.stopPropagation(); flip(false) } }))
      const forget = () => { hmBomb = null; hmOver = null; hmPin = null; E('#c25h')?.style.setProperty('cursor', '') } // (red team 5)
      hb.querySelectorAll('[data-ha]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); hmHA = b.dataset.ha; heat.bombsWhere(hmHA); hb.querySelectorAll('[data-ha]').forEach((x) => x.classList.toggle('on', x === b)) }))
      hb.querySelectorAll('[data-hm]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); hmMetric = b.dataset.hm; hmWho = ''; forget(); hmKey = ''; paintHeat() }))
      hb.querySelectorAll('[data-who]').forEach((b) => { const go = () => { sound.play('pick'); hmList = false; hmWho = b.dataset.who; forget(); hmKey = ''; paintHeat() }; b.addEventListener('click', go); b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go() } }) })
    }
    // the portrait (the same faces as the batter box: the real photo, else the generated one), in the page's art style
    const pf = hb.querySelector('.hpf')
    if (pf && who) { try { const rec = facesRaw[who], gen = !rec && hasGen ? genericFace('composite', who) : null, src = rec ? faceSource(rec) : gen ? gen.src : drawBust(160), cs = cs0(); drawFace(pf, src, optOf('A', mix.A).canvas ?? 'hedcut', 76, 76, { ink: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim() }) } catch (err) { void err } }
    if (hmOver) heat.outline(hmPin ?? hmOver)
    paintHmOver()
    if (!hmLooked || !look) { hmLooked = true; lookBlast() }
  }
  // pointing at the park while the heat map is on: the cell under the pointer in words; a click keeps it for comparing
  { let pT = 0, dn = null
    addEventListener('pointermove', (e) => { if (show !== 'hm' || !heat || !onPark(e)) return; const n = performance.now(); if (n - pT < 60) return; pT = n
      const bm = hmWho ? heat.bombAt(e.clientX, e.clientY) : null
      if ((bm?.k ?? -1) !== (hmBomb?.k ?? -1)) { hmBomb = bm; heat.bombFocus(bm?.k ?? -1); E('#c25h')?.style.setProperty('cursor', bm ? 'pointer' : ''); paintHmOver() }
      if (bm) return
      const c = heat.cellAt(e.clientX, e.clientY); if (c !== hmOver) { hmOver = c; heat.outline(c ?? hmPin); paintHmOver() } })
    addEventListener('pointerdown', (e) => { dn = show === 'hm' && onPark(e) ? [e.clientX, e.clientY] : null })
    addEventListener('pointerup', (e) => { if (!dn || Math.hypot(e.clientX - dn[0], e.clientY - dn[1]) > 5) return
      const bm = hmWho ? heat.bombAt(e.clientX, e.clientY) : null
      if (bm?.b) { const B = bm.b; hmBomb = null; sound.play('pick'); goTab('replay'); if (mode === 'replay') { filter = 'all'; balls = filtered(); const i = balls.indexOf(B); if (i >= 0) { idx = i; applyBall(balls[i]); paintChooser() } } return } // (red team 3)
      void 0 }) }
  function paintLanding(res) {
    const s = api.state, el = E('#c25hi'), hb = E('#c25hb'), bear = res.landB ?? s.dir
    wordTitle(el, '/ L A N D I N G &nbsp; P A R T Y /', 'landing')
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(bear * 2), cur ? cur.d + cur.b : 'w'].join()
    const at = res.landing?.point ?? (res.path?.length ? api.toWorld(res.path[res.path.length - 1].p) : null) // (3 Nov: this one's own landing, so the party is the ones that came down closest)
    if (key !== lpKey) { lpKey = key; lpList = lp.show({ ev: s.ev, la: s.la, bear, self: cur ?? stepped?.b, at }, getComputedStyle(root).getPropertyValue('--acc').trim()); lookAt(lpList.map((x) => x.at).filter(Boolean).concat(at ? [at] : []), 18) }
    // 31 Oct (Andrew: "we should be able to click into any landing party HR and then see it as a tweak the tater"): point at a row for its flight in the park, click
    // it to carry that home run into TWEAK THE TATER
    hb.innerHTML = `<div class="lpl"><div class="lph">THE ${lpList.length} ORACLE HOME RUNS (OF ${lp.count()} SINCE JULY 2023) THAT CAME DOWN CLOSEST TO WHERE THIS ONE DOES, NEAREST FIRST. POINT AT ONE FOR ITS FLIGHT, CLICK TO TWEAK IT</div>` + lpList.map((x) => { const n = pname(x.b.b); return `<div class="lpr" data-n="${x.n}" role="button" tabindex="0" title="tweak this one"><b>${x.n}</b><span class="nm">${(n ? n[0] : 'BATTER ' + x.b.b).toUpperCase()}</span><span>${x.b.d} · ${x.b.ft} FT</span><span>${x.away != null ? x.away + ' FT AWAY' : x.b.ft + ' FT'}</span><span class="wh">${x.where}</span></div>` }).join('') + '</div>'
    const rs = [...hb.querySelectorAll('.lpr')]
    rs.forEach((r) => { const k = Number(r.dataset.n), x = lpList[k - 1]; r.addEventListener('pointerenter', () => lp.focus(k)); r.addEventListener('focus', () => lp.focus(k)); r.addEventListener('pointerleave', () => lp.focus(null)); r.addEventListener('blur', () => lp.focus(null)); r.addEventListener('click', () => { pressEl(r); tweakBall(x.b) }); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); tweakBall(x.b) } }) })
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // SEAT SEANCE in the shared panel: where 300 ghosts of this ball come down, by outcome and by zone
  // 30 Oct (Andrew: "Seat seance bugs with tweak the tater into the field"; "way way way too busy"): the seance waits until the dragging stops (half a second
  // with no change) before it flies its 300 ghosts, and only calls a seat for a ball that leaves the park; one that stays in gets a line in the panel, no ghost, no
  // cloud. The ghost carries the call (GH1); the board only calls the seat when nothing is flying
  let seWait = null, seGone = true
  const HR_KEYS = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE']
  function paintSeance(res) {
    const s = api.state, el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ S E A T &nbsp; S E A N C E /', 'seance')
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(s.dir * 2), Math.round(s.temp), s.wind, s.xwind, s.hand, s.carry, s.dws].join()
    if (key !== seKey) {
      seKey = key; seRes = null; se.clear(); ghost?.hide(); clearTimeout(seWait)
      seGone = !res || (res.verdict?.kind ?? (HR_KEYS.includes(res.key) ? 'GONE' : '')) === 'GONE'
      if (seGone) seWait = setTimeout(() => {
        if (seKey !== key || show !== 'se') return
        const cs = getComputedStyle(root)
        seRes = se.run({ ...api.state }, { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim() }, { sign: !ghost, tall: 4, out: true })
        lookAt([seRes.at], Math.max(12, seRes.most * 0.3048))
        ghost?.show(seRes.at, seRes.call, cs.getPropertyValue('--acc').trim())
        const sc0 = seRes.call, flying = !!api.anim?.() && !api.anim().exploded
        if (!flying) { if (sc0.what === 'seat') life?.show('SEC ' + sc0.sec, `ROW ${sc0.row} SEAT ${sc0.seat}`); else life?.show(sc0.short); life?.idle(sc0.what === 'seat' ? `SEC ${sc0.sec}  ·  ROW ${sc0.row} SEAT ${sc0.seat}` : sc0.short) } // the board calls the seat too
        paintSeance(last)
      }, window.__fixedTime !== undefined ? 0 : 450)
    }
    if (!seGone) { hb.innerHTML = '<div class="sel"><div class="lph">THIS ONE STAYS IN THE PARK: NO SEAT TO HAUNT.</div><div class="lph">SEND ONE OUT AND THE SEANCE FLIES HUNDREDS OF GHOSTS OF IT AND CALLS THE SEAT THEY COME DOWN IN.</div></div>'; return }
    if (!seRes) { hb.innerHTML = '<div class="sel"><div class="lph">SUMMONING THE GHOSTS...</div></div>'; return }
    // the call first (28 Oct, night, Andrew: gun to its head, a seat), then how tight the cloud is and where the rest come down
    const r = seRes, c = r.call, P = (n) => Math.round((100 * n) / r.N)
    const big = c.what === 'seat' ? `<div class="scall"><span>${c.area}</span><b>SECTION ${c.sec}</b><b>ROW ${c.row} · SEAT ${c.seat}</b></div>` : `<div class="scall"><span>THE CALL</span><b>${c.line}</b></div>`
    hb.innerHTML = `<div class="sel">${big}<div class="lph">${r.N} GHOSTS OF THIS BALL, SPREAD ONLY BY WHAT THE MODEL CAN'T SEE AFTER CONTACT. HALF COME DOWN WITHIN ${r.half} FT OF THE CALL, NINE IN TEN WITHIN ${r.most} FT.</div>` +
      r.zones.slice(0, 5).map(([z, n]) => `<div class="lpr2"><span>${z}</span><b>${P(n)}%</b></div>`).join('') + '<div class="lph">SEATS ARE A BEST GUESS FROM A SEATING CHART: SECTION BY ANGLE, ROW BY DEPTH, SEAT ALONG THE ROW.</div></div>'
    const rs = [...hb.querySelectorAll('.lpr2')]
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // MY SEAT in the shared panel (30 Oct, idea 3): your seat, typed once or clicked in the park and kept on this device, and the real home runs that came down
  // within 10 ft of it (myseat25.js); with none that close, the five closest. Click one to fly it
  const mySeat = initMySeat25(api, R.balls)
  // (2 Nov, night: YOUR FLAG) your seat flies your WALLOP WITNESS emblem while MY SEAT shows it
  let touches = null
  { const show0 = mySeat.show, clear0 = mySeat.clear; mySeat.show = (at, ...a) => { show0(at, ...a); touches?.flag(at, wstore.local().emblem) }; mySeat.clear = () => { clear0(); touches?.flag(null) } }
  let myKey = '', myRes = null, myEdit = false
  const mySaved = () => { try { return JSON.parse(store('nn-myseat25') || 'null') } catch { return null } }
  const mySave = (x) => { store('nn-myseat25', JSON.stringify({ sec: x.sec, row: x.row, seat: x.seat })); myEdit = false; myKey = ''; sound.play('pick'); if (last) render(last) }
  function paintMySeat() {
    const el = E('#c25hi'), hb = E('#c25hb'), me = mySaved()
    wordTitle(el, '/ M Y &nbsp; S E A T /', 'seat')
    if (!me || myEdit) {
      mySeat.clear()
      if (hb.querySelector('.sfm')) return // built once, so typing is never interrupted
      hb.innerHTML = `<div class="sfm"><div class="hd">WHERE DO YOU SIT?</div>
        <label>SECTION<select id="c25ms">${se.SECTIONS.map((x) => `<option value="${x[2]}">${x[2]} · ${x[3]}</option>`).join('')}</select></label>
        <label>ROW<input id="c25mr" maxlength="2" autocomplete="off" spellcheck="false" aria-label="row"></label><label>SEAT<input id="c25sx" maxlength="2" inputmode="numeric" autocomplete="off" aria-label="seat"></label>
        <span class="bt hot" id="c25mg" role="button" tabindex="0">THAT'S MY SEAT</span><div class="sfn" id="c25myn"></div>
        <div class="sfo">OR CLICK IT IN THE PARK. KEPT ON THIS DEVICE ONLY.</div></div>`
      E('#c25ms').value = me?.sec ?? '140'; if (me) { E('#c25mr').value = me.row; E('#c25sx').value = me.seat }
      const go = () => { const r = se.seatPoint(E('#c25ms').value, E('#c25mr').value, E('#c25sx').value); E('#c25myn').textContent = r.err ?? ''; if (r.err) { sound.play('back'); return } mySave(r) }
      const ready = () => E('#c25mg').classList.toggle('dim', !E('#c25mr').value.trim() || !E('#c25sx').value.trim()); E('#c25mr').addEventListener('input', ready); E('#c25sx').addEventListener('input', ready); ready()
      E('#c25mg').addEventListener('click', (e) => { pressEl(e.currentTarget); go() })
      E('#c25mg').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go() } })
      hb.querySelectorAll('input,select').forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Escape') { x.blur(); return } e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); go() } }))
      return
    }
    const key = [me.sec, me.row, me.seat].join()
    if (key !== myKey) {
      myKey = key; myRes = null
      hb.innerHTML = `<div class="sel"><div class="lph">SEC ${me.sec} · ROW ${me.row} · SEAT ${me.seat}</div><div class="lph myp">FINDING WHERE EVERY ORACLE HOME RUN CAME DOWN...</div></div>`
      mySeat.landings((n, N) => { const p = hb.querySelector('.myp'); if (p) p.textContent = `FINDING WHERE EVERY ORACLE HOME RUN CAME DOWN... ${Math.round((100 * n) / N)}%` }).then(() => {
        if (show !== 'my' || myKey !== key) return
        const r = se.seatPoint(me.sec, me.row, me.seat)
        if (r.err) { store('nn-myseat25', ''); myKey = ''; if (last) render(last); return }
        myRes = { at: r.at, ...mySeat.near(r.at) }
        mySeat.show(r.at, myRes.closest, cs0().getPropertyValue('--acc').trim())
        lookAt([r.at], 14)
        paintMySeat()
      })
      return
    }
    if (!myRes) return
    const n = myRes.inside.length
    hb.innerHTML = `<div class="lpl"><div class="scall"><span>YOUR SEAT</span><b>SECTION ${me.sec}</b><b>ROW ${me.row} · SEAT ${me.seat}</b></div>
      <div class="lph">${n ? `${n} HOME RUN${n > 1 ? 'S' : ''} CAME DOWN WITHIN 10 FT OF IT SINCE JULY 2023 (OF ${mySeat.count()} AT ORACLE).` : `NONE OF ${mySeat.count()} ORACLE HOME RUNS SINCE JULY 2023 CAME DOWN WITHIN 10 FT YET. THE CLOSEST:`}</div>` +
      myRes.closest.map((x, i) => { const nm = pname(x.b.b); return `<div class="lpr" data-my="${i}" role="button" tabindex="0" style="cursor:pointer;pointer-events:auto"><b>${i + 1}</b><span class="nm">${(nm ? nm[0] : 'BATTER ' + x.b.b).toUpperCase()}</span><span>${x.b.d}</span><span>${x.b.ft} FT</span><span class="wh">${Math.round(x.ft)} FT AWAY</span></div>` }).join('') +
      '<span class="bt" id="c25mc" role="button" tabindex="0">CHANGE SEAT</span></div>'
    hb.querySelectorAll('[data-my]').forEach((row) => row.addEventListener('click', () => { const b = myRes.closest[Number(row.dataset.my)].b; sound.play('pick'); if (mode !== 'replay') setMode('replay'); filter = 'all'; balls = filtered(); const i = balls.indexOf(b); if (i >= 0) { idx = i; applyBall(b); paintChooser(); play() } }))
    E('#c25mc').addEventListener('click', (e) => { pressEl(e.currentTarget); myEdit = true; mySeat.clear(); hb.innerHTML = ''; paintMySeat() })
    const rs = [...hb.querySelectorAll('.lpr')]
    for (let k = rs.length; k > 1 && hb.scrollHeight > hb.clientHeight + 1; k--) rs[k - 1].style.display = 'none'
  }
  // GAG REEL in the shared panel (30 Oct, Andrew: "Can I see the gags in like another view so I can press play on all of them?"): the camera faces the scoreboard,
  // every gag and show has its own PLAY, and PLAY ALL runs them one after another; leaving it (or another feature) stops the run. Also ?show=reel in the address
  const REEL_NEW = new Set(['burrito', 'boot', 'bison', 'pyramid']) // made on 31 Oct
  const REEL_TITLES = { burrito: 'MISSION BURRITO', boot: 'PARKING BOOT', bison: 'BISON', pyramid: 'POINT TAKEN', muniwait: 'MUNI WAIT', foghorn: 'FOGHORN', thirdrail: 'THIRD RAIL', ipa: '$19 IPA', covedive: 'COVE DIVE', bagcheck: 'SECURITY CHECK', noreentry: 'NO REENTRY', captcha: 'CAPTCHA', rentctrl: 'RENT CTRL', meter: 'PARKING METER', merch: 'NO TP', garlic: 'GARLIC PRESS', lombard: 'LOMBARD', coit: 'COIT SCOPE', seat: 'STUBHUB', humanbat: 'HUMAN BAT', crabpot: 'CRAB POT', bartdoors: 'BART DOORS', boardfry: 'DIAMOND VISION FRY', mowedin: 'GROUNDSKEEPER', gatecable: 'GATE CABLE', dynamite: 'KA-BOOM', bonk: 'BONK', runover: 'DING! (CABLE CAR)', sealsnack: 'GULP (SEA LION)', leaves3rd: 'LEAVES IN THE 3RD', bipped: 'BIPPED', catapult: 'CATAPULT', chipper: 'WOOD CHIPPER', alcatraz: 'ALCATRAZ', tshirt: 'T-SHIRT CANNON (LOU SEAL)', steamroller: 'STEAMROLLER', birds: 'THE BIRDS', quake: 'EARTHQUAKE', balloon: 'BALLOON', bp: 'PITCHING MACHINE', driverless: 'DRIVERLESS', crabsnip: 'CRAB SNIP', hotdog: 'DODGER DOG', waterboard: 'WATERBOARD', ironmaiden: 'IRON MAIDEN', rack: 'THE RACK', wifeleaves: 'SHE LEFT HIM', bridgejump: 'THE BRIDGE' }
  let reelAll = null, reelLooked = false
  const reelList = () => (life ? life.gags() : [])
  const reelBusy = () => !!life?.anim() || (life?.queued().length ?? 0) > 0
  function reelPlay(n) { life.play(n, {}, 0, true); paintGagReel() }
  // the row playing now lights up, and PLAY ALL says STOP while it runs (checked a few times a second while the reel is open)
  setInterval(() => { if (show !== 'reel' || !life) return; const hb = E('#c25hb'), now = life.anim(); hb.querySelectorAll('[data-rl]').forEach((r) => { const on = r.dataset.rl === now; if (r.classList.contains('on') !== on) { r.classList.toggle('on', on); r.querySelector('b').innerHTML = on ? '&#9654;' : '&middot;' } }); const ra = E('#c25ra'); if (ra) ra.textContent = reelAll ? 'STOP' : 'PLAY ALL' }, 400)
  function stopReelAll() { if (reelAll) { clearTimeout(reelAll.t); reelAll = null } }
  function playReelAll(from = 0) {
    stopReelAll()
    const gags = reelList(), me = (reelAll = { i: from, t: 0 })
    const next = () => { if (reelAll !== me || show !== 'reel') return; if (me.i >= gags.length) { reelAll = null; paintGagReel(); return } reelPlay(gags[me.i++]); me.t = setTimeout(wait, 600) }
    const wait = () => { if (reelAll !== me) return; if (reelBusy()) { me.t = setTimeout(wait, 300); return } me.t = setTimeout(next, 700) }
    next()
  }
  function paintGagReel() {
    const el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ G A G &nbsp; R E E L /', 'shot')
    if (!life) { hb.innerHTML = '<div class="lph">THE GAG REEL LIVES ON THE ORACLE SCOREBOARD.</div>'; return }
    if (!reelLooked) { reelLooked = true; lookThere('B') } // the camera faces the board (once per visit to the reel)
    const gags = reelList(), now = life.anim(), row = (n) => `<div class="lpr${now === n ? ' on' : ''}" data-rl="${n}" role="button" tabindex="0" style="cursor:pointer;pointer-events:auto"><b>${now === n ? '&#9654;' : '&middot;'}</b><span class="nm">${REEL_TITLES[n] ?? n.toUpperCase()}</span><span></span><span class="wh">${REEL_NEW.has(n) ? 'NEW' : ''}</span><span class="wh">PLAY</span></div>`
    hb.innerHTML = `<div class="lpl" style="overflow:auto;pointer-events:auto"><div class="lph">THE DODGER GAGS (${gags.length}). CLICK ONE TO PLAY IT ON THE BOARD.</div>
      <span class="bt hot" id="c25ra" role="button" tabindex="0">${reelAll ? 'STOP' : 'PLAY ALL'}</span>` + gags.map(row).join('') + '</div>'
    hb.querySelectorAll('[data-rl]').forEach((r) => r.addEventListener('click', () => { stopReelAll(); sound.play('pick'); reelPlay(r.dataset.rl) }))
    E('#c25ra').addEventListener('click', (e) => { pressEl(e.currentTarget); sound.play('pick'); if (reelAll) { stopReelAll(); paintGagReel() } else playReelAll() })
  }
  // SHOT CALLER (29 Oct, Andrew: its own mode; PLAY IT shows the most common flight paths; type a seat and see the numbers that could put a ball there). A spot, clicked
  // in the park or typed as a seat, goes to shotcaller.js, which flies a grid of speeds and angles at it; every swing that comes down there is ranked by how common a
  // ball hit like that is (real balls in the pool within 1 mph and 1 degree), and the first is set up to fly
  const POOL_N = Math.max(1, pool.rows?.length ?? 1)
  const howCommon = (ev, la) => { let n = 0; for (const r of pool.rows ?? []) if (Math.abs(r[0] - ev) <= 1 && Math.abs(r[1] - la) <= 1) n++; return n }
  // a clicked spot in words: a seat in the stands, the Cove, or the field
  const seatOf = (p) => { const h0 = api.toWorld([0, 0, 0]), b = (Math.atan2(p.x - h0.x, -(p.z - h0.z)) * 180) / Math.PI, d = Math.hypot(p.x - h0.x, p.z - h0.z), wall = (api.wallAt?.(b) ?? [400, 8])[0] * 0.3048; return se.seatAt(p, p.y < h0.y - 1.5 && b > 20 ? 'SPLASH' : d < wall - 0.1 ? 'FIELD' : Math.abs(b) > 47 ? 'FOUL' : 'STANDS') }
  function shotAt(spot, seat = null, keepCam = false) {
    stopShot()
    { const hb = E('#c25hb'); hb._sc = hb._fr = null } // (red team: a render in the next 30 ms read the old chart)
    E('#c25hb').innerHTML = '<div class="lph">CALLING THE SHOT...</div>'
    setTimeout(() => {
      if (mode !== 'shot') return
      const s0 = seat ?? seatOf(spot), r = sc.call(spot, { hand: youHand(), temp: 62 }, cs0().getPropertyValue('--acc').trim(), { weight: howCommon, label: s0.what === 'field' ? null : s0.line, cloud: lab.SA })
      r.seat = s0; scRes = r; scSel = 0
      if (!keepCam) lookSeat(spot)
      pickWay(0)
    }, 30)
  }
  // the way picked flies in the preview (the readout, the side view and the arc are its)
  function pickWay(i) {
    const r = scRes
    if (!r?.ways?.length) { if (last) render(last); paintChooser(); return }
    scSel = (i + r.ways.length) % r.ways.length
    const w = r.ways[scSel]
    Object.assign(api.state, { ev: w.evx ?? w.ev, la: w.la, dir: w.dirx ?? w.dir, hand: youHand(), temp: 62, wind: 0, xwind: 0, carry: 1, dws: 0, tab: true }) /* (3 Nov: the swing solved onto the seat exactly) */
    api.setPreview(true); api.update(); paintChooser()
  }
  // PLAY IT: the three most common ways, flown one after another
  function playShot() {
    if (!scRes?.ways?.length || shotPlayS) return
    shotPlayS = { list: scRes.ways.slice(0, 3), i: 0, t: [], wait: false }
    flyWay()
  }
  function flyWay() {
    const p = shotPlayS
    if (!p || mode !== 'shot') { stopShot(); return }
    const w = p.list[p.i]; scSel = scRes.ways.indexOf(w)
    Object.assign(api.state, { ev: w.evx ?? w.ev, la: w.la, dir: w.dirx ?? w.dir, hand: youHand(), temp: 62, wind: 0, xwind: 0, carry: 1, dws: 0, tab: true }) /* (3 Nov: the swing solved onto the seat exactly) */
    api.setPreview(true); api.update(); paintChooser()
    banner(p.i === 0 ? 'THE MOST COMMON WAY' : p.i === 1 ? 'THE SECOND MOST COMMON' : 'THE THIRD MOST COMMON', `${Math.round(w.evx ?? w.ev)} MPH AT ${w.la}°`)
    p.t.push(setTimeout(() => { if (shotPlayS === p) { p.wait = true; ses.fire() } }, 700))
  }
  function stopShot() { if (shotPlayS) for (const t of shotPlayS.t) clearTimeout(t); shotPlayS = null }
  const shotName = (r) => (r.seat?.what === 'seat' ? r.seat.line : r.seat?.line ?? 'THAT SPOT')
  function paintShotBar(el) {
    const r = scRes, w = r?.ways?.[scSel]
    E('#c25nk')?.classList.toggle('dorm', !w) // (home stretch: nothing to fly until a seat has a way in)
    el.innerHTML = r && w ? `<div class="r1"><span class="bt" data-sw="-1" aria-label="previous way">&lt;</span><span class="bt" data-sw="1" aria-label="next way">&gt;</span> WAY ${scSel + 1} OF ${r.ways.length}, MOST COMMON FIRST</div><div class="r2"><b>${shotName(r)}</b>: ${Math.round(w.evx ?? w.ev)} MPH AT ${w.la}°, ${FIELD(w.dir)}</div>`
      : `<div class="r2">${r ? (r.seat?.what === 'field' ? 'THAT SPOT IS IN PLAY: PICK A SEAT' : `NO SWING GETS A BALL TO ${shotName(r)}`) : 'CLICK A SEAT IN THE PARK, OR TYPE ONE TOP LEFT'}</div>`
    el.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); stopShot(); pickWay(scSel + Number(b.dataset.sw)) }))
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', x.textContent.trim()) }
  }
  // CALL A SEAT, in the pitch panel's place (Shot Caller has no pitch): section, row and seat; Enter or FIND IT goes. Built once, so typing is never interrupted
  function paintSeatForm() {
    const zg = E('#c25zg'), pl = E('#c25pl')
    zg.innerHTML = ''; zg.style.display = 'none'
    if (pl.querySelector('.sfm')) return
    pl.innerHTML = `<div class="sfm"><div class="hd">CALL A SEAT</div>
      <label>SECTION<select id="c25ss">${se.SECTIONS.map((x) => `<option value="${x[2]}">${x[2]} · ${x[3]}</option>`).join('')}</select></label>
      <label>ROW<input id="c25sr" maxlength="2" autocomplete="off" spellcheck="false" aria-label="row"></label><label>SEAT<input id="c25st" maxlength="2" inputmode="numeric" autocomplete="off" aria-label="seat"></label>
      <span class="bt hot" id="c25sg" role="button" tabindex="0">FIND IT</span><div class="sfn" id="c25sn"></div>
      <div class="sfo">OR CLICK ANY SEAT IN THE PARK. THE BLEACHERS ARE 136 TO 144 (ROWS A, 1 TO 26), THE ARCADE 145 TO 152, THE BOXES 135 AND 101.</div></div><div class="sfx"></div>`
    E('#c25ss').value = '140'
    const go = () => { const r = se.seatPoint(E('#c25ss').value, E('#c25sr').value, E('#c25st').value); E('#c25sn').textContent = r.err ?? ''; if (r.err) { sound.play('back'); return } sound.play('pick'); shotAt(r.at, { what: 'seat', sec: r.sec, area: r.area, row: r.row, seat: r.seat, line: r.line }) }
    E('#c25sg').addEventListener('click', (e) => { pressEl(e.currentTarget); go() })
    E('#c25sg').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go() } })
    pl.querySelectorAll('input,select').forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Escape') { x.blur(); return } e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); go() } })) // Esc leaves the box and reaches the menu
  }
  // THE FRONTIER (29 Oct, later, Andrew: "a frontier of exit velo and launch angle, and the ability to sort of navigate that frontier ... on the right"): every speed (up)
  // and angle (across) tried, lit where it gets a ball to the seat, brighter the more common a ball hit like that is, the ridge through the middle of what gets there, and a
  // ball on the way picked. Drag along it, click a cell, or use the arrow keys on it (left and right step along the angles, up and down the speeds); the park flies
  // whatever is under the ball. N picks the look: N1 cells and the ridge, N2 the ridge only, N3 the cells only
  // 29 Oct, evening (Andrew: "can we make it bigger? We might as well use the whole RHS bottom ... and let's label the axes better too"): it fills the whole panel
  // (cells as wide and as tall as the room allows), with the exit velocity up the side and the launch angle along the bottom, a tick and a faint line every 4
  function frontierSVG(r, wpx, hpx) {
    // zoomed to what gets there, two steps either side (inside the grid tried)
    const G0 = r.grid, span = (k, f) => { const v = r.ways.map((w) => w[f]), st = G0[k][2]; return [Math.max(G0[k][0], Math.min(...v) - 2 * st), Math.min(G0[k][1], Math.max(...v) + 2 * st), st] }
    const G = { la: span('la', 'la'), ev: span('ev', 'ev') }, nx = (G.la[1] - G.la[0]) / G.la[2] + 1, ny = (G.ev[1] - G.ev[0]) / G.ev[2] + 1, L = 46, B = 34
    const cw = Math.max(7, Math.floor((wpx - L - 4) / nx)), ch = Math.max(7, Math.min(cw * 2, Math.floor((hpx - B - 4) / ny))), W = L + nx * cw + 2, H = ny * ch + B + 2, c = Math.min(cw, ch)
    const X = (la) => L + ((la - G.la[0]) / G.la[2]) * cw, Y = (ev) => 2 + ((G.ev[1] - ev) / G.ev[2]) * ch
    const st = optOf('N', mix.N), mx = Math.max(1, ...r.ways.map((w) => w.w)), top = r.ways[0], fs = 'style="font-size:calc(11px * var(--ts))"', fl = 'style="font-size:calc(10px * var(--ts));letter-spacing:.12em"'
    const by = new Map(r.ways.map((w, i) => [w.ev + ',' + w.la, i]))
    let g = ''
    // the ticks and faint lines: every 4 mph and every 4 degrees
    for (let ev = G.ev[0]; ev <= G.ev[1]; ev += G.ev[2]) if (ev % 4 === 0) { const y = Y(ev) + ch / 2; g += `<line x1="${L}" x2="${L + nx * cw}" y1="${y}" y2="${y}" stroke="var(--ln)" stroke-width="1"/><text x="${L - 5}" y="${y + 4}" text-anchor="end" fill="var(--dim)" ${fs}>${ev}</text>` }
    for (let la = G.la[0]; la <= G.la[1]; la += G.la[2]) if (la % 4 === 0) { const x = X(la) + cw / 2; g += `<line x1="${x}" x2="${x}" y1="2" y2="${2 + ny * ch}" stroke="var(--ln)" stroke-width="1"/><text x="${x}" y="${ny * ch + 16}" text-anchor="middle" fill="var(--dim)" ${fs}>${la}°</text>` }
    g += `<text transform="translate(11 ${2 + (ny * ch) / 2}) rotate(-90)" text-anchor="middle" fill="var(--tx)" ${fl}>EXIT VELOCITY, MPH</text><text x="${L + (nx * cw) / 2}" y="${H - 2}" text-anchor="middle" fill="var(--tx)" ${fl}>LAUNCH ANGLE, DEGREES</text>`
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const ev = G.ev[1] - j * G.ev[2], la = G.la[0] + i * G.la[2], k = by.get(ev + ',' + la), x = X(la), y = Y(ev)
      if (k != null && st.cells) g += `<rect data-k="${k}" x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" fill="var(--acc)" fill-opacity="${(0.22 + 0.78 * Math.sqrt(r.ways[k].w / mx)).toFixed(2)}"/>`
    }
    // the ridge: for each angle that gets there, the middle of its speeds, joined in angle order
    const cols = new Map()
    for (const w of r.ways) (cols.get(w.la) ?? cols.set(w.la, []).get(w.la)).push(w)
    const ridge = [...cols.entries()].sort((p, q) => p[0] - q[0]).map(([la, ws]) => [X(la) + cw / 2, Y(ws.reduce((a, w) => a + w.ev, 0) / ws.length) + ch / 2])
    if (st.ridge && ridge.length > 1) g += `<polyline points="${ridge.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--tx)" stroke-width="${st.cells ? 2 : 3}" stroke-linejoin="round"/>`
    if (st.ridge && !st.cells) for (const w of r.ways) g += `<rect data-k="${by.get(w.ev + ',' + w.la)}" x="${X(w.la) + cw / 2 - 3}" y="${Y(w.ev) + ch / 2 - 3}" width="6" height="6" fill="var(--acc)" fill-opacity="${(0.35 + 0.65 * Math.sqrt(w.w / mx)).toFixed(2)}"/>`
    // the most common one, outlined
    if (top) g += `<rect x="${X(top.la)}" y="${Y(top.ev)}" width="${cw}" height="${ch}" fill="none" stroke="var(--tx)" stroke-width="1.5" stroke-dasharray="3 2"/>`
    // the ball on the way picked, with guides out to the two axes (moved in place while dragging)
    const bs = Math.min(cw, ch) + 4
    g += `<g class="pk"><line class="gx" x1="${L}" x2="${L}" y1="0" y2="0" stroke="var(--pc)" stroke-dasharray="3 3"/><line class="gy" x1="0" x2="0" y1="${2 + ny * ch}" y2="${2 + ny * ch}" stroke="var(--pc)" stroke-dasharray="3 3"/><rect class="bl" width="${bs}" height="${bs}" fill="#f2efe6" stroke="var(--pc)" stroke-width="2.5"/></g>`
    return { svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges" tabindex="0" role="slider" aria-label="the speeds and angles that get there; drag, or use the arrow keys">${g}</svg>`, X, Y, c, cw, ch, bs, L, B, H, G, base: 2 + ny * ch }
  }
  // the readout and the ball for the way picked, in place (the panel is not rebuilt while you drag)
  function frontierPick() {
    const hb = E('#c25hb'), f = hb._fr, r = scRes, w = r?.ways?.[scSel]
    if (!f || !w || hb._sc !== r) return false
    const pk = hb.querySelector('.sfr .pk'), x = f.X(w.la) + f.cw / 2, y = f.Y(w.ev) + f.ch / 2
    if (!pk) return false
    pk.querySelector('.bl').setAttribute('x', x - f.bs / 2); pk.querySelector('.bl').setAttribute('y', y - f.bs / 2)
    const gx = pk.querySelector('.gx'); gx.setAttribute('x2', x - f.bs / 2); gx.setAttribute('y1', y); gx.setAttribute('y2', y)
    const gy = pk.querySelector('.gy'); gy.setAttribute('x1', x); gy.setAttribute('x2', x); gy.setAttribute('y2', y + f.bs / 2)
    hb.querySelector('.sfr').setAttribute('aria-valuetext', `${w.ev} mph at ${w.la} degrees`)
    const one = (n) => (n ? `1 IN ${bigN(POOL_N / n)}` : 'ALMOST NEVER')
    hb.querySelector('.sfro').innerHTML = `<b>${Math.round(w.evx ?? w.ev)}</b><span>MPH</span><b>${w.la}°</b><span>UP</span><i>${scSel === 0 ? 'THE MOST COMMON WAY · ' : ''}${one(w.w)} BALLS IN PLAY · AIMED ${FIELD(w.dir)}</i>`
    root.querySelectorAll('#c25pl .swy').forEach((x) => x.classList.toggle('on', Number(x.dataset.w) === scSel))
    return true
  }
  // moving along it: the nearest way that gets there to a point on the chart, or the next one along by angle (dx) or speed (dy)
  let frRaf = 0, frWant = null
  // a key or a press picks at once; a drag picks at most once a frame
  const frNow = (i) => { if (i == null || i === scSel) return; if (frRaf) { cancelAnimationFrame(frRaf); frRaf = 0 } stopShot(); pickWay(i) }
  const frGo = (i) => { if (i == null || i === scSel) return; frWant = i; if (frRaf) return; frRaf = requestAnimationFrame(() => { frRaf = 0; stopShot(); pickWay(frWant) }) }
  function frontierWire(hb) {
    const svg = hb.querySelector('.sfr'), f = hb._fr, r = scRes
    const at = (e) => { const b = svg.getBoundingClientRect(), k = b.width / svg.viewBox.baseVal.width, la = f.G.la[0] + ((e.clientX - b.left) / k - f.L - f.cw / 2) / f.cw * f.G.la[2], ev = f.G.ev[1] - ((e.clientY - b.top) / k - 2 - f.ch / 2) / f.ch * f.G.ev[2]; let best = null, bd = 1e9; r.ways.forEach((w, i) => { const d = ((w.la - la) / f.G.la[2]) ** 2 + ((w.ev - ev) / f.G.ev[2]) ** 2; if (d < bd) { bd = d; best = i } }); return best }
    let drag = false
    svg.addEventListener('pointerdown', (e) => { drag = true; svg.setPointerCapture?.(e.pointerId); svg.focus({ preventScroll: true }); sound.play('move'); frNow(at(e)) })
    svg.addEventListener('pointermove', (e) => { if (drag) frGo(at(e)) })
    const up = () => { drag = false }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up)
    svg.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
      if (!d) return
      e.preventDefault(); e.stopPropagation()
      const w = r.ways[scSel]
      let best = null, bd = 1e9
      r.ways.forEach((q, i) => {
        if (d[0] && Math.sign(q.la - w.la) !== d[0]) return
        if (d[1] && (q.la !== w.la || Math.sign(q.ev - w.ev) !== d[1])) return
        const s = d[0] ? Math.abs(q.la - w.la) * 100 + Math.abs(q.ev - w.ev) : Math.abs(q.ev - w.ev)
        if (s < bd) { bd = s; best = i }
      })
      if (best != null) { sound.play('move'); frNow(best) }
    })
  }
  // 2 Nov, night (Andrew: "What I want is the LHS to show the range of values that COULD make up that HR"): every exit speed, launch angle and aim that gets a ball to
  // the seat, as a bar across the whole range Shot Caller tries: lit from the lowest to the highest that gets there, brightest at the most common, a tick at the one picked
  function rangesHTML(r, sel) {
    const W = r.ways, bar = (lab, k, lo, hi, st, fmt, unit) => {
      const v = W.map((w) => w[k]), a = Math.min(...v), b = Math.max(...v), top = W[0][k], N = Math.round((hi - lo) / st) + 1, by = new Map()
      for (const w of W) { const i = Math.round((Math.min(hi, Math.max(lo, w[k])) - lo) / st); by.set(i, (by.get(i) ?? 0) + w.w) }
      const mx = Math.max(1, ...by.values()), cells = Array.from({ length: N }, (_, i) => { const n = by.get(i) ?? 0; return `<i style="opacity:${n ? (0.25 + 0.75 * Math.sqrt(n / mx)).toFixed(2) : 0.08}"></i>` }).join('')
      const at = (x) => ((Math.min(hi, Math.max(lo, x)) - lo) / (hi - lo)) * 100
      return `<div class="rg"><span><i>${lab}</i> ${fmt(a) === fmt(b) ? fmt(a) : fmt(a) + ' TO ' + fmt(b)}${unit}</span><div class="rgb">${cells}<u style="left:${at(sel[k]).toFixed(1)}%"></u></div></div>`
    }
    const dirs = W.map((w) => w.dir), d0 = Math.floor(Math.min(...dirs)) - 2, d1 = Math.ceil(Math.max(...dirs)) + 2
    return `<div class="lph rgh">WHAT GETS A BALL THERE · THE TICK IS THE WAY PICKED</div><div class="rgs">${bar('EXIT SPEED', 'ev', GRID.ev[0], GRID.ev[1], GRID.ev[2], (x) => Math.round(x), ' MPH')}${bar('LAUNCH ANGLE', 'la', GRID.la[0], GRID.la[1], GRID.la[2], (x) => Math.round(x), '°')}${bar('AIM', 'dir', d0, d1, 1, (x) => FIELD(x), '')}</div>`
  }
  // I'M REALLY THERE (2 Nov, night, Andrew: "an 'I'm really there' or something like that for the shot caller that goes straight into wallop witness if you enter your
  // seat"): the seat becomes yours (MY SEAT keeps it too), and WALLOP WITNESS opens on YOUR GAMES with it filled in for the game open now, if there is one
  function reallyThere(st) {
    if (!st || st.what !== 'seat') return
    const seat = { sec: st.sec, row: st.row, seat: st.seat }
    store('nn-myseat25', JSON.stringify(seat)); myKey = ''
    wPrefill = seat; wTab = 'mine'; wPicked = true
    const k = (wData?.me?.days ? openKeys(G, wNow()).find((x) => !wData.me.days.includes(x)) : openKeys(G, wNow())[0]) ?? null
    wAsk = k; wMsg = k ? '' : `NO GAME IS OPEN RIGHT NOW. SEC ${seat.sec} ROW ${seat.row} SEAT ${seat.seat} FILLS IN WHEN YOU LOG THE NEXT ONE`
    openMod('witness'); paintTabs()
  }
  function paintShot() {
    const el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ S H O T &nbsp; C A L L E R /', 'shot')
    if (!scRes) { hb._sc = null; hb.innerHTML = '<div class="sel"><div class="lph">PICK A SEAT: CLICK ONE IN THE PARK, OR TYPE ONE TOP LEFT.</div><div class="lph">SHOT CALLER FINDS EVERY SWING THAT PUTS A BALL THERE, MOST COMMON FIRST, AND THE REAL HOME RUNS THAT CAME DOWN CLOSEST. NUKE IT FLIES THE THREE MOST COMMON.</div></div>'; return }
    const r = scRes
    if (hb._sc === r && hb._n === mix.N && frontierPick()) return
    const sel = r.ways[scSel], one = (n) => (n ? `1 IN ${bigN(POOL_N / n)}` : 'ALMOST NEVER')
    // the right side is the frontier: the seat in one line over it, the way picked under it; the list of ways and the closest real home runs sit under the seat form
    const where = r.seat?.what === 'seat' ? `SEC ${r.seat.sec} · ROW ${r.seat.row} · SEAT ${r.seat.seat}` : (r.seat?.line ?? 'THAT SPOT')
    const there = r.seat?.what === 'seat' ? '<span class="bt hot" id="c25rt" role="button" tabindex="0" title="LOG A GAME FROM THIS SEAT IN WALLOP WITNESS">I\'M REALLY THERE</span>' : ''
    const head = `<div class="sfhd">${there}<b>${where}</b><span>THE SEAT: ${Math.round(r.spot.ft)} FT FROM HOME, ${FIELD(r.spot.bearing)}, ${Math.max(0, Math.round(r.spot.height))} FT UP · ${r.ways.length} WAY${r.ways.length === 1 ? '' : 'S'} IN, BRIGHTER IS MORE COMMON</span></div>`
    hb._sc = null
    const side = E('#c25pl .sfx')
    if (!r.ways.length) { hb.innerHTML = `<div class="sel">${head}<div class="lph">NO SWING FROM ${GRID.ev[0]} TO ${GRID.ev[1]} MPH AND ${GRID.la[0]}° TO ${GRID.la[1]}° COMES DOWN THERE.</div></div>`; if (side) side.innerHTML = ''; return }
    hb.innerHTML = `<div class="sel sfp">${head}<div class="sfw"></div><div class="sfro"></div></div>`
    // the chart takes the panel's width and every bit of height the line over it and the readout under it leave
    // (measured against the panel itself: the box the content sits in is only as tall as the content)
    const box = hb.querySelector('.sfw'), pr = E('.c25>.hists').getBoundingClientRect(), room = pr.bottom - box.getBoundingClientRect().top - 66
    const f = frontierSVG(r, hb.clientWidth - 2, Math.max(150, room))
    box.innerHTML = f.svg; box.firstElementChild.classList.add('sfr')
    hb._fr = f; hb._sc = r; hb._n = mix.N
    if (side) {
      side.innerHTML = rangesHTML(r, sel) + '<div class="lph">THE MOST COMMON WAYS IN. DRAG ALONG THE CHART ON THE RIGHT, CLICK A SQUARE, OR USE THE ARROW KEYS ON IT.</div>' + r.ways.slice(0, 4).map((w, i) => `<div class="swy${w === sel ? ' on' : ''}" data-w="${i}" role="button"><b>${i + 1}</b><span>${Math.round(w.evx ?? w.ev)} MPH AT ${w.la}°, ${FIELD(w.dir)}</span><i>${one(w.w)}</i></div>`).join('') +
        '<div class="lph cl" style="margin-top:6px">CLOSEST REAL ORACLE HOME RUNS</div>' + r.near.slice(0, 3).map((n, i) => { const nm = pname(n.b.b); return `<div class="lpr2 go" data-near="${i}" role="button" tabindex="0" title="PLAY IT IN ${NAMES.replay}"><span>${(nm ? nm[0] : 'BATTER ' + n.b.b).toUpperCase()} ${n.b.d}</span><b>${Math.round(n.d / 0.3048)} FT AWAY</b></div>` }).join('')
      side.querySelectorAll('.swy').forEach((x) => x.addEventListener('click', () => { sound.play('move'); stopShot(); pickWay(Number(x.dataset.w)) }))
      // (1 Nov, later; an audit) a real home run near your seat plays in DEJA-VU, as the ones in MY SEAT do
      side.querySelectorAll('[data-near]').forEach((row) => { const go = () => { const b = r.near[Number(row.dataset.near)]?.b; if (!b) return; sound.play('pick'); stopShot(); setMode('replay'); filter = 'all'; balls = filtered(); const i = balls.indexOf(b); if (i >= 0) { idx = i; applyBall(b); paintChooser(); play() } }; row.addEventListener('click', go); row.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go() } }) })
      // a short panel drops the real home runs first, then the ways from the bottom
      const pl = E('#c25pl'), over = () => pl.scrollHeight > pl.clientHeight + 1
      const drop = (q) => { for (const x of [...side.querySelectorAll(q)].reverse()) { if (!over()) return; x.remove() } }
      drop('.lpr2'); if (over()) side.querySelector('.lph.cl')?.remove(); drop('.swy'); if (over()) side.querySelector('.lph:not(.rgh)')?.remove(); if (over()) side.querySelector('.rgh')?.remove()
    }
    frontierWire(hb); frontierPick()
    const rt = hb.querySelector('#c25rt'), goThere = (e) => { pressEl(rt); sound.play('pick'); stopShot(); reallyThere(r.seat) }
    rt?.addEventListener('click', goThere); rt?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); goThere(e) } })
  }
  // ODDS RECEIPT (a mockup to judge): the what-if model's odds built up one input at a time, from an ordinary fly ball at this park to this one. Each line is
  // how many points that input moved the odds, given the ones above it (so the order matters and the lines add up exactly).
  function paintReceipt(res) {
    const el = E('#c25hi'), hb = E('#c25hb'), s = api.state
    wordTitle(el, '/ O D D S &nbsp; R E C E I P T /', 'receipt')
    if (!wim) { hb.innerHTML = '<div class="lph">THE WHAT-IF MODEL IS NOT BUILT ON THIS MACHINE.</div>'; return }
    const bear = res.landB ?? s.dir, w0 = api.wallAt?.(0) ?? [399, 8], w = api.wallAt?.(bear) ?? w0
    const x = { ev: 95, la: 30, bear: 0, hand: s.hand, temp: 62, elev: elevAt(), fence: w0[0], wallh: w0[1] }
    const lines = [], p0 = wiP(x)
    let p = p0
    const add = (lab, val, patch) => { Object.assign(x, patch); const q = wiP(x); lines.push([lab, val, q - p]); p = q }
    add('EXIT SPEED', `${Math.round(s.ev)} MPH`, { ev: s.ev })
    add('LAUNCH ANGLE', `${Math.round(s.la)}°`, { la: s.la })
    add('DIRECTION AND THE WALL THERE', `${Math.round(w[0])} FT, ${Math.round(w[1])} HIGH`, { bear, fence: w[0], wallh: w[1] })
    add('AIR', `${Math.round(s.temp)}°`, { temp: s.temp })
    const o = odds(), pts = (d) => `${d >= 0 ? '+' : '-'}${Math.abs(d * 100).toFixed(0)}`
    hb.innerHTML = `<div class="rc"><div class="rh">FROM AN ORDINARY FLY BALL HERE (95 MPH, 30°, TO CENTER, 62°) TO THIS ONE, ONE INPUT AT A TIME</div>
      <div class="rr"><span>ORDINARY FLY BALL</span><i></i><b>${pct(p0)}%</b></div>` +
      lines.map(([l, v, d]) => `<div class="rr"><span>${l}</span><i>${v}</i><b class="${d >= 0.005 ? 'up' : d <= -0.005 ? 'dn' : ''}">${pts(d)}</b></div>`).join('') +
      `<div class="cut"></div><div class="rr tot"><span>WHAT-IF MODEL</span><i></i><b>${pct(p)}%</b></div>` +
      (o.src === 'MODEL' ? `<div class="rr"><span>THE FULL MODEL (PITCH, SWING, GAME)</span><i></i><b>${pct(o.p)}%</b></div>` : '') +
      '<div class="rh" style="margin-top:6px">POINTS OF HOME-RUN ODDS. A MOCKUP: THE ORDER OF THE LINES CHANGES HOW THE POINTS SPLIT.</div></div>'
  }
  // the histograms: all 30 parks or Oracle only; bars count balls, the line is the share that went out (its peak labeled), the rate at this ball's own bin in the label
  let hw = store('nn-hw25') === 'sf' && atOracle ? 'sf' : 'mlb', DO = null
  const paintHw = () => root.querySelectorAll('#c25hw .bt').forEach((b) => b.classList.toggle('on', b.dataset.w === hw))
  root.querySelectorAll('#c25hw .bt').forEach((b) => b.addEventListener('click', async () => {
    pressEl(b); sound.play('move'); hw = b.dataset.w; store('nn-hw25', hw); paintHw()
    if (hw === 'sf' && !DO) { try { const r = await fetch('/dists_oracle.json'); DO = r.ok ? await r.json() : { metrics: {} } } catch { DO = { metrics: {} } } }
    if (last) render(last)
  }))
  paintHw()
  if (hw === 'sf') { try { const r = await fetch('/dists_oracle.json'); DO = r.ok ? await r.json() : null } catch { DO = null } }
  function paintHists(res) {
    const ht = E('#c25hi').querySelector('.t'), hh0 = titleHTML('hists'); if (ht.dataset.h !== hh0) { ht.innerHTML = hh0; ht.dataset.h = hh0 } ht.classList.toggle('ic', !!mix.I)
    const s = api.state, el = E('#c25hi'), hb = E('#c25hb'), fly = s.la >= 15, oracle = hw === 'sf' && DO?.metrics?.ev, DD = oracle ? DO : D
    const W = el.clientWidth - 28, Hh = el.clientHeight - 30, wide = W > 2.3 * Hh, cols = wide ? 3 : 1
    const ts = parseFloat(getComputedStyle(grid).getPropertyValue('--ts')) || 1
    const w = Math.max(140, Math.floor((W - (cols - 1) * 18) / cols))
    const H = [['ev', 'EXIT SPEED', s.ev, `${Math.round(s.ev)} MPH`, ['FASTER', 'SLOWER'], ' MPH', (x) => String(Math.round(x))], ['la', 'LAUNCH ANGLE', s.la, `${Math.round(s.la)}°`, ['HIGHER', 'LOWER'], '°', (x) => String(Math.round(x))], [fly ? 'dist_fb' : 'dist', fly ? 'FLY BALL DISTANCE' : 'DISTANCE', res.landFt, `${Math.round(res.landFt)} FT`, ['FARTHER', 'SHORTER'], ' FT', (x) => String(Math.round(x))]]
    const n = (DD.n ?? 0).toLocaleString()
    const like = mode !== 'replay' || !cur ? (() => { const l = ballsLike(pool, s.ev, s.la, s.dir); return l.n ? `<div class="like">${l.n} REAL BALLS LIKE THIS: <b>${Math.round(l.hr * 100)}%</b> WERE HOME RUNS, ${l.lo} TO ${l.hi} FT, MEDIAN ${l.med}</div>` : '' })() : ''
    const key = `<div class="key"><i class="kb"></i>BALLS <i class="kl"></i>SHARE OF THEM THAT WENT OUT <i class="kd"></i>AVERAGE <i class="ka"></i>THIS BALL</div><div class="key">${n} BALLS IN PLAY ${oracle ? 'AT ORACLE' : 'IN ALL 30 PARKS'}, 2023-25.</div>`
    const draw = (hh) => `<div class="hg" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">` + H.map(([k, l, v, txt, words, unit, fmt]) => {
      const h = hist25(DD, k, v, { w, h: hh, minN: oracle ? 20 : 40, unit, fmt })
      const rank = h.pct != null ? (h.pct >= 50 ? `TOP ${Math.max(1, 100 - h.pct)}%` : `BOTTOM ${Math.max(1, h.pct)}%`) : ''
      return `<div class="h"><div class="lb"><span>${l} <b>${txt}</b><i class="rk"> · ${rank}</i></span><span><em>${h.here == null ? '--' : Math.round(h.here * 100) + '%'}</em> WENT OUT</span></div>${h.svg}</div>`
    }).join('') + '</div>' + like + key
    // the tallest histograms that still leave room for the labels and the key
    let hh = Math.max(30, Math.min(90, Math.floor((Hh - (cols === 1 ? 3 : 1) * (18 * ts + 6) - 60 * ts) / (cols === 1 ? 3 : 1)) - 4))
    const over = () => hb.scrollHeight > hb.clientHeight + 1
    const tidy = () => { for (const lb of hb.querySelectorAll('.lb')) if (lb.scrollWidth > lb.clientWidth + 1) lb.querySelector('.rk')?.remove(); for (const sel of ['.key + .key', '.like', '.key']) if (over()) hb.querySelector(sel)?.remove() }
    hb.innerHTML = draw(hh)
    for (let k = 0; k < 10 && over() && hh > 22; k++) { hh = Math.max(22, hh - 8); hb.innerHTML = draw(hh) }
    tidy()
  }
  // STAR MAP: every ball in the current filter flown at once over the park; this batter's in the accent color
  let stars = null, smKey = '', smRes = null
  function paintStars() {
    const el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ S T A R &nbsp; M A P /', 'stars')
    stars ??= constellation(api, () => { const cs = getComputedStyle(root); return { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim() } })
    const list = mode === 'replay' ? balls : R.balls.filter((b) => b.g && b.hr), who = cur?.b ?? stepped?.b.b ?? null, key = [mode, filter, list.length, who].join()
    const mine = list.filter((b) => b.b === who), nm = who ? pname(who) : null
    const longest = list.reduce((a, b) => (b.ft > (a?.ft ?? 0) ? b : a), null), ln = longest ? pname(longest.b) : null
    const word = { giants: 'GIANTS HOME RUNS', oracle: 'ORACLE HOME RUNS', menu: 'OFF THE MENU HOME RUNS', all: 'BALLS' }[mode === 'replay' ? filter : 'giants']
    const body = (st) => `<div class="sel"><div class="lph">${list.length.toLocaleString()} ${word} FLOWN AT ONCE${st ? ' · ' + st : ''}</div>` + (nm ? `<div class="lpr2"><span>IN ORANGE: ${nm[0].toUpperCase()}</span><b>${mine.length}</b></div>` : '') + (longest ? `<div class="lpr2"><span>LONGEST: ${(ln ? ln[0] : 'BATTER ' + longest.b).toUpperCase()}</span><b>${longest.ft} FT</b></div>` : '') + '<div class="lph" style="margin-top:6px">DRAG THE PARK TO TURN IT. BIRD\'S EYE (B) SHOWS THE SPRAY.</div></div>'
    if (key !== smKey) { smKey = key; smRes = null; hb.innerHTML = body('DRAWING...'); stars.show(list, (b) => b.b === who, (n, N) => { if (show === 'sm' && smKey === key) { const l = hb.querySelector('.lph'); if (l) l.textContent = `${n.toLocaleString()} OF ${N.toLocaleString()} DRAWN` } }).then((r) => { if (r && smKey === key) { smRes = r; if (show === 'sm') hb.innerHTML = body('') } }) }
    else if (smRes) hb.innerHTML = body('')
  }
  function paintPanel(res) {
    E('#c25hw').style.display = show === 'hist' && mode !== 'shot' ? '' : 'none'
    if (mode === 'shot') { paintShot(); return }
    if (show === 'sm') { paintStars(); return }
    if (moving() && (show === 'hist' || show === 'lp')) return // (the histograms and the party catch up when the numbers stop)
    if (show === 'hm') { if (!moving() || !E('#c25hb .hm')) paintHeat(); return } // (3 Nov: the heat map is worked out again when the numbers stop, not on every step of a drag)
    if (show === 'lp') paintLanding(res); else if (show === 'se') paintSeance(res); else if (show === 'my') paintMySeat(); else if (show === 'reel') paintGagReel(); else if (show === 'rc') paintReceipt(res); else paintHists(res)
  }
  // THE FUN LINE (28 Oct, night, Andrew: bring back the distance and speed similes). 29 Oct, evening (Andrew: "the thing keeps cycling through different speed and
  // distance stats - I only want one for distance and one for speed every time I press swing"): two lines under GONE IN that stay put, the distance against the
  // 6,000-thing comparison library and the exit speed against it (San Francisco and weird things first, never "about"), picked fresh for each swing.
  let fun = { key: '', list: [] }
  const bigN = (x) => Math.round(x).toLocaleString('en-US')
  function funList(res) {
    const s = api.state, ft = Math.round(res.landFt), seed = ft * 131 + Math.round(s.ev * 10), out = []
    if (lib) {
      const rnd = mulberry32(seed), seen = []
      // keep the plain ones: no "1/2,000 the length of" a river nobody knows; San Francisco and weird things first, or something famous
      const good = (p) => p && !/^1\//.test(p.phrase) && (p.rec.theme !== 'general' || p.rec.fame >= 40)
      const take = (kind, amt) => { for (let k = 0; k < 8; k++) { const p = pick(lib, kind, amt, rnd, seen); if (good(p)) { seen.push(p.rec.cat, p.rec.name); return p } } return null }
      const p = take('length', ft * 0.3048); if (p) out.push(`${ft} FT: ${p.phrase}`)
      const sp = take('speed', s.ev * 0.44704); if (sp) out.push(`${Math.round(s.ev)} MPH OFF THE BAT: ${sp.phrase}`)
    }
    return out.map((x) => x.toUpperCase())
  }
  function showFun() {
    const el = E('#c25rd .fun')
    if (!el) return
    el.innerHTML = fun.list.map((x) => `<span>${x}</span>`).join(''); el.classList.remove('typed'); void el.offsetWidth; el.classList.add('typed')
  }
  function goneReady() { if (last) paintHead(last); if (modal === 'parks') paintModal() } // the 30-park band is in: repaint its line, never the whole engine (that cancelled a swing in the air)
  // the headline: distance big, the twenty-step odds meter under it (V3, his pick); the distance can roll up during a swing
  function paintHead(res) {
    E('#c25rd').classList.toggle('pick', mode === 'shot' && !scRes); E('#c25v').classList.toggle('pick', mode === 'shot' && !scRes); { const fl = flight?.last(); if (fl) fl.visible = !(mode === 'shot' && !scRes) && show !== 'hm' } // (and no old flight in the park)
    const o = odds(), rd = E('#c25rd'), d = Math.round(res.landFt), pv = !!ses.beat?.preview
    if (!rd.dataset.v) { rd.dataset.v = '4'; rd.innerHTML = `<span class="vd"><b class="vh"></b><i class="vs"></i></span><span class="big num"><span id="c25d">0</span><i> FT</i></span><span class="sub sx"></span><div class="meter">${'<s></s>'.repeat(20)}<em class="num"><span class="op"></span>%</em></div><span class="lbl osrc"></span><div class="gn" role="button" title="every park"></div><div class="fun"></div><span class="sub sit"></span>`; rd.querySelector('.gn').addEventListener('click', () => { pressEl(rd.querySelector('.gn')); openMod('parks') }) }
    const set = (sel, html) => rd.querySelectorAll(sel).forEach((e) => { if (e.innerHTML !== html) e.innerHTML = html })
    set('.sx', `APEX ${Math.round(res.peakFt)} FT &nbsp; HANG ${res.hang.toFixed(1)} S${res.verdict.wallFt ? ` &nbsp; WALL ${Math.round(res.verdict.wallFt)} FT, ${res.verdict.wallH.toFixed(0)} HIGH` : ''}`)
    if (!moving() || !rd.querySelector('.gn')?.textContent) set('.gn', parks.parks.length ? goneLine(U.goneWord(parks, api, evalParks(parks, api), goneReady)) : '') // (30 parks: when the numbers stop)
    set('.op', pct(o.p))
    { const k = [d, Math.round(api.state.ev), Math.round(api.state.la), lib ? 1 : 0].join(); if (k !== fun.key) { fun = { key: k, list: funList(res) }; showFun() } }
    set('.sit', mix.S === 2 && mode === 'replay' && cur && !edited ? situation(cur)?.line ?? '' : '')
    set('.osrc', o.p != null ? `SIMILAR HITS: ${pct(o.p)}% GO OUT · ${o.src}` : 'SIMILAR HITS · ' + o.src)
    rd.querySelectorAll('.meter s').forEach((s, i) => s.classList.toggle('on', o.p != null && o.p * 20 > i + 0.5))
    const dEl = E('#c25d')
    if (window.__cpFire || pv || !ses.beat) dEl.textContent = d
    dEl.dataset.v = d
    return o
  }
  // GONE IN N PARKS, said plainly when the spread is the whole league (1 Nov, night; playtest: "GONE IN 0 TO 30" says nothing)
  const goneLine = (w) => { const m = /^(\d+) TO (\d+) OF (\d+)$/.exec(w); if (m && Number(m[2]) - Number(m[1]) >= Number(m[3]) * 0.6) return "A COIN FLIP IN MOST PARKS"; if (m) return `GONE IN ${m[1]} TO ${m[2]} PARKS`; const a = /^(\d+) OF (\d+)$/.exec(w); if (a && a[1] === a[2]) return `GONE IN ALL ${a[2]} PARKS`; return `GONE IN ${w} PARKS` } // (home stretch: "14 TO 30 OF 30" read as three numbers)
  // (2 Nov, home stretch; Andrew: "let's go plain home run - everything else can be handled in visual flair not text flair") the chip says what happened in baseball
  // words: no IT... IS... beats while it flies, no quips when it lands. A splash hit keeps its name (the Cove counts them).
  const PLAIN = { GONE: 'HOME RUN', NUKE: 'HOME RUN', SCRAPER: 'HOME RUN', SPLASH: 'SPLASH HIT', CLOSE: 'OFF THE WALL', POLE: 'FOUL BALL' }
  const plainHead = (b) => (!b.last ? '. . .' : PLAIN[b.key] ?? b.state)
  function render(res) {
    if (!burst) { settled = snap(); settledT = performance.now() }
    last = res
    stage?.sync({ ball: cur, mode })
    if (ctl3d) { ctl3d.visible = mode === 'whatif' && show !== 'hm'; ctl3d.sync(api.state) }
    if (windFx) { const k = mode === 'whatif' ? `${api.state.wind},${api.state.xwind ?? 0}` : 'tonight'; if (k !== windKey) { windKey = k; if (mode === 'whatif') windFx.setField({ wind: api.state.wind, xwind: api.state.xwind ?? 0 }); else tonightWind() } } // the socks show the dojo's wind, or tonight's
    paintHead(res)
    paintPanel(res)
    paintBatter(); paintSide(); paintPitch(); paintSlots(); paintTally(); paintVerdict(false); paintBug(); if (['parks', 'moon', 'before'].includes(modal)) paintModal() // (red team: the data modals were rebuilt on every beat, eating clicks)
  }
  // the bug shows for a real ball as it happened, and in the dojo for a home run brought over with TWEAK THE TATER (its game); a fresh dojo swing has no game
  function paintBug() {
    const b = mode === 'replay' ? (cur && !edited ? cur : null) : stepped?.b ?? null, h = b ? bugHTML(b) : ''
    for (const el of [E('#c25bug'), E('#c25bugc')]) { if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h } el.classList.toggle('on', !!h) }
    // S1 hangs under the verdict chip in the top-right corner: clear of the chooser, and above where flights to right field and the Cove come down
    const chip = E('#c25v'), top = chip.offsetTop + chip.offsetHeight + 8 + 'px'
    if (E('#c25bug').style.top !== top) E('#c25bug').style.top = top
  }
  function paintTally() {
    E('#c25t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-2).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const chip = E('#c25v'), b = ses.beat, v = last?.verdict
    const committed = b && !b.preview
    chip.classList.toggle('hr', committed ? isHR(b) : v?.kind === 'GONE')
    chip.classList.toggle('done', !!committed) // (home stretch: a home run that has flown is GEIGER, "confirmed gone"; the preview stays orange)
    const live = v ? (v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL BALL' : 'IN PLAY') : ''
    const realSub = mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL' : cur.hr ? 'THE REAL BALL: HOME RUN' : 'THE REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : 'A PREVIEW: NUKE IT TO FLY IT'
    chip.querySelector('.hd').textContent = committed ? plainHead(b) : live
    chip.querySelector('.sb').textContent = committed ? (b.sub ?? '') : realSub
    // (2 Nov, later; playtest: an away home run replayed at Oracle said IN PLAY under a GRAND SLAM stamp) a real ball from another park that stays in here keeps its
    // stamp, but the stamp says where it was one, and the line under it says this park keeps it
    const away = mode === 'replay' && cur && !edited && cur.hr && cur.park && cur.park !== (here?.abbr ?? 'SF'), staysHere = away && (committed ? !isHR(b) : v && v.kind !== 'GONE')
    const there = away ? (parks.parks.find((p) => p.abbr === cur.park)?.name ?? cur.park).toUpperCase() : ''
    if (staysHere) chip.querySelector('.sb').textContent = `HERE IT STAYS IN. THE REAL ONE WENT OUT AT ${there}`
    let stp = mode === 'replay' && cur && !edited ? situation(cur)?.stamp : null
    if (stp && staysHere) stp = `${stp} AT ${cur.park}`
    const se = chip.querySelector('.st')
    if (se.textContent !== (stp ?? '')) { se.textContent = stp ?? ''; if (stp) restamp(se) }
    se.style.display = stp ? '' : 'none'
    if (stampIt) restamp(chip.querySelector('.hd'))
    // 3 Nov (Andrew: "multiple times we're telling people how far it went (top left, top right, far right, voxel) - let's have the outcome be on the top left, and then
    // the top right is just game situation, and the full right is just the stats"): the verdict and its line sit over the distance in the readout (the line says how
    // much it beat the wall by, not the feet again); the top-right chip shows only the stamp (GRAND SLAM, WALK-OFF ...), over the game's bug
    const vd = E('#c25rd .vd')
    if (vd) {
      vd.classList.toggle('hr', chip.classList.contains('hr')); vd.classList.toggle('done', chip.classList.contains('done'))
      const vh = vd.querySelector('.vh'), vs = vd.querySelector('.vs'), head = chip.querySelector('.hd').textContent
      const beat = committed && v ? (v.kind === 'GONE' ? `${Math.round(v.clearBy ?? 0)} FT OVER THE WALL` : v.kind === 'WALL' ? `SHORT OF THE TOP BY ${Math.round(v.short ?? 0)} FT` : '') : ''
      const line = staysHere ? chip.querySelector('.sb').textContent : committed ? beat : realSub
      if (vh.textContent !== head) vh.textContent = head
      if (vs.textContent !== line) vs.textContent = line
      if (stampIt) restamp(vh)
    }
    chip.classList.toggle('has', !!stp)
  }

  // ---- effects and sound: hit-stop, contact spark and flash, trail, fireworks on a home run, the Cove splash and its kayaks, Karl's fog ----
  // (1 Nov, later; an audit) the board and the effects ask for these a dozen times a second; two style reads each time, so they keep for a quarter second
  let colC = null, colAt = 0
  const colors = () => { const now = performance.now(); if (colC && now - colAt < 250) return colC; colAt = now; const cs = getComputedStyle(root), gs = getComputedStyle(grid); return colC = { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim(), pc: gs.getPropertyValue('--pc').trim(), mk: gs.getPropertyValue('--mk').trim(), sc: gs.getPropertyValue('--sc').trim(), nk: gs.getPropertyValue('--nk').trim() } }
  let splashes = Number(store('nn-splash25') ?? 0) || 0
  let bannerT = 0
  const banner = (big, small) => { sound.play('banner'); const b = E('#c25bn'); b.innerHTML = `${big}${small ? `<i>${small}</i>` : ''}`; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('go'), 2600) } // the class comes off on a timer too: reduced motion drops the fade that used to hide it
  fx = initFx25(api, colors, { sound: (k, a) => sound.play(k, a), cove: atOracle, onCatch: () => { pendingSplash = false } })
  let pendingSplash = false
  life = atOracle ? initPark25(api, colors, { still: reduced, gullFace: mix.W, signStyle: mix.Q, boardStyle: mix.G }) : null
  if (life) for (const b of [life.board, life.vboard, life.vsign]) if (b) keepReadable(api, b, 1, 1, 1, { fixed: true, scale: false, prio: 9 }) // the 3D tags keep off the scoreboard and the sign (30 Oct)
  if (atOracle) coke = await initCoke25(api, { style: mix.C, still: reduced }).catch((e) => { console.warn('Coke corner', e); return null }) // (red team: a bad file used to stop everything after it)
  coke?.setLook?.(lab.CB)
  // the glove catches a bit of Karl now and then while the fog is in (1 Nov, later: GPT red team II C4, his pick)
  if (coke && !reduced) setInterval(() => { if (fx?.karlOn?.() && !coke.grabbing() && !(window.__cp.anim?.() && !window.__cp.anim().exploded) && Math.random() < 0.5) coke.fogGrab() }, 40000)
  const diamond = initDiamond25(api) // the infield in voxels: dirt, grass, chalk, the raised mound, the bases and the plate (29 Oct, later; all voxel 30 Oct). Before the cut, which uses it
  // the model's own sign, clock and arch and its own bottle and glove are cut out of it (29 Oct, evening, Andrew: "you can still see the old oracle park lettering
  // and clock behind the new voxel ones - let's delete those"; "kill the wireframe beneath both the coke bottle and mitt"); the voxel ones stand in their place.
  // The sign: 35.4 to 49.5 m up, 144 to 154 m out, within 8.5 degrees of center (the light towers stand at 9 to 11)
  if (atOracle) {
    const h0 = api.toWorld([0, 0, 0]), sign = (x, y, z) => { const dx = x - h0.x, dz = z - h0.z, d = Math.hypot(dx, dz); const b = Math.abs(Math.atan2(dx, -dz)); return (y > 35.4 && y < 49.5 && d > 144 && d < 154 && b < 0.148) || (y > 12.4 && y <= 35.4 && d > 146 && d < 153 && b < 0.159) } // the sign, then the board (to 9.1 degrees)
    const cut = () => { cutN = window.__nn.cutStadium?.((x, y, z) => sign(x, y, z) || !!coke?.under(x, y, z) || !!diamond?.under(x, y, z)) ?? 0; if (mix.V > 1) setStands(mix.V) } // and the model's infield (30 Oct, IF2: all voxel, diamond25.js)
    if (window.__nn.stadium) cut(); else addEventListener('nn-stadium', cut, { once: true })
  }
  water = atOracle ? initWater25(api, { mode: mix.B, ground: cs0().getPropertyValue('--k').trim(), ink: cs0().getPropertyValue('--tx').trim() }) : null
  pitchCam = initPitchArc(api, colors)
  flight = initFlight25(api, colors); flight.setStyle(mix.U); flight.setFill(lab.LF)
  ghost = initGhost25(api, { still: reduced }) // SEAT SEANCE's ghost
  // the dojo's controls in the park (30 Oct: LA1 protractor, DR1 spray fan, EV1 slingshot, the wind rose); they set the same numbers as the typed boxes and sliders
  const shadow = initShadow25(api)
  // LANDING PARTY's pins in the park answer the pointer like the list does (1 Nov, later: "still think this interface needs help"): point at a pin for its flight,
  // and its row lights; click it to take it into TWEAK THE TATER
  { const cv = api.NN.renderer?.domElement; let hov = null
    cv?.addEventListener('pointermove', (e) => { if (show !== 'lp' || e.buttons) { if (hov) { hov = null; cv.style.cursor = '' } return } const k = lp.pick(e.clientX, e.clientY); if (k === hov) return; hov = k; lp.focus(k); document.querySelectorAll('#c25hb .lpr').forEach((r) => r.classList.toggle('pt', Number(r.dataset.n) === k)); cv.style.cursor = k ? 'pointer' : '' })
    // (1 Nov, later; an audit) the park says what a click does: a crosshair in SHOT CALLER (pick a seat), a hand over the scoreboard (the next gag) in DEJA-VU (not in
    // the dojo, where the 3D controls own the cursor); a few times a second
    let curAt = 0
    cv?.addEventListener('pointermove', (e) => { if (e.buttons || hov || performance.now() - curAt < 90) return; curAt = performance.now(); const want = mode === 'shot' ? 'crosshair' : atOracle && life && mode === 'replay' && boardHit(e) ? 'pointer' : ''; if (cv.style.cursor !== want && (want || cv.style.cursor === 'crosshair' || cv.style.cursor === 'pointer')) cv.style.cursor = want })
    cv?.addEventListener('click', (e) => { if (show !== 'lp') return; const k = lp.pick(e.clientX, e.clientY), x = k && lpList?.[k - 1]; if (x) { e.stopImmediatePropagation(); tweakBall(x.b) } }, true)
  }
  { const cs = cs0(); ctl3d = initControls25(api, { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim(), seam: () => optOf('Y', mix.Y).col, home: () => (mode === 'whatif' && stepped?.real) || DOJO0, words: { dir: FIELD }, set: (ch) => { markInput(); Object.assign(api.state, ch); api.update(); ctl.onChange() }, fire: () => fire(), sound: (k) => sound.play(k), enabled: () => mode === 'whatif' && !modal }) }
  // the wind (30 Oct, Andrew: "Is the wind slightly horizontal? If so I need to know that somehow"): windsocks on the foul poles, the sign's pennants and faint air
  // streams over the field show tonight's forecast wind at Oracle (shown, not flown); in the dojo they show the wind you set, which is flown, across as well as out
  windFx = atOracle ? initWind25(api, { still: reduced, onChange: (w) => { if (life) life.wind = w && { ...w, cfDeg: window.__cp.ORACLE_AZ ?? 85 } } }) : null
  tonightWind = () => { if (windFx) Promise.resolve(getBay()).then((j) => { const H = j?.hourly; if (!H || mode === 'whatif') return; const now = new Date().toLocaleString('sv-SE', { timeZone: 'America/Los_Angeles' }).slice(0, 13).replace(' ', 'T'); const i = Math.max(0, H.time.findIndex((t) => t.startsWith(now))); windFx.set({ mph: H.wind_speed_10m[i], fromDeg: H.wind_direction_10m[i] }) }) }
  tonightWind()
  const happen = atOracle ? initHappen25(api, { still: reduced, splashes: () => splashes, gull: life ? () => life.makeGull() : null }) : null // the blimp, the ferry, the Cove, the bay (happen25.js); the SPLASH HITS sign follows the count
  // voxel foul poles (poles25.js); during HERON its own bending pole stands in for the right one
  const poles = atOracle ? initPoles25(api, { look: lab.FP, hideRight: () => happen?.active?.() === 'heron' }) : null
  window.__readBlock = () => [poles?.group, life?.board, life?.vboard, life?.vsign].filter(Boolean) // (5 Nov, night: the labels come in front of these too)
  if (happen?.splashSign?.()) keepReadable(api, happen.splashSign(), 1, 1, 1, { fixed: true, scale: false, prio: 9 }) // the tags keep off the Splash Hits sign too
  // (1 Nov, later; an audit) a new preview while a ball is up cuts its flight short: the engine stops calling __cpOnFly and __cpOnLand, so the shadow, the whoosh, the
  // leaning crowd and the board's TRACKING are put away here (the board only while it says TRACKING: a Seance call or a gag stays)
  let flying = false, quietUntil = 0
  // (home stretch; GPT red team III, H: "let the stadium take over during the swing, the landed number take over at impact") the panels step back while the ball
  // flies and for 1.8 s after it lands, then come back
  api.NN.frames.push(() => { const q = flying || performance.now() < quietUntil; if (grid.classList.contains('quiet') !== q) grid.classList.toggle('quiet', q) })
  window.__cpTrack = (pts, res, color, prev) => { if (prev && flying) { flying = false; shadow.hide(); sound.cancel(); { if (cur && mode === 'replay') { const n = pname(cur.b); life?.idle(`${(n ? n[0] : 'BATTER ' + cur.b).toUpperCase()}  ·  ${cur.d}`) } else life?.idle('DINGER DOJO') } } return flight.track(pts, res, color, prev) }; window.__cpNoApex = true
  loadPrivateSongs() // San Francisco lives in a git-ignored file
  addEventListener('pointerdown', (e) => { if (pitchCam.busy() && onPark(e)) pitchCam.finish() }) // skip to the hit
  // (2 Nov, later: no words when the ball lands, "we don't need that set dressing"; the moments still play)
  const impact = initImpact25(api, colors)
  heat = initHeat25(api, { pool, balls: R.balls, sections: se.SECTIONS, blockers: () => [life?.board, life?.vboard, life?.vsign], gone: () => colors().nk, look: () => ({ g: lab.BG, f: lab.FV, s: lab.SV, k: lab.BK, ph: lab.PH, ps: lab.PS, pd: lab.PD, pp: lab.PP, bd: lab.BD, pk: lab.PK, ct: lab.CN }), onDrop: (gone) => sound.play(gone ? 'geiger' : 'chip', { vol: gone ? 0.5 : 0.25 }), giants: (b) => !!b && (b.tb === 'Bot' ? b.ht === 'SF' : b.at === 'SF') })
  stage = initStage25(api, { look: () => ({ gr: lab.GR }), colors: () => colors() })
  if (!navigator.webdriver || q.get('warm') === '1') setTimeout(() => { if (show !== 'hm') heat.warm({ temp: NORMAL_NIGHT.temp, wind: NORMAL_NIGHT.wind, xwind: NORMAL_NIGHT.xwind, hand: api.state.hand > 0 ? 1 : -1 }) }, 4500) // (4 Nov, night: BLAST RADIUS opens at once)
  touches = initTouches25(api, { sound: (k, a) => sound.play(k, a), makeGull: () => life?.makeGull?.() })
  // POINTING AT A SEAT: Shot Caller's pointer, a raycast at most every 70 ms
  { let pT = 0; addEventListener('pointermove', (e) => { if (mode !== 'shot' || !onPark(e)) { touches.hoverSeat(null); return } const n = performance.now(); if (n - pT < 70) return; pT = n; const p = sc.pick(e.clientX, e.clientY); touches.hoverSeat(p, p && seatOf(p), cs0().getPropertyValue('--acc').trim()) }) }
  const moments = initMoments25(api, colors, fx, { sound: (k) => sound.play(k), banner: null, oracle: atOracle, cove: () => (fx.kayaks?.() ?? 0) > 0, force: () => LAB.MO.opts.find((x) => x.c === lab.MO)?.kind || null })
  // Z2 PUSH: the camera eases toward where the ball came down and back (1.4 s in, 1.6 s held, 1.4 s out); a new swing or a drag ends it at once
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  function camPush(at) {
    return // (5 Nov: the push is gone, Z or no Z)
    // eslint-disable-next-line no-unreachable
    if (mix.Z !== 2 || !at || bird || reduced || look) return
    const C = api.NN.camera, T = api.NN.controls.target
    push = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1: C.position.clone().lerp(at, 0.3), t1: T.clone().lerp(at, 0.6) }
  }
  const endPush = () => { if (!push) return; api.NN.camera.position.copy(push.p0); api.NN.controls.target.copy(push.t0); api.NN.controls.update(); push = null }
  api.NN.frames.push((dt) => {
    if (!push) return
    // on the wall clock, so it takes the same time at any frame rate
    const t = (performance.now() - push.start) / 1000, k = t < 1.4 ? ease(t / 1.4) : t < 3 ? 1 : 1 - ease((t - 3) / 1.4)
    api.NN.camera.position.lerpVectors(push.p0, push.p1, k); api.NN.controls.target.lerpVectors(push.t0, push.t1, k); api.NN.controls.update()
    if (t >= 4.4) endPush()
  })
  addEventListener('pointerdown', (e) => { if ((push || look) && onPark(e)) { push = null; look = null } }) // the drag takes the camera from where the push left it
  // LOOK (28 Oct, night): Landing Party, Seat Seance and Shot Caller are about one corner of the park, which is a few pixels from the broadcast seat; the camera glides in
  // over that corner (from the home-plate side, high enough to see the rows) and glides back to where it was when the feature closes. Never in bird's eye.
  function lookAt(pts, rad = 20) {
    if (!pts.length || bird || reduced) return
    const THREE = api.NN.THREE, C = api.NN.camera, T = api.NN.controls.target, c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
    const r = Math.max(rad, ...pts.map((p) => Math.hypot(p.x - c.x, p.z - c.z))), home = api.toWorld([0, 0, 0])
    const back = new THREE.Vector3(home.x - c.x, 0, home.z - c.z).normalize(), D = Math.max(115, r * 4)
    const p1 = c.clone().addScaledVector(back, D * 0.78).add(new THREE.Vector3(0, D * 0.6, 0))
    const base = look?.base ?? (push ? { p: push.p0.clone(), t: push.t0.clone() } : { p: C.position.clone(), t: T.clone() }) // a push under way: go back to where it started
    push = null
    look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1, t1: c.clone(), base, out: false, req: { pts: pts.map((p) => p.clone()), rad } }
  }
  // Shot Caller's look is side-on (29 Oct): the flights are the point, and from behind the plate they come straight at you. The camera stands off to the side of the
  // line from home to the spot, on the field's side of it, far enough back to see the whole arc
  // 2 Nov, night (Andrew: "When I find a seat it immediately zooms in on the arc not the seat"): Shot Caller's camera goes to the seat: up over the field in front of
  // it, a little to the side, looking down at it, so the seat, its locator and the ways coming in to it are all in the picture
  function lookSeat(spot) {
    if (bird || reduced) return
    const THREE = api.NN.THREE, C = api.NN.camera, T = api.NN.controls.target, home = api.toWorld([0, 0, 0])
    const back = new THREE.Vector3(home.x - spot.x, 0, home.z - spot.z).normalize(), side = new THREE.Vector3(-back.z, 0, back.x)
    const field = api.toWorld([0, 70, 0]); if (side.dot(new THREE.Vector3(field.x - spot.x, 0, field.z - spot.z)) < 0) side.negate() // (the side over the field, not out over the street)
    const p1 = spot.clone().addScaledVector(back, 48).addScaledVector(side, 64).add(new THREE.Vector3(0, 30, 0)), t1 = spot.clone().addScaledVector(back, 22).add(new THREE.Vector3(0, 9, 0))
    const base = look?.base ?? (push ? { p: push.p0.clone(), t: push.t0.clone() } : { p: C.position.clone(), t: T.clone() })
    push = null
    look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1, t1, base, out: false, req: { seat: spot.clone() } }
  }
  // BLAST RADIUS's camera (4 Nov): high over the shallow infield, looking down and out at the whole outfield and its seats, so the seats' cells read (the broadcast seat sees them small)
  function lookBlast() {
    if (bird || reduced) return
    const C = api.NN.camera, T = api.NN.controls.target
    const cam = BLAST_CAMS.find((x) => x.c === lab.CM) ?? BLAST_CAMS[0], p1 = api.toWorld(cam.at), t1 = api.toWorld(cam.to)
    const base = look?.base ?? (push ? { p: push.p0.clone(), t: push.t0.clone() } : { p: C.position.clone(), t: T.clone() })
    push = null
    look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1, t1, base, out: false, req: { blast: true } }
  }
  function lookSide(spot) {
    if (bird || reduced) return
    const THREE = api.NN.THREE, C = api.NN.camera, T = api.NN.controls.target, home = api.toWorld([0, 0, 0])
    const run = new THREE.Vector3(spot.x - home.x, 0, spot.z - home.z), L = run.length(), mid = home.clone().addScaledVector(run, 0.5); mid.y = home.y + 16
    let side = new THREE.Vector3(-run.z, 0, run.x).normalize()
    const field = api.toWorld([0, 70, 0]); if (side.dot(new THREE.Vector3(field.x - mid.x, 0, field.z - mid.z)) < 0) side.negate()
    const p1 = mid.clone().addScaledVector(side, L * 1.2).add(new THREE.Vector3(0, L * 0.42, 0))
    const base = look?.base ?? (push ? { p: push.p0.clone(), t: push.t0.clone() } : { p: C.position.clone(), t: T.clone() })
    push = null
    look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1, t1: mid, base, out: false, req: { side: spot.clone() } }
  }
  // LOOK AT IT in the dock (29 Oct, later): a glide up to the sign (Q) or the Coke corner (C), which are small from the broadcast seat, and back after a few seconds;
  // B (30 Oct): the scoreboard straight on for the GAG REEL, held
  function lookThere(k) {
    if (bird || reduced) return
    const THREE = api.NN.THREE, C = api.NN.camera, T = api.NN.controls.target
    const [p1, t1] = k === 'Q' ? [api.toWorld([0, 92, 45]), api.toWorld([0, 148, 44])] : k === 'B' ? [api.toWorld([0, 78, 27]), api.toWorld([0, 149, 25])] : [new THREE.Vector3(-20, 14, -96), new THREE.Vector3(-51, 14, -139)] // B: the scoreboard, straight on (GAG REEL)
    const base = look?.base ?? (push ? { p: push.p0.clone(), t: push.t0.clone() } : { p: C.position.clone(), t: T.clone() })
    push = null
    const me = look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1, t1, base, out: false, req: { there: k } } // (30 Oct: a relayout starts it again, like lookAt)
    if (k !== 'B') setTimeout(() => { if (look === me) unlook() }, 6500) // the GAG REEL's board view (B) stays until the reel closes
  }
  // the distance fade follows the camera (29 Oct, evening, Andrew: "the park gets insanely dark when I zoom out"): the fog starts 60 m past the park's middle as seen
  // from the camera and is gone 390 m past it, never closer than the old 230 and 560 m, so zooming out keeps the park lit and only the sea beyond fades; Karl thickens it
  { const mid = api.toWorld([0, 60, 0]); api.NN.frames.push(() => { const f = api.NN.scene.fog; if (!f || !f.isFog) return; const dc = api.NN.camera.position.distanceTo(mid), k = fx?.fogK?.() ?? [1, 1]; f.near = Math.max(230, dc + 60) * k[0]; f.far = Math.max(560, dc + 390) * k[1] }) }
  function unlook() { if (!look || look.out) return; const C = api.NN.camera, T = api.NN.controls.target; look = { start: performance.now(), p0: C.position.clone(), t0: T.clone(), p1: look.base.p, t1: look.base.t, out: true } }
  api.NN.frames.push(() => {
    if (!look || look.settled) return // settled: the camera is the viewer's again (wheel zoom, drags) until the feature closes
    const k = ease((performance.now() - look.start) / 1300)
    api.NN.camera.position.lerpVectors(look.p0, look.p1, k); api.NN.controls.target.lerpVectors(look.t0, look.t1, k); api.NN.controls.update()
    if (k >= 1) { if (look.out) look = null; else look.settled = true }
  })
  if (life) life.gullsOn = mix.F !== 3
  if (cur) { const n = pname(cur.b); life?.idle(`${(n ? n[0] : 'BATTER ' + cur.b).toUpperCase()}  ·  ${cur.d}`) }
  // PLAY IT: a new batter gets their walk-up jingle, the pitch flies into the zone, then the hit-stop and the crack
  function cancelPlay() { for (const t of playT) clearTimeout(t); playT = []; playing = false; pitchCam?.stop() }
  function play() {
    if (mode !== 'replay' || !cur || playing || pitchCam?.busy()) return
    playing = true
    let wait = 560
    if (cur.b !== lastJingle) { lastJingle = cur.b } /* (6 Nov: no walk-up jingle, Andrew: "Just kill this feature") */ // (31 Oct, GPT red team: the walk-up jingle no longer holds the pitch back 1.9 s; it plays over it)
    // H1 PITCH ARC: the pitch drawn on the park on its fitted path, then the hit
    const go = () => { playing = false; playT = []; api.fire() }
    playT.push(setTimeout(() => { pitchIn = performance.now(); paintPitch(); paintSide(); if (!(mix.H && pitchCam.play(cur, go, reduced ? { dur: 0.01, hold: 0.3 } : {}))) playT.push(setTimeout(go, 560)) }, wait - 560))
  }
  // PRINT IT: a poster of the ball on screen, as a PNG download
  async function printIt() {
    if (!last) return
    const res = last, s = api.state, cs = cs0(), FTm = 0.3048, path = res.visPath ?? res.path
    const b = mode === 'replay' ? cur : null, bn = b ? pname(b.b) : stepped ? pname(stepped.b.b) : null, pn = b ? pname(b.p) : null, off = b ? offZone(b) : null, o = odds()
    const v = res.verdict, word = v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL BALL' : 'IN PLAY'
    const pre = E('#c25f pre'), cvs = optOf('A', mix.A).canvas
    // a canvas style is drawn again at the poster's size, so the print is not a blown-up screen copy
    let faceImg = null
    const pid = cur ? String(cur.b) : stepped ? String(stepped.b.b) : null
    if (pid ? (!facesRaw[pid] || MASCOTS[pid]) && mix.D : mix.D) {
      // no photo (or your own swing, or a mascot): the poster carries the same stand-in as the panel
      const art = document.createElement('canvas')
      drawStandIn(art, mix.D, 300, 300, { ...standInOpts(pid, { ink: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim(), dim: cs.getPropertyValue('--dim').trim(), k: cs.getPropertyValue('--k').trim() }), ratio: 1 })
      faceImg = Object.assign(document.createElement('canvas'), { width: 300, height: 300 }) // on the page color, so it sits clear of the drawing under it
      const fg = faceImg.getContext('2d'); fg.fillStyle = cs.getPropertyValue('--k').trim(); fg.fillRect(0, 0, 300, 300); fg.drawImage(art, 0, 0)
    } else if (cvs) { const id = pid, rec = id && facesRaw[id], gen = !rec && id && hasGen ? genericFace('composite', id) : null, src = rec ? faceSource(rec) : gen ? gen.src : drawBust(160); faceImg = document.createElement('canvas'); drawFace(faceImg, src, cvs, 300, 300, { ink: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim() }, 1) }
    const d = {
      colors: { k: cs.getPropertyValue('--k').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim(), acc: cs.getPropertyValue('--acc').trim() },
      mode: mode === 'replay' ? NAMES.replay : NAMES.dojo, name: (bn ? bn[0] : 'YOUR SWING').toUpperCase(),
      sub: b ? `V ${(pn ? pn[0] : 'PITCHER').toUpperCase()} · ${(PITCH[b.pt] ?? b.pt ?? '').toUpperCase()} ${f(b.pv, 1, ' MPH')}` : 'A DOJO SWING',
      ft: Math.round(res.landFt), apex: Math.round(res.peakFt), wallFt: v.wallFt, wallH: v.wallH,
      track: path.filter((_, i) => i % 3 === 0).map((p) => [p.p[0] / FTm, p.p[1] / FTm]),
      side: path.filter((_, i) => i % 3 === 0).map((p) => [Math.hypot(p.p[0], p.p[1]) / FTm, p.p[2] / FTm]),
      wall: Array.from({ length: 91 }, (_, i) => [i - 45, api.wallAt?.(i - 45)?.[0] ?? 400]),
      rows: [['EXIT SPEED', `${s.ev.toFixed(1)} MPH`], ['LAUNCH ANGLE', `${Math.round(s.la)}°`], ['HOME RUN ODDS', pct(o.p) + '%'], ['HANG TIME', `${res.hang.toFixed(1)} S`], ['APEX', `${Math.round(res.peakFt)} FT`], ['VERDICT', word]],
      tag: off && b?.hr ? `${NAMES.offMenu}: ${off.word}` : word,
      face: !faceImg && pre?.textContent ? pre.textContent.split('\n') : [], faceFont: pre ? getComputedStyle(pre).fontFamily : 'monospace', faceImg,
      date: b?.d ?? new Date().toISOString().slice(0, 10),
    }
    const url = await posterPNG(d), a = document.createElement('a')
    a.href = url; a.download = `nuke-navigator-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${d.date}.png`
    document.body.appendChild(a); a.click(); a.remove()
    window.__poster25 = url.length
    sound.play('pick'); banner('PRINTED', 'THE POSTER IS IN YOUR DOWNLOADS')
  }
  let reel = null
  function startReel() {
    filter = 'big'; setMode('replay')
    if (!balls.length) return
    reel = { i: 0, t: [], mine: false }
    reelNext()
  }
  function reelNext() {
    if (!reel || mode !== 'replay') { stopReel(); return }
    idx = reel.i % balls.length; applyBall(balls[idx]); paintChooser()
    const st = situation(balls[idx])?.stamp, n = pname(balls[idx].b)
    banner(st ?? 'HOME RUN', `${(n ? n[0] : 'BATTER ' + balls[idx].b).toUpperCase()} · ${balls[idx].d}`)
    reel.t.push(setTimeout(() => { if (reel) { reel.mine = true; api.fire() } }, 900))
  }
  function stopReel() { if (reel) for (const t of reel.t) clearTimeout(t); reel = null; paintChooser() }
  addEventListener('keydown', (e) => { if (reel && e.key === 'Escape') { stopReel(); e.stopPropagation() } }, true) // (one Esc, one thing: it used to stop the reel and open the menu)
  addEventListener('pointerdown', (e) => { if (reel && onPark(e)) stopReel() })
  let fires = 0
  const voxBall = (bm) => { const v0 = bm.userData.vox; if (v0?.isObject3D) { if (v0.parent !== bm) bm.add(v0); bm.material.visible = false; return } if (v0) return; bm.userData.vox = 1; loadModels(api.NN.THREE).then((M) => { if (!M.ball) return; const v = cloneModel(M.ball, 2.0 / 0.42 / 0.09); v.traverse((o) => { if (o.isMesh && o.material.color.r > 0.5 && o.material.color.g < 0.35) o.userData.seam = true }); bm.add(v); bm.material.visible = false; bm.userData.vox = v; paintSeams() }) }
  // the voxel ball's stitches take the E color too
  function paintSeams() { const v = api.ballMesh?.()?.userData.vox; if (!v?.isObject3D) return; const c = colors().sc || '#e4002b'; v.traverse((o) => { if (o.userData.seam) o.material.color.set(c) }) }
  window.__cpOnFire = (ev) => { flying = true; moments?.clear?.(); mmStop?.() // (red team 2.1: a moment from the last flight never touches this one)
    fires++
    clearTimeout(songT); if (autoSong) { jukebox.stop(); autoSong = false }
    endPush()
    // a glove or the sea lion may have taken the last one; and the engine's ball (a 2.4 m radius, so it shows from anywhere) is drawn at 0.42 of that (Andrew: "way too big")
    const bm = api.ballMesh?.(); if (bm) { bm.visible = true; bm.scale.setScalar(0.42); voxBall(bm) }
    fx.contact(ev)
    // (6 Nov: no TRACKING on the board: it pushed the Dodger gags off and stopped the idle ones; a gag already playing plays on)
    const fl = E('#c25fl'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go')
    if (mode === 'replay' && !edited) sound.play('crack', { ev: api.state.ev }); else sound.nuke(api.state.ev) // a real ball has its real crack; your own come off the launch deck (1 Nov, night)
    sound.swing(api.state.ev) // the whoosh follows the ball; the crowd leans in
    stage?.launch(api.state.ev)
  }
  window.__cpOnFly = (pos, fr) => { if (!flying) return; stage?.fly(pos, fr); flight.reveal(fr, pos); if (fr < 0.995) shadow.at(pos); else shadow.hide(); sound.fly(pos); const v = api.ballMesh?.()?.userData.vox; if (v?.rotation && fr < 0.97) v.rotation.x -= 0.35 }
  let lands = 0
  // (2 Nov, night: nice touches) the count-up's Geiger clicks, never two in 28 ms; the cube knocked off a big number, landing
  { let gT = 0; window.__cpGeiger = () => { const n = performance.now(); if (n - gT < 28) return; gT = n; sound.play('geiger', { vol: 0.6 }) }; window.__cpChipSnd = () => sound.play('chip', { vol: 0.7 }) }
  window.__cpOnLand = (ev) => {
    flying = false; flight.done(); shadow.hide(); quietUntil = performance.now() + 1800
    lands++
    const ft = Math.round(window.__dojo?.landFt ?? 0), hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key)
    stage?.land(hr && ev.key !== 'POLE')
    // (1 Nov, later: GPT red team II, his picks) the clock over the board panics on a very long one; the living bottle bubbles on one toward left
    if (hr && ft >= 440) life?.clockPanic?.()
    if (hr && ev.at && ev.at.x < -20) coke?.bubble?.()
    sound.land(ev, { ft }) // the crowd: a roar sized by distance, a groan off the wall, the foghorn on a splash, CHARGE! on the organ
    if (reel?.mine) { reel.mine = false; reel.i++; reel.t.push(setTimeout(reelNext, 2600)) }
    const hap0 = happen?.onLand?.(ev) // the hat domino on an arcade home run; a splash sets off one of the Cove's five acts (fx25.js)
    // (2 Nov, night) THE COVE: the kayaks' acts, the scuba diver, or either (the diver about one in three); the diver has the Cove to himself, no sea lion
    const diverNow = ev.key === 'SPLASH' && atOracle && (lab.CV === 2 || (lab.CV === 3 && Math.random() < 1 / 3)), hap = hap0 || (diverNow ? 'diver' : null)
    fx.land(ev, { noAct: diverNow })
    impact.land(ev, { impact: lab.LI, diver: diverNow })
    // THE GULL ON THE NUMBER: about one landing in three, a few seconds after it settles (with the gulls on)
    if (mix.F !== 3 && !diverNow) { const ld = flight.last()?.userData.ld; setTimeout(() => { if (ld && flight.last()?.userData.ld === ld && Math.random() < (window.__cpGullOdds ?? 0)) touches.gull(ld) }, 3200) }
    // (6 Nov, Andrew: "I don't want the screen to say home run 390 feet": the board keeps to the Dodger gags and the batter's marquee)
    if (hr && mix.F !== 3) life?.scatter()
    if (hap) moments.clear?.() // (1 Nov, night: one landing show at a time; a happening that came with the landing has the spot)
    lastMoment = mix.F === 1 && show !== 'se' && !hap ? moments.land(ev, window.__dojo?.landing?.kind, life?.board.position) : null // (30 Oct: under the seance the ghost owns the seat, no gull or dog on it)
    if (life) boardFor(ev, hr, ft)
    camPush(ev.at)
    if (atOracle && ev.at && lastMoment !== 'mitt' && ev.at.x > -75 && ev.at.x < -40 && ev.at.z > -150 && ev.at.z < -118) { fx.bonk(ev.at); sound.play('thud') }
    if (ev.key === 'SPLASH') { splashes++; store('nn-splash25', String(splashes)); pendingSplash = true; sound.play('splash') }
    else if (['GONE', 'NUKE', 'SCRAPER', 'POLE'].includes(ev.key)) sound.play('fanfare')
    // Oracle sounds its foghorn when the Giants go deep: a Giants home run in the replay at Oracle, or your own swing there
    const giants = mode === 'replay' ? cur && !edited && cur.park === 'SF' && (cur.tb === 'Bot' ? cur.ht === 'SF' : cur.at === 'SF') : true
    if (hr && atOracle && giants) setTimeout(() => sound.play('horn', { vol: 0.55 }), 500)
    else if (ev.key === 'WALL' || ev.key === 'CLOSE') sound.play('thud')
    if (shotPlayS?.wait) { const p = shotPlayS; p.wait = false; p.i++; p.t.push(setTimeout(p.i < p.list.length ? flyWay : () => { if (shotPlayS === p) { shotPlayS = null; pickWay(0) } }, 1900)) }
  }
  // the scoreboard's animation for what just landed (park25.js keeps the two best when several apply); they wait until HOME RUN has flashed
  function boardFor(ev, hr, ft) {
    const b = mode === 'replay' && cur && !edited ? cur : null, st = b && hr ? situation(b)?.stamp : null, off = b && hr ? offZone(b) : null, D = 2.6 // (off: the songs)
    if (hr) life.signFx(st && /WALK-OFF/.test(st) ? 'walk' : 'hr') // the ORACLE PARK sign over the board lights up
    // the songs: a walk-off gets San Francisco (Oracle plays it after a win), a grand slam gets CHARGE!
    // (6 Nov, evening, Andrew's picks: "Can we have the imperial march play when a dodger home run gets hit?", the anthem "for like july 4th games"; ODE TO JOY, CAN-CAN
    // and WILLIAM TELL out): one song after a home run, the first that fits
    const dodgerHR = !!b && (b.tb === 'Top' ? b.at === 'LAD' && b.ht === 'SF' : b.ht === 'LAD' && b.at === 'SF'), july4 = !!b && /-07-04/.test(String(b.d ?? ''))
    const song = reel || !hr ? null : dodgerHR ? 'imperial' : july4 ? 'anthem' : st && /WALK-OFF/.test(st) ? 'sf' : st === 'GRAND SLAM' ? 'charge' : ev.key === 'SPLASH' ? 'sailor' : off ? 'entertainer' : ft >= 450 ? 'mountain' : null
    if (song) { clearTimeout(songT); const own = [mode, show, modal, fires].join(); songT = setTimeout(() => { if (!sound.on() || [mode, show, modal, fires].join() !== own) return; if (jukebox.play(song, { vol: song === 'sf' ? 0.8 : 1, onEnd: () => { autoSong = false } })) autoSong = true }, 2800) } // (7 Nov, red team 2 and 12)
    // the rivalry: a Giants home run against the Dodgers gets a Giant doing something terrible to a Dodger on the board, and that is all the board plays
    // (30 Oct, Andrew: "Every other board show let's kill I only want dodger gags on the board, that's literally it")
    if (hr && b && (b.tb === 'Top' ? b.at === 'SF' && b.ht === 'LAD' : b.ht === 'SF' && b.at === 'LAD')) life.play(life.nextGag(), {}, D) // the next gag from park25's shuffled bag
    else if (hr && b && (b.tb === 'Top' ? b.at === 'LAD' && b.ht === 'SF' : b.ht === 'LAD' && b.at === 'SF')) life.play(life.nextGag(), {}, D) // (30 Oct, night) and a Dodger home run against the Giants: the board takes it out on him
    else if (hr && mode === 'whatif') life.play(life.nextGag(), {}, D) // (30 Oct, night) in the dojo you are the Giant: every home run you hit gets one too
  }
  // Karl: on by the forecast at Oracle when it says low cloud or poor visibility (one Open-Meteo request per visit, shared with BAY BAROMETER), and by hand with K
  const toggleKarl = (on) => { const v = on ?? !fx.karlOn(); fx.karl(v, mix.K); if (life) life.fog = v; E('#c25kl').classList.toggle('on', v); E('#c25kl').textContent = v ? 'KARL: IN' : 'KARL' }
  E('#c25kl').addEventListener('click', () => { pressEl(E('#c25kl')); toggleKarl() })
  if (atOracle && q.get('karl') !== '0') Promise.resolve(getBay()).then(() => { if (bay && !bay.error && bay.hourly && karlIn(bay)) toggleKarl(true) }).catch(() => {})

  finishUI(root, { minW: 320, minH: 480 })
  syncCam = windowSync(api, hero, { get zoom() { if (show === 'hm') { const r = hero.getBoundingClientRect(), cam = BLAST_CAMS.find((x) => x.c === lab.CM) ?? BLAST_CAMS[0]; return cam.z / Math.max(0.2, Math.min(r.width / 780, r.height / 600) * 0.95) } return compactK() < 1 ? 1.08 : 0.95 } })
  addEventListener('resize', () => setTimeout(blastFrame, 0)) // (2 Nov, night: COMPACT frames the park a little tighter; its window is small)
  applyMix()
  if (q.get('filter')) filter = q.get('filter')
  if (q.get('ball')) idx = Math.max(0, Number(q.get('ball')) || 0)
  setMode(mode)
  if (mode === 'whatif' && q.get('wev')) { for (const k of ['ev', 'la', 'dir', 'hand', 'temp']) if (q.get('w' + k) != null) api.state[k] = Number(q.get('w' + k)); api.update() }
  const wantBat = q.get('bat')
  if (wantBat && R.balls.length) { filter = 'all'; balls = R.balls.filter((b) => String(b.b) === wantBat); idx = 0; if (balls.length) { mode = 'replay'; applyBall(balls[0]); paintChooser() } }
  // PASS IT ON (1 Nov, later): U copies a link that opens a friend's dojo on exactly this swing (?swing=speed.angle.aim.air.wind.crosswind), and the link opens
  // straight onto it
  const swingQ = q.get('swing')?.split('.').map(Number)
  if (swingQ?.length >= 2 && swingQ.every(Number.isFinite)) { const [ev, la, dir = 0, temp = 62, wind = 0, xwind = 0] = swingQ, cl = (x, a, b) => Math.max(a, Math.min(b, Math.round(x))); setMode('whatif'); Object.assign(api.state, { ev: cl(ev, 60, 125), la: cl(la, -10, 60), dir: cl(dir, -50, 50), temp: cl(temp, 40, 100), wind: cl(wind, -20, 20), xwind: cl(xwind, -20, 20) }); api.update(); setTimeout(() => banner('A SWING SENT TO YOU', 'NUKE IT (SPACE)'), 1500) }
  const wantMod = q.get('mod')
  if (wantMod) setTimeout(() => openMod(wantMod), 1200)
  if (q.get('menu') !== '0' && !wantMod && !swingQ) menu.show(menuKey()) // (a swing sent to you opens on it, not the menu)
  uiReady = true
  paintTabs()
  // the lab applied: the button's icon and color now; the controls' looks join below as they are built
  // THE ORANGE, live (2 Nov, later: a reload on every switch was a bug): the family in place, the park's materials and cubes, the interface's accent, the arcs
  function switchOrange(n) { const map = setOrange(n); if (!map) return; recolor(api.NN.scene, map); THEMES.orange.acc = ORANGE.o; if (themeKey() === 'orange') root.style.setProperty('--acc', ORANGE.o); colC = null; if (!api.anim?.()) api.update() }
  const labHooks = [() => flight.setLand(lab.LN), () => flight.setLandCol(lab.LC), () => poles?.setLook?.(lab.FP), () => coke?.setLook?.(lab.CB), () => shadow.setStyle(lab.SH), () => flight.setFlow(lab.TF), () => pix?.setDesigns({ ev: lab.CS, la: lab.CA, dir: lab.CD, temp: lab.CT, wind: lab.CW }), () => ctl3d?.setStyles({ sl: lab.SL, sk: lab.SK, th: lab.TH }), () => setTagStyle(lab.TG), () => setTagTie(lab.TT), () => lp.setStyle(lab.LP)]
  applyLab = (k) => { if (k === 'GR') stage?.sync({ ball: cur, mode }); if (k === 'LF') flight?.setFill(lab.LF); if (k === 'CM') blastFrame(); if (['BG', 'FV', 'SV', 'BK', 'PH', 'PS', 'PD', 'PP', 'PK', 'CN'].includes(k) && show === 'hm') { hmKey = ''; paintHeat() } if (k === 'CM' && show === 'hm') lookBlast(); if (k === 'BD' && show === 'hm' && hmWho) { hmKey = ''; paintHeat() } if (k === 'SA' && mode === 'shot' && scRes?.at) shotAt(scRes.at.clone(), scRes.seat, true) /* (3 Nov: a new cloud look redraws in place) */; if (k === 'OR') switchOrange(lab.OR) /* the orange first: the bomb on NUKE IT is drawn in it */; const nk = E('#c25nk'); if (nk) { nk.querySelector('.nkw').innerHTML = nukeSVG(lab.BI, 2.5, 'var(--nki)'); nk.className = 'nuke nk' + lab.BS; grid.style.setProperty('--nk', NUKE_COLORS[lab.BC]?.[1] ?? '#9dff00') } for (const f of labHooks) f(k) }
  applyLab()
  window.__mix25 = { stage: () => stage, colors: () => colors(), impact: () => impact, touches: () => touches, heat: () => heat, heatWho: (id) => { hmWho = id ?? ''; hmKey = ''; if (show === 'hm') paintHeat() }, heatMetric: (m) => { hmMetric = m; hmKey = ''; if (show === 'hm') paintHeat() }, heatOver: () => (hmOver ? cellWords(hmOver) : null), sc: () => sc, lookNow: () => (look ? { req: look.req, p1: look.p1?.toArray(), t1: look.t1?.toArray() } : null), openMod: (k) => openMod(k), shot: () => (scRes ? { ways: scRes.ways.map((w) => ({ ev: w.ev, evx: w.evx ?? w.ev, la: w.la, dir: w.dir, w: w.w })), seat: scRes.seat, sel: scSel, spot: scRes.spot } : null), seatPoint: (a, b, c) => se.seatPoint(a, b, c), seatOf: (p) => seatOf(p), callSeat: (a, b, c) => { const r = se.seatPoint(a, b, c); if (!r.err) shotAt(r.at, { what: 'seat', sec: r.sec, area: r.area, row: r.row, seat: r.seat, line: r.line }); return r }, shotPlaying: () => !!shotPlayS, playShot: () => playShot(), setMode: (m) => setMode(m), you: () => youK, bio: (id) => bio[id] ?? null, standIn: (id) => standInOpts(id == null ? null : String(id), {}),
    fun: () => [...fun.list], flight: () => flight, poles: () => poles, seance: () => seRes, look: () => (look ? { out: look.out, moving: performance.now() - look.start < 1300 } : null), hasFace: (id) => !!facesRaw[String(id)], get: () => ({ ...mix }), set: (s) => { Object.assign(mix, parseMix(s)); applyMix('L') }, code: () => mixCode(mix), menu, fx, life, moments, offZone, tweak, play, mode: () => mode, reel: () => reel, cur: () => cur, lastMoment: () => lastMoment, pushing: () => !!push, water: () => water, pitchCam: () => pitchCam, jukebox, lands: () => lands, fires: () => fires,
    // for the tests: jump to the first real ball (any filter) that matches
    ball: (pred) => { if (mode !== 'replay') setMode('replay'); filter = 'all'; balls = filtered(); const i = balls.findIndex(pred); if (i >= 0) { idx = i; applyBall(balls[i]); paintChooser() } return i }, stopReel: () => stopReel(), stars: () => smRes, allBalls: () => R.balls, coke: () => coke, cut: () => cutN, karl: (on) => toggleKarl(on), setShow: (k) => setShow(k), diamond: () => diamond, ghost: () => ghost, happen: () => happen, wind: () => windFx, controls: () => ctl3d, pix: () => pix, lab: (k, n) => { if (k && n != null) setLab(k, n); return { ...lab } }, mySeat: () => mySeat, selMenu: () => menu, gagReel: () => ({ all: !!reelAll, list: reelList() }), readable: () => [...readable(), ...screenTags()] }
  return {
    render,
    beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (b.last && last) { const el = E('#c25d'); if (el) rollTo(el, Math.round(last.landFt), { steps: 8 }) } if (last && (!b.preview || mode !== 'whatif')) render(last) }, // (31 Oct: in the dojo a preview beat is followed by its own render; in the replay and Shot Caller it is a new ball or way)
  }
}
