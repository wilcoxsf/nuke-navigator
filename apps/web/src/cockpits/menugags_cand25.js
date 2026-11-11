// CANDIDATE MENU GAGS (10-11 Nov 2026, overnight; Andrew earlier: "let's stock more of them and make them higher quality", and the N list he had not picked from yet).
// Not in the app: tools/gag_gallery.py puts them on a page beside the twelve, with YAY / NAY, so he picks in one pass. Same kit, same rules (260 x 40, outlined,
// setup, beat, punchline and a hold, no words). Each is a pure function of the time into it.
import { GAGKIT } from './menugags25.js'
const { C, cl, lerp, seg, eo, ei, eio, back, hold, D2R, rng, hash, dk, sprite, KITS } = GAGKIT
void D2R; void hash; void hold; void back; void eio
const acc = (P) => P.acc
// a small boat, a dog (sitting, swimming, shaking), a parrot, a loaf with legs
const boat = (P, x, y, col) => { P.rect(x - 9, y - 1, 19, 3, C.out); P.rect(x - 8, y - 1, 17, 2, col); P.rect(x - 6, y + 1, 13, 1, dk(col)); P.rect(x + 5, y - 5, 1, 4, C.grey2) }
const dogSit = (P, x, y, face = 1, wag = 0) => P.spr(sprite().rect(-2, -2, 5, 2, C.dog).rect(-3, -4, 2, 2, C.dog).dot(-4, -3, C.out).dot(-2, -5, dk(C.dog)).line(3, -2, 4.5, -3.5 - wag, C.dog, 1).rect(-1, 0, 1, 1, C.dog).rect(2, 0, 1, 1, C.dog), x, y, { face })
const dogSwim = (P, x, y, face = -1) => P.spr(sprite().rect(-3, -4, 2, 2, C.dog).dot(-4, -3, C.out).dot(-2, -5, dk(C.dog)).rect(-1, -2, 4, 1, C.dog), x, y, { face })
const parrot = (P, x, y, f, face = -1) => { const up = Math.floor(f) % 2; P.spr(sprite().rect(-2, -1, 4, 2, '#2fb34a').rect(-3, -2, 2, 2, '#2fb34a').dot(-4, -1.5, C.gold).dot(-2.5, -1.5, C.out).dot(-3, -2.5, C.red).line(0, -1, 2, up ? -3.5 : 1, '#1d7a33', 1).rect(2, 0, 2, 1, '#1d7a33'), x, y, { face }) }
const loaf = (P, x, y, t, s, col = '#c8914f') => { const p = Math.sin(t * 14 + s); P.spr(sprite().disc(0, -4, 3, col).rect(-3, -4, 6, 2, col).line(-1.5, -4.5, 1.5, -3.5, dk(col), 1).line(-1, -1, -1 - p * 1.5, 0, C.black, 1).line(1, -1, 1 + p * 1.5, 0, C.black, 1).dot(1.5, -5, C.out), x, y, {}) }

export const CAND_GAGS = {
  balldog: { name: 'BALL DOG', label: 'a splash hit; a water dog dives off a boat, paddles out, brings the ball back and shakes off over its owner', dur: 9, still: 7.2, draw(P, t) {
    const W = 33, BX = 228
    P.water(W, t)
    if (t < 1.0) { const k = t / 1.0; P.ball(lerp(60, 150, k), lerp(-4, W - 1, ei(k))) }
    P.splash(t, 150, W, 1.0, 3, 1.2)
    const bob = Math.sin(t * 3) * 0.5
    boat(P, BX, W - 1 + bob, '#e2621b')
    const owner = P.guy(KITS.sfFan, { half: true, armF: t > 6.4 && t < 7.6 ? 150 : t > 1.2 && t < 2.0 ? 120 : 30, armB: 20, mouth: t > 6.6 ? 'O' : null, eye: t > 6.6 ? 'shut' : null }, BX + 3, W + 3 + bob, { face: -1 })
    void owner
    const dive = seg(t, 1.6, 2.2), out = seg(t, 2.2, 4.2), back2 = seg(t, 4.6, 6.2)
    if (t < 1.6) dogSit(P, BX - 5, W - 2 + bob, -1, Math.sin(t * 16))
    else if (t < 2.2) { const x = lerp(BX - 5, BX - 18, dive), y = W - 3 - Math.sin(dive * Math.PI) * 7; P.spr(sprite().rect(-3, -1, 6, 2, C.dog).rect(-5, -2, 2, 2, C.dog).line(3, 0, 5, 1, C.dog, 1), x, y, { face: -1, rot: lerp(-20, 40, dive) }) }
    else if (t < 4.6) { const x = lerp(BX - 18, 152, eo(out)); dogSwim(P, x, W + Math.sin(t * 8) * 0.5); if (Math.floor(t * 8) % 2) P.px(x + 4, W, C.foam); if (t >= 4.2) P.ball(x - 4.5, W - 2.5) }
    else if (t < 6.2) { const x = lerp(152, BX - 7, eio(back2)); dogSwim(P, x, W + Math.sin(t * 8) * 0.5, 1); P.ball(x + 4.5, W - 2.5) }
    else { const shake = t > 6.4 && t < 7.6; const dx = shake ? Math.sin(t * 40) * 0.8 : 0; dogSit(P, BX - 5 + dx, W - 2 + bob, 1, Math.sin(t * 16)); if (shake) P.spray(t, BX - 4, W - 5, 6.4, 7, 26, { dir: 90, spread: 160, speed: 22, g: 40, stagger: 1.0, floor: W, vanish: true, cols: [C.foam, C.water2] }); P.ball(BX - 9, W - 5 + bob) }
    if (t >= 2.2 && t < 2.6) P.splash(t, BX - 18, W, 2.2, 5, 0.6)
    if (t >= 1.0 && t < 4.2) P.ball(150, W - 1 + Math.sin(t * 3 + 2) * 0.5)
  } },
  trot: { name: 'TRIPLE TROT', label: 'a home-run trot: he trips over third, crawls home, and the dugout mobs him anyway', dur: 9, still: 7.4, draw(P, t) {
    P.field(); const B = [40, 95, 150, 205]
    for (const b of B) { P.rect(b - 2, 35, 5, 1, C.white) } P.rect(B[0] - 3, 35, 6, 1, C.white)
    // the trot: home (40) to first (95) to second (150) to third (205), the stumble there, then the crawl back... the bases are laid in a line, the trot runs right then turns home at the left
    let x, y = 36, pose = {}
    if (t < 4.0) { const k = t / 4.0; x = lerp(B[0], B[3], k); const p = Math.sin(t * 10); pose = { armF: 30 + p * 30, armB: 30 - p * 30, legF: [1.5 + p * 2, -Math.max(0, p)], legB: [-1.5 - p * 2, -Math.max(0, -p)], lean: 0.1, mouth: t > 2.5 ? 'O' : null }
      P.guy(KITS.sf, pose, x, y, { face: 1 }) }
    else if (t < 4.6) { const k = seg(t, 4.0, 4.6); x = B[3] + k * 6; P.guy(KITS.sf, { armF: 170, armB: 160, mouth: 'O', legF: [3, -2] }, x, 36, { face: 1, rot: lerp(0, 85, ei(k)), pv: 0 }); if (k > 0.9) P.puff(t, x + 8, 36, 4.5, 3, 10, C.dirt) }
    else if (t < 7.0) { const k = seg(t, 4.8, 7.0); x = lerp(B[3] + 6, B[0] + 10, k); const p = Math.sin(t * 9); P.guy(KITS.sf, { armF: 90 + p * 30, armB: 90 - p * 30, legF: [3, -1], legB: [-3, -1], eye: 'shut' }, x, 33, { face: -1, rot: -75, pv: -6 }) }
    else { x = B[0]; P.guy(KITS.sf, { armF: 178, armB: 175, mouth: 'O' }, B[0] + 2, 36 - Math.abs(Math.sin(t * 7)) * 2, { face: 1 }) }
    // the dugout comes out at the end
    if (t > 6.6) { const k = eo(seg(t, 6.6, 7.4)); for (let i = 0; i < 4; i++) { const hx = lerp(-10 - i * 8, B[0] - 8 - i * 7, k), jump = t > 7.4 ? Math.abs(Math.sin(t * 7 + i)) * 2.5 : 0; P.guy(KITS.sf, { armF: 175, armB: 170, mouth: 'O' }, hx, 36 - jump, { face: 1 }) } }
    if (t > 4.6 && t < 7) P.stars(t, x - 6, 29, 3)
  } },
  robbed: { name: 'ROBBED', label: 'a Giant climbs the wall to rob a Dodger, catches it, and the whole wall tips over with him on it into the Cove', dur: 9, still: 6.2, draw(P, t) {
    const WX = 170, W = 34
    P.rect(0, 36, WX, 4, C.grass); for (let u = 0; u < WX; u += 3) P.px(u + ((u / 3) % 2), 36, C.grass2)
    P.water(W, t, WX + 2)
    const tip = seg(t, 4.6, 6.0), ang = ei(tip) * 80
    const Wl = sprite(); for (let v = 0; v < 14; v++) for (let u = 0; u < 3; u++) Wl.dot(u, -v - 1, (u + v) % 3 ? C.brick : C.brick2)
    if (t < 6.0) P.spr(Wl, WX, 36, { rot: ang, pu: 3, pv: 0 })
    else { P.spr(Wl, WX, 36, { rot: 80, pu: 3, pv: 0 }); P.splash(t, WX + 12, W, 6.0, 8, 1.6) }
    // the ball: a high one toward the wall
    const k = seg(t, 0.6, 3.4), bx = lerp(20, WX + 2, k), by = 30 - Math.sin(k * Math.PI) * 26 + k * 2
    // the fielder: runs, climbs the wall, reaches, catches, rides it down
    let fx, fy, pose, rot = 0
    if (t < 2.2) { const r = seg(t, 0.8, 2.2); fx = lerp(100, WX - 3, eo(r)); fy = 36; const p = Math.sin(t * 12); pose = { glove: 'F', armF: 120, armB: 40, legF: [1.5 + p * 2, 0], legB: [-1.5 - p * 2, 0], lean: -0.1 } }
    else if (t < 3.4) { const c = seg(t, 2.2, 3.0); fx = WX + 1; fy = lerp(36, 22, eo(c)); pose = { glove: 'F', armF: t > 3.0 ? 175 : 150, armB: 160, legF: [1, -1], legB: [-1, 0], headDy: -0.5 } }
    else if (t < 4.6) { fx = WX + 1; fy = 22; pose = { glove: 'F', inGlove: true, armF: 178, armB: 175, mouth: 'O' } }
    else { const a = ang * D2R; fx = WX + 3 + Math.sin(a) * 15; fy = 36 - Math.cos(a) * 15; pose = { glove: 'F', inGlove: true, armF: 178, armB: 120, mouth: 'O' }; rot = ang * 0.6 }
    if (t < 6.4) P.guy(KITS.sf, pose, fx, fy, { face: 1, rot })
    if (t < 3.3) P.ball(bx, by)
    // the Dodger batter far left, bat dropped, arms out
    P.guy(KITS.la, { bat: t < 0.6 ? 160 : null, armF: t > 3.5 ? 110 : 60, armB: t > 3.5 ? 110 : 40, mouth: t > 3.5 ? 'O' : null }, 18, 36)
    if (t > 6.4) { P.guy(KITS.sf, { half: true, parts: ['head', 'arms'], armF: 178, glove: 'F', inGlove: true }, WX + 16, W + 8 + Math.sin(t * 5) * 0.5, { face: 1 }) }
  } },
  dunk: { name: 'DODGER DUNK', label: 'a dunk tank on the arcade: a strike drops a Dodger fan into the tank, and the tank bursts into the Cove', dur: 8.5, still: 4.4, draw(P, t) {
    const TX = 180, W = 34
    P.rect(0, 36, 150, 4, C.grass); for (let u = 0; u < 150; u += 3) P.px(u + ((u / 3) % 2), 36, C.grass2)
    P.water(W, t, 150)
    P.shake(t, 3.2, 0.3, 1.5); P.shake(t, 6.0, 0.4, 2)
    // the tank: glass, water, the seat, the target arm
    const burst = t >= 6.0
    if (!burst) { P.rect(TX - 9, 20, 1, 16, C.foam); P.rect(TX + 9, 20, 1, 16, C.foam); P.rect(TX - 8, 27, 17, 9, C.water2); for (let u = TX - 8; u <= TX + 8; u++) if (Math.sin(u + t * 4) > 0.6) P.px(u, 27, C.foam) }
    else P.spray(t, TX, 30, 6.0, 9, 40, { dir: 90, spread: 160, speed: 30, g: 50, stagger: 0.3, floor: W + 1, vanish: true, cols: [C.foam, C.water2] })
    const drop = t >= 3.2, seatUp = !drop
    P.rect(TX - 8, 20, 9, 1, seatUp ? C.wood : C.grey2)
    P.rect(TX + 10, 16, 1, 8, C.grey2);
    const T = sprite().disc(0, 0, 2.5, C.red).disc(0, 0, 1.5, C.white).disc(0, 0, 0.6, C.red); P.spr(T, TX + 13, 17, {})
    // the Dodger fan: sits, taunts, drops, splashes, ends floating out in the Cove
    if (!drop) P.guy(KITS.laFan, { half: true, armF: 150 + Math.sin(t * 8) * 20, armB: 30, mouth: 'O' }, TX - 4, 26, { face: 1 })
    else if (!burst) { const k = seg(t, 3.2, 3.6); P.guy(KITS.laFan, { half: true, armF: 175, armB: 175, mouth: 'O', eye: 'shut' }, TX - 3, lerp(26, 36, ei(k)), { face: 1 }); P.splash(t, TX, 27, 3.4, 4, 0.8); if (t > 3.8) for (let i = 0; i < 3; i++) P.px(TX - 3 + i * 2, 24 - ((t * 6 + i) % 4), C.foam) }
    else { const k = seg(t, 6.0, 7.2); P.guy(KITS.laFan, { half: true, armF: 160, armB: 160, eye: 'shut', mouth: 'O' }, lerp(TX, 236, eo(k)), W + 5 + Math.sin(t * 4) * 0.6, { face: 1, rot: lerp(0, 25, k) }) }
    // the Giants fan throws: wind, throw at 2.6, the ball hits the target at 3.2
    const thr = seg(t, 2.4, 2.65)
    P.guy(KITS.sfFan, { armF: 80, armB: t < 2.4 ? lerp(40, 170, seg(t, 1.6, 2.3)) : lerp(170, 30, eo(thr)), lean: thr * 0.3, legF: [2 + thr * 3, 0], mouth: t > 3.4 ? 'O' : null }, 60, 36)
    if (t > 3.4) P.guy(KITS.sfFan, { armF: 178, armB: 175, mouth: 'O' }, 60, 36 - Math.abs(Math.sin(t * 7)) * 1.5)
    if (t >= 2.6 && t < 3.2) { const k = seg(t, 2.6, 3.2); P.ball(lerp(66, TX + 13, k), lerp(26, 17, k) - Math.sin(k * Math.PI) * 6) }
    if (t >= 3.2 && t < 3.6) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; P.px(TX + 13 + Math.cos(a) * (2 + (t - 3.2) * 20), 17 + Math.sin(a) * (2 + (t - 3.2) * 20), C.white) }
  } },
  parrots: { name: 'PARROT GETAWAY', label: 'a home run lands in the bleachers and a flock of wild parrots carries it off over the bay', dur: 9, still: 5.6, draw(P, t) {
    const ROW = 30
    P.rect(0, 36, GW0, 4, C.seat); for (let u = 0; u < GW0; u += 12) P.rect(u, 34, 10, 2, C.seat2)
    const r = rng(19)
    for (let x = 10; x < GW0 - 4; x += 12) { const kit = [KITS.sfFan, KITS.gold, KITS.sfFan, KITS.vest][Math.floor(r() * 4)]; const near = Math.abs(x - 130) < 20 && t > 1.4; P.guy(kit, { half: true, armF: near && t < 3 ? 170 : 10, armB: near && t < 3 ? 160 : 8, mouth: near ? 'O' : null }, x, ROW + 5, { face: x < 130 ? 1 : -1 }) }
    // the ball comes in, bounces off a seat, and sits on the concrete
    const land = t >= 1.4
    if (!land) { const k = t / 1.4; P.ball(lerp(-4, 128, k), lerp(4, 31, ei(k))) } else if (t < 3.0) P.ball(128 + Math.sin(seg(t, 1.4, 1.8) * Math.PI) * 2, 31 - Math.abs(Math.sin(seg(t, 1.4, 2.0) * Math.PI * 2)) * 3 * (1 - seg(t, 1.4, 2.0)))
    // the parrots: in from the top right in a loose flock, round the ball, up and away over the bay with it
    if (t > 2.2) {
      const k = seg(t, 2.2, 3.0), k2 = seg(t, 3.4, 8.0), cx = t < 3.0 ? lerp(280, 128, eo(k)) : t < 3.4 ? 128 : lerp(128, 300, ei(k2)), cy = t < 3.0 ? lerp(-6, 27, k) : t < 3.4 ? 27 : lerp(27, -10, k2)
      const F = [[-6, -2], [6, -3], [0, -6], [-10, 2], [10, 1], [-3, 4], [4, 5]]
      for (let i = 0; i < F.length; i++) parrot(P, cx + F[i][0] * (t < 3.0 ? 1.4 : 1), cy + F[i][1] * (t < 3.0 ? 1.4 : 0.8), t * 10 + i * 1.7, t < 3.4 ? -1 : 1)
      if (t >= 3.0) P.ball(cx, cy + 2)
      if (t > 3.6 && t < 5) P.px(cx - 4, cy + 6, '#2fb34a') // a feather
    }
  } },
  ferry: { name: 'FERRY HORN', label: 'the ferry blasts its horn behind the bleachers and blows every cap in the row into the bay; the last guy loses his toupee', dur: 8.5, still: 5.2, draw(P, t) {
    const W = 22, HORN = 3.0, HAIR = '#3b2a1d', TOUPEE = '#7a5230'
    P.water(W, t, 0, GW0)
    // the ferry crosses behind
    const fx = lerp(-40, 300, t / 8.5), F = sprite().rect(-24, -4, 48, 4, C.white).rect(-20, -8, 34, 4, C.white).rect(-16, -11, 18, 3, C.white).rect(-10, -14, 4, 3, C.red).rect(-22, -1, 44, 1, C.la)
    for (let i = -18; i < 12; i += 5) F.rect(i, -7, 3, 2, C.panel)
    P.spr(F, fx, W, {})
    const hx = lerp(-40, 300, HORN / 8.5) - 8, hy = W - 14
    if (t >= HORN && t < HORN + 1.4) for (let i = 0; i < 3; i++) { const rr = ((t - HORN) * 34 + i * 10) % 34; for (let a = 0; a < 14; a++) { const an = -Math.PI / 2 + (a / 13 - 0.5) * 2.4; P.px(hx + Math.cos(an) * rr * 1.8, hy + 2 + Math.sin(an) * rr * 0.5, C.foam) } }
    P.shake(t, HORN, 0.6, 1)
    // the row in front: the blast reaches each fan by distance from the horn and takes the cap
    const r = rng(23), fans = []
    for (let x = 10, i = 0; x < GW0 - 4; x += 12, i++) { const last = x + 12 >= GW0 - 4, kit = last ? { ...KITS.sfFan, cap: TOUPEE } : [KITS.sfFan, KITS.gold, KITS.sfFan, KITS.vest][Math.floor(r() * 4)], t0 = HORN + 0.1 + Math.abs(x - hx) * 0.004; fans.push({ x, kit, last, t0, k: seg(t, t0, t0 + 1.4), dir: x < hx ? -1 : 1 }) }
    const capCol = (f) => (f.kit.cap === 'ACC' ? acc(P) : f.kit.cap), capAt = (f) => [f.x + f.dir * f.k * 36, 21 - Math.sin(f.k * Math.PI) * 10]
    for (const f of fans) if (f.k >= 1) { const [x] = capAt(f); P.rect(x, W - 1 + Math.sin(t * 3 + f.x) * 0.5, 4, 1, capCol(f)) } // floating in the bay, behind the row
    P.rect(0, 36, GW0, 4, C.seat); for (let u = 0; u < GW0; u += 12) P.rect(u, 34, 10, 2, C.seat2)
    for (const f of fans) {
      const gone = t >= f.t0, kit = gone ? { ...f.kit, cap: f.last ? C.skin : HAIR } : f.kit
      P.guy(kit, { half: true, noBrim: gone || f.last, armF: gone && f.k > 0.3 && t < 6.6 ? 165 : 10, armB: 8, mouth: gone ? 'O' : null }, f.x, 35, { face: f.x < hx ? 1 : -1 })
      if (gone && f.k < 1) { const [x, y] = capAt(f); if (f.last) P.spr(sprite().rect(-2, 0, 4, 1, TOUPEE).dot(-1, -1, TOUPEE), x, y, { rot: f.k * 720 }); else P.rect(x, y, 4, 2, capCol(f)) }
      if (f.last && gone && Math.floor(t * 3) % 2) P.px(f.x, 20, C.spark) // the shine
    }
  } },
  sourdough: { name: 'SOURDOUGH SPRINT', label: 'three sourdough loaves race down the line; the last one leaps the other two into a bread bowl of chowder and sinks', dur: 9, still: 6.9, draw(P, t) {
    P.field(); for (const b of [50, 120, 190]) P.rect(b - 2, 35, 5, 1, C.white)
    const BOWL = 226, SURF = 27, go = seg(t, 0.6, 5.6)
    const xs = [lerp(10, 205, eo(go)), lerp(10, 190, eo(go)), lerp(10, 175, eo(go))], hop = (s) => (t > 5.8 ? Math.abs(Math.sin(t * 6 + s)) * 2 : 0)
    loaf(P, xs[0], 36 - hop(0), t, 0, '#d9a35a'); loaf(P, xs[1], 36 - hop(1), t, 1.3, '#c8914f')
    // the third: stops, crouches, leaps over the other two and into the bowl, then sinks
    if (t < 5.6) loaf(P, xs[2], 36, t, 2.6, '#b07a3e')
    else if (t < 6.4) { const k = seg(t, 5.6, 6.4); loaf(P, lerp(175, BOWL, k), lerp(36, SURF, k) - Math.sin(k * Math.PI) * 18, t, 2.6, '#b07a3e') }
    else { const k = seg(t, 6.4, 7.6); if (k < 1) loaf(P, BOWL, SURF + 1 + k * 8, t * 0.2, 2.6, '#b07a3e') }
    // the bowl after the loaf, so it sinks into it: a half round of crust, chowder at the top
    const B = sprite(); for (let v = 0; v < 9; v++) { const w = Math.floor(Math.sqrt(81 - v * v)); B.rect(-w, v, 2 * w + 1, 1, v === 0 ? '#efe3c2' : '#c8914f') } B.rect(-9, -1, 19, 1, '#8a5a32').dot(-3, 0, '#e2621b').dot(2, 0, '#2c6a33')
    P.spr(B, BOWL, SURF, {})
    P.splash(t, BOWL, SURF - 1, 6.4, 6, 0.8)
    if (t > 7.0) for (let i = 0; i < 2; i++) P.px(BOWL - 2 + i * 4, SURF - 2 - ((t * 4 + i * 1.5) % 3), C.white) // bubbles
  } },
  beer: { name: 'BEER CATCH', label: 'a foul ball drops right into a fan\'s beer; he chugs it to the bottom and holds the ball up', dur: 8.5, still: 6.6, draw(P, t) {
    const ROW = 30, ME = 130
    P.rect(0, 36, GW0, 4, C.seat); for (let u = 0; u < GW0; u += 12) P.rect(u, 34, 10, 2, C.seat2)
    const r = rng(31)
    for (let x = 10; x < GW0 - 4; x += 12) { if (Math.abs(x - ME) < 3) continue; const kit = [KITS.sfFan, KITS.gold, KITS.sfFan, KITS.vest][Math.floor(r() * 4)], cheer = t > 6.2; P.guy(kit, { half: true, armF: cheer ? 170 : t > 0.6 && t < 1.6 && Math.abs(x - ME) < 30 ? 160 : 10, armB: cheer ? 165 : 8, mouth: cheer ? 'O' : null }, x, ROW + 5, { face: x < ME ? 1 : -1 }) }
    // the beer: a cup in his hand; the ball drops in at 1.6 (a splash of foam); he looks, tips it back from 2.6 to 5.6, the level falls; at 6.0 the ball up
    const chug = seg(t, 2.6, 5.6), up = t >= 6.0
    const me = P.guy(KITS.sfFan, { half: !up, armF: up ? 178 : t > 2.6 ? lerp(80, 165, eo(seg(t, 2.6, 3.0))) : 80, armB: up ? 170 : 10, mouth: t > 2.6 && t < 5.6 ? 'O' : up ? 'O' : null, headDy: t > 2.6 && t < 5.6 ? -1 : 0, hold: up ? 'ball' : null }, ME, up ? 36 : ROW + 5)
    if (!up) {
      const hx = me.hand[0], hy = me.hand[1], tilt = t > 2.6 ? lerp(0, 1, seg(t, 2.6, 3.0)) : 0
      const cupX = hx - 1, cupY = hy - 4 - tilt * 3
      P.rect(cupX - 1, cupY - 1, 5, 6, C.out); P.rect(cupX, cupY, 3, 5, '#e9e2c6'); const lvl = 1 + Math.round(3 * (1 - chug)); P.rect(cupX, cupY + 5 - lvl, 3, lvl, C.gold); if (t < 2.6) P.rect(cupX, cupY, 3, 1, C.white)
      if (t > 1.6 && t < 2.2) P.spray(t, cupX + 1, cupY, 1.6, 4, 10, { dir: 90, spread: 90, speed: 12, g: 40, floor: cupY + 6, vanish: true, cols: [C.white, C.gold] })
      if (t >= 1.6) P.px(cupX + 1, cupY + 4 - Math.round(3 * chug), C.ball)
    }
    if (t < 1.6) { const k = t / 1.6; P.ball(lerp(40, ME + 2, k), lerp(-4, ROW - 10, ei(k))) }
  } },
}
const GW0 = 260
