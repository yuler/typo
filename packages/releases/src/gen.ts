/* eslint-disable no-console */
import type { ReleaseAsset, ReleaseData } from './types.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const versionArg = process.argv[2]

if (!versionArg) {
  console.error('Usage: pnpm --filter @typo/releases gen <version>')
  process.exit(1)
}

const version: string = versionArg

interface DeepSeekResponse {
  notes: string
  notes_i18n: {
    en: string[]
    zh: string[]
    jp: string[]
  }
}

async function main() {
  let envKey = process.env.DEEPSEEK_API_KEY
  if (!envKey) {
    try {
      const envPath = path.resolve(__dirname, '../../../.env')
      const envContent = await fs.readFile(envPath, 'utf-8')
      const lines = envContent.split('\n')
      const line = lines.find(l => l.startsWith('DEEPSEEK_API_KEY='))
      if (line) {
        const val = line.substring('DEEPSEEK_API_KEY='.length).trim()
        envKey = val.replace(/^["']|["']$/g, '')
      }
    }
    catch {
      // Ignore if file doesn't exist or read fails
    }
  }

  if (!envKey) {
    console.error('Error: DEEPSEEK_API_KEY environment variable is required.')
    process.exit(1)
  }

  try {
    // 1. Get git log since last tag or between tags if version exists
    const targetTag = `v${version.replace(/^v/, '')}`
    const { stdout: tagsOutput } = await execa('git', ['tag', '--sort=version:refname'])
    const tags = tagsOutput
      .split('\n')
      .map((t: string) => t.trim())
      .filter((t: string) => /^v\d/.test(t))

    let logRange = 'HEAD'
    if (tags.length > 0) {
      const index = tags.indexOf(targetTag)
      if (index === 0) {
        // First tag ever
        logRange = targetTag
      }
      else if (index > 0) {
        // Tag exists and has a previous tag
        const prevTag = tags[index - 1]!
        logRange = `${prevTag}..${targetTag}`
      }
      else {
        // Tag does not exist yet (i.e. running during bump)
        const lastTag = tags[tags.length - 1]!
        logRange = `${lastTag}..HEAD`
      }
    }

    const { stdout: commits } = await execa('git', ['log', `--pretty=%s`, logRange])
    const trimmedCommits = commits.trim()

    if (!trimmedCommits) {
      console.log('No commits found in log range. Skipping AI generation.')
      process.exit(0)
    }

    console.log(`Generating release notes for v${version} using range: ${logRange}...`)

    // 2. Call DeepSeek
    const prompt = `Summarize these commits for a release note. Group by features, fixes, etc. Provide English, Chinese, and Japanese translations. Return notes_i18n as an array of string bullet points (without markdown list formatting characters like '-' or '*').\n\nCommits:\n${trimmedCommits}\n\nOutput ONLY valid JSON with this exact structure: { "notes": "raw english summary with markdown", "notes_i18n": { "en": ["bullet 1", "bullet 2"], "zh": ["bullet 1", "bullet 2"], "jp": ["bullet 1", "bullet 2"] } }`

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
    const parsed = JSON.parse(resultJson) as DeepSeekResponse

    // 3. Read tauri.conf.json for dynamic assets
    const tauriConfigPath = path.resolve(__dirname, '../../../apps/desktop/src-tauri/tauri.conf.json')
    const tauriConfig = JSON.parse(await fs.readFile(tauriConfigPath, 'utf-8'))
    const productName = (tauriConfig.productName || 'typo') as string
    const targets = (tauriConfig.bundle?.targets || []) as string[]

    const targetToAssets: Record<string, (name: string, ver: string) => ReleaseAsset[]> = {
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
        assets.push(...assetGenerator(productName, version))
      }
    }
    assets.sort((a, b) => a.name.localeCompare(b.name))

    // 4. Format final payload
    const finalPayload: ReleaseData = {
      version,
      date: new Date().toISOString().split('T')[0] ?? '',
      github_url: `https://github.com/yuler/typo/releases/tag/v${version}`,
      notes: parsed.notes,
      notes_i18n: parsed.notes_i18n,
      assets,
    }

    // 5. Write file
    const outDir = path.resolve(__dirname, '../data')
    const outPath = path.join(outDir, `v${version}.json`)
    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(outPath, JSON.stringify(finalPayload, null, 2), 'utf-8')
    console.log(`Successfully wrote ${outPath}`)
  }
  catch (error) {
    console.error('Failed to generate notes:', error)
    process.exit(1)
  }
}

main()
