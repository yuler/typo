import type { ReleaseAsset, ReleaseData } from './types.js'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import { execa } from 'execa'

const pathExists = (p: string) => fs.access(p).then(() => true).catch(() => false)
const readJson = (p: string) => fs.readFile(p, 'utf8').then(JSON.parse)
const writeJson = (p: string, d: any) => fs.writeFile(p, JSON.stringify(d, null, 2))
const ensureDir = (p: string) => fs.mkdir(p, { recursive: true })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')

async function main() {
  p.intro('Pulling release data from GitHub')

  const spin = p.spinner()
  spin.start('Fetching release list...')

  let releaseList: any[] = []
  try {
    const { stdout } = await execa('gh', ['release', 'list', '--limit', '100', '--json', 'tagName,name'])
    releaseList = JSON.parse(stdout)
  }
  catch (error) {
    spin.stop('Failed to fetch release list')
    p.log.error(`Error: ${(error as any).message}`)
    process.exit(1)
  }

  spin.stop('Release list fetched')

  if (releaseList.length === 0) {
    p.note('No releases found.')
    process.exit(0)
  }

  const selectedTags = await p.multiselect({
    message: 'Select tags to pull information for:',
    options: releaseList.map((r: any) => ({
      value: r.tagName,
      label: `${r.tagName} (${r.name || 'No name'})`,
    })),
  })

  if (p.isCancel(selectedTags) || (selectedTags as string[]).length === 0) {
    p.outro('Cancelled')
    process.exit(0)
  }

  const tags = selectedTags as string[]

  for (const tag of tags) {
    const spin = p.spinner()
    spin.start(`Fetching details for ${tag}...`)

    let release: any
    try {
      const { stdout } = await execa('gh', ['release', 'view', tag, '--json', 'tagName,name,publishedAt,url,assets,body'])
      release = JSON.parse(stdout)
    }
    catch (error) {
      spin.stop(`Failed to fetch details for ${tag}`)
      p.log.error(`Error: ${(error as any).message}`)
      continue
    }

    const assets: ReleaseAsset[] = release.assets
      .map((a: any) => {
        let platform: 'macos' | 'linux' | 'windows' | undefined
        if (a.name.endsWith('.dmg'))
          platform = 'macos'
        else if (a.name.endsWith('.msi') || a.name.endsWith('.exe'))
          platform = 'windows'
        else if (a.name.endsWith('.deb') || a.name.endsWith('.AppImage') || a.name.endsWith('.rpm'))
          platform = 'linux'

        if (!platform)
          return null

        return {
          name: a.name,
          platform,
        }
      })
      .filter((a: ReleaseAsset | null): a is ReleaseAsset => a !== null)

    let latestNotes = release.body || ''
    const tmpDir = path.join(os.tmpdir(), `typo-pull-${Date.now()}`)
    await ensureDir(tmpDir)

    try {
      await execa('gh', ['release', 'download', tag, '--pattern', 'latest.json', '--dir', tmpDir])
      const latestJsonPath = path.join(tmpDir, 'latest.json')
      if (await pathExists(latestJsonPath)) {
        const latestJson = await readJson(latestJsonPath)
        if (latestJson.notes)
          latestNotes = latestJson.notes
      }
    }
    catch {
      // Ignore error if latest.json not found
    }
    finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }

    const data: ReleaseData = {
      version: tag.replace(/^v/, ''),
      date: release.publishedAt.split('T')[0],
      github_url: release.url,
      notes: latestNotes as string,
      notes_i18n: {
        en: latestNotes,
        zh: '',
        jp: '',
      },
      assets,
    }

    // Try to preserve existing notes if file exists
    const filePath = path.join(DATA_DIR, `${tag}.json`)
    const notesPath = path.join(DATA_DIR, `${tag}.release.notes`)

    await ensureDir(DATA_DIR)
    await writeJson(filePath, data)

    // Save remote markdown body to .release.notes
    await fs.writeFile(notesPath, release.body || '')
    spin.stop(`Saved ${tag}.json and ${tag}.release.notes`)
  }

  p.outro('All selected releases pulled!')
}

main().catch(console.error)
