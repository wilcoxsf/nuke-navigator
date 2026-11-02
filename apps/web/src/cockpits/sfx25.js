// Study 25 sound: everything synthesized with WebAudio (no sound files). Since 29 Oct, night (Andrew: "a crazy sound pass"), the recipes live in sound25.js, which
// runs the one AudioContext, the buses and the mixer; this keeps the old names working (move, pick, back, fanfare, splash, crack, thud, launch, pop, crowd, ring,
// water, jingle, horn) and adds the swing hooks. Nothing plays until the first key or click (browsers require it); S switches it all off (nn-snd).
import { play, soundOn, refresh, swing, follow, land, cancel, nuke, mixerHTML, bindMixer, getLevels, setLevel } from './sound25.js'
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]]
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
// each batter's walk-up tune: 16 notes in one of four scales, seeded by their id, so the same batter always gets the same tune
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
window.__nnJingle = jingleNotes
export const sound = {
  on: soundOn,
  set(v) { try { localStorage.setItem('nn-snd', v ? '1' : '0') } catch {} refresh() },
  play(kind, o = {}) { if (soundOn()) play(kind, o) },
  swing, // the crack's companion: the whoosh that follows the ball, the crowd leaning in
  fly: (pos) => follow(pos),
  land, // the crowd's answer to where it came down
  cancel, // a flight cut short
  nuke: (ev) => (soundOn() ? nuke(ev) : null), // NUKE IT's launch, off a shuffled deck (1 Nov, night)
  mixerHTML, bindMixer, levels: getLevels, setLevel,
}
