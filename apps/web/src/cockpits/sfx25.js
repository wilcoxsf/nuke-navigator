// Study 25 sound: everything synthesized with WebAudio (no sound files): chiptune blips for the menu, the crack of the bat, firework launches and pops, a crowd swell,
// a Cove splash, a foghorn for Karl, a fanfare for a home run. Nothing plays until the first key or click (browsers require it); S switches it all off (nn-snd).
let ac = null, noiseBuf = null
const on = () => { try { return localStorage.getItem('nn-snd') !== '0' } catch { return true } }
function ctx() {
  ac ??= new AudioContext()
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  return ac
}
const env = (g, t, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel) }
function tone(type, f, t, d, peak = 0.05, f1 = null) {
  const o = ac.createOscillator(), g = ac.createGain()
  o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d)
  env(g, t, 0.004, peak, 0, d)
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.05)
}
function noise(t, d, filt, peak = 0.05, sweep = null, a = 0.004) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain()
  s.buffer = noiseBuf; f.type = filt.type; f.frequency.setValueAtTime(filt.f, t); f.Q.value = filt.q ?? 0.8
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + d)
  env(g, t, a, peak, 0, d)
  s.connect(f).connect(g).connect(ac.destination); s.start(t, Math.random()); s.stop(t + a + d + 0.05)
}
const SEQ = { move: [[660, 0.035]], pick: [[523, 0.06], [659, 0.06], [784, 0.09]], back: [[392, 0.05], [262, 0.08]], fanfare: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.24]], splash: [[784, 0.06], [988, 0.06], [1319, 0.06], [1568, 0.08], [2093, 0.26]] }
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]]
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
export function jingleNotes(id) {
  const r = rng(Number(id) || 7), sc = SCALES[Math.floor(r() * SCALES.length)], root = 220 * 2 ** (Math.floor(r() * 7) / 12), beat = 0.11 + r() * 0.05
  const mel = [], bass = []
  let deg = Math.floor(r() * 3)
  for (let i = 0; i < 16; i++) {
    deg = Math.max(0, Math.min(sc.length * 2 - 1, deg + Math.floor(r() * 5) - 2))
    const n = sc[deg % sc.length] + 12 * Math.floor(deg / sc.length)
    mel.push(r() < 0.18 && i % 4 ? null : root * 2 * 2 ** (n / 12))
    if (i % 4 === 0) bass.push(root / 2 * 2 ** (sc[Math.floor(r() * 3)] / 12))
  }
  mel[15] = root * 4
  return { mel, bass, beat }
}
export const sound = {
  on,
  set(v) { try { localStorage.setItem('nn-snd', v ? '1' : '0') } catch {} },
  play(kind, o = {}) {
    if (!on()) return
    try {
      ctx()
      const t = ac.currentTime + 0.01
      if (SEQ[kind]) { let u = t; for (const [f, d] of SEQ[kind]) { tone('square', f, u, d, 0.035); u += d * 0.9 } return }
      if (kind === 'crack') { const k = Math.min(1.4, Math.max(0.5, ((o.ev ?? 95) - 60) / 45)); noise(t, 0.05, { type: 'bandpass', f: 2600, q: 0.9 }, 0.22 * k); tone('triangle', 1900, t, 0.03, 0.08 * k, 500); noise(t + 0.01, 0.12, { type: 'lowpass', f: 900 }, 0.05 * k) }
      else if (kind === 'thud') { tone('sine', 110, t, 0.18, 0.12, 55); noise(t, 0.08, { type: 'lowpass', f: 500 }, 0.05) }
      else if (kind === 'launch') noise(t, 0.7, { type: 'bandpass', f: 500, q: 3 }, 0.03, 2400, 0.25)
      else if (kind === 'pop') { noise(t, 0.12, { type: 'lowpass', f: 1800 }, 0.12); tone('sine', 140, t, 0.2, 0.08, 50); for (let i = 0; i < 6; i++) noise(t + 0.12 + Math.random() * 0.5, 0.03, { type: 'highpass', f: 3000 }, 0.03) }
      else if (kind === 'crowd') { noise(t, 2.6, { type: 'bandpass', f: 900, q: 0.5 }, 0.045, 700, 0.45) }
      else if (kind === 'ring') { tone('triangle', 1320, t, 1.3, 0.035); tone('sine', 1985, t, 0.9, 0.02) }
      else if (kind === 'water') noise(t, 0.6, { type: 'lowpass', f: 3200 }, 0.1, 350)
      else if (kind === 'jingle') { const J = jingleNotes(o.id); J.mel.forEach((f, i) => { if (f) tone('square', f, t + i * J.beat, J.beat * 0.9, 0.03) }); J.bass.forEach((f, i) => tone('triangle', f, t + i * 4 * J.beat, J.beat * 3.6, 0.06)); return }
      else if (kind === 'horn') { for (const f of [98, 147]) { const os = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); os.type = 'sawtooth'; os.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 520; env(g, t, 0.35, 0.05 * (o.vol ?? 1), 1.4, 0.7); os.connect(lp).connect(g).connect(ac.destination); os.start(t); os.stop(t + 2.6) } }
    } catch {}
  },
}
