import type { APIRoute } from 'astro'
import { releases } from '@typo/releases'
import { getI18nStaticPaths } from '@/lib/i18n'

export function getStaticPaths() {
  return getI18nStaticPaths()
}

export const GET: APIRoute = async () => {
  try {
    const res = await fetch('https://github.com/yuler/typo/releases/latest/download/latest.json')
    if (res.ok) {
      const data = await res.json()
      return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }
  }
  catch (error) {
    console.error('Failed to fetch latest.json from GitHub, falling back to local release:', error)
  }

  // Fallback to local release data if GitHub fetch fails (e.g. offline dev build)
  if (releases.length === 0) {
    return new Response(JSON.stringify({ error: 'No releases found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const release = releases[0]
  return new Response(JSON.stringify({
    version: release.version,
    notes: release.notes,
    notes_i18n: release.notes_i18n,
    pub_date: release.date,
    platforms: {},
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
