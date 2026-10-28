// Study 25 sea (B, 28 Oct, second pass; Andrew: "make the water go out in literally every single direction from the park, just have the park floating as an island"):
// one flat plane out to the horizon in every direction at the water's level, black, with thin grey-white crest lines drawn by a shader, so they stay one pixel wide
// at any distance and fade toward the horizon. The ballpark stands in it like an island; the post shader's edge ink outlines the shore.
//   B1 SWELL: broken whitecaps on two swells rolling in from the bay   B2 SHIMMER: still crests, short glints that come and go   B3 SHORE LINES: broken rings rolling in
//   B4 WAKES: still water, a boat's V-wake circling the park now and then   B0 STILL: the crests, not moving
// Still under prefers-reduced-motion. The water level is exported for the kayaks, the sea lion and the splash.
// the sea's level in the plate frame (m below the field; Oracle's field is about at sea level); the kayaks, the sea lion and a splash use it too
export const WATER_Z = -1.6
export function initWater25(api, o = {}) {
  const { THREE, scene } = api.NN
  const toWorld = window.__cp.toWorld
  const level = toWorld([0, 0, WATER_Z]).y
  const center = toWorld([0, 60, 0]) // the middle of the park, for the shore rings and the wake's circle
  const ink = new THREE.Color(o.ink ?? '#e8e2d4')
  const still = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, mode: { value: o.mode ?? 1 }, ink: { value: new THREE.Vector3(ink.r, ink.g, ink.b) }, center: { value: new THREE.Vector2(center.x, center.z) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */ `
      uniform float time, mode; uniform vec3 ink; uniform vec2 center; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
      // a thin line where f crosses a whole number, under a pixel wide at any distance
      float lineAt(float f){ float w = max(fwidth(f), 1e-4); return 1. - smoothstep(0.3, 1.0, abs(fract(f + 0.5) - 0.5) / w); }
      // whitecaps: short broken crest dashes on parallel swells (crests run across the broadcast view, like a sea seen from above the plate) (lambda m apart, moving at speed m/s across them); each crest is lit only in patches along its length
      float caps(vec2 p, vec2 dir, float lambda, float speed, float t, float seed){
        vec2 side = vec2(-dir.y, dir.x);
        float f = (dot(p, dir) + t * speed) / lambda, k = floor(f + 0.5);
        float along = dot(p, side) / (lambda * 0.7) + k * 3.7 + seed;
        float patchy = smoothstep(0.66, 0.84, noise(vec2(along, k * 0.37 + t * 0.03)));
        return lineAt(f) * patchy;
      }
      void main(){
        vec2 p = vW.xz;
        float d = distance(vW, cameraPosition);
        float t = mode < 0.5 ? 0. : time;
        float v = 0.;
        if (mode < 1.5) {
          // swell: two trains of broken whitecaps rolling in from the bay, the second finer and fainter
          v = caps(p, normalize(vec2(0.12, 0.99)), 24., 2.2, t, 0.) * 0.34 + caps(p, normalize(vec2(-0.28, 0.96)), 11., 1.4, t, 9.) * 0.2;
        } else if (mode < 2.5) {
          // shimmer: the crests stand still, and short glints come and go between them
          v = caps(p, normalize(vec2(0.12, 0.99)), 24., 0., 0., 0.) * 0.22;
          vec2 c = floor(p / 7.), f = fract(p / 7.); float g = hash(c), on = step(fract(time * 0.25 + g * 7.), 0.08);
          v = max(v, on * (1. - smoothstep(0., 0.07, abs(f.y - 0.5))) * step(abs(f.x - 0.5), 0.25) * 0.5);
        } else if (mode < 3.5) {
          // shore lines: broken rings around the park rolling in toward it
          float r = distance(p, center), f = (r + time * 6.) / 30., k = floor(f + 0.5), a = atan(p.y - center.y, p.x - center.x);
          v = lineAt(f) * smoothstep(0.5, 0.75, noise(vec2(a * 9., k * 0.5))) * 0.42 * smoothstep(150., 220., r);
        } else {
          // wakes: still crests, and a V-wake behind a boat circling the park
          v = caps(p, normalize(vec2(0.12, 0.99)), 24., 0., 0., 0.) * 0.22;
          float a = time * 0.035, R = 330.; vec2 b = center + R * vec2(cos(a), sin(a)), dir = vec2(-sin(a), cos(a)), q = p - b;
          float back = -dot(q, dir), side = abs(dot(q, vec2(-dir.y, dir.x)));
          if (back > 0. && back < 140.) v = max(v, (1. - smoothstep(0., 2., abs(side - back * 0.36))) * (1. - back / 140.) * 0.55);
        }
        v *= 1. - smoothstep(260., 950., d); // the crests fade toward the horizon (sooner, or the far water packs into streaks)
        gl_FragColor = vec4(ink * v, 1.);
      }`,
  })
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat)
  sea.rotation.x = -Math.PI / 2
  sea.position.set(center.x, level, center.z)
  sea.renderOrder = -2
  scene.add(sea)
  let mode = o.mode ?? 1, t = 0, cost = []
  api.NN.frames.push((dt) => {
    const s0 = performance.now()
    t += Math.min(dt, 0.1)
    mat.uniforms.time.value = still ? 0 : t
    mat.uniforms.mode.value = still ? 0 : mode
    cost.push(performance.now() - s0); if (cost.length > 120) cost.shift()
  })
  return {
    setMode(v) { mode = v }, mode: () => (still ? 0 : mode), level: () => level, sea, mat,
    cost: () => cost.reduce((a, b) => a + b, 0) / Math.max(1, cost.length),
  }
}
