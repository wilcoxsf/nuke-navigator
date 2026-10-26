// Writes a dequantized, texture-free copy of a GLB so Python tools (trimesh) read true coordinates in metres. Analysis only, not shipped.
// Usage: node tools/dequant_glb.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, prune } from '@gltf-transform/functions'

const [input, output] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
for (const mat of doc.getRoot().listMaterials()) { mat.setBaseColorTexture(null); mat.setNormalTexture(null); mat.setOcclusionTexture(null); mat.setEmissiveTexture(null); mat.setMetallicRoughnessTexture(null) }
await doc.transform(dequantize(), prune())
await io.write(output, doc)
console.log('wrote', output)
