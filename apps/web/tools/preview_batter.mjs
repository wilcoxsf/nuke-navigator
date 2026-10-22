// Prints the procedural ASCII batter at stance, contact and follow-through for a right-hander at a given attack angle, side by side.
import { asciiBatter } from '../src/cockpits/skel3.js'

const aa = Number(process.argv[2] ?? 18), rows = Number(process.argv[3] ?? 18), cols = Number(process.argv[4] ?? 30)
const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => asciiBatter({ cols, rows, t, aa, hand: 'R' }))
for (let r = 0; r < rows; r++) console.log(frames.map((f) => f[r].padEnd(cols)).join(' | '))
