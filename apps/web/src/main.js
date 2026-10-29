import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { buildMarks, smoothWallFn } from './wiremarks.js'
import { loadLibrary, mulberry32, pick } from './comparisons.js'
import { pickScenarios } from './scenarios.js'

// ---------- looks (A = riso print, B = A + Bell captions, C = Druillet sunset) ----------
const LOOKS = {
  1: { bg: '#ffffff', ink: '#1d2a6d', ribbon: '#ff5a3c', burst: '#ffd23f' }, // white
  2: { bg: '#ffe2a6', ink: '#0d2b4a', ribbon: '#ffffff', burst: '#ffd23f', ocean: { deep: '#081633', light: '#0a1b3d', crest: '#173366' } }, // ocean to infinity: very dark, very quiet, small ripples, warm sky
  3: { bg: '#ff5a3c', ink: '#2a0f2e', ribbon: '#ffd23f', burst: '#ffffff' }, // Spider-Verse hot
  4: { bg: '#1d2a6d', ink: '#0b1236', ribbon: '#ffd23f', burst: '#ff5a3c' }, // ink-navy night
}
const CAPS = new URLSearchParams(location.search).get('caps') === '1'
let look = LOOKS[Number(new URLSearchParams(location.search).get('look')) || 2]

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 6000)
// Canonical frame: home plate at origin, +Y up, -Z toward center field, +X toward right field.
camera.position.set(-70, 108, 200)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 4, -85)
controls.update()

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb59f7a, 1.1)
scene.add(hemiLight)
const sun = new THREE.DirectionalLight(0xffffff, 2.4)
sun.position.set(-80, 120, 40)
scene.add(sun)

// ---------- stadium ----------
const gradient = (() => {
  const data = new Uint8Array([70, 140, 215, 255])
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
  t.minFilter = t.magFilter = THREE.NearestFilter
  t.needsUpdate = true
  return t
})()
const mats = []
// Bold flat spot colours: treads (up-facing), risers and walls (side-facing), undersides.
const PAL = { up: '#ffd23f', side: '#ff8a73', down: '#3b4fa8', field: '#c6ea72', infield: '#ff9d3f', ads: '#1d2a6d' }
const stadium = []
function recolor() {
  const c = new THREE.Color()
  for (const { mesh, role, ny } of stadium) {
    const attr = mesh.geometry.attributes.color
    for (let i = 0; i < ny.length; i++) {
      const key = role === 'stands' ? (ny[i] > 0.55 ? 'up' : ny[i] < -0.3 ? 'down' : 'side') : role
      c.set(PAL[key])
      attr.setXYZ(i, c.r, c.g, c.b)
    }
    attr.needsUpdate = true
  }
}
// Real colours: the model's own textures (turf, dirt, warning track, wall padding, baked structure lighting) with the structure tinted by surface type.
// On by default in Dinger Dojo (?real=0 for the flat spot-colour look elsewhere ?real=1 turns it on). ?vibe=1..5 is how far past "real" the colours go;
// the Dojo has buttons for it. A vibe sets the structure tints, the saturation and hue turn on every surface, sky, sea, lights, ink and ribbons.
const QS0 = new URLSearchParams(location.search)
const REAL = QS0.get('real') ? QS0.get('real') !== '0' : QS0.get('mode') === 'dojo'
// ?park=TEAM (any of the other 29 parks): its wire-only model and home-run line (apps/web/public/parks/<TEAM>/, private; science/park_register.py, park_crest.py, tools/wire_parks.mjs),
// registered into this frame (home plate at (0.3, 1.0), centre field -z). No param or park=SF is Oracle exactly as before.
const PARKX = /^[A-Z]{2,3}$/.test((QS0.get('park') || '').toUpperCase()) && (QS0.get('park') || '').toUpperCase() !== 'SF' ? QS0.get('park').toUpperCase() : null
const BASE_VIBE = { name: 'BASE', sat: 1.35, hue: 0, hatch: 0, contrast: 1, lineW: 1, lineK: 1, outline: 0, bg: '#ffe2a6', ink: '#0d2b4a',
  ocean: { deep: '#081633', light: '#0a1b3d', crest: '#173366' }, tint: { seat: '#1f6b57', deck: '#8e9db0', brick: '#7f8794', under: '#2f3a52' },
  hemi: [0xffffff, 0xb59f7a, 1.1], sun: [0xffffff, 2.4], ribbon: { GONE: '#ff5a3c', WALL: '#ffd23f', PLAY: '#7fe3d4', FOUL: '#b0b0b0' }, burst: '#ffd23f' }
const POP_TINT = { seat: '#17835f', deck: '#9aaac0', brick: '#8793a3', under: '#2f3a52' }
const POP = { ...BASE_VIBE, sat: 1.65, contrast: 1.1, lineW: 1.6, lineK: 1.25, outline: 1, tint: POP_TINT, hemi: [0xffffff, 0xc0a880, 1.15], sun: [0xfff1d6, 2.7],
  ocean: { deep: '#081633', light: '#0a1b3d', crest: '#1f4488' } }
const K2001 = { ...BASE_VIBE, name: '2001', bg: '#05070a', ink: '#03060a', ocean: null, sat: 1.15, ribbon: { GONE: '#f4eed8', WALL: '#f4eed8', PLAY: '#f4eed8', FOUL: '#a9bcc3' }, burst: '#f4eed8' }
const VIBES = { // same palette throughout: what changes is outline weight and colour, saturation, contrast, hatching and the cartoon outlines on the flight
  1: BASE_VIBE,
  2: { ...BASE_VIBE, name: 'INKED', lineW: 1.6, lineK: 1.25, outline: 1 },
  3: { ...POP, name: 'POP' },
  4: { ...POP, name: 'NEON EDGE', ink: '#3ff2ff', lineW: 1.4, lineK: 1.4 },
  6: K2001,
  5: { ...POP, name: 'COMIC', sat: 1.8, contrast: 1.15, lineW: 2.0, lineK: 1.3, hatch: 0.3, ink: '#0a1a3a', outline: 2 },
}
const vibeU = { sat: { value: 1.35 }, hue: { value: 0 }, contrast: { value: 1 } } // shared by every textured material so a vibe change shows at once
let vibeN = 1
const structure = []
function tintStructure(o) {
  const n = o.geometry.attributes.normal
  const p = o.geometry.attributes.position
  const ny = new Float32Array(n.count), y = new Float32Array(n.count)
  for (let i = 0; i < n.count; i++) { ny[i] = n.getY(i); y[i] = p.getY(i) }
  o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n.count * 3), 3))
  structure.push({ mesh: o, ny, y })
}
function paintStructure() {
  const t = VIBES[vibeN].tint, c = new THREE.Color()
  for (const { mesh, ny, y } of structure) {
    const attr = mesh.geometry.attributes.color
    for (let i = 0; i < ny.length; i++) {
      c.set(t[ny[i] > 0.55 ? (y[i] < 22 ? 'seat' : 'deck') : ny[i] < -0.3 ? 'under' : 'brick'])
      attr.setXYZ(i, c.r, c.g, c.b)
    }
    attr.needsUpdate = true
  }
}
const realColorChunk = (sh) => { // saturation and hue turn on the final diffuse colour
  sh.uniforms.vSat = vibeU.sat
  sh.uniforms.vHue = vibeU.hue
  sh.uniforms.vContrast = vibeU.contrast
  sh.fragmentShader = 'uniform float vSat; uniform float vHue; uniform float vContrast;\n' + sh.fragmentShader.replace('#include <color_fragment>',
    `#include <color_fragment>
     { vec3 k = normalize(vec3(1.0)); vec3 c = diffuseColor.rgb;
       c = c * cos(vHue) + cross(k, c) * sin(vHue) + k * dot(k, c) * (1.0 - cos(vHue));
       float L = dot(c, vec3(0.299, 0.587, 0.114));
       c = clamp(mix(vec3(L), c, vSat), 0.0, 1.0);
       diffuseColor.rgb = clamp((c - 0.4) * vContrast + 0.4, 0.0, 1.0); }`)
}
new GLTFLoader().load(PARKX ? `/parks/${PARKX}/wire.glb` : REAL ? '/stadium_sf_color.glb' : '/stadium_sf_slim.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (PARKX) { if (o.isMesh) mats.push(o.material); return } // a park's wire-only model has positions only: nothing to paint
    if (o.isMesh && REAL) {
      const name = o.material.name || ''
      if (name.includes('Greyscale')) { tintStructure(o); o.material.vertexColors = true }
      o.material.color.setScalar(1)
      o.material.onBeforeCompile = realColorChunk
      mats.push(o.material)
    } else if (o.isMesh) {
      const name = o.material.name || ''
      const role = name.includes('Infield') ? 'infield' : name.includes('Field') ? 'field' : name.includes('Ads') ? 'ads' : 'stands'
      const n = o.geometry.attributes.normal
      const ny = new Float32Array(n.count)
      for (let i = 0; i < n.count; i++) ny[i] = n.getY(i)
      o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n.count * 3), 3))
      o.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient })
      mats.push(o.material)
      stadium.push({ mesh: o, role, ny })
    }
  })
  recolor()
  if (REAL) applyVibe(vibeN)
  scene.add(gltf.scene)
  window.__nn.stadium = gltf.scene // for the ray-casting in Seat Seance
  window.dispatchEvent(new Event('nn-stadium'))
  const box = new THREE.Box3().setFromObject(gltf.scene)
  document.title = `loaded ${mats.length} materials, box ${box.min.toArray().map((v) => v.toFixed(0))} to ${box.max.toArray().map((v) => v.toFixed(0))}`
}, undefined, (err) => {
  document.title = 'GLB ERROR ' + (err && err.message)
  const b = document.createElement('div') // say so on screen instead of showing an empty park
  b.setAttribute('role', 'alert')
  b.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:99;background:#000;color:#e9e7dc;border:1px solid #e9e7dc;padding:6px 12px;font:14px Consolas,monospace'
  b.textContent = 'THE STADIUM MODEL DID NOT LOAD. THE PARK VIEW IS EMPTY; EVERYTHING ELSE STILL WORKS.'
  document.body.appendChild(b)
})

// ---------- sample flight: drag-only RK4, 105 mph at 28 deg toward right field ----------
function flight(evMph, laDeg, azDeg) {
  const v = evMph * 0.44704
  const la = (laDeg * Math.PI) / 180
  const az = (azDeg * Math.PI) / 180
  let p = new THREE.Vector3(0, 1, 0)
  let vel = new THREE.Vector3(Math.sin(az) * Math.cos(la), Math.sin(la), -Math.cos(az) * Math.cos(la)).multiplyScalar(v)
  const pts = [p.clone()]
  const k = 0.5 * 1.2 * 0.35 * 0.0043 / 0.145
  const acc = (vv) => new THREE.Vector3(0, -9.81, 0).addScaledVector(vv, -k * vv.length())
  const dt = 0.02
  for (let i = 0; i < 600 && p.y > 0; i++) {
    const a1 = acc(vel)
    const a2 = acc(vel.clone().addScaledVector(a1, dt / 2))
    vel.addScaledVector(a2, dt)
    p = p.clone().addScaledVector(vel, dt)
    if (i % 3 === 0) pts.push(p.clone())
  }
  return pts
}
const pts = flight(105, 28, 38)
const curve = new THREE.CatmullRomCurve3(pts)
const ribbonMat = new THREE.MeshBasicMaterial({ color: look.ribbon })
const ribbon = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.9, 8, false), ribbonMat)
ribbon.name = 'sampleRibbon'
scene.add(ribbon)
const landing = pts[pts.length - 1]
const burstShape = new THREE.Shape()
for (let i = 0; i < 24; i++) {
  const r = i % 2 ? 4 : 11
  const a = (i / 24) * Math.PI * 2
  burstShape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r)
}
const burstMat = new THREE.MeshBasicMaterial({ color: look.burst, side: THREE.DoubleSide })
const burst = new THREE.Mesh(new THREE.ShapeGeometry(burstShape), burstMat)
burst.position.copy(landing).add(new THREE.Vector3(0, 6, 0))
burst.name = 'sampleBurst'
scene.add(burst)

// ---------- ocean to infinity: flat two-tone waves, white crest lines, fades into the sky ----------
const oceanMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 }, deep: { value: new THREE.Color() }, light: { value: new THREE.Color() },
    crest: { value: new THREE.Color() }, sky: { value: new THREE.Color() },
  },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: /* glsl */ `
    uniform float time; uniform vec3 deep, light, crest, sky; varying vec3 vW;
    void main(){
      vec2 p = vW.xz;
      float d = distance(vW, cameraPosition);
      float h = sin(p.x * 0.115 + time * 0.8) + sin(p.y * 0.150 - time * 0.6)
              + sin((p.x + p.y) * 0.074 + time * 0.45) + 0.5 * sin((p.x - p.y) * 0.250 - time * 1.1);
      vec3 col = mix(deep, light, step(0.35, h));
      float w = max(fwidth(h), 1e-4);
      float edge1 = 1. - smoothstep(0.8, 1.8, abs(h - 0.35) / w);
      float edge2 = 1. - smoothstep(0.8, 1.8, abs(h - 1.9) / w);
      float calm = smoothstep(260., 1500., d);            // ripples flatten with distance
      col = mix(col, crest, max(edge1 * 0.55, edge2) * (1. - calm));
      col = mix(col, deep, calm);
      float horizon = smoothstep(2300., 3300., d);        // thin clean glow where sea meets sky
      gl_FragColor = vec4(mix(col, sky, horizon), 1.);
    }`,
})
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), oceanMat)
ocean.rotation.x = -Math.PI / 2
ocean.position.y = -5
scene.add(ocean)

// ---------- ink + paper post-process ----------
const targets = {}
function makeTargets(w, h) {
  targets.color?.dispose(); targets.normal?.dispose()
  targets.color = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) })
  targets.normal = new THREE.WebGLRenderTarget(w, h)
}
const normalMat = new THREE.MeshNormalMaterial()
const post = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null },
    res: { value: new THREE.Vector2() }, near: { value: camera.near }, far: { value: camera.far },
    paper: { value: new THREE.Color() }, ink: { value: new THREE.Color() }, dotScale: { value: 1 }, hatchAmt: { value: 0 }, lineW: { value: 1 }, lineK: { value: 1 }, shake: { value: new THREE.Vector2() }, duoA: { value: new THREE.Color('#000000') }, duoB: { value: new THREE.Color('#ffffff') }, duoAmt: { value: 0 }, pixSize: { value: 0 }, mode: { value: 0 }, levels: { value: 3 },
  },
  vertexShader: 'varying vec2 vUvRaw; void main(){ vUvRaw = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform float near, far;
    uniform vec3 paper, ink; uniform float dotScale, hatchAmt, lineW, lineK;
    varying vec2 vUvRaw; uniform vec2 shake; uniform vec3 duoA, duoB; uniform float duoAmt;
    uniform float pixSize, mode, levels;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
    float bayer4(vec2 a){ return bayer2(.5 * a) * .25 + bayer2(a); }
    float lin(float d){ float z = d * 2. - 1.; return (2. * near * far) / (far + near - z * (far - near)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main(){
      vec2 vUv = vUvRaw + shake; // screen shake lives here, so the world (and the ray-casting on it) never moves
      vec2 px = 1. / res;
      if (pixSize > 0.5) { vUv = (floor(vUv * res / pixSize) + 0.5) * pixSize / res; px = pixSize / res; } // pixel blocks: every sample snaps to the block centre
      vec3 n0 = texture2D(tNormal, vUv).rgb;
      float e = 0.;
      vec2 o[4]; o[0]=vec2(px.x,0.)*lineW; o[1]=vec2(-px.x,0.)*lineW; o[2]=vec2(0.,px.y)*lineW; o[3]=vec2(0.,-px.y)*lineW;
      float d0 = lin(texture2D(tDepth, vUv).r);
      float de = 0.;
      for (int i = 0; i < 4; i++) {
        e += length(texture2D(tNormal, vUv + o[i]).rgb - n0);
        de += abs(lin(texture2D(tDepth, vUv + o[i]).r) - d0);
      }
      float line = smoothstep(1.0 / lineK, 1.7 / lineK, e) + smoothstep(0.10 * d0 / lineK, 0.24 * d0 / lineK, de);
      line = clamp(line, 0., 1.) * (1. - smoothstep(600., 1500., d0));
      vec3 c = texture2D(tColor, vUv).rgb;
      float L = dot(c, vec3(0.299, 0.587, 0.114));
      // clean diagonal ink hatching in the shadows (no noise, no dots)
      vec2 g = vUv * res;
      float stripe = fract((g.x + g.y) / dotScale);
      float shade = 1. - smoothstep(0.30, 0.80, L);
      float w = 0.10 + 0.30 * shade;
      float hl = (1. - smoothstep(w, w + 0.07, stripe)) * smoothstep(0.55, 0.80, shade) * smoothstep(0.05, 0.14, L);
      vec3 col = mix(c, ink, hl * hatchAmt);
      float bg = step(0.9999, texture2D(tDepth, vUv).r);
      col = mix(col, paper, bg);
      col = mix(col, ink, line);
      float Lm = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, mix(duoA, duoB, smoothstep(0.0, 0.55, Lm)), duoAmt); // duotone: the whole scene in two colours
      if (mode > 0.5) {
        float t = bayer4(floor(vUvRaw * res / max(pixSize, 1.)));
        float Lc = dot(col, vec3(0.299, 0.587, 0.114));
        if (mode < 1.5) { // dither: a few flat tones from black to bone, ordered (stable) dots in between
          float lv = max(levels - 1., 1.);
          float Lb = bg > 0.5 ? 0. : pow(clamp(Lc, 0., 1.), 0.55); // the void stays pure black
          Lb = bg > 0.5 ? 0. : Lb; // lift the dark scene so the tones have something to work with
          col = mix(duoA, duoB, clamp(floor(Lb * lv + t) / lv, 0., 1.));
          col = mix(col, duoB, step(0.5, line)); // keep the outlines crisp on top of the dots
        } else { // skeleton: lines of light on a void, a sparse stipple for the ground
          float s = step(t, Lc * 0.42) * (1. - bg);
          col = mix(duoA, duoB * 0.55, s);
          col = mix(col, duoB, step(0.5, line));
          col = mix(col, duoB, step(0.9, Lc) * (1. - bg)); // very bright things (the flight line) stay solid
        }
      }
      gl_FragColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
    }`,
  depthTest: false, depthWrite: false,
})
const quadScene = new THREE.Scene()
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post))
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

let bgOverride = null // a skin-K look's own background survives vibe changes
function applyLook() {
  scene.background = new THREE.Color(look.bg)
  post.uniforms.paper.value.set(look.bg)
  post.uniforms.ink.value.set(look.ink)
  ribbonMat.color.set(look.ribbon)
  burstMat.color.set(look.burst)
  document.getElementById('strip').style.display = CAPS ? 'none' : 'block' // ?caps=1 hides the strip for clean stills
  document.body.style.background = look.bg
  ocean.visible = !!look.ocean
  if (look.ocean) {
    oceanMat.uniforms.deep.value.set(look.ocean.deep)
    oceanMat.uniforms.light.value.set(look.ocean.light)
    oceanMat.uniforms.crest.value.set(look.ocean.crest)
    oceanMat.uniforms.sky.value.set(look.bg)
  }
}
applyLook()
addEventListener('keydown', (e) => { if (!REAL && LOOKS[e.key]) { look = LOOKS[e.key]; applyLook() } })
function applyVibe(n) {
  vibeN = n
  const v = VIBES[n]
  vibeU.sat.value = v.sat
  vibeU.hue.value = v.hue
  look = { ...look, bg: bgOverride ?? v.bg, ink: v.ink, ribbon: v.ribbon.GONE, burst: v.burst, ocean: v.ocean }
  applyLook()
  post.uniforms.hatchAmt.value = v.hatch
  post.uniforms.lineW.value = v.lineW
  post.uniforms.lineK.value = v.lineK
  vibeU.contrast.value = v.contrast
  hemiLight.color.set(v.hemi[0]); hemiLight.groundColor.set(v.hemi[1]); hemiLight.intensity = v.hemi[2]
  sun.color.set(v.sun[0]); sun.intensity = v.sun[1]
  paintStructure()
  window.dispatchEvent(new Event('nn-vibe'))
}
vibeN = VIBES[Number(QS0.get('vibe'))] ? Number(QS0.get('vibe')) : (QS0.get('mode') === 'dojo' && (QS0.get('ui') || 'K').toUpperCase() === 'K' ? 6 : 1)

let pixCss = 0 // pixel block size in CSS pixels (0 = off); set by the skeletal studies
let winInsets = null // skin X leaves an open window between the panels; the park is centred and scaled to it
function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  if (winInsets) {
    const ww = w - winInsets.l - winInsets.r, wh = h - winInsets.t - winInsets.b
    camera.setViewOffset(w, h, -((winInsets.l + (w - winInsets.r)) / 2 - w / 2), -((winInsets.t + (h - winInsets.b)) / 2 - h / 2), w, h)
    camera.zoom = winInsets.z ?? Math.min(1.7, Math.max(0.5, ww / ({ 1: 780, 2: 1500, 3: 1200 }[winInsets.k] ?? 950))) // cockpits pass their own zoom
  } else { camera.clearViewOffset(); camera.zoom = 1 }
  camera.updateProjectionMatrix()
  const pr = renderer.getPixelRatio()
  makeTargets(Math.floor(w * pr), Math.floor(h * pr))
  post.uniforms.res.value.set(w * pr, h * pr)
  post.uniforms.dotScale.value = 6 * pr // hatch pitch in device pixels
  post.uniforms.pixSize.value = pixCss * pr
  fatRes()
}
addEventListener('resize', resize)
resize()

let renderPaused = false, fpsCap = 0, lastDraw = 0 // studies that hide the park pause the 3D pass; stepped looks can cap the frame rate
renderer.setAnimationLoop((t) => {
  const dt = Math.min(0.05, (t - (window.__lastT ?? t)) / 1000)
  window.__lastT = t
  if (window.__fixedTime === undefined) for (const f of window.__nn.frames) f(dt, t / 1000)
  if (renderPaused || (fpsCap && t - lastDraw < 1000 / fpsCap - 3)) return
  lastDraw = t
  oceanMat.uniforms.time.value = (window.__fixedTime ?? t / 1000)
  controls.update()
  renderer.setRenderTarget(targets.color)
  scene.overrideMaterial = null
  renderer.render(scene, camera)
  renderer.setRenderTarget(targets.normal)
  scene.overrideMaterial = normalMat
  const hid = window.__nn.hideForNormal.map((o) => [o, o.visible]); hid.forEach(([o]) => { o.visible = false })
  renderer.render(scene, camera)
  hid.forEach(([o, v]) => { o.visible = v })
  scene.overrideMaterial = null
  renderer.setRenderTarget(null)
  post.uniforms.tColor.value = targets.color.texture
  post.uniforms.tNormal.value = targets.normal.texture
  post.uniforms.tDepth.value = targets.color.depthTexture
  renderer.render(quadScene, quadCam)
})
window.__ready = () => mats.length > 0 && window.__cmpReady === true

// ---------- stat strip: a speed and a distance comparison drawn at random from the library ----------
const STAT = { mph: 105, la: 28, ft: 392 }
function renderSpec() {
  document.getElementById('spec').innerHTML =
    `<span><b>EXIT SPEED</b>${STAT.mph} mph</span><span><b>LAUNCH</b>${STAT.la}&deg;</span>` +
    `<span><b>DISTANCE</b>${STAT.ft} ft</span><span><b>BADGE</b>PREDICTED</span><span><b>PARK</b>Oracle 2025</span>`
}
renderSpec()
const qs = new URLSearchParams(location.search)
const rand = qs.get('seed') ? mulberry32(Number(qs.get('seed'))) : Math.random
const recent = []
const recentBodies = []
let library = null
function roll() {
  if (!library) return
  const rows = [
    ['speed', STAT.mph * 0.44704, 'cmp-speed', 'src-speed', `${STAT.mph} mph`],
    ['length', STAT.ft * 0.3048, 'cmp-dist', 'src-dist', `${STAT.ft} ft`],
  ]
  for (const [kind, amount, textId, , label] of rows) {
    const p = pick(library, kind, amount, rand, recent)
    if (!p) continue
    recent.push(p.rec.cat, p.rec.name)
    while (recent.length > 16) recent.shift()
    document.getElementById(textId).textContent = `${label} = ${p.phrase}`
  }
  const sc = pickScenarios(STAT.mph, STAT.la, rand, 2, recentBodies)
  recentBodies.length = 0
  recentBodies.push(...sc.map((s) => s.body.id))
  document.getElementById('cmp-swing').textContent = sc.map((s) => s.text).join('. ')
}
loadLibrary().then((l) => { library = l; roll(); window.__cmpReady = true })
// Wireframe park: the stadium's hard edges (angle between faces over `angle` degrees) as thin lines. hidden = true draws the faces black so only the near lines show;
// hidden = false leaves it see-through. Edges are built the first time it is switched on (a second or two), then toggling is free.
let wireGroup = null
var funData = PARKX ? { groups: [] } : undefined // the baked full-detail fan attractions (undefined: not asked for yet, null: loading, object: loaded); Oracle only
var crestData // the home-run line: the crest of the outfield wall from foul pole to foul pole (science/wall_crest.py), same loading states as funData
var crestRibbonMat = null // the painted top of the wall (same accent colour as the crest line)
const parkWall = (b) => { // ?park=TEAM: [distance ft, height ft] of the wall at bearing b, read off that park's crest (the same shape as dojo.js wallAt)
  const c = crestData
  if (!c?.bearing?.length) return null
  const B = c.bearing, st = B[1] - B[0], x = Math.min(B[B.length - 1], Math.max(B[0], b)), i = Math.min(B.length - 2, Math.floor((x - B[0]) / st)), f = (x - B[i]) / st
  return [(c.radius[i] * (1 - f) + c.radius[i + 1] * f) / 0.3048, (c.height[i] * (1 - f) + c.height[i + 1] * f - (c.lift ?? 0)) / 0.3048]
}
var wireFat = [] // (var: resize() runs once before this line) // fat-line materials (pixel width, so they need the render size): { mat, kind: 'main' | 'accent' }
function fatRes() { const pr = renderer.getPixelRatio(); for (const f of wireFat ?? []) f.mat.resolution.set(Math.floor(innerWidth * pr), Math.floor(innerHeight * pr)) }
const wireMat = new THREE.LineBasicMaterial({ color: '#e9e7dc', transparent: true, opacity: 0.8 })
const wireHeavy = new THREE.LineBasicMaterial({ color: '#e9e7dc', transparent: true, opacity: 1 })
const wireGhost = new THREE.LineBasicMaterial({ color: '#e9e7dc', transparent: true, opacity: 0.4, vertexColors: true }) // bowl lines in the ghost and terrace presets: dim, and fading with distance from the plate
const wireFace = new THREE.MeshBasicMaterial({ color: '#030403', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
const wireOrig = new Map()
function setWire(on, o = {}) {
  if (PARKX && o.wall) o = { ...o, wall: parkWall } // the markings follow this park's wall (from its crest), not Oracle's measured profile
  const st = window.__nn.stadium
  if (!st) { window.addEventListener('nn-stadium', () => setWire(on, o), { once: true }); return }
  if (o.rebuild && wireGroup) { // a different edge angle or contour step
    scene.remove(wireGroup)
    wireGroup.traverse((x) => x.geometry?.dispose())
    window.__nn.hideForNormal.splice(window.__nn.hideForNormal.indexOf(wireGroup), 1)
    wireGroup = null
    wireFat = []
    crestRibbonMat = null
  }
  if (on && !wireGroup && o.wall && crestData == null && !(o.fun && funData === undefined)) { // the crest of the wall (the home-run line) must be known before the lines are built: undefined starts the load, null (loading) makes any other call wait for it
    if (crestData === undefined) {
      crestData = null
      fetch(PARKX ? `/parks/${PARKX}/crest.json` : '/oracle_crest.json').then((r) => (r.ok ? r.json() : null)).then((d) => { crestData = d ?? { bearing: [] }; if (PARKX) document.title = `${PARKX} (${d?.venue ?? 'no crest'}): ${document.title}`; setWire(on, o) }).catch(() => { crestData = { bearing: [] }; setWire(on, o) })
    }
    return
  }
  if (on && !wireGroup && o.fun && funData === undefined) { // the colour wireframe of the fan attractions must be known before the white copies are classified
    funData = null
    fetch('/fun_oracle.json').then((r) => (r.ok ? r.json() : null)).then((d) => { funData = d ?? { groups: [] }; setWire(on, o) }).catch(() => { funData = { groups: [] }; setWire(on, o) })
    return
  }
  if (on && !wireGroup) {
    wireGroup = new THREE.Group()
    wireGroup.name = 'wire'
    st.updateMatrixWorld(true)
    const step = o.step ?? 3 // metres between height contours (0 = none)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    const cont = []
    const heavy = [], faint = [], faintFade = [], hv = new THREE.Vector3(), hx = (o.home ?? [0.3, 1.0])[0], hz = (o.home ?? [0.3, 1.0])[1]
    // Stands presets (stands: full | clean | ghost | quiet | terrace). SEAT DETAIL is defined by chain length (science/seat_chains.md): hard edges of the STRUCTURE material (SF_Greyscale) are chained end to end where they meet (5 mm) and
    // continue within 20 degrees; an edge whose chain is shorter than C metres is seat detail (individual seats, rails and fittings). That flags about 80% of the near-field, lower-bowl and upper-deck seat edges at C = 2 m and none of the field, infield
    // or padding material. Long chains are the row lines and structure. Two protected boxes are never thinned: the scoreboard (the pixel mosaic behind centre field) and the Coke corner (slides, glove, bottle), which get coloured halo outlines instead.
    const stands = o.stands ?? 'full'
    const Upos = [], Ucls = [], Hkeys = new Set()
    const qk = (x, y, z) => Math.round(x * 200) + ',' + Math.round(y * 200) + ',' + Math.round(z * 200)
    // the Oracle model has its own mound ring, rubber, plate, batter's boxes and plate circle, a metre from ours (29 Oct, Andrew: "there are 2 mounds"; fitted from its
    // vertices: plate point (0, 0.04), mound ring centre (0.01, -17.92), radius 3.1 m). Ours sit on the fitted home the flights use, so with the markings on, the model's
    // ground-level edges in those two discs are left out
    const MARKSKIP = o.marks && !PARKX ? [[0.01, -17.92, 3.9], [0, -0.2, 4.6]] : []
    // and the ORACLE PARK sign, its clock and the arch they stand on (29 Oct, later, Andrew: "if we have to cut off that part of the model and make this voxel I'm fine
    // with it"): rebuilt in voxels by park25.js, so the model's own edges there are left out: from just over the board (35.4 m) to 49 m up, 144 to 153 m out, within
    // 6.5 degrees of dead center
    const inSign = (p) => { const dx = p.x - hx, dz = p.z - hz, d = Math.hypot(dx, dz); return !PARKX && p.y > 35.4 && p.y < 49 && d > 144 && d < 153 && Math.abs(Math.atan2(dx, -dz)) < 0.1134 }
    const markSkip = (p, q) => (inSign(p) && inSign(q)) || (MARKSKIP.length && p.y < 0.5 && q.y < 0.5 && MARKSKIP.some(([x, z, r]) => Math.hypot(p.x - x, p.z - z) < r && Math.hypot(q.x - x, q.z - z) < r))
    st.traverse((m) => {
      if (!m.isMesh) return
      if (o.split) { // collect every hard edge; they are classified after the traverse, once the chains are known
        const mname = ((wireOrig.get(m) ?? m.material)?.name) || ''
        const cls = (PARKX ? /Greyscale|_Atlas_\d/.test(mname) : mname.startsWith('SF_Greyscale')) ? 1 : 0 // structure (seats, decks); Miami's model names it MIA_Atlas_2..4
        const eg = new THREE.EdgesGeometry(m.geometry, o.angle ?? 75), pa = eg.attributes.position
        const va = new THREE.Vector3(), vb = new THREE.Vector3()
        for (let i = 0; i + 1 < pa.count; i += 2) {
          va.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld)
          vb.fromBufferAttribute(pa, i + 1).applyMatrix4(m.matrixWorld)
          if (markSkip(va, vb)) continue
          const k1 = qk(va.x, va.y, va.z), k2 = qk(vb.x, vb.y, vb.z)
          Hkeys.add(k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1)
          if (!o.faintAngle) { Upos.push(va.x, va.y, va.z, vb.x, vb.y, vb.z); Ucls.push(cls) }
        }
        eg.dispose()
        if (o.faintAngle) { // a lower crease angle for the whole universe, so the smooth seating bowl gets drawn too
          const ef = new THREE.EdgesGeometry(m.geometry, o.faintAngle), pf = ef.attributes.position
          for (let i = 0; i + 1 < pf.count; i += 2) {
            va.fromBufferAttribute(pf, i).applyMatrix4(m.matrixWorld)
            vb.fromBufferAttribute(pf, i + 1).applyMatrix4(m.matrixWorld)
            if (markSkip(va, vb)) continue
            Upos.push(va.x, va.y, va.z, vb.x, vb.y, vb.z); Ucls.push(cls)
          }
          ef.dispose()
        }
      }
      if (o.angle !== 0 && !o.split) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, o.angle ?? 55), wireMat)
        e.matrixAutoUpdate = false
        e.matrix.copy(m.matrixWorld)
        e.renderOrder = 5
        e.frustumCulled = false
        wireGroup.add(e)
      }
      if (!step) return
      const pos = m.geometry.attributes.position, idx = m.geometry.index
      const nTri = (idx ? idx.count : pos.count) / 3
      const vert = (v, i) => v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld)
      for (let t = 0; t < nTri; t++) {
        vert(a, t * 3); vert(b, t * 3 + 1); vert(c, t * 3 + 2)
        const lo = Math.min(a.y, b.y, c.y), hi = Math.max(a.y, b.y, c.y)
        if (hi - lo < 1e-4) continue
        if (o.contourOuter && Math.hypot((a.x + b.x + c.x) / 3 - hx, (a.z + b.z + c.z) / 3 - hz) < o.contourOuter) continue // contours only on the outer bowl, not on the field
        for (let k = Math.max(1, Math.ceil(lo / step)); k * step < hi; k++) {
          const y = k * step, pts = []
          for (const [p, q] of [[a, b], [b, c], [c, a]]) {
            if ((p.y < y) !== (q.y < y)) { const f = (y - p.y) / (q.y - p.y); pts.push(p.x + f * (q.x - p.x), y, p.z + f * (q.z - p.z)) }
          }
          if (pts.length === 6 && !(inSign({ x: pts[0], y: pts[1], z: pts[2] }) && inSign({ x: pts[3], y: pts[4], z: pts[5] }))) cont.push(...pts)
        }
      }
    })
    let dropped = 0, seatFlagged = 0, protectedN = 0, thinned = 0, funSkipped = 0, nfLen = 0
    const ghost = [], ghostFade = []
    let wallArrOut = [], wallLenOut = 0, wallSectorOut = new Array(18).fill(0)
    if (o.split) {
      const nU = Ucls.length
      // chains: union-find over edges that share an endpoint (5 mm) and continue within 20 degrees, within one material class
      const par = new Int32Array(nU).map((_, i) => i)
      const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x] } return x }
      const len = new Float32Array(nU), dir = new Float32Array(nU * 3)
      const ends = new Map()
      for (let i = 0; i < nU; i++) {
        const j = i * 6, dx = Upos[j + 3] - Upos[j], dy = Upos[j + 4] - Upos[j + 1], dz = Upos[j + 5] - Upos[j + 2], L = Math.hypot(dx, dy, dz) || 1e-9
        len[i] = L; dir[i * 3] = dx / L; dir[i * 3 + 1] = dy / L; dir[i * 3 + 2] = dz / L
        for (const e of [0, 1]) { const k = qk(Upos[j + e * 3], Upos[j + e * 3 + 1], Upos[j + e * 3 + 2]); const l = ends.get(k); if (l) l.push(i * 2 + e); else ends.set(k, [i * 2 + e]) }
      }
      for (const l of ends.values()) {
        if (l.length !== 2) continue
        const i = l[0] >> 1, ei = l[0] & 1, k = l[1] >> 1, ek = l[1] & 1
        if (i === k || Ucls[i] !== Ucls[k]) continue
        const si = ei === 1 ? 1 : -1, sk = ek === 0 ? 1 : -1 // direction of travel through the shared point
        const dot = (dir[i * 3] * si) * (dir[k * 3] * sk) + (dir[i * 3 + 1] * si) * (dir[k * 3 + 1] * sk) + (dir[i * 3 + 2] * si) * (dir[k * 3 + 2] * sk)
        if (dot > 0.9397) par[find(i)] = find(k)
      }
      const root = new Int32Array(nU), clen = new Float32Array(nU)
      for (let i = 0; i < nU; i++) { root[i] = find(i); clen[root[i]] += len[i] }
      // protected zones: 1 = scoreboard (left exactly as it is), 2 = Coke corner (its white edges are replaced by the colour wireframe from the full-detail asset)
      const protectedAt = (x, y, z) => {
        if (PARKX) return 0 // the scoreboard and Coke-corner boxes are Oracle's
        const dx = x - hx, dz = z - hz, r = Math.hypot(dx, dz), bd = Math.abs((Math.atan2(dx, -dz) * 180) / Math.PI)
        if (r > 145 && r < 160 && y > 15 && y < 60 && bd < 25) return 1
        return x > -75 && x < -40 && z > -150 && z < -118 && y > 7 && y < 23 ? 2 : 0
      }
      const CELL = 0.5, ck = (x, y, z) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL) + ',' + Math.floor(z / CELL)
      const funCells = new Set()
      if (funData) for (const g of funData.groups) for (let t = 0; t + 5 < g.seg.length; t += 6) {
        for (const f of [0, 0.5, 1]) funCells.add(ck((g.seg[t] + f * (g.seg[t + 3] - g.seg[t])) / 100, (g.seg[t + 1] + f * (g.seg[t + 4] - g.seg[t + 1])) / 100, (g.seg[t + 2] + f * (g.seg[t + 5] - g.seg[t + 2])) / 100))
      }
      const nearFun = (x, y, z) => {
        const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL)
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if (funCells.has((cx + a) + ',' + (cy + b) + ',' + (cz + c))) return true
        return false
      }
      const C = stands === 'quiet' ? 5 : 2
      const wallFn = o.wall ? smoothWallFn(o.wall) : null
      const wallArr = [], wallSector = new Array(18).fill(0)
      let wallLen = 0
      const dmin = { clean: 0.8, ghost: 1.0, quiet: 1.5, terrace: 2.5 }[stands] ?? 0 // minimum spacing between kept row lines: clean about 70% of the rows nearest the field stay, ghost about 40%, quiet about 20%, terrace about 8%
      // pass 1: per-edge flags
      const prot = new Uint8Array(nU), touch = new Uint8Array(nU)
      for (let i = 0; i < nU; i++) {
        const j = i * 6, mx = (Upos[j] + Upos[j + 3]) / 2, my = (Upos[j + 1] + Upos[j + 4]) / 2, mz = (Upos[j + 2] + Upos[j + 5]) / 2
        if (Ucls[i] === 1) { prot[i] = protectedAt(mx, my, mz); touch[i] = prot[i] === 1 ? 0 : 1 } // only the scoreboard is left untouched; the Coke box's bleacher seats are thinned like all seats
        if (prot[i]) protectedN++
      }
      // pass 2 (ghost, quiet, terrace): greedy line spacing. Chains of touched structure that are not seat detail are visited longest first; a chain is dropped when most of its points lie within dmin of a chain already kept,
      // so stacked row lines thin to a regular spacing everywhere (the rows nearest the field included) while the longest structural lines always survive.
      const keepRoot = new Uint8Array(nU)
      if (dmin) {
        const byRoot = new Map()
        for (let i = 0; i < nU; i++) if (touch[i] && clen[root[i]] >= C) { const l = byRoot.get(root[i]); if (l) l.push(i); else byRoot.set(root[i], [i]) }
        const order = [...byRoot.entries()].sort((p, q) => clen[q[0]] - clen[p[0]])
        const hash = new Map(), cs = dmin
        const hk = (x, y, z) => Math.floor(x / cs) + ',' + Math.floor(y / cs) + ',' + Math.floor(z / cs)
        for (const [rt, idxs] of order) {
          const pts = []
          for (const i of idxs) { const j = i * 6, n = Math.max(1, Math.ceil(len[i] / 1.0)); for (let t = 0; t < n; t++) { const f = (t + 0.5) / n; pts.push(Upos[j] + f * (Upos[j + 3] - Upos[j]), Upos[j + 1] + f * (Upos[j + 4] - Upos[j + 1]), Upos[j + 2] + f * (Upos[j + 5] - Upos[j + 2])) } }
          let near = 0
          const total = pts.length / 3
          for (let t = 0; t < pts.length; t += 3) {
            const cx = Math.floor(pts[t] / cs), cy = Math.floor(pts[t + 1] / cs), cz = Math.floor(pts[t + 2] / cs)
            let hit = false
            for (let a = -1; a <= 1 && !hit; a++) for (let b2 = -1; b2 <= 1 && !hit; b2++) for (let c = -1; c <= 1 && !hit; c++) {
              const l = hash.get((cx + a) + ',' + (cy + b2) + ',' + (cz + c))
              if (l) for (let u = 0; u < l.length; u += 3) if ((l[u] - pts[t]) ** 2 + (l[u + 1] - pts[t + 1]) ** 2 + (l[u + 2] - pts[t + 2]) ** 2 < cs * cs) { hit = true; break }
            }
            if (hit) near++
          }
          if (near / total < 0.6) {
            keepRoot[rt] = 1
            for (let t = 0; t < pts.length; t += 3) { const k = hk(pts[t], pts[t + 1], pts[t + 2]); const l = hash.get(k); if (l) l.push(pts[t], pts[t + 1], pts[t + 2]); else hash.set(k, [pts[t], pts[t + 1], pts[t + 2]]) }
          }
        }
      }
      const fadeOf = (x, z) => Math.min(1, Math.max(0.18, 1.15 - Math.hypot(x - hx, z - hz) / 250))
      const push = (arr, i) => { const j = i * 6; for (let t = 0; t < 6; t++) arr.push(Upos[j + t]) }
      const pushGhost = (i) => { push(ghost, i); const j = i * 6, f = fadeOf((Upos[j] + Upos[j + 3]) / 2, (Upos[j + 2] + Upos[j + 5]) / 2); ghostFade.push(f, f, f, f, f, f) }
      // pass 3: classify
      for (let i = 0; i < nU; i++) {
        const j = i * 6, mx = (Upos[j] + Upos[j + 3]) / 2, my = (Upos[j + 1] + Upos[j + 4]) / 2, mz = (Upos[j + 2] + Upos[j + 5]) / 2
        const k1 = qk(Upos[j], Upos[j + 1], Upos[j + 2]), k2 = qk(Upos[j + 3], Upos[j + 4], Upos[j + 5])
        const hard = Hkeys.has(k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1)
        const r = Math.hypot(mx - hx, mz - hz), near = my < (o.heavyY ?? 12) && r < (o.heavyR ?? 150)
        const cl = clen[root[i]], faintOk = len[i] >= (o.faintMin ?? 0.8), structural = Ucls[i] === 1
        const isNF = touch[i] && r < 45 && my < 8 // the seats nearest the field (a measure for the test, not a rule)
        if (prot[i] === 2 && nearFun(mx, my, mz)) { funSkipped++; continue } // the colour wireframe from the asset replaces it
        const seat = touch[i] && cl < C
        if (seat) seatFlagged++
        let pushed = null
        if (stands === 'full' || !touch[i]) { if (near && hard) { push(heavy, i); pushed = 1 } else if (faintOk) { push(faint, i); pushed = 1 } }
        else if (stands === 'clean') {
          if (seat) { if (faintOk) { push(faint, i); pushed = 1 } else dropped++ }
          else if (!keepRoot[root[i]]) { thinned++; dropped++ }
          else { push(faint, i); pushed = 1 } // seats nearest the field are thinned like all seats: no field-level exemption
        } else {
          if (seat) { if (stands === 'ghost' && cl >= 0.6 && faintOk) { pushGhost(i); pushed = 1 } else dropped++ }
          else if (!keepRoot[root[i]]) { thinned++; dropped++ } // thinned by the line spacing
          else if (faintOk || stands !== 'ghost') { pushGhost(i); pushed = 1 }
          else dropped++
        }
        if (pushed && isNF) nfLen += len[i]
      }
      if (crestData?.bearing?.length) { // the home-run line: one continuous polyline along the crest of the wall, from the surface of the model itself (science/wall_crest.py)
        const cb = crestData.bearing, cr = crestData.radius, cy = crestData.height, D2R = Math.PI / 180
        for (let k = 0; k + 1 < cb.length; k++) {
          const x0 = hx + cr[k] * Math.sin(cb[k] * D2R), z0 = hz - cr[k] * Math.cos(cb[k] * D2R), x1 = hx + cr[k + 1] * Math.sin(cb[k + 1] * D2R), z1 = hz - cr[k + 1] * Math.cos(cb[k + 1] * D2R)
          wallArr.push(x0, cy[k], z0, x1, cy[k + 1], z1)
          const l = Math.hypot(x1 - x0, cy[k + 1] - cy[k], z1 - z0); wallLen += l; wallSector[Math.min(17, Math.max(0, Math.floor((cb[k] + 45) / 5)))] += l
        }
      }
      wallArrOut = wallArr; wallLenOut = wallLen; wallSectorOut = wallSector
    }
    window.__nn.wireWall = wallArrOut
    window.__nn.wireStats = { crestSegments: wallArrOut.length / 6, wallEdgeLength: Math.round(wallLenOut), wallSectors: wallSectorOut.map((v) => Math.round(v)), stands, dropped, thinned, seatFlagged, protectedEdges: protectedN, funSkipped, nearFieldSeatLength: Math.round(nfLen), heavyN: heavy.length / 6, ghostN: ghost.length / 6 }
    const standsFadeOn = ghost.length > 0
    const addThin = (arr, mat, ord, colors) => {
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
      if (colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      const l = new THREE.LineSegments(geo, mat)
      l.renderOrder = ord
      l.frustumCulled = false
      wireGroup.add(l)
    }
    // fat lines: a real pixel width (WebGL's own lines are always 1 px); fog applies, so far lines melt like the thin ones
    const addFat = (arr, px, kind, opacity, ord, fixedColor) => {
      const g = new LineSegmentsGeometry()
      g.setPositions(arr)
      const mat = new LineMaterial({ color: fixedColor ?? (kind === 'accent' ? (o.accent ?? o.color ?? '#e9e7dc') : (o.color ?? '#e9e7dc')), linewidth: px * renderer.getPixelRatio(), transparent: true, opacity, depthTest: true, fog: true })
      const l = new LineSegments2(g, mat)
      l.renderOrder = ord
      l.frustumCulled = false
      wireGroup.add(l)
      wireFat.push({ mat, kind })
    }
    if (o.split) {
      addThin(faint, wireMat, 4)
      if (standsFadeOn) addThin(ghost, wireGhost, 4, ghostFade)
      if (o.fatHeavy) addFat(heavy, o.fatHeavy, 'main', 1, 6)
      else addThin(heavy, wireHeavy, 6)
    }
    if (wallArrOut.length) addFat(wallArrOut, o.wallPx ?? 4, 'accent', 1, 9) // the home-run line: the crest of the wall, one orange band all the way round
    if (o.wall && crestData?.ribbon && crestData.snapped) { // the top of the wall painted: a strip draped on the model's own surface (heights found by vertical rays in science/wall_crest.py), only where the surface exists
      const R = crestData.ribbon, cb = crestData.bearing, ok = crestData.snapped, D2R = Math.PI / 180, pos = [], idx = []
      const at = (r, y, k) => { const t = cb[k] * D2R; pos.push(hx + r * Math.sin(t), y, hz - r * Math.cos(t)) }
      for (let k = 0; k < cb.length; k++) { at(R.r_in[k], R.y_in[k], k); at(crestData.radius[k], R.y_mid[k], k); at(R.r_out[k], R.y_out[k], k) }
      for (let k = 0; k + 1 < cb.length; k++) if (ok[k] && ok[k + 1]) { const a = 3 * k, b = 3 * k + 3; idx.push(a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2) }
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      geo.setIndex(idx)
      crestRibbonMat = new THREE.MeshBasicMaterial({ color: o.accent ?? o.color ?? '#e9e7dc', side: THREE.DoubleSide, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: true })
      const m = new THREE.Mesh(geo, crestRibbonMat)
      m.renderOrder = 8
      m.frustumCulled = false
      wireGroup.add(m)
      window.__nn.wireStats.ribbonTriangles = idx.length / 3
    }
    if (o.marks) { // field markings and the measured wall (wiremarks.js): drawn from real dimensions on the model's own ground
      const L = buildMarks({ stadium: st, home: o.home ?? [0.3, 1.0], wall: o.wall })
      if (L.marks.length) addFat(L.marks, o.marksPx ?? 2.4, 'main', 1, 7)
      if (L.track.length) addThin(L.track, wireMat, 5)
      window.__nn.wireMarks = L
      Object.assign(window.__nn.wireStats, { marks: L.marks.length / 6, wall: L.wall.length / 6, track: L.track.length / 6, ticks: L.ticks.length / 6, faint: faint.length / 6, heavy: heavy.length / 6, contours: cont.length / 6 })
    }
    if (o.fun && !o.funVox && funData?.groups?.length) { // (funVox: the bottle and glove are voxels instead, coke25.js; their model edges stay out either way) // the fan attractions, drawn as a colour wireframe from the original model's full detail: a soft halo under a thick coloured core, one colour per shape group
      const COL = o.funColors ?? { tubes: '#ff5a4d', rings: '#4dd2ff', figures: '#ffc83d' }
      let n = 0
      for (const g of funData.groups) {
        const arr = g.seg.map((v) => v / 100), c = COL[g.name] ?? '#ffc83d'
        addFat(arr, 7, 'fixed', 0.18, 7, c) // halo
        addFat(arr, 2.4, 'fixed', 1, 8, c) // core
        n += arr.length / 6
      }
      Object.assign(window.__nn.wireStats, { funSegments: n })
    }
    fatRes()
    if (cont.length) {
      const l = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cont, 3)), wireMat)
      l.renderOrder = 5
      l.frustumCulled = false
      wireGroup.add(l)
    }
    scene.add(wireGroup)
    window.__nn.hideForNormal.push(wireGroup)
  }
  if (o.color) { wireMat.color.set(o.color); wireHeavy.color.set(o.color); wireGhost.color.set(o.color); for (const f of wireFat) f.mat.color.set(f.kind === 'accent' ? (o.accent ?? o.color) : o.color); crestRibbonMat?.color.set(o.accent ?? o.color) }
  if (o.opacity !== undefined) { wireMat.opacity = o.split ? o.opacity * 0.55 : o.opacity; wireHeavy.opacity = o.opacity; wireGhost.opacity = o.opacity * 0.5 }
  // distance fade: the far stands melt into the ground color (lines and the flight take the fog; the ground color follows the theme)
  if (on && o.fog) scene.fog = new THREE.Fog(o.face ?? wireFace.color, o.fog[0], o.fog[1])
  else if (!on) scene.fog = null
  if (o.face) wireFace.color.set(o.face)
  if (wireGroup) wireGroup.visible = on
  st.traverse((m) => {
    if (!m.isMesh) return
    if (on) { if (!wireOrig.has(m)) wireOrig.set(m, m.material); m.material = wireFace; m.visible = o.hidden ?? true } else if (wireOrig.has(m)) { m.material = wireOrig.get(m); m.visible = true }
  })
  if (!on) wireOrig.clear()
  ocean.visible = on ? false : !!look.ocean
}
// hooks for the interactive modes (Dinger Dojo): drive the stat strip and reach the scene
window.__nn = {
  setWire, setPaused: (b) => { renderPaused = !!b }, setFpsCap: (n) => { fpsCap = n || 0 },
  THREE, scene, camera, controls, VIBES, frames: [], hideForNormal: [], setWindow: (i) => { winInsets = i; resize() }, setShake: (x, y) => post.uniforms.shake.value.set(x, y), setVibe: applyVibe, vibe: () => vibeN, real: REAL,
  setPix: (o = {}) => { pixCss = o.pix ?? 0; post.uniforms.pixSize.value = pixCss * renderer.getPixelRatio(); post.uniforms.mode.value = o.mode ?? 0; post.uniforms.levels.value = o.levels ?? 3; if (o.a) post.uniforms.duoA.value.set(o.a); if (o.b) post.uniforms.duoB.value.set(o.b) },
  setDuo: (d) => { if (d) { post.uniforms.duoA.value.set(d[0]); post.uniforms.duoB.value.set(d[1]); post.uniforms.duoAmt.value = d[2] } else post.uniforms.duoAmt.value = 0 },
  setSat: (v) => { vibeU.sat.value = v }, setBg: (c) => { bgOverride = c; look = { ...look, bg: c }; applyLook() },
  setStat(mph, la, ft) { STAT.mph = Math.round(mph); STAT.la = Math.round(la); STAT.ft = Math.round(ft); renderSpec(); roll() },
  strip: (show) => { document.getElementById('strip').style.display = show ? '' : 'none' },
}
if (qs.get('mode') === 'dojo') import('./dojo.js')
document.getElementById('cmp').addEventListener('click', (e) => { if (e.target.tagName !== 'A') roll() })
