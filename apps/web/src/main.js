import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadLibrary, mulberry32, pick } from './comparisons.js'

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

scene.add(new THREE.HemisphereLight(0xffffff, 0xb59f7a, 1.1))
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
new GLTFLoader().load('/stadium_sf_slim.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
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
  scene.add(gltf.scene)
  const box = new THREE.Box3().setFromObject(gltf.scene)
  document.title = `loaded ${mats.length} materials, box ${box.min.toArray().map((v) => v.toFixed(0))} to ${box.max.toArray().map((v) => v.toFixed(0))}`
}, undefined, (err) => { document.title = 'GLB ERROR ' + (err && err.message) })

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
    paper: { value: new THREE.Color() }, ink: { value: new THREE.Color() }, dotScale: { value: 1 }, hatchAmt: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform float near, far;
    uniform vec3 paper, ink; uniform float dotScale, hatchAmt;
    varying vec2 vUv;
    float lin(float d){ float z = d * 2. - 1.; return (2. * near * far) / (far + near - z * (far - near)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main(){
      vec2 px = 1. / res;
      vec3 n0 = texture2D(tNormal, vUv).rgb;
      float e = 0.;
      vec2 o[4]; o[0]=vec2(px.x,0.); o[1]=vec2(-px.x,0.); o[2]=vec2(0.,px.y); o[3]=vec2(0.,-px.y);
      float d0 = lin(texture2D(tDepth, vUv).r);
      float de = 0.;
      for (int i = 0; i < 4; i++) {
        e += length(texture2D(tNormal, vUv + o[i]).rgb - n0);
        de += abs(lin(texture2D(tDepth, vUv + o[i]).r) - d0);
      }
      float line = smoothstep(1.0, 1.7, e) + smoothstep(0.10 * d0, 0.24 * d0, de);
      line = clamp(line, 0., 1.) * (1. - smoothstep(600., 1500., d0));
      vec3 c = texture2D(tColor, vUv).rgb;
      float L = dot(c, vec3(0.299, 0.587, 0.114));
      // clean diagonal ink hatching in the shadows (no noise, no dots)
      vec2 g = vUv * res;
      float stripe = fract((g.x + g.y) / dotScale);
      float shade = 1. - smoothstep(0.30, 0.80, L);
      float w = 0.10 + 0.30 * shade;
      float hl = (1. - smoothstep(w, w + 0.07, stripe)) * smoothstep(0.55, 0.80, shade);
      vec3 col = mix(c, ink, hl * hatchAmt);
      float bg = step(0.9999, texture2D(tDepth, vUv).r);
      col = mix(col, paper, bg);
      col = mix(col, ink, line);
      gl_FragColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
    }`,
  depthTest: false, depthWrite: false,
})
const quadScene = new THREE.Scene()
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post))
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

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
addEventListener('keydown', (e) => { if (LOOKS[e.key]) { look = LOOKS[e.key]; applyLook() } })

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  const pr = renderer.getPixelRatio()
  makeTargets(Math.floor(w * pr), Math.floor(h * pr))
  post.uniforms.res.value.set(w * pr, h * pr)
  post.uniforms.dotScale.value = 6 * pr // hatch pitch in device pixels
}
addEventListener('resize', resize)
resize()

renderer.setAnimationLoop((t) => {
  oceanMat.uniforms.time.value = (window.__fixedTime ?? t / 1000)
  controls.update()
  renderer.setRenderTarget(targets.color)
  scene.overrideMaterial = null
  renderer.render(scene, camera)
  renderer.setRenderTarget(targets.normal)
  scene.overrideMaterial = normalMat
  renderer.render(scene, camera)
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
document.getElementById('spec').innerHTML =
  `<span><b>EXIT SPEED</b>${STAT.mph} mph</span><span><b>LAUNCH</b>${STAT.la}&deg;</span>` +
  `<span><b>DISTANCE</b>${STAT.ft} ft</span><span><b>BADGE</b>PREDICTED</span><span><b>PARK</b>Oracle 2025</span>`
const qs = new URLSearchParams(location.search)
const rand = qs.get('seed') ? mulberry32(Number(qs.get('seed'))) : Math.random
const recent = []
let library = null
function roll() {
  if (!library) return
  const rows = [
    ['speed', STAT.mph * 0.44704, 'cmp-speed', 'src-speed', `${STAT.mph} mph`],
    ['length', STAT.ft * 0.3048, 'cmp-dist', 'src-dist', `${STAT.ft} ft`],
  ]
  for (const [kind, amount, textId, linkId, label] of rows) {
    const p = pick(library, kind, amount, rand, recent)
    if (!p) continue
    recent.push(p.rec.cat, p.rec.name)
    while (recent.length > 16) recent.shift()
    document.getElementById(textId).textContent = `${label} = ${p.phrase}`
    const a = document.getElementById(linkId)
    a.textContent = p.rec.reviewed ? '●' : '○'
    a.title = `${p.rec.name}${p.rec.note ? ' | ' + p.rec.note : ''} | ${p.rec.reviewed ? 'source text read' : 'unreviewed source'}`
    if (p.rec.url) a.href = p.rec.url
    else a.removeAttribute('href')
  }
}
loadLibrary().then((l) => { library = l; roll(); window.__cmpReady = true })
document.getElementById('cmp').addEventListener('click', (e) => { if (e.target.tagName !== 'A') roll() })
