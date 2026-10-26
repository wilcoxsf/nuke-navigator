// Text look at some baked player faces in the style the app uses (braille poster). Usage: node tools/faces_peek.mjs out.txt id id id ...
import fs from 'node:fs'
import { faceSource, renderArt } from '../src/cockpits/art.js'

const [out, ...ids] = process.argv.slice(2)
const faces = JSON.parse(fs.readFileSync(new URL('../public/faces_tone.json', import.meta.url)))
const bio = JSON.parse(fs.readFileSync('C:/Users/andrewwi/dev/nuke-navigator-new/scratch/headshots_bio.json', 'utf8'))
let text = ''
for (const id of ids) {
  if (!faces[id]) { text += `\n=== ${id} missing\n`; continue }
  const r = renderArt(faceSource(faces[id]), 'braille-poster', 34, { enh: { stretch: true, k: 1.5, sigma: 18 } })
  text += `\n=== ${bio[id]?.name ?? id} ${r.cols} x ${r.rows}\n` + r.lines.join('\n') + '\n'
}
fs.writeFileSync(out, text, 'utf8')
