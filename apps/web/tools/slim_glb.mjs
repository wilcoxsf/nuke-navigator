// Slims a stadium GLB for the web: drops photo textures, welds, simplifies, quantizes.
// Usage: node tools/slim_glb.mjs <in.glb> <out.glb> [ratio]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, quantize, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

const [input, output, ratioArg] = process.argv.slice(2)
const ratio = Number(ratioArg ?? 0.25)

await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
const root = doc.getRoot()

const flat = {
  Ads_Padding: [0.78, 0.74, 0.66, 1],
  SF_Greyscale: [0.86, 0.82, 0.74, 1],
  SF_Infield: [0.72, 0.62, 0.48, 1],
  SF_Field: [0.62, 0.70, 0.52, 1],
}
for (const mat of root.listMaterials()) {
  mat.setBaseColorTexture(null)
  mat.setBaseColorFactor(flat[mat.getName()] ?? [0.85, 0.82, 0.75, 1])
  mat.setMetallicFactor(0).setRoughnessFactor(1)
}

await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
  dedup(),
  prune(),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
)

await io.write(output, doc)
let tris = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices()
    tris += idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3
  }
}
console.log('triangles after:', Math.round(tris))
