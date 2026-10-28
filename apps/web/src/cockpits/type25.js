// Study 25 type sets: every option is pixel or retro arcade (Andrew, 26 Oct: "Ts have to be this pixelated theme"). T1 is Study 24's TERMINAL; T6 on are new, so a code
// means the same thing in both studies. tf = text face, nf = numbers, lf = labels (panel titles, buttons), ts = size scale for text and numbers, lsz = label size,
// nw / lw = weights for the variable faces. All fonts are OFL, from the google/fonts repo, in public/fonts with their licenses.
export const TYPE_FONTS = `
@font-face{font-family:JZ10;src:url(/fonts/Jersey10-Regular.ttf)}
@font-face{font-family:JZ20;src:url(/fonts/Jersey20-Regular.ttf)}
@font-face{font-family:SILK;src:url(/fonts/Silkscreen-Regular.ttf)}
@font-face{font-family:SILK;src:url(/fonts/Silkscreen-Bold.ttf);font-weight:700}
@font-face{font-family:PIXY;src:url(/fonts/PixelifySans_wght.ttf);font-weight:400 700}
@font-face{font-family:MICRO5;src:url(/fonts/Micro5-Regular.ttf)}
@font-face{font-family:DOTG;src:url(/fonts/DotGothic16-Regular.ttf)}
@font-face{font-family:BYTE;src:url(/fonts/Bytesized-Regular.ttf)}
`
export const TYPES = [
  { c: 1, name: 'TERMINAL', desc: 'VT323 text and numbers, Press Start labels (Study 24 T1)', tf: 'VT', nf: 'VT', lf: 'PS2P', ts: 1, lsz: 8 },
  { c: 6, name: 'JERSEY', desc: 'Jersey 10: tall, chunky, sports-jersey pixel, Press Start labels', tf: 'JZ10', nf: 'JZ10', lf: 'PS2P', ts: 0.98, lsz: 8 },
  { c: 7, hide: 1, name: 'JERSEY HEAVY', desc: 'Jersey 20 numbers (fatter pixels), Jersey 10 text, Silkscreen labels', tf: 'JZ10', nf: 'JZ20', lf: 'SILK', ts: 0.98, lsz: 10, lw: 700 },
  { c: 8, hide: 1, name: 'SILKSCREEN', desc: 'fat small-caps pixel for numbers and labels, VT323 text', tf: 'VT', nf: 'SILK', lf: 'SILK', ts: 0.92, lsz: 10, nw: 700, lw: 700 },
  { c: 9, hide: 1, name: 'PIXELIFY', desc: 'Pixelify Sans everywhere: rounded, chunky, with a real bold', tf: 'PIXY', nf: 'PIXY', lf: 'PIXY', ts: 0.78, lsz: 11, nw: 700, lw: 700 },
  { c: 13, hide: 1, name: 'CABINET', desc: 'Press Start 2P everywhere: the arcade cabinet', tf: 'PS2P', nf: 'PS2P', lf: 'PS2P', ts: 0.56, lsz: 8 },
  { c: 14, hide: 1, name: 'DOT GOTHIC', desc: 'DotGothic16: Japanese arcade dot type, Press Start labels', tf: 'DOTG', nf: 'DOTG', lf: 'PS2P', ts: 0.84, lsz: 8 },
  { c: 15, name: 'MICRO', desc: 'Micro 5 big-pixel numbers and text, Bytesized labels', tf: 'MICRO5', nf: 'MICRO5', lf: 'BYTE', ts: 1.18, lsz: 13 },
  // 28 Oct hybrids of his three keepers (TERMINAL, JERSEY, MICRO)
  { c: 16, name: 'JERSEY + MICRO', desc: 'Jersey 10 text, Micro 5 big-pixel numbers, Press Start labels', tf: 'JZ10', nf: 'MICRO5', lf: 'PS2P', ts: 1.04, lsz: 8 },
  { c: 17, name: 'JERSEY + TERMINAL', desc: 'VT323 text, Jersey 10 numbers, Press Start labels', tf: 'VT', nf: 'JZ10', lf: 'PS2P', ts: 1, lsz: 8 },
  { c: 18, name: 'ALL MICRO', desc: 'Micro 5 for text, numbers and labels alike', tf: 'MICRO5', nf: 'MICRO5', lf: 'MICRO5', ts: 1.18, lsz: 16 },
]
// cut on 28 Oct (Andrew: Commodore, LED and Scoreboard are out); an old code naming one of them falls back to the default
export const CUT_TYPES = [10, 11, 12]
// the CSS variables one type set needs, on any element
export const typeVars = (T) => ({ tf: T.tf, nf: T.nf, lf: T.lf, ts: T.ts, lsz: T.lsz + 'px', nw: T.nw ?? 400, lw: T.lw ?? 400, sp: T.sp ?? '.02em' })
