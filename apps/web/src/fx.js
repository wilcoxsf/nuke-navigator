// Landing effects for the Dojo: a comic-book blast built from layers (ink-outlined star burst, shock ring, tumbling debris, smoke puffs, hot flash light,
// a lettered sound word, screen shake) with a different recipe per outcome: nuke, home run, wall scraper, off the wall, splash hit, in play, foul.
// Everything is flat-coloured MeshBasicMaterial so it sits in the ink-outline look; the only real light is the short flash on the park.
export function initFx(NN) {
  const { THREE, scene, camera } = NN
  const parts = []
  let shake = { amp: 0, t: 0, dur: 0.001 }
  const light = new THREE.PointLight(0xffffff, 0, 90, 1.6)
  scene.add(light)
  let flash = { t: 99, peak: 0 }

  const mat = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o })
  const add = (obj, update) => { scene.add(obj); parts.push({ obj, update }) }
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3)
  const pop = (x) => { const c = 1.70158 * 1.525, t = Math.min(Math.max(x, 0), 1) - 1; return 1 + (c + 1) * t ** 3 + c * t ** 2 } // overshoot

  const starGeo = (spikes, outer, inner) => {
    const sh = new THREE.Shape()
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 ? inner : outer, a = (i / (spikes * 2)) * Math.PI * 2
      sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r)
    }
    return new THREE.ShapeGeometry(sh)
  }
  const wordSprite = (text, fill, ink) => {
    const c = document.createElement('canvas')
    c.width = 768; c.height = 256
    const g = c.getContext('2d')
    g.font = "italic 900 150px 'Arial Black', Impact, Arial"
    const fit = Math.min(1, 700 / g.measureText(text).width) // long words shrink to fit the canvas
    g.font = `italic 900 ${Math.round(150 * fit)}px 'Arial Black', Impact, Arial`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.lineJoin = 'round'
    g.strokeStyle = ink; g.lineWidth = 34; g.strokeText(text, 384, 128)
    g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeText(text, 384, 128)
    g.fillStyle = fill; g.fillText(text, 384, 128)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  }

  // recipe per outcome
  const RECIPE = {
    nuke: { word: 'KA-BOOOM!!', star: 1.9, ring: 2.4, chunks: 64, power: 34, smoke: 12, shake: 1.6, flash: 1.0, shape: 'tet', cols: ['main', 'accent', 'white', 'ink'], double: true },
    gone: { word: 'KA-BLAM!', star: 1.2, ring: 1.4, chunks: 44, power: 26, smoke: 7, shake: 0.7, flash: 0.7, shape: 'quad', cols: ['main', 'accent', 'white', 'accent'] },
    scraper: { word: 'SCRAPE!', star: 0.8, ring: 0.9, chunks: 26, power: 18, smoke: 4, shake: 0.35, flash: 0.4, shape: 'tet', cols: ['accent', 'white', 'main', 'ink'] },
    wall: { word: 'THUD!', star: 0.95, ring: 1.0, chunks: 34, power: 17, smoke: 8, shake: 0.9, flash: 0.35, shape: 'box', cols: ['brick', 'dirt', 'white', 'ink'] },
    close: { word: 'ARGH!', star: 0.8, ring: 0.8, chunks: 22, power: 15, smoke: 5, shake: 0.5, flash: 0.25, shape: 'box', cols: ['brick', 'dirt', 'white', 'ink'] },
    splash: { word: 'SPLOOSH!', star: 1.0, ring: 2.0, chunks: 56, power: 20, smoke: 0, shake: 0.25, flash: 0.3, shape: 'drop', cols: ['cyan', 'white', 'cyan', 'accent'], water: true },
    play: { word: 'POOF', star: 0.45, ring: 0.7, chunks: 18, power: 9, smoke: 5, shake: 0.08, flash: 0, shape: 'tet', cols: ['dirt', 'grass', 'dirt', 'white'], ground: true },
    foul: { word: 'FOUL!', star: 0.55, ring: 0.6, chunks: 14, power: 10, smoke: 4, shake: 0.1, flash: 0, shape: 'quad', cols: ['white', 'grey', 'white', 'ink'], ground: false },
  }

  function explode(tone, at, pal, scale = 1) {
    const R = RECIPE[tone] ?? RECIPE.gone
    const C = { main: pal.main, accent: pal.accent, white: '#ffffff', ink: pal.ink, brick: '#9a5a48', dirt: '#b7794a', grass: '#3e8f3a', cyan: '#37f0ff', grey: '#c4c4c4' }
    const at0 = at.clone()

    // 1. star bursts, ink outlined, popping with overshoot then shrinking away
    const stars = R.double ? [[1.0, 'main', 0], [1.45, 'accent', -0.15]] : [[1.0, 'main', 0], [1.3, 'accent', -0.15]]
    for (const [k, col, dz] of stars) {
      const g = new THREE.Group()
      const sp = Math.round(12 + 8 * R.star)
      const body = new THREE.Mesh(starGeo(sp, 9 * R.star * scale * k, 4.2 * R.star * scale * k), mat(C[col], { depthTest: false, transparent: true }))
      const ink = new THREE.Mesh(starGeo(sp, 9 * R.star * scale * k * 1.14, 4.2 * R.star * scale * k * 1.2), mat(C.ink, { depthTest: false, transparent: true }))
      ink.position.z = -0.05; body.renderOrder = 10; ink.renderOrder = 9
      g.add(ink, body)
      g.position.copy(at0)
      let t = 0
      add(g, (dt) => {
        t += dt
        const s = t < 0.22 ? pop(t / 0.22) : 1 - ease((t - 0.45) / 0.55)
        g.scale.setScalar(Math.max(s, 0.001))
        g.quaternion.copy(camera.quaternion)
        g.rotateZ(Math.sin(t * 9) * 0.05 + (col === 'accent' ? 0.3 : 0))
        g.translateZ(dz)
        return t < 1.05
      })
    }

    // 2. shock rings on the ground plane (water gets three, staggered)
    const rings = R.water ? 3 : R.double ? 2 : 1
    for (let r = 0; r < rings; r++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 72).rotateX(-Math.PI / 2), mat(r % 2 ? C.accent : '#ffffff', { transparent: true, depthWrite: false, side: THREE.DoubleSide }))
      m.position.copy(at0)
      m.position.y += 0.4
      let t = -r * 0.14
      add(m, (dt) => {
        t += dt
        const k = ease(t / 0.8)
        m.scale.setScalar(Math.max(0.01, 1 + k * 14 * R.ring * scale))
        m.material.opacity = t < 0 ? 0 : (1 - k) * 0.85
        return t < 0.85
      })
    }

    // 3. debris: ballistic chunks with spin
    const shapes = {
      tet: () => new THREE.TetrahedronGeometry(0.9), box: () => new THREE.BoxGeometry(1.1, 0.7, 0.8), quad: () => new THREE.PlaneGeometry(1.4, 0.9),
      drop: () => new THREE.SphereGeometry(0.55, 8, 6),
    }
    const geo = shapes[R.shape]()
    const pool = R.cols.map((c) => mat(C[c], { side: THREE.DoubleSide }))
    const outMat = mat(C.ink, { side: THREE.BackSide })
    const rnd = (a, b) => a + Math.random() * (b - a)
    for (let i = 0; i < R.chunks; i++) {
      const m = new THREE.Mesh(geo, pool[i % pool.length])
      if (R.shape !== 'quad') { const o = new THREE.Mesh(geo, outMat); o.scale.setScalar(1.25); m.add(o) }
      m.position.copy(at0)
      const sc = rnd(0.5, 1.5) * scale
      m.scale.setScalar(sc)
      const a = Math.random() * Math.PI * 2, up = rnd(0.45, 1.0), sp = R.power * rnd(0.45, 1.0)
      const v = new THREE.Vector3(Math.cos(a) * (1 - up * 0.5) * sp * 0.6, up * sp, Math.sin(a) * (1 - up * 0.5) * sp * 0.6)
      const w = new THREE.Vector3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8))
      let t = 0
      add(m, (dt) => {
        t += dt
        v.y -= 24 * dt
        if (R.shape === 'quad') { v.x *= 1 - 1.6 * dt; v.z *= 1 - 1.6 * dt; v.y = Math.max(v.y, -5) } // confetti flutters
        m.position.addScaledVector(v, dt)
        if (R.ground && m.position.y < at0.y && v.y < 0) { m.position.y = at0.y; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6 }
        m.rotation.x += w.x * dt; m.rotation.y += w.y * dt; m.rotation.z += w.z * dt
        const life = R.water ? 1.4 : 1.7
        m.scale.setScalar(sc * Math.max(0, 1 - Math.max(0, t - life * 0.55) / (life * 0.45)))
        return t < life
      })
    }

    // 4. smoke puffs
    for (let i = 0; i < R.smoke; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat(i % 3 === 0 ? '#ffe9b0' : '#f2f2f2', { transparent: true, depthWrite: false }))
      m.position.copy(at0).add(new THREE.Vector3(rnd(-3, 3), rnd(0, 3), rnd(-3, 3)).multiplyScalar(scale))
      const drift = new THREE.Vector3(rnd(-2, 2), rnd(2, 5), rnd(-2, 2))
      const big = rnd(3, 6) * scale * (R.double ? 1.4 : 1)
      let t = -rnd(0, 0.12)
      add(m, (dt) => {
        t += dt
        const k = ease(t / 1.3)
        m.scale.setScalar(Math.max(0.01, 0.4 + big * k))
        m.position.addScaledVector(drift, dt)
        m.material.opacity = t < 0 ? 0 : 0.9 * (1 - k)
        return t < 1.35
      })
    }

    // 5. water column for splash hits
    if (R.water) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.4, 1, 14, 1, true), mat(C.cyan, { transparent: true, side: THREE.DoubleSide }))
      col.position.copy(at0)
      let t = 0
      add(col, (dt) => {
        t += dt
        const h = Math.sin(Math.min(t / 0.9, 1) * Math.PI) * 24 * scale
        col.scale.set(1 + t * 1.5, Math.max(h, 0.01), 1 + t * 1.5)
        col.position.y = at0.y + h / 2
        col.material.opacity = 0.85 * (1 - ease((t - 0.4) / 0.5))
        return t < 0.95
      })
    }

    // 6. the lettered sound word
    const word = wordSprite(R.word, C.accent, C.ink)
    word.position.copy(at0).add(new THREE.Vector3(0, 11 * R.star * scale + 4, 0))
    word.renderOrder = 20
    let wt = 0
    add(word, (dt) => {
      wt += dt
      const s = (wt < 0.3 ? pop(wt / 0.3) : 1) * (1 - ease((wt - 1.1) / 0.4))
      const w = 30 * (0.6 + 0.5 * R.star) * scale
      word.scale.set(w * Math.max(s, 0.001), (w / 3) * Math.max(s, 0.001), 1)
      word.material.rotation = Math.sin(wt * 12) * 0.05 * (1 - Math.min(wt, 1))
      return wt < 1.5
    })

    // 7. flash on the park and the shake
    flash = { t: 0, peak: R.flash * 5200 * scale, color: C.accent }
    shake = { amp: R.shake * scale, t: 0, dur: 0.6 + 0.4 * R.shake }
  }

  function step(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!parts[i].update(dt)) {
        const { obj } = parts[i]
        scene.remove(obj)
        obj.traverse((o) => { o.material?.map?.dispose?.(); if (o.geometry && !o.userData.keep) o.geometry.dispose?.() })
        parts.splice(i, 1)
      }
    }
    flash.t += dt
    light.intensity = flash.t < 0.5 ? flash.peak * Math.exp(-flash.t * 9) : 0
    if (flash.color) light.color.set(flash.color)
    shake.t += dt
    const k = Math.max(0, 1 - shake.t / shake.dur)
    NN.setShake((Math.random() - 0.5) * 0.012 * shake.amp * k, (Math.random() - 0.5) * 0.009 * shake.amp * k)
  }
  function place(p) { light.position.copy(p).add(new THREE.Vector3(0, 8, 0)) }
  function clear() { while (parts.length) { const { obj } = parts.pop(); scene.remove(obj) } light.intensity = 0; NN.setShake(0, 0) }
  NN.frames.push(step)
  return {
    explode(tone, at, pal, scale) { place(at); explode(tone, at, pal, scale) },
    step(sec) { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60) },
    clear, count: () => parts.length,
  }
}
