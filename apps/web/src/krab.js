// Krazy Krab: an oversized cartoon crab loose on the Oracle Park grass. The model is a CC0 low-poly crab by "methodical pixel" (OpenGameArt, converted to GLB);
// the behavior is ours. He wanders the outfield muttering, runs to where the ball comes down, and reacts to the result (field it, celebrate, shrug, panic).
// Speech lines are placeholders until the text review is answered; they live in LINES below.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const LINES = {
  idle: ['I SUPPOSE ONE MUST SCUTTLE.', 'OH MY. THE GRASS.', 'SIDEWAYS IS A VALID DIRECTION.', 'I WAS HERE FIRST.', 'IS THAT A BALL? PROBABLY.', 'tsk.', 'BEEP.', 'I DO ENJOY A BRISK WALK!', 'NOBODY ASKED THE CRAB.'],
  gone: ['OH MY! IT HAS LEFT!', 'GOODBYE, BALL. I BARELY KNEW YOU.', 'I DID NOT SEE THAT. I SAW THAT.'],
  nuke: ['ABANDON GRASS!', 'THAT WAS A LOT OF BALL.', 'OH MY. OH MY. OH MY.'],
  splash: ['THE FISH WILL HAVE QUESTIONS.', 'OH MY! THE BAY!'],
  scraper: ['BARELY. BARELY. OH MY.', 'WELL. THAT COUNTS.'],
  wall: ['THAT WALL IS NOT RESPONDING.', 'I TOLD THEM ABOUT THAT WALL.'],
  close: ['OH NO. OH NO. OH NO.', 'SO CLOSE. I FEEL IT IN MY CLAWS.'],
  play: ['I WILL FIELD THIS. PROBABLY.', 'MINE! (NOT MINE)', 'IN MY CLAWS, NOW. OH NO.'],
  foul: ['NOT MY PROBLEM. NOT MY FOUL.', 'I WAS ALSO ON THE FIELD, FOR THE RECORD.'],
}
const HOME = { x: 0.3, z: 1.0 }
const rnd = (a, b) => a + Math.random() * (b - a)

export function initKrab(NN, { wallDistM, url = '/krab.glb' }) {
  const { THREE, scene, camera } = NN
  const holder = new THREE.Group()
  holder.visible = false
  scene.add(holder)
  let model = null, mixer = null, walk = null, idle = null
  const st = { pos: new THREE.Vector3(-26, 0, -62), target: null, mode: 'idle', t: 0, next: 1.5, say: 0, cel: 0 }

  const bub = document.createElement('div')
  bub.style.cssText = 'position:fixed;z-index:6;pointer-events:none;display:none;max-width:210px;padding:7px 11px;background:#fff;color:#1d2a6d;border:3px solid #1d2a6d;border-radius:16px;' +
    "font:700 14px/1.15 'Segoe Print','Comic Sans MS','Chalkboard SE',cursive;text-transform:uppercase;letter-spacing:.02em;box-shadow:3px 3px 0 #ffd23f;transform:translate(-50%,-100%)"
  const tail = document.createElement('i')
  tail.style.cssText = 'position:absolute;left:50%;bottom:-13px;width:14px;height:14px;background:#fff;border-right:3px solid #1d2a6d;border-bottom:3px solid #1d2a6d;transform:translateX(-50%) rotate(45deg)'
  bub.appendChild(tail)
  document.body.appendChild(bub)

  new GLTFLoader().load(url, (gltf) => {
    model = gltf.scene
    model.scale.setScalar(5) // about 18 m across: oversized on purpose so he reads from the broadcast camera
    holder.add(model)
    mixer = new THREE.AnimationMixer(model)
    const clip = (n) => gltf.animations.find((a) => a.name === n)
    if (clip('walk')) { walk = mixer.clipAction(clip('walk')); walk.play(); walk.paused = true }
    if (clip('idle')) { idle = mixer.clipAction(clip('idle')); idle.play() }
    holder.visible = true
    place()
    window.__krabReady = true
  }, undefined, () => { window.__krabReady = false })

  function place() { holder.position.copy(st.pos) }
  function say(text, secs = 3.2) { bub.firstChild?.nodeType === 3 && bub.removeChild(bub.firstChild); bub.insertBefore(document.createTextNode(text), tail); st.say = secs; bub.style.display = 'block' }
  function pickWander() {
    const b = rnd(-34, 34), r = rnd(46, 88)
    return new THREE.Vector3(HOME.x + r * Math.sin((b * Math.PI) / 180), 0, HOME.z - r * Math.cos((b * Math.PI) / 180))
  }
  function setMode(m) {
    st.mode = m
    if (walk) walk.paused = !(m === 'wander' || m === 'run' || m === 'celebrate')
    if (walk) walk.timeScale = m === 'run' ? 2.2 : m === 'celebrate' ? 3 : 1
    if (idle) idle.paused = m !== 'idle'
  }
  function react(tone, at) {
    // run to where the ball came down (homers: to the base of the wall under it)
    const dx = at.x - HOME.x, dz = at.z - HOME.z
    const rad = Math.hypot(dx, dz), b = (Math.atan2(dx, -dz) * 180) / Math.PI
    const wallR = wallDistM ? wallDistM(b) : 105
    const R = tone === 'play' ? Math.min(rad, wallR - 3) : Math.min(rad, wallR - 7)
    const bb = Math.max(-42, Math.min(42, b))
    st.target = new THREE.Vector3(HOME.x + R * Math.sin((bb * Math.PI) / 180), 0, HOME.z - R * Math.cos((bb * Math.PI) / 180))
    st.react = tone
    setMode('run')
    say((LINES[tone] ?? LINES.idle)[Math.floor(Math.random() * (LINES[tone] ?? LINES.idle).length)], 4)
  }
  function update(dt) {
    if (!model) return
    mixer.update(dt)
    st.t += dt
    if (st.say > 0) { st.say -= dt; if (st.say <= 0) bub.style.display = 'none' }
    if (st.mode === 'idle') {
      st.next -= dt
      if (st.next <= 0) { st.target = pickWander(); setMode('wander'); if (Math.random() < 0.45) say(LINES.idle[Math.floor(Math.random() * LINES.idle.length)]) }
    } else if (st.mode === 'wander' || st.mode === 'run') {
      const sp = st.mode === 'run' ? 24 : 7
      const d = st.target.clone().sub(st.pos)
      const dist = d.length()
      if (dist < 1.2) { if (st.mode === 'run') { st.cel = 2.2; setMode('celebrate') } else { st.next = rnd(2.5, 6); setMode('idle') } }
      else {
        d.normalize()
        st.pos.addScaledVector(d, Math.min(sp * dt, dist))
        holder.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2 // he walks sideways: the body's long axis lines up with the heading
      }
    } else if (st.mode === 'celebrate') {
      st.cel -= dt
      holder.position.y = Math.abs(Math.sin(st.t * 9)) * (st.react === 'play' ? 1.2 : 3.2)
      if (st.cel <= 0) { holder.position.y = 0; st.next = rnd(3, 6); setMode('idle') }
    }
    if (st.mode !== 'celebrate') holder.position.set(st.pos.x, 0, st.pos.z)
    else holder.position.set(st.pos.x, holder.position.y, st.pos.z)
    if (bub.style.display === 'block') {
      const v = new THREE.Vector3(st.pos.x, 9, st.pos.z).project(camera)
      bub.style.left = `${((v.x + 1) / 2) * innerWidth}px`
      bub.style.top = `${((1 - v.y) / 2) * innerHeight}px`
    }
  }
  NN.frames.push(update)
  return {
    react, say, update,
    snap(x, z, text) { st.pos.set(x, 0, z); place(); setMode('idle'); if (text) say(text, 99); update(0.001) }, // for screenshots, where frames do not run
  }
}
