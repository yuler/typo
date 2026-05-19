import type { APIRoute } from 'astro'
import { releases } from '@typo/releases'

export const GET: APIRoute = async () => {
  if (releases.length === 0) {
    return new Response(JSON.stringify({ error: 'No releases found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const latestRelease = releases[0]
  const tag = `v${latestRelease.version}`
  const url = `https://github.com/yuler/typo/releases/download/${tag}/latest.json`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      // If fetching from github releases fails, we might just be building locally or GitHub release isn't ready.
      // Return a basic fallback so the build doesn't crash, but log a warning.
      console.warn(`[typo] Failed to fetch latest.json from GitHub releases (${res.status}). Using fallback.`)
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

    const data = await res.json()

    // Inject our rich i18n notes into the GitHub latest.json
    data.notes_i18n = latestRelease.notes_i18n

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error(`[typo] Error fetching latest.json from GitHub releases:`, error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
