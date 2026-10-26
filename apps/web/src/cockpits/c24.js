// Study 24, THE MIXER: Study 22's one-ball screen with every visual choice on its own numbered axis, so a look can be named piece by piece ("L3 P2 C1 W4 A2 T3 V2"):
//   L layout, P panel frame, C color, W park lines, A character art, T type, V how the verdict and the home-run odds are shown.
// The codes sit in the header (click to step forward, shift-click or right-click to step back, ? lists every option); ?mix=L3P2C1W4A2T3V2 sets them from the address; the
// choice is remembered. Odds: replay balls carry the final model's odds (S3 stack plus the recalibration layer, science/build_replay.py); a what-if swing uses the what-if
// model when public/whatif_model.json exists, otherwise the share of real balls like it that left the park. Red-team fixes from 26 Oct: panel titles no longer cut by
// their own border, product header, no art-lab chrome, histograms sized to their box, pitch rows dropped (least important first) instead of spilling.
import { SKEL_CSS, restamp, tileHTML, isHR } from './skel.js'
import { THEME_CSS, JUICE_CSS, THEMES, applyTheme, pressEl, makeControls, makeSession, finishUI, loadDists } from './skel2.js'
import { BTN_TILT_CSS, tiltButtons, loadReplay, loadPool, ballsLike, rollTo, histHonest } from './skel3.js'
import { ART_CSS, STYLES, renderArt, faceSource, drawBatter, drawBust, artMetrics } from './art.js'
import { loadBatter3d, batter3dSource, loadGenericFaces, genericFace } from './batter3d.js'
import { landingParty } from '../landing.js'
import { seatSeance } from '../seance24.js'
import { shotCaller } from '../shotcaller.js'
import { loadWhatIf, whatIfP } from '../whatif.js'
import { loadDaily, enrichDay, oracleCheck, dingerPicks } from '../daily.js'
import { loadLibrary, pick, mulberry32 } from '../comparisons.js'

const LSA = { 1: 'WEAK', 2: 'TOPPED', 3: 'UNDER', 4: 'FLARE OR BURNER', 5: 'SOLID CONTACT', 6: 'BARREL' }
const PITCH = { FF: 'FOUR-SEAM', SI: 'SINKER', FC: 'CUTTER', SL: 'SLIDER', ST: 'SWEEPER', CU: 'CURVEBALL', KC: 'KNUCKLE-CURVE', CH: 'CHANGEUP', FS: 'SPLITTER', SV: 'SLURVE', KN: 'KNUCKLEBALL', EP: 'EEPHUS', CS: 'SLOW CURVE', FO: 'FORKBALL' }
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const f = (v, d = 1, u = '') => (v == null || v !== v ? '--' : (typeof v === 'number' ? v.toFixed(d) : v) + u)
const clock = (ax) => { if (ax == null) return '--'; const h = ((((ax + 180) / 30) % 12) + 12) % 12, hh = Math.floor(h) || 12, mm = Math.round((h % 1) * 60); return `${hh}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}` }

// ---- the axes ----
export const AXES = {
  L: { name: 'LAYOUT', opts: [
    ['CLASSIC', 'park on the left, the batter column on the right, the pitch under the park'],
    ['BROADSIDE', 'the park across the whole top, four cards in a row under it'],
    ['TRIPTYCH', 'three columns: batter and swing, the park in the middle, numbers and pitch'],
    ['THEATER', 'the park fills the screen behind two slim side rails'],
    ['DOSSIER', 'a big face and the pitch on the left, the park, the histograms side by side'],
  ] },
  P: { name: 'PANEL FRAME', opts: [
    ['LEGEND', 'title set into the top border (the old look, now uncut)'],
    ['TAB', 'title on a solid tab above the top-left corner'],
    ['INSIDE', 'full box, title quietly inside the top-left'],
    ['RULE', 'no box, one rule along the top with the title under it'],
    ['CORNERS', 'crop-mark corners only, title inside'],
  ] },
  C: { name: 'COLOR', opts: Object.entries(THEMES).map(([k, t]) => [t.name, k]) },
  W: { name: 'PARK LINES', opts: [
    ['GHOST', 'stands thinned to a third, field and wall in full'],
    ['QUIET', 'stands thinned hard, the field reads first'],
    ['CLEAN', 'stands at about half'],
    ['FULL', 'every seat line'],
    ['TERRACE', 'stands as wide terraces with tight contours'],
    ['PLAIN', 'the original wireframe, no field marks or wall line'],
  ] },
  A: { name: 'ART', opts: [
    ['PEN AND INK', 'braille outline with a light tone (your pick for the batter)', 'braille-edge', 'braille-edge'],
    ['POSTER', 'braille dots after a hard contrast stretch', 'braille-poster', 'braille-poster'],
    ['WOODCUT', 'braille, adaptive threshold, high contrast', 'braille-thresh', 'braille-thresh'],
    ['ORDERED', 'braille dots, ordered dither (a screen-print grain)', 'braille-bayer', 'braille-bayer'],
    ['HALF BLOCK', 'half-height blocks, error diffusion', 'half-fs', 'half-fs'],
    ['QUAD EDGE', '2 by 2 blocks on the edges, faint fill', 'quad-edge', 'quad-edge'],
    ['DOT MATRIX', 'o on a grid, like the concept sheets', 'dotmatrix', 'dotmatrix'],
    ['SHADE', 'four shade blocks, dithered', 'shade', 'shade'],
  ] },
  T: { name: 'TYPE', opts: [
    ['TERMINAL', 'VT323 text, Press Start labels (the old look)', { tf: 'VT', nf: 'VT', lf: 'PS2P', ts: 1, lsz: 8 }],
    ['TECH MONO', 'Share Tech Mono text, Press Start labels', { tf: 'STM', nf: 'STM', lf: 'PS2P', ts: 0.8, lsz: 8 }],
    ['CONDENSED', 'Barlow Condensed numbers and text, mono labels', { tf: 'BCM', nf: 'BCB', lf: 'STM', ts: 0.86, lsz: 11, sp: '.03em' }],
    ['GROTESK', 'Space Grotesk text, DejaVu mono labels', { tf: 'SG', nf: 'SG', lf: 'DJV', ts: 0.72, lsz: 10 }],
    ['PLAIN MONO', 'DejaVu Sans Mono everywhere', { tf: 'DJV', nf: 'DJV', lf: 'DJV', ts: 0.72, lsz: 10 }],
  ] },
  V: { name: 'VERDICT', opts: [
    ['CHIP', 'distance big; the verdict chip carries the odds'],
    ['BIG ODDS', 'the odds are the big number; distance under it'],
    ['METER', 'distance big, a twenty-step odds meter under it'],
    ['STAMP', 'the chip stamps a word for the odds (NO DOUBTER to CAN OF CORN)'],
    ['SPLIT', 'distance and odds side by side, same size'],
  ] },
}
const ORDER = ['L', 'P', 'C', 'W', 'A', 'T', 'V']
const DEF = { L: 1, P: 1, C: 1, W: 1, A: 1, T: 1, V: 1 }
export function parseMix(s) {
  const m = { ...DEF }
  for (const [, k, n] of (s ?? '').toUpperCase().matchAll(/([LPCWATV])(\d+)/g)) { const i = Number(n); if (i >= 1 && i <= AXES[k].opts.length) m[k] = i }
  return m
}
export const mixCode = (m) => ORDER.map((k) => k + m[k]).join(' ')

const LAYOUT_CSS = `
#cp .c24{position:absolute;inset:10px;display:grid;gap:14px}
#cp .c24>.hdr{grid-area:hdr}#cp .c24>.park{grid-area:park}#cp .c24>.pitch{grid-area:pitch}#cp .c24>.batter{grid-area:batter}#cp .c24>.swing{grid-area:swing}#cp .c24>.hists{grid-area:hists}#cp .c24>.strip{grid-area:strip}
#cp .c24.L1{grid-template-columns:minmax(0,1fr) clamp(430px,31vw,600px);grid-template-rows:48px 160px minmax(0,1fr) clamp(190px,24vh,250px) 84px;grid-template-areas:"hdr hdr" "park batter" "park swing" "pitch hists" "strip strip"}
#cp .c24.L2{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:48px minmax(0,1fr) clamp(220px,28vh,290px) 84px;grid-template-areas:"hdr hdr hdr hdr" "park park park park" "batter swing pitch hists" "strip strip strip strip"}
#cp .c24.L3{grid-template-columns:clamp(320px,22vw,430px) minmax(0,1fr) clamp(340px,23vw,440px);grid-template-rows:48px minmax(0,1.15fr) minmax(0,1fr) 84px;grid-template-areas:"hdr hdr hdr" "batter park hists" "swing park pitch" "strip strip strip"}
#cp .c24.L4{--rl:clamp(300px,20vw,400px);--rr:clamp(330px,22vw,420px);grid-template-columns:var(--rl) minmax(0,1fr) var(--rr);grid-template-rows:48px 170px minmax(0,1fr) clamp(200px,25vh,260px) 84px;grid-template-areas:"hdr hdr hdr" "batter . hists" "swing . hists" "swing . pitch" "strip strip strip"}
#cp .c24.L4>.park{grid-area:2/1/5/4;z-index:0;border-color:transparent}
#cp .c24.L4>.park>.t{display:none}
#cp .c24.L4>.pnl:not(.park){z-index:1}
#cp .c24.L4 .park .rd,#cp .c24.L4 .park .bsel{left:calc(var(--rl) + 32px)}
#cp .c24.L4 .park .chip,#cp .c24.L4 .park .tly{right:calc(var(--rr) + 30px)}
#cp .c24.L4 .park .bsel{right:calc(var(--rr) + 210px)}
#cp .c24.L5{grid-template-columns:clamp(380px,26vw,500px) minmax(0,1fr) minmax(0,1fr);grid-template-rows:48px clamp(190px,28vh,330px) minmax(0,1fr) clamp(140px,20vh,220px) 84px;grid-template-areas:"hdr hdr hdr" "batter park park" "pitch park park" "swing hists hists" "strip strip strip"}
`
const FRAME_CSS = `
#cp .c24 .pnl{overflow:visible}
#cp .c24.P1 .pnl>.t{top:-6px}
#cp .c24.P2 .pnl>.t{top:-15px;left:-1px;background:var(--tx);color:var(--k);padding:2px 8px 2px}
#cp .c24.P3 .pnl>.t{top:6px;left:10px;background:transparent;color:var(--dim);padding:0}
#cp .c24.P4 .pnl{border:0;border-top:1px solid var(--tx);background:transparent}
#cp .c24.P4 .pnl>.t{top:6px;left:0;background:transparent;color:var(--dim);padding:0}
#cp .c24.P5 .pnl{border-color:transparent;background:
  linear-gradient(var(--tx),var(--tx)) top left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) top right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) top right/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom left/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom left/1px 14px no-repeat,
  linear-gradient(var(--tx),var(--tx)) bottom right/14px 1px no-repeat,linear-gradient(var(--tx),var(--tx)) bottom right/1px 14px no-repeat,var(--k)}
#cp .c24.P5 .pnl.park{background:transparent}
#cp .c24.P5 .pnl>.t{top:6px;left:12px;background:transparent;color:var(--dim);padding:0}
`
// phones (under 900 px wide): the park on top, a tab row choosing one card under it, the control strip in two rows; the mixer codes hide, ? still lists them
const PHONE_CSS = `
#cp .c24>.ptabs{display:none}
@media (max-width:900px){
#cp .c24.c24{inset:6px;gap:8px;grid-template-columns:minmax(0,1fr);grid-template-rows:48px minmax(0,1.1fr) 26px minmax(0,1fr) 104px;grid-template-areas:"hdr" "park" "ptabs" "card" "strip"}
#cp .c24.c24>.park{grid-area:park;z-index:0;border-color:var(--tx)}
#cp .c24.c24>.park>.t{display:block}
#cp .c24.c24>.batter,#cp .c24.c24>.swing,#cp .c24.c24>.hists,#cp .c24.c24>.pitch{grid-area:card;display:none;z-index:1}
#cp .c24.c24[data-card="batter"]>.batter,#cp .c24.c24[data-card="hists"]>.hists,#cp .c24.c24[data-card="pitch"]>.pitch{display:block}
#cp .c24.c24[data-card="swing"]>.swing{display:grid}
#cp .c24>.ptabs{grid-area:ptabs;display:flex;gap:6px;align-items:stretch}
#cp .c24>.ptabs .bt{flex:1;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 3px 0 var(--e);pointer-events:auto}
#cp .c24 .hdr .h1>.ps,#cp .c24 .hdr .mx[data-ax]{display:none}
#cp .c24 .hdr .h1{justify-content:flex-end}
#cp .c24 .hdr .h2{overflow-x:auto;overflow-y:hidden;gap:14px;scrollbar-width:none}
#cp .c24 .rd{max-width:57%;left:10px;top:12px}
#cp .c24 .rd .big{font-size:calc(44px * var(--ts))}
#cp .c24 .rd .big i{font-size:calc(18px * var(--ts))}
#cp .c24 .rd .sub,#cp .c24 .rd .lbl{font-size:calc(14px * var(--ts));white-space:normal}
#cp .c24 .rd .gn{font-size:calc(14px * var(--ts))}
#cp .c24 .rd .split{gap:16px}
#cp .c24 .rd .meter s{width:7px;height:12px}
#cp .c24 .chip{right:8px;top:10px;max-width:36%;padding:5px 8px}
#cp .c24 .chip .hd{font-size:calc(17px * var(--ts))}
#cp .c24 .chip .sb,#cp .c24 .chip .od{font-size:calc(12px * var(--ts))}
#cp .c24 .bsel{left:8px;right:8px;bottom:6px;font-size:calc(13px * var(--ts))}
#cp .c24 .bsel .bt{padding:3px 6px}
#cp .c24 .tly{display:none}
#cp .c24 .pnl>.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 24px)}
#cp .c24 .strip .bt .ps{display:block;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c24 .strip{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:6px}
#cp .c24 .strip .bt{padding:4px 26px 2px 6px}
#cp .c24 .strip .bt b{font-size:calc(17px * var(--ts))}
#cp .c24 .strip .bt .ud{right:3px;gap:2px}
#cp .c24 .strip .bt .ud i{width:16px;height:13px;line-height:11px}
#cp .c24 .strip .bt.hot{grid-column:4;grid-row:2}
#cp .c24 .mod .box{padding:30px 12px 14px;max-width:96vw}
#cp .c24 .bul,#cp .c24 .bay{min-width:0}
#cp .c24 .bcards{grid-template-columns:repeat(2,minmax(0,1fr))}
#cp .c24 .btab .r{grid-template-columns:minmax(0,1fr) 40px 44px 40px 40px 46px 64px;gap:6px;font-size:calc(13px * var(--ts))}
#cp .c24 .bayt .r{grid-template-columns:44px 40px 46px 56px 60px 56px 1fr;gap:4px;font-size:calc(13px * var(--ts))}
#cp .c24 .legend{grid-template-columns:minmax(0,1fr)}
#cp .c24 .allst{grid-template-columns:minmax(0,1fr)}
#cp .c24 .ddbig{font-size:calc(34px * var(--ts))}
}
`
const TYPE_CSS = `
@font-face{font-family:STM;src:url(/fonts/ShareTechMono-Regular.ttf)}
@font-face{font-family:BCM;src:url(/fonts/BarlowCondensed-Medium.ttf)}
@font-face{font-family:BCB;src:url(/fonts/BarlowCondensed-Bold.ttf)}
@font-face{font-family:SG;src:url(/fonts/SpaceGrotesk-Variable.ttf)}
@font-face{font-family:DJV;src:url(/fonts/DejaVuSansMono.ttf)}
#cp .c24{font-family:var(--tf),monospace;font-size:calc(20px * var(--ts));letter-spacing:var(--sp,.02em)}
#cp .c24 .ps,#cp .c24 .pnl>.t,#cp .c24 .hdr .bt,#cp .c24 .hdr .grp,#cp .c24 .mod h3,#cp .c24 .allst h5,#cp .c24 .strip .bt .ps,#cp .c24 .mx{font-family:var(--lf),monospace;font-size:var(--lsz);line-height:1.25}
#cp .c24 .strip .bt.hot b{font-family:var(--lf),monospace;font-size:calc(var(--lsz) * 1.9)}
#cp .c24 .num{font-family:var(--nf),monospace}
#cp .c24 svg text{font-family:var(--tf),monospace;font-size:calc(15px * var(--ts) / .9)}
`

export async function build(root, api, U) {
  const { css, loadParks, evalParks, windowSync } = U
  const BASE = `
#cp .c24 .hdr{display:grid;grid-template-rows:22px 22px;gap:4px;min-width:0}
#cp .c24 .hdr .h1{display:flex;justify-content:space-between;align-items:center;gap:12px;white-space:nowrap;min-width:0}
#cp .c24 .hdr .h2{display:flex;justify-content:flex-start;align-items:center;gap:22px;white-space:nowrap;min-width:0}
#cp .c24 .hdr .rt{display:flex;gap:14px;align-items:center}
#cp .c24 .hdr .grp{display:flex;gap:6px;align-items:center;color:var(--dim)}
#cp .c24 .hdr .bt{height:19px;padding:0 8px;display:inline-flex;align-items:center;line-height:1;box-shadow:0 3px 0 var(--e)}
#cp .c24 .bt.on{background:var(--tx);color:var(--k);box-shadow:0 1px 0 var(--e)}
#cp .c24 .hdr .bt.mx{padding:0 6px;min-width:28px;justify-content:center}
#cp .c24 .mx.ch{border-color:var(--acc);color:var(--acc)}
#cp .c24 .win{pointer-events:none}
#cp .c24 .rd{position:absolute;left:18px;top:14px;pointer-events:none;max-width:calc(100% - 320px)}
#cp .c24 .rd .big{font-weight:400;font-size:70px;line-height:.9;display:block;white-space:nowrap}
#cp .c24 .rd .big i{font-style:normal;font-size:26px;color:var(--dim)}
#cp .c24 .rd .lbl{display:block;color:var(--dim);font-size:16px;margin-top:2px}
#cp .c24 .rd .sub{display:block;color:var(--dim);font-size:18px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c24 .rd .gn{color:var(--acc);font-size:18px;margin-top:6px}
#cp .c24 .rd .split{display:flex;gap:34px;align-items:flex-end}
#cp .c24 .rd .split>div{display:grid}
#cp .c24 .rd .meter{display:flex;gap:3px;margin-top:8px;align-items:center}
#cp .c24 .rd .meter s{display:block;width:12px;height:16px;border:1px solid var(--tx);text-decoration:none}
#cp .c24 .rd .meter s.on{background:var(--acc);border-color:var(--acc)}
#cp .c24 .rd .meter em{font-style:normal;margin-left:10px;font-size:22px}
#cp .c24 .chip{position:absolute;right:14px;top:14px;max-width:300px;padding:8px 12px;background:var(--k);border:1px solid var(--tx);text-align:right;pointer-events:none}
#cp .c24 .chip .hd{font-size:24px;line-height:1}
#cp .c24 .chip.hr .hd{color:var(--acc)}
#cp .c24 .chip .sb{font-size:15px;color:var(--dim);margin-top:3px}
#cp .c24 .chip .od{font-size:18px;margin-top:6px}
#cp .c24 .chip .od b{font-weight:400;color:var(--acc)}
#cp .c24 .bsel{position:absolute;left:18px;bottom:12px;right:190px;display:grid;gap:4px;font-size:17px}
#cp .c24 .bsel .r1{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp .c24 .bsel .r2{color:var(--dim);background:var(--k);justify-self:start;padding:1px 4px 1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c24 .bsel .r2 b{font-weight:400;color:var(--tx)}
#cp .c24 .tly{position:absolute;right:16px;bottom:12px;width:170px;font-size:15px;display:grid;gap:1px;pointer-events:none;text-align:right}
#cp .c24 .tly div{color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c24 .tly div.n{color:var(--acc)}
#cp .c24 .tly .c{color:var(--tx)}
#cp .c24 .tly .c span{color:var(--dim)}
#cp .c24 .batter{container-type:size}
#cp .c24 .batter .bin{position:absolute;inset:22px 14px 10px;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:14px}
#cp .c24 .fbox{width:min(42cqw,92cqh);position:relative;align-self:stretch;min-height:0;overflow:hidden}
@container (min-height:300px){#cp .c24 .batter .bin{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto}#cp .c24 .fbox{width:auto}#cp .c24 .info{justify-items:start}}
#cp .c24 .fbox .art,#cp .c24 .swing .fig .art{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;color:var(--tx)}
#cp .c24 .info{display:grid;gap:4px;align-content:start;min-width:0}
#cp .c24 .info b{font-weight:400;font-size:24px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#cp .c24 .info span{color:var(--dim);font-size:16px;line-height:1.1}
#cp .c24 .info .row{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}
#cp .c24 .swing{display:grid;grid-template-rows:minmax(0,1fr) auto;padding:22px 14px 10px}
#cp .c24 .swing .fig{position:relative;min-height:0;overflow:hidden}
#cp .c24 .swing .cap{font-size:17px;line-height:1.15;color:var(--dim);padding-top:6px}
#cp .c24 .swing .cap b{font-weight:400;color:var(--tx)}
#cp .c24 .swing .cap i{font-style:normal;color:var(--acc)}
#cp .c24 .hists>#c24hb{position:absolute;inset:22px 14px 6px;overflow:hidden}
#cp .c24 .hists .hg{display:grid;gap:4px 18px}
#cp .c24 .hists .h .lb{display:flex;justify-content:space-between;gap:4px 10px;flex-wrap:wrap;font-size:15px;color:var(--dim)}
#cp .c24 .hists .h .lb b{font-weight:400;color:var(--tx)}
#cp .c24 .hists .h svg{display:block}
#cp .c24 .hists .key{font-size:13px;color:var(--dim);margin-top:4px}
#cp .c24 .hists .like{font-size:15px;color:var(--dim);margin-top:4px}
#cp .c24 .hists .like b{font-weight:400;color:var(--tx)}
#cp .c24 .lpl{display:grid;gap:3px;font-size:16px}
#cp .c24 .lph{color:var(--dim);font-size:14px;margin-bottom:3px}
#cp .c24 .lpr{display:grid;grid-template-columns:22px minmax(0,1.4fr) auto auto minmax(0,1fr);gap:10px;white-space:nowrap}
#cp .c24 .lpr b{font-weight:400;color:var(--acc)}
#cp .c24 .lpr span{overflow:hidden;text-overflow:ellipsis}
#cp .c24 .lpr .wh{color:var(--dim)}
#cp .c24 .sel{display:grid;gap:3px;font-size:16px}
#cp .c24 .sbar{display:flex;height:12px;border:1px solid var(--tx);margin:2px 0 6px}
#cp .c24 .sbar i{display:block;height:100%}
#cp .c24 .lpr2{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
#cp .c24 .lpr2 span{color:var(--dim);overflow:hidden;text-overflow:ellipsis}
#cp .c24 .lpr2 b{font-weight:400}
#cp .c24 .bay{display:grid;gap:8px;min-width:min(760px,80vw);font-size:18px}
#cp .c24 .bayh{font-size:64px;line-height:1;color:var(--acc)}
#cp .c24 .bays{color:var(--dim)}
#cp .c24 .bays.karl{color:var(--tx)}
#cp .c24 .bayt{display:grid;gap:2px;margin-top:6px}
#cp .c24 .bayt .r{display:grid;grid-template-columns:70px 70px 80px 100px 100px 110px 1fr;gap:8px;white-space:nowrap}
#cp .c24 .bayt .r.hd{color:var(--dim)}
#cp .c24 .bayt .r b{font-weight:400;color:var(--acc);text-align:right}
#cp .c24 .baya{color:var(--dim);font-size:14px;margin-top:6px}
#cp .c24 .bul{display:grid;gap:10px;min-width:min(1100px,86vw);font-size:17px}
#cp .c24 .bulh{color:var(--dim);font-size:16px}
#cp .c24 .bcards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
#cp .c24 .bcard{border:1px solid var(--tx);padding:10px 12px;display:grid;gap:4px}
#cp .c24 .bcard span{color:var(--acc);font-size:14px}
#cp .c24 .bcard b{font-weight:400;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .c24 .bcard i{font-style:normal;color:var(--dim);font-size:15px}
#cp .c24 .btab{display:grid;gap:1px;max-height:44vh;overflow:auto}
#cp .c24 .btab .r{display:grid;grid-template-columns:minmax(0,1.6fr) 60px 70px 70px 60px 70px 110px;gap:10px;padding:2px 4px;white-space:nowrap;pointer-events:auto}
#cp .c24 .btab .r span{overflow:hidden;text-overflow:ellipsis}
#cp .c24 .btab .r.hd{color:var(--dim)}
#cp .c24 .btab .r.go{cursor:pointer}
#cp .c24 .btab .r.go:hover{background:var(--ln)}
#cp .c24 .btab .r b{font-weight:400}
#cp .c24 .btab .r b.y{color:var(--acc)}
#cp .c24 .btab .r b.n{color:var(--dim)}
#cp .c24 .ddk{color:var(--acc);font-size:16px}
#cp .c24 .ddbig{font-size:54px;line-height:1}
#cp .c24 .dds{color:var(--dim);font-size:18px}
#cp .c24 .ddrev{border-left:3px solid var(--acc);padding-left:10px}
#cp .c24 .ddb{display:flex;gap:16px;margin-top:8px}
#cp .c24 .ddb .bt{font-size:22px;padding:10px 26px;pointer-events:auto}
#cp .c24 .wgrid{display:grid;gap:6px;max-height:46vh;overflow:auto}
#cp .c24 .wm{display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:start}
#cp .c24 .wm>span{color:var(--dim);font-size:15px;padding-top:4px}
#cp .c24 .wm>div{display:flex;flex-wrap:wrap;gap:6px 6px}
#cp .c24 .wd{min-width:34px;padding:3px 6px;font-size:15px;text-align:center;pointer-events:auto;box-shadow:0 3px 0 var(--e)}
#cp .c24 .wd sup{color:var(--acc);font-size:10px;margin-left:2px}
#cp .c24 .wd.on{background:var(--acc);color:var(--k);border-color:var(--acc)}
#cp .c24 .wd.on sup{color:var(--k)}
#cp .c24 .wsum{display:grid;gap:4px}
#cp .c24 .strip{position:relative;display:grid;grid-template-columns:repeat(6,1fr) 1.4fr;gap:10px;padding-bottom:6px}
#cp .c24 .strip .bt{padding:8px 34px 4px 10px;display:flex;flex-direction:column;justify-content:space-between;position:relative;min-width:0}
#cp .c24 .strip .bt .ps{color:var(--dim);white-space:nowrap}
#cp .c24 .strip .bt.arm .ps{color:var(--k)}
#cp .c24 .strip .bt b{font-weight:400;font-size:26px;line-height:.9;white-space:nowrap;overflow:hidden}
#cp .c24 .strip .bt .ud{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;gap:4px}
#cp .c24 .strip .bt .ud i{display:block;width:18px;height:16px;border:1px solid currentColor;font-style:normal;font-size:13px;line-height:14px;text-align:center}
#cp .c24 .strip .bt.hot{padding:8px 10px 4px}
#cp .c24 .strip .bt.hot b{line-height:1.3;align-self:center;margin:auto}
#cp .c24 .mod{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);pointer-events:auto}
#cp .c24 .mod.open{display:flex}
#cp .c24 .mod .box{position:relative;background:var(--k);border:1px solid var(--tx);padding:34px 26px 22px;max-width:min(1500px,94vw);max-height:92vh;overflow:auto}
#cp .c24 .mod .x{position:absolute;right:10px;top:8px}
#cp .c24 .mod h3{position:absolute;left:14px;top:8px;margin:0;font-weight:400;color:var(--acc)}
#cp .c24 .pitch{container-type:inline-size}
#cp .c24 .pitch .pin{position:absolute;inset:24px 18px 10px;overflow:hidden;display:grid;grid-template-columns:auto minmax(0,1fr);gap:22px}
@container (max-width:520px){#cp .c24 .pitch .pin{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(70px,38%) minmax(0,1fr);gap:8px}#cp .c24 .pitch .zg{width:100%}}
#cp .c24 .pitch .zg{width:136px;height:100%;position:relative;min-height:0}
#cp .c24 .pitch .zg svg{position:absolute;inset:0;width:100%;height:100%}
#cp .c24 .pitch .pl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 26px;align-content:start;min-width:0;min-height:0;overflow:hidden}
@container (max-width:900px){#cp .c24 .pitch .pl{grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 18px}}
#cp .c24 .pitch .pl .r{display:flex;justify-content:space-between;gap:10px;font-size:16px;line-height:19px;white-space:nowrap;min-width:0}
#cp .c24 .pitch .pl .r span{color:var(--dim);overflow:hidden;text-overflow:ellipsis}
#cp .c24 .pitch .pl .r b{font-weight:400}
#cp .c24 .pitch .pl .hd{grid-column:1/-1;font-size:22px;line-height:1;margin-bottom:4px}
#cp .c24 .pitch .none{align-self:center;color:var(--dim);font-size:17px;grid-column:1/-1}
#cp .c24 .pitch .none b{font-weight:400;color:var(--tx)}
#cp .c24 .allst{display:grid;grid-template-columns:repeat(5,minmax(190px,1fr));gap:22px}
#cp .c24 .allst h5{font-weight:400;color:var(--acc);margin:0 0 6px}
#cp .c24 .allst .r{display:flex;justify-content:space-between;gap:10px;font-size:15px;line-height:17px;white-space:nowrap}
#cp .c24 .allst .r span{color:var(--dim)}
#cp .c24 .allst .r b{font-weight:400}
#cp .c24 .pk{display:grid;grid-template-columns:repeat(10,64px);gap:4px}
#cp .c24 .pk .tile{height:46px}
#cp .c24 .legend{display:grid;grid-template-columns:repeat(4,minmax(240px,1fr));gap:18px 26px}
#cp .c24 .legend h5{margin:0 0 6px;font-weight:400;color:var(--acc)}
#cp .c24 .legend .o{display:grid;grid-template-columns:34px minmax(0,1fr);gap:2px 8px;padding:3px 4px;cursor:pointer;font-size:16px;line-height:1.1;pointer-events:auto}
#cp .c24 .legend .o:hover{background:var(--ln)}
#cp .c24 .legend .o.on{outline:1px solid var(--acc)}
#cp .c24 .legend .o b{font-weight:400;color:var(--acc)}
#cp .c24 .legend .o span{color:var(--dim);grid-column:2}
#cp .c24 .legend .code{grid-column:1/-1;font-size:22px;margin-bottom:6px}
`
  // every px font size in this study scales with the type axis (T); labels in the label face keep their own size
  const scaled = (s) => s.replace(/font-size:(\d+(?:\.\d+)?)px/g, 'font-size:calc($1px * var(--ts))')
  css('cp24', SKEL_CSS + THEME_CSS + JUICE_CSS + BTN_TILT_CSS + ART_CSS + LAYOUT_CSS + FRAME_CSS + scaled(BASE) + TYPE_CSS + PHONE_CSS)
  root.classList.add('skel')
  window.__cpBead = 3.4
  api.NN.setFpsCap(30)
  const ctl = makeControls(api, U), ses = makeSession(api)
  const q = new URLSearchParams(location.search)
  const mix = parseMix(q.get('mix') ?? store('nn-mix24') ?? '')
  let last = null, mode = q.get('mode24') || 'replay', filter = 'giants', idx = 0, edited = false, balls = [], cur = null, bird = q.get('bird') === '1', modal = null

  root.innerHTML = `<div class="c24"><div class="hdr"><div class="h1"><span class="ps">NUKE NAVIGATOR // DINGER DOJO</span><span class="rt">
    <span class="grp">MODE <span class="bt" data-mode="replay">REPLAY</span><span class="bt" data-mode="whatif">WHAT-IF</span></span>
    <span class="grp">VIEW <span class="bt" id="c24b">BIRD'S EYE</span><span class="bt" id="c24pk">PARK</span></span>
    <span class="grp" id="c24mx">MIX ${ORDER.map((k) => `<span class="bt mx" data-ax="${k}"></span>`).join('')}<span class="bt mx" id="c24lg" aria-label="every option">?</span></span></span></div>
    <div class="h2"><span class="grp">IN THE PARK <span class="bt" id="c24lp">LANDING PARTY</span><span class="bt" id="c24se">SEAT SEANCE</span><span class="bt" id="c24sc">SHOT CALLER</span></span>
    <span class="grp">TONIGHT <span class="bt" id="c24bb">BAY BAROMETER</span></span>
    <span class="grp">YESTERDAY <span class="bt" id="c24bl">BLAST BULLETIN</span><span class="bt" id="c24dd">DAILY DINGER</span></span>
    <span class="grp">YOU <span class="bt" id="c24ww">WALLOP WITNESS</span></span></div></div>
  <div class="pnl clear win park" id="c24h"><span class="t">/ O R A C L E &nbsp; P A R K /</span>
    <div class="rd" id="c24rd"></div><div class="chip" id="c24v"><div class="hd"></div><div class="sb"></div><div class="od"></div></div><div class="bsel p" id="c24ch"></div><div class="tly" id="c24t"></div></div>
  <div class="pnl p pitch"><span class="t">/ T H E &nbsp; P I T C H /</span><div class="pin"><div class="zg" id="c24zg"></div><div class="pl" id="c24pl"></div></div></div>
  <div class="pnl p batter"><span class="t">/ B A T T E R /</span><div class="bin"><div class="fbox" id="c24f"><pre class="art"></pre></div><div class="info" id="c24i"></div></div></div>
  <div class="pnl p swing"><span class="t">/ S W I N G &nbsp; S I D E &nbsp; V I E W /</span><div class="fig" id="c24s"><pre class="art"></pre></div><div class="cap" id="c24cap"></div></div>
  <div class="pnl p hists" id="c24hi"><span class="t">/ T H I S &nbsp; B A L L &nbsp; V S &nbsp; A L L &nbsp; B A L L S /</span><div id="c24hb"></div></div>
  <div class="ptabs p" id="c24pt">${[['batter', 'BATTER'], ['swing', 'SWING'], ['hists', 'VS ALL'], ['pitch', 'PITCH']].map(([k, l]) => `<span class="bt" data-card="${k}">${l}</span>`).join('')}</div>
  <div class="strip p" id="c24sl">${ctl.SLOTS.map((s, i) => `<div class="bt" data-i="${i}"><span class="ps">${i + 1} ${s.label}</span><b class="num"></b><span class="ud"><i data-d="1">+</i><i data-d="-1">-</i></span></div>`).join('')}<div class="bt hot" data-i="6"><span class="ps">ENTER</span><b>SWING</b></div></div>
  <div class="mod" id="c24m"><div class="box"><span class="bt x" id="c24cl" aria-label="close">CLOSE</span><h3 id="c24mt"></h3><div id="c24mb"></div></div></div></div>`
  const E = (id) => root.querySelector(id), hero = E('#c24h'), grid = E('.c24')
  const setCard = (k) => { grid.dataset.card = k; root.querySelectorAll('#c24pt [data-card]').forEach((b) => b.classList.toggle('on', b.dataset.card === k)); if (last) render(last) }
  root.querySelectorAll('#c24pt [data-card]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setCard(b.dataset.card) }))
  setCard(q.get('card') ?? 'batter')

  // ---- the park wireframe (W axis) ----
  const showWire = () => {
    api.NN.setDuo(null)
    const cs = getComputedStyle(root), t = { tx: cs.getPropertyValue('--tx').trim(), k: cs.getPropertyValue('--k').trim(), acc: cs.getPropertyValue('--acc').trim() }
    api.NN.setPix({ pix: 0, mode: 0 })
    const wm = ['ghost', 'quiet', 'clean', 'full', 'terrace', 'plain'][mix.W - 1]
    const rich = wm === 'plain' ? {} : { fatHeavy: 1.8, faintAngle: 40, faintMin: 0.8, marks: true, wall: (b) => api.wallAt?.(b), accent: t.acc, stands: wm, fun: true, step: wm === 'terrace' ? 2.5 : 6, contourOuter: wm === 'terrace' ? 12 : 40 }
    api.NN.setWire(true, { split: true, angle: 78, step: 0, hidden: true, opacity: 0.9, color: t.tx, face: t.k, fog: [230, 560], rebuild: !!showWire.built, ...rich })
    showWire.built = true
  }
  tiltButtons(root)
  let syncCam = null
  const CAM = { home: [[0.3, 150, 170], [0.3, 0, -85]], top: [[0.3, 300, -50], [0.3, 0, -62]] }
  const camTo = (k) => { const [p, t] = CAM[k]; api.NN.camera.position.set(...p); api.NN.controls.target.set(...t); api.NN.controls.update(); E('#c24b').classList.toggle('on', k === 'top') }
  setTimeout(() => camTo(bird ? 'top' : 'home'), 60)
  const flipBird = () => { bird = !bird; camTo(bird ? 'top' : 'home') }
  E('#c24b').addEventListener('click', () => { pressEl(E('#c24b')); flipBird() })

  const [parks, R, pool, D, facesRaw] = await Promise.all([loadParks(), loadReplay(), loadPool(), loadDists(), (async () => { try { const r = await fetch('/faces_tone.json'); return r.ok ? await r.json() : {} } catch { return {} } })()])
  const has3d = await loadBatter3d()
  const hasGen = await loadGenericFaces('composite')
  // the histogram panel shows one of three things: the histograms, LANDING PARTY (L) or SEAT SEANCE (G); the park markers belong to whichever is on
  const lp = landingParty(api, R.balls), se = seatSeance(api), sc = shotCaller(api, R.balls)
  let show = ['lp', 'se', 'sc'].includes(q.get('show')) ? q.get('show') : 'hist', lpKey = '', lpList = [], seKey = '', seRes = null, scRes = null
  const setShow = (k) => { show = show === k ? 'hist' : k; for (const [id, m] of [['#c24lp', 'lp'], ['#c24se', 'se'], ['#c24sc', 'sc']]) E(id).classList.toggle('on', show === m); lpKey = seKey = ''; if (show !== 'lp') lp.clear(); if (show !== 'se') se.clear(); if (show !== 'sc') { sc.clear(); scRes = null } if (last) render(last) }
  E('#c24sc').addEventListener('click', () => { pressEl(E('#c24sc')); setShow('sc') })
  E('#c24sc').classList.toggle('on', show === 'sc')
  // a click on the park (not a drag) calls the shot while SHOT CALLER is on
  let down = null
  addEventListener('pointerdown', (e) => { down = e.target?.tagName === 'CANVAS' ? [e.clientX, e.clientY] : null })
  addEventListener('pointerup', (e) => {
    if (show !== 'sc' || !down || e.target?.tagName !== 'CANVAS' || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return
    const spot = sc.pick(e.clientX, e.clientY)
    if (!spot) return
    E('#c24hb').innerHTML = '<div class="lph">CALLING THE SHOT...</div>'
    setTimeout(() => { scRes = sc.call(spot, api.state, getComputedStyle(root).getPropertyValue('--acc').trim()); if (last) render(last) }, 30)
  })
  const lpToggle = () => setShow('lp')
  E('#c24lp').addEventListener('click', () => { pressEl(E('#c24lp')); setShow('lp') })
  E('#c24se').addEventListener('click', () => { pressEl(E('#c24se')); setShow('se') })
  E('#c24lp').classList.toggle('on', show === 'lp'); E('#c24se').classList.toggle('on', show === 'se')
  E('#c24bb').addEventListener('click', () => { pressEl(E('#c24bb')); openMod('bay') })
  const wim = await loadWhatIf() // the what-if model (public/whatif_model.json), if built
  // which park is loaded (?park=TEAM; main.js and dojo.js read the same parameter): its name on the park panel; Oracle-only features hide elsewhere
  const here = parks.parks.find((p) => p.abbr === (window.__parkX ?? 'SF'))
  const spaced = (t) => '/ ' + t.toUpperCase().split(' ').map((w) => w.split('').join(' ')).join(' &nbsp; ') + ' /'
  if (here && here.abbr !== 'SF') { hero.querySelector('.t').innerHTML = spaced(here.name); for (const id of ['#c24lp', '#c24se', '#c24sc', '#c24bb']) E(id).style.display = 'none' }
  E('#c24pk').textContent = 'PARK: ' + (here?.abbr ?? 'SF')
  E('#c24pk').addEventListener('click', () => { pressEl(E('#c24pk')); openMod('parks') })
  const goPark = (abbr) => { const u = new URL(location.href); if (abbr === 'SF') u.searchParams.delete('park'); else u.searchParams.set('park', abbr); u.searchParams.set('mix', mixCode(mix).replace(/ /g, '')); u.searchParams.set('mode24', mode); if (mode === 'replay') { u.searchParams.set('ball', String(idx)); u.searchParams.set('filter', filter) } else { for (const k of ['ev', 'la', 'dir', 'hand', 'temp']) u.searchParams.set('w' + k, String(api.state[k])) } location.href = u.toString() }
  E('#c24bl').addEventListener('click', () => { pressEl(E('#c24bl')); openMod('bulletin') })
  E('#c24dd').addEventListener('click', () => { pressEl(E('#c24dd')); openMod('dinger') })
  E('#c24ww').addEventListener('click', () => { pressEl(E('#c24ww')); openMod('witness') })
  const pname = (id) => R.players?.[String(id)] ?? null
  const filtered = () => (filter === 'giants' ? R.balls.filter((b) => b.g && b.hr) : filter === 'oracle' ? R.balls.filter((b) => b.park === 'SF' && b.hr) : R.balls)

  // ---- the mixer ----
  function applyMix(changed) {
    for (const k of ['L', 'P']) for (let i = 1; i <= AXES[k].opts.length; i++) grid.classList.toggle(k + i, mix[k] === i)
    const T = AXES.T.opts[mix.T - 1][2]
    for (const [k, v] of Object.entries({ tf: T.tf, nf: T.nf, lf: T.lf, ts: T.ts, lsz: T.lsz + 'px', sp: T.sp ?? '.02em' })) grid.style.setProperty('--' + k, v)
    if (!changed || changed === 'C') { applyTheme(root, api, AXES.C.opts[mix.C - 1][1], { park: true }); showWire() } else if (changed === 'W') showWire()
    root.querySelectorAll('.mx[data-ax]').forEach((b) => { const k = b.dataset.ax; b.textContent = k + mix[k]; b.title = `${AXES[k].name}: ${AXES[k].opts[mix[k] - 1][0]}`; b.setAttribute('aria-label', b.title) })
    store('nn-mix24', mixCode(mix).replace(/ /g, ''))
    if (changed === 'L' || !changed) requestAnimationFrame(() => { syncCam?.(); camTo(bird ? 'top' : 'home') })
    if (last) render(last)
    if (modal === 'mix') paintModal()
  }
  const stepAx = (k, d) => { const n = AXES[k].opts.length; mix[k] = ((mix[k] - 1 + d + n) % n) + 1; applyMix(k); const b = root.querySelector(`.mx[data-ax="${k}"]`); b?.classList.add('ch'); setTimeout(() => b?.classList.remove('ch'), 500) }
  root.querySelectorAll('.mx[data-ax]').forEach((b) => {
    b.addEventListener('click', (e) => { pressEl(b); stepAx(b.dataset.ax, e.shiftKey ? -1 : 1) })
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); pressEl(b); stepAx(b.dataset.ax, -1) })
  })
  E('#c24lg').addEventListener('click', () => { pressEl(E('#c24lg')); openMod('mix') })

  function applyBall(b) {
    cur = b; edited = false
    Object.assign(api.state, { ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false })
    api.setPreview(true); api.update()
  }
  function setMode(m) {
    mode = m
    root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m))
    if (m === 'replay' && R.balls.length) { balls = filtered(); idx = Math.min(idx, balls.length - 1); applyBall(balls[idx]) } else { if (m === 'replay') mode = 'whatif'; cur = null; api.state.carry = 1; api.state.dws = 0; api.state.tab = true; api.setPreview(true); api.update() }
    paintChooser()
  }
  const step = (d) => { if (mode !== 'replay' || !balls.length) return; idx = (idx + d + balls.length) % balls.length; applyBall(balls[idx]); paintChooser() }
  function paintChooser() {
    const el = E('#c24ch')
    if (mode !== 'replay') { el.innerHTML = '<div class="r2">WHAT-IF: THE SWING YOU SET BELOW</div>'; return }
    const bn = pname(cur?.b), pn = pname(cur?.p)
    el.innerHTML = `<div class="r1"><span class="bt" data-st="-1" aria-label="previous ball">&lt;</span><span class="bt" data-st="1" aria-label="next ball">&gt;</span> BALL ${idx + 1} OF ${balls.length}
      ${[['giants', 'GIANTS HR'], ['oracle', 'ORACLE HR'], ['all', 'ALL']].map(([k, l]) => `<span class="bt${filter === k ? ' on' : ''}" data-f="${k}">${l}</span>`).join('')}</div>
      <div class="r2"><b>${bn ? bn[0].toUpperCase() : 'BATTER ' + cur?.b}</b> V ${pn ? pn[0].toUpperCase() : 'PITCHER'}  ${cur?.d ?? ''}  ${cur?.park === 'SF' ? 'AT ORACLE' : 'AT ' + (cur?.park ?? '')}</div>`
    el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { pressEl(b); step(Number(b.dataset.st)) }))
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { pressEl(b); filter = b.dataset.f; balls = filtered(); idx = 0; applyBall(balls[0]); paintChooser() }))
    for (const x of el.querySelectorAll('.bt')) { x.tabIndex = 0; x.setAttribute('role', 'button'); if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', x.textContent.trim()) }
  }
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { pressEl(b); setMode(b.dataset.mode) }))
  const slots = [...root.querySelectorAll('.strip .bt')]
  ctl.els = slots
  ctl.onArm = () => paintSlots()
  ctl.onChange = () => { edited = true; paintSlots() }
  slots.forEach((el, i) => {
    el.addEventListener('click', (e) => { const d = e.target.closest('i[data-d]'); if (i === 6) { fire(); return } ctl.arm(i); if (d) ctl.change(i, Number(d.dataset.d)) })
    el.addEventListener('wheel', (e) => { if (i === 6) return; e.preventDefault(); ctl.arm(i); ctl.change(i, e.deltaY < 0 ? 1 : -1) }, { passive: false })
  })
  const fire = () => { pressEl(slots[6]); ses.fire() }
  ctl.bind(fire, 'h')
  const paintSlots = () => slots.forEach((el, i) => { el.classList.toggle('arm', i === ctl.armed && i < 6); if (i < 6) el.querySelector('b').textContent = ctl.text(ctl.SLOTS[i].k) })

  // ---- odds: the final model for an unedited real ball; the what-if model (or real balls like it) for anything else ----
  function odds() {
    const s = api.state
    // the final model's odds belong to the real ball where it was really hit; anywhere else (another park, an edited or what-if swing) the what-if model at the loaded park
    const at = window.__parkX ?? 'SF'
    if (mode === 'replay' && cur && !edited && cur.pm != null && cur.park === at) return { p: cur.pm, src: 'MODEL' }
    if (wim && last) { const b = last.landB ?? s.dir, w = api.wallAt?.(b) ?? [400, 8], el = parks.parks.find((p) => p.abbr === at)?.elev_ft ?? 0; return { p: whatIfP(wim, { ev: s.ev, la: s.la, bear: b, hand: s.hand, temp: s.temp, elev: el, fence: w[0], wallh: w[1] }), src: at === 'SF' ? 'WHAT-IF MODEL' : 'WHAT-IF MODEL AT ' + at } }
    const l = ballsLike(pool, s.ev, s.la, s.dir)
    return l.n ? { p: l.hr, src: `${l.n} REAL BALLS LIKE THIS` } : { p: null, src: 'NO REAL BALLS THAT CLOSE' }
  }
  const pct = (p) => (p == null ? '--' : p >= 0.995 ? '>99' : p < 0.005 ? '<1' : String(Math.round(p * 100)))
  const stampWord = (p, la) => (la < 10 ? 'WORM BURNER' : p == null ? '--' : p >= 0.95 ? 'NO DOUBTER' : p >= 0.7 ? 'GONER' : p >= 0.35 ? 'COIN FLIP' : p >= 0.08 ? 'LONG SHOT' : 'CAN OF CORN')

  // ---- pop-ups: every stat, the thirty parks, every mixer option ----
  const openMod = (k) => { modal = k; E('#c24m').classList.add('open'); paintModal() }
  const closeMod = () => { modal = null; E('#c24m').classList.remove('open') }
  E('#c24cl').addEventListener('click', closeMod)
  E('#c24m').addEventListener('click', (e) => { if (e.target === E('#c24m')) closeMod() })
  function paintModal() {
    if (!modal) return
    const b = cur, body = E('#c24mb')
    if (modal === 'mix') {
      E('#c24mt').textContent = '/ T H E   M I X E R /'
      body.innerHTML = `<div class="legend"><div class="code num">${mixCode(mix)}</div>` + ORDER.map((k) => `<div><h5>${k} ${AXES[k].name}</h5>${AXES[k].opts.map((o, i) => `<div class="o${mix[k] === i + 1 ? ' on' : ''}" data-k="${k}" data-i="${i + 1}"><b>${k}${i + 1}</b>${o[0]}<span>${k === 'C' ? '' : o[1]}</span></div>`).join('')}</div>`).join('') + '</div>'
      body.querySelectorAll('.o').forEach((o) => o.addEventListener('click', () => { mix[o.dataset.k] = Number(o.dataset.i); applyMix(o.dataset.k) }))
      return
    }
    if (modal === 'bay') { paintBay(body); return }
    if (modal === 'bulletin' || modal === 'dinger') { paintDaily(body); return }
    if (modal === 'witness') { if (!body.querySelector('.wgrid') || !paintModal.keepW) paintWitness(body); paintModal.keepW = true; return }
    paintModal.keepW = false
    if (!last) return
    if (modal === 'parks') {
      E('#c24mt').textContent = '/ T H I R T Y   P A R K S /'
      const pr = evalParks(parks, api)
      body.innerHTML = `<div style="font-size:20px;margin-bottom:10px;color:var(--acc)">GONE IN ${U.goneWord(parks, api, pr)} PARKS</div><div class="pk">${tileHTML(pr)}</div><div class="baya">CLICK A PARK TO FLY THIS BALL THERE.</div>`
      body.querySelectorAll('.pk .tile').forEach((t, i) => { t.style.cursor = 'pointer'; t.style.pointerEvents = 'auto'; t.addEventListener('click', () => goPark(pr[i].p.abbr)) })
    } else {
      E('#c24mt').textContent = '/ E V E R Y   S T A T /'
      body.innerHTML = `<div class="allst">${statCols(last).map(([h, rows]) => `<div><h5>${h}</h5>${rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')}</div>`).join('')}</div>`
    }
  }
  // BAY BAROMETER: tonight's air at Oracle Park (Open-Meteo forecast, fetched once per visit) turned into feet of carry for one reference fly ball, flown through
  // the same engine and carry table as everything else, against a 62 F, 1015 hPa night. Wind is listed but not flown: it added nothing measurable in the model tests.
  let bay = null
  const OM = 'https://api.open-meteo.com/v1/forecast?latitude=37.7786&longitude=-122.3893&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover_low,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=2'
  const REF = { ev: 103, la: 28, dir: 0, hand: 1, wind: 0, carry: 1, dws: 0, tab: true }
  const carryFt = (t, hpa) => api.fly({ ...api.state, ...REF, temp: t }, { hPa: hpa }).landFt
  const compass = (d) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8]
  function paintBay(body) {
    E('#c24mt').textContent = '/ B A Y   B A R O M E T E R /'
    if (!bay) {
      body.innerHTML = '<div class="bay">READING THE BAY...</div>'
      bay = fetch(OM).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((j) => (bay = j)).catch(() => (bay = { error: true })).finally(() => { if (modal === 'bay') paintBay(E('#c24mb')) })
      return
    }
    if (bay instanceof Promise) return
    if (bay.error) { body.innerHTML = '<div class="bay">COULD NOT REACH OPEN-METEO. TRY AGAIN LATER.</div>'; bay = null; return }
    const H = bay.hourly, now = Date.now(), i0 = Math.max(0, H.time.findIndex((t) => new Date(t).getTime() > now - 3600e3))
    const base = carryFt(62, 1015), rows = []
    for (let i = i0; i < Math.min(H.time.length, i0 + 10); i++) rows.push({ t: H.time[i].slice(11, 16), T: H.temperature_2m[i], rh: H.relative_humidity_2m[i], p: H.surface_pressure[i], w: H.wind_speed_10m[i], wd: H.wind_direction_10m[i], low: H.cloud_cover_low[i], vis: H.visibility[i], d: carryFt(H.temperature_2m[i], H.surface_pressure[i]) - base })
    const r0 = rows[0], karl = r0.low >= 60 || r0.vis < 5000
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
    E('#c24mt').textContent = '/ B L A S T   B U L L E T I N /'
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
    E('#c24mt').textContent = '/ D A I L Y   D I N G E R /'
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
    body.querySelectorAll('[data-c]').forEach((x) => x.addEventListener('click', () => { pressEl(x); st.a.push(x.dataset.c === '1'); store('nn-dd-' + date, JSON.stringify(st)); paintDinger(body) }))
  }
  // ---- WALLOP WITNESS: tick the Oracle Park games you were at; every home run you saw, the longest, and all of them laid end to end. Kept in this browser for now
  // (nn-witness); a shared, per-friend list behind the token gate comes with the nightly job. Games: every Oracle game with a home run since 2023-07-14 (the replay set).
  let lib = null
  loadLibrary().then((l) => { lib = l }).catch(() => {})
  const oracleHR = R.balls.filter((b) => b.park === 'SF' && b.hr)
  const gamesAt = [...new Set(oracleHR.map((b) => b.d))].sort().reverse()
  function paintWitness(body) {
    E('#c24mt').textContent = '/ W A L L O P   W I T N E S S /'
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
    body.querySelectorAll('.wd').forEach((x) => x.addEventListener('click', () => { const d = x.dataset.d; seen = seen.includes(d) ? seen.filter((y) => y !== d) : [...seen, d]; store('nn-witness', JSON.stringify(seen)); paintWitness(body) }))
  }
  function statCols(res) {
    const s = api.state, b = cur, v = res.verdict, bn = b ? pname(b.b) : null, pn = b ? pname(b.p) : null, o = odds()
    const runners = b ? [b.r1 ? '1B' : '', b.r2 ? '2B' : '', b.r3 ? '3B' : ''].filter(Boolean).join(' ') || 'NONE' : '--'
    const pr = parks.parks.length ? evalParks(parks, api) : [], gone = pr.length ? U.goneWord(parks, api, pr) : '--'
    return [
      ['GAME', [['BATTER', bn ? `${bn[0]}${bn[1] ? ' #' + bn[1] : ''}` : b ? '#' + b.b : 'YOUR SWING'], ['BATS', b ? b.s : s.hand > 0 ? 'R' : 'L'], ['PITCHER', pn ? pn[0] : '--'], ['THROWS', b?.t ?? '--'], ['DATE', b?.d ?? '--'], ['PARK', b ? (b.park === 'SF' ? 'ORACLE PARK' : b.park) : 'ORACLE PARK'], ['INNING', b ? `${b.tb === 'Top' ? 'TOP' : 'BOT'} ${b.in ?? '--'}` : '--'], ['COUNT', b && b.bl != null ? `${b.bl}-${b.sk}` : '--'], ['OUTS', f(b?.ou, 0)], ['RUNNERS ON', runners], ['SCORE (BAT-FLD)', b && b.bsc != null ? `${b.bsc}-${b.fsc}` : '--'], ['TIME THROUGH ORDER', f(b?.tto, 0)], ['BATTER AGE', f(b?.agb, 0)], ['PITCHER AGE', f(b?.agp, 0)]]],
      ['PITCH', [['TYPE', b ? PITCH[b.pt] ?? b.pt ?? '--' : '--'], ['SPEED', f(b?.pv, 1, ' MPH')], ['EFFECTIVE SPEED', f(b?.eff, 1, ' MPH')], ['SPIN RATE', f(b?.rpm, 0, ' RPM')], ['SPIN TILT', b ? clock(b.ax) : '--'], ['SPIN AXIS', f(b?.ax, 0, '°')], ['RELEASE SIDE', f(b?.rx, 2, ' FT')], ['RELEASE HEIGHT', f(b?.rz, 2, ' FT')], ['EXTENSION', f(b?.ext, 1, ' FT')], ['ARM ANGLE', f(b?.arm, 0, '°')], ['PLATE X', f(b?.px, 2, ' FT')], ['PLATE Z', f(b?.pz, 2, ' FT')], ['ZONE', f(b?.zn, 0)], ['BREAK H / V', b && b.hx != null ? `${b.hx.toFixed(0)} / ${b.hz?.toFixed(0)} IN` : '--'], ['APPROACH ANGLE', f(b?.vaa, 1, '°')]]],
      ['SWING AND CONTACT', [['BAT SPEED', f(b?.bs, 1, ' MPH')], ['SWING LENGTH', f(b?.sl, 1, ' FT')], ['ATTACK ANGLE', f(b?.aa, 1, '°')], ['ATTACK DIRECTION', f(b?.ad, 1, '°')], ['SWING TILT', f(b?.tilt, 0, '°')], ['INTERCEPT X / Y', b && b.ix != null ? `${b.ix.toFixed(1)} / ${b.iy?.toFixed(1)} IN` : '--'], ['EXIT SPEED', `${(b?.ev ?? s.ev).toFixed(1)} MPH`], ['LAUNCH ANGLE', `${(b?.la ?? s.la).toFixed(1)}°`], ['GAP (LAUNCH - ATTACK)', b?.aa != null ? `${(b.la - b.aa).toFixed(1)}°` : '--'], ['LANDING BEARING', `${(b?.dir ?? s.dir).toFixed(1)}°`], ['HIT LOCATION', f(b?.hl, 0)], ['BALL TYPE', b?.bbt ? b.bbt.replace(/_/g, ' ').toUpperCase() : '--'], ['CONTACT QUALITY', b?.lsa ? LSA[b.lsa] ?? b.lsa : '--']]],
      ['RESULT AND VALUE', [['OUTCOME', b ? (b.ev_ ?? '').replace(/_/g, ' ').toUpperCase() : '--'], ['HOME RUN ODDS', o.p != null ? pct(o.p) + '%' : '--'], ['ODDS FROM', o.src], ['PROJECTED DISTANCE', b ? `${b.ft} FT` : '--'], ['EXPECTED AVG', f(b?.xba, 3)], ['EXPECTED WOBA', f(b?.xw, 3)], ['EXPECTED SLG', f(b?.xs, 3)], ['RUN VALUE', b?.dre != null ? (b.dre >= 0 ? '+' : '') + b.dre.toFixed(3) : '--'], ['WIN VALUE', b?.dwe != null ? (b.dwe >= 0 ? '+' : '') + (b.dwe * 100).toFixed(1) + '%' : '--'], ['ENGINE VERDICT', v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL' : 'IN PLAY'], ['PARKS WHERE GONE', gone], ['WALL HERE', v.wallFt ? `${Math.round(v.wallFt)} FT, ${v.wallH.toFixed(0)} FT HIGH` : '--'], [v.kind === 'GONE' ? 'CLEARED BY' : 'SHORT BY', v.wallFt ? `${(v.kind === 'GONE' ? v.clearBy : v.short ?? 0).toFixed(1)} FT` : '--']]],
      ['FLIGHT AND AIR', [['SIMULATED DISTANCE', `${Math.round(res.landFt)} FT`], ['APEX', `${Math.round(res.peakFt)} FT`], ['HANG TIME', `${res.hang.toFixed(2)} S`], ['CARRY FACTOR', b ? b.carry.toFixed(3) : '1.000'], ['SIDE SPIN OFFSET', b ? `${b.dws} RPM` : '0 RPM'], ['AIR DENSITY', res.rho.toFixed(3)], ['TEMPERATURE', `${Math.round(s.temp)} F`], ['HUMIDITY', f(b?.rh, 0, '%')], ['PRESSURE', f(b?.hpa, 0, ' HPA')], ['WIND', b?.wm != null ? `${b.wm} MPH` : '--'], ['WIND DIRECTION', f(b?.wd, 0, '°')], ['GUSTS', f(b?.wg, 0, ' MPH')], ['BACKSPIN (PRIOR)', `${Math.round(res.wb)} RPM`], ['SIDE SPIN (PRIOR)', `${Math.round(res.ws)} RPM`]]],
    ]
  }
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Escape') closeMod()
    else if (modal) return
    else if (e.key === ']' || e.key === '.') { e.preventDefault(); step(1) } else if (e.key === '[' || e.key === ',') { e.preventDefault(); step(-1) } else if (e.key === 'b' || e.key === 'B') flipBird()
    else if (e.key === 'm' || e.key === 'M') setMode(mode === 'replay' ? 'whatif' : 'replay')
    else if (e.key === 'a' || e.key === 'A') openMod('stats')
    else if (e.key === '?') openMod('mix')
    else if (e.key === 'l' || e.key === 'L') setShow('lp')
    else if (e.key === 'g' || e.key === 'G') setShow('se')
    else if (e.key === 'w' || e.key === 'W') openMod('bay')
    else if (e.key === 'c' || e.key === 'C') setShow('sc')
  })
  api.setPreview(true)

  // ---- the pieces (each picture sits in its own box; the font is sized to fit that box) ----
  const ro = new ResizeObserver((ents) => { for (const en of ents) { const pre = en.target.querySelector('pre'); if (pre?._fit) fit(pre, en.target, pre._fit.lines, pre._fit.am) } if (last) { paintHists(last); paintPitch() } })
  ro.observe(E('#c24hi')); ro.observe(E('.c24 .pitch'))
  function fit(pre, box, lines, am) {
    if (!pre._fit) ro.observe(box)
    pre._fit = { lines, am }
    const cols = Math.max(...lines.map((l) => l.length))
    const fs = Math.max(3, Math.min(18, (box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)))
    pre.className = 'art ' + am.cls.replace(/^art\s*/, '')
    pre.style.fontSize = fs + 'px'
    pre.textContent = lines.join('\n')
  }
  const artStyle = (which) => { const a = AXES.A.opts[mix.A - 1], id = which === 'face' ? a[2] : a[3]; return STYLES.find((s) => s.id === id) ?? STYLES[0] }
  function paintBatter() {
    const s = api.state, id = cur ? String(cur.b) : null, bat = id ? pname(id) : null, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const real = id && facesRaw[id], gen = !real && id && hasGen ? genericFace('composite', id) : null
    const st = artStyle('face'), am = artMetrics(st), src = real ? faceSource(facesRaw[id]) : gen ? gen.src : drawBust(160)
    // as many character columns as the box can show at a legible size (at least 4.5 px per character), finer for bigger boxes
    const box = E('#c24f'), enh = real ? { enh: { stretch: true, k: 1.5, sigma: 18 } } : gen ? gen.enh : {}
    let cols = Math.max(24, Math.min(64, Math.round(box.clientWidth / 5.5))), lines = src ? renderArt(src, st, cols, enh).lines : null
    while (lines && cols > 24 && Math.min((box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)) < 4.5) { cols = Math.max(24, Math.round(cols * 0.85)); lines = renderArt(src, st, cols, enh).lines }
    if (lines) fit(E('#c24f pre'), box, lines, am)
    const name = bat ? bat[0] : cur ? 'BATTER ' + cur.b : 'YOUR SWING'
    E('#c24i').innerHTML = `<b>${name.toUpperCase()}</b><span>${bat?.[1] ? '#' + bat[1] + ' &nbsp; ' : ''}BATS ${hand === 'R' ? 'RIGHT' : 'LEFT'}</span>
      <div class="row"><span class="bt" id="c24bs">STATS</span><span class="bt" id="c24bk">PARKS</span></div>`
    E('#c24bs').addEventListener('click', () => { pressEl(E('#c24bs')); openMod('stats') })
    E('#c24bk').addEventListener('click', () => { pressEl(E('#c24bk')); openMod('parks') })
  }
  function paintSwing() {
    const s = api.state, real = cur && cur.aa != null, aa = real ? cur.aa : 1.73 + 0.078 * s.la + 0.063 * s.ev, la = s.la, vaa = cur?.vaa ?? -6.4, hand = cur ? cur.s : s.hand > 0 ? 'R' : 'L'
    const W = 520, H = 330, src = has3d ? batter3dSource({ aa, hand, w: W, h: H, mirrorW: W, rays: { la, vaa, len: 200 } }) : drawBatter({ t: 2 / 3, aa, hand, w: W, h: H, mirrorW: W, rays: { la, vaa, len: 200 } })
    if (!src) return
    const st = artStyle('swing'), am = artMetrics(st)
    // fewer, larger characters for a short box; and never more columns than the box can show at 3 px a character
    const box = E('#c24s'), bh = box.clientHeight
    let cols = bh < 140 ? 52 : bh < 200 ? 68 : 84, lines = renderArt(src, st, cols).lines
    while (cols > 20 && Math.min((box.clientWidth - 2) / (cols * am.w), (box.clientHeight - 2) / (lines.length * am.h)) < 3) { cols = Math.max(20, Math.round(cols * 0.8)); lines = renderArt(src, st, cols).lines }
    fit(E('#c24s pre'), box, lines, am)
    const gap = la - aa
    E('#c24cap').innerHTML = `<b>ATTACK ${aa >= 0 ? '+' : ''}${aa.toFixed(0)}°</b> &nbsp; <b>LAUNCH ${la.toFixed(0)}°</b> &nbsp; GAP ${gap >= 0 ? '+' : ''}${gap.toFixed(0)}°<br>${real ? `BAT ${f(cur.bs, 0)} MPH &nbsp; ` : '<i>TYPICAL BAT PATH, NOT MEASURED</i> &nbsp; '}EXIT ${Math.round(s.ev)} MPH`
  }
  function zone3(b, W, H) {
    const zl = 0.708, st = b.st ?? 3.4, sb = b.sb ?? 1.6, mx = 0.55, my = 0.55
    const xr = zl + mx, zt = st + my, zb = sb - my
    const S = Math.min((W - 4) / (2 * xr), (H - 4) / (zt - zb)), cx = W / 2, cy0 = 2 + (H - 4 - S * (zt - zb)) / 2
    const X = (x) => cx + x * S, Y = (z) => cy0 + (zt - z) * S
    let g = `<rect x="${X(-xr)}" y="${Y(zt)}" width="${2 * xr * S}" height="${(zt - zb) * S}" fill="none" stroke="var(--dim)" stroke-dasharray="2 4"/>`
    const zn = b.zn ?? 0
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const n = r * 3 + c + 1, x0 = X(-zl + (2 * zl * c) / 3), x1 = X(-zl + (2 * zl * (c + 1)) / 3), y0 = Y(st - ((st - sb) * r) / 3), y1 = Y(st - ((st - sb) * (r + 1)) / 3)
      g += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" fill="${n === zn ? 'var(--acc)' : 'none'}" fill-opacity=".28" stroke="var(--tx)" stroke-width="1.5"/>`
      g += `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${((y0 + y1) / 2 + 4).toFixed(1)}" fill="var(--dim)" style="font-size:11px" text-anchor="middle">${n}</text>`
    }
    const px = Math.max(-xr + 0.05, Math.min(xr - 0.05, b.px)), pz = Math.max(zb + 0.05, Math.min(zt - 0.05, b.pz))
    g += `<circle cx="${X(px).toFixed(1)}" cy="${Y(pz).toFixed(1)}" r="${Math.max(5, 0.12 * S).toFixed(1)}" fill="var(--acc)" stroke="var(--k)" stroke-width="1.5"/>`
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`
  }
  function paintPitch() {
    const b = cur, zg = E('#c24zg'), pl = E('#c24pl')
    if (mode !== 'replay' || !b) {
      zg.innerHTML = ''; zg.style.display = 'none'
      const o = odds()
      pl.innerHTML = `<div class="none"><b>NO PITCH FOR A WHAT-IF SWING</b><br>SET THE SWING BELOW; THE BALL IS NOT TIED TO A PITCH.<br>HOME RUN ODDS <b>${pct(o.p)}%</b> FROM ${o.src}</div>`
      return
    }
    zg.style.display = ''
    zg.innerHTML = zone3(b, zg.clientWidth || 136, zg.clientHeight || 120)
    // most important first: rows drop from the end when the panel is short
    const rows = [['SPEED', f(b.pv, 1, ' MPH')], ['SPIN RATE', f(b.rpm, 0, ' RPM')], ['BREAK H / V', b.hx != null ? `${b.hx.toFixed(0)} / ${b.hz?.toFixed(0)} IN` : '--'], ['ZONE', b.zn != null ? (b.zn <= 9 ? b.zn + ' (IN THE ZONE)' : 'OUT OF THE ZONE') : '--'],
      ['LOCATION X / Z', `${f(b.px, 2)} / ${f(b.pz, 2)} FT`], ['APPROACH', f(b.vaa, 1, '°')], ['SPIN TILT', clock(b.ax)], ['EFFECTIVE', f(b.eff, 1, ' MPH')], ['EXTENSION', f(b.ext, 1, ' FT')], ['RELEASE H', f(b.rz, 2, ' FT')], ['SPIN AXIS', f(b.ax, 0, '°')], ['ARM ANGLE', f(b.arm, 0, '°')]]
    pl.innerHTML = `<div class="hd">${(PITCH[b.pt] ?? b.pt ?? 'PITCH').toUpperCase()}</div>` + rows.map(([a, c]) => `<div class="r"><span>${a}</span><b>${c}</b></div>`).join('')
    const rs = [...pl.querySelectorAll('.r')]
    for (let n = rs.length; n > 2 && pl.scrollHeight > pl.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // LANDING PARTY in the histogram panel: the real Oracle home runs most like this ball, numbered as in the park
  function paintLanding(res) {
    const s = api.state, el = E('#c24hi'), hb = E('#c24hb'), bear = res.landB ?? s.dir
    el.querySelector('.t').innerHTML = '/ L A N D I N G &nbsp; P A R T Y /'
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(bear * 2), cur ? cur.d + cur.b : 'w', mix.C].join()
    if (key !== lpKey) { lpKey = key; lpList = lp.show({ ev: s.ev, la: s.la, bear, self: cur }, getComputedStyle(root).getPropertyValue('--acc').trim()) }
    hb.innerHTML = `<div class="lpl"><div class="lph">THE ${lpList.length} ORACLE HOME RUNS MOST LIKE THIS ONE (OF ${lp.count()} SINCE JULY 2023)</div>` + lpList.map((x) => { const n = pname(x.b.b); return `<div class="lpr"><b>${x.n}</b><span class="nm">${(n ? n[0] : 'BATTER ' + x.b.b).toUpperCase()}</span><span>${x.b.d}</span><span>${x.b.ft} FT</span><span class="wh">${x.where}</span></div>` }).join('') + '</div>'
    const rs = [...hb.querySelectorAll('.lpr')]
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // SEAT SEANCE in the histogram panel: where 300 ghosts of this ball come down, by outcome and by zone
  function paintSeance(res) {
    const s = api.state, el = E('#c24hi'), hb = E('#c24hb')
    el.querySelector('.t').innerHTML = '/ S E A T &nbsp; S E A N C E /'
    const key = [Math.round(s.ev * 2), Math.round(s.la * 2), Math.round(s.dir * 2), Math.round(s.temp), s.wind, s.hand, s.carry, s.dws, mix.C].join()
    if (key !== seKey) { seKey = key; const cs = getComputedStyle(root); seRes = se.run({ ...s }, { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), dim: cs.getPropertyValue('--dim').trim() }) }
    const r = seRes, P = (n) => Math.round((100 * (n || 0)) / r.N), seg = [['HOME RUN', r.homers, 'var(--acc)'], ['OFF THE WALL', r.tally.WALL, 'var(--tx)'], ['IN PLAY', r.tally.PLAY, 'var(--dim)'], ['FOUL', r.tally.FOUL, 'var(--ln)']]
    hb.innerHTML = `<div class="sel"><div class="lph">${r.N} GHOSTS OF THIS BALL, SPREAD BY WHAT THE MODEL CANNOT KNOW AT CONTACT</div><div class="sbar">${seg.map(([, n, c]) => `<i style="width:${(100 * (n || 0)) / r.N}%;background:${c}"></i>`).join('')}</div>` + seg.map(([l, n]) => `<div class="lpr2"><span>${l}</span><b>${P(n)}%</b></div>`).join('') + (r.tally.SPLASH ? `<div class="lpr2"><span>SPLASH INTO MCCOVEY COVE</span><b>${P(r.tally.SPLASH)}%</b></div>` : '') + (r.zones.length ? `<div class="lph" style="margin-top:6px">HOME RUNS LAND IN</div>` + r.zones.slice(0, 3).map(([z, n]) => `<div class="lpr2"><span>${z}</span><b>${Math.round((100 * n) / Math.max(r.homers, 1))}%</b></div>`).join('') : '') + '</div>'
    const rs = [...hb.querySelectorAll('.lpr2')]
    for (let n = rs.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rs[n - 1].style.display = 'none'
  }
  // SHOT CALLER in the histogram panel
  function paintShot() {
    const el = E('#c24hi'), hb = E('#c24hb')
    el.querySelector('.t').innerHTML = '/ S H O T &nbsp; C A L L E R /'
    if (!scRes) { hb.innerHTML = '<div class="sel"><div class="lph">CLICK A SPOT IN THE STANDS, THE ARCADE OR THE COVE.</div><div class="lph">SHOT CALLER FINDS THE SWINGS THAT PUT A BALL THERE, AND THE REAL HOME RUNS THAT CAME DOWN CLOSEST.</div></div>'; return }
    const r = scRes, side = (b) => (Math.abs(b) < 1 ? 'DEAD CENTER' : `${Math.abs(b).toFixed(0)}° ${b < 0 ? 'LEFT' : 'RIGHT'}`)
    const sw = (p, l) => `<div class="lpr2"><span>${l}</span><b>${p.ev} MPH AT ${p.la}°, AIMED ${side(p.dir)}</b></div>`
    hb.innerHTML = `<div class="sel"><div class="lph">SPOT: ${Math.round(r.spot.ft)} FT OUT, ${side(r.spot.bearing)}, ${Math.round(r.spot.height)} FT UP</div>` +
      (r.picks.length ? `<div class="lpr2"><span>SWINGS THAT GET THERE</span><b>${r.found}</b></div>` + sw(r.picks[0], 'SOFTEST') + (r.picks[1] ? sw(r.picks[1], 'TYPICAL') : '') + (r.picks[2] ? sw(r.picks[2], 'HARDEST') : '') : '<div class="lpr2"><span>NO SWING IN THE GRID GETS THERE</span><b>--</b></div>') +
      '<div class="lph" style="margin-top:6px">CLOSEST REAL ORACLE HOME RUNS</div>' + r.near.map((n) => { const nm = pname(n.b.b); return `<div class="lpr2"><span>${(nm ? nm[0] : 'BATTER ' + n.b.b).toUpperCase()} ${n.b.d}</span><b>${Math.round(n.d / 0.3048)} FT AWAY</b></div>` }).join('') + '</div>'
    const rows = [...hb.querySelectorAll('.lpr2')]
    for (let n = rows.length; n > 1 && hb.scrollHeight > hb.clientHeight + 1; n--) rows[n - 1].style.display = 'none'
  }
  function paintHists(res) {
    E('#c24hi').querySelector('.t').innerHTML = '/ T H I S &nbsp; B A L L &nbsp; V S &nbsp; A L L &nbsp; B A L L S /'
    const s = api.state, el = E('#c24hi'), hb = E('#c24hb'), fly = s.la >= 15
    const W = el.clientWidth - 28, Hh = el.clientHeight - 28, wide = W > 2.3 * Hh, cols = wide ? 3 : 1
    const foot = mode !== 'replay' || !cur ? (() => { const l = ballsLike(pool, s.ev, s.la, s.dir); return l.n ? `<div class="like">${l.n} REAL BALLS LIKE THIS: <b>${Math.round(l.hr * 100)}%</b> WERE HOME RUNS, ${l.lo} TO ${l.hi} FT, MEDIAN ${l.med}</div>` : '<div class="like">NO REAL BALLS THAT CLOSE</div>' })() : '<div class="key">BARS: EVERY BALL IN PLAY 2023-25. LINE: HOME RUN RATE. ACCENT: THIS BALL</div>'
    const ts = parseFloat(getComputedStyle(grid).getPropertyValue('--ts')) || 1
    const lab = 18 * ts + 6, footH = 22 * ts + 8, rows = 3 / cols
    const hh = Math.max(26, Math.min(80, Math.floor((Hh - footH - rows * lab) / rows) - 4))
    const w = Math.max(140, Math.floor((W - (cols - 1) * 18) / cols))
    const H = [['ev', 'EXIT SPEED', s.ev, `${Math.round(s.ev)} MPH`], ['la', 'LAUNCH ANGLE', s.la, `${Math.round(s.la)}°`], [fly ? 'dist_fb' : 'dist', 'DISTANCE', res.landFt, `${Math.round(res.landFt)} FT`]]
    hb.innerHTML = `<div class="hg" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">` + H.map(([k, l, v, txt]) => { const h = histHonest(D, k, v, { w, h: hh }); return `<div class="h"><div class="lb"><span>${l} <b>${txt}</b></span><span>${h.pct != null ? (h.pct >= 50 ? `HIGHER THAN <b>${h.pct}%</b>` : `LOWER THAN <b>${100 - h.pct}%</b>`) : ''}</span></div>${h.svg}</div>` }).join('') + '</div>' + foot
  }
  // the headline (V axis); its skeleton is rebuilt only when V changes, so the distance can roll up during a swing
  function paintHead(res) {
    const o = odds(), rd = E('#c24rd'), V = mix.V, d = Math.round(res.landFt), pv = !!ses.beat?.preview
    if (rd.dataset.v !== String(V)) {
      rd.dataset.v = String(V)
      const dist = '<span class="big num"><span id="c24d">0</span><i> FT</i></span>', ob = '<span class="big num"><span class="op"></span><i>%</i></span>'
      rd.innerHTML = V === 2 ? `${ob}<span class="lbl osrc"></span><span class="sub"><span id="c24d">0</span> FT &nbsp; <span class="sx"></span></span><div class="gn"></div>`
        : V === 3 ? `${dist}<span class="sub sx"></span><div class="meter">${'<s></s>'.repeat(20)}<em class="num"><span class="op"></span>%</em></div><span class="lbl osrc"></span><div class="gn"></div>`
        : V === 5 ? `<div class="split"><div>${dist}<span class="lbl">DISTANCE</span></div><div>${ob}<span class="lbl">HOME RUN ODDS</span></div></div><span class="sub sx"></span><div class="gn"></div>`
        : `${dist}<span class="sub sx"></span><div class="gn"></div>`
    }
    const set = (sel, html) => rd.querySelectorAll(sel).forEach((e) => { if (e.innerHTML !== html) e.innerHTML = html })
    set('.sx', `APEX ${Math.round(res.peakFt)} FT &nbsp; HANG ${res.hang.toFixed(1)} S${res.verdict.wallFt ? ` &nbsp; WALL ${Math.round(res.verdict.wallFt)} FT, ${res.verdict.wallH.toFixed(0)} HIGH` : ''}`)
    set('.gn', parks.parks.length ? `GONE IN ${U.goneWord(parks, api, evalParks(parks, api))} PARKS` : '')
    set('.op', pct(o.p))
    set('.osrc', 'HOME RUN ODDS · ' + o.src)
    rd.querySelectorAll('.meter s').forEach((s, i) => s.classList.toggle('on', o.p != null && o.p * 20 > i + 0.5))
    const dEl = E('#c24d')
    if (window.__cpFire || pv || !ses.beat) dEl.textContent = d
    dEl.dataset.v = d
    return o
  }
  function render(res) {
    last = res
    paintHead(res)
    if (show === 'lp') paintLanding(res); else if (show === 'se') paintSeance(res); else if (show === 'sc') paintShot(); else paintHists(res)
    paintBatter(); paintSwing(); paintPitch(); paintSlots(); paintTally(); paintVerdict(false); paintModal()
  }
  function paintTally() {
    E('#c24t').innerHTML = `<div class="c"><span>SWINGS </span>${String(ses.swings).padStart(2, '0')} <span> HR </span>${String(ses.hrs).padStart(2, '0')}</div><div><span>BEST </span>${ses.best || '---'}</div>` + ses.log.slice(-2).map((l, i, a) => `<div class="${i === a.length - 1 ? 'n' : ''}">${ses.line(l)}</div>`).join('')
  }
  function paintVerdict(stampIt) {
    const chip = E('#c24v'), b = ses.beat, v = last?.verdict, o = odds()
    const committed = b && !b.preview
    chip.classList.toggle('hr', committed ? isHR(b) : v?.kind === 'GONE')
    const live = v ? (v.kind === 'GONE' ? 'HOME RUN' : v.kind === 'WALL' ? 'OFF THE WALL' : v.kind === 'FOUL' ? 'FOUL BALL' : 'IN PLAY') : ''
    const realSub = mode === 'replay' && cur ? (edited ? 'EDITED: NOT THE REAL BALL' : cur.hr ? 'THE REAL BALL: HOME RUN' : 'THE REAL BALL: ' + (cur.ev_ ?? '').replace(/_/g, ' ').toUpperCase()) : 'PREVIEW: THE FLIGHT ENGINE'
    if (mix.V === 4) {
      chip.classList.toggle('hr', (o.p ?? 0) >= 0.5)
      chip.querySelector('.hd').textContent = stampWord(o.p, api.state.la)
      chip.querySelector('.sb').textContent = realSub
      chip.querySelector('.od').innerHTML = `HOME RUN ODDS <b>${pct(o.p)}%</b>`
    } else {
      chip.querySelector('.hd').textContent = committed ? b.text : live
      chip.querySelector('.sb').textContent = committed ? (b.sub ?? '') : realSub
      chip.querySelector('.od').innerHTML = mix.V === 1 ? `HOME RUN ODDS <b>${pct(o.p)}%</b>` : ''
    }
    chip.querySelector('.od').style.display = chip.querySelector('.od').innerHTML ? '' : 'none'
    if (stampIt) restamp(chip.querySelector('.hd'))
  }
  finishUI(root, { minW: 320, minH: 480 })
  root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode))
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
  window.__mix24 = { get: () => ({ ...mix }), set: (s) => { Object.assign(mix, parseMix(s)); applyMix() }, code: () => mixCode(mix) }
  return {
    render,
    beat: (b) => { ses.onBeat(b); paintVerdict(!!b.last); paintTally(); if (b.last && last) { const el = E('#c24d'); if (el) rollTo(el, Math.round(last.landFt), { steps: 8 }) } if (last) render(last) },
  }
}

