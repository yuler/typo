import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const version = process.argv[2]
const envKey = process.env.DEEPSEEK_API_KEY

if (!version) {
  console.error('Usage: node scripts/generate-notes.js <version>')
  process.exit(1)
}

if (!envKey) {
  console.error('Error: DEEPSEEK_API_KEY environment variable is required.')
  process.exit(1)
}

async function main() {
  try {
    // 1. Get git log since last tag
    const lastTag = execSync('git tag --sort=version:refname | tail -n 1').toString().trim()
    const logRange = lastTag ? `${lastTag}..HEAD` : 'HEAD'
    const commits = execSync(`git log --pretty="%s" ${logRange}`).toString().trim()

    if (!commits) {
      console.log('No commits found since last tag. Skipping AI generation.')
      process.exit(0)
    }

    console.log(`Generating release notes for v${version}...`)

    // 2. Call DeepSeek
    const prompt = `Summarize these commits for a release note. Group by features, fixes, etc. Provide English, Chinese, and Japanese translations.\n\nCommits:\n${commits}\n\nOutput ONLY valid JSON with this exact structure: { "notes": "raw english summary with markdown", "notes_i18n": { "en": "english", "zh": "chinese", "jp": "japanese" } }`

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

    const data = await response.json()
    const resultJson = data.choices[0].message.content.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(resultJson)

    // 3. Read tauri.conf.json for dynamic assets
    const tauriConfigPath = path.join(process.cwd(), 'apps/desktop/src-tauri/tauri.conf.json')
    const tauriConfig = JSON.parse(await fs.readFile(tauriConfigPath, 'utf-8'))
    const productName = tauriConfig.productName || 'typo'
    const targets = tauriConfig.bundle?.targets || []

    const targetToAssets = {
      deb: (name, ver) => [{ name: `${name}_${ver}_amd64.deb`, platform: 'linux' }],
      appimage: (name, ver) => [{ name: `${name}_${ver}_amd64.AppImage`, platform: 'linux' }],
      dmg: (name, ver) => [
        { name: `${name}_${ver}_aarch64.dmg`, platform: 'macos' },
        { name: `${name}_${ver}_x64.dmg`, platform: 'macos' },
      ],
      nsis: (name, ver) => [{ name: `${name}_${ver}_x64-setup.exe`, platform: 'windows' }],
    }

    const assets = []
    for (const target of targets) {
      if (targetToAssets[target]) {
        assets.push(...targetToAssets[target](productName, version))
      }
    }
    assets.sort((a, b) => a.name.localeCompare(b.name))

    // 4. Format final payload
    const finalPayload = {
      version,
      date: new Date().toISOString().split('T')[0],
      github_url: `https://github.com/yuler/typo/releases/tag/v${version}`,
      notes: parsed.notes,
      notes_i18n: parsed.notes_i18n,
      assets,
    }

    // 4. Write file
    const outPath = path.join(process.cwd(), 'packages/releases/data', `v${version}.json`)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, JSON.stringify(finalPayload, null, 2), 'utf-8')
    console.log(`Successfully wrote ${outPath}`)
  }
  catch (error) {
    console.error('Failed to generate notes:', error)
    process.exit(1)
  }
}

main()
