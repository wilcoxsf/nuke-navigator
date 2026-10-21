// Ten looks for skin K (the 2001 interface). Every look uses very few colours: a field, a line colour, text, and one or two accents; the 3D park is optionally
// pushed through a duotone (dark and light colour) so the whole screen shares one palette. Layouts: 'side' (controls left, readouts right), 'dock' (everything along
// the bottom, the park wide), 'min' (the park full-bleed with a thin control column and the result slab over the bottom).
const base = {
  '--k': '#050608', '--ln': '#1c2a31', '--tx': '#d3e4e9', '--dim': '#71909b',
  '--tb': 'transparent', '--tbg': 'transparent', '--tc': '#d3e4e9',
  '--sl-hr': '#3a5560', '--sl-nuke': '#3a5560', '--sl-splash': '#3a5560', '--sl-scr': '#3a5560', '--sl-wall': '#3a5560', '--sl-play': '#27363d', '--sl-foul': '#27363d', '--sl-wait': '#1a252a', '--sl-tx': '#f0f6f8',
  '--rl': '#27363d', '--rt': '#d3e4e9', '--alarm': '#c0332a', '--acc': '#d3e4e9', '--acct': '#050608', '--bar-h': '#d3e4e9', '--bar-p': '#4a6671',
}
const L = (o) => ({ ...base, ...o })

export const LOOKS_K = {
  1: { name: 'SLATE MONO', layout: 'side', sat: 0.3, duo: ['#04060a', '#c9dbe2', 0.9], bg: '#05070a',
    vars: L({ '--tb': '#34454d', '--tbg': '#0c1114', '--tc': '#d3e4e9', '--sl-hr': '#3f6270', '--sl-nuke': '#3f6270', '--sl-splash': '#3f6270', '--sl-scr': '#3f6270', '--sl-wall': '#3f6270', '--rl': '#2a3a42', '--acc': '#9fc4d0' }) },
  2: { name: 'BONE AND AMBER', layout: 'side', sat: 1, duo: ['#080604', '#ecc27a', 0.9], bg: '#070604',
    vars: L({ '--k': '#070604', '--ln': '#2b2316', '--tx': '#e9d9b5', '--dim': '#8d7a52', '--tb': '#7a5d28', '--tbg': 'transparent', '--tc': '#ecc27a', '--sl-hr': '#c9822a', '--sl-nuke': '#c9822a', '--sl-splash': '#c9822a', '--sl-scr': '#c9822a', '--sl-wall': '#c9822a', '--sl-play': '#2a2113', '--sl-foul': '#2a2113', '--sl-wait': '#1a150b', '--sl-tx': '#fff4dc', '--rl': '#3a2d17', '--rt': '#ecc27a', '--alarm': '#c9822a', '--acc': '#ecc27a', '--acct': '#070604', '--bar-h': '#ecc27a', '--bar-p': '#6b5530' }) },
  3: { name: 'ONE BLUE', layout: 'side', sat: 0.8, duo: ['#04070f', '#9fc0ff', 0.85], bg: '#04070f',
    vars: L({ '--k': '#04070f', '--ln': '#16223d', '--tx': '#cfdcff', '--dim': '#6a7fb0', '--tb': 'transparent', '--tbg': '#1d4cc2', '--tc': '#ffffff', '--sl-hr': '#2c63c8', '--sl-nuke': '#2c63c8', '--sl-splash': '#2c63c8', '--sl-scr': '#2c63c8', '--sl-wall': '#2c63c8', '--sl-play': '#16264d', '--sl-foul': '#16264d', '--sl-wait': '#0d1630', '--rl': '#1d4cc2', '--rt': '#ffffff', '--alarm': '#2c63c8', '--acc': '#9fc0ff', '--acct': '#04070f', '--bar-h': '#9fc0ff', '--bar-p': '#2c4a90' }) },
  4: { name: 'RED ALERT', layout: 'side', sat: 0.9, duo: ['#080303', '#ff9a8a', 0.88], bg: '#070303',
    vars: L({ '--k': '#070303', '--ln': '#2c1412', '--tx': '#f2d0cb', '--dim': '#9a615b', '--tb': '#7a2a24', '--tbg': 'transparent', '--tc': '#ff8f80', '--sl-hr': '#b5302a', '--sl-nuke': '#b5302a', '--sl-splash': '#b5302a', '--sl-scr': '#b5302a', '--sl-wall': '#b5302a', '--sl-play': '#2a1412', '--sl-foul': '#2a1412', '--sl-wait': '#190c0b', '--sl-tx': '#fff0ee', '--rl': '#4a1a16', '--rt': '#ff8f80', '--alarm': '#b5302a', '--acc': '#ff8f80', '--acct': '#070303', '--bar-h': '#ff8f80', '--bar-p': '#6b2a25' }) },
  5: { name: 'PAPER', layout: 'side', sat: 0.55, duo: ['#1a1b1c', '#efe9d8', 0.9], bg: '#e9e5d9', light: true,
    vars: L({ '--k': '#e9e5d9', '--ln': '#1a1b1c', '--tx': '#1a1b1c', '--dim': '#6d6a60', '--tb': '#1a1b1c', '--tbg': 'transparent', '--tc': '#1a1b1c', '--sl-hr': '#1a1b1c', '--sl-nuke': '#c0332a', '--sl-splash': '#1a1b1c', '--sl-scr': '#1a1b1c', '--sl-wall': '#1a1b1c', '--sl-play': '#c9c4b4', '--sl-foul': '#c9c4b4', '--sl-wait': '#d6d1c2', '--sl-tx': '#f4f0e4', '--rl': '#1a1b1c', '--rt': '#f4f0e4', '--alarm': '#c0332a', '--acc': '#c0332a', '--acct': '#f4f0e4', '--bar-h': '#1a1b1c', '--bar-p': '#a39e8e' }) },
  6: { name: 'GIANTS', layout: 'side', sat: 0.4, duo: ['#060504', '#efe3cc', 0.9], bg: '#060504',
    vars: L({ '--k': '#060504', '--ln': '#2a1d12', '--tx': '#f1e6d0', '--dim': '#8d7658', '--tb': '#fd5a1e', '--tbg': 'transparent', '--tc': '#fd5a1e', '--sl-hr': '#fd5a1e', '--sl-nuke': '#fd5a1e', '--sl-splash': '#fd5a1e', '--sl-scr': '#fd5a1e', '--sl-wall': '#fd5a1e', '--sl-play': '#26211a', '--sl-foul': '#26211a', '--sl-wait': '#181410', '--sl-tx': '#fff7ea', '--rl': '#fd5a1e', '--rt': '#060504', '--alarm': '#fd5a1e', '--acc': '#fd5a1e', '--acct': '#060504', '--bar-h': '#fd5a1e', '--bar-p': '#5a4a38' }) },
  7: { name: 'GREEN TERMINAL', layout: 'side', sat: 1, duo: ['#010503', '#7dffa6', 0.92], bg: '#010503',
    vars: L({ '--k': '#010503', '--ln': '#0f2a19', '--tx': '#b9f5cc', '--dim': '#4f8f66', '--tb': '#2a8f4d', '--tbg': 'transparent', '--tc': '#7dffa6', '--sl-hr': '#1c7a3e', '--sl-nuke': '#1c7a3e', '--sl-splash': '#1c7a3e', '--sl-scr': '#1c7a3e', '--sl-wall': '#1c7a3e', '--sl-play': '#0d2416', '--sl-foul': '#0d2416', '--sl-wait': '#08150d', '--sl-tx': '#d9ffe6', '--rl': '#14532b', '--rt': '#b9f5cc', '--alarm': '#1c7a3e', '--acc': '#7dffa6', '--acct': '#010503', '--bar-h': '#7dffa6', '--bar-p': '#25623a' }) },
  8: { name: 'CYAN AND VIOLET', layout: 'side', sat: 0.9, duo: ['#04050c', '#a8e6f2', 0.8], bg: '#04050c',
    vars: L({ '--k': '#04050c', '--ln': '#1a1f3a', '--tx': '#cfe9f2', '--dim': '#7a86b8', '--tb': '#2f8fa6', '--tbg': 'transparent', '--tc': '#8fe3f2', '--sl-hr': '#5a3fa8', '--sl-nuke': '#5a3fa8', '--sl-splash': '#5a3fa8', '--sl-scr': '#5a3fa8', '--sl-wall': '#5a3fa8', '--sl-play': '#1a1f3a', '--sl-foul': '#1a1f3a', '--sl-wait': '#0f1226', '--sl-tx': '#f1edff', '--rl': '#34318a', '--rt': '#d4cdff', '--alarm': '#5a3fa8', '--acc': '#8fe3f2', '--acct': '#04050c', '--bar-h': '#8fe3f2', '--bar-p': '#44509a' }) },
  9: { name: 'DOCK', layout: 'dock', sat: 0.3, duo: ['#04060a', '#c9dbe2', 0.9], bg: '#05070a',
    vars: L({ '--tb': '#34454d', '--tbg': '#0c1114', '--tc': '#d3e4e9', '--sl-hr': '#3f6270', '--sl-nuke': '#3f6270', '--sl-splash': '#3f6270', '--sl-scr': '#3f6270', '--sl-wall': '#3f6270', '--rl': '#2a3a42', '--acc': '#9fc4d0' }) },
  10: { name: 'MINIMAL', layout: 'min', sat: 0.85, duo: ['#050608', '#e8dcc0', 0.9], bg: '#050608',
    vars: L({ '--tb': '#3a4a52', '--tbg': '#0a0e11', '--tc': '#e8dcc0', '--sl-hr': '#c9822a', '--sl-nuke': '#c9822a', '--sl-splash': '#c9822a', '--sl-scr': '#c9822a', '--sl-wall': '#c9822a', '--sl-tx': '#fff4dc', '--rl': '#2a3a42', '--acc': '#e8dcc0', '--bar-h': '#e8dcc0' }) },
}
export const WINDOWS_K = { side: { l: 300, r: 340, t: 44, b: 84, k: 1 }, dock: { l: 0, r: 0, t: 44, b: 196, k: 2 }, min: { l: 232, r: 0, t: 44, b: 0, k: 3 } }
