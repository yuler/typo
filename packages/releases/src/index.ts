import type { ReleaseData } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')

export * from './types'

export const releases: ReleaseData[] = fs.readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json'))
  .map((f) => {
    const fullPath = path.join(DATA_DIR, f)
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as ReleaseData
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

export function getReleaseByVersion(version: string) {
  return releases.find(r => r.version === version)
}

export function getAssetUrl(version: string, assetName: string) {
  return `https://github.com/yuler/typo/releases/download/v${version}/${assetName}`
}
