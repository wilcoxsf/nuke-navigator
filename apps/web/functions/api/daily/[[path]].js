// /api/daily/latest and /api/daily/YYYY-MM-DD: the nightly job's day files (ops/cron-daily) for BLAST BULLETIN and DAILY DINGER, behind the same token gate as the
// rest of the site (functions/_middleware.js runs first). Reads the KV index (INDEX: 'latest' -> newest complete date) and the R2 bucket (DAILY: days/DATE.json).
// Until Andrew creates and binds both (ops/cron-daily/README.md), every request answers 404 and the page falls back to its bundled sample day.
export async function onRequestGet({ params, env }) {
  const part = Array.isArray(params.path) ? params.path.join('/') : params.path ?? ''
  const json = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=300' } })
  if (!env.DAILY || !env.INDEX) return json({ error: 'the nightly job is not set up yet' }, 404)
  const date = part === 'latest' || part === '' ? await env.INDEX.get('latest') : part
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'no such day' }, 404)
  const obj = await env.DAILY.get(`days/${date}.json`)
  return obj ? json(await obj.text()) : json({ error: 'no such day' }, 404)
}
