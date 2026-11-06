// LANDING PARTY: the real home runs at Oracle Park most like this ball (exit speed, launch angle, landing bearing), each flown through the same engine with its own fitted
// carry and side spin and followed past the wall into the stands, the arcade or McCovey Cove. Numbered markers sit where they came down; the list says who, when, how far.
// Real balls only (the replay set: every Oracle home run since 2023-07-14). Where a ball came down is the engine's landing, anchored to Statcast's distance and bearing, not a seat record.
import * as THREE from 'three'
import { voxPost, voxDots, voxText, voxCells, VOX_FONT, keepReadable } from './cockpits/vox25.js'
import { stag, stagAvoid } from './cockpits/stag25.js'
import { ORANGE } from './cockpits/orange25.js'

// the instance buffers of voxel meshes (their cube and materials are shared, so only those go)
const freeVox = (g) => g.traverse((o) => { if (o.isInstancedMesh) o.dispose() })
const ZONES = [[-46, -30, 'LEFT-FIELD STANDS'], [-30, -12, 'LEFT-CENTER'], [-12, 12, 'CENTER FIELD'], [12, 30, 'RIGHT-CENTER'], [30, 47, 'ARCADE']]

function numberSprite(n, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(8, 8, 48, 48)
  g.strokeStyle = color
  g.lineWidth = 4
  g.strokeRect(8, 8, 48, 48)
  g.fillStyle = color
  g.font = 'bold 34px monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(String(n), 32, 34)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }))
  s.scale.set(7, 7, 1)
  s.renderOrder = 20
  return s
}

// 31 Oct (Andrew: "Landing party is unreadable right now"; his screengrab: eight big numbers and eight grey flights piled up in one corner): in the voxel
// look the numbers are smaller, each yields to the ones ranked above it (it steps up or hides rather than overlap), and no flight is drawn until a row in the
// list is pointed at (focus(n)): then that one ball's flight, and only its number stays lit
// 3 Nov (Andrew: "Landing party I now don't want numbers at all I want mushroom clouds (not mushrooms) or bombs or atoms - give me nuke themed voxel options that are
// pretty discrete points"): LP 10 to 13. Each is built round its own middle, stands on the spot; on (the one in focus) takes the orange, the others bone and grey
const MK = { o: ORANGE.o, w: '#ffb347', b: '#e8e1c9', c: '#c9c2ad', g: '#8a8f99', s: '#5c5e5a', k: '#1b1c1f' }
// the marks not pointed at, in GEIGER (gone): the light parts the full green, the grey parts a darker one so the shape still reads (3 Nov)
const FIN_SF = '#ff7a00', FIN_GREY = '#7d8088' // the fins: SAFETY ORANGE for the Giants (6 Nov: "safety cone across"), or grey (neither turns green with the body)
export const GREEN = { [MK.b]: '#9dff00', [MK.c]: '#9dff00', [MK.w]: '#9dff00', [MK.g]: '#5c9400', [MK.s]: '#3f6600' }
const disk = (y, r, col, out, hollow = 0) => { for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) for (let z = -Math.ceil(r); z <= Math.ceil(r); z++) { const d = Math.hypot(x, z); if (d <= r && d >= hollow) out.push([x, y, z, typeof col === 'function' ? col(d, x, z) : col]) } }
const cross = (c, on) => { const k = on ? MK.o : MK.g; disk(0, 3, k, c, 2.3); for (let i = -4; i <= 4; i++) if (Math.abs(i) > 1) c.push([i, 0, 0, k], [0, 0, i, k]) } // a target on the ground under a falling bomb
export const NUKE_MARKS = {
  // 3 Nov, later (Andrew: "it's unclear in voxel what either of them are. Give me different mushroom cloud options that are more flared at the top, and when I say bomb I
  // mean atom bomb dropping not spy vs spy bomb"): three mushroom clouds with caps far wider than their stems, and three bombs falling nose down onto a crosshair
  // MUSHROOM: TOWER: a tall thin stem, a collar ring halfway up, a wide flat cap with a rolled rim, hot underneath
  10: (on) => { const c = [], hot = on ? MK.o : MK.c, warm = on ? MK.w : MK.b, smoke = on ? MK.w : MK.g, dark = on ? MK.o : MK.s
    disk(0, 2.4, dark, c, 1.2); for (let y = 0; y < 8; y++) disk(y, 0.6, smoke, c)
    disk(4, 1.9, smoke, c, 1.2)
    disk(8, 4.6, (d) => (d < 2 ? hot : warm), c); disk(9, 5.2, (d) => (d < 3 ? warm : d > 4.4 ? smoke : hot), c, 0); disk(10, 4.8, (d) => (d > 3.6 ? smoke : warm), c); disk(11, 3, smoke, c)
    return c },
  // MUSHROOM: ANVIL: a stem that opens up into layers wider and wider, flat on top like a thunderhead
  14: (on) => { const c = [], hot = on ? MK.o : MK.c, warm = on ? MK.w : MK.b, smoke = on ? MK.w : MK.g
    for (let y = 0; y < 5; y++) disk(y, 0.8, smoke, c)
    disk(0, 2.8, smoke, c, 1.8)
    disk(5, 1.8, hot, c); disk(6, 3, (d) => (d < 1.5 ? hot : warm), c); disk(7, 4.2, (d) => (d < 2.5 ? warm : smoke), c); disk(8, 5.4, (d) => (d < 3.6 ? warm : smoke), c); disk(9, 5.6, smoke, c)
    return c },
  // MUSHROOM: RING CAP: a stem, and a cap that has rolled into a fat ring (a torus) with a hot core, the surge ring on the ground
  15: (on) => { const c = [], hot = on ? MK.o : MK.c, warm = on ? MK.w : MK.b, smoke = on ? MK.w : MK.g
    disk(0, 4.2, smoke, c, 3.4); for (let y = 0; y < 7; y++) disk(y, 0.7, smoke, c)
    for (let y = 7; y <= 10; y++) { const t = Math.abs(y - 8.5), R = 3.6, r = 1.6 - t * 0.35; disk(y, R + r, (d) => (Math.abs(d - R) < r * 0.5 ? hot : warm), c, Math.max(0, R - r)) }
    disk(8, 2, hot, c); disk(9, 1.6, warm, c)
    return c },
  // ATOM BOMB: FAT MAN: the round one, nose down, its box tail on top, over a crosshair on the spot
  11: (on) => { const c = [], body = on ? MK.o : MK.c, fin = on ? MK.w : MK.g, Y = 5
    cross(c, on)
    for (let x = -3; x <= 3; x++) for (let y = 0; y <= 6; y++) for (let z = -3; z <= 3; z++) if ((x / 2.6) ** 2 + ((y - 3) / 3.2) ** 2 + (z / 2.6) ** 2 <= 1) c.push([x, Y + y, z, body])
    for (let y = 7; y <= 9; y++) for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) c.push([x, Y + y, z, fin]); for (let x = -2; x <= 2; x++) { c.push([x, Y + 9, -2, fin], [x, Y + 9, 2, fin]); c.push([-2, Y + 9, x, fin], [2, Y + 9, x, fin]) }
    return c },
  // ATOM BOMB: LITTLE BOY: the long one, nose down, a band round it and four tail fins
  // (3 Nov, later: "Let's distinguish giant HRs from not by the little fins at the top - giants orange, others grey") x.giants: a Giants home run's fins are Giants orange
  16: (on, x = {}) => { const c = [], body = on ? MK.o : MK.c, band = on ? MK.w : MK.g, fin = x.giants ? FIN_SF : FIN_GREY, Y = 4
    cross(c, on)
    for (let y = 0; y <= 10; y++) disk(Y + y, y === 0 ? 0.6 : y === 1 ? 1.2 : 1.6, y === 4 ? band : body, c)
    for (let y = 9; y <= 12; y++) for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.push([x, Y + y, z, fin])
    for (const [x, z] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) c.push([x, Y + 12, z, fin])
    return c },
  // ATOM BOMB: FALLING: Little Boy tipped a little as it drops, with speed lines trailing up from it
  17: (on) => { const c = [], body = on ? MK.o : MK.c, fin = on ? MK.w : MK.g, streak = on ? MK.w : MK.s, Y = 4
    cross(c, on)
    for (let y = 0; y <= 9; y++) { const sx = Math.round(y * 0.3); disk(Y + y, y === 0 ? 0.6 : 1.4, body, c); for (const q of c.slice(-40)) if (q[1] === Y + y) q[0] += sx }
    for (let y = 9; y <= 11; y++) for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.push([x + 3, Y + y, z, fin])
    for (const x of [-2, 0, 2]) for (let y = 13; y <= 17; y += 2) c.push([x + 4, Y + y, 0, streak])
    return c },
  // ATOM: a nucleus and three electron rings crossing round it
  12: (on) => { const c = [], ring = on ? MK.o : MK.c, core = on ? MK.w : MK.b, Y = 3.5
    for (let x = -1; x <= 0; x++) for (let y = 3; y <= 4; y++) for (let z = -1; z <= 0; z++) c.push([x + 0.5, y, z + 0.5, core])
    for (const tilt of [0, Math.PI / 3, -Math.PI / 3]) for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, x = Math.cos(a) * 3.4, y = Math.sin(a) * 1.4; c.push([Math.round(x * Math.cos(tilt)), Math.round(Y + y), Math.round(x * Math.sin(tilt)), ring]) }
    return c },
  // FALLOUT: the radiation sign, three blades and a dot on a dark round plate, turned to the camera
  13: (on) => { const c = [], blade = on ? MK.o : MK.c, R = 3.4
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) { const d = Math.hypot(x, y); if (d > 4.2) continue; const a = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, inBlade = d >= 1.3 && d <= R && [90, 210, 330].some((b) => Math.abs(((a - b + 540) % 360) - 180) <= 30); c.push([x, y + 4.5, 0, d < 0.9 || inBlade ? blade : MK.k]) }
    return c },
}
export const NUKE_MARK_LOOKS = [
  { c: 10, name: 'MUSHROOM: TOWER', desc: 'a tall thin stem with a collar halfway up and a wide flat cap with a rolled rim; the one in focus bigger and hot orange' },
  { c: 14, name: 'MUSHROOM: ANVIL', desc: 'a stem that opens into wider and wider layers, flat on top like a thunderhead' },
  { c: 15, name: 'MUSHROOM: RING CAP', desc: 'a stem and a cap rolled into a fat ring with a hot core, the surge ring on the ground' },
  { c: 11, name: 'ATOM BOMB: FAT MAN', desc: 'the round bomb falling nose down onto a crosshair on the spot, its box tail on top' },
  { c: 16, name: 'ATOM BOMB: LITTLE BOY', desc: 'the long bomb falling nose down onto a crosshair, a band round it and four tail fins' },
  { c: 17, name: 'ATOM BOMB: FALLING', desc: 'the long bomb tipped as it drops onto a crosshair, speed lines trailing up from it' },
  { c: 12, name: 'ATOMS', desc: 'a nucleus with three electron rings on each spot; the one in focus bigger and orange' },
  { c: 13, name: 'FALLOUT', desc: 'the radiation sign on each spot, turned to you; the one in focus bigger and orange' },
]
export function landingParty(api, balls, o = {}) {
  const K = o.k ?? 8
  let group = null, items = [], flightG = null, marksG = null, style = o.style ?? 2, lit = 1, flags = [], tops = []
  // (1 Nov, later) the marks are things you can point at: pick(x, y) is the mark nearest a screen point (within 26 px), and the park's tags keep off them
  const scr = (v) => { const c = api.NN.renderer?.domElement, r = c?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight }, q = v.clone().project(api.NN.camera); return q.z > 1 ? null : [((q.x + 1) / 2) * r.width + r.left, ((1 - q.y) / 2) * r.height + r.top] }
  function pick(x, y) { if (!group) return null; let best = null, bd = 26; for (const t of tops) { const s = scr(t.at); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = t.k } } return best }
  stagAvoid(() => (group ? tops.map((t) => [scr(t.at), t.big]).filter(([q]) => q).map(([[x, y], big]) => (big ? [x - 40, y - 46, x + 40, y + 30] : [x - 14, y - 16, x + 14, y + 12])) : [])) // (3 Nov: the loud pin's big number is kept clear as a whole)
  // 31 Oct, later (Andrew: "I still want landing party to show the top 5 other ones as like points on the map if we can, give me options for that too"): the six
  // nearest are marked where they came down, one of five ways (LP in THE LAB); the one in focus is lit with its tag over the marks
  const MARK = '#c9c2ad', MARKD = '#8a8f99'
  function marks() {
    if (!group) return
    if (marksG) { group.remove(marksG); freeVox(marksG); marksG = null } // (1 Nov, later; an audit: each hover rebuilt them and the old instance buffers stayed)
    const g = new THREE.Group(), six = items.slice(0, NUKE_MARKS[style] ? K : 6).filter(Boolean)
    flags = []; tops = []
    for (const [i, it] of six.entries()) {
      const p = it.p
      if (NUKE_MARKS[style]) { // (3 Nov) no numbers: a nuke-themed voxel mark on the spot
        // 3 Nov, later (Andrew: "When I hover over the other ones I want them to become orange and say how far away that landing was 'X feet away' from our model. We
        // don't need a big one"; "I agree cool they're green let's use that for landing party as well. In every instance green = gone"): every mark one size and green
        // (each is a home run), the one pointed at orange with how far it came down from this one over it, in voxels
        const on = i === lit - 1, k = 0.3, cells = NUKE_MARKS[style](on, { giants: it.giants }).map((c) => (on ? c : [c[0], c[1], c[2], GREEN[c[3]] ?? c[3]])), m = voxCells(THREE, cells, k), h = Math.max(...cells.map((c) => c[1])) + 1
        m.position.copy(p).add(new THREE.Vector3(0, 0.2, 0)); g.add(m); if (style === 13) flags.push(m) // (the sign turns to the camera; the round ones read from anywhere)
        tops.push({ k: i + 1, big: false, at: p.clone().setY(p.y + h * k * 0.6) })
        if (on && it.away != null) {
          // (3 Nov, later: "when I hover I want the name, the date, how far it is") the name and the date over how far it came down from this one
          const lab = new THREE.Group(), big = voxText(THREE, `${it.away} FT AWAY`, { px: 0.42, color: ORANGE.o, back: '#141414' }), nm = voxText(THREE, `${it.name ?? ''}  ${it.date ?? ''}`.trim(), { px: 0.24, color: '#e8e1c9', back: '#141414' })
          nm.position.y = 0.42 * 9.5; lab.add(big, nm); lab.position.copy(p).add(new THREE.Vector3(0, h * k + 1.4, 0)).addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(api.NN.camera.quaternion).setY(0).normalize(), 10); /* (to the side of its own flight, which comes down over it, and of a pole beside it) */ keepReadable(api, lab, 160, 0.6, 2, { prio: 6, fixed: true }); g.add(lab)
        }
        continue
      }
      const loud = style === 8 || style === 9, on0 = i === lit - 1
      tops.push({ k: i + 1, big: loud && on0, at: p.clone().setY(p.y + (style === 6 ? (on0 ? 8 : 6) : style === 2 ? (on0 ? 6.6 : 5) : style === 7 ? (on0 ? 3.2 : 2.6) : loud ? (on0 ? 12.5 : style === 9 ? 3.4 : 1.2) : 1)) })
      if (loud) { // (3 Nov, Andrew: "numbered pins is more or less the move - I think that one should be loud and then the rest don't need to be numbered and can just be
        // points on the map - could we try them as little mushroom clouds too?"): LOUD PIN, POINTS (8) and LOUD PIN, MUSHROOMS (9). The one in focus is a tall orange
        // stake with its number big on a dark plate; the other five are a point where they came down (8), or a little voxel mushroom cloud standing on the spot (9)
        if (on0) {
          const top = p.clone().setY(p.y + 8.4); g.add(voxPost(THREE, p, top, { px: 0.55, gap: 0.6, color: ORANGE.o }))
          const n = voxText(THREE, String(i + 1), { px: 1.15, color: ORANGE.o, back: '#141414' }), fl = new THREE.Group(); fl.add(n); fl.position.copy(top).add(new THREE.Vector3(0, 0.3, 0)); g.add(fl); flags.push(fl)
        } else if (style === 8) g.add(voxDots(THREE, [p.clone().setY(p.y + 0.5)], { px: 1.1, color: MARK }), voxDots(THREE, [p.clone().setY(p.y + 0.1)], { px: 1.9, color: MARKD }))
        else {
          const c = [], cube = (x, y, z, k) => c.push([x, y, z, k]), cap = [-1, 0, 1]
          for (let y = 0; y < 3; y++) cube(0, y, 0, '#7c7a73') // the stem
          for (const x of cap) for (const z of cap) cube(x, 3, z, Math.abs(x) + Math.abs(z) === 2 ? '#7c7a73' : '#c9c2ad') // the cap
          for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) cube(x, 4, z, x || z ? '#c9c2ad' : '#e8e1c9')
          cube(0, 5, 0, '#e8e1c9'); for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) cube(x, 3, z, '#7c7a73') // the top, the rim rolling out
          const m = new THREE.Group(), byC = new Map()
          for (const [x, y, z, k] of c) (byC.get(k) ?? byC.set(k, []).get(k)).push(p.clone().add(new THREE.Vector3(x * 0.55, 0.3 + y * 0.55, z * 0.55)))
          for (const [k, pts] of byC) m.add(voxDots(THREE, pts, { px: 0.55, color: k }))
          g.add(m)
        }
        continue
      }
      if (style === 1) g.add(voxDots(THREE, [p, p.clone().setY(p.y + 0.9)], { size: (j) => (j ? 0.7 : 1.5), color: MARK })) // DOTS
      else if (style === 7) { // SHORT PINS (2 Nov, home stretch; GPT red team III, A13: "the numbered landing pins form tall pillars that dominate the park"; Andrew: "do
        // the pins too as an option"): the same numbers on a stub a third as tall, so the mark stays on the spot and the number sits just over it
        const on = i === lit - 1, top = p.clone().setY(p.y + (on ? 2.2 : 1.6)); g.add(voxPost(THREE, p, top, { px: on ? 0.45 : 0.35, gap: 0.7, color: on ? ORANGE.o : MARKD }))
        const n = voxText(THREE, String(i + 1), { px: on ? 0.8 : 0.6, color: on ? ORANGE.o : MARK, back: '#141414' }), fl = new THREE.Group(); fl.add(n); fl.position.copy(top).add(new THREE.Vector3(0, 0.3, 0)); g.add(fl); flags.push(fl)
      }
      else if (style === 2) { // NUMBERED PINS (1 Nov, later, his pick: "I like numbered pins for landing party the most but still think this interface needs help"): bigger,
        // the number on a dark plate turned to the camera, the one in focus orange and taller
        const on = i === lit - 1, top = p.clone().setY(p.y + (on ? 6 : 4.4)); g.add(voxPost(THREE, p, top, { px: on ? 0.45 : 0.35, gap: 0.7, color: on ? ORANGE.o : MARKD }))
        const n = voxText(THREE, String(i + 1), { px: on ? 0.8 : 0.6, color: on ? ORANGE.o : MARK, back: '#141414' }), fl = new THREE.Group(); fl.add(n); fl.position.copy(top).add(new THREE.Vector3(0, 0.3, 0)); g.add(fl); flags.push(fl)
      }
      else if (style === 3) { const top = p.clone().setY(p.y + 4); g.add(voxPost(THREE, p, top, { px: 0.3, gap: 0.9, color: MARKD })); const f = []; for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) f.push(top.clone().add(new THREE.Vector3(0.45 + a * 0.45, -b * 0.45, 0))); g.add(voxDots(THREE, f.filter((_, j) => j % 2 === 0), { px: 0.45, color: ORANGE.o }), voxDots(THREE, f.filter((_, j) => j % 2 === 1), { px: 0.45, color: '#f4f2ea' })) } // FLAGS
      else if (style === 6) { // NUMBERED FLAGS (1 Nov, Andrew: "let's make it numbered flags and have the flag we're currently highlighting orange"): a stake, a flag
        // off its top with the number on it; bone flags with dark numbers, the one in focus orange; each turns to face the camera
        const on = i === lit - 1, cs = on ? 0.6 : 0.45, top = p.clone().setY(p.y + (on ? 9 : 7)); g.add(voxPost(THREE, p, top, { px: on ? 0.55 : 0.4, gap: 0.7, color: on ? ORANGE.o : MARKD }))
        const cells = [], rows = VOX_FONT[String(i + 1)]
        for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) cells.push([x, y, -1, on ? ORANGE.o : MARK])
        rows.forEach((r, j) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x + 2, 7 - j, 0, '#141414']) }))
        const fl = new THREE.Group(), f = voxCells(THREE, cells, cs); f.position.set(4.6 * cs, -9 * cs, 0); fl.add(f); fl.position.copy(top); g.add(fl); flags.push(fl)
      } else if (style === 4) g.add(voxDots(THREE, it.pts.filter((_, j) => j % 3 === 0), { px: 0.22, color: MARKD }), voxDots(THREE, [p], { px: 1.2, color: MARK })) // TRAILS
      else g.add(voxDots(THREE, [p], { px: 1.1, color: MARK })) // HALO (the ring below)
    }
    if (style === 5 && six.length) {
      const c = six.reduce((a, it) => a.add(it.p), new THREE.Vector3()).multiplyScalar(1 / six.length), R0 = Math.max(4, ...six.map((it) => Math.hypot(it.p.x - c.x, it.p.z - c.z))) + 3, ring = []
      for (let a = 0; a < 64; a++) ring.push(new THREE.Vector3(c.x + Math.cos((a / 64) * Math.PI * 2) * R0, Math.max(...six.map((it) => it.p.y)) + 0.4, c.z + Math.sin((a / 64) * Math.PI * 2) * R0))
      g.add(voxDots(THREE, ring, { px: 0.4, color: MARKD }))
    }
    for (const it of items) if (it?.n.children[0]) it.n.children[0].visible = ![2, 6, 7, 8, 9].includes(style) && !NUKE_MARKS[style] // the flags and pins stand in for the lit stake (its tag stays)
    marksG = g; group.add(g)
  }
  const oracle = balls.filter((b) => b.park === 'SF' && b.hr)
  function clear() {
    if (!group) return
    api.NN.scene.remove(group)
    group.traverse((x) => { if (x.userData.vox) return; x.geometry?.dispose(); x.material?.map?.dispose(); x.material?.dispose?.() })
    group = null; items = []; flightG = null; marksG = null; tops = []; flags = []
  }
  // x: { ev, la, bear, self } (self: the replay ball itself, left out of its own party)
  const lbOf = (b) => { if (b._lb == null) b._lb = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, {}).landB; return b._lb }
  // where each came down in the seats (kept; worked out in idle moments with the bearings)
  const lpOf = (b) => { if (b._lp === undefined) { const res = api.fly({ ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, xwind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }, { floor: -8 }); b._lp = res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL' ? api.findLanding(res.path).point.clone() : null } return b._lp }
  // (31 Oct, GPT red team: the first open flew every Oracle home run at once) the bearings are worked out in idle moments after the page loads, a few dozen at a time
  function warm() { let i = 0; const step = (dl) => { while (i < oracle.length && (dl?.timeRemaining?.() ?? 1) > 2) { lbOf(oracle[i]); lpOf(oracle[i++]) } if (i < oracle.length) (window.requestIdleCallback ?? ((f) => setTimeout(f, 50)))(step) }; (window.requestIdleCallback ?? ((f) => setTimeout(f, 50)))(step) }
  function nearest(x) {
    // compare landing bearing with landing bearing: a ball's stored dir is its fitted launch direction, which the spin hook bends by a few degrees
    // 3 Nov (Andrew: "just the top X closest ones and then the RHS ranks them"): with this one's landing given (x.at), the home runs that came down closest to it
    if (x.at) return oracle.filter((b) => b !== x.self && lpOf(b)).map((b) => ({ b, d: b._lp.distanceTo(x.at) })).sort((p, q) => p.d - q.d).slice(0, K)
    for (const b of oracle) lbOf(b)
    return oracle.filter((b) => b !== x.self).map((b) => ({ b, d: ((b.ev - x.ev) / 3) ** 2 + ((b.la - x.la) / 3) ** 2 + ((b._lb - x.bear) / 6) ** 2 })).sort((p, q) => p.d - q.d).slice(0, K)
  }
  function show(x, color = ORANGE.o) {
    clear()
    const list = nearest(x), out = []
    group = new THREE.Group()
    const dot = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true })
    list.forEach(({ b, d }, i) => {
      const st = { ...api.state, ev: b.ev, la: b.la, dir: b.dir, hand: b.s === 'R' ? 1 : -1, temp: b.temp, wind: 0, carry: b.carry, dws: b.dws ?? 0, tab: false }
      const res = api.fly(st, { floor: -8 })
      const hit = res.verdict.kind === 'GONE' || res.verdict.kind === 'FOUL' ? api.findLanding(res.path) : { point: api.toWorld(res.path[res.path.length - 1].p), kind: 'SHORT' }
      const p = hit.point, bear = (Math.atan2(p.x, -p.z) * 180) / Math.PI
      const where = hit.kind === 'SPLASH' ? 'MCCOVEY COVE' : hit.kind === 'STREET' ? 'OUT OF THE PARK' : hit.kind === 'SHORT' ? 'SHORT IN THE ENGINE' : ZONES.find((z) => bear >= z[0] && bear < z[1])?.[2] ?? (bear < 0 ? 'LEFT-FIELD STANDS' : 'ARCADE')
      const pts = res.path.filter((_, k) => k % 5 === 0).map((q) => api.toWorld(q.p))
      if (o.vox) {
        // Study 25 (28 Oct, night): a voxel number on a voxel stake where it came down, the flight as a few faint cubes
        // 31 Oct (GPT red team, his yes: "only one illuminated landing marker at a time"): every one a dim stake; the one in focus (#1 at first) lit, with its tag on the screen
        const top = new THREE.Vector3(p.x, p.y + 4, p.z), post = voxPost(THREE, p, top, { px: 0.35, gap: 1.2, color: o.dim ?? '#8a8f99' }), lit = voxPost(THREE, p, top.clone().setY(p.y + 6), { px: 0.5, gap: 1, color })
        const n = stag(api, [(NUKE_MARKS[style] ? String(o.name?.(b) ?? '') : `#${i + 1} ${String(o.name?.(b) ?? '')}`).toUpperCase().trim() || 'A HOME RUN', `${b.ft} FT`], color, /* (3 Nov: no numbers with the nuke marks) */ { prio: 2, side: 1, tie: color }); n.position.copy(top).setY(p.y + 6.5)
        lit.add(n); group.add(post, lit)
        post.visible = false // (the marks stand for the rest; 31 Oct, later)
        items[i] = { n: lit, post, p: p.clone(), pts: res.path.filter((_, k) => k % 4 === 2).map((q) => api.toWorld(q.p)), away: x.at ? Math.round(p.distanceTo(x.at) / 0.3048) : null, name: String(o.name?.(b) ?? '').toUpperCase(), date: b.d, giants: b.tb === 'Bot' ? b.ht === 'SF' : b.at === 'SF' }
      } else {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), dot)
        m.position.copy(p)
        m.renderOrder = 19
        const s = numberSprite(i + 1, color)
        s.position.set(p.x, p.y + 6, p.z)
        group.add(m, s)
        // the flight, faint, so the eye can follow each one in
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, depthTest: false })))
      }
      out.push({ n: i + 1, b, d, where, kind: hit.kind, at: p.clone(), away: x.at ? Math.round(p.distanceTo(x.at) / 0.3048) : null })
    })
    api.NN.scene.add(group)
    marks()
    focus(NUKE_MARKS[style] ? 0 : 1) // (the nuke marks start all green; pointing lights one)
    return out
  }
  // point at one (1-based; null for all): its flight in cubes, the others' numbers dimmed away
  function focus(k) {
    if (!group) return
    if (flightG) { group.remove(flightG); freeVox(flightG); flightG = null }
    k = k ?? (NUKE_MARKS[style] ? 0 : 1) // (nothing pointed at: #1, or with the nuke marks none)
    items.forEach((it, i) => { if (it) it.n.visible = i === k - 1 && !NUKE_MARKS[style] })
    if ((style === 6 || style === 2 || NUKE_MARKS[style]) && k !== lit) { lit = k; marks() } else lit = k
    const it = items[k - 1]
    if (it) { flightG = voxDots(THREE, it.pts, { px: 0.45, color: o.flight ?? ORANGE.o }); group.add(flightG) }
  }
  // the flags turn to the camera (about their stakes)
  api.NN.frames?.push(() => { if (!flags.length || !group) return; const cp = api.NN.camera.position; for (const f of flags) f.rotation.y = Math.atan2(cp.x - f.position.x, cp.z - f.position.z) })
  return { show, clear, focus, warm, pick, lit: () => (group ? lit : null), setStyle(n) { if (n === style) return; style = n; marks() }, count: () => oracle.length }
}
