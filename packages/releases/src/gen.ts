/* eslint-disable no-console */
import type { ReleaseAsset, ReleaseData } from './types.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface DeepSeekResponse {
  notes: string
  notes_i18n: {
    en: string[]
    zh: string[]
    jp: string[]
  }
}

async function getEnvKey(): Promise<string> {
  if (process.env.DEEPSEEK_API_KEY)
    return process.env.DEEPSEEK_API_KEY

  try {
    const envPath = path.resolve(__dirname, '../../../.env')
    const envContent = await fs.readFile(envPath, 'utf-8')
    const line = envContent.split('\n').find(l => l.startsWith('DEEPSEEK_API_KEY='))
    if (line) {
      const val = line.substring('DEEPSEEK_API_KEY='.length).trim()
      return val.replace(/^["']|["']$/g, '')
    }
  }
  catch {
    // Ignore read errors
  }

  throw new Error('DEEPSEEK_API_KEY environment variable is required.')
}

async function getGitLog(version: string): Promise<{ logRange: string, commits: string }> {
  const targetTag = `v${version.replace(/^v/, '')}`
  const { stdout: tagsOutput } = await execa('git', ['tag', '--sort=version:refname'])

  const tags = tagsOutput
    .split('\n')
    .map(t => t.trim())
    .filter(t => /^v\d/.test(t))

  let logRange = 'HEAD'
  if (tags.length > 0) {
    const index = tags.indexOf(targetTag)
    if (index === 0) {
      logRange = targetTag
    }
    else if (index > 0) {
      logRange = `${tags[index - 1]}..${targetTag}`
    }
    else {
      logRange = `${tags[tags.length - 1]}..HEAD`
    }
  }

  const { stdout: commits } = await execa('git', [
    'log',
    '--pretty=%s',
    '--grep=\\[releases\\]',
    '--invert-grep',
    logRange,
  ])

  return { logRange, commits: commits.trim() }
}

async function generateReleaseNotes(commits: string, envKey: string): Promise<DeepSeekResponse> {
  const prompt = `Summarize these commits for a release note. Group by features, fixes, etc. Provide English, Chinese, and Japanese translations. Return notes_i18n as an array of string bullet points (without markdown list formatting characters like '-' or '*').\n\nCommits:\n${commits}\n\nOutput ONLY valid JSON with this exact structure: { "notes": "raw english summary with markdown", "notes_i18n": { "en": ["bullet 1", "bullet 2"], "zh": ["bullet 1", "bullet 2"], "jp": ["bullet 1", "bullet 2"] } }`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${envKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API failed: ${response.statusText}`)
  }

  const resJson = await response.json() as any
  const resultJson = resJson.choices[0].message.content.replace(/```json\n?|```/g, '').trim()
  return JSON.parse(resultJson) as DeepSeekResponse
}

async function getReleaseAssets(version: string): Promise<ReleaseAsset[]> {
  const tauriConfigPath = path.resolve(__dirname, '../../../apps/desktop/src-tauri/tauri.conf.json')
  const tauriConfig = JSON.parse(await fs.readFile(tauriConfigPath, 'utf-8'))
  const productName = (tauriConfig.productName || 'typo') as string
  const targets = (tauriConfig.bundle?.targets || []) as string[]

  const targetToAssets: Record<string, (name: string, ver: string) => Omit<ReleaseAsset, 'url'>[]> = {
    deb: (name, ver) => [{ name: `${name}_${ver}_amd64.deb`, platform: 'linux' }],
    appimage: (name, ver) => [{ name: `${name}_${ver}_amd64.AppImage`, platform: 'linux' }],
    dmg: (name, ver) => [
      { name: `${name}_${ver}_aarch64.dmg`, platform: 'macos' },
      { name: `${name}_${ver}_x64.dmg`, platform: 'macos' },
    ],
    nsis: (name, ver) => [{ name: `${name}_${ver}_x64-setup.exe`, platform: 'windows' }],
  }

  const assets: ReleaseAsset[] = []
  for (const target of targets) {
    const assetGenerator = targetToAssets[target]
    if (assetGenerator) {
      assets.push(...assetGenerator(productName, version).map(a => ({
        ...a,
        url: `https://github.com/yuler/typo/releases/download/v${version}/${a.name}`,
      })))
    }
  }

  return assets.sort((a, b) => a.name.localeCompare(b.name))
}

async function main() {
  const version = process.argv[2]
  if (!version) {
    console.error('Usage: pnpm --filter @typo/releases gen <version>')
    process.exit(1)
  }

  try {
    const envKey = await getEnvKey()

    const { logRange, commits } = await getGitLog(version)
    if (!commits) {
      console.log(`No commits found in range ${logRange}. Skipping AI generation.`)
      process.exit(0)
    }

    console.log(`Generating release notes for v${version} using range: ${logRange}...`)

    const parsedNotes = await generateReleaseNotes(commits, envKey)
    const assets = await getReleaseAssets(version)

    const finalPayload: ReleaseData = {
      version,
      date: new Date().toISOString().split('T')[0] ?? '',
      github_url: `https://github.com/yuler/typo/releases/tag/v${version}`,
      notes: parsedNotes.notes,
      notes_i18n: parsedNotes.notes_i18n,
      assets,
    }

    const outDir = path.resolve(__dirname, '../data')
    const outPath = path.join(outDir, `v${version}.json`)

    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(outPath, JSON.stringify(finalPayload, null, 2), 'utf-8')

    console.log(`Successfully wrote ${outPath}`)
  }
  catch (error) {
    console.error('Failed to generate notes:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
