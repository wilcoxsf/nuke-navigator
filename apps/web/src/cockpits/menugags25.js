// THE MENU GAGS (10 Nov 2026). Andrew: "Let's take off the mock game on the menu screen and only have these 2D gags and let's stock more of them and make them
// higher quality", then his picks: Q1 (a taller strip, bigger sprites with outlines and a few colors), Q2 (each gag a setup, a beat and a punchline over eight or
// nine seconds, squash and stretch, a hold on the punchline), 1b 2a 3b 4b 5b 6a 7a 8a 9a 10a, "N3 let's just have a crab chopping up a dodger fan", and "one where
// a dodger fan throws and then a giants fan hits a line drive at their face and it hits and blood squirts and the dude falls to the floor". And: "no saying
// 'karl' I don't want text on any of these they have to speak for themselves": nothing in here draws a letter.
// 260 by 40 pixels, 3 screen pixels to a pixel. Every frame is a pure function of the time into the gag (no state), so a still frame or a test can draw any moment.
// Drawing is fillRect only (tools/gag_ascii.mjs runs it in Node against a fake canvas and prints frames as text).
export const GW = 260, GH = 40, U = 3
const C = {
  out: '#0b0b0b', skin: '#e9b48c', skin2: '#b97a52', cream: '#f1ead2', black: '#1b1b1b', la: '#1f5fd6', white: '#f5f5f5', jeans: '#3b4a6b', wood: '#c8914f',
  glove: '#6b3f1d', ball: '#ffffff', blood: '#d1102a', blood2: '#8e0b1d', water: '#1d5f97', water2: '#3d8ccc', foam: '#dff2ff', grass: '#2c6a33', grass2: '#3a7d40',
  dirt: '#94643a', grey: '#8a8f99', grey2: '#5b616b', gull: '#e6e9ee', gold: '#f2bc40', red: '#c8102e', crab: '#d8452a', crab2: '#962b17', steel: '#3a3f47',
  smoke: '#b9bec6', fog: '#c3c8cf', brick: '#7a3b2a', brick2: '#5c2a1d', lion: '#6e5a48', lion2: '#4d3e31', dog: '#a8713f', sat: '#aab2bd', panel: '#2d6fd1',
  road: '#33363b', plank: '#8a5a32', plank2: '#6b4426', vest: '#f2bc40', spark: '#ffe27a', mouth: '#5a0d12', seat: '#2a2d33', seat2: '#3a3f47',
}
// ---- little maths ----
const cl = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, seg = (t, a, b) => cl((t - a) / (b - a))
const eo = (x) => 1 - (1 - x) ** 3, ei = (x) => x * x * x, eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const back = (x) => { const k = 2.2; return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2 }
const hold = (t, a, d) => (t < a ? t : t < a + d ? a : t - d) // a hit-stop: time stands still for d at a
const D2R = Math.PI / 180
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const hash = (u, v) => { const s = Math.sin(u * 12.9898 + v * 78.233) * 43758.5453; return s - Math.floor(s) }
const dk = (hex, f = 0.72) => { const n = parseInt(hex.slice(1), 16), r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1) }

// ---- a sprite: shapes in its own frame, rasterized through a transform, outlined in black ----
function sprite() {
  const ops = []
  const S = {
    rect(u, v, w, h, c) { ops.push(['r', u, v, w, h, c]); return S },
    line(u0, v0, u1, v1, c, w = 1) { ops.push(['l', u0, v0, u1, v1, c, w]); return S },
    disc(u, v, r, c) { ops.push(['d', u, v, r, c]); return S },
    dot(u, v, c) { ops.push(['r', u, v, 1, 1, c]); return S },
    raster(T) {
      const m = new Map(), put = (a, b, c) => { const [x, y] = T(a, b); m.set(Math.floor(x) + ',' + Math.floor(y), c) }
      for (const o of ops) {
        if (o[0] === 'r') { for (let a = o[1]; a < o[1] + o[3] - 0.01; a += 0.5) for (let b = o[2]; b < o[2] + o[4] - 0.01; b += 0.5) put(a + 0.25, b + 0.25, o[5]) }
        else if (o[0] === 'l') {
          const [, u0, v0, u1, v1, c, w] = o, L = Math.hypot(u1 - u0, v1 - v0) || 1, n = Math.max(1, Math.ceil(L / 0.4)), nx = -(v1 - v0) / L, ny = (u1 - u0) / L
          for (let i = 0; i <= n; i++) { const k = i / n; for (let j = 0; j < w; j += 0.5) { const d = j - (w - 0.5) / 2; put(u0 + (u1 - u0) * k + nx * d + 0.25, v0 + (v1 - v0) * k + ny * d + 0.25, c) } }
        } else { const [, u, v, r, c] = o; for (let a = -r; a <= r; a += 0.5) for (let b = -r; b <= r; b += 0.5) if (a * a + b * b <= r * r + 0.1) put(u + a + 0.25, v + b + 0.25, c) }
      }
      return m
    },
  }
  return S
}
// local (u, v) to the strip: squash and stretch about a pivot, a turn, a mirror for facing left, then where it stands
const xf = (x, y, o = {}) => { const face = o.face ?? 1, sx = o.sx ?? 1, sy = o.sy ?? 1, r = (o.rot ?? 0) * D2R, pu = o.pu ?? 0, pv = o.pv ?? 0, c = Math.cos(r), s = Math.sin(r); return (u, v) => { const a = (u - pu) * sx, b = (v - pv) * sy; return [x + face * (a * c - b * s + pu), y + (a * s + b * c + pv)] } }

// ---- the people: feet at (0, 0), facing right, about 16 tall. Angles: 0 hangs down, 90 points forward, 180 straight up ----
const KITS = {
  sf: { cap: 'ACC', shirt: C.cream, trim: 'ACC', pants: C.cream, sock: C.black }, la: { cap: C.la, shirt: C.white, trim: C.la, pants: C.white, sock: C.la },
  sfFan: { cap: 'ACC', shirt: C.black, trim: 'ACC', pants: C.jeans, sock: C.black }, laFan: { cap: C.la, shirt: C.la, trim: C.white, pants: C.jeans, sock: C.white },
  gold: { cap: C.gold, shirt: C.red, trim: C.gold, pants: C.jeans, sock: C.black }, vest: { cap: 'ACC', shirt: C.vest, trim: C.red, pants: C.jeans, sock: C.black },
}
function guy(kit0, p = {}, acc) {
  const kit = Object.fromEntries(Object.entries(kit0).map(([k, v]) => [k, v === 'ACC' ? acc : v])), S = sprite(), skin = p.skin ?? C.skin
  const want = (n) => !p.parts || p.parts.includes(n), ln = p.lean ?? 0, up = (v) => Math.max(0, -(v + 6)) * ln
  const hip = [0, -6], fF = p.legF ?? [1.5, 0], fB = p.legB ?? [-1.5, 0]
  const leg = (f, c) => { const kn = [(hip[0] + f[0]) / 2 + (p.knee ?? 0.8), (hip[1] + f[1]) / 2]; if (want('thighs')) S.line(hip[0], hip[1], kn[0], kn[1], c, 2); if (want('shins')) { S.line(kn[0], kn[1], f[0], f[1] - 1, c, 2); S.rect(f[0] - 1, f[1] - 1, 3, 1, C.black) } }
  if (!p.half) { leg(fB, dk(kit.pants)); leg(fF, kit.pants) }
  const arm = (a, c, k, side) => { const sh = [up(-10.5) + side, -10], d = [Math.sin(a * D2R), Math.cos(a * D2R)], m = [sh[0] + d[0] * 2.2, sh[1] + d[1] * 2.2], h = [sh[0] + d[0] * 4.6, sh[1] + d[1] * 4.6]; if (want('arms')) { S.line(sh[0], sh[1], m[0], m[1], c, 1); S.line(m[0], m[1], h[0], h[1], k, 1) } return h }
  const hB = arm(p.armB ?? 8, dk(kit.shirt), dk(skin, 0.85), -1.2) // (the back shoulder and the front one apart, so arms up stand either side of the head)
  if (want('torso')) { S.rect(-2 + up(-8.5), -11, 4, 5, kit.shirt); S.rect(-2 + up(-6.5), -7, 4, 1, kit.trim); if (p.num) S.dot(-1 + up(-9), -9, kit.trim) }
  const hF = arm(p.armF ?? -6, kit.shirt, skin, 1.4)
  if (p.bat != null && want('arms')) { const d = [Math.sin(p.bat * D2R), Math.cos(p.bat * D2R)]; S.line(hF[0], hF[1], hF[0] + d[0] * 4, hF[1] + d[1] * 4, C.wood, 1); S.line(hF[0] + d[0] * 4, hF[1] + d[1] * 4, hF[0] + d[0] * 7.5, hF[1] + d[1] * 7.5, C.wood, 1.5) }
  if (p.glove && want('arms')) { const g = p.glove === 'B' ? hB : hF; S.rect(g[0] - 1, g[1] - 1, 2, 2, C.glove); if (p.inGlove) S.dot(g[0], g[1] - 1, C.ball) }
  if (p.hold === 'ball' && want('arms')) S.rect(hF[0] - 0.5, hF[1] - 1.5, 2, 2, C.ball)
  if (p.hold === 'dog' && want('arms')) { S.rect(hF[0], hF[1] - 1, 4, 1, C.gold); S.rect(hF[0] + 0.5, hF[1] - 1.5, 3, 0.5, C.red) } // a hot dog
  const hc = [up(-13) + (p.headDx ?? 0), -13 + (p.headDy ?? 0)]
  if (want('head')) {
    S.disc(hc[0], hc[1], 2, skin); S.rect(hc[0] - 2, hc[1] - 3, 4, 2, kit.cap); if (!p.noBrim) S.rect(hc[0] + 1, hc[1] - 2, 2, 1, kit.cap)
    if (p.eye === 'shut') S.dot(hc[0] + 1, hc[1], dk(skin, 0.6)); else if (p.eye !== 'none') S.dot(hc[0] + 1, hc[1] - 0.5, C.out)
    if (p.mouth) S.rect(hc[0] + 1, hc[1] + 1, p.mouth === 'O' ? 1.5 : 1, p.mouth === 'O' ? 1.5 : 1, C.mouth)
  }
  return { S, hF, hB, hc }
}

// ---- the painter for one frame ----
function painter(cx, acc) {
  const P = { ox: 0, oy: 0, acc }
  P.px = (u, v, c) => { if (u < -2 || u > GW + 2 || v < -2 || v > GH + 2) return; cx.fillStyle = c; cx.fillRect((Math.floor(u) + P.ox) * U, (Math.floor(v) + P.oy) * U, U, U) }
  P.rect = (u, v, w, h, c) => { cx.fillStyle = c; cx.fillRect((Math.floor(u) + P.ox) * U, (Math.floor(v) + P.oy) * U, Math.max(1, Math.round(w)) * U, Math.max(1, Math.round(h)) * U) }
  P.blit = (m, outline = true) => {
    if (outline) for (const k of m.keys()) { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!m.has(x + dx + ',' + (y + dy))) P.px(x + dx, y + dy, C.out) }
    for (const [k, c] of m) { const i = k.indexOf(','); P.px(+k.slice(0, i), +k.slice(i + 1), c) }
  }
  P.spr = (S, x, y, o, outline) => { const T = xf(x, y, o); P.blit(S.raster(T), outline); return T }
  P.guy = (kit, pose, x, y, o = {}) => { const g = guy(kit, pose, acc), T = P.spr(g.S, x, y, o); return { hand: T(...g.hF), back: T(...g.hB), head: T(...g.hc) } }
  P.ball = (x, y) => { P.rect(x - 1, y - 1, 3, 3, C.out); P.rect(x - 0.5, y - 0.5, 2, 2, C.ball) }
  P.shake = (t, a, d, amp) => { if (t >= a && t < a + d) { const k = 1 - (t - a) / d; P.ox = Math.round(Math.sin(t * 97) * amp * k); P.oy = Math.round(Math.cos(t * 71) * amp * k * 0.6) } }
  P.field = (mound) => { P.rect(0, 36, GW, 4, C.grass); for (let u = 0; u < GW; u += 3) P.px(u + ((u / 3) % 2), 36, C.grass2); if (mound != null) { P.rect(mound - 7, 35, 14, 1, C.dirt); P.rect(mound - 4, 34, 8, 1, C.dirt) } }
  P.water = (y0, t, x0 = 0, x1 = GW) => { for (let u = x0; u < x1; u++) { const h = Math.sin(u * 0.33 + t * 3.1) > 0.55 ? 1 : 0; P.rect(u, y0 - h, 1, 1, C.water2); P.rect(u, y0 + 1 - h, 1, GH - y0 + h, C.water); if (h && Math.sin(u * 0.33 + t * 3.1) > 0.93) P.px(u, y0 - 1, C.foam) } }
  P.road = () => { P.rect(0, 36, GW, 4, C.road); for (let u = 0; u < GW; u += 9) P.rect(u, 38, 4, 1, C.grey2) }
  // particles: thrown from (x0, y0) at t0, under gravity; they stay where they land (floor) unless vanish is set
  P.spray = (t, x0, y0, t0, seed, n, o = {}) => {
    if (t < t0) return; const r = rng(seed), floor = o.floor ?? 36, g = o.g ?? 70
    for (let i = 0; i < n; i++) {
      const a = ((o.dir ?? 90) + (r() - 0.5) * (o.spread ?? 90)) * D2R, sp = (o.speed ?? 30) * (0.45 + r() * 0.8), st = (o.stagger ?? 0) * r(), col = o.cols ? o.cols[i % o.cols.length] : C.blood, dt = t - t0 - st
      if (dt < 0) continue
      const vx = Math.cos(a) * sp, vy = -Math.sin(a) * sp
      let x = x0 + vx * dt, y = y0 + vy * dt + 0.5 * g * dt * dt
      if (y >= floor) { if (o.vanish) continue; const tau = (-vy + Math.sqrt(vy * vy + 2 * g * (floor - y0))) / g; x = x0 + vx * tau; y = floor - 1 }
      if (o.life && dt > o.life) continue
      P.px(x, y, col)
    }
  }
  P.splash = (t, x, y, t0, seed, big = 1) => { if (t < t0 || t > t0 + 0.9) return; const k = (t - t0) / 0.9; for (let i = -1; i <= 1; i += 2) P.rect(x + i * (2 + k * 7 * big) - (i < 0 ? 2 : 0), y, 2, 1, C.foam); P.spray(t, x, y - 1, t0, seed, 8 * big, { dir: 90, spread: 70, speed: 26 * big, floor: y + 1, vanish: true, cols: [C.foam, C.water2] }) }
  P.puff = (t, x, y, t0, seed, n = 8, col = C.smoke) => { if (t < t0 || t > t0 + 0.8) return; const r = rng(seed), k = (t - t0) / 0.8; for (let i = 0; i < n; i++) { const a = r() * Math.PI, d = (2 + r() * 6) * eo(k); if (r() > k + 0.2) P.px(x + Math.cos(a) * d * 1.5, y - Math.sin(a) * d * 0.6, col) } }
  P.stars = (t, x, y, n = 3) => { for (let i = 0; i < n; i++) { const a = t * 5 + (i * 2 * Math.PI) / n; P.px(x + Math.cos(a) * 3, y + Math.sin(a) * 1, C.spark) } }
  return P
}

// ---- the gags ----
// each: label (for the screen reader only), dur (seconds, the hold included), still (the moment a reduced-motion screen shows), draw(P, t)
export const GAGS = {
  snag: { label: 'the pitcher snags a line drive; it is still smoking in his glove and he shakes his hand like it burned', dur: 8, still: 3.2, draw(P, t0) {
    const t = hold(t0, 2.05, 0.18), PX = 186, BX = 66
    P.field(PX); P.rect(BX - 3, 35, 6, 1, C.white) // the plate
    P.shake(t0, 2.05, 0.3, 1.5)
    // the batter, a Dodger: stance, swing at 1.7, then a shrug
    const sw = seg(t, 1.68, 1.86), bat = t < 1.68 ? 165 : t < 1.86 ? lerp(165, 15, eo(sw)) : 15
    const shrug = seg(t, 3.0, 3.4) * (1 - seg(t, 6.5, 7))
    P.guy(KITS.la, { bat: t > 2.6 ? 20 : bat, armF: t < 1.68 ? 150 : t < 1.86 ? lerp(150, 60, sw) : lerp(60, 20, shrug), armB: t < 1.68 ? 140 : lerp(70, 40 + 60 * shrug, 1), lean: 0.15, legF: [2.5, 0], headDy: -shrug }, BX, 36)
    // the pitcher, a Giant facing left
    const kick = seg(t, 0.6, 1.1) * (1 - seg(t, 1.1, 1.3)), thr = seg(t, 1.1, 1.32), burned = t >= 2.05
    if (!burned) {
      P.guy(KITS.sf, { glove: 'F', armF: t < 0.6 ? 70 : lerp(70, 110, kick), armB: t < 1.1 ? lerp(60, 175, seg(t, 0.6, 1.0)) : lerp(175, 40, eo(thr)), legF: [2 - kick * 1 + thr * 3, -kick * 5], knee: 1 + kick * 2, lean: thr * 0.35, num: 1 }, PX, 36, { face: -1 })
    } else {
      // stuck, smoking: he hops and shakes the glove hand; at 5.2 he flings the glove; then he blows on his hand
      const sq = 1 - seg(t, 2.05, 2.45), shakeA = t < 5.2 ? 90 + Math.sin(t * 34) * 60 : t < 5.6 ? lerp(90, 175, seg(t, 5.2, 5.5)) : 160, hop = t > 2.4 && t < 5.2 ? Math.abs(Math.sin(t * 9)) * 2.5 : 0
      const g = P.guy(KITS.sf, { glove: t < 5.35 ? 'F' : null, inGlove: t < 5.35, armF: shakeA, armB: t > 5.6 ? 165 : 20, mouth: 'O', legF: [2.5, -hop * 0.6], num: 1, headDx: t > 5.6 ? -0.5 : 0 }, PX + 2 * (1 - sq), 36 - hop, { face: -1, sx: 1 + 0.25 * sq, sy: 1 - 0.18 * sq })
      if (t < 5.35) P.spray(t, g.hand[0], g.hand[1] - 1, 2.05, 11, 26, { dir: 90, spread: 50, speed: 7, g: -6, stagger: 3.2, life: 1.1, floor: 99, cols: [C.smoke, C.grey] }) // the smoke, rising
      if (t >= 5.35) { const k = seg(t, 5.35, 6.0), gx = lerp(PX - 6, 232, k), gy = 34 - Math.sin(k * Math.PI) * 14; P.rect(gx - 1, gy - 1, 3, 3, C.out); P.rect(gx - 0.5, gy - 0.5, 2, 2, C.glove); P.px(gx, gy - 1, C.ball); if (k >= 1) P.spray(t, 232, 32, 6.0, 12, 16, { dir: 90, spread: 40, speed: 6, g: -6, stagger: 2, life: 1.0, floor: 99, cols: [C.smoke, C.grey] }) }
    }
    // the ball: the pitch, then the liner back at him
    if (t >= 1.28 && t < 1.74) { const k = (t - 1.28) / 0.46; P.ball(lerp(PX - 7, BX + 6, k), 27 + Math.sin(k * Math.PI) * -1 + k * 1) }
    else if (t >= 1.74 && t < 2.05) { const k = (t - 1.74) / 0.31; P.ball(lerp(BX + 6, PX - 5, k), lerp(28, 26, k)); P.px(lerp(BX + 6, PX - 5, k) - 3, lerp(28, 26, k), C.grey); P.px(lerp(BX + 6, PX - 5, k) - 6, lerp(28, 26, k), C.grey2) }
    else if (t < 1.28 && t > 0) {} // (in his hand)
  } },
  moonshot: { label: 'a moonshot leaves the top of the screen and comes back down with a satellite', dur: 9, still: 7.0, draw(P, t0) {
    const t = hold(t0, 1.62, 0.15), BX = 60, PX = 176
    P.field(PX); P.rect(BX - 3, 35, 6, 1, C.white); P.shake(t0, 1.62, 0.25, 1); P.shake(t0, 6.55, 0.4, 2.5)
    const sw = seg(t, 1.5, 1.68), watch = t > 2.2 && t < 6.55, crash = t >= 6.55
    const jump = crash ? Math.max(0, Math.sin(seg(t, 6.55, 7.1) * Math.PI)) * 4 : 0
    P.guy(KITS.sf, { bat: t < 1.5 ? 160 : t < 1.9 ? lerp(160, 10, eo(sw)) : null, armF: t < 1.5 ? 150 : t < 2.2 ? 40 : watch ? 165 : crash ? 175 : 10, armB: t < 1.9 ? 140 : crash ? 160 : 10, lean: watch ? -0.2 : 0.1, headDy: watch ? -0.5 : 0, legF: [2.5, -jump * 0.3] }, BX, 36 - jump * 0.5)
    if (t >= 1.9) { P.rect(BX + 4, 35, 7, 1, C.wood) } // the bat, dropped
    const thr = seg(t, 1.0, 1.2), back2 = crash ? eo(seg(t, 6.55, 7.0)) * 10 : 0, hop = crash ? Math.max(0, Math.sin(seg(t, 6.55, 7.0) * Math.PI)) * 5 : 0
    P.guy(KITS.la, { glove: 'F', armF: crash ? 175 : 80, armB: t < 1.0 ? lerp(40, 175, seg(t, 0.5, 0.95)) : t < 2.4 ? lerp(175, 30, eo(thr)) : watch ? 20 : 170, lean: thr * 0.3 * (1 - seg(t, 1.4, 1.8)) - (watch ? 0.2 : 0), mouth: crash ? 'O' : null, legF: [2 + thr * 2.5, 0] }, PX + back2, 36 - hop, { face: -1 })
    if (t >= 1.18 && t < 1.62) { const k = (t - 1.18) / 0.44; P.ball(lerp(PX - 6, BX + 6, k), 27) }
    if (t >= 1.62 && t < 2.4) { const k = t - 1.62; P.ball(BX + 7 + k * 70, 27 - k * 46 + k * k * 6) }
    // it comes back: the ball tangled with a satellite, tumbling, then the crash and the sparks
    if (t >= 5.7) {
      const k = seg(t, 5.7, 6.55), x = lerp(150, 140, k), y = lerp(-6, 32, ei(k)), r = crash ? 18 : t * 400, Sat = sprite()
      Sat.rect(-1.5, -1.5, 3, 3, C.sat).rect(-6.5, -1, 4, 2, C.panel).rect(2.5, -1, 4, 2, C.panel).line(0, -1.5, 1.5, -4.5, C.grey, 1).dot(1.5, -5, C.red)
      if (crash) { Sat.rect(-6.5, -1, 4, 2, C.panel) }
      P.spr(Sat, x, crash ? 33 : y, { rot: r }); P.ball(x + (crash ? 5 : 2), (crash ? 34 : y + 2))
      if (crash) { P.puff(t, x, 34, 6.55, 21, 14, C.dirt); if (Math.floor(t * 12) % 3 === 0) for (let i = 0; i < 3; i++) P.px(x - 2 + hash(i, Math.floor(t * 12)) * 5, 30 - hash(Math.floor(t * 12), i) * 4, C.spark) }
    }
  } },
  splash: { label: 'a splash hit skips across McCovey Cove five times before a kayaker grabs it', dur: 8.5, still: 6.6, draw(P, t0) {
    const t = hold(t0, 1.3, 0.12), BX = 32, PX = 80, W = 33
    P.rect(0, 36, 96, 4, C.grass); for (let u = 0; u < 96; u += 3) P.px(u + ((u / 3) % 2), 36, C.grass2)
    for (let v = 27; v < 40; v++) for (let u = 92; u < 97; u++) P.px(u, v, (u + v * 3) % 4 ? C.brick : C.brick2) // the arcade wall
    P.water(W, t0, 97)
    P.shake(t0, 1.3, 0.2, 1)
    const sw = seg(t, 1.2, 1.38), flip = seg(t, 2.6, 3.0)
    P.guy(KITS.sf, { bat: t < 1.2 ? 160 : t < 2.6 ? lerp(160, 10, eo(sw)) : null, armF: t < 2.6 ? (t < 1.2 ? 150 : 40) : 175 - Math.sin(t * 8) * 10, armB: t < 2.6 ? 140 : 10, lean: 0.12 }, BX, 36)
    if (t >= 2.6) { const k = flip, bx = BX + 4 + k * 14, by = 26 - Math.sin(k * Math.PI) * 10 + k * 9; P.spr(sprite().line(-3.5, 0, 3.5, 0, C.wood, 1.5), bx, by, { rot: k * 540 }) } // the bat flip
    P.guy(KITS.la, { glove: 'F', armF: 80, armB: t < 0.9 ? lerp(40, 175, seg(t, 0.4, 0.85)) : lerp(175, 40, eo(seg(t, 0.9, 1.1))), lean: seg(t, 0.9, 1.1) * 0.3, headDx: t > 1.4 ? -0.5 : 0 }, PX, 36, { face: -1 })
    if (t >= 1.05 && t < 1.3) { const k = (t - 1.05) / 0.25; P.ball(lerp(PX - 6, BX + 6, k), 27) }
    // the flight and the skips
    const LX = [130, 158, 181, 199, 213, 223, 229], LT = [2.4], HOP = [0.46, 0.4, 0.34, 0.28, 0.22, 0.18], HH = [8, 6, 4.2, 3, 2, 1]
    for (let i = 0; i < HOP.length; i++) LT.push(LT[i] + HOP[i])
    let bx = null, by = null
    if (t >= 1.3 && t < LT[0]) { const k = (t - 1.3) / (LT[0] - 1.3); bx = lerp(BX + 7, LX[0], k); by = lerp(27, W - 1, k) - Math.sin(k * Math.PI) * 24 }
    for (let i = 0; i < HOP.length; i++) if (t >= LT[i] && t < LT[i + 1]) { const k = (t - LT[i]) / HOP[i]; bx = lerp(LX[i], LX[i + 1], k); by = W - 1 - Math.sin(k * Math.PI) * HH[i] }
    for (let i = 0; i < LT.length; i++) P.splash(t, LX[i], W, LT[i], 30 + i, i === 0 ? 1.2 : 0.7)
    // the kayak comes in from the right, the paddler reaches down and holds it up
    const kx = t < 3 ? 290 : lerp(290, 238, eo(seg(t, 3, 5.4))), got = t >= 5.9, bob = Math.sin(t * 3) * 0.5
    if (t >= LT[LT.length - 1] && !got) { bx = 229; by = W - 1 + bob }
    P.rect(kx - 6, W - 1 + bob, 13, 2, acc(P)); P.rect(kx - 5, W + 1 + bob, 11, 1, dk(acc(P)))
    const reach = seg(t, 5.4, 5.9), lift = seg(t, 5.9, 6.3), pa = t < 5.4 ? Math.sin(t * 7) : 0
    const k1 = P.guy(KITS.vest, { half: true, armF: t < 5.4 ? 90 + pa * 40 : lerp(60, 30, reach) * (1 - lift) + 178 * lift, armB: t < 5.4 ? 90 - pa * 40 : 30, lean: reach * 0.4 * (1 - lift), hold: got ? 'ball' : null }, kx, W + 5 + bob, { face: -1 })
    if (t < 5.4) { const a = pa * 0.9; P.spr(sprite().line(-6, 0, 6, 0, C.wood, 1).rect(-7, -0.5, 2, 2, C.gold).rect(5, -0.5, 2, 2, C.gold), kx - 1, W - 6 + bob, { rot: a * 30 }, true) }
    if (bx != null) P.ball(bx, by)
  } },
  kayaks: { label: 'a splash hit, a kayak race; one kayak flips and its dog paddles over and wins the ball', dur: 8, still: 6.5, draw(P, t) {
    const W = 33, BALLX = 132
    P.water(W, t)
    if (t < 0.9) P.ball(lerp(118, BALLX, t / 0.9), lerp(-4, W - 1, ei(t / 0.9)))
    P.splash(t, BALLX, W, 0.9, 5, 1.2)
    const bob = (s) => Math.sin(t * 3 + s) * 0.5, kay = (x, col, kit, s, o = {}) => { const b = bob(s); P.rect(x - 6, W - 1 + b, 13, 2, col); P.rect(x - 5, W + 1 + b, 11, 1, dk(col)); const pa = Math.sin(t * 9 + s); if (!o.noGuy) { P.guy(kit, { half: true, armF: o.reach ? 70 : 90 + pa * 40, armB: 90 - pa * 40, lean: o.reach ? 0.4 : 0, eye: o.sad ? 'shut' : null }, x, W + 5 + b, { face: o.face ?? 1 }); if (!o.reach) P.spr(sprite().line(-6, 0, 6, 0, C.wood, 1).rect(-7, -0.5, 2, 2, col).rect(5, -0.5, 2, 2, col), x, W - 6 + b, { rot: pa * 30 }) } }
    // A, the Giants fan, from the left; arrives just too late
    const ax = t < 1 ? -14 : Math.min(BALLX - 9, -14 + (t - 1) * 30), late = t > 4.6
    kay(ax, '#e2621b', KITS.sfFan, 0, { reach: t > 4.3 && t < 5.2, sad: t > 5.4 })
    // C, way behind
    kay(t < 1 ? 300 : Math.max(BALLX + 34, 300 - (t - 1) * 24), C.gold, KITS.gold, 2, { face: -1 })
    // B, the Dodger fan with his dog at the bow, from the right; flips at 2.8
    const bx = t < 1 ? 276 : Math.max(BALLX + 18, 276 - (t - 1) * 32), flip = t >= 2.8
    const bxs = t < 2.8 ? bx : 276 - 1.8 * 32
    if (!flip) { kay(bx, C.la, KITS.laFan, 1, { face: -1 }); const D = sprite().rect(-2, -2, 5, 2, C.dog).rect(-3, -4, 2, 2, C.dog).dot(-4, -3, C.out).dot(-2, -5, dk(C.dog)).line(3, -2, 4, -4, C.dog, 1); P.spr(D, bx - 5, W - 1 + bob(1), {}) }
    else {
      const k = seg(t, 2.8, 3.1); P.spr(sprite().rect(-6, 0, 13, 2, dk(C.la)).rect(-5, -1, 11, 1, C.la), bxs, W - 1 + bob(1), { rot: lerp(0, 180, eo(k)), pu: 0, pv: 0 })
      if (t > 3.6) { P.guy(KITS.laFan, { half: true, parts: ['head'], eye: 'shut' }, bxs + 7, W + 9 + Math.sin(t * 5) * 0.6, { face: -1 }); if (Math.floor(t * 6) % 2) P.px(bxs + 6, W - 4 - (t * 8) % 4, C.foam) }
      P.splash(t, bxs, W, 2.8, 9, 1)
      // the dog: launched, lands, paddles to the ball, takes it, paddles back and climbs on the upturned hull
      const L = seg(t, 2.8, 3.2), dogx0 = bxs - 5, land = bxs - 16
      let dx, dy, swim = false
      if (t < 3.2) { dx = lerp(dogx0, land, L); dy = W - 2 - Math.sin(L * Math.PI) * 8 }
      else if (t < 4.4) { dx = lerp(land, BALLX + 2, seg(t, 3.2, 4.4)); dy = W; swim = true }
      else if (t < 5.6) { dx = lerp(BALLX + 2, bxs - 2, eio(seg(t, 4.5, 5.6))); dy = W; swim = true }
      else { dx = bxs; dy = W - 2 - (1 - seg(t, 5.6, 5.9)) * 2 }
      if (t >= 3.2 && t < 3.6) P.splash(t, land, W, 3.2, 4, 0.6)
      const has = t >= 4.4, wag = Math.sin(t * 16)
      if (swim) { const D = sprite().rect(-3, -4, 2, 2, C.dog).dot(-4, -3, C.out).dot(-2, -5, dk(C.dog)).rect(-1, -2, 4, 1, C.dog); P.spr(D, dx, dy + Math.sin(t * 8) * 0.5, { face: -1 }); if (Math.floor(t * 8) % 2) P.px(dx + 4, dy, C.foam) }
      else { const D = sprite().rect(-2, -2, 5, 2, C.dog).rect(-3, -4, 2, 2, C.dog).dot(-4, -3, C.out).dot(-2, -5, dk(C.dog)).line(3, -2, 4.5, -3.5 - wag, C.dog, 1).rect(-1, 0, 1, 1, C.dog).rect(2, 0, 1, 1, C.dog); P.spr(D, dx, dy, { face: has ? -1 : -1 }) }
      if (has) P.ball(dx + (swim ? 5 : -4.5), dy - 3.5)
    }
    if (t >= 0.9 && t < 4.4) P.ball(BALLX, W - 1 + bob(4))
    void late
  } },
  gulls: { label: 'a gull steals a fry, then comes back with five friends and they take the whole tray', dur: 9, still: 6.2, draw(P, t) {
    const ROW = 30, ME = 130
    P.rect(0, 36, GW, 4, C.seat); for (let u = 0; u < GW; u += 12) P.rect(u, 34, 10, 2, C.seat2) // the concrete and the seats
    const r = rng(77), kits = [KITS.sfFan, KITS.sfFan, KITS.gold, KITS.sfFan, KITS.vest]
    let fallFry = null
    for (let x = 10; x < GW - 4; x += 12) {
      const kit = kits[Math.floor(r() * kits.length)], mine = Math.abs(x - ME) < 3, sk = r() > 0.7 ? C.skin2 : C.skin
      if (mine) continue
      const look = t > 4.6 && t < 8 ? (x < ME ? 1 : -1) : x % 24 < 12 ? 1 : -1, eat = x === 118 && t > 6.4
      P.guy(kit, { half: true, skin: sk, armF: eat ? 160 : 10, armB: 8, hold: null, headDy: 0 }, x, ROW + 5, { face: look })
      if (eat) P.px(x + 1, ROW - 7, C.gold)
    }
    // the fan and his fries
    const stand = seg(t, 4.6, 5.0) * (1 - seg(t, 6.8, 7.4)), slump = seg(t, 7.0, 7.6), fist = t > 2.0 && t < 3.6
    const hasTray = t < 4.85, oneFry = t >= 1.8
    const me = P.guy(KITS.sfFan, { half: !stand, armF: hasTray ? 80 : stand ? 165 : 15, armB: fist ? 170 + Math.sin(t * 18) * 10 : 10, mouth: fist || stand ? 'O' : null, lean: -0.1 + slump * 0.5, headDy: slump * 1.5, eye: slump > 0.5 ? 'shut' : null }, ME, stand ? 36 : ROW + 5)
    const tray = (x, y, n) => { P.rect(x - 1, y - 1, 7, 3, C.out); P.rect(x, y, 5, 1.5, C.red); for (let i = 0; i < n; i++) P.rect(x + i, y - 1.5 + (i % 2) * 0.5, 1, 1.5, C.gold) }
    if (hasTray) tray(me.hand[0] - 1, me.hand[1] - 1, oneFry ? 4 : 5)
    const gull = (x, y, f, face = -1, fry = false) => { const up = Math.floor(f) % 2, G = sprite().rect(-2, -1, 5, 2, C.gull).rect(-4, -1.5, 2, 1.5, C.gull).dot(-5, -1, C.gold).dot(-3.5, -1.5, C.out).line(0, -1, 2, up ? -4 : 1, C.grey, 1).line(1, -1, 4, up ? -3 : 0.5, C.gull, 1).rect(3, -0.5, 2, 1, C.grey); P.spr(G, x, y, { face }); if (fry) P.rect(x - 6 * face * -1 - 1, y - 1, 2, 1, C.gold) }
    // the first gull: the swoop and the getaway
    if (t > 0.8 && t < 2.8) { const k = seg(t, 0.8, 1.8), k2 = seg(t, 1.8, 2.8); const x = t < 1.8 ? lerp(262, ME + 6, eo(k)) : lerp(ME + 6, -8, ei(k2)), y = t < 1.8 ? lerp(2, ROW - 4, k) : lerp(ROW - 4, -6, k2); gull(x, y, t * 10, t < 1.8 ? -1 : -1, t >= 1.8) }
    // six of them: in from the right, round the tray, away with it up and left
    const V = [[0, 0], [7, -3], [7, 3], [14, -6], [14, 6], [-6, 2]]
    if (t > 3.6) {
      const k = seg(t, 3.6, 4.6), k2 = seg(t, 5.0, 7.4), cx = t < 4.6 ? lerp(280, ME + 4, eo(k)) : t < 5.0 ? ME + 4 : lerp(ME + 4, -40, ei(k2)), cy = t < 4.6 ? lerp(-4, ROW - 6, k) : t < 5.0 ? ROW - 6 : lerp(ROW - 6, -16, k2)
      for (let i = 0; i < V.length; i++) gull(cx + V[i][0] * (t < 4.6 ? 1 : 0.6), cy + V[i][1] * (t < 4.6 ? 1 : 0.5), t * 11 + i * 1.3)
      if (t >= 4.85) { tray(cx - 2, cy + 4, 4); fallFry = t > 5.4 && t < 6.6 ? [lerp(cx, ME - 12, 0.5), lerp(cy + 6, ROW - 6, seg(t, 5.4, 6.4))] : null; if (fallFry) P.rect(fallFry[0], fallFry[1], 1, 2, C.gold) }
    }
  } },
  cablecar: { label: 'a cable car hits the turntable and spins like a ride, flinging its riders off', dur: 9, still: 5.3, draw(P, t) {
    const CX = 140, Y = 35
    P.road(); P.rect(0, 36, GW, 1, C.grey2)
    for (let u = CX - 22; u <= CX + 22; u++) { const e = Math.sqrt(Math.max(0, 1 - ((u - CX) / 22) ** 2)); P.rect(u, Y + 1 - e * 1, 1, 1 + e * 2, u % 4 ? C.plank : C.plank2) } // the turntable
    const roll = t < 2.6 ? lerp(-40, CX, eo(seg(t, 0, 2.6))) : t < 7.2 ? CX : lerp(CX, 320, ei(seg(t, 7.2, 9)))
    const sp = t < 3 ? 0 : t < 5.6 ? 0.5 * 9 * (t - 3) ** 2 : 0.5 * 9 * 2.6 ** 2 + 9 * 2.6 * (t - 5.6) * (1 - seg(t, 5.6, 6.8) / 2) // the spin angle
    const th = t < 6.8 ? sp : Math.round(sp / Math.PI) * Math.PI, cw = Math.cos(th), w = Math.max(6, Math.abs(cw) * 36), dir = cw >= 0 ? 1 : -1
    const x0 = roll - w / 2
    P.rect(x0 - 1, 23, w + 2, 13, C.out); P.rect(x0, 24, w, 11, C.red); P.rect(x0, 22, w, 2, C.steel); P.rect(x0, 33, w, 2, C.wood)
    if (w > 10) { for (let i = 3; i < w - 3; i += 5) P.rect(x0 + i, 26, 3, 3, C.gold); P.rect(x0, 30, w, 1, C.cream) }
    P.rect(x0 + 3, 35, 3, 1, C.black); P.rect(x0 + w - 6, 35, 3, 1, C.black)
    // the gripman in the middle; dizzy at the end
    const dizzy = t > 6.8
    P.guy(KITS.sf, { half: true, armF: 120, armB: 60, eye: dizzy ? 'shut' : null, mouth: t > 4 && t < 6.8 ? 'O' : null }, roll, 33)
    if (dizzy) P.stars(t, roll, 17)
    // the riders on the ends: one flung right at 4.2, one flung left at 4.9
    const end = (s) => roll + s * dir * (w / 2 + 1)
    const fling = (s, tf, land, seed) => {
      if (t < tf) { P.guy(KITS.sfFan, { armF: 160, armB: 100, lean: Math.min(0.6, (t > 3 ? (t - 3) * 0.3 : 0)), mouth: t > 3.6 ? 'O' : null, legB: [-1.5 - (t > 3 ? (t - 3) * 2 : 0), -1] }, end(s), 34, { face: -s * dir }); return }
      const k = seg(t, tf, tf + 0.8), x = lerp(end(s), land, k), y = 34 - Math.sin(k * Math.PI) * 14 * (1 - k * 0.2), rot = k < 1 ? k * 720 : 90
      if (k < 1) P.guy(KITS.sfFan, { armF: 170, armB: 170, mouth: 'O' }, x, y, { rot: rot * s, pv: -8 })
      else { const tw = t > tf + 1.6 && t < tf + 2.4 ? Math.sin(t * 20) * 20 : 0; P.guy(KITS.sfFan, { armF: 90 + tw, armB: 20, eye: 'shut' }, x, 36, { rot: 90 * s, pv: 0 }); P.puff(t, x, 36, tf + 0.8, seed, 10, C.grey) }
    }
    fling(1, 4.2, 236, 3); fling(-1, 4.9, 34, 4)
  } },
  fog: { label: 'the fog rolls in over a pop fly and three outfielders run into each other', dur: 9, still: 6.8, draw(P, t) {
    P.rect(0, 36, GW, 4, C.grass); for (let u = 0; u < GW; u += 3) P.px(u + ((u / 3) % 2), 36, C.grass2); P.rect(0, 37, GW, 1, C.dirt)
    if (t > 0.7 && t < 1.7) { const k = seg(t, 0.7, 1.7); P.ball(lerp(134, 131, k), lerp(42, -4, eo(k))) }
    P.shake(t, 5.4, 0.4, 2)
    const go = seg(t, 2.6, 5.4), hit = t >= 5.4, fall = seg(t, 5.4, 6.0)
    const L = lerp(50, 125, eio(go)), R = lerp(210, 137, eio(go)), Cc = 131
    const run = (x, face, s, rotDir, kit) => {
      if (!hit) { const p = t > 2.6 ? Math.sin(t * 12 + s) : 0; P.guy(kit, { glove: 'F', armF: t > 2.6 ? 170 : 60, armB: t > 2.6 ? 40 : 30, legF: [1.5 + p * 2.5, -Math.max(0, p) * 1.5], legB: [-1.5 - p * 2.5, -Math.max(0, -p) * 1.5], lean: -0.15, headDy: -0.5 }, x, 36, { face }) }
      else P.guy(kit, { glove: 'F', armF: 170, armB: 120, eye: 'shut', mouth: 'O' }, x, 36, { face, rot: rotDir * lerp(0, 90, back(fall)) })
    }
    run(L, 1, 0, -1, KITS.sf); run(R, -1, 2, -1, KITS.sf)
    if (!hit) P.guy(KITS.sf, { glove: 'F', armF: 175, armB: 150, lean: -0.3, headDy: -1, legF: [1.5, 0] }, Cc, 36, { face: -1 })
    else P.guy(KITS.sf, { glove: 'F', armF: 175, armB: 150, eye: 'shut' }, Cc, 36, { face: -1, rot: lerp(0, 90, back(fall)) })
    if (hit && t < 5.75) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, d = 3 + (t - 5.4) * 30; P.px(Cc + Math.cos(a) * d, 26 + Math.sin(a) * d * 0.5, C.white) }
    if (t > 6.0) { const k = seg(t, 6.0, 6.5), b1 = seg(t, 6.5, 6.9), b2 = seg(t, 6.9, 7.15); const y = t < 6.5 ? lerp(-4, 34, ei(k)) : t < 6.9 ? 34 - Math.sin(b1 * Math.PI) * 4 : 34 - Math.sin(b2 * Math.PI) * 1.5; P.ball(t < 6.5 ? 132 : lerp(132, 140, seg(t, 6.5, 7.15)), y) }
    if (t > 6.4) { P.stars(t, 125, 30, 3); P.stars(t + 1, 146, 31, 3) }
    // the fog: in from the left from 1.0, thick; thins a little after the crash so the heap shows
    const front = lerp(-20, 300, eio(seg(t, 1.0, 3.4))), dens = t < 6.0 ? 0.86 : lerp(0.86, 0.5, seg(t, 6.0, 7.0))
    for (let v = 0; v < GH; v++) for (let u = 0; u < GW; u++) { const edge = front - 10 * Math.sin(v * 0.4 + t * 1.3) - (v % 5); if (u > edge) continue; const d = dens * (u > edge - 14 ? (edge - u) / 14 : 1); const h = hash(u + Math.floor(t * 3) * 0.01, v); if (h < d) P.px(u, v, h < d * 0.35 ? '#d3d7dd' : C.fog) }
  } },
  wave: { label: 'the crowd does the wave, and it goes round the one guy asleep; he wakes up and stands alone once it is gone', dur: 9, still: 7.8, draw(P, t) {
    const ROW = 31, SL = 136
    P.rect(0, 36, GW, 4, C.seat); for (let u = 0; u < GW; u += 12) P.rect(u, 34, 10, 2, C.seat2)
    const wx = -14 + (t - 0.4) * 46, r = rng(5), kits = [KITS.sfFan, KITS.sf, KITS.gold, KITS.sfFan, KITS.vest], woke = t > 7.2
    for (let x = 4; x < GW; x += 12) {
      const kit = kits[Math.floor(r() * kits.length)], sk = r() > 0.7 ? C.skin2 : C.skin, me = x === SL
      if (me) {
        const jolt = seg(t, 7.2, 7.4)
        if (!woke) P.guy(KITS.sfFan, { half: true, armF: 5, armB: 5, eye: 'shut', mouth: 'o', headDx: 1, headDy: 1.5, lean: 0.2 }, x, ROW + 5)
        else P.guy(KITS.sfFan, { armF: 178, armB: 175, mouth: 'O' }, x, 36 - back(jolt) * 1, { sy: 1 + 0.15 * (1 - jolt) })
        continue
      }
      const near = Math.abs(x - SL) === 12, s = Math.max(0, 1 - Math.abs(x - wx) / 15), lookAt = woke ? (x < SL ? 1 : -1) : 1
      if (near && s > 0) { // round the sleeper: the two beside him stand up higher and lean in over him, arms meeting above his head
        const lean = (x < SL ? 1 : -1)
        P.guy(kit, { skin: sk, armF: lerp(10, 150, s), armB: lerp(10, 175, s), lean: 0.35 * s }, x, 36 - s * 3, { face: lean })
      } else if (s > 0.05) P.guy(kit, { skin: sk, armF: lerp(10, 178, s), armB: lerp(10, 172, s), mouth: s > 0.6 ? 'O' : null }, x, lerp(ROW + 11, 36, eo(s)) , { face: 1 })
      else P.guy(kit, { half: true, skin: sk, armF: 10, armB: 8, headDx: woke ? 0.5 : 0 }, x, ROW + 5, { face: lookAt })
    }
  } },
  sealion: { label: 'a sea lion balances the ball on its nose, flips it into a hoop, and claps', dur: 8.5, still: 6.4, draw(P, t) {
    const W = 31, SX = 92, HX = 206
    P.water(W, t)
    // the hoop on a post in the water
    P.rect(HX + 5, 13, 1, W - 13, C.grey2); P.rect(HX + 5, 9, 2, 9, C.white); P.rect(HX + 5, 9, 2, 1, C.out)
    const swish = t > 5.5 && t < 6.0 ? Math.sin(seg(t, 5.5, 6.0) * Math.PI) * 2 : 0
    P.rect(HX - 1, 15, 7, 1, acc(P)); for (let i = 0; i < 4; i++) { P.px(HX + i * 1.6, 16 + swish * 0.5 + (i % 2), C.white); P.px(HX + 0.8 + i * 1.3, 18 + swish, C.white) } P.px(HX + 2.5, 19 + swish, C.white)
    // the sea lion
    const rise = eo(seg(t, 0.3, 1.1)), nod = t > 4.2 && t < 4.6 ? Math.sin(seg(t, 4.2, 4.6) * Math.PI) : 0, clap = t > 6.0 ? Math.sin(t * 16) : 0, bark = t > 6.0 && Math.floor(t * 3) % 2 === 0
    const y = W + 10 - rise * 12, sway = t > 1.7 && t < 4.2 ? Math.sin(t * 5) * 0.8 : 0
    const L = sprite().disc(0, -3, 4, C.lion).disc(0, 1, 4.5, C.lion).rect(-2, -9, 4, 7, C.lion).disc(1, -10, 2.5, C.lion).rect(2, -11 + nod, 4, 2, C.lion).dot(1.5, -11, C.out).dot(5.5, -11 + nod, C.out)
      .line(2, -2, 6 + clap * 1.5, 1 - clap * 2, C.lion2, 1.5).line(-2, -2, -6 - clap * 1.5, 1 - clap * 2, C.lion2, 1.5)
    if (bark) L.rect(4, -9.5 + nod, 2, 1, C.mouth)
    P.spr(L, SX + sway, y, { rot: sway * 3 })
    if (t > 0.3 && t < 1.3) P.splash(t, SX, W, 0.3, 8, 1)
    // the ball: down onto the nose, the wobble, the flick into the hoop, through, into the water
    const nose = [SX + 4 + sway, y - 14 + nod]
    if (t > 1.2 && t < 1.7) { const k = seg(t, 1.2, 1.7); P.ball(nose[0], lerp(-4, nose[1], ei(k))) }
    else if (t >= 1.7 && t < 4.5) P.ball(nose[0] + Math.sin(t * 7) * 0.7, nose[1] - Math.abs(Math.sin(t * 3.5)) * 0.8)
    else if (t >= 4.5 && t < 5.55) { const k = seg(t, 4.5, 5.55); P.ball(lerp(nose[0], HX + 2.5, k), lerp(nose[1], 14, k) - Math.sin(k * Math.PI) * 18) }
    else if (t >= 5.55 && t < 6.1) { const k = seg(t, 5.55, 6.1); P.ball(HX + 2.5, lerp(14, W - 1, ei(k))) }
    P.splash(t, HX + 2.5, W, 6.1, 12, 0.7)
  } },
  steamroller: { label: 'a steamroller flattens a Dodger fan; he peels himself up, falls flat, and rolls up like a carpet', dur: 9, still: 7.6, draw(P, t) {
    const DX = 150
    P.road()
    // the Dodger fan: alarmed, then flat (the fan's colors in a strip on the road), then peeled up, then flat again, then rolled up like a rug
    const flatAt = 2.75, cols = [C.black, C.jeans, C.jeans, C.jeans, C.jeans, C.la, C.la, C.la, C.la, C.la, C.skin, C.skin, C.la, C.la]
    P.shake(t, flatAt, 0.3, 2)
    if (t < flatAt) P.guy(KITS.laFan, { armF: t > 1.9 ? 175 : 10, armB: t > 1.9 ? 170 : 8, mouth: t > 1.9 ? 'O' : null, hold: t < 1.9 ? 'dog' : null, legF: [1.5, 0] }, DX, 36, { face: -1, sx: t > 1.9 ? 1.05 : 1, sy: t > 1.9 ? 1.08 : 1 })
    else {
      const peel = seg(t, 4.4, 5.4), wob = t > 5.4 && t < 6.2 ? Math.sin((t - 5.4) * 14) * 14 * (1 - seg(t, 5.4, 6.2)) : 0, down = seg(t, 6.2, 6.6), roll = seg(t, 6.9, 8.0)
      const ang = t < 4.4 ? 0 : t < 6.2 ? lerp(0, 90, back(peel)) + wob : lerp(90, 0, ei(down)) // 0 lies along the road (feet at DX - 7, head to the right), 90 stands
      const x0 = DX - 7
      if (roll <= 0) for (let i = 0; i < cols.length; i++) { const a = ang * D2R; P.rect(x0 + Math.cos(a) * i - (ang > 45 ? 0 : 0), 35 - Math.sin(a) * i, 1, 1, cols[i]) }
      else {
        const rx = x0 + roll * 12, rr = 1 + roll * 1.8
        for (let i = Math.ceil(roll * 12) + 1; i < cols.length; i++) P.rect(x0 + i, 35, 1, 1, cols[i])
        const Rl = sprite().disc(0, 0, rr, C.la).disc(0, 0, rr * 0.5, C.jeans); P.spr(Rl, rx, 35 - rr + 0.5, {})
        if (roll >= 1) { P.rect(rx + rr - 0.5, 35 - rr * 2 - 1, 3, 1.5, C.la); if (t > 8.2 && Math.floor(t * 4) % 2) P.px(rx + rr + 1, 35 - rr, C.skin) }
      }
      if (t > flatAt && t < flatAt + 1.4) P.puff(t, DX, 35, flatAt, 9, 12, C.grey)
    }
    // the steamroller: in from the left, over him, away to the right
    const x = lerp(-50, 330, seg(t, 0.4, 4.6)), shake2 = Math.sin(t * 40) * 0.4
    const SR = sprite().rect(-20, -10, 22, 8, C.gold).rect(-17, -16, 12, 6, C.steel).rect(-16, -15, 10, 4, C.gold).rect(-5, -14, 4, 2, '#7fb0d9').rect(-24, -12, 2, 8, C.steel).rect(-13, -20, 2, 4, C.black)
      .disc(6, -5, 5, C.steel).disc(6, -5, 3, C.grey).disc(-19, -3, 3, C.black).disc(-19, -3, 1.5, C.grey).rect(2, -11, 8, 2, C.gold)
    P.spr(SR, x, 36 + shake2, {})
    if (t > 0.4 && t < 4.6) for (let i = 0; i < 4; i++) { const age = ((t * 2 + i / 4) % 1), sx = x - 12 - age * 6, sy = 36 - 21 - age * 10; if (sy > -2) P.rect(sx, sy, 2 + age * 2, 2, age < 0.5 ? C.smoke : C.grey) }
  } },
  crab: { label: 'a giant crab climbs out of the bay and chops up a Dodger fan', dur: 9, still: 6.2, draw(P, t) {
    const W = 34, FX0 = 122
    P.water(W + 1, t, 168); P.rect(0, 34, 170, 2, C.plank); for (let u = 0; u < 170; u += 6) P.rect(u, 34, 1, 2, C.plank2); for (const u of [20, 70, 120, 165]) P.rect(u, 36, 2, 4, C.plank2) // the pier
    P.shake(t, 3.3, 0.25, 2); P.shake(t, 4.5, 0.25, 2); P.shake(t, 5.15, 0.2, 1.5)
    // the crab: out of the water, up onto the pier, the claws; at the end it holds them up and snaps
    const up = eo(seg(t, 0.5, 1.8)), walk = seg(t, 1.8, 3.0), cx = lerp(214, 146, eio(walk)), cy = lerp(W + 12, 34, up)
    const snapAt = [3.3, 4.5, 5.15], snap = snapAt.some((s) => t > s - 0.25 && t < s) ? 1 : 0, cheer = t > 5.8, open2 = cheer ? (Math.floor(t * 6) % 2) : snap ? 0 : 1
    const reach = snapAt.some((s) => t > s - 0.35 && t < s + 0.2) ? 1 : 0, lp = Math.sin(t * 18) * (walk > 0 && walk < 1 ? 1 : 0)
    const Cr = sprite().disc(0, -4, 6, C.crab).rect(-7, -5, 14, 3, C.crab).rect(-6, -2, 12, 1, C.crab2)
      .line(-2, -9, -2, -12, C.crab2, 1).line(2, -9, 2, -12, C.crab2, 1).dot(-2, -13, C.out).dot(2, -13, C.out)
    for (let i = 0; i < 3; i++) { Cr.line(-5 + i * 2, -2, -8 + i * 2 + lp, 0, C.crab2, 1); Cr.line(5 - i * 2, -2, 8 - i * 2 - lp, 0, C.crab2, 1) }
    // the arms and the claws (the left one reaches for the fan)
    const ca = cheer ? -12 : -6 - reach * 18, cl2 = [cx + ca - 6, cy - 12 - (cheer ? 6 : 0)]
    Cr.line(-5, -6, ca - 2, cheer ? -16 : -10, C.crab, 1.5).line(5, -6, cheer ? 10 : 9, cheer ? -16 : -10, C.crab, 1.5)
    P.spr(Cr, cx, cy, {})
    const claw = (x, y, o) => { const K = sprite().rect(-3, -2, 4, 2, C.crab).rect(-3, o ? -4.5 : -3, 3, 1.5, C.crab).rect(-3, o ? 1 : 0, 3, 1.5, C.crab); P.spr(K, x, y, { face: -1 }) }
    claw(cl2[0], cl2[1] + 2, open2); claw(cx + (cheer ? 12 : 11), cy - 10 - (cheer ? 6 : 0), cheer ? open2 : 1)
    if (t > 0.5 && t < 1.6) P.splash(t, 214, W + 1, 0.5, 2, 1.2)
    // the Dodger fan: eats, sees it, backs off; snip at the waist (3.3), at the knees (4.5), the head (5.15)
    const fx = t < 2.0 ? FX0 : lerp(FX0, 110, seg(t, 2.0, 3.0)), scared = t > 1.8, B = 34
    if (t < 3.3) { P.guy(KITS.laFan, { armF: scared ? 170 : 60, armB: scared ? 165 : 10, mouth: scared ? 'O' : null, hold: scared ? null : 'dog', legF: [1.5 + (scared ? Math.sin(t * 20) * 0.5 : 0), 0] }, fx, B, { face: 1 }); if (scared && t < 2.2) { const k = seg(t, 1.8, 2.2); P.rect(lerp(fx + 4, fx + 10, k), lerp(B - 9, B, k * k), 4, 1, C.gold) } }
    else {
      const f1 = seg(t, 3.3, 4.0), legsDown = t >= 4.5, f2 = seg(t, 4.5, 5.1), headOff = t >= 5.15, roll = seg(t, 5.15, 6.4)
      // the legs: below the knees stay standing; the thighs topple once they are cut
      P.guy(KITS.laFan, { parts: ['shins'] }, fx, B, { face: 1 })
      if (!legsDown) P.guy(KITS.laFan, { parts: ['thighs'] }, fx, B, { face: 1 })
      else P.guy(KITS.laFan, { parts: ['thighs'] }, fx - 3 * f2, B + 3 * f2, { face: 1, rot: -80 * eo(f2), pv: -3 })
      // the top half slides off backwards and lands on the planks
      const tx = fx - 9 * f1, ty = B - 6 + 6 * ei(f1) + (f1 > 0 ? -Math.sin(f1 * Math.PI) * 3 : 0)
      P.guy(KITS.laFan, { parts: headOff ? ['torso', 'arms'] : ['torso', 'arms', 'head'], armF: lerp(170, 120, f1), armB: 165, mouth: 'O', eye: f1 >= 1 ? 'shut' : null }, tx, ty + 6, { face: 1, rot: -88 * eo(f1), pv: -6 })
      // the head pops off and rolls away down the pier, its cap beside it
      if (headOff) { const hx = lerp(tx - 9, 52, eo(roll)), hy = B - 2 - (roll < 0.25 ? Math.sin(roll / 0.25 * Math.PI) * 6 : 0); const Hd = sprite().disc(0, 0, 2, C.skin).dot(1, -0.5, C.out).rect(1, 1, 1, 1, C.mouth); P.spr(Hd, hx, hy, { rot: roll * 900 }); P.rect(lerp(tx - 9, 64, eo(seg(t, 5.15, 5.9))), B - 2, 4, 2, C.la); for (let k2 = 0.05; k2 < roll; k2 += 0.08) P.px(lerp(tx - 9, 52, eo(k2)), B - 1, C.blood) }
      // the blood: out of every cut, and pooling on the planks
      P.spray(t, fx, B - 6, 3.3, 41, 34, { dir: 100, spread: 120, speed: 34, stagger: 0.9, floor: B - 0.5 })
      P.spray(t, fx, B - 3, 4.5, 42, 22, { dir: 80, spread: 110, speed: 26, stagger: 0.6, floor: B - 0.5 })
      if (headOff) P.spray(t, tx - 8, B - 2, 5.15, 43, 20, { dir: 95, spread: 90, speed: 30, stagger: 0.5, floor: B - 0.5 })
      const pool = seg(t, 3.5, 8.5); P.rect(fx - 4 - pool * 10, B - 1, 6 + pool * 18, 1, C.blood); if (pool > 0.3) P.rect(fx - 2 - pool * 6, B - 1, 4 + pool * 8, 1, C.blood2)
    }
  } },
  liner: { label: 'a Dodger fan pitches, a Giants fan lines it straight back into his face, blood squirts and he falls flat', dur: 8, still: 3.8, draw(P, t0) {
    const t = hold(hold(t0, 1.68, 0.1), 1.95, 0.22), PX = 186, BX = 68, impact = t0 >= 1.95 + 0.1
    P.field(); P.rect(BX - 3, 35, 6, 1, C.white)
    P.shake(t0, 1.68, 0.15, 1); P.shake(t0, 2.05, 0.4, 2.5); P.shake(t0, 3.4, 0.3, 1.5)
    // the Giants fan with the bat: the swing, then the bat flip, then both arms up
    const sw = seg(t, 1.6, 1.8), flip = seg(t, 2.6, 3.4), cheer = t > 3.4
    P.guy(KITS.sfFan, { bat: t < 1.6 ? 160 : t < 2.6 ? lerp(160, 15, eo(sw)) : null, armF: t < 1.6 ? 150 : t < 2.6 ? 40 : cheer ? 178 - Math.abs(Math.sin(t * 6)) * 15 : 150, armB: t < 2.6 ? 140 : cheer ? 175 : 90, lean: 0.15, mouth: cheer ? 'O' : null, legF: [2.5, 0] }, BX, 36 - (cheer ? Math.abs(Math.sin(t * 6)) * 1.5 : 0))
    if (t >= 2.6 && t < 3.4) P.spr(sprite().line(-3.5, 0, 3.5, 0, C.wood, 1.5), lerp(BX + 4, BX + 26, flip), 26 - Math.sin(flip * Math.PI) * 14 + flip * 9, { rot: flip * 720 })
    if (t >= 3.4) P.rect(BX + 23, 35, 7, 1, C.wood)
    // the Dodger fan on the mound: wind and throw, then the ball in the face; his head snaps back, he goes over backwards, flat; the legs twitch
    const thr = seg(t, 1.1, 1.3), fall = seg(t, 2.25, 3.4), down = t >= 3.4
    if (!impact) P.guy(KITS.laFan, { armF: 70, armB: t < 1.1 ? lerp(40, 175, seg(t, 0.5, 1.0)) : lerp(175, 40, eo(thr)), lean: thr * 0.3, legF: [2 + thr * 3, -seg(t, 0.5, 1.0) * (1 - thr) * 4], knee: 1 + seg(t, 0.5, 1.0) * 2, hold: t < 1.25 ? 'ball' : null }, PX, 36, { face: -1 })
    else {
      const tw = down && t > 4.0 && t < 6.0 ? Math.sin(t * 25) * (1 - seg(t, 4.0, 6.0)) : 0
      const rot = -(down ? 90 - Math.sin(seg(t, 3.4, 3.7) * Math.PI) * 6 : 90 * ei(fall)) // (over backwards, away from the batter)
      P.guy(KITS.laFan, { armF: lerp(90, 175, eo(fall)), armB: lerp(60, 170, eo(fall)), eye: 'shut', mouth: 'O', headDx: -1, legF: [1.5 + tw, -Math.abs(tw)], legB: [-1.5, 0] }, PX, 36, { face: -1, rot })
      // the face: the squirt (the first burst, then a few pumps while he goes over), then the pool round his head
      const head = (k) => { const a = 90 * ei(k) * D2R; return [PX + Math.sin(a) * 13, 36 - Math.cos(a) * 13] }
      const h0 = head(0)
      P.spray(t0, h0[0], h0[1], 2.06, 61, 40, { dir: 40, spread: 70, speed: 42, stagger: 0.15, floor: 35.5 })
      for (let i = 0; i < 4; i++) { const tp = 2.4 + i * 0.32, hp = head(seg(tp, 2.25, 3.4)); P.spray(t0, hp[0], hp[1], tp, 70 + i, 9, { dir: 60, spread: 40, speed: 22, stagger: 0.08, floor: 35.5 }) }
      if (t0 < 2.3) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, d = 2 + (t0 - 2.05) * 26; P.px(h0[0] + Math.cos(a) * d, h0[1] + Math.sin(a) * d, i % 2 ? C.white : C.blood) }
      if (down) { const pool = seg(t, 3.5, 8); P.rect(PX + 10 - pool * 4, 35, 5 + pool * 12, 1, C.blood); if (pool > 0.4) P.rect(PX + 12 - pool * 2, 35, 3 + pool * 6, 1, C.blood2) }
      P.puff(t, PX + 8, 36, 3.4, 17, 12, C.dirt)
    }
    // the ball: the pitch, the liner into the face, the ricochet up and away
    if (t >= 1.22 && t < 1.68) { const k = seg(t, 1.22, 1.68); P.ball(lerp(PX - 7, BX + 6, k), 27) }
    else if (t >= 1.68 && t < 1.95) { const k = seg(t, 1.68, 1.95), x = lerp(BX + 7, PX - 2, k), y = lerp(27, 23, k); P.ball(x, y); P.px(x - 3, y + 0.3, C.grey); P.px(x - 6, y + 0.6, C.grey2) }
    else if (t >= 1.95) { const k = seg(t, 1.95, 3.1), y = 23 - Math.sin(Math.min(1, k) * Math.PI) * 16 + (k >= 1 ? 12 : 0); P.ball(lerp(PX - 2, 150, k), k < 1 ? y : 34 - Math.abs(Math.sin(seg(t, 3.1, 3.8) * Math.PI * 2)) * 2 * (1 - seg(t, 3.1, 3.8))) }
  } },
}
function acc(P) { return P.acc }
// draw one frame of one gag into a 2D context (cleared first); acc is the page's Giants orange
export function drawGag(cx, k, t, accent = '#f0802a') {
  const g = GAGS[k]; if (!g) return
  cx.clearRect(0, 0, GW * U, GH * U)
  const P = painter(cx, accent)
  g.draw(P, Math.max(0, Math.min(g.dur, t)))
}
// the drawing kit, for candidate gags drawn the same way (menugags_cand25.js; 10-11 Nov, overnight)
export const GAGKIT = { C, cl, lerp, seg, eo, ei, eio, back, hold, D2R, rng, hash, dk, sprite, xf, KITS, guy, painter }
// draw from any table of gags (the candidates' gallery)
export function drawGagFrom(table, cx, k, t, accent = '#f0802a') {
  const g = table[k]; if (!g) return
  cx.clearRect(0, 0, GW * U, GH * U)
  g.draw(painter(cx, accent), Math.max(0, Math.min(g.dur, t)))
}
