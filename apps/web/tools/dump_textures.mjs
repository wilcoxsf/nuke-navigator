// Writes every base-color texture of a GLB to a folder and prints size, type and whether the primitive has UVs.
import { NodeIO } from '@gltf-transform/core'
import fs from 'node:fs'

const [path, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const doc = await new NodeIO().read(path)
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial()
    const tex = mat.getBaseColorTexture()
    const uv = prim.getAttribute('TEXCOORD_0')
    console.log(mat.getName(), 'uv', !!uv, 'tex', tex ? tex.getMimeType() : 'none', tex ? tex.getSize()?.join('x') : '',
      tex ? Math.round(tex.getImage().byteLength / 1024) + ' KB' : '', 'rough', mat.getRoughnessFactor(), 'metal', mat.getMetallicFactor(),
      'normalTex', !!mat.getNormalTexture(), 'emissive', !!mat.getEmissiveTexture(), 'ormTex', !!mat.getMetallicRoughnessTexture())
    if (tex) fs.writeFileSync(`${outDir}/${mat.getName()}.${tex.getMimeType() === 'image/png' ? 'png' : 'jpg'}`, tex.getImage())
  }
}
