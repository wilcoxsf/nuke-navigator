// Study 25 sound engine (29 Oct, night, Andrew: "give me a crazy sound pass with everything I could ever want and then some"). Everything is synthesized with WebAudio:
// no sound files, no samples, no speech. One AudioContext for the whole page, four buses (music, effects, ambience under a master with a limiter), each with its own
// level, remembered in this browser (nn-snd-mix). S still switches it all off (nn-snd); nothing starts until the first key or click.
//   window.__nnSound(name, { at, vol }): any sound by name. Names are recipes ('anvil', 'gull', 'roar') or a family name the other pieces use, such as
//   'gag-<gag>-<beat>' and 'happen-<thing>-<beat>': the beat word decides first (a drop whistles down, a hit lands with what fell), then the thing, then a soft blip.
//   An unknown name never throws. `at` (a world position) pans it across the stereo field from the camera and fades it with distance.
//   The bed: a crowd murmur that swells while a ball is in the air, the bay lapping, gulls and a ferry horn now and then, the PA hum.
//   A swing: the crack (a 112 mph ball cracks louder, with a sub thump and the stands' slapback), a whoosh that follows the ball across the speakers, then the crowd:
//   a roar sized by distance, a groan off the wall, the foghorn on a splash, an air horn past 480 ft (the organ's CHARGE! is out, 10 Nov).
//   Easter eggs: type 777 for the Seventh Inning Stretch, 415 for an SF medley, 2010, 2012 or 2014 for a title celebration; every third splash hit, the boats in
//   the Cove lose their minds (a honk storm).
// window.__nnSoundLog lists what played (for the tests); window.__nnSoundRender(name) renders one offline and measures it.
const KEY = 'nn-snd-mix', DEF = { master: 0.9, music: 0.8, sfx: 1, amb: 0.55 }
let ac = null, buses = null, gestured = false, made = 0, amb = null
const mix = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEF } } })()
export const soundOn = () => { try { return localStorage.getItem('nn-snd') !== '0' } catch { return true } }
const LOG = (window.__nnSoundLog = [])
let logN = 0
const log = (e) => { LOG.push({ ...e, i: logN++, t: Math.round(performance.now()) }); if (LOG.length > 1000) LOG.splice(0, LOG.length - 1000) } // i counts every entry ever, so a mark survives the cap

// ---- the context and the buses ----
export function audioCtx() {
  ac ??= new AudioContext()
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  if (!buses) {
    const lim = ac.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2
    const master = ac.createGain(); master.connect(lim).connect(ac.destination)
    buses = { master, lim }
    for (const k of ['music', 'sfx', 'amb']) { buses[k] = ac.createGain(); buses[k].connect(master) }
    applyMix()
  }
  return ac
}
export const bus = (k) => { audioCtx(); return buses[k] ?? buses.sfx }
window.__nnAudio = { ctx: audioCtx, bus } // the jukebox (music25.js) plays through the same context and the MUSIC level
function applyMix() {
  if (!buses) return
  const t = ac.currentTime
  buses.master.gain.setTargetAtTime(soundOn() ? mix.master : 0, t, 0.03)
  for (const k of ['music', 'sfx', 'amb']) buses[k].gain.setTargetAtTime(mix[k], t, 0.03)
}
export function getLevels() { return { ...mix, on: soundOn() } }
export function setLevel(k, v) { if (!(k in DEF)) return; mix[k] = Math.max(0, Math.min(1, Number(v) || 0)); try { localStorage.setItem(KEY, JSON.stringify(mix)) } catch {} applyMix() }
// called when S flips the sound: the master follows, the bed starts or stops
export function refresh() { applyMix(); if (soundOn() && gestured) startAmb(); else stopAmb() }

// ---- noise, per context (the offline renders get their own) ----
const BUFS = new WeakMap()
function bufs(c) {
  let b = BUFS.get(c); if (b) return b
  const n = c.sampleRate * 2, w = c.createBuffer(1, n, c.sampleRate), br = c.createBuffer(1, n, c.sampleRate), wd = w.getChannelData(0), bd = br.getChannelData(0)
  let last = 0
  for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; wd[i] = x; last = (last + 0.02 * x) / 1.02; bd[i] = last * 3.5 }
  b = { w, br }; BUFS.set(c, b); return b
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const rnd = (a, b) => a + Math.random() * (b - a)
const midi = (m) => 440 * 2 ** ((m - 69) / 12)

// ---- the kit a recipe plays with: closures over one context and one output, t = when to start ----
function kitFor(c, out, t0) {
  const B = bufs(c)
  const env = (g, t, a, peak, hold, rel) => { const p = Math.max(0.0002, peak); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p, t + Math.max(0.001, a)); g.gain.setValueAtTime(p, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + Math.max(0.005, rel)) }
  const end = (o, t, d) => t + (o.a ?? 0.004) + (o.hold ?? 0) + d + 0.08
  // an oscillator: d is the release after the attack and hold; f1 glides to it over o.glide (or d); o.vib = [rate, depth in Hz]; o.lp a lowpass
  function tone(type, f, t, d, peak = 0.05, f1 = null, o = {}) {
    const os = c.createOscillator(), g = c.createGain(), stop = end(o, t, d)
    os.type = type; os.frequency.setValueAtTime(f, t); if (f1) os.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (o.glide ?? (o.a ?? 0.004) + (o.hold ?? 0) + d))
    if (o.detune) os.detune.value = o.detune
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg).connect(os.frequency); l.start(t); l.stop(stop); made++ }
    let n = os
    if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.lpq ?? 0.7; n.connect(f2); n = f2 }
    if (o.bp) { const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = o.bp; f2.Q.value = o.bpq ?? 4; n.connect(f2); n = f2 }
    env(g, t, o.a ?? 0.004, peak, o.hold ?? 0, d)
    n.connect(g).connect(o.dest ?? out); os.start(t); os.stop(stop); made++
    return os
  }
  // filtered noise: filt {type, f, q}, sweep to a frequency over the length; o.brown for the darker noise, o.lfo = [rate, depth in Hz] on the filter
  function noise(t, d, filt, peak = 0.05, sweep = null, a = 0.004, o = {}) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), stop = t + a + (o.hold ?? 0) + d + 0.08
    s.buffer = o.brown ? B.br : B.w; s.loop = true; if (o.rate) s.playbackRate.value = o.rate
    f.type = filt.type; f.frequency.setValueAtTime(filt.f, t); f.Q.value = filt.q ?? 0.8
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t + (o.glide ?? a + (o.hold ?? 0) + d))
    if (o.lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.lfo[0]; lg.gain.value = o.lfo[1]; l.connect(lg).connect(f.frequency); l.start(t); l.stop(stop); made++ }
    env(g, t, a, peak, o.hold ?? 0, d)
    s.connect(f).connect(g).connect(o.dest ?? out); s.start(t, Math.random()); s.stop(stop); made++
    return s
  }
  // a panned branch for recipes that scatter voices (boats all round the Cove)
  const pan = (p) => { if (!c.createStereoPanner) return out; const sp = c.createStereoPanner(); sp.pan.value = clamp(p, -1, 1); sp.connect(out); made++; return sp }
  // the ballpark organ: drawbar sines (1, 2, 3, 4, 6, 8 times the note) through a leslie wobble
  function organ(f, t, d, peak = 0.05, o = {}) {
    const g = c.createGain(), tr = c.createGain(), l = c.createOscillator(), lg = c.createGain(), stop = t + d + 0.25
    env(g, t, 0.012, peak, Math.max(0, d - 0.1), 0.12)
    tr.gain.value = 1; l.frequency.value = 6.2; lg.gain.value = 0.18; l.connect(lg).connect(tr.gain); l.start(t); l.stop(stop)
    g.connect(tr).connect(o.dest ?? out)
    ;[[1, 1], [2, 0.75], [3, 0.5], [4, 0.4], [6, 0.18], [8, 0.14]].forEach(([h, w]) => { const os = c.createOscillator(), og = c.createGain(); os.frequency.value = f * h; og.gain.value = w / 3; os.connect(og).connect(g); os.start(t); os.stop(stop); made++ })
    made += 3
  }
  // a voice: a buzz through vowel formants (a seal's bark, a scream, a groan); f0 glides to f1
  function voice(t, d, f0, f1, F, peak = 0.08, o = {}) {
    const os = c.createOscillator(), g = c.createGain(), stop = t + (o.a ?? 0.02) + (o.hold ?? 0) + d + 0.1
    os.type = 'sawtooth'; os.frequency.setValueAtTime(f0, t); if (f1) os.frequency.exponentialRampToValueAtTime(f1, t + (o.a ?? 0.02) + (o.hold ?? 0) + d)
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg).connect(os.frequency); l.start(t); l.stop(stop); made++ }
    env(g, t, o.a ?? 0.02, peak, o.hold ?? 0, d)
    for (const fr of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = o.q ?? 7; os.connect(bp).connect(g); made++ }
    g.connect(o.dest ?? out); os.start(t); os.stop(stop); made += 2
  }
  // bell-ish: inharmonic partials with their own decays
  const partials = (t, f, P, decay, peak, o = {}) => P.forEach(([m, w], i) => tone('sine', f * m, t, decay * (1 - i * 0.12), peak * w, null, { ...o, a: o.a ?? 0.002 }))
  const seq = (t, notes, type = 'square', peak = 0.035, o = {}) => { let u = t; for (const [f, d] of notes) { if (f) tone(type, f, u, d, peak, null, o); u += d * (o.gap ?? 0.9) } return u - t }
  return { c, out, t: t0, tone, noise, pan, organ, voice, partials, seq, env }
}
const at = (K, dt) => ({ ...K, t: K.t + dt })

// ---- the recipes ----
const R = {}
const run = (name, K, o = {}, dt = 0) => { const f = R[name]; if (f) f(dt ? at(K, dt) : K, o) }
// the old menu blips and fanfares (sfx25 used these names)
const SEQ = { move: [[660, 0.035]], pick: [[523, 0.06], [659, 0.06], [784, 0.09]], back: [[392, 0.05], [262, 0.08]], fanfare: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.24]], splash: [[784, 0.06], [988, 0.06], [1319, 0.06], [1568, 0.08], [2093, 0.26]] }
for (const [k, n] of Object.entries(SEQ)) R[k] = (K) => K.seq(K.t, n)
R.blip = (K) => K.tone('square', 880, K.t, 0.05, 0.02)
R.click = (K) => K.tone('square', 1800, K.t, 0.015, 0.03)
// the crack of the bat: harder past 105 mph (a slapback off the stands), and at 112 a sub thump and a ping
R.crack = (K, o) => {
  const ev = o.ev ?? 95, k = clamp((ev - 60) / 45, 0.5, 1.4), t = K.t
  K.noise(t, 0.05, { type: 'bandpass', f: 2600, q: 0.9 }, 0.22 * k); K.tone('triangle', 1900, t, 0.03, 0.08 * k, 500); K.noise(t + 0.01, 0.12, { type: 'lowpass', f: 900 }, 0.05 * k)
  if (ev >= 105) { K.noise(t + 0.17, 0.05, { type: 'bandpass', f: 2300, q: 1 }, 0.05 * k); K.noise(t + 0.31, 0.05, { type: 'bandpass', f: 2100, q: 1 }, 0.02 * k) }
  if (ev >= 112) { K.tone('sine', 85, t, 0.35, 0.22, 32); K.tone('sine', 3300, t + 0.005, 0.12, 0.05, 2600); K.noise(t, 0.02, { type: 'highpass', f: 5000 }, 0.12) }
}
R.contact = R.crack
R.mitt = (K) => { K.noise(K.t, 0.06, { type: 'lowpass', f: 1500 }, 0.25); K.tone('sine', 180, K.t, 0.08, 0.12, 90) }
R.thud = (K) => { K.tone('sine', 110, K.t, 0.18, 0.12, 55); K.noise(K.t, 0.08, { type: 'lowpass', f: 500 }, 0.05) }
// (2 Nov, night: nice touches) a Geiger counter's click as the count-up runs past the wall (GEIGER, NUKE IT's green); a gull's beak on the voxel number; a digit's cube
// knocked off a big number, landing
R.geiger = (K) => { K.noise(K.t, 0.005, { type: 'highpass', f: 2800 }, 0.11); K.tone('square', 3400 + Math.random() * 600, K.t, 0.003, 0.012) }
R.peck = (K) => { K.tone('triangle', 2400, K.t, 0.02, 0.05, 1900); K.noise(K.t, 0.01, { type: 'highpass', f: 3500 }, 0.04) }
R.chip = (K) => { K.tone('triangle', 900, K.t, 0.05, 0.06, 600); K.tone('triangle', 700, K.t + 0.16, 0.04, 0.03, 500) }
R.launch = (K) => K.noise(K.t, 0.7, { type: 'bandpass', f: 500, q: 3 }, 0.03, 2400, 0.25)
R.pop = (K) => { K.noise(K.t, 0.12, { type: 'lowpass', f: 1800 }, 0.12); K.tone('sine', 140, K.t, 0.2, 0.08, 50); for (let i = 0; i < 6; i++) K.noise(K.t + 0.12 + Math.random() * 0.5, 0.03, { type: 'highpass', f: 3000 }, 0.03) }
R.crowd = (K) => K.noise(K.t, 2.6, { type: 'bandpass', f: 900, q: 0.5 }, 0.045, 700, 0.45)
R.ring = (K) => { K.tone('triangle', 1320, K.t, 1.3, 0.035); K.tone('sine', 1985, K.t, 0.9, 0.02) }
// 9 Nov (razzle-dazzle 4, Andrew: yes to the foul-pole ping, "the pole rings like a bell"): a struck bell, the clang of the ball on steel and then a bell's own
// partials (hum, prime, minor third, fifth, nominal and the two above, out of tune with each other as real bells are), the low ones ringing longest
R.bell = (K) => {
  const t = K.t
  K.noise(t, 0.035, { type: 'bandpass', f: 3200, q: 1.4 }, 0.16); K.tone('square', 2600, t, 0.02, 0.05, 1800)
  K.partials(t, 660, [[0.5, 0.55], [1, 1], [1.183, 0.5], [1.506, 0.42], [2, 0.6], [2.74, 0.3], [3.76, 0.18]], 3.4, 0.085)
}
R.ding = (K) => K.partials(K.t, 1760, [[1, 1], [2.4, 0.4], [3.9, 0.2]], 0.8, 0.05)
R.water = (K) => K.noise(K.t, 0.6, { type: 'lowpass', f: 3200 }, 0.1, 350)
R['water-plop'] = (K) => { K.tone('sine', 520, K.t, 0.1, 0.07, 140); K.noise(K.t + 0.02, 0.25, { type: 'lowpass', f: 2200 }, 0.05, 400) }
R.whoosh = (K, o) => K.noise(K.t, o.d ?? 0.6, { type: 'bandpass', f: 2400, q: 1.2 }, 0.05, 400, 0.12)
R.swish = (K) => K.noise(K.t, 0.22, { type: 'bandpass', f: 800, q: 1.5 }, 0.025, 3200, 0.03)
R.banner = R.swish
// the walk-up: a drum pickup, then the batter's own tune (sfx25's jingleNotes), a kick on every bar
R.jingle = (K, o) => {
  const J = jingleOf(o.id), t = K.t + 0.36
  for (let i = 0; i < 4; i++) K.noise(K.t + i * 0.09, 0.07, { type: 'bandpass', f: 1900, q: 0.7 }, 0.05 + i * 0.015)
  J.mel.forEach((f, i) => { if (f) K.tone('square', f, t + i * J.beat, J.beat * 0.9, 0.03) })
  J.bass.forEach((f, i) => { K.tone('triangle', f, t + i * 4 * J.beat, J.beat * 3.6, 0.06); K.tone('sine', 120, t + i * 4 * J.beat, 0.15, 0.12, 45) })
}
R.walkup = R.jingle
// ---- the crowd ----
function claps(K, n, span, peak = 0.03) { for (let i = 0; i < n; i++) K.noise(K.t + Math.random() * span, 0.03, { type: 'bandpass', f: rnd(1200, 2600), q: 1.2 }, peak * rnd(0.5, 1)) }
R.roar = (K, o) => {
  const s = clamp(o.size ?? 1, 0.2, 2), hold = 0.6 + s * 1.1
  K.noise(K.t, 2.4, { type: 'bandpass', f: 900, q: 0.5 }, 0.06 * s, 700, 0.2, { brown: false, hold })
  K.noise(K.t, 2.6, { type: 'lowpass', f: 600 }, 0.1 * s, 300, 0.25, { brown: true, hold })
  claps(K, Math.round(40 * s), hold + 2, 0.025)
  for (let i = 0; i < Math.round(3 * s); i++) { const t = K.t + rnd(0.2, hold); K.tone('sine', rnd(1700, 2100), t, 0.35, 0.02, rnd(2500, 3000), { a: 0.05 }) } // whistles
}
R.cheer = (K, o) => R.roar(K, { size: (o.size ?? 0.5) })
R.applause = (K) => claps(K, 60, 2.2, 0.03)
R.groan = (K, o) => { const s = o.size ?? 1; K.noise(K.t, 1.1, { type: 'bandpass', f: 700, q: 3 }, 0.05 * s, 360, 0.15, { hold: 0.4 }); K.noise(K.t, 1.1, { type: 'bandpass', f: 1100, q: 3 }, 0.03 * s, 640, 0.15, { hold: 0.4 }) }
R.aww = (K) => R.groan(K, { size: 0.5 })
R.boo = (K) => { K.noise(K.t, 1.2, { type: 'bandpass', f: 330, q: 4 }, 0.07, 280, 0.2, { hold: 0.6, lfo: [3, 30] }); K.noise(K.t, 1.2, { type: 'bandpass', f: 850, q: 5 }, 0.025, 700, 0.2, { hold: 0.6 }) }
R.laugh = (K) => { for (let v = 0; v < 5; v++) { const f = rnd(170, 280), t0 = K.t + rnd(0, 0.25); for (let i = 0; i < 6; i++) K.voice(t0 + i * 0.15, 0.08, f * (1 - i * 0.02), f * 0.9, [800, 1250], 0.03, { a: 0.01 }) } }
R.oof = (K) => K.voice(K.t, 0.14, 190, 120, [500, 1000], 0.1)
R.scream = (K, o) => K.voice(K.t, o.long ? 1.6 : 1.0, 620, 380, [900, 1500, 2800], 0.11, { a: 0.05, hold: o.long ? 0.6 : 0.3, vib: [7, 45] })
// the Giants' home-run horn (made up for this): two blasts of a big A-major steam chord, scooped up into pitch
R.horn = (K, o) => {
  const v = o.vol ?? 1
  const blast = (t, len) => { for (const [f, dt] of [[110, -6], [138.6, 4], [164.8, -3], [220, 7]]) { K.tone('sawtooth', f * 0.94, t, 0.35, 0.05 * v, f, { a: 0.08, hold: len, glide: 0.14, detune: dt, lp: 900 }) } }
  blast(K.t, 0.45); blast(K.t + 0.85, 1.3)
}
R['hr-horn'] = R.horn
// the foghorn: a diaphone, BEEE then the low grunt
R.foghorn = (K, o) => { const v = o.vol ?? 1; for (const dt of [0, 9]) { K.tone('sawtooth', 182, K.t, 0.15, 0.06 * v, null, { a: 0.15, hold: 0.8, lp: 700, detune: dt }); K.tone('sawtooth', 122, K.t + 1.0, 0.7, 0.07 * v, 112, { a: 0.05, hold: 0.9, lp: 500, detune: dt }) } }
R.ferry = (K) => { for (const f of [73, 110]) K.tone('sawtooth', f, K.t, 0.6, 0.05, null, { a: 0.2, hold: 1.6, lp: 420 }) }
// CHARGE! on the organ (the bugle call, traditional), then the crowd shouts it back
R['organ-charge'] = (K) => {
  let u = K.t
  for (const [m, d] of [[67, 0.16], [72, 0.16], [76, 0.16], [79, 0.3], [76, 0.14], [79, 0.7]]) { K.organ(midi(m), u, d * 0.95, 0.05); u += d }
  K.noise(u + 0.05, 0.4, { type: 'bandpass', f: 800, q: 2 }, 0.09, 600, 0.03, { hold: 0.2 })
  K.noise(u + 0.05, 0.4, { type: 'bandpass', f: 1300, q: 3 }, 0.05, 900, 0.03, { hold: 0.2 })
}
R.charge = R['organ-charge']
R['organ-stab'] = (K) => { for (const m of [60, 64, 67, 72]) K.organ(midi(m), K.t, 0.28, 0.035) }
R.airhorn = (K) => { for (const [t, d] of [[0, 0.22], [0.3, 0.22], [0.6, 0.8]]) for (const f of [466, 554, 698]) K.tone('sawtooth', f, K.t + t, 0.06, 0.03, null, { a: 0.01, hold: d, lp: 3000 }) }
R['honk-storm'] = (K) => { for (let i = 0; i < 16; i++) { const t = K.t + rnd(0, 3.2), f = rnd(85, 250), d = rnd(0.3, 1.1), p = K.pan(rnd(-1, 1)); for (const m of [1, 1.26]) K.tone('sawtooth', f * m, t, 0.2, 0.03, null, { a: 0.05, hold: d, lp: 650, dest: p }) } }
// ---- the UI ----
R['modal-open'] = (K) => { K.tone('square', 523, K.t, 0.08, 0.03, 1046); K.noise(K.t, 0.12, { type: 'highpass', f: 3000 }, 0.02) }
R['modal-close'] = (K) => { K.tone('square', 1046, K.t, 0.08, 0.03, 523); K.noise(K.t, 0.1, { type: 'highpass', f: 2500 }, 0.015) }
R['mode-whatif'] = (K) => K.seq(K.t, [[392, 0.06], [494, 0.06], [587, 0.06], [784, 0.16]])
R['mode-dojo'] = R['mode-whatif']
R['mode-replay'] = (K) => { K.tone('sawtooth', 300, K.t, 0.3, 0.025, 1300, { vib: [22, 60], lp: 2500 }); for (let i = 0; i < 6; i++) K.tone('square', 2400, K.t + i * 0.05, 0.01, 0.015) }
R['mode-shot'] = (K) => { K.tone('sine', 1250, K.t, 0.9, 0.05); K.tone('sine', 1250, K.t + 0.45, 0.7, 0.015) }
R.type = (K) => { K.noise(K.t, 0.02, { type: 'highpass', f: 2500 }, 0.07); K.tone('square', 140, K.t, 0.03, 0.03) }
R['type-ok'] = R.ding
R['type-bad'] = (K) => K.tone('square', 110, K.t, 0.2, 0.04, 100, { a: 0.005, hold: 0.1 })
R.flip = (K) => { for (let i = 0; i < 14; i++) K.noise(K.t + rnd(0, 0.32), 0.008, { type: 'bandpass', f: rnd(2500, 4200), q: 3 }, 0.05) }
R.clack = R.flip
R.ticker = (K) => { for (let i = 0; i < 10; i++) K.tone('square', 1200 + (i % 3) * 200, K.t + i * 0.06, 0.03, 0.02) }
// ---- cartoon foley for the board gags ----
R.anvil = (K) => { K.partials(K.t, 420, [[1, 1], [2.76, 0.5], [5.4, 0.35], [8.93, 0.2]], 1.6, 0.12); K.noise(K.t, 0.05, { type: 'highpass', f: 2000 }, 0.12); K.tone('sine', 90, K.t, 0.3, 0.2, 40) }
R.clang = R.anvil
R['whistle-fall'] = (K, o) => K.tone('sine', 2400, K.t, o.d ?? 1.1, 0.05, 300, { vib: [5, 18], a: 0.05 })
R['slide-up'] = (K) => K.tone('sine', 400, K.t, 0.5, 0.05, 1600, { vib: [6, 20], a: 0.02 })
R['slide-down'] = (K) => K.tone('sine', 1600, K.t, 0.5, 0.05, 400, { vib: [6, 20], a: 0.02 })
R.boing = (K) => { K.tone('sine', 180, K.t, 0.65, 0.09, 330, { vib: [16, 140], glide: 0.1 }); K.tone('triangle', 90, K.t, 0.2, 0.05) }
R.splat = (K) => { K.noise(K.t, 0.25, { type: 'lowpass', f: 1300 }, 0.25, 180); K.noise(K.t + 0.02, 0.16, { type: 'bandpass', f: 650, q: 6 }, 0.12, 250); K.tone('sine', 95, K.t, 0.2, 0.15, 40) }
R.squish = (K) => { R.splat(K); for (let i = 0; i < 7; i++) K.noise(K.t + 0.05 + rnd(0, 0.5), 0.05, { type: 'bandpass', f: rnd(350, 900), q: 10 }, 0.08, rnd(150, 300)) }
R.gore = R.squish
R.drip = (K) => { for (let i = 0; i < 4; i++) K.tone('sine', rnd(1000, 1400), K.t + i * rnd(0.18, 0.3), 0.05, 0.04, 500) }
R.kaboom = (K) => { K.noise(K.t, 2.4, { type: 'lowpass', f: 2000 }, 0.45, 110, 0.005, { brown: true }); K.tone('sine', 72, K.t, 1.2, 0.35, 26); for (let i = 0; i < 18; i++) K.noise(K.t + rnd(0.05, 1.4), 0.02, { type: 'highpass', f: 2500 }, 0.06) }
R.fuse = (K) => { K.noise(K.t, 1.4, { type: 'highpass', f: 4200 }, 0.02, null, 0.05, { hold: 0.8 }); for (let i = 0; i < 26; i++) K.noise(K.t + rnd(0, 1.6), 0.01, { type: 'highpass', f: 3000 }, 0.04) }
R.bonk = (K) => { K.tone('triangle', 760, K.t, 0.08, 0.2, 700); K.tone('sine', 1400, K.t, 0.04, 0.08); for (let i = 0; i < 3; i++) K.tone('sine', 2000 + i * 300, K.t + 0.2 + i * 0.09, 0.15, 0.02) } // and the little birds
R['piano-crash'] = (K) => { for (let i = 0; i < 14; i++) { const f = midi(Math.round(rnd(36, 76))); K.tone(i % 2 ? 'triangle' : 'square', f, K.t + rnd(0, 0.03), 1.4, 0.025, f * 0.98, { a: 0.002, lp: 3000 }) } R.thud(K); K.noise(K.t, 0.5, { type: 'bandpass', f: 1800, q: 0.6 }, 0.08, 500) }
R.piano = R['piano-crash']
R.chipper = (K, o) => {
  const d = o.d ?? 2.4, t = K.t
  for (const f of [85, 90]) K.tone('sawtooth', f, t, 0.4, 0.06, 58, { a: 0.1, hold: d, glide: 0.8, lp: 1300, vib: [30, 8] })
  K.noise(t, 0.3, { type: 'bandpass', f: 1500, q: 2 }, 0.06, null, 0.05, { hold: d, lfo: [11, 600] })
  for (let i = 0; i < 22; i++) K.noise(t + rnd(0.3, d), 0.04, { type: 'bandpass', f: rnd(500, 1800), q: 3 }, 0.1)
}
R.grind = R.chipper
R.guillotine = (K) => { K.noise(K.t, 0.5, { type: 'bandpass', f: 2000, q: 4 }, 0.05, 5000, 0.3); K.tone('sine', 130, K.t + 0.55, 0.25, 0.3, 45); K.noise(K.t + 0.55, 0.12, { type: 'lowpass', f: 800 }, 0.2) }
R.cannon = (K) => { K.noise(K.t, 0.9, { type: 'lowpass', f: 1500 }, 0.4, 120, 0.003, { brown: true }); K.tone('sine', 60, K.t, 0.6, 0.3, 30); K.tone('sine', 1800, K.t + 0.05, 0.35, 0.03, 2600) }
R.flatline = (K) => { for (const dt of [0, 0.6, 1.2]) K.tone('sine', 1000, K.t + dt, 0.08, 0.04); K.tone('sine', 1000, K.t + 1.8, 0.1, 0.04, null, { a: 0.005, hold: 2.0 }) }
R.dies = R.flatline
R.trombone = (K) => { let u = K.t; for (const [f, d] of [[293.7, 0.42], [277.2, 0.42], [261.6, 0.42], [246.9, 1.3]]) { K.tone('sawtooth', f, u, 0.12, 0.05, null, { a: 0.03, hold: d - 0.12, lp: 1300, vib: d > 1 ? [5, 7] : null }); u += d } }
R.cash = (K) => { K.noise(K.t, 0.04, { type: 'bandpass', f: 1600, q: 2 }, 0.12); K.partials(K.t + 0.06, 2093, [[1, 1], [1.26, 0.7], [1.5, 0.5]], 0.9, 0.05); for (let i = 0; i < 9; i++) K.tone('sine', rnd(3000, 5200), K.t + 0.1 + rnd(0, 0.5), 0.06, 0.02) }
R.gong = (K) => { K.partials(K.t, 98, [[1, 1], [1.48, 0.8], [2.03, 0.6], [2.74, 0.45], [3.66, 0.3]], 4, 0.09, { a: 0.02 }); K.noise(K.t, 2, { type: 'bandpass', f: 1200, q: 0.6 }, 0.02, 500, 0.05) }
R['car-alarm'] = (K) => { let u = K.t; for (let i = 0; i < 4; i++) { K.tone('square', 600, u, 0.02, 0.03, 1300, { a: 0.01, hold: 0.23, glide: 0.24, lp: 3000 }); u += 0.26 } for (let i = 0; i < 6; i++) { K.tone('square', i % 2 ? 700 : 950, u, 0.02, 0.03, null, { hold: 0.11, lp: 3000 }); u += 0.14 } }
R.glass = (K) => { K.noise(K.t, 0.3, { type: 'highpass', f: 3000 }, 0.2); for (let i = 0; i < 30; i++) K.tone('sine', rnd(3000, 7500), K.t + rnd(0, 0.5), rnd(0.05, 0.2), 0.015) }
R.bipped = (K) => { R.glass(K); run('car-alarm', K, {}, 0.15) }
R.honk = (K) => { for (const [t, d] of [[0, 0.12], [0.2, 0.4]]) for (const f of [392, 466]) K.tone('square', f, K.t + t, 0.04, 0.03, null, { hold: d, lp: 2200 }) }
R.traffic = (K) => { K.noise(K.t, 0.6, { type: 'lowpass', f: 140 }, 0.12, null, 0.3, { brown: true, hold: 2.2 }); for (let i = 0; i < 8; i++) { const f = rnd(300, 520), t = K.t + rnd(0, 2.6), p = K.pan(rnd(-1, 1)); K.tone('square', f, t, 0.04, 0.025, null, { hold: rnd(0.1, 0.6), lp: 2000, dest: p }) } }
R.rumble = (K) => { K.noise(K.t, 1.2, { type: 'lowpass', f: 90 }, 0.5, null, 0.3, { brown: true, hold: 1.6, lfo: [7, 30] }); for (let i = 0; i < 8; i++) K.noise(K.t + rnd(0.2, 2.4), 0.12, { type: 'bandpass', f: rnd(300, 900), q: 1 }, 0.08) }
R.quake = R.rumble
R.crunch = (K) => { for (let i = 0; i < 5; i++) K.noise(K.t + i * 0.04, 0.05, { type: 'bandpass', f: rnd(900, 1800), q: 1 }, 0.1) }
R.creak = (K) => K.tone('sawtooth', 70, K.t, 0.3, 0.06, 55, { a: 0.1, hold: 0.9, bp: 900, bpq: 12, vib: [3, 9] })
R.chain = (K) => { for (let i = 0; i < 10; i++) K.partials(K.t + rnd(0, 0.6), rnd(2500, 4200), [[1, 1], [1.7, 0.4]], 0.08, 0.03) }
R.slam = (K) => { K.noise(K.t, 0.15, { type: 'lowpass', f: 900 }, 0.3); K.tone('sine', 80, K.t, 0.25, 0.3, 40) }
R.snip = (K) => { K.noise(K.t, 0.03, { type: 'highpass', f: 4000 }, 0.12); K.noise(K.t + 0.06, 0.03, { type: 'highpass', f: 4500 }, 0.1) }
R.gulp = (K) => { K.tone('sine', 420, K.t, 0.12, 0.12, 150); K.tone('sine', 380, K.t + 0.22, 0.12, 0.1, 130) }
R.chomp = (K) => { K.noise(K.t, 0.08, { type: 'bandpass', f: 700, q: 2 }, 0.2); K.noise(K.t + 0.14, 0.08, { type: 'bandpass', f: 600, q: 2 }, 0.2); K.tone('sine', 140, K.t, 0.1, 0.12, 70) }
R.peck = (K) => { for (let i = 0; i < 6; i++) K.tone('triangle', 1500, K.t + i * 0.07, 0.02, 0.07) }
R.gull = (K, o) => { const n = o.n ?? 2; for (let i = 0; i < n; i++) K.tone('sawtooth', 1450, K.t + i * 0.26, 0.2, 0.025, 880, { a: 0.02, vib: [24, 110], bp: 1800, bpq: 3 }) }
R.flock = (K) => { for (let i = 0; i < 14; i++) { const p = K.pan(rnd(-1, 1)); K.tone('sawtooth', rnd(1200, 1700), K.t + rnd(0, 2), 0.18, 0.018, rnd(800, 950), { a: 0.02, vib: [24, 110], bp: 1800, bpq: 3, dest: p }) } for (let i = 0; i < 25; i++) K.noise(K.t + rnd(0, 2.2), 0.06, { type: 'lowpass', f: 600 }, 0.05) }
R['gull-steal'] = (K) => { R.gull(K, { n: 3 }); R.crunch(at(K, 0.3)); R.scurry(at(K, 0.5)) }
R.bark = (K) => { for (let i = 0; i < 3; i++) K.voice(K.t + i * 0.27, 0.16, 270, 190, [650, 1100], 0.12, { a: 0.01 }) }
R.sealions = (K) => { for (let i = 0; i < 7; i++) { const f = rnd(200, 320), p = K.pan(rnd(-0.8, 0.8)); K.voice(K.t + rnd(0, 2), 0.15, f, f * 0.72, [650, 1100], 0.08, { a: 0.01, dest: p }) } }
R.dog = (K) => { for (let i = 0; i < 2; i++) K.voice(K.t + i * 0.3, 0.14, 460, 340, [900, 1700], 0.1, { a: 0.01 }) }
R.spout = (K) => { K.noise(K.t, 0.8, { type: 'bandpass', f: 900, q: 0.8 }, 0.12, 500, 0.05, { hold: 0.4 }); run('water', K, {}, 0.3) }
R.mole = (K) => { K.tone('sine', 2600, K.t, 0.07, 0.04, 3400); K.tone('sine', 2800, K.t + 0.12, 0.07, 0.04, 3600); R.dirt(K) }
R.shatter = (K) => { K.noise(K.t, 0.05, { type: 'highpass', f: 3500 }, 0.25); for (let i = 0; i < 14; i++) K.tone('triangle', 2400 + Math.random() * 3200, K.t + 0.02 + Math.random() * 0.35, 0.05, 0.03) } // (9 Nov: the mirror)
R.dirt = (K) => { for (let i = 0; i < 8; i++) K.noise(K.t + rnd(0, 0.4), 0.05, { type: 'lowpass', f: 700 }, 0.08) }
R.serpent = (K) => { K.noise(K.t, 1.2, { type: 'highpass', f: 3500 }, 0.07, null, 0.2, { hold: 0.5, lfo: [12, 800] }); K.tone('sine', 50, K.t, 1.2, 0.18, 75, { a: 0.4, hold: 0.6 }); run('water', K, {}, 1.0) }
R.hiss = (K) => K.noise(K.t, 0.8, { type: 'highpass', f: 3800 }, 0.06, null, 0.1, { hold: 0.3 })
R.startup = (K) => { K.seq(K.t, [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.07], [1319, 0.22]]); for (const m of [60, 64, 67, 71]) K.tone('sine', midi(m), K.t + 0.3, 1.2, 0.03, null, { a: 0.3 }); R.whoosh(K, { d: 0.5 }) }
R.ipo = (K) => { R.ticker(K); run('gong', K, {}, 0.6); run('cash', K, {}, 0.9); run('roar', K, { size: 0.6 }, 0.9) }
R.evict = (K) => { R.slam(K); for (let i = 0; i < 3; i++) run('thud', K, {}, 0.35 + i * 0.22); run('slam', K, {}, 1.1); run('creak', K, {}, 1.1) }
R.robotaxi = (K) => { K.tone('sine', 300, K.t, 0.8, 0.03, 900, { a: 0.1 }); run('honk', K, {}, 0.6); for (let i = 0; i < 3; i++) K.tone('sine', 1000, K.t + 1.2 + i * 0.3, 0.12, 0.04) }
R.jets = (K) => { K.noise(K.t, 2.2, { type: 'lowpass', f: 300 }, 0.3, 4200, 1.5, { brown: true, glide: 1.5 }); K.noise(K.t + 1.6, 1.8, { type: 'lowpass', f: 4200 }, 0.2, 300, 0.01); K.tone('sawtooth', 62, K.t, 1.6, 0.08, 48, { a: 1.4, lp: 300 }) }
R.flyover = R.jets
R.paddle = (K) => { for (let i = 0; i < 4; i++) K.noise(K.t + i * 0.5, 0.18, { type: 'lowpass', f: 2600 }, 0.06, 500) }
R.siren = (K) => K.tone('sine', 700, K.t, 0.4, 0.025, null, { a: 0.3, hold: 2.4, vib: [0.6, 280], lp: 2000 })
R.escapee = (K) => { R.paddle(K); run('siren', K, {}, 0.4) }
R.bell = (K) => { for (const dt of [0, 0.18, 0.62, 0.8]) K.partials(K.t + dt, 1175, [[1, 1], [2, 0.5], [2.76, 0.35], [5.4, 0.15]], 1.1, 0.06) }
R.cablecar = R.bell
R.blimp = (K) => K.tone('sawtooth', 45, K.t, 0.8, 0.04, null, { a: 0.6, hold: 1.8, lp: 220, vib: [9, 3] })
R.steps = (K) => { for (let i = 0; i < 4; i++) { K.tone('sine', 70, K.t + i * 0.42, 0.14, 0.18, 40); K.noise(K.t + i * 0.42, 0.1, { type: 'bandpass', f: 420, q: 8 }, 0.04) } }
R.machine = (K) => { R.steps(K); R.chain(at(K, 0.2)); R.creak(at(K, 0.9)) } // The Machine: heavy boots, leather, chains
R.scurry = (K) => { for (let i = 0; i < 12; i++) K.tone('triangle', rnd(1700, 2300), K.t + i * 0.045, 0.015, 0.04) }
R.kiss = (K) => { K.noise(K.t, 0.06, { type: 'bandpass', f: 1200, q: 8 }, 0.1, 3000); K.tone('sine', 900, K.t + 0.03, 0.06, 0.05, 1600) }
R.shove = (K) => { K.noise(K.t, 0.12, { type: 'lowpass', f: 500 }, 0.15); R.oof(at(K, 0.04)) }
R.drumroll = (K, o) => { const d = o.d ?? 1.2; for (let u = 0; u < d; u += 0.045) K.noise(K.t + u, 0.04, { type: 'bandpass', f: 2000, q: 0.8 }, 0.02 + 0.05 * (u / d)); K.noise(K.t + d, 1.2, { type: 'highpass', f: 5000 }, 0.1) }
R.rimshot = (K) => { K.tone('sine', 165, K.t, 0.12, 0.15, 110); K.tone('sine', 110, K.t + 0.15, 0.14, 0.15, 80); K.noise(K.t + 0.32, 0.8, { type: 'highpass', f: 6000 }, 0.1) }
R.scratch = (K) => { K.noise(K.t, 0.3, { type: 'bandpass', f: 1000, q: 3 }, 0.12, 3200, 0.01, { glide: 0.12 }); K.tone('sawtooth', 200, K.t, 0.25, 0.03, 700, { glide: 0.1 }) }
R.gurgle = (K) => { K.noise(K.t, 0.6, { type: 'lowpass', f: 300 }, 0.18, null, 0.1, { hold: 0.8, lfo: [6, 150], brown: true }); for (let i = 0; i < 10; i++) K.tone('sine', rnd(150, 320), K.t + rnd(0, 1.3), 0.06, 0.06, rnd(80, 140)) }
R.barf = (K) => { K.voice(K.t, 0.5, 140, 90, [500, 900], 0.1, { a: 0.03, vib: [17, 25] }); run('splat', K, {}, 0.45) }
R.flush = (K) => { K.noise(K.t, 1.2, { type: 'lowpass', f: 1800 }, 0.12, 300, 0.05, { hold: 0.5, lfo: [3, 400] }); run('gurgle', K, {}, 1.2) }
R.gust = (K) => { K.noise(K.t, 1.4, { type: 'bandpass', f: 400, q: 1.5 }, 0.08, 1200, 0.8, { glide: 1.0 }); K.tone('sine', 700, K.t + 0.4, 0.8, 0.01, 900, { a: 0.4, vib: [4, 40] }) }
R.rocket = (K) => { K.noise(K.t, 1.4, { type: 'bandpass', f: 900, q: 1 }, 0.1, 3200, 0.1); run('pop', K, {}, 1.4) }
R.fireworks = (K) => { R.launch(K); run('pop', K, {}, 0.7) }
R.laser = (K) => { for (let i = 0; i < 3; i++) K.tone('sawtooth', 3000, K.t + i * 0.12, 0.25, 0.04, 200, { lp: 5000 }) }
R.zap = R.laser
R.heartbeat = (K) => { for (let i = 0; i < 3; i++) { K.tone('sine', 60, K.t + i * 0.8, 0.1, 0.25, 45); K.tone('sine', 55, K.t + i * 0.8 + 0.18, 0.12, 0.2, 40) } }
R.splash2 = (K) => { R.water(K); for (let i = 0; i < 8; i++) K.tone('sine', rnd(600, 1400), K.t + rnd(0, 0.4), 0.05, 0.03, 300) }

// ---- 1 Nov, night (Andrew: "Let's make more sounds yeah - can we have multiple sounds for a launch / nuke?"): NUKE IT's launch comes off a shuffled deck, each one
// the crack of the bat first (the contact stays true) and then its own tail; and the new landings' sounds (moments25.js: the mushroom cloud, the UFO, the fries) ----
R['nk-classic'] = (K, o) => R.crack(K, o)
R['nk-rocket'] = (K, o) => { R.crack(K, o); K.noise(K.t + 0.05, 1.4, { type: 'bandpass', f: 400, q: 1.2 }, 0.09, 3800, 0.08); K.tone('sawtooth', 70, K.t + 0.05, 1.2, 0.05, 220, { lp: 600 }) }
R['nk-airraid'] = (K, o) => { R.crack(K, o); K.tone('sawtooth', 300, K.t + 0.08, 1.3, 0.03, 900, { a: 0.25, lp: 1600, vib: [5, 8] }); K.tone('sawtooth', 302, K.t + 0.08, 1.3, 0.02, 905, { a: 0.25, lp: 1600 }) }
R['nk-8bit'] = (K, o) => { R.crack(K, o); K.seq(K.t + 0.08, [[262, 0.05], [330, 0.05], [392, 0.05], [523, 0.05], [659, 0.05], [784, 0.05], [1047, 0.05], [1568, 0.14]]) }
R['nk-sonic'] = (K, o) => { R.crack(K, { ...o, ev: Math.max(o.ev ?? 95, 112) }); K.noise(K.t + 0.42, 0.5, { type: 'lowpass', f: 400 }, 0.3, 60, 0.004, { brown: true }); K.tone('sine', 55, K.t + 0.42, 0.6, 0.25, 28) }
R['nk-slide'] = (K, o) => { R.crack(K, o); K.tone('sine', 380, K.t + 0.06, 0.8, 0.06, 2200, { vib: [7, 25], a: 0.02 }) }
R['nk-geiger'] = (K, o) => { R.crack(K, o); for (let i = 0; i < 26; i++) { const u = 0.08 + (i / 26) ** 1.6 * 1.6; K.noise(K.t + u + rnd(0, 0.03), 0.006, { type: 'highpass', f: 3000 }, 0.14) } }
R['nk-thunder'] = (K, o) => { R.crack(K, o); K.noise(K.t + 0.25, 1.6, { type: 'lowpass', f: 300 }, 0.22, 80, 0.05, { brown: true, hold: 0.3 }); for (let i = 0; i < 5; i++) K.noise(K.t + 0.25 + rnd(0, 0.5), 0.05, { type: 'lowpass', f: 1200 }, 0.08) }
export const NUKE_SOUNDS = ['nk-classic', 'nk-rocket', 'nk-airraid', 'nk-8bit', 'nk-sonic', 'nk-slide', 'nk-geiger', 'nk-thunder']
let nkDeck = []
// the next launch off the deck (each once before any again); the classic crack is always in it
export function nuke(ev = 95) { if (!nkDeck.length) { nkDeck = NUKE_SOUNDS.slice(); for (let i = nkDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nkDeck[i], nkDeck[j]] = [nkDeck[j], nkDeck[i]] } } const n = nkDeck.pop(); play(n, { ev }); return n }
R.ufo = (K) => { K.tone('sine', 600, K.t, 1.6, 0.04, 900, { a: 0.2, hold: 1, vib: [9, 120] }); K.tone('sine', 1200, K.t + 0.1, 1.4, 0.015, 1500, { vib: [11, 200] }) }
R.fizz = (K) => { for (let i = 0; i < 40; i++) K.noise(K.t + rnd(0, 1.2), 0.012, { type: 'highpass', f: 5000 }, 0.04) }
R.mushroom = (K) => { R.kaboom(K); R.rumble(at(K, 0.3)) }
// ---- names to recipes: the beat first, then the thing, then a soft blip ----
const FALL = new Set(['drop', 'drops', 'fall', 'falls', 'falling', 'plunge', 'dive'])
const IMPACT = new Set(['hit', 'hits', 'land', 'lands', 'impact', 'smash', 'crash', 'squash', 'squashed', 'thunk', 'splat', 'flatten', 'flattened'])
const OBJ_IMPACT = { anvil: 'anvil', piano: 'piano-crash', bipped: 'bipped', car: 'bipped', window: 'glass', guillotine: 'guillotine', blade: 'guillotine', steamroller: 'squish', roller: 'squish', couch: 'thud', boxes: 'thud', box: 'thud', maiden: 'slam', cannon: 'squish', shirt: 'squish', tshirt: 'squish', bonk: 'bonk', bat: 'bonk', gong: 'gong', rocket: 'kaboom', dynamite: 'kaboom' }
const OBJ_DROP = { guillotine: 'guillotine', blade: 'guillotine', piano: 'whistle-fall', anvil: 'whistle-fall' }
const KW = {
  drop: 'whistle-fall', fall: 'whistle-fall', anvil: 'anvil', clang: 'anvil', piano: 'piano-crash', chord: 'piano-crash',
  boom: 'kaboom', kaboom: 'kaboom', explode: 'kaboom', explodes: 'kaboom', explosion: 'kaboom', blast: 'kaboom', dynamite: 'kaboom', bomb: 'kaboom', burst: 'kaboom', blow: 'kaboom',
  fuse: 'fuse', lit: 'fuse', light: 'fuse', spark: 'fuse',
  splat: 'splat', squash: 'splat', squish: 'squish', gore: 'squish', blood: 'squish', guts: 'squish', spray: 'squish', bloody: 'squish', mush: 'squish', pop: 'pop',
  chipper: 'chipper', grind: 'chipper', chip: 'chipper', shred: 'chipper', feed: 'chipper', woodchipper: 'chipper',
  guillotine: 'guillotine', chop: 'guillotine', slice: 'guillotine', head: 'bonk', roll: 'bonk', bucket: 'thud',
  cannon: 'cannon', fire: 'cannon', fires: 'cannon', shoot: 'cannon', shot: 'cannon', tshirt: 'cannon', launch: 'launch', catapult: 'boing', trebuchet: 'creak', fling: 'slide-up', flung: 'slide-up',
  scream: 'scream', screams: 'scream', yell: 'scream', aaah: 'scream', cry: 'scream', panic: 'scream',
  boing: 'boing', bounce: 'boing', stretch: 'creak', snap: 'boing', spring: 'boing', rack: 'creak',
  slide: 'slide-up', whistle: 'slide-up', up: 'slide-up', down: 'slide-down', rise: 'slide-up',
  bonk: 'bonk', hit: 'bonk', punch: 'bonk', smack: 'bonk', whack: 'bonk', bat: 'bonk', thwack: 'bonk', konk: 'bonk',
  glass: 'glass', window: 'glass', shatter: 'glass', smash: 'glass', bipped: 'bipped', bip: 'bipped', break: 'bipped', broken: 'bipped', alarm: 'car-alarm',
  honk: 'honk', horn: 'honk', beep: 'honk', car: 'honk', traffic: 'traffic', jam: 'traffic', gridlock: 'traffic', freeway: 'traffic',
  bell: 'bell', ding: 'ding', cablecar: 'bell', cable: 'bell', trolley: 'bell', gong: 'gong',
  cash: 'cash', register: 'cash', money: 'cash', ka: 'cash', ching: 'cash', ipo: 'ipo', ticker: 'ticker', stock: 'ticker', stocks: 'peck', bell2: 'bell',
  quake: 'rumble', earthquake: 'rumble', rumble: 'rumble', shake: 'rumble', crack: 'crunch', open: 'rumble', swallow: 'gulp', swallowed: 'gulp',
  crunch: 'crunch', creak: 'creak', crank: 'creak', chain: 'chain', chains: 'chain', door: 'slam', slam: 'slam', shut: 'slam', lock: 'slam', locked: 'slam', maiden: 'slam', cell: 'slam',
  cut: 'snip', rope: 'snip', snip: 'snip', key: 'ding', toss: 'slide-up', tossed: 'slide-up', throw: 'slide-up',
  gulp: 'gulp', chomp: 'chomp', bite: 'chomp', eat: 'chomp', eaten: 'chomp', munch: 'chomp', feast: 'chomp', devour: 'chomp', peck: 'peck', pecks: 'peck',
  gull: 'gull', gulls: 'gull', squawk: 'gull', bird: 'gull', birds: 'flock', flock: 'flock', swarm: 'flock', fries: 'gull-steal', steal: 'gull-steal', grab: 'gull-steal',
  seal: 'bark', bark: 'bark', seals: 'sealions', sealion: 'sealions', sealions: 'sealions', dog: 'dog', woof: 'dog', bob: 'water-plop', bobs: 'water-plop', plop: 'water-plop',
  whale: 'spout', spout: 'spout', breach: 'spout', shark: 'chomp', fin: 'whoosh', kayak: 'paddle',
  mole: 'mole', dig: 'dirt', dirt: 'dirt', peek: 'mole', serpent: 'serpent', snake: 'serpent', hiss: 'hiss',
  startup: 'startup', founded: 'startup', ai: 'startup', seed: 'cash', ipo2: 'ipo', evict: 'evict', evicted: 'evict', eviction: 'evict', couch: 'thud', boxes: 'thud', lamp: 'glass', rent: 'trombone',
  robotaxi: 'robotaxi', waymo: 'robotaxi', driverless: 'robotaxi', stuck: 'honk', cone: 'honk',
  jet: 'jets', jets: 'jets', flyover: 'jets', angels: 'jets', fleet: 'jets', escapee: 'escapee', raft: 'paddle', paddle: 'paddle', siren: 'siren', alcatraz: 'slam',
  ferry: 'ferry', boat: 'ferry', ship: 'ferry', blimp: 'blimp', sign: 'flip', flip: 'flip', odometer: 'flip', clack: 'flip', counter: 'flip',
  machine: 'machine', walk: 'steps', walks: 'steps', step: 'steps', steps: 'steps', run: 'scurry', runs: 'scurry', scramble: 'scurry', scurry: 'scurry',
  kiss: 'kiss', smooch: 'kiss', kisscam: 'kiss', shove: 'shove', push: 'shove', oof: 'oof', boo: 'boo', boos: 'boo', cheer: 'cheer', crowd: 'cheer', laugh: 'laugh', laughs: 'laugh',
  die: 'flatline', dies: 'flatline', dead: 'flatline', death: 'flatline', rip: 'flatline', flatline: 'flatline', sad: 'trombone', lose: 'trombone', loses: 'trombone',
  drip: 'drip', drips: 'drip', water: 'water', splash: 'splash2', sink: 'water-plop', sinks: 'water-plop',
  wind: 'gust', gust: 'gust', breeze: 'gust', rocket: 'rocket', firework: 'fireworks', fireworks: 'fireworks', laser: 'laser', zap: 'zap',
  drumroll: 'drumroll', windup: 'drumroll', rimshot: 'rimshot', punchline: 'rimshot', scratch: 'scratch', airhorn: 'airhorn',
  poison: 'gurgle', sick: 'barf', vomit: 'barf', barf: 'barf', puke: 'barf', gurgle: 'gurgle', stomach: 'gurgle', flush: 'flush', toilet: 'flush',
  heart: 'heartbeat', heartbeat: 'heartbeat', steamroller: 'rumble', roller: 'rumble', flatten: 'squish', pennant: 'flip', hang: 'creak',
  stretcher: 'creak', ghost: 'slide-up', wave: 'cheer', step2: 'steps', walkoff: 'roar', win: 'fanfare', title: 'airhorn',
}
const PREFIX = /^(gag|happen|wind|board|ui|moment|ev|sfx)[-_]/
export function resolve(name) {
  name = String(name ?? '').toLowerCase()
  if (R[name]) return name
  const bare = name.replace(PREFIX, '')
  if (R[bare]) return bare
  const tok = bare.split(/[-_ .:]+/).filter(Boolean)
  if (!tok.length) return 'blip'
  const beat = tok[tok.length - 1], obj = tok.length > 1 ? tok[0] : null
  for (let i = 0; i < tok.length - 1; i++) { const p = tok[i] + '-' + tok[i + 1]; if (R[p]) return p }
  if (obj && FALL.has(beat)) return OBJ_DROP[obj] ?? 'whistle-fall'
  if (obj && IMPACT.has(beat)) return OBJ_IMPACT[obj] ?? (R[obj] ? obj : 'splat')
  for (let i = tok.length - 1; i >= 0; i--) { const w = tok[i]; if (KW[w]) return KW[w]; if (R[w]) return w }
  return 'blip'
}

// ---- playing one: pan and distance from the camera when it has a place ----
function placeOut(o) {
  const out = bus(o.bus ?? 'sfx')
  const cam = window.__cp?.NN?.camera, p = o.at
  if (!cam || !p || p.x == null) return { out, far: 0 }
  const dx = p.x - cam.position.x, dy = p.y - cam.position.y, dz = p.z - cam.position.z, d = Math.hypot(dx, dy, dz) || 1
  const e = cam.matrixWorld.elements, side = (dx * e[0] + dy * e[1] + dz * e[2]) / d // the camera's right axis
  const g = ac.createGain(); g.gain.value = clamp(1 / (1 + d / 160), 0.12, 1)
  let n = g
  if (ac.createStereoPanner) { const sp = ac.createStereoPanner(); sp.pan.value = clamp(side * 0.9, -0.9, 0.9); n.connect(sp); n = sp }
  if (d > 220) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(16000 - d * 22, 1500, 16000); n.connect(lp); n = lp }
  n.connect(out); made += 3
  return { out: g, far: d }
}
export function play(name, o = {}) {
  let r = 'blip'
  try {
    r = resolve(name)
    if (!soundOn()) { log({ n: name, r, muted: true }); return r }
    if (!gestured) { log({ n: name, r, skipped: 'no gesture yet' }); return r }
    audioCtx()
    const { out } = placeOut(o)
    let dest = out
    if (o.vol != null && o.vol !== 1) { const g = ac.createGain(); g.gain.value = clamp(o.vol, 0, 2); g.connect(out); dest = g }
    R[r](kitFor(ac, dest, ac.currentTime + 0.01 + (o.delay ?? 0)), o)
    log({ n: name, r })
  } catch (e) { log({ n: name, r, err: String(e?.message ?? e) }) }
  return r
}
window.__nnSound = play
window.__nnSoundResolve = resolve
window.__nnSoundNames = () => Object.keys(R)
window.__nnSoundStats = () => ({ made, state: ac?.state ?? 'none', gestured, on: soundOn(), amb: !!amb, master: buses ? buses.master.gain.value : null, levels: { ...mix } })
// a recipe rendered offline: its loudest sample and how long it rings (above -60 dB)
window.__nnSoundRender = async (name, o = {}, secs = 4) => {
  const sr = 22050, c = new OfflineAudioContext(2, Math.round(sr * secs), sr), r = resolve(name)
  R[r](kitFor(c, c.destination, 0.01), o)
  const b = await c.startRendering(), d = b.getChannelData(0)
  let peak = 0, lastLoud = 0
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 0.001) lastLoud = i }
  return { r, peak, dur: lastLoud / sr }
}

// ---- a swing: the whoosh follows the ball, the crowd leans in; the landing lets them go ----
let fly = null, splashN = 0
export function swing(ev = 95) {
  if (!soundOn() || !gestured) return
  try {
    audioCtx()
    const dur = (2600 * (window.__cpSlow ?? 1) + (window.__cpHold ?? 0)) / 1000, t = ac.currentTime + 0.02 + (window.__cpHold ?? 0) / 1000, B = bufs(ac)
    endFly()
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain()
    s.buffer = B.w; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(1200 + ev * 12, t); f.frequency.exponentialRampToValueAtTime(420, t + dur)
    const pk = clamp(0.02 + (ev - 80) * 0.0012, 0.015, 0.07)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.12); g.gain.exponentialRampToValueAtTime(pk * 0.45, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(p).connect(bus('sfx')); s.start(t, Math.random()); s.stop(t + dur + 0.1); made += 4
    fly = { s, g, p, f, t, dur }
    log({ n: 'whoosh', r: 'whoosh' })
    tension(1, dur * 0.8)
  } catch (e) { log({ n: 'whoosh', err: String(e) }) }
}
export function follow(pos) {
  if (!fly || !pos || !fly.p.pan) return
  const cam = window.__cp?.NN?.camera; if (!cam) return
  const dx = pos.x - cam.position.x, dy = pos.y - cam.position.y, dz = pos.z - cam.position.z, d = Math.hypot(dx, dy, dz) || 1, e = cam.matrixWorld.elements
  fly.p.pan.setTargetAtTime(clamp(((dx * e[0] + dy * e[1] + dz * e[2]) / d) * 0.9, -0.9, 0.9), ac.currentTime, 0.05)
}
function endFly() { if (!fly) return; try { fly.g.gain.cancelScheduledValues(ac.currentTime); fly.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); fly.s.stop(ac.currentTime + 0.3) } catch {} fly = null }
// a flight cut short (a new preview while the ball was up, 1 Nov): the whoosh stops and the crowd settles, as on a landing but without the answer
export function cancel() { endFly(); tension(0, 1) }
// what landed: ev.key from the engine, info.ft
export function land(ev = {}, info = {}) {
  const k = ev.key, ft = info.ft ?? 0
  endFly(); tension(0, 4)
  if (!soundOn() || !gestured) { log({ n: 'land', r: k, muted: !soundOn() }); return }
  const hr = ['GONE', 'NUKE', 'SPLASH', 'SCRAPER', 'POLE'].includes(k)
  if (hr) {
    play('roar', { size: clamp((ft - 340) / 90, 0.5, 1.7) + (k === 'NUKE' ? 0.3 : 0), bus: 'amb' })
    // (10 Nov, Andrew: "Can we take out the charge"): no CHARGE! on the organ after a home run; the song playing carries it
    if (ft >= 480) play('airhorn', { delay: 0.35 })
    if (k === 'SPLASH') { play('foghorn', { delay: 0.25, vol: 0.9 }); play('splash2', { at: ev.at }); afterSplash() }
  } else if (k === 'WALL' || k === 'CLOSE') play('groan', { bus: 'amb' })
  else if (k === 'FOUL') play('aww', { bus: 'amb' })
  else play('cheer', { size: 0.3, bus: 'amb' })
  log({ n: 'land', r: k })
}
function afterSplash() { splashN++; if (splashN % 3 === 0) { setTimeout(() => play('honk-storm', { bus: 'amb' }), 1500); log({ n: 'egg', r: 'honk-storm' }) } }

// ---- the bed: crowd, bay, PA hum; gulls and the ferry now and then ----
let tensionK = 0
function tension(k, secs) { tensionK = k; if (!amb) return; const base = 0.05; amb.crowd.gain.cancelScheduledValues(ac.currentTime); amb.crowd.gain.setTargetAtTime(base * (1 + 2.6 * k), ac.currentTime, Math.max(0.05, secs / 3)) }
const BED = false // (10 Nov, Andrew: "Can we kill the ocean music and just have the background music be the background music with any sfx from the events we want?": the bed is off; the songs are the background now, the event sounds stay)
function startAmb() {
  if (!BED || amb || !soundOn() || !gestured) return
  try {
    audioCtx()
    const B = bufs(ac), out = bus('amb'), nodes = []
    const loop = (buf, type, f, q, gain, lfo) => {
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = gain
      s.connect(fl).connect(g).connect(out); s.start(ac.currentTime, Math.random()); nodes.push(s)
      if (lfo) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = lfo[0]; lg.gain.value = gain * lfo[1]; l.connect(lg).connect(g.gain); l.start(); nodes.push(l) }
      made += 3; return g
    }
    const crowd = loop(B.br, 'bandpass', 520, 0.7, 0.05, [0.13, 0.3]); loop(B.w, 'bandpass', 1400, 0.9, 0.006, [0.21, 0.4])
    loop(B.br, 'lowpass', 380, 0.5, 0.05, [0.08, 0.6]) // the bay lapping
    for (const [f, gn] of [[60, 0.004], [180, 0.0015]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = gn; o.connect(g).connect(out); o.start(); nodes.push(o); made += 2 } // the PA
    const timers = []
    const every = (lo, hi, fn) => { const go = () => { timers[0] = setTimeout(() => { if (!amb) return; fn(); go() }, rnd(lo, hi) * 1000) }; go() }
    amb = { crowd, nodes, timers }
    every(7, 22, () => play('gull', { n: 1 + Math.floor(Math.random() * 3), bus: 'amb', vol: 0.4 }))
    const t2 = []; amb.timers2 = t2
    const go2 = () => { t2[0] = setTimeout(() => { if (!amb) return; play('ferry', { bus: 'amb', vol: 0.35 }); go2() }, rnd(90, 180) * 1000) }; go2()
    tension(tensionK, 0.5)
    log({ n: 'ambience', r: 'start' })
  } catch (e) { log({ n: 'ambience', err: String(e) }) }
}
function stopAmb() {
  if (!amb) return
  for (const n of amb.nodes) { try { n.stop() } catch {} }
  clearTimeout(amb.timers[0]); clearTimeout(amb.timers2?.[0])
  amb = null; log({ n: 'ambience', r: 'stop' })
}
export const ambOn = () => !!amb

// ---- the first gesture unlocks it all; typed numbers click; the easter eggs ----
let keys = ''
const EGGS = { 777: 'stretch', 415: 'sf', 2010: 'title', 2012: 'title', 2014: 'title' }
function egg(k) {
  log({ n: 'egg', r: k })
  if (k === 'stretch') { play('organ-stab', { bus: 'music' }); play('roar', { size: 0.5, bus: 'amb', delay: 0.3 }) }
  else if (k === 'sf') { play('foghorn'); play('bell', { delay: 1.8 }); play('sealions', { delay: 2.6 }); play('flock', { delay: 3.4 }) }
  else if (k === 'title') { play('airhorn'); play('roar', { size: 1.8, bus: 'amb', delay: 0.2 }); play('fireworks', { delay: 0.8 }); play('fireworks', { delay: 1.4 }) }
}
function onGesture() { if (gestured) return; gestured = true; if (soundOn()) { audioCtx(); startAmb() } }
export const gesturedYet = () => gestured // (10 Nov: the background songs wait for the first key or click, as every sound does)
addEventListener('pointerdown', onGesture, true)
addEventListener('keydown', (e) => {
  onGesture()
  const tgt = e.target
  if (tgt?.closest?.('input,textarea') && e.key.length === 1) { play('type', { bus: 'sfx' }); return }
  if (e.ctrlKey || e.metaKey || e.altKey || tgt?.closest?.('input,select,textarea')) return
  if (/^[0-9]$/.test(e.key)) { keys = (keys + e.key).slice(-4); for (const [code, k] of Object.entries(EGGS)) if (keys.endsWith(code)) { keys = ''; egg(k); break } } else keys = ''
}, true)

// ---- the mixer, drawn into the JUKEBOX window ----
const ROWS = [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'EFFECTS'], ['amb', 'CROWD']]
export function mixerHTML() {
  return `<style>#cp .snd .r{grid-template-columns:auto 1fr auto;gap:10px;align-items:center}#cp .snd input[type=range]{accent-color:var(--acc);width:100%;min-width:0;margin:0}</style><div class="btab snd">` + ROWS.map(([k, w]) => `<div class="r mo"><span>${w}</span><input type="range" min="0" max="100" step="5" value="${Math.round(mix[k] * 100)}" data-snd="${k}" aria-label="${w} volume"><b>${Math.round(mix[k] * 100)}</b></div>`).join('') + '</div>'
}
export function bindMixer(el) {
  el.querySelectorAll('[data-snd]').forEach((x) => x.addEventListener('input', () => { setLevel(x.dataset.snd, x.value / 100); const b = x.parentElement.querySelector('b'); if (b) b.textContent = x.value }))
  el.querySelectorAll('[data-snd]').forEach((x) => x.addEventListener('change', () => play('click')))
}
export function jingleOf(id) { return window.__nnJingle ? window.__nnJingle(id) : { mel: [], bass: [], beat: 0.12 } }
