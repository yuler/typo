import type { APIRoute } from 'astro'
import { releases } from '@typo/releases'

export { getI18nStaticPaths as getStaticPaths } from '@/lib/i18n'

export const GET: APIRoute = async () => {
  if (releases.length === 0) {
    return new Response(JSON.stringify({ error: 'No releases found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const latestRelease = releases[0]

  return new Response(JSON.stringify({
    version: latestRelease.version,
    notes: latestRelease.notes,
    notes_i18n: latestRelease.notes_i18n,
    pub_date: latestRelease.date,
    platforms: {},
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
