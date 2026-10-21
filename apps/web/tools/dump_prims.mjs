// Dumps world-space vertex positions of selected material primitives of a GLB as JSON (for wall and field geometry extraction).
// Usage: node tools/dump_prims.mjs <glb> <out.json> <material> [<material> ...]
import { NodeIO } from '@gltf-transform/core'
import { writeFileSync } from 'node:fs'

const [glb, out, ...wanted] = process.argv.slice(2)
const doc = await new NodeIO().read(glb)
const result = {}
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const m = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const name = prim.getMaterial()?.getName()
    if (!wanted.includes(name)) continue
    const pos = prim.getAttribute('POSITION')
    const idx = prim.getIndices()
    const verts = []
    const v = [0, 0, 0]
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v)
      verts.push([
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ])
    }
    result[name] = { verts, tris: idx ? Array.from(idx.getArray()) : null }
  }
}
writeFileSync(out, JSON.stringify(result))
for (const [k, v] of Object.entries(result)) console.log(k, 'verts', v.verts.length)
