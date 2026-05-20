import type { ReleaseData } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export * from './types'

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map(part => Number.parseInt(part, 10) || 0)
  const pb = b.split('.').map(part => Number.parseInt(part, 10) || 0)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff !== 0)
      return diff
  }
  return 0
}

function sortReleasesByVersion(releases: ReleaseData[]): ReleaseData[] {
  return [...releases].sort((a, b) => compareSemverDesc(a.version, b.version))
}

function loadReleases(): ReleaseData[] {
  let modules: any = {}
  try {
    // @ts-expect-error glob is not standard but provided by Vite
    modules = import.meta.glob('../data/*.json', { eager: true })
  }
  catch {
    // Not in Vite
  }

  if (Object.keys(modules).length > 0) {
    return sortReleasesByVersion(
      Object.values(modules).map((m: any) => m.default as ReleaseData),
    )
  }
  else {
    const DATA_DIR = path.resolve(__dirname, '../data')
    if (fs.existsSync(DATA_DIR)) {
      return sortReleasesByVersion(
        fs.readdirSync(DATA_DIR)
          .filter((f: string) => f.endsWith('.json'))
          .map((f: string) => {
            const fullPath = path.join(DATA_DIR, f)
            return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as ReleaseData
          }),
      )
    }
    return []
  }
}

export const releases: ReleaseData[] = loadReleases()

export function getReleaseByVersion(version: string) {
  return releases.find(r => r.version === version)
}

export function getAssetUrl(version: string, assetName: string) {
  return `https://github.com/yuler/typo/releases/download/v${version}/${assetName}`
}
