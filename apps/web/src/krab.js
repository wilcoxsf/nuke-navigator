// Krazy Krab: an oversized cartoon crab loose on the Oracle Park grass. The model is a CC0 low-poly crab by "methodical pixel" (OpenGameArt, converted to GLB);
// the behavior is ours. He wanders the outfield muttering, runs to where the ball comes down, and reacts to the result (field it, celebrate, shrug, panic).
// Silent: no speech bubbles.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const HOME = { x: 0.3, z: 1.0 }
const rnd = (a, b) => a + Math.random() * (b - a)

export function initKrab(NN, { wallDistM, url = '/krab.glb' }) {
  const { THREE, scene, camera } = NN
  const holder = new THREE.Group()
  holder.visible = false
  scene.add(holder)
  let model = null, mixer = null, walk = null, idle = null
  const st = { pos: new THREE.Vector3(-26, 0, -62), target: null, mode: 'idle', t: 0, next: 1.5, say: 0, cel: 0 }

  const bub = { style: {} } // the crab does not speak (Andrew, 21 Oct 2026); kept as a stub so the movement code is unchanged

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
  function say() {}
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
  }
  function update(dt) {
    if (!model) return
    mixer.update(dt)
    st.t += dt
    if (st.say > 0) { st.say -= dt; if (st.say <= 0) bub.style.display = 'none' }
    if (st.mode === 'idle') {
      st.next -= dt
      if (st.next <= 0) { st.target = pickWander(); setMode('wander'); }
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
  }
  NN.frames.push(update)
  return {
    react, say, update,
    snap(x, z) { st.pos.set(x, 0, z); place(); setMode('idle'); update(0.001) }, // for screenshots, where frames do not run
  }
}
