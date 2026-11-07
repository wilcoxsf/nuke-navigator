// Study 25 JUKEBOX (28 Oct, Andrew: "chiptune cover of all the ballgame classics, and then also I left my heart in San Francisco"): ballpark songs played as
// chiptune in the browser, no sound files. The melody is a square wave, the bass a triangle on each bar's chord (I, IV or V, whichever holds most of the bar's melody
// notes), and a noise hi-hat keeps the beat. Melodies are written in ABC notation (the plain-text tune format), parsed here.
// Sources: TAKE ME OUT TO THE BALL GAME (Norworth and von Tilzer, 1908, public domain) is the chorus from the Digital Tradition transcription on abcnotation.com;
// WHEN THE SAINTS and the CHARGE! bugle call are traditional, written out here. (2 Nov: the Mexican Hat Dance is out, Andrew: "I don't like the mexican hat dance")
// I LEFT MY HEART IN SAN FRANCISCO (Cory and Cross, 1954) is still under copyright: it is transcribed from the lead sheet Andrew supplied and lives in
// public/songs_private.json (git-ignored, loaded by loadPrivateSongs), so it never reaches the repo; it is only for the private
// friends' site, and should not go anywhere public without a license.
export const SONGS = [
  { id: 'ballgame', name: 'TAKE ME OUT TO THE BALL GAME', bpm: 200, abc: `M:3/4
L:1/4
K:D
D2 d| B A F| A3| E3| D2 d| B A F| A3-| A2 z| B ^A B| F G A| B2 G| E3| B2 B| B c d| e c B| A F E| D2 d| B A F| A3| E2 E| D2 E| F G A| B3-| B B c| d3| d3| d c B| A ^G A| B3| c3| d3-| d z2|` },
  // (6 Nov, Andrew: "This needs to be punchier. it feels off in tempo"): the bugle call as it goes at the park, in 6/8: three quick pickups, a held G, then E and the long G,
  // an octave up from before and a quarter faster
  { id: 'charge', name: 'CHARGE!', bpm: 200, abc: `M:6/8
L:1/8
K:C
G c e g3| e g5|` },
  // 2 Nov, later (Andrew: "give me the national anthem for sure, hava nagila"): both public domain (Smith's tune, 1773; the traditional Hasidic nigun), taken from
  // flutetunes.com's MIDI of each (the melody track, notes as written; the anthem an octave down), the bass roots per half bar picked from each tune's own chords
  // (the anthem's B flat, E flat, F, C minor and G minor; Hava Nagila's D, G minor and C minor), since the I, IV, V guess doesn't fit Hava Nagila's mode
  { id: 'anthem', name: 'THE STAR-SPANGLED BANNER', bpm: 96, roots: [10,10,10,10,10,10,10,10,10,10,10,10,5,5,10,10,10,10,10,10,10,10,10,10,10,10,10,10,5,5,10,10,10,10,10,10,10,10,5,3,3,3,10,10,5,5,10,10,10,10,10,10,3,3,0,10,10,5,10,0,10,10,10,0,10,10], abc: `M:3/4
L:1/16
K:C
z8 F3 D| ^A,4 D4 F4| ^A8 d3 c| ^A4 D4 E4| F8 F2 F2| d6 c2 ^A4| A8 G2 A2| ^A4 ^A4 F4| D4 ^A,4 F3 D| ^A,4 D4 F4| ^A8 d3 c| ^A4 D4 E4| F8 F2 F2| d6 c2 ^A4| A8 G2 A2| ^A4 ^A4 F4| D4 ^A,4 d2 d2| d4 ^d4 f4| f8 ^d2 =d2| c4 d4 ^d4| ^d8 ^d2 ^d2| d6 c2 ^A4| A4 A4 G2 A2| ^A4 D4 E4| F8 F2 F2| ^A4 ^A4 ^A2 =A2| G4 G4 G4| c4 ^d2 =d2 c2 ^A2| ^A4 =A4 F2 F2| ^A6 c2 d2 ^d2| f8 ^A2 c2| d6 ^d2 c4| ^A8 z4|` },
  // 29 Oct, later (Andrew: "let's wire in more songs"): four more out of copyright, written out here from the well-known melodies: Beethoven's Ode to Joy (1824),
  // Offenbach's Can-Can galop (1858), the William Tell overture's finale gallop (Rossini, 1829) and Joplin's The Entertainer (1902)
  // 6 Nov, evening (Andrew's picks from the review page): IN THE HALL OF THE MOUNTAIN KING (Grieg, 1875) and DRUNKEN SAILOR (traditional), the short versions written for
  // the page; RIDE OF THE VALKYRIES (Wagner, 1856) from flutetunes.com's MIDI of the theme (B minor, 9/8, the melody as written, the first long note cut short)
  { id: 'mountain', name: 'IN THE HALL OF THE MOUNTAIN KING', bpm: 150, roots: [9,9,4,4,9,9,4,4,9,9,4,4,9,9,4,4], abc: `M:4/4
L:1/8
K:C
A B c d e c e2| ^d B ^d2 =d _B =d2| A B c d e c e a| g e c e g4| A B c d e c e2| ^d B ^d2 =d _B =d2| A B c d e c e a| g e c e g4|` },
  { id: 'sailor', name: 'DRUNKEN SAILOR', bpm: 190, roots: [2,2,2,2,0,0,0,0,2,2,2,2,0,0,2,2], abc: `M:4/4
L:1/8
K:C
A2 A A A2 A A| A2 D2 F2 A2| G2 G G G2 G G| G2 C2 E2 G2| A2 A A A2 A A| A2 B2 c2 d2| c2 A2 G2 E2| D4 D4|` },
  { id: 'valkyries', name: 'RIDE OF THE VALKYRIES', bpm: 150, roots: [11,11,11,11,2,2,2,2,9,9,2,2,2,2,6,6,6,6,6,6], abc: `M:9/8
L:1/16
K:C
^F2| B3 ^F B2 d6 B6| d3 B d2 ^f6 d6| ^f3 d ^f2 a6 A6| d3 A d2 ^f12| z16 A2| d3 A d2 ^f6 d6| ^f3 d ^f2 a6 ^f6| a3 ^f a2 ^c'6 ^c6| ^f3 ^c ^f2 ^a18|` },
  { id: 'entertainer', name: 'THE ENTERTAINER', bpm: 110, abc: `M:2/4
L:1/16
K:C
d^d e c'2 e c'2| e c'6 z2| c'd'^d'e' c'd'e'2| b d'4 c'4 z2| d^d e c'2 e c'2| e c'6 z2| a g ^f a c' e'2 d'| c' a d'6 z2|` }
]

// the private songs (git-ignored file; missing on any other machine, which is fine): added to SONGS once loaded
export async function loadPrivateSongs() { try { const r = await fetch('/songs_private.json'); if (!r.ok) return 0; const j = await r.json(); for (const x of j.songs ?? []) if (!SONGS.some((y) => y.id === x.id)) SONGS.push(x); return j.songs?.length ?? 0 } catch { return 0 } }

// ---- ABC to notes: K (key signatures with up to three sharps or flats), L (unit length), M (bar length), notes A-G and a-g with , and ' octaves, ^ = _ accidentals
// that hold to the end of the bar, durations (2, 3, /2, 3/2), z rests, - ties, | bars. Returns { notes: [{ t, d, m }] in beats of L, bar, n }
const KEYS = { C: {}, G: { F: 1 }, D: { F: 1, C: 1 }, A: { F: 1, C: 1, G: 1 }, F: { B: -1 }, Bb: { B: -1, E: -1 }, Eb: { B: -1, E: -1, A: -1 } }
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
export function parseABC(abc) {
  const head = {}, body = []
  for (const line of abc.split('\n')) { const m = line.match(/^([A-Za-z]):\s*(.*)$/); if (m) head[m[1]] = m[2].trim(); else body.push(line) }
  const key = KEYS[head.K ?? 'C'] ?? {}, [ln, ld] = (head.L ?? '1/8').split('/').map(Number), [mn, md] = (head.M ?? '4/4').split('/').map(Number)
  const bar = (mn / md) / (ln / ld) // units of L per bar
  const s = body.join(' ')
  const notes = []
  let t = 0, acc = {}, i = 0, tie = false
  while (i < s.length) {
    const c = s[i]
    if (c === '|') { const keep = tie && notes.length ? acc[notes[notes.length - 1].key] : undefined; acc = {}; if (keep !== undefined) acc[notes[notes.length - 1].key] = keep; i++; continue } // a tied note keeps its accidental into the next bar
    if (c === '-') { tie = true; i++; continue }
    let a = null
    while ('^=_'.includes(s[i]) && i < s.length) { a = (a ?? 0) + (s[i] === '^' ? 1 : s[i] === '_' ? -1 : 0); if (s[i] === '=') a = 0; i++ }
    const ch = s[i]
    if (!ch || !/[A-Ga-gz]/.test(ch)) { i++; continue }
    i++
    let oct = ch === ch.toLowerCase() && ch !== 'z' ? 5 : 4
    while (s[i] === ',' || s[i] === "'") { oct += s[i] === "'" ? 1 : -1; i++ }
    let num = '', den = ''
    while (/[0-9]/.test(s[i] ?? '')) num += s[i++]
    if (s[i] === '/') { i++; den = '2'; let d2 = ''; while (/[0-9]/.test(s[i] ?? '')) d2 += s[i++]; if (d2) den = d2; else while (s[i] === '/') { den = String(Number(den) * 2); i++ } }
    const d = (num ? Number(num) : 1) / (den ? Number(den) : 1)
    if (ch === 'z') { t += d; tie = false; continue }
    const L = ch.toUpperCase()
    if (a !== null) acc[L + oct] = a
    const shift = acc[L + oct] ?? key[L] ?? 0
    const m = 12 * (oct + 1) + STEP[L] + shift
    if (tie && notes.length && notes[notes.length - 1].m === m) notes[notes.length - 1].d += d; else notes.push({ t, d, m, key: L + oct })
    tie = false
    t += d
  }
  return { notes, bar, n: t, unit: ln / ld }
}
// each bar's chord root: I, IV or V of the key, whichever triad holds most of the bar's melody (by length)
function roots(song, P) {
  const tonic = { C: 0, G: 7, D: 2, A: 9, F: 5, Bb: 10, Eb: 3 }[song.abc.match(/K:(\w+)/)?.[1] ?? 'C'] ?? 0, out = []
  for (let b0 = 0; b0 < P.n; b0 += P.bar) {
    const inBar = P.notes.filter((x) => x.t >= b0 && x.t < b0 + P.bar)
    let best = 0, score = -1
    for (const deg of [0, 5, 7]) { const r = (tonic + deg) % 12, tri = [r, (r + 4) % 12, (r + 7) % 12], sc = inBar.reduce((s, x) => s + (tri.includes(x.m % 12) ? x.d : 0), 0) + (deg === 0 ? 0.01 : 0); if (sc > score) { score = sc; best = r } }
    out.push({ t: b0, root: best })
  }
  return out
}

let ac = null, master = null, playing = null, nodes = [] // (7 Nov, red team 4: every note scheduled for the song playing, so stop() can stop them)
const hz = (m) => 440 * 2 ** ((m - 69) / 12)
export const jukebox = {
  songs: SONGS,
  playing: () => playing?.id ?? null,
  // plays a song once (or loops it); a second play stops the first. vol: 0 to 1.
  play(id, o = {}) {
    const song = SONGS.find((x) => x.id === id)
    if (!song) return false
    this.stop()
    try {
      const A = window.__nnAudio // sound25.js: the page's one context, and the MUSIC level of its mixer
      ac = A ? A.ctx() : (ac ?? new AudioContext())
      if (ac.state === 'suspended') ac.resume().catch(() => {})
      master = ac.createGain(); master.gain.value = 0.9 * (o.vol ?? 1); master.connect(A ? A.bus('music') : ac.destination)
      const P = parseABC(song.abc), beat = 60 / song.bpm, sec = (u) => u * P.unit * 4 * beat // a beat is a quarter note
      const t0 = ac.currentTime + 0.08
      const voice = (type, f, at, dur, peak, slide) => {
        const os = ac.createOscillator(), g = ac.createGain()
        os.type = type; os.frequency.setValueAtTime(f, at); if (slide) os.frequency.exponentialRampToValueAtTime(f * slide, at + dur)
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.008); g.gain.setValueAtTime(peak, at + Math.max(0.01, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.97)
        os.connect(g).connect(master); os.start(at); os.stop(at + dur + 0.02); nodes.push(os)
      }
      for (const x of P.notes) voice('square', hz(x.m), t0 + sec(x.t), sec(x.d), 0.045) // the melody
      const RT = song.roots ? song.roots.map((root, j) => ({ t: (j * P.bar) / 2, root, half: true })) : roots(song, P)
      for (const r of RT) { const f = hz(36 + r.root), bt = sec(P.bar) / (r.half ? 2 : 1); voice('triangle', f, t0 + sec(r.t), bt * 0.48, 0.09); voice('triangle', f * 1.5, t0 + sec(r.t) + bt * 0.5, bt * 0.45, 0.06) } // root, then fifth
      // the hi-hat: a click of noise on every beat
      const nb = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate), d = nb.getChannelData(0)
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length)
      for (let bt = 0; bt < sec(P.n); bt += beat) { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nb; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = 0.05; s.connect(f).connect(g).connect(master); s.start(t0 + bt); nodes.push(s) }
      const len = sec(P.n) + 0.3
      playing = { id, until: t0 + len, timer: setTimeout(() => { if (playing?.id === id) { playing = null; if (o.loop) jukebox.play(id, o); else o.onEnd?.() } }, len * 1000 + 100) }
      return true
    } catch { return false }
  },
  stop() { if (playing) { clearTimeout(playing.timer); playing = null } if (master) { try { master.gain.setTargetAtTime(0, ac.currentTime, 0.03) } catch {} const m = master, end = ac.currentTime + 0.12; for (const n of nodes) { try { n.stop(end) } catch {} } nodes = []; setTimeout(() => { try { m.disconnect() } catch {} }, 200); master = null } },
  length(id) { const s = SONGS.find((x) => x.id === id); if (!s) return 0; const P = parseABC(s.abc); return P.n * P.unit * 4 * (60 / s.bpm) },
}
