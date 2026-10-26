// Wire-only slim of a stadium GLB: the wireframe look needs positions and triangle indices only, so every texture, material colour, normal and UV is dropped, the mesh is welded, simplified and
// quantized. Prints triangles before and after, file sizes, and the time taken (the per-park cost estimate for the other 29 parks).
// Usage: node tools/wire_glb.mjs <in.glb> <out.glb> [ratio]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, quantize, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { statSync } from 'node:fs'

const [input, output, ratioArg] = process.argv.slice(2)
const ratio = Number(ratioArg ?? 0.35)
const t0 = Date.now()
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
const tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)
const before = tris()
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of prim.listSemantics()) if (sem !== 'POSITION') prim.setAttribute(sem, null)
  }
}
for (const mat of doc.getRoot().listMaterials()) { mat.setBaseColorTexture(null); mat.setNormalTexture(null); mat.setOcclusionTexture(null); mat.setEmissiveTexture(null); mat.setMetallicRoughnessTexture(null) }
await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
  quantize({ quantizePosition: 14 }),
  dedup(),
  prune(),
)
await io.write(output, doc)
console.log(`${input.split(/[\\/]/).pop()}: ${Math.round(before)} -> ${Math.round(tris())} triangles, ${(statSync(input).size / 1e6).toFixed(1)} MB -> ${(statSync(output).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`)
