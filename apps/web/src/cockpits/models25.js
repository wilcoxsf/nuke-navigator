// Study 25 voxel models (28 Oct): the kayak, the gloves, the sea lion and the ball, built in Blender (science/blender/build_kayak.py, build_moments.py) and loaded once
// here. Their materials become flat Lambert in the same colors, so the park's lights shade the cube faces and the post shader inks their outlines like the park's.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
export const MODEL_NAMES = ['kayak', 'glove_open', 'glove_shut', 'sealion_shut', 'sealion_open', 'ball']
let loading = null
export function loadModels(THREE) {
  loading ??= Promise.all(MODEL_NAMES.map((n) => new Promise((ok) => {
    new GLTFLoader().load(`/models/${n}.glb`, (g) => {
      g.scene.traverse((o) => { if (o.isMesh) { const m = o.material; o.material = new THREE.MeshLambertMaterial({ color: m.color, flatShading: true, name: m.name }) } })
      ok([n, g.scene])
    }, undefined, () => ok([n, null]))
  }))).then((list) => Object.fromEntries(list))
  return loading
}
// a copy of a model with its own materials (so one kayak's hull can be recolored), scaled
export function cloneModel(src, scale = 1) {
  const c = src.clone(true)
  c.traverse((o) => { if (o.isMesh) o.material = o.material.clone() })
  c.scale.setScalar(scale)
  return c
}
