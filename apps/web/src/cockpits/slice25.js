// Study 25 CONTACT, SIDE ON: a horizontal slice through the strike zone at the moment of contact, seen from the side (catcher on the left, the field on the right).
// Three lines through the contact point, all drawn at their true angle and with length set by speed on one shared scale, so a longer line is a faster thing:
//   the pitch coming in (approach angle, pitch speed; dim and dashed), the bat coming through (attack angle, bat speed), the ball going out (launch angle, exit speed; accent).
// Contact height is the pitch's height at the front of the plate (plate_z); the bracket is this batter's own zone (sz_bot to sz_top). With no bat tracking on a ball the
// bat line is left off; a what-if swing has no real pitch or bat, so only the ball is drawn.
export function sliceSVG(o, W, H) {
  W = Math.max(60, Math.floor(W)); H = Math.max(40, Math.floor(H))
  const ground = H - 14, ftS = Math.min((H - 30) / 4.6, W * 0.13), cx = Math.round(W * 0.4)
  const pz = Math.max(0.6, Math.min(4.2, o.pz ?? 2.4)), cy = ground - pz * ftS, Y = (z) => ground - z * ftS
  const rad = (d) => (d * Math.PI) / 180
  const ball = { v: o.ev, a: rad(o.la) }, bat = o.bs != null && o.aa != null ? { v: o.bs, a: rad(o.aa) } : null, pitch = o.pv != null && o.vaa != null ? { v: o.pv, a: rad(-o.vaa) } : null
  // one px-per-mph scale that keeps every line inside the box
  let k = 3
  const lim = (num, den) => { if (den > 1e-6) k = Math.min(k, num / den) }
  lim(W - 10 - cx, ball.v * Math.cos(ball.a))
  if (ball.a > 0) lim(cy - 16, ball.v * Math.sin(ball.a)); else lim(ground - 3 - cy, ball.v * -Math.sin(ball.a))
  if (bat) { lim(cx - 10, bat.v * Math.cos(bat.a)); if (bat.a > 0) lim(ground - 3 - cy, bat.v * Math.sin(bat.a)); else lim(cy - 16, bat.v * -Math.sin(bat.a)) }
  if (pitch) { lim(W - 10 - cx, pitch.v * Math.cos(pitch.a)); lim(cy - 16, pitch.v * Math.sin(Math.max(0, pitch.a))) }
  const end = (s, sgn) => [cx + sgn * s.v * k * Math.cos(s.a), cy - sgn * s.v * k * Math.sin(s.a)]
  const arrow = (x0, y0, x1, y1, col) => {
    const a = Math.atan2(y1 - y0, x1 - x0), L = 9, sp = 0.45
    return `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${(x1 - L * Math.cos(a - sp)).toFixed(1)},${(y1 - L * Math.sin(a - sp)).toFixed(1)} ${(x1 - L * Math.cos(a + sp)).toFixed(1)},${(y1 - L * Math.sin(a + sp)).toFixed(1)}" fill="${col}"/>`
  }
  const fs = 'style="font-size:calc(13px * var(--ts))"'
  let g = ''
  g += `<line x1="0" x2="${W}" y1="${ground + 0.5}" y2="${ground + 0.5}" stroke="var(--dim)"/>`
  g += `<rect x="${cx - 26}" y="${ground - 1}" width="26" height="4" fill="var(--tx)"/>` // the plate, front edge at the contact point
  g += `<line x1="0" x2="${W}" y1="${cy.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="var(--ln)" stroke-dasharray="2 4"/>` // level, so the angles read
  if (o.sb != null && o.st != null) {
    const y0 = Y(o.st), y1 = Y(o.sb)
    g += `<path d="M${cx - 6} ${y0.toFixed(1)}h6v${(y1 - y0).toFixed(1)}h-6" fill="none" stroke="var(--dim)" stroke-width="1.5"/>`
    g += `<text x="${cx - 9}" y="${(y0 + 4).toFixed(1)}" fill="var(--dim)" text-anchor="end" ${fs}>ZONE</text>`
  }
  const lab = (x, y, t, col, anchor) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${col}" text-anchor="${anchor}" ${fs}>${t}</text>`
  const sg = (d) => (d > 0.5 ? '+' : d < -0.5 ? '-' : '') + Math.abs(Math.round(d)) + '°'
  if (pitch) {
    const [x0, y0] = end(pitch, 1)
    g += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${cx}" y2="${cy.toFixed(1)}" stroke="var(--dim)" stroke-width="2" stroke-dasharray="5 4"/>` + arrow(x0, y0, cx + 4, cy - 4 * Math.tan(pitch.a), 'var(--dim)')
    g += lab(Math.min(W - 4, x0), Math.max(y0, cy) + 20, `PITCH ${Math.round(pitch.v)} MPH ${sg(o.vaa)}`, 'var(--dim)', 'end')
  }
  if (bat) {
    const [x0, y0] = end(bat, -1)
    g += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${cx}" y2="${cy.toFixed(1)}" stroke="var(--tx)" stroke-width="4" stroke-linecap="square"/>` + arrow(x0, y0, cx, cy, 'var(--tx)')
    g += lab(Math.max(4, x0), Math.min(ground - 5, y0 + 18), `BAT ${Math.round(bat.v)} MPH ${sg(o.aa)}`, 'var(--tx)', 'start')
  }
  {
    const [x1, y1] = end(ball, 1)
    g += `<line x1="${cx}" y1="${cy.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--acc)" stroke-width="4" stroke-linecap="square"/>` + arrow(cx, cy, x1, y1, 'var(--acc)')
    const right = x1 > W * 0.7
    g += lab(right ? Math.min(W - 4, x1) : x1 + 8, ball.a > 0 ? Math.max(13, y1 - 8) : y1 + 18, `BALL ${Math.round(ball.v)} MPH ${sg(o.la)}`, 'var(--acc)', right ? 'end' : 'start')
  }
  g += `<rect x="${cx - 4}" y="${(cy - 4).toFixed(1)}" width="8" height="8" fill="var(--acc)" stroke="var(--k)" stroke-width="1.5"/>` // the ball at contact
  // the drawing sits centered in its box: shift it up by half the empty space above it
  const tops = [cy - 14, o.st != null ? Y(o.st) - 4 : cy]
  if (ball.a > 0) tops.push(end(ball, 1)[1] - 22)
  if (pitch) tops.push(end(pitch, 1)[1] - 6)
  const top = Math.max(0, Math.min(...tops)), dy = -top / 2
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges"><g transform="translate(0 ${dy.toFixed(1)})">${g}</g></svg>`
}

// one line under the slice: how the bat's path met the pitch's path (a bat swinging up at the same angle the pitch comes down is "on plane")
export function sliceCaption(o) {
  if (!o.real) return 'WHAT-IF SWING: THE BALL ONLY. NO REAL PITCH OR BAT.'
  if (o.aa == null) return 'NO BAT TRACKING ON THIS ONE: THE PITCH AND THE BALL ONLY.'
  const plane = -(o.vaa ?? -6), d = o.aa - plane, gap = o.la - o.aa
  const pl = Math.abs(d) <= 2 ? 'ON THE PITCH\'S PLANE' : `${Math.abs(Math.round(d))}° ${d > 0 ? 'STEEPER' : 'FLATTER'} THAN THE PITCH'S PLANE`
  return `THE BAT'S PATH WAS ${pl}. BALL LEFT ${Math.abs(Math.round(gap))}° ${gap >= 0 ? 'ABOVE' : 'BELOW'} THE BAT'S PATH.`
}
