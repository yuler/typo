import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const version = process.argv[2];
const envKey = process.env.DEEPSEEK_API_KEY;

if (!version) {
  console.error("Usage: node scripts/generate-notes.js <version>");
  process.exit(1);
}

if (!envKey) {
  console.error("Error: DEEPSEEK_API_KEY environment variable is required.");
  process.exit(1);
}

async function main() {
  try {
    // 1. Get git log since last tag
    const lastTag = execSync('git tag --sort=version:refname | tail -n 1').toString().trim();
    const logRange = lastTag ? `${lastTag}..HEAD` : 'HEAD';
    const commits = execSync(`git log --pretty="%s" ${logRange}`).toString().trim();

    if (!commits) {
      console.log("No commits found since last tag. Skipping AI generation.");
      process.exit(0);
    }

    console.log(`Generating release notes for v${version}...`);

    // 2. Call DeepSeek
    const prompt = `Summarize these commits for a release note. Group by features, fixes, etc. Provide English, Chinese, and Japanese translations.\n\nCommits:\n${commits}\n\nOutput ONLY valid JSON with this exact structure: { "notes": "raw english summary with markdown", "notes_i18n": { "en": "english", "zh": "chinese", "jp": "japanese" } }`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${envKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const resultJson = data.choices[0].message.content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(resultJson);

    // 3. Format final payload
    const finalPayload = {
      version,
      date: new Date().toISOString().split('T')[0],
      github_url: `https://github.com/yuler/typo/releases/tag/v${version}`,
      notes: parsed.notes,
      notes_i18n: parsed.notes_i18n,
      assets: [
        { name: `typo_${version}_aarch64.dmg`, platform: "macos" },
        { name: `typo_${version}_amd64.AppImage`, platform: "linux" },
        { name: `typo_${version}_amd64.deb`, platform: "linux" },
        { name: `typo_${version}_x64-setup.exe`, platform: "windows" },
        { name: `typo_${version}_x64.dmg`, platform: "macos" }
      ]
    };

    // 4. Write file
    const outPath = path.join(process.cwd(), 'packages/releases/data', `v${version}.json`);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(finalPayload, null, 2), 'utf-8');
    console.log(`Successfully wrote ${outPath}`);

  } catch (error) {
    console.error("Failed to generate notes:", error);
    process.exit(1);
  }
}

main();
