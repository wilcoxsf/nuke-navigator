// Builds the web copy of a stadium GLB that KEEPS its textures (real field, dirt, warning track, wall padding, baked structure lighting).
// slim_glb.mjs flattened every material to one colour; this keeps the UVs and downsizes the textures so the file stays under Cloudflare's 25 MB limit.
// Usage: node tools/color_glb.mjs <in.glb> <out.glb> [ratio for the structure mesh] [texture size]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, quantize, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const [input, output, ratioArg, sizeArg] = process.argv.slice(2)
const ratio = Number(ratioArg ?? 0.5)
const size = Number(sizeArg ?? 2048)

await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(input)
const root = doc.getRoot()

for (const mat of root.listMaterials()) {
  const tex = mat.getBaseColorTexture()
  if (tex) {
    const src = Buffer.from(tex.getImage())
    const meta = await sharp(src).metadata()
    const target = Math.min(meta.width, size)
    const out = await sharp(src).resize(target, target).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    tex.setImage(new Uint8Array(out)).setMimeType('image/jpeg')
    console.log(mat.getName(), `${meta.width} -> ${target}`, Math.round(out.length / 1024), 'KB')
  }
  mat.setMetallicFactor(0).setRoughnessFactor(0.92)
}

// Texture seams are locked (borders stay put) so the baked lighting does not smear.
await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002, lockBorder: true }),
  dedup(),
  prune(),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14 }),
)
await io.write(output, doc)
let tris = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices()
    const t = idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3
    tris += t
    console.log(prim.getMaterial().getName(), Math.round(t), 'triangles')
  }
}
console.log('triangles after:', Math.round(tris))
