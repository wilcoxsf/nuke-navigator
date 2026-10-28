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
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, THEMES, applyTheme, pressEl, makeControls, makeSession, finishUI, loadDists } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons, loadReplay, loadPool, ballsLike, rollTo } from './skel3.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBust, artMetrics } from './art.js'
import { loadGenericFaces, genericFace } from './batter3d.js'
import { landingParty } from '../landing.js'
import { seatSeance } from '../seance24.js'
import { shotCaller } from '../shotcaller.js'
import { loadWhatIf, whatIfP } from '../whatif.js'
import { loadDaily, enrichDay, oracleCheck, dingerPicks } from '../daily.js'
import { loadLibrary, pick, mulberry32 } from '../comparisons.js'
import { TYPES, TYPE_FONTS, typeVars } from './type25.js'
import { hist25 } from './hist25.js'
import { sliceSVG, sliceCaption } from './slice25.js'
import { MENU_CSS, selectMenu } from './menu25.js'
import { sound } from './sfx25.js'
import { initFx25 } from './fx25.js'
import { initPark25 } from './park25.js'
import { initMoments25 } from './moments25.js'
import { initWater25 } from './water25.js'
import { drawFace, FACE_STYLES } from './faces25.js'
import { initPitchArc, pitchPath, breakOf } from './pitchcam25.js'
import { constellation, posterPNG } from './show25.js'

const LSA = { 1: 'WEAK', 2: 'TOPPED', 3: 'UNDER', 4: 'FLARE OR BURNER', 5: 'SOLID CONTACT', 6: 'BARREL' }
const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVEBALL', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const f = (v, d = 1, u = '') => (v == null || v !== v ? '--' : (typeof v === 'number' ? v.toFixed(d) : v) + u)
const clock = (ax) => { if (ax == null) return '--'; const h = ((((ax + 180) / 30) % 12) + 12) % 12, hh = Math.floor(h) || 12, mm = Math.round((h % 1) * 60); return `${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}` }
// names Andrew chose on 26 Oct; one place to change them
const NAMES = { offMenu: 'OFF THE MENU', low: 'GOLF SHOT', high: 'TOMAHAWK', away: 'CHASE SCENE', inside: 'INSIDE JOB', tweak: 'TWEAK THE TATER', replay: 'DINGER DÉJÀ-VU', dojo: 'DINGER DOJO' }

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
  // the pitch's own color (28 Oct): the arrow on the zone, the pitch line in the side view, the pitch arc in the park; the hit keeps the accent
  Y: { name: 'PITCH COLOR', opts: [
    { c: 1, name: 'SKY', desc: 'a clear mid blue, the opposite of the orange hit', col: '#6da7de' },
    { c: 2, name: 'SEA GLASS', desc: 'a pale green-blue, like the Cove', col: '#8fd0c4' },
    { c: 3, name: 'LILAC', desc: 'a soft violet, distinct from everything else on screen', col: '#a79be0' },
    { c: 4, name: 'STEEL', desc: 'a quiet grey-blue, the least loud', col: '#8aa3b8' },
    { c: 5, name: 'BONE', desc: 'the text color: the pitch in plain ink, the hit in orange', col: null },
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
    { c: 0, name: 'STILL', desc: 'no motion on the water' },
  ] },
  Z: { name: 'CAMERA', opts: [{ c: 1, name: 'STILL', desc: 'the camera stays put (Z key)' }, { c: 2, name: 'PUSH', desc: 'a slow push toward where the ball lands, then back; no shake (Z key; on by default since 28 Oct)' }] },
  H: { name: 'PITCH ARC', opts: [{ c: 1, name: 'ON', desc: 'PLAY IT draws the pitch on the park on its real path and break, in the pitch color, then the hit flies' }, { c: 0, name: 'OFF', desc: 'PLAY IT goes straight to the hit' }] },
  M: { name: 'MENU TITLE', opts: [{ c: 1, name: 'STACKED', desc: 'the name in two big lines' }, { c: 2, name: 'ARC', desc: 'a pixel home-run arc over the name' }, { c: 3, name: 'MARQUEE', desc: 'the name inside a border of chasing bulbs' }] },
}
const ORDER = ['L', 'P', 'A', 'T', 'F', 'I', 'R', 'Y', 'S', 'K', 'B', 'Z', 'H', 'M']
const HDR_AX = ['L', 'P', 'A', 'T', 'F', 'I'] // the rest live in the ? legend and their own keys
const DEF = { L: 2, P: 5, A: 2, T: 16, F: 1, I: 2, R: 1, Y: 1, S: 1, K: 1, B: 1, Z: 2, H: 1, M: 1 } // 28 Oct picks: A2, T16, I2 ACTION, the push on
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
  return `#cp .c25.L${n}{grid-template-columns:${L.cols};grid-template-rows:${L.rows.join(' ')} 84px;grid-template-areas:${q([...L.areas, strip])}}\n#cp .c25.L${n}.ns{grid-template-rows:${L.rows.join(' ')};grid-template-areas:${q(L.areas)}}`
}).join('\n')
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
#cp .c25 .chip .hd{font-size:calc(17px * var(--ts))}
#cp .c25 .chip .sb{font-size:calc(12px * var(--ts))}
#cp .c25 .bsel{left:8px;right:8px;bottom:6px;font-size:calc(13px * var(--ts))}
#cp .c25 .bsel .bt{padding:3px 6px}
#cp .c25 .tly{display:none}
#cp .c25.c25.c25 .park .bug.bug{display:none}
#cp .c25.S1 .batter .bugc.on,#cp .c25.S3 .batter .bugc.on{display:grid}
#cp .c25 .pnl>.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 24px)}
#cp .c25 .hists .hsw{top:4px}
#cp .c25 .strip .bt .ps{display:block;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c25 .strip{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:6px}
#cp .c25 .strip .bt{padding:4px 26px 14px 6px}#cp .c25 .strip .bt .sld{left:6px;right:26px;bottom:2px}
#cp .c25 .strip .bt b{font-size:calc(17px * var(--ts))}
#cp .c25 .strip .bt .ud{right:3px;gap:2px}
#cp .c25 .strip .bt .ud i{width:16px;height:13px;line-height:11px}
#cp .c25 .strip .bt.hot{grid-column:4;grid-row:2}
#cp .c25 .mod .box{padding:30px 12px 14px;max-width:96vw}
#cp .c25 .bul,#cp .c25 .bay{min-width:0}
#cp .c25 .bcards{grid-template-columns:repeat(2,minmax(0,1fr))}
#cp .c25 .btab .r{grid-template-columns:minmax(0,1fr) 40px 44px 40px 40px 46px 64px;gap:6px;font-size:calc(13px * var(--ts))}
#cp .c25 .bayt .r{grid-template-columns:44px 40px 46px 56px 60px 56px 1fr;gap:4px;font-size:calc(13px * var(--ts))}
#cp .c25 .legend,#cp .c25 .allst,#cp .c25 .tys{grid-template-columns:minmax(0,1fr)}
#cp .c25 .ddbig{font-size:calc(34px * var(--ts))}
#cp .c25 .banner{font-size:22px}
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
#cp .c25 .hdr .mhint{position:absolute;left:0;top:26px;z-index:5;background:var(--acc);color:var(--k);font-family:PS2P,monospace;font-size:9px;padding:5px 7px;white-space:nowrap;display:none;pointer-events:none;box-shadow:3px 3px 0 var(--tx)}
#cp .c25 .hdr .mhint.go{display:block;animation:c25mh 4s steps(4) 1 forwards}
@keyframes c25mh{0%,80%{opacity:1}100%{opacity:0}}
#cp .c25 .mx.ch{border-color:var(--acc);color:var(--acc)}
#cp .c25 .win{pointer-events:none}
#cp .c25 .rd{position:absolute;left:18px;top:14px;pointer-events:none;max-width:calc(100% - 320px)}
#cp .c25 .rd .big{font-size:70px;line-height:.9;display:block;white-space:nowrap}
#cp .c25 .rd .big i{font-style:normal;font-size:26px;color:var(--dim)}
#cp .c25 .rd .lbl{display:block;color:var(--dim);font-size:16px;margin-top:2px}
#cp .c25 .rd .sub{display:block;color:var(--dim);font-size:18px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c25 .rd .gn{color:var(--acc);font-size:18px;margin-top:6px}
#cp .c25 .rd .meter{display:flex;gap:3px;margin-top:8px;align-items:center}
#cp .c25 .rd .meter s{display:block;width:12px;height:16px;border:1px solid var(--tx);text-decoration:none}
#cp .c25 .rd .meter s.on{background:var(--acc);border-color:var(--acc)}
#cp .c25 .rd .meter em{font-style:normal;margin-left:10px;font-size:22px}
#cp .c25 .chip{position:absolute;right:14px;top:14px;max-width:300px;padding:8px 12px;background:var(--k);border:1px solid var(--tx);text-align:right;pointer-events:none}
#cp .c25 .chip .hd{font-size:24px;line-height:1}
#cp .c25 .chip.hr .hd{color:var(--acc)}
#cp .c25 .chip .sb{font-size:15px;color:var(--dim);margin-top:3px}
#cp .c25 .chip .st{display:inline-block;margin-top:8px;font-family:PS2P,monospace;font-size:12px;letter-spacing:.04em;background:var(--acc);color:var(--k);padding:5px 7px;transform:rotate(-3deg)}
#cp .c25 .rd .sit{color:var(--tx);font-size:15px;margin-top:6px}
#cp .c25 .bsel{position:absolute;left:18px;bottom:12px;right:190px;display:grid;gap:4px;font-size:17px}
#cp .c25.ns .bsel{right:18px}
#cp .c25 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c25 .bsel .r2{color:var(--dim);background:var(--k);justify-self:start;padding:1px 4px 1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c25 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c25 .bsel .bt.hot{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .tly{position:absolute;right:16px;bottom:12px;width:170px;font-size:15px;display:grid;gap:1px;pointer-events:none;text-align:right}
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
#cp .c25 .slice .sfig svg{position:absolute;left:0;top:0}
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
#cp .c25 .lpr b{font-weight:400;color:var(--acc)}
#cp .c25 .lpr span{overflow:hidden;text-overflow:ellipsis}
#cp .c25 .lpr .wh{color:var(--dim)}
#cp .c25 .sel{display:grid;gap:3px;font-size:16px}
#cp .c25 .sbar{display:flex;height:12px;border:1px solid var(--tx);margin:2px 0 6px}
#cp .c25 .sbar i{display:block;height:100%}
#cp .c25 .lpr2{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
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
#cp .c25 .wd sup{color:var(--acc);font-size:10px;margin-left:2px}
#cp .c25 .wd.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c25 .wd.on sup{color:var(--k)}
#cp .c25 .wsum{display:grid;gap:4px}
#cp .c25 .strip{position:relative;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px;padding-bottom:6px}
#cp .c25 .strip .bt{padding:8px 34px 18px 10px;display:flex;flex-direction:column;justify-content:space-between;position:relative;min-width:0}
#cp .c25 .strip .bt .sld{position:absolute;left:10px;right:34px;bottom:4px;height:12px;margin:0;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;pointer-events:auto}
#cp .c25 .strip .bt .sld::-webkit-slider-runnable-track{height:2px;background:var(--dim)}
#cp .c25 .strip .bt .sld::-moz-range-track{height:2px;background:var(--dim)}
#cp .c25 .strip .bt .sld::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:12px;margin-top:-5px;background:var(--acc);border:0;border-radius:0}
#cp .c25 .strip .bt .sld::-moz-range-thumb{width:8px;height:12px;background:var(--acc);border:0;border-radius:0}
#cp .c25 .strip .bt.arm .sld::-webkit-slider-runnable-track{background:var(--k)}
#cp .c25 .strip .bt .ps{color:var(--dim);white-space:nowrap}
#cp .c25 .strip .bt.arm .ps{color:var(--k)}
#cp .c25 .strip .bt b{font-weight:400;font-size:26px;line-height:.9;white-space:nowrap;overflow:hidden}
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
#cp .c25 .pk{display:grid;grid-template-columns:repeat(10,64px);gap:4px}
#cp .c25 .pk .tile{height:46px}
#cp .c25 .legend{display:grid;grid-template-columns:repeat(4,minmax(240px,1fr));gap:18px 26px}
#cp .c25 .legend h5{margin:0 0 6px;font-weight:400;color:var(--acc)}
#cp .c25 .legend .o{display:grid;grid-template-columns:34px minmax(0,1fr);gap:2px 8px;padding:3px 4px;cursor:pointer;font-size:16px;line-height:1.1;pointer-events:auto}
#cp .c25 .legend .o:hover{background:var(--ln)}
#cp .c25 .legend .o.on{outline:1px solid var(--acc)}
#cp .c25 .legend .o b{font-weight:400;color:var(--acc)}
#cp .c25 .legend .o span{color:var(--dim);grid-column:2}
#cp .c25 .legend .o em{font-style:normal;color:var(--tx);grid-column:2}
#cp .c25 .legend .code{grid-column:1/-1;font-size:22px;margin-bottom:6px}
#cp .c25 .legend .fix{grid-column:1/-1;color:var(--dim);font-size:15px}
#cp .c25 .tys{display:grid;grid-template-columns:repeat(3,minmax(300px,1fr));gap:14px}
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
  css('cp25', SKEL_CSS + THEME_CSS + JUICE_CSS + ART_CSS + LAYOUT_CSS + FRAME_CSS + scaled(BASE) + TYPE_CSS + MENU_CSS + PHONE_CSS)
  root.classList.add('skel')
  window.__cpBead = 3.4
  window.__cpHold = 110 // the hit-stop: the ball waits at the plate for 110 ms before it leaves
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U), ses = makeSession(api)
  const q = new URLSearchParams(location.search)
  const mix = parseMix(q.get('mix') ?? store('nn-mix25') ?? '')
  let life = null, fx = null, menu = null, pitchIn = 0, lastJingle = null, lastR = mix.R || 1, lastMoment = null, water = null, pitchCam = null
  const cs0 = () => getComputedStyle(root)
  let last = null, mode = q.get('mode25') || 'replay', filter = 'giants', idx = 0, edited = false, balls = [], cur = null, bird = q.get('bird') === '1', modal = null, stepped = null

  root.innerHTML = `<div class="c25"><div class="hdr"><div class="h1"><span class="lt"><span class="bt" id="c25mn" aria-label="menu (Esc)">MENU<kbd>ESC</kbd></span><span class="ps" id="c25ti" role="button" title="open the menu">NUKE NAVIGATOR // ${NAMES.replay}</span><span class="mhint" id="c25mh">ESC = MENU, ANY TIME</span></span><span class="rt">
    <span class="grp" id="c25vw">VIEW <span class="bt" id="c25b">BIRD'S EYE</span><span class="bt" id="c25pk">PARK</span></span>
    <span class="grp" id="c25mx">MIX ${HDR_AX.map((k) => `<span class="bt mx" data-ax="${k}"></span>`).join('')}<span class="bt mx" id="c25ty">TYPE</span><span class="bt mx" id="c25lg" aria-label="every option">?</span></span></span></div>
    <div class="h2"><span class="grp"><span class="gl">IN THE PARK</span> <span class="bt" id="c25lp">LANDING PARTY</span><span class="bt" id="c25se">SEAT SEANCE</span><span class="bt" id="c25sc">SHOT CALLER</span><span class="bt" id="c25rc">ODDS RECEIPT</span><span class="bt" id="c25sm">STAR MAP</span></span>
    <span class="grp"><span class="gl">TONIGHT</span> <span class="bt" id="c25bb">BAY BAROMETER</span><span class="bt" id="c25kl">KARL</span></span>
    <span class="grp"><span class="gl">YESTERDAY</span> <span class="bt" id="c25bl">BLAST BULLETIN</span><span class="bt" id="c25dd">DAILY DINGER</span></span>
    <span class="grp"><span class="gl">YOU</span> <span class="bt" id="c25ww">WALLOP WITNESS</span></span></div></div>
  <div class="pnl clear win park" id="c25h"><span class="t">/ O R A C L E &nbsp; P A R K /</span><div class="cflash" id="c25fl"></div>
    <div class="rd" id="c25rd"></div><div class="chip" id="c25v"><div class="hd"></div><div class="sb"></div><div class="st"></div></div><div class="bsel p" id="c25ch"></div><div class="tly" id="c25t"></div><div class="bug" id="c25bug"></div><div class="banner" id="c25bn"></div></div>
  <div class="pnl p pitch"><span class="t">/ T H E &nbsp; P I T C H /</span><div class="pin"><div class="zg" id="c25zg"></div><div class="pl" id="c25pl"></div></div></div>
  <div class="pnl p batter"><span class="t">/ B A T T E R /</span><div class="bin"><div class="fbox" id="c25f"><pre class="art"></pre></div><div class="info" id="c25i"></div><div class="bug bugc" id="c25bugc"></div></div></div>
  <div class="pnl p slice"><span class="t">/ C O N T A C T , &nbsp; S I D E &nbsp; O N /</span><div class="sfig" id="c25sv"></div><div class="cap" id="c25cap"></div></div>
  <div class="pnl p hists" id="c25hi"><span class="t">/ V S &nbsp; A L L /</span><span class="hsw" id="c25hw"><span class="bt" data-w="mlb">ALL</span><span class="bt" data-w="sf">ORACLE</span></span><div id="c25hb"></div></div>
  <div class="ptabs p" id="c25pt">${[['batter', 'BATTER'], ['pitch', 'PITCH'], ['slice', 'CONTACT'], ['hists', 'VS ALL']].map(([k, l]) => `<span class="bt" data-card="${k}">${l}</span>`).join('')}</div>
  <div class="strip p" id="c25sl">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b class="num"></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span>${s.k === 'hand' ? '' : `<input type="range" class="sld" min="0" max="1000" step="1" aria-label="${s.label}">`}</div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div>
  <div class="mod" id="c25m"><div class="box"><span class="bt x" id="c25cl" aria-label="close">CLOSE</span><h3 id="c25mt"></h3><div id="c25mb"></div></div></div></div>`
  const E = (id) => root.querySelector(id), hero = E('#c25h'), grid = E('.c25')
  const setCard = (k) => { grid.dataset.card = k; root.querySelectorAll('#c25pt [data-card]').forEach((b) => b.classList.toggle('on', b.dataset.card === k)); if (last) render(last) }
  root.querySelectorAll('#c25pt [data-card]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setCard(b.dataset.card) }))
  setCard(q.get('card') ?? 'batter')

  // ---- the park wireframe: W1 GHOST ----
  const showWire = () => {
    api.NN.setDuo(null)
    const cs = getComputedStyle(root), t = { tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim(), acc: cs.getPropertyValue('--acc').trim() }
    api.NN.setPix({ pix: 0, mode: 0 })
    const rich = { fatHeavy: 1.8, faintAngle: 40, faintMin: 0.8, marks: true, wall: (b) => api.wallAt?.(b), accent: t.acc, stands: 'ghost', fun: true, step: 6, contourOuter: 40 }
    api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built, ...rich })
    showWire.built = true
  }
  // no hover tilt on buttons or panels (28 Oct, Andrew: 'super distracting'); a press still sinks the button
  let syncCam = null
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], top: [[0.3, 300, -50], [0.3, 0, -62]] }
  const camTo = (k) => { const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); E('#c25b').classList.toggle('on', k === 'top') }
  setTimeout(() => camTo(bird ? 'top' : 'home'), 60)
  const flipBird = () => { bird = !bird; camTo(bird ? 'top' : 'home') }
  E('#c25b').addEventListener('click', () => { pressEl(E('#c25b')); flipBird() })

  const [parks, R, pool, D, facesRaw] = await Promise.all([loadParks(), loadReplay(), loadPool(), loadDists(), (async () => { try { const r = await fetch('/faces_tone.json'); return r.ok ? await r.json() : {} } catch { return {} } })()])
  const hasGen = await loadGenericFaces('composite')
  // the histogram panel shows one of: the histograms, LANDING PARTY (L), SEAT SEANCE (G), SHOT CALLER (C), the ODDS RECEIPT (O); the park markers belong to whichever is on
  const lp = landingParty(api, R.balls), se = seatSeance(api), sc = shotCaller(api, R.balls)
  let show = ['lp', 'se', 'sc', 'rc', 'sm'].includes(q.get('show')) ? q.get('show') : 'hist', lpKey = '', lpList = [], seKey = '', seRes = null, scRes = null
  const FEAT = [['#c25lp', 'lp'], ['#c25se', 'se'], ['#c25sc', 'sc'], ['#c25rc', 'rc'], ['#c25sm', 'sm']]
  const setShow = (k) => { show = show === k ? 'hist' : k; for (const [id, m] of FEAT) E(id).classList.toggle('on', show === m); lpKey = seKey = ''; if (show !== 'lp') lp.clear(); if (show !== 'se') se.clear(); if (show !== 'sc') { sc.clear(); scRes = null } if (show !== 'sm') { stars?.clear(); smKey = '' } if (last) render(last) }
  for (const [id, m] of FEAT) { E(id).addEventListener('click', () => { pressEl(E(id)); sound.play('move'); setShow(m) }); E(id).classList.toggle('on', show === m) }
  // a click on the park (not a drag) calls the shot while SHOT CALLER is on
  let down = null
  addEventListener('pointerdown', (e) => { down = e.target?.tagName === 'CANVAS' ? [e.clientX, e.clientY] : null })
  addEventListener('pointerup', (e) => {
    if (show !== 'sc' || !down || e.target?.tagName !== 'CANVAS' || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return
    const spot = sc.pick(e.clientX, e.clientY)
    if (!spot) return
    E('#c25hb').innerHTML = '<div class="lph">CALLING THE SHOT...</div>'
    setTimeout(() => { scRes = sc.call(spot, api.state, getComputedStyle(root).getPropertyValue('--acc').trim()); if (last) render(last) }, 30)
  })
  E('#c25bb').addEventListener('click', () => { pressEl(E('#c25bb')); openMod('bay') })
  const wim = await loadWhatIf() // the what-if model (public/whatif_model.json), if built
  // which park is loaded (?park=TEAM; main.js and dojo.js read the same parameter): its name on the park panel; Oracle-only features hide elsewhere
  const here = parks.parks.find((p) => p.abbr === (window.__parkX ?? 'SF')), atOracle = !here || here.abbr === 'SF'
  const spaced = (t) => '/ ' + t.toUpperCase().split(' ').map((w) => w.split('').join(' ')).join(' &nbsp; ') + ' /'
  if (!atOracle) { hero.querySelector('.t').innerHTML = spaced(here.name); for (const id of ['#c25lp', '#c25se', '#c25sc', '#c25bb', '#c25kl', '#c25sm']) E(id).style.display = 'none'; E('#c25hw [data-w="sf"]').style.display = 'none' }
  E('#c25pk').textContent = 'PARK: ' + (here?.abbr ?? 'SF')
  E('#c25pk').addEventListener('click', () => { pressEl(E('#c25pk')); openMod('parks') })
  const goPark = (abbr) => { const u = new URL(location.href); if (abbr === 'SF') u.searchParams.delete('park'); else u.searchParams.set('park', abbr); u.searchParams.set('mix', mixCode(mix).replace(/ /g, '')); u.searchParams.set('mode25', mode); u.searchParams.set('menu', '0'); if (mode === 'replay') { u.searchParams.set('ball', String(idx)); u.searchParams.set('filter', filter) } else { for (const k of ['ev', 'la', 'dir', 'hand', 'temp']) u.searchParams.set('w' + k, String(api.state[k])) } location.href = u.toString() }
  E('#c25bl').addEventListener('click', () => { pressEl(E('#c25bl')); openMod('bulletin') })
  E('#c25dd').addEventListener('click', () => { pressEl(E('#c25dd')); openMod('dinger') })
  E('#c25ww').addEventListener('click', () => { pressEl(E('#c25ww')); openMod('witness') })
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
    const line = [`${b.tb === 'Top' ? 'TOP' : 'BOTTOM'} ${b.in}`, on === 0 ? 'BASES EMPTY' : on === 3 ? 'BASES LOADED' : on + ' ON', d === 0 ? 'TIED' : (d > 0 ? 'UP ' : 'DOWN ') + Math.abs(d), b.bl != null ? `${b.bl}-${b.sk}` : null, b.ou != null ? `${b.ou} OUT` : null, wpaOf(b) != null ? (b.bwe != null ? `WIN ${Math.round(b.bwe * 100)}% → ${Math.round(Math.max(0, Math.min(1, b.bwe + wpaOf(b))) * 100)}%` : 'WIN CHANCE') + ` (${wpaOf(b) >= 0 ? '+' : '-'}${Math.abs(Math.round(wpaOf(b) * 100))}% WPA)` : null].filter(Boolean).join(' · ')
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
        <div class="wl"><span>WIN CHANCE ${P(w0)}% &rarr; ${P(w1)}%</span><b class="${w >= 0 ? 'up' : 'dn'}" title="how much this swing moved the batting team's chance of winning">${w >= 0 ? '+' : '-'}${Math.abs(P(w))}% WPA</b></div>`
    } else if (w != null) bar = `<div class="wl"><span>WIN CHANCE</span><b class="${w >= 0 ? 'up' : 'dn'}" title="how much this swing moved the batting team's chance of winning">${w >= 0 ? '+' : '-'}${Math.abs(P(w))}% WPA</b></div>`
    return `<div class="br1"><span class="inn">${b.tb === 'Top' ? '&#9650;' : '&#9660;'}${b.in}</span>${dia}${outs}<span class="cnt">${b.bl ?? '-'}-${b.sk ?? '-'}</span>${score}</div>${bar}`
  }
  const seenDays = () => { try { return JSON.parse(store('nn-witness') ?? '[]') } catch { return [] } }
  const big = (b) => { const st = situation(b)?.stamp; return b.hr && (/WALK-OFF|GRAND SLAM/.test(st ?? '') || (st === 'GO-AHEAD' && b.in >= 7)) }
  const filtered = () => (filter === 'big' ? R.balls.filter(big) : filter === 'mine' ? R.balls.filter((b) => b.hr && b.park === 'SF' && seenDays().includes(b.d)) : filter === 'giants' ? R.balls.filter((b) => b.g && b.hr) : filter === 'oracle' ? R.balls.filter((b) => b.park === 'SF' && b.hr) : filter === 'menu' ? R.balls.filter((b) => b.hr && offZone(b)) : R.balls)

  // ---- the mixer ----
  const themeKey = () => { if (atOracle) return 'orange'; const k = 'team' + here.abbr; THEMES[k] ??= { ...THEMES.orange, name: here.abbr, acc: TEAM_ACC[here.abbr] ?? THEMES.orange.acc }; return k }
  function applyMix(changed) {
    for (const k of ['L', 'P', 'F', 'I', 'S']) for (const o of AXES[k].opts) grid.classList.toggle(k + o.c, mix[k] === o.c)
    fx?.setStyle(optOf('F', mix.F).style); if (life) life.gullsOn = mix.F !== 3
    if (fx?.karlOn() && fx.karlLevel() !== mix.K) fx.karl(true, mix.K)
    if (water && water.mode() !== mix.B) water.setMode(mix.B)
    if (mix.R) lastR = mix.R // the R key brings back whichever arrow was last on
    grid.style.setProperty('--pc', optOf('Y', mix.Y).col ?? 'var(--tx)')
    paintTitles()
    menu?.setLogo(mix.M)
    for (const [k, v] of Object.entries(typeVars(optOf('T', mix.T).T))) grid.style.setProperty('--' + k, v)
    if (!changed) { applyTheme(root, api, themeKey(), { park: true }); showWire() }
    root.querySelectorAll('.mx[data-ax]').forEach((b) => { const k = b.dataset.ax, o = optOf(k, mix[k]); b.textContent = k + mix[k]; b.title = `${AXES[k].name}: ${o.name}`; b.setAttribute('aria-label', b.title) })
    store('nn-mix25', mixCode(mix).replace(/ /g, ''))
    if (changed === 'L' || !changed) relayout()
    if (last) render(last)
    if (modal === 'mix' || modal === 'type') paintModal()
  }
  // the three panel titles: pixel icons (I1 to I3, 2 px per pixel) or the old spaced words (I0); the histogram panel keeps the word titles of the features that borrow it
  const wordTitle = (el, h) => { const t = el.querySelector('.t'); t.innerHTML = h; t.dataset.h = ''; t.classList.remove('ic') }
  const titleHTML = (k) => (mix.I ? iconSVG(ICONS[k][mix.I], 2, PANEL_NAMES[k]) : PANEL_WORDS[k])
  function paintTitles() {
    for (const k of ['pitch', 'slice', 'hists']) {
      const t = root.querySelector(`.c25>.${k}>.t`)
      if (k === 'hists' && show !== 'hist') continue
      const h = titleHTML(k); if (t.dataset.h !== h) { t.innerHTML = h; t.dataset.h = h } t.classList.toggle('ic', !!mix.I)
    }
  }
  const relayout = () => requestAnimationFrame(() => { syncCam?.(); camTo(bird ? 'top' : 'home') })
  const stepAx = (k, d) => { const os = AXES[k].opts.filter((o) => !o.hide), n = os.length, i = os.findIndex((o) => o.c === mix[k]); mix[k] = os[(i + d + n) % n].c; applyMix(k); const b = root.querySelector(`.mx[data-ax="${k}"]`); b?.classList.add('ch'); setTimeout(() => b?.classList.remove('ch'), 500) }
  root.querySelectorAll('.mx[data-ax]').forEach((b) => {
    b.addEventListener('click', (e) => { pressEl(b); sound.play('move'); stepAx(b.dataset.ax, e.shiftKey ? -1 : 1) })
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); pressEl(b); stepAx(b.dataset.ax, -1) })
  })
  E('#c25lg').addEventListener('click', () => { pressEl(E('#c25lg')); openMod('mix') })
  E('#c25ty').addEventListener('click', () => { pressEl(E('#c25ty')); openMod('type') })

  function applyBall(b) {
    cur = b; edited = false
    pitchCam?.clear() // the last pitch arc belongs to the last ball
    if (life) { const n = pname(b.b); life.idle(`${(n ? n[0] : 'BATTER ' + b.b).toUpperCase()}  ·  ${b.d}  ·  ${b.ft} FT`) }
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false })
    api.setPreview(true); api.update()
  }
  function setMode(m) {
    mode = m
    if (m === 'replay' && R.balls.length) { stepped = null; balls = filtered(); if (!balls.length) { filter = 'giants'; balls = filtered() } idx = Math.min(idx, balls.length - 1); applyBall(balls[idx]) } else { if (m === 'replay') mode = 'whatif'; cur = null; api.state.carry = 1; api.state.dws = 0; api.state.tab = true; api.setPreview(true); api.update() }
    grid.classList.toggle('ns', mode === 'replay')
    E('#c25ti').textContent = 'NUKE NAVIGATOR // ' + (mode === 'replay' ? NAMES.replay : NAMES.dojo)
    relayout()
    paintChooser()
  }
  // TWEAK THE TATER: carry this home run into the dojo with its own numbers, and a way back to the same ball
  function tweak() {
    if (!cur) return
    const b = cur, from = { idx, filter, b }
    sound.play('pick'); life?.play('tater', {}, 0, true)
    setMode('whatif'); stepped = from
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp })
    api.update(); paintChooser()
  }
  function backToReplay() { const s = stepped; filter = s.filter; idx = s.idx; setMode('replay'); sound.play('back') }
  const step = (d) => { if (mode !== 'replay' || !balls.length) return; idx = (idx + d + balls.length) % balls.length; applyBall(balls[idx]); paintChooser(); sound.play('move') }
  function paintChooser() {
    const el = E('#c25ch')
    if (mode !== 'replay') {
      const sb = stepped ? pname(stepped.b.b) : null
      el.innerHTML = stepped ? `<div class="r1"><span class="bt" id="c25back">BACK TO THE REPLAY</span></div><div class="r2">TWEAKING <b>${(sb ? sb[0] : 'BATTER ' + stepped.b.b).toUpperCase()}</b>, ${stepped.b.d}: SET THE NUMBERS BELOW, ENTER TO SWING</div>` : '<div class="r2">SET THE SWING BELOW, ENTER TO SWING</div>'
      el.querySelector('#c25back')?.addEventListener('click', () => { pressEl(el.querySelector('#c25back')); backToReplay() })
      return
    }
    const bn = pname(cur?.b), pn = pname(cur?.p)
    el.innerHTML = `<div class="r1"><span class="bt" data-st="-1" aria-label="previous ball">&lt;</span><span class="bt" data-st="1" aria-label="next ball">&gt;</span> BALL ${idx + 1} OF ${balls.length}
      ${[['giants', 'GIANTS HR'], ['oracle', 'ORACLE HR'], ['menu', NAMES.offMenu], ['big', 'BIG ONES'], ...(seenDays().length ? [['mine', 'MY GAMES']] : []), ['all', 'ALL']].map(([k, l]) => `<span class="bt${filter === k ? ' on' : ''}" data-f="${k}">${l}</span>`).join('')}<span class="bt hot" id="c25go">PLAY IT</span><span class="bt hot" id="c25tw">${NAMES.tweak}</span></div>
      <div class="r2"><b>${bn ? bn[0].toUpperCase() : 'BATTER ' + cur?.b}</b> V ${pn ? pn[0].toUpperCase() : 'PITCHER'}  ${cur?.d ?? ''}  ${cur?.park === 'SF' ? 'AT ORACLE' : 'AT ' + (cur?.park ?? '')}</div>`
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { pressEl(b); step(Number(b.dataset.st)) }))
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { pressEl(b); sound.play('move'); filter = b.dataset.f; balls = filtered(); idx = 0; applyBall(balls[0]); paintChooser() }))
    E('#c25tw').addEventListener('click', () => { pressEl(E('#c25tw')); tweak() })
    E('#c25go').addEventListener('click', () => { pressEl(E('#c25go')); play() })
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', x.textContent.trim()) }
  }
  const slots = [...root.querySelectorAll('.strip .bt')]
  ctl.els = slots
  ctl.onArm = () => paintSlots()
  ctl.onChange = () => { edited = true; paintSlots() }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => { const d = e.target.closest('i[data-d]'); if (i === 6) { fire(); return } ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d)) })
    el.addEventListener('wheel', (e) => { if (i === 6) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const fire = () => { if (mode === 'replay') { play(); return } pressEl(slots[6]); ses.fire() }
  ctl.bind(fire, 'h')
  const paintSlots = () => slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < 6); if (i < 6) { el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k); const sl = el.querySelector('.sld'); if (sl && document.activeElement !== sl) sl.value = String(Math.round(ctl.frac(ctl.SLOTS[i].k) * 1000)) } })
  // sliders (28 Oct, Andrew: TWEAK THE TATER should have sliders): drag a slot's slider to set it; its keys stay with the slider, not the strip's arrow keys
  slots.forEach((el, i) => { const sl = el.querySelector('.sld'); if (!sl) return; sl.addEventListener('input', () => { ctl.arm(i); ctl.setFrac(i, Number(sl.value) / 1000); ctl.onChange() }); sl.addEventListener('keydown', (e) => e.stopPropagation()); sl.addEventListener('wheel', (e) => e.stopPropagation()) })

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
  const openMod = (k) => { modal = k; E('#c25m').classList.add('open'); paintModal(); if (k === 'moon') life?.play('moon', {}, 0, true) }
  const closeMod = () => { modal = null; E('#c25m').classList.remove('open'); iniCancel?.(); iniCancel = null }
  E('#c25cl').addEventListener('click', closeMod)
  E('#c25m').addEventListener('click', (e) => { if (e.target === E('#c25m')) closeMod() })
  function paintModal() {
    if (!modal) return
    const body = E('#c25mb')
    if (modal === 'mix') {
      E('#c25mt').textContent = '/ O P T I O N S /'
      body.innerHTML = `<div class="legend"><div class="code num">${mixCode(mix)}</div><div class="fix">SET: C1 ORANGE AT ORACLE (ANOTHER PARK TAKES ITS TEAM'S COLOR) · W1 GHOST LINES · V3 METER · YOUR 28 OCT PICKS ARE THE DEFAULTS (L2 P5 A2 T1). CLICK AN OPTION TO TRY IT.</div>` + ORDER.map((k) => `<div><h5>${k} ${AXES[k].name}</h5>${AXES[k].opts.filter((o) => !o.hide || mix[k] === o.c).map((o) => `<div class="o${mix[k] === o.c ? ' on' : ''}" data-k="${k}" data-i="${o.c}"><b>${k}${o.c}</b>${o.name}<span>${o.desc}</span>${o.why && o.c > 1 ? `<em>WHY: ${o.why.toUpperCase()}</em>` : ''}</div>`).join('')}</div>`).join('') + '</div>'
      body.querySelectorAll('.o').forEach((o) => o.addEventListener('click', () => { mix[o.dataset.k] = Number(o.dataset.i); sound.play('move'); applyMix(o.dataset.k) }))
      return
    }
    if (modal === 'type') { paintTypes(body); return }
    if (modal === 'moon') { paintMoon(body); return }
    if (modal === 'bay') { paintBay(body); return }
    if (modal === 'bulletin' || modal === 'dinger') { paintDaily(body); return }
    if (modal === 'witness') { if (!body.querySelector('.wgrid') || !paintModal.keepW) paintWitness(body); paintModal.keepW = true; return }
    paintModal.keepW = false
    if (!last) return
    if (modal === 'parks') {
      E('#c25mt').textContent = '/ T H I R T Y   P A R K S /'
      const pr = evalParks(parks, api)
      body.innerHTML = `<div style="font-size:20px;margin-bottom:10px;color:var(--acc)">GONE IN ${U.goneWord(parks, api, pr)} PARKS</div><div class="pk">${tileHTML(pr)}</div><div class="baya">CLICK A PARK TO FLY THIS BALL THERE.</div>`
      body.querySelectorAll('.pk .tile').forEach((t, i) => { t.style.cursor = 'pointer'; t.style.pointerEvents = 'auto'; t.addEventListener('click', () => goPark(pr[i].p.abbr)) })
    } else {
      E('#c25mt').textContent = '/ E V E R Y   S T A T /'
      body.innerHTML = `<div class="allst">${statCols(last).map(([h, rows]) => `<div><h5>${h}</h5>${rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')}</div>`).join('')}</div>`
    }
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
      <div class="r mo"><span>DEEP SPACE</span><b class="y">FOREVER</b><span>IT NEVER COMES DOWN</span></div></div>
      ${phrase ? `<div class="dds">${phrase}</div>` : ''}<div class="baya">THE MOON, MARS AND JUPITER ARE FLOWN WITH NO AIR, FROM A 3 FT CONTACT HEIGHT. EVERYTHING ELSE GOES THROUGH THE FLIGHT ENGINE.</div></div>`
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
  const REF = { ev: 103, la: 28, dir: 0, hand: 1, wind: 0, carry: 1, dws: 0, tab: true }
  const carryFt = (t, hpa) => api.fly({ ...api.state, ...REF, temp: t }, { hPa: hpa }).landFt
  const compass = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8]
  const nowRow = (B) => { const H = B.hourly, i0 = Math.max(0, H.time.findIndex((t) => new Date(t).getTime() > Date.now() - 3600e3)); return { i0, low: H.cloud_cover_low[i0], vis: H.visibility[i0] } }
  const karlIn = (B) => { const r = nowRow(B); return r.low >= 60 || r.vis < 5000 }
  function paintBay(body) {
    E('#c25mt').textContent = '/ B A Y   B A R O M E T E R /'
    if (!bay || bay instanceof Promise) { body.innerHTML = '<div class="bay">READING THE BAY...</div>'; Promise.resolve(getBay()).finally(() => { if (modal === 'bay') paintBay(E('#c25mb')) }); return }
    if (bay.error) { body.innerHTML = '<div class="bay">COULD NOT REACH OPEN-METEO. TRY AGAIN LATER.</div>'; bay = null; return }
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
      body.innerHTML = `<div class="bul">${head}<div class="ddbig num">${you > model ? 'YOU BEAT THE MODEL' : you === model ? 'DEAD HEAT WITH THE MODEL' : 'THE MODEL WINS TODAY'}</div>${picks.map((b, k) => `<div class="lpr2"><span>${k + 1}. ${b.name.toUpperCase()}, ${b.ft} FT</span><b>${b.hr ? 'GONE' : 'NOT GONE'} · YOU ${st.a[k] === !!b.hr ? 'RIGHT' : 'WRONG'} · MODEL ${pct(b.odds)}%</b></div>`).join('')}<div class="baya">A NEW SET ARRIVES WITH EACH NIGHT'S GAMES.</div></div>`
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
  // ---- WALLOP WITNESS: tick the Oracle Park games you were at; every home run you saw, the longest, and all of them laid end to end (kept in this browser, nn-witness)
  let lib = null
  loadLibrary().then((l) => { lib = l }).catch(() => {})
  const oracleHR = R.balls.filter((b) => b.park === 'SF' && b.hr)
  const gamesAt = [...new Set(oracleHR.map((b) => b.d))].sort().reverse()
  function paintWitness(body) {
    E('#c25mt').textContent = '/ W A L L O P   W I T N E S S /'
    let seen = []
    try { seen = JSON.parse(store('nn-witness') ?? '[]') } catch {}
    const mine = oracleHR.filter((b) => seen.includes(b.d)).sort((a, b) => b.ft - a.ft)
    const feet = mine.reduce((s, b) => s + b.ft, 0)
    let phrase = ''
    if (lib && feet) { const p = pick(lib, 'length', feet * 0.3048, mulberry32(feet)); if (p) phrase = 'LAID END TO END: ' + p.phrase.toUpperCase() }
    const byMonth = {}
    for (const d of gamesAt) (byMonth[d.slice(0, 7)] ??= []).push(d)
    const n = (d) => oracleHR.filter((b) => b.d === d).length
    body.innerHTML = `<div class="bul"><div class="bulh">TICK THE ORACLE PARK GAMES YOU WERE AT (EVERY GAME WITH A HOME RUN SINCE JULY 2023)</div>
      <div class="wsum"><div class="ddbig num">${mine.length} HOME RUN${mine.length === 1 ? '' : 'S'} SEEN</div>
      <div class="dds">${mine.length ? `${feet.toLocaleString()} FT IN ALL. LONGEST: ${(pname(mine[0].b)?.[0] ?? 'BATTER ' + mine[0].b).toUpperCase()}, ${mine[0].ft} FT ON ${mine[0].d}.` : 'NONE YET.'}</div>${phrase ? `<div class="dds">${phrase}</div>` : ''}</div>
      <div class="wgrid">${Object.entries(byMonth).map(([m, ds]) => `<div class="wm"><span>${new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span><div>${ds.map((d) => `<span class="bt wd${seen.includes(d) ? ' on' : ''}" data-d="${d}" title="${n(d)} HOME RUN${n(d) === 1 ? '' : 'S'}">${Number(d.slice(8))}<sup>${n(d)}</sup></span>`).join('')}</div></div>`).join('')}</div></div>`
    body.querySelectorAll('.wd').forEach((x) => x.addEventListener('click', () => { const d = x.dataset.d; seen = seen.includes(d) ? seen.filter((y) => y !== d) : [...seen, d]; store('nn-witness', JSON.stringify(seen)); sound.play('move'); paintWitness(body) }))
  }
  function statCols(res) {
    const s = api.state, b = cur, v = res.verdict, bn = b ? pname(b.b) : null, pn = b ? pname(b.p) : null, o = odds()
    const runners = b ? [b.r1 ? '1B' : '', b.r2 ? '2B' : '', b.r3 ? '3B' : ''].filter(Boolean).join(' ') || 'NONE' : '--'
    const pr = parks.parks.length ? evalParks(parks, api) : [], gone = pr.length ? U.goneWord(parks, api, pr) : '--'
    return [
      ['GAME', [['BATTER', bn ? `${bn[0]}${bn[1] ? ' #' + bn[1] : ''}` : b ? '#' + b.b : 'YOUR SWING'], ['BATS', b ? b.s : s.hand > 0 ? 'R' : 'L'], ['PITCHER', pn ? pn[0] : '--'], ['THROWS', b?.t ?? '--'], ['DATE', b?.d ?? '--'], ['PARK', b ? (b.park === 'SF' ? 'ORACLE PARK' : b.park) : 'ORACLE PARK'], ['INNING', b ? `${b.tb === 'Top' ? 'TOP' : 'BOT'} ${b.in ?? '--'}` : '--'], ['COUNT', b && b.bl != null ? `${b.bl}-${b.sk}` : '--'], ['OUTS', f(b?.ou, 0)], ['RUNNERS ON', runners], ['SCORE (BAT-FLD)', b && b.bsc != null ? `${b.bsc}-${b.fsc}` : '--'], ['TIME THROUGH ORDER', f(b?.tto, 0)], ['BATTER AGE', f(b?.agb, 0)], ['PITCHER AGE', f(b?.agp, 0)]]],
      ['PITCH', [['TYPE', b ? PITCH[b.pt] ?? b.pt ?? '--' : '--'], ['SPEED', f(b?.pv, 1, ' MPH')], ['EFFECTIVE SPEED', f(b?.eff, 1, ' MPH')], ['SPIN RATE', f(b?.rpm, 0, ' RPM')], ['SPIN TILT', b ? clock(b.ax) : '--'], ['SPIN AXIS', f(b?.ax, 0, '°')], ['RELEASE SIDE', f(b?.rx, 2, ' FT')], ['RELEASE HEIGHT', f(b?.rz, 2, ' FT')], ['EXTENSION', f(b?.ext, 1, ' FT')], ['ARM ANGLE', f(b?.arm, 0, '°')], ['PLATE X', f(b?.px, 2, ' FT')], ['PLATE Z', f(b?.pz, 2, ' FT')], ['ZONE', f(b?.zn, 0)], ['SIDE BREAK', b && b.hx != null ? `${b.hx.toFixed(1)} IN` : '--'], ['VERTICAL BREAK', b && breakOf(b) ? `${breakOf(b).v.toFixed(1)} IN` : '--'], ['INDUCED VERTICAL BREAK', b && b.hz != null ? `${b.hz.toFixed(1)} IN` : '--'], ['APPROACH ANGLE', f(b?.vaa, 1, '°')]]],
      ['SWING AND CONTACT', [['BAT SPEED', f(b?.bs, 1, ' MPH')], ['SWING LENGTH', f(b?.sl, 1, ' FT')], ['ATTACK ANGLE', f(b?.aa, 1, '°')], ['ATTACK DIRECTION', f(b?.ad, 1, '°')], ['SWING TILT', f(b?.tilt, 0, '°')], ['INTERCEPT X / Y', b && b.ix != null ? `${b.ix.toFixed(1)} / ${b.iy?.toFixed(1)} IN` : '--'], ['EXIT SPEED', `${(b?.ev ?? s.ev).toFixed(1)} MPH`], ['LAUNCH ANGLE', `${(b?.la ?? s.la).toFixed(1)}°`], ['GAP (LAUNCH - ATTACK)', b?.aa != null ? `${(b.la - b.aa).toFixed(1)}°` : '--'], ['LANDING BEARING', `${(b?.dir ?? s.dir).toFixed(1)}°`], ['HIT LOCATION', f(b?.hl, 0)], ['BALL TYPE', b?.bbt ? b.bbt.replace(/_/g, ' ').toUpperCase() : '--'], ['CONTACT QUALITY', b?.lsa ? LSA[b.lsa] ?? b.lsa : '--']]],
      ['RESULT AND VALUE', [['OUTCOME', b ? (b.ev_ ?? '').replace(/_/g, ' ').toUpperCase() : '--'], ['HOME RUN ODDS', o.p != null ? pct(o.p) + '%' : '--'], ['ODDS FROM', o.src], ['PROJECTED DISTANCE', b ? `${b.ft} FT` : '--'], ['EXPECTED AVG', f(b?.xba, 3)], ['EXPECTED WOBA', f(b?.xw, 3)], ['EXPECTED SLG', f(b?.xs, 3)], ['RUN VALUE', b?.dre != null ? (b.dre >= 0 ? '+' : '') + b.dre.toFixed(3) : '--'], ['WIN VALUE', b?.dwe != null ? (b.dwe >= 0 ? '+' : '') + (b.dwe * 100).toFixed(1) + '%' : '--'], ['ENGINE VERDICT', v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL' : 'IN PLAY'], ['PARKS WHERE GONE', gone], ['WALL HERE', v.wallFt ? `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT HIGH` : '--'], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(1)} FT` : '--']]],
      ['FLIGHT AND AIR', [['SIMULATED DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(2)} S`], ['CARRY FACTOR', b ? b.carry.toFixed(3) : '1.000'], ['SIDE SPIN OFFSET', b ? `${b.dws} RPM` : '0 RPM'], ['AIR DENSITY', res.rho.toFixed(3)], ['TEMPERATURE', `${Math.round(s.temp)} F`], ['HUMIDITY', f(b?.rh, 0, '%')], ['PRESSURE', f(b?.hpa, 0, ' HPA')], ['WIND', b?.wm != null ? `${b.wm} MPH` : '--'], ['WIND DIRECTION', f(b?.wd, 0, '°')], ['GUSTS', f(b?.wg, 0, ' MPH')], ['BACKSPIN (PRIOR)', `${Math.round(res.wb)} RPM`], ['SIDE SPIN (PRIOR)', `${Math.round(res.ws)} RPM`]]],
    ]
  }

  // ---- the SELECT menu (Esc or MENU opens it) and attract mode (idle on the menu: the park replays the longest home runs behind it) ----
  const attract = () => {
    if (mode !== 'replay' || !balls.length) return
    const long = balls.map((b, i) => [b, i]).filter(([b]) => b.ft >= 420)
    const [b, i] = long.length ? long[Math.floor(Math.random() * long.length)] : [balls[0], 0]
    idx = i; applyBall(b); paintChooser()
    setTimeout(() => api.fire(), 300)
  }
  menu = selectMenu(grid, [
    { k: 'replay', name: NAMES.replay, blurb: 'EVERY REAL HOME RUN SINCE JULY 2023, FLOWN AGAIN', run: () => setMode('replay') },
    { k: 'dojo', name: NAMES.dojo, blurb: 'SET THE SWING YOURSELF AND SEND IT', run: () => setMode('whatif') },
    { k: 'dinger', name: 'DAILY DINGER', blurb: "CALL YESTERDAY'S FIVE CLOSEST BALLS AGAINST THE MODEL", run: () => openMod('dinger') },
    { k: 'bulletin', name: 'BLAST BULLETIN', blurb: "YESTERDAY'S HOME RUNS, AND WHICH WOULD BE GONE AT ORACLE", run: () => openMod('bulletin') },
    { k: 'witness', name: 'WALLOP WITNESS', blurb: 'TICK THE GAMES YOU WERE AT, SEE WHAT YOU SAW', run: () => openMod('witness') },
    { k: 'bay', name: 'BAY BAROMETER', blurb: "TONIGHT'S AIR AT ORACLE, IN FEET OF CARRY", run: () => openMod('bay'), off: () => !atOracle },
    { k: 'parks', name: 'THIRTY PARKS', blurb: 'FLY THIS BALL IN ANY BALLPARK', run: () => openMod('parks') },
    { k: 'reel', name: 'HIGHLIGHT REEL', blurb: 'THE WALK-OFFS, GRAND SLAMS AND LATE GO-AHEAD SHOTS, BACK TO BACK', run: () => startReel() },
    { k: 'moon', name: 'MOONSHOT', blurb: 'THIS SWING ON THE MOON, ON MARS, AT COORS AND UNDER THE COVE', run: () => openMod('moon') },
    { k: 'options', name: 'OPTIONS', blurb: 'LAYOUT, ART, TYPE, ICONS, LANDING, FOG, WATER, CAMERA', run: () => openMod('mix') },
  ], { onIdle: attract, onClose: () => { if (store('nn-mhint25') === '1') return; store('nn-mhint25', '1'); const h = E('#c25mh'); h.classList.remove('go'); void h.offsetWidth; h.classList.add('go') } })
  // three ways in (Andrew, 28 Oct: he could not find it): the MENU button with its ESC keycap, the title next to it, and Esc
  const openMenu = (el) => { if (el) pressEl(el); sound.play('pick'); menu.show(mode === 'replay' ? 'replay' : 'dojo') }
  E('#c25mn').addEventListener('click', () => openMenu(E('#c25mn')))
  E('#c25ti').addEventListener('click', () => openMenu(null))

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Escape') { if (modal) closeMod(); else { sound.play('back'); menu.show(mode === 'replay' ? 'replay' : 'dojo') } }
    else if (modal) return
    else if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'b' || e.key === 'B') flipBird()
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
    else if (e.key === 'a' || e.key === 'A') openMod('stats')
    else if (e.key === '?') openMod('mix')
    else if (e.key === 't' || e.key === 'T') openMod('type')
    else if (e.key === 'l' || e.key === 'L') setShow('lp')
    else if (e.key === 'g' || e.key === 'G') setShow('se')
    else if (e.key === 'o' || e.key === 'O') setShow('rc')
    else if (e.key === 'w' || e.key === 'W') openMod('bay')
    else if (e.key === 'c' || e.key === 'C') setShow('sc')
    else if (e.key === 'k' || e.key === 'K') toggleKarl()
    else if (e.key === 's' || e.key === 'S') { sound.set(!sound.on()); sound.play('move') }
    else if ((e.key === 'x' || e.key === 'X') && mode === 'replay') tweak()
    else if (e.key === 'p' || e.key === 'P') printIt()
    else if (e.key === 'n' || e.key === 'N') setShow('sm')
    else if (e.key === 'z' || e.key === 'Z') { mix.Z = mix.Z === 2 ? 1 : 2; sound.play('move'); applyMix('Z'); banner(mix.Z === 2 ? 'PUSH ON' : 'PUSH OFF', 'THE CAMERA ' + (mix.Z === 2 ? 'EASES TO THE LANDING' : 'STAYS PUT') + ' (Z)') }
    else if (e.key === 'r' || e.key === 'R') { mix.R = mix.R ? 0 : lastR || 1; sound.play('move'); applyMix('R') }
    else if (e.key === 'u' || e.key === 'U') openMod('moon')
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
  let faceKey = ''
  function paintBatter() {
    const s = api.state, id = cur ? String(cur.b) : stepped ? String(stepped.b.b) : null, bat = id ? pname(id) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const real = id && facesRaw[id], gen = !real && id && hasGen ? genericFace('composite', id) : null
    const src = real ? faceSource(facesRaw[id]) : gen ? gen.src : drawBust(160)
    const box = E('#c25f'), enh = real ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : gen ? gen.enh : {}, cvs = optOf('A', mix.A).canvas
    let cv = box.querySelector('canvas')
    if (cvs) {
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
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : 'YOUR SWING'
    E('#c25i').innerHTML = `<b>${name.toUpperCase()}</b><span>${bat?.[1] ? '#' + bat[1] + ' · ' : ''}${hand}</span>
      <div class="row"><span class="bt" id="c25bs">STATS</span><span class="bt" id="c25pr">PRINT IT</span></div>`
    E('#c25bs').addEventListener('click', () => { pressEl(E('#c25bs')); openMod('stats') })
    E('#c25pr').addEventListener('click', () => { pressEl(E('#c25pr')); printIt() })
  }
  // CONTACT, SIDE ON
  function paintSide() {
    const s = api.state, box = E('#c25sv'), real = mode === 'replay' && cur && !edited
    const o = real ? { real: true, pz: cur.pz, st: cur.st, sb: cur.sb, vaa: cur.vaa, pv: cur.pv, aa: cur.aa, bs: cur.bs, la: cur.la, ev: cur.ev } : { real: false, pz: 2.4, st: 3.4, sb: 1.6, la: s.la, ev: s.ev }
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
    const px = Math.max(-xr + 0.06, Math.min(xr - 0.06, b.px)), pz = Math.max(zb + 0.06, Math.min(zt - 0.06, b.pz)), rr = Math.max(5, 0.121 * S)
    if (off) { const ex = Math.max(-zl, Math.min(zl, px)), ez = Math.max(sb, Math.min(st, pz)); g += `<line x1="${X(px).toFixed(1)}" y1="${Y(pz).toFixed(1)}" x2="${X(ex).toFixed(1)}" y2="${Y(ez).toFixed(1)}" stroke="var(--acc)" stroke-width="2" stroke-dasharray="3 3"/>` }
    g += moveArrow(b, X, Y, X(px), Y(pz), S, W, H, rr)
    g += `<rect class="pb" style="--dx:${(cx - X(px)).toFixed(1)}px;--dy:${(Y((st + sb) / 2) - Y(pz)).toFixed(1)}px" x="${(X(px) - rr).toFixed(1)}" y="${(Y(pz) - rr).toFixed(1)}" width="${(2 * rr).toFixed(1)}" height="${(2 * rr).toFixed(1)}" fill="var(--acc)" stroke="var(--k)" stroke-width="1.5"/>`
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">${g}</svg>`
  }
  // the pitch arrow (R, redone 28 Oct: Andrew wants the movement the pitch had, not an as-if-spinless one): its break over the last 40 ft, at true scale on the zone,
  // sideways and vertical with gravity left in (breakOf, pitchcam25.js), catcher's view, in the pitch color (Y). R1 is one arrow from where the pitch was headed 40 ft out
  // to where it crossed; R2 is the same as its two parts, sideways then down (or up); R3 is the path itself over its last 40 ft. Far ends are clipped at the box edge.
  function moveArrow(b, X, Y, bx, by, S, W, H, rr) {
    const k = breakOf(b)
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
      const P = pitchPath(b)
      if (!P) return ''
      const pts = P.pts.filter((p) => p[1] / 0.3048 <= 40).map((p) => [X(p[0] / 0.3048), Y(p[2] / 0.3048)]).filter(([x, y]) => inBox(x, y) && Math.hypot(x - bx, y - by) > gap)
      pts.forEach(([x, y], i) => { const sz = 2 + (2 * i) / Math.max(1, pts.length - 1); g += `<rect x="${(x - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="var(--pc)"/>` })
    }
    return `<g class="pa" data-r="${mix.R}" data-dx="${dx.toFixed(1)}" data-dy="${dy.toFixed(1)}">${g}</g>`
  }
  function paintPitch() {
    const b = cur, zg = E('#c25zg'), pl = E('#c25pl')
    if (mode !== 'replay' || !b) {
      zg.innerHTML = ''; zg.style.display = 'none'
      const o = odds()
      pl.innerHTML = `<div class="none"><b>NO PITCH FOR A DOJO SWING</b><br>THE BALL IS NOT TIED TO A PITCH.<br>HOME RUN ODDS <b>${pct(o.p)}%</b> FROM ${o.src}</div>`
      return
    }
    zg.style.display = ''
    const off = offZone(b), pn = pname(b.p), bk = breakOf(b)
    zg.innerHTML = zone(b, zg.clientWidth || 136, zg.clientHeight || 120, off)
    zg.classList.toggle('anim', performance.now() - pitchIn < 700)
    // most important first: rows drop from the end when the panel is short
    const rows = [['SPEED', f(b.pv, 1, ' MPH')], ['SPIN', f(b.rpm, 0, ' RPM')], ['BREAK', bk ? `${Math.abs(bk.h).toFixed(0)} IN ${(b.t === 'L' ? bk.h > 0 : bk.h < 0) ? 'ARM' : 'GLOVE'} SIDE` : '--'], [bk && bk.v > 0 ? 'RISE' : 'DROP', bk ? `${Math.abs(bk.v).toFixed(0)} IN` : '--'], ['APPROACH', f(b.vaa, 1, '°')], ['COUNT', b.bl != null ? `${b.bl}-${b.sk}` : '--'],
      ['PITCHER', pn ? pn[0].toUpperCase() : '--', 1], ['THROWS', b.t === 'L' ? 'LEFT' : b.t === 'R' ? 'RIGHT' : '--'], ['HEIGHT', f(b.pz, 2, ' FT')], ['SIDE', f(b.px, 2, ' FT')], ['SPIN TILT', clock(b.ax)], ['EFFECTIVE', f(b.eff, 1, ' MPH')], ['EXTENSION', f(b.ext, 1, ' FT')], ['RELEASE H', f(b.rz, 2, ' FT')], ['ARM ANGLE', f(b.arm, 0, '°')]]
    const tag = off ? (b.hr ? `<div class="om"><b>${NAMES.offMenu}: ${off.word}</b>${off.inches.toFixed(1)} IN ${off.side}</div>` : `<div class="om">OUT OF THE ZONE: ${off.inches.toFixed(1)} IN ${off.side}</div>`) : ''
    pl.innerHTML = `<div class="hd">${(PITCH[b.pt] ?? b.pt ?? 'PITCH').toUpperCase()}</div>` + tag + rows.map(([a, c, wide]) => `<div class="r${wide ? ' wide' : ''}"><span>${a}</span><b>${c}</b></div>`).join('')
    const rs = [...pl.querySelectorAll('.r')]
    for (let n = rs.length; n > 2 && pl.scrollHeight > pl.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // LANDING PARTY in the shared panel: the real Oracle home runs most like this ball, numbered as in the park
  function paintLanding(res) {
    const s = api.state, el = E('#c25hi'), hb = E('#c25hb'), bear = res.landB ?? s.dir
    wordTitle(el, '/ L A N D I N G &nbsp; P A R T Y /')
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(bear * 2), cur ? cur.d + cur.b : 'w'].join()
    if (key !== lpKey) { lpKey = key; lpList = lp.show({ ev: s.ev, la: s.la, bear, self: cur }, getComputedStyle(root).getPropertyValue('--acc').trim()) }
    hb.innerHTML = `<div class="lpl"><div class="lph">THE ${lpList.length} ORACLE HOME RUNS MOST LIKE THIS ONE (OF ${lp.count()} SINCE JULY 2023)</div>` + lpList.map((x) => { const n = pname(x.b.b); return `<div class="lpr"><b>${x.n}</b><span class="nm">${(n ? n[0] : 'BATTER ' + x.b.b).toUpperCase()}</span><span>${x.b.d}</span><span>${x.b.ft} FT</span><span class="wh">${x.where}</span></div>` }).join('') + '</div>'
    const rs = [...hb.querySelectorAll('.lpr')]
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // SEAT SEANCE in the shared panel: where 300 ghosts of this ball come down, by outcome and by zone
  function paintSeance() {
    const s = api.state, el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ S E A T &nbsp; S E A N C E /')
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(s.dir * 2), Math.round(s.temp), s.wind, s.hand, s.carry, s.dws].join()
    if (key !== seKey) { seKey = key; const cs = getComputedStyle(root); seRes = se.run({ ...s }, { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim() }) }
    const r = seRes, P = (n) => Math.round((100 * (n || 0)) / r.N), seg = [['HOME RUN', r.homers, 'var(--acc)'], ['OFF THE WALL', r.tally.WALL, 'var(--tx)'], ['IN PLAY', r.tally.PLAY, 'var(--dim)'], ['FOUL', r.tally.FOUL, 'var(--ln)']]
    hb.innerHTML = `<div class="sel"><div class="lph">${r.N} GHOSTS OF THIS BALL, SPREAD BY WHAT THE MODEL CANNOT KNOW AT CONTACT</div><div class="sbar">${seg.map(([, n, c]) => `<i style="width:${(100 * (n || 0)) / r.N}%;background:${c}"></i>`).join('')}</div>` + seg.map(([l, n]) => `<div class="lpr2"><span>${l}</span><b>${P(n)}%</b></div>`).join('') + (r.tally.SPLASH ? `<div class="lpr2"><span>SPLASH INTO MCCOVEY COVE</span><b>${P(r.tally.SPLASH)}%</b></div>` : '') + (r.zones.length ? `<div class="lph" style="margin-top:6px">HOME RUNS LAND IN</div>` + r.zones.slice(0, 3).map(([z, n]) => `<div class="lpr2"><span>${z}</span><b>${Math.round((100 * n) / Math.max(r.homers, 1))}%</b></div>`).join('') : '') + '</div>'
    const rs = [...hb.querySelectorAll('.lpr2')]
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  function paintShot() {
    const el = E('#c25hi'), hb = E('#c25hb')
    wordTitle(el, '/ S H O T &nbsp; C A L L E R /')
    if (!scRes) { hb.innerHTML = '<div class="sel"><div class="lph">CLICK A SPOT IN THE STANDS, THE ARCADE OR THE COVE.</div><div class="lph">SHOT CALLER FINDS THE SWINGS THAT PUT A BALL THERE, AND THE REAL HOME RUNS THAT CAME DOWN CLOSEST.</div></div>'; return }
    const r = scRes, side = (b) => (Math.abs(b) < 1 ? 'DEAD CENTER' : `${Math.abs(b).toFixed(0)}° ${b < 0 ? 'LEFT' : 'RIGHT'}`)
    const sw = (p, l) => `<div class="lpr2"><span>${l}</span><b>${p.ev} MPH AT ${p.la}°, AIMED ${side(p.dir)}</b></div>`
    hb.innerHTML = `<div class="sel"><div class="lph">SPOT: ${Math.round(r.spot.ft)} FT OUT, ${side(r.spot.bearing)}, ${Math.round(r.spot.height)} FT UP</div>` +
      (r.picks.length ? `<div class="lpr2"><span>SWINGS THAT GET THERE</span><b>${r.found}</b></div>` + sw(r.picks[0], 'SOFTEST') + (r.picks[1] ? sw(r.picks[1], 'TYPICAL') : '') + (r.picks[2] ? sw(r.picks[2], 'HARDEST') : '') : '<div class="lpr2"><span>NO SWING IN THE GRID GETS THERE</span><b>--</b></div>') +
      '<div class="lph" style="margin-top:6px">CLOSEST REAL ORACLE HOME RUNS</div>' + r.near.map((n) => { const nm = pname(n.b.b); return `<div class="lpr2"><span>${(nm ? nm[0] : 'BATTER ' + n.b.b).toUpperCase()} ${n.b.d}</span><b>${Math.round(n.d / 0.3048)} FT AWAY</b></div>` }).join('') + '</div>'
    const rows = [...hb.querySelectorAll('.lpr2')]
    for (let n = rows.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rows[n - 1].style.display = 'none'
  }
  // ODDS RECEIPT (a mockup to judge): the what-if model's odds built up one input at a time, from an ordinary fly ball at this park to this one. Each line is
  // how many points that input moved the odds, given the ones above it (so the order matters and the lines add up exactly).
  function paintReceipt(res) {
    const el = E('#c25hi'), hb = E('#c25hb'), s = api.state
    wordTitle(el, '/ O D D S &nbsp; R E C E I P T /')
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
    const key = `<div class="key"><i class="kb"></i>BALLS <i class="kl"></i>SHARE OF THEM THAT WENT OUT <i class="kd"></i>AVERAGE <i class="ka"></i>THIS BALL</div><div class="key">${n} BALLS IN PLAY ${oracle ? 'AT ORACLE' : 'IN ALL 30 PARKS'}, 2023-25. HOVER A BAR FOR ITS NUMBERS.</div>`
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
    wordTitle(el, '/ S T A R &nbsp; M A P /')
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
    E('#c25hw').style.display = show === 'hist' ? '' : 'none'
    if (show === 'sm') { paintStars(); return }
    if (show === 'lp') paintLanding(res); else if (show === 'se') paintSeance(); else if (show === 'sc') paintShot(); else if (show === 'rc') paintReceipt(res); else paintHists(res)
  }
  // the headline: distance big, the twenty-step odds meter under it (V3, his pick); the distance can roll up during a swing
  function paintHead(res) {
    const o = odds(), rd = E('#c25rd'), d = Math.round(res.landFt), pv = !!ses.beat?.preview
    if (!rd.dataset.v) { rd.dataset.v = '3'; rd.innerHTML = `<span class="big num"><span id="c25d">0</span><i> FT</i></span><span class="sub sx"></span><div class="meter">${'<s></s>'.repeat(20)}<em class="num"><span class="op"></span>%</em></div><span class="lbl osrc"></span><div class="gn"></div><span class="sub sit"></span>` }
    const set = (sel, html) => rd.querySelectorAll(sel).forEach((e) => { if (e.innerHTML !== html) e.innerHTML = html })
    set('.sx', `APEX ${Math.round(res.peakFt)} FT &nbsp; HANG ${res.hang.toFixed(1)} S${res.verdict.wallFt ? ` &nbsp; WALL ${Math.round(res.verdict.wallFt)} FT, ${res.verdict.wallH.toFixed(0)} HIGH` : ''}`)
    set('.gn', parks.parks.length ? `GONE IN ${U.goneWord(parks, api, evalParks(parks, api))} PARKS` : '')
    set('.op', pct(o.p))
    set('.sit', mix.S === 2 && mode === 'replay' && cur && !edited ? situation(cur)?.line ?? '' : '')
    set('.osrc', 'HOME RUN ODDS · ' + o.src)
    rd.querySelectorAll('.meter s').forEach((s, i) => s.classList.toggle('on', o.p != null && o.p * 20 > i + 0.5))
    const dEl = E('#c25d')
    if (window.__cpFire || pv || !ses.beat) dEl.textContent = d
    dEl.dataset.v = d
    return o
  }
  function render(res) {
    last = res
    paintHead(res)
    paintPanel(res)
    paintBatter(); paintSide(); paintPitch(); paintSlots(); paintTally(); paintVerdict(false); paintBug(); paintModal()
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
    const live = v ? (v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL BALL' : 'IN PLAY') : ''
    const realSub = mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL' : cur.hr ? 'THE REAL BALL: HOME RUN' : 'THE REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : 'PREVIEW: THE FLIGHT ENGINE'
    chip.querySelector('.hd').textContent = committed ? b.text : live
    chip.querySelector('.sb').textContent = committed ? (b.sub ?? '') : realSub
    const stp = mode === 'replay' && cur && !edited ? situation(cur)?.stamp : null, se = chip.querySelector('.st')
    if (se.textContent !== (stp ?? '')) { se.textContent = stp ?? ''; if (stp) restamp(se) }
    se.style.display = stp ? '' : 'none'
    if (stampIt) restamp(chip.querySelector('.hd'))
  }

  // ---- effects and sound: hit-stop, contact spark and flash, trail, fireworks on a home run, the Cove splash and its kayaks, Karl's fog ----
  const colors = () => { const cs = getComputedStyle(root), gs = getComputedStyle(grid); return { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), pc: gs.getPropertyValue('--pc').trim() } }
  let splashes = Number(store('nn-splash25') ?? 0) || 0
  const banner = (big, small) => { const b = E('#c25bn'); b.innerHTML = `${big}${small ? `<i>${small}</i>` : ''}`; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go') }
  fx = initFx25(api, colors, { sound: (k, a) => sound.play(k, a), cove: atOracle, onCatch: () => { if (pendingSplash) { banner('SPLASH HIT', `#${splashes} · A KAYAK GOT IT`); pendingSplash = false } } })
  let pendingSplash = false
  life = atOracle ? initPark25(api, colors, {}) : null
  water = atOracle ? initWater25(api, { mode: mix.B, ground: cs0().getPropertyValue('--k').trim(), ink: cs0().getPropertyValue('--tx').trim() }) : null
  pitchCam = initPitchArc(api, colors)
  addEventListener('pointerdown', (e) => { if (pitchCam.busy() && e.target?.tagName === 'CANVAS') pitchCam.stop() })
  const moments = initMoments25(api, colors, fx, { sound: (k) => sound.play(k), banner, onBoard: () => life?.play('glitch') })
  // Z2 PUSH: the camera eases toward where the ball came down and back (1.4 s in, 1.6 s held, 1.4 s out); a new swing or a drag ends it at once
  let push = null
  const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2
  function camPush(at) {
    if (mix.Z !== 2 || !at || bird) return
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
  addEventListener('pointerdown', (e) => { if (push && e.target?.tagName === 'CANVAS') endPush() })
  if (life) life.gullsOn = mix.F !== 3
  if (cur) { const n = pname(cur.b); life?.idle(`${(n ? n[0] : 'BATTER ' + cur.b).toUpperCase()}  ·  ${cur.d}  ·  ${cur.ft} FT`) }
  // PLAY IT: a new batter gets their walk-up jingle, the pitch flies into the zone, then the hit-stop and the crack
  function play() {
    if (mode !== 'replay' || !cur) return
    let wait = 560
    if (cur.b !== lastJingle) { lastJingle = cur.b; if (sound.on()) { sound.play('jingle', { id: cur.b }); wait = 1900 } }
    // H1 PITCH ARC: the pitch drawn on the park on its fitted path, then the hit
    setTimeout(() => { pitchIn = performance.now(); paintPitch(); paintSide(); if (!(mix.H && pitchCam.play(cur, () => api.fire()))) setTimeout(() => api.fire(), 560) }, wait - 560)
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
    if (cvs) { const id = cur ? String(cur.b) : stepped ? String(stepped.b.b) : null, rec = id && facesRaw[id], gen = !rec && id && hasGen ? genericFace('composite', id) : null, src = rec ? faceSource(rec) : gen ? gen.src : drawBust(160); faceImg = document.createElement('canvas'); drawFace(faceImg, src, cvs, 300, 300, { ink: cs.getPropertyValue('--tx').trim(), acc: cs.getPropertyValue('--acc').trim() }, 1) }
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
    reel = { i: 0 }
    reelNext()
  }
  function reelNext() {
    if (!reel || mode !== 'replay') { stopReel(); return }
    idx = reel.i % balls.length; applyBall(balls[idx]); paintChooser()
    const st = situation(balls[idx])?.stamp, n = pname(balls[idx].b)
    banner(st ?? 'HOME RUN', `${(n ? n[0] : 'BATTER ' + balls[idx].b).toUpperCase()} · ${balls[idx].d}`)
    setTimeout(() => { if (reel) api.fire() }, 900)
  }
  function stopReel() { reel = null }
  addEventListener('keydown', (e) => { if (reel && e.key === 'Escape') stopReel() }, true)
  addEventListener('pointerdown', (e) => { if (reel && e.target?.tagName === 'CANVAS') stopReel() })
  let fires = 0
  window.__cpOnFire = (ev) => {
    fires++
    endPush()
    // a glove or the sea lion may have taken the last one; and the engine's ball (a 2.4 m radius, so it shows from anywhere) is drawn at 0.42 of that (Andrew: "way too big")
    const bm = api.ballMesh?.(); if (bm) { bm.visible = true; bm.scale.setScalar(0.42) }
    fx.contact(ev)
    life?.clear()
    life?.show('TRACKING', '', cs0().getPropertyValue('--tx').trim())
    const fl = E('#c25fl'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go')
    sound.play('crack', { ev: api.state.ev })
  }
  window.__cpOnFly = (pos, fr) => { fx.fly(pos, fr) }
  let lands = 0
  window.__cpOnLand = (ev) => {
    lands++
    const ft = Math.round(window.__dojo?.landFt ?? 0), hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(ev.key)
    if (reel) { reel.i++; setTimeout(reelNext, 2600) }
    fx.land(ev)
    if (life) { if (ev.key === 'SPLASH') life.show('SPLASH!', `${ft} FT`, null, 2.4); else if (hr) life.show('HOME RUN', `${ft} FT`, null, 2.4); else life.show(`${ft} FT`, ev.key === 'WALL' || ev.key === 'CLOSE' ? 'OFF THE WALL' : ev.key === 'FOUL' ? 'FOUL BALL' : 'IN PLAY', cs0().getPropertyValue('--tx').trim()) }
    if (hr && mix.F !== 3) life?.scatter()
    lastMoment = mix.F === 1 ? moments.land(ev, window.__dojo?.landing?.kind, life?.board.position) : null
    if (life) boardFor(ev, hr, ft)
    camPush(ev.at)
    if (atOracle && ev.at && lastMoment !== 'mitt' && ev.at.x > -75 && ev.at.x < -40 && ev.at.z > -150 && ev.at.z < -118) { fx.bonk(ev.at); banner('BOTTLE BONK', 'OFF THE COKE CORNER'); sound.play('thud') }
    if (ev.key === 'SPLASH') { splashes++; store('nn-splash25', String(splashes)); pendingSplash = true; sound.play('splash'); banner('SPLASH HIT', `#${splashes} IN THIS BROWSER`) }
    else if (['GONE', 'NUKE', 'SCRAPER', 'POLE'].includes(ev.key)) sound.play('fanfare')
    else if (ev.key === 'WALL' || ev.key === 'CLOSE') sound.play('thud')
  }
  // the scoreboard's animation for what just landed (park25.js keeps the two best when several apply); they wait until HOME RUN has flashed
  function boardFor(ev, hr, ft) {
    const b = mode === 'replay' && cur && !edited ? cur : null, st = b && hr ? situation(b)?.stamp : null, off = b && hr ? offZone(b) : null, D = 2.6
    if (st && /WALK-OFF/.test(st)) { life.play('walkoff', {}, D); if (/SLAM/.test(st)) life.play('slam', {}, D) }
    else if (st === 'GRAND SLAM') life.play('slam', {}, D)
    else if (st === 'GO-AHEAD' || st === 'TIES IT') { const on = (b.r1 ? 1 : 0) + (b.r2 ? 1 : 0) + (b.r3 ? 1 : 0); life.play('flip', { word: st, bat: b.tb === 'Top' ? b.at : b.ht, fld: b.tb === 'Top' ? b.ht : b.at, b0: b.bsc, b1: b.bsc + 1 + on, f: b.fsc }, D) }
    if (off) life.play({ low: 'golf', high: 'tomahawk', away: 'chase', inside: 'insidejob' }[off.where], {}, D)
    if (ev.key === 'SPLASH') { life.play('seal', {}, D); life.play('odometer', { n: splashes + 1 }, D) } // the count goes up just after this
    if (hr && ft >= 430) life.play('cable', { ft }, D)
    if (ev.key === 'SCRAPER') life.play('crab', {}, D)
    else if (ev.key === 'WALL' || ev.key === 'CLOSE') life.play(mode === 'replay' ? 'crab' : 'soclose', {}, D)
  }
  // Karl: on by the forecast at Oracle when it says low cloud or poor visibility (one Open-Meteo request per visit, shared with BAY BAROMETER), and by hand with K
  const toggleKarl = (on) => { const v = on ?? !fx.karlOn(); if (v && !fx.karlOn()) life?.play('karl', {}, 0, true); fx.karl(v, mix.K); E('#c25kl').classList.toggle('on', v); E('#c25kl').textContent = v ? 'KARL: IN' : 'KARL' }
  E('#c25kl').addEventListener('click', () => { pressEl(E('#c25kl')); toggleKarl() })
  if (atOracle && q.get('karl') !== '0') Promise.resolve(getBay()).then(() => { if (bay && !bay.error && bay.hourly && karlIn(bay)) toggleKarl(true) }).catch(() => {})

  finishUI(root, { minW: 320, minH: 480 })
  syncCam = windowSync(api, hero, { zoom: 0.95 })
  applyMix()
  if (q.get('filter')) filter = q.get('filter')
  if (q.get('ball')) idx = Number(q.get('ball')) || 0
  setMode(mode)
  if (mode === 'whatif' && q.get('wev')) { for (const k of ['ev', 'la', 'dir', 'hand', 'temp']) if (q.get('w' + k) != null) api.state[k] = Number(q.get('w' + k)); api.update() }
  const wantBat = q.get('bat')
  if (wantBat && R.balls.length) { filter = 'all'; balls = R.balls.filter((b) => String(b.b) === wantBat); idx = 0; if (balls.length) { mode = 'replay'; applyBall(balls[0]); paintChooser() } }
  const wantMod = q.get('mod')
  if (wantMod) setTimeout(() => openMod(wantMod), 1200)
  if (q.get('menu') !== '0' && !wantMod) menu.show(mode === 'replay' ? 'replay' : 'dojo')
  window.__mix25 = { get: () => ({ ...mix }), set: (s) => { Object.assign(mix, parseMix(s)); applyMix('L') }, code: () => mixCode(mix), menu, fx, life, moments, offZone, tweak, play, mode: () => mode, reel: () => reel, cur: () => cur, lastMoment: () => lastMoment, pushing: () => !!push, water: () => water, pitchCam: () => pitchCam, lands: () => lands, fires: () => fires,
    // for the tests: jump to the first real ball (any filter) that matches
    ball: (pred) => { if (mode !== 'replay') setMode('replay'); filter = 'all'; balls = filtered(); const i = balls.findIndex(pred); if (i >= 0) { idx = i; applyBall(balls[i]); paintChooser() } return i }, stopReel: () => stopReel(), stars: () => smRes }
  return {
    render,
    beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (b.last && last) { const el = E('#c25d'); if (el) rollTo(el, Math.round(last.landFt), { steps: 8 }) } if (last) render(last) },
  }
}
