// The Giants' home schedule for a season, for WALLOP WITNESS tickets (11 Nov 2026): one request to MLB's public Stats API, written to public/giants_schedule.json
// as { meta, games: [{ d, pk, opp, start, dh }] }, regular season home games only. Usage: node tools/fetch_schedule.mjs 2027
import { writeFileSync } from 'fs'
const season = Number(process.argv[2] || 2027)
const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=137&season=${season}&gameType=R&hydrate=team`
const r = await fetch(url, { headers: { 'user-agent': 'nuke-navigator schedule fetch (private site)' } })
if (!r.ok) { console.log('HTTP', r.status); process.exit(1) }
const j = await r.json(), out = []
const ab = { 108: 'LAA', 109: 'AZ', 110: 'BAL', 111: 'BOS', 112: 'CHC', 113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU', 118: 'KC', 119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'ATH', 134: 'PIT', 135: 'SD', 136: 'SEA', 137: 'SF', 138: 'STL', 139: 'TB', 140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI', 144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL' }
for (const day of j.dates ?? []) for (const g of day.games ?? []) {
  if (g.teams?.home?.team?.id !== 137) continue
  const opp = g.teams.away.team, dh = g.doubleHeader && g.doubleHeader !== 'N' ? Number(g.gameNumber ?? 1) : 0
  out.push({ d: g.officialDate ?? day.date, pk: g.gamePk, opp: ab[opp.id] ?? opp.abbreviation ?? opp.name, start: g.gameDate, dh })
}
out.sort((a, b) => a.start.localeCompare(b.start))
writeFileSync('public/giants_schedule.json', JSON.stringify({ meta: { season, source: 'statsapi.mlb.com schedule, regular season, Giants home games', fetched: new Date().toISOString() }, games: out }))
console.log(season, out.length, 'home games', out[0]?.d, out[0]?.opp, out[0]?.start, '...', out.at(-1)?.d)
