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
  p.intro('Pushing release data')

  if (!await pathExists(DATA_DIR)) {
    p.log.error('Data directory does not exist. Please run pull first.')
    process.exit(1)
  }

  const files = (await fs.readdir(DATA_DIR)).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    p.log.error('No release data files found in packages/releases/data/')
    process.exit(1)
  }

  const selectedFiles = await p.multiselect({
    message: 'Select releases to push/update:',
    options: files.map(f => ({ value: f, label: f })),
  })

  if (p.isCancel(selectedFiles) || (selectedFiles as string[]).length === 0) {
    p.outro('Cancelled')
    process.exit(0)
  }

  for (const fileName of (selectedFiles as string[])) {
    const tag = fileName.replace('.json', '')
    const filePath = path.join(DATA_DIR, fileName)
    const notesPath = path.join(DATA_DIR, `${tag}.release.notes`)

    p.log.message(`\nProcessing ${tag}...`)

    const tmpDir = path.join(os.tmpdir(), `typo-push-${Date.now()}`)
    await ensureDir(tmpDir)

    try {
      const spin = p.spinner()
      spin.start(`Downloading latest.json from release ${tag}...`)

      await execa('gh', ['release', 'download', tag, '--pattern', 'latest.json', '--dir', tmpDir])

      const latestJsonPath = path.join(tmpDir, 'latest.json')
      if (!await pathExists(latestJsonPath)) {
        spin.stop(`Warning: latest.json not found in release ${tag}. Skipping.`)
        continue
      }

      const latestJson = await readJson(latestJsonPath)
      spin.stop(`Downloaded latest.json for ${tag}`)

      // Read local notes and json
      if (!await pathExists(notesPath)) {
        p.log.error(`No release notes found for ${tag} at ${notesPath}`)
        continue
      }

      const data = await readJson(filePath)

      // Update GitHub latest.json's notes field from LOCAL json's notes.en
      latestJson.notes = data.notes
      latestJson.notes_i18n = data.notes_i18n

      await writeJson(latestJsonPath, latestJson)

      const pushSpin = p.spinner()
      pushSpin.start(`Updating GitHub release assets and markdown for ${tag}...`)

      // Update assets (latest.json and the versioned JSON)
      await execa('gh', ['release', 'upload', tag, latestJsonPath, filePath, '--clobber'])

      // Update Release Page markdown description
      await execa('gh', ['release', 'edit', tag, '--notes-file', notesPath])

      pushSpin.stop(`Successfully updated ${tag} on GitHub`)
    }
    catch (error) {
      p.log.error(`Error processing ${tag}: ${(error as any).message}`)
    }
    finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  }

  p.outro('All selected releases processed!')
}

main().catch((err) => {
  p.log.error(`Fatal error: ${err.message}`)
  process.exit(1)
})
