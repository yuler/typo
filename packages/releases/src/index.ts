import type { ReleaseData } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export * from './types'

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
    return Object.values(modules)
      .map((m: any) => m.default as ReleaseData)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  else {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const DATA_DIR = path.resolve(__dirname, '../data')
    if (fs.existsSync(DATA_DIR)) {
      return fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .map((f) => {
          const fullPath = path.join(DATA_DIR, f)
          return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as ReleaseData
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
