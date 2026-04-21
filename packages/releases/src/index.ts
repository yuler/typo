import type { ReleaseData } from './types'

// For simplicity, we'll manually list the releases for now.
// In a real scenario, we'd use import.meta.glob but that requires a bundler.
import v121 from '../data/v1.2.1.json'

export * from './types'

export const releases: ReleaseData[] = [
  v121 as unknown as ReleaseData,
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

export function getReleaseByVersion(version: string) {
  return releases.find(r => r.version === version)
}

export function getAssetUrl(version: string, assetName: string) {
  return `https://github.com/yuler/typo/releases/download/v${version}/${assetName}`
}
