import type { APIRoute } from 'astro'
import { getReleaseByVersion, releases } from '@typo/releases'
import { getLocale } from '@/lib/i18n'

export function getStaticPaths() {
  const paths: any[] = []
  for (const r of releases) {
    paths.push({
      params: {
        version: `v${r.version}`,
      },
    })
  }
  return paths
}

export const GET: APIRoute = async ({ params }) => {
  const { lang, version } = params

  if (!version) {
    return new Response(JSON.stringify({ error: 'Version is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Normalize version to strip leading 'v' if present
  const cleanVersion = version.startsWith('v') ? version.substring(1) : version
  const release = getReleaseByVersion(cleanVersion)

  if (!release) {
    return new Response(JSON.stringify({ error: `Release not found for version: ${version}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const locale = getLocale(lang)

  // Get localized notes or fall back to en/default notes
  const notes_i18n = release.notes_i18n
  const rawNotes = notes_i18n?.[locale] || notes_i18n?.en || release.notes

  return new Response(
    JSON.stringify(
      {
        version: release.version,
        date: release.date,
        github_url: release.github_url,
        notes: Array.isArray(rawNotes) ? rawNotes.join('\n') : rawNotes,
        notes_i18n: release.notes_i18n,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
