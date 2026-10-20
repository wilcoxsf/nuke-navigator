// Prints a structural summary of a GLB: nodes, meshes, materials, vertex counts, bounds.
import { NodeIO } from '@gltf-transform/core'
import { getBounds } from '@gltf-transform/functions'

const path = process.argv[2]
const io = new NodeIO()
const doc = await io.read(path)
const root = doc.getRoot()
console.log('scenes', root.listScenes().length, 'nodes', root.listNodes().length, 'meshes', root.listMeshes().length,
  'materials', root.listMaterials().length, 'textures', root.listTextures().length)

for (const mat of root.listMaterials()) {
  const c = mat.getBaseColorFactor().map((v) => +v.toFixed(2))
  console.log('material', JSON.stringify(mat.getName()), 'color', c.join(','), 'tex', !!mat.getBaseColorTexture())
}
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const idx = prim.getIndices()
    console.log('mesh', JSON.stringify(mesh.getName()), 'prim material', JSON.stringify(prim.getMaterial()?.getName()),
      'verts', pos.getCount(), 'tris', idx ? idx.getCount() / 3 : pos.getCount() / 3)
  }
}
const scene = root.listScenes()[0]
const b = getBounds(scene)
console.log('bounds min', b.min.map((v) => +v.toFixed(1)).join(','), 'max', b.max.map((v) => +v.toFixed(1)).join(','))
