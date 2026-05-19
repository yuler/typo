# Desktop Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate desktop release notes generation locally using DeepSeek AI and trigger instant GitHub release publishing.

**Architecture:** A local Node.js script fetches git logs, calls DeepSeek AI to summarize and translate notes, and saves a JSON file. The `bump.sh` script executes this script and commits the result. The GitHub Action is updated to publish immediately.

**Tech Stack:** Node.js (ES Modules, native `fetch`), Bash, GitHub Actions, DeepSeek API.

---

### Task 1: Create local release notes generation script

**Files:**
- Create: `scripts/generate-notes.js`

- [ ] **Step 1: Write the failing script execution test**

Create a dry-run call to verify arguments.

Run: `node scripts/generate-notes.js`
Expected: FAIL with "Usage: node generate-notes.js <version> [apiKey]"

- [ ] **Step 2: Write minimal implementation for argument parsing**

```javascript
// scripts/generate-notes.js
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
```

- [ ] **Step 3: Run test to verify argument parsing**

Run: `DEEPSEEK_API_KEY=test node scripts/generate-notes.js 1.4.1`
Expected: PASS (exits with 0)

- [ ] **Step 4: Implement git log extraction and AI generation**

Append to `scripts/generate-notes.js`:

```javascript
async function main() {
  try {
    // 1. Get git log since last tag
    const lastTag = execSync('git tag --sort=version:refname | tail -n 1').toString().trim();
    const commits = execSync(`git log --pretty="%s" ${lastTag}..HEAD`).toString().trim();

    if (!commits) {
      console.log("No commits found since last tag. Skipping AI generation.");
      process.exit(0);
    }

    console.log(`Generating release notes for v${version}...`);

    // 2. Call DeepSeek
    const prompt = `Summarize these commits for a release note. Group by features, fixes, etc. Provide English, Chinese, and Japanese translations.\n\nCommits:\n${commits}\n\nOutput ONLY valid JSON with this exact structure: { "notes": "raw english summary with markdown", "notes_i18n": { "en": "english", "zh": "chinese", "jp": "japanese" } }`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
    const resultJson = data.choices[0].message.content;
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
    await fs.writeFile(outPath, JSON.stringify(finalPayload, null, 2), 'utf-8');
    console.log(`Successfully wrote ${outPath}`);

  } catch (error) {
    console.error("Failed to generate notes:", error);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-notes.js
git commit -m "feat: add local release notes generation script"
```

---

### Task 2: Integrate script into bump workflow

**Files:**
- Modify: `scripts/bump.sh:37-43`

- [ ] **Step 1: Write integration in bump script**

Modify `scripts/bump.sh` to run the node script and stage the generated JSON before the git commit.

```bash
# ... existing code ...
# Tag notes
last_tag=$(git tag --sort=version:refname | tail -n 1)
notes=$(git log --pretty="%s" $last_tag..HEAD)

# --- NEW ADDITION ---
# Generate AI release notes and translations
echo "Generating AI release notes..."
node ./scripts/generate-notes.js "$package_version" || echo "Warning: AI notes generation failed, proceeding with standard bump."
# ------------------

git add -A
git commit --message "🚀 Release v$package_version"
# ... existing code ...
```

- [ ] **Step 2: Dry-run verify syntax**

Run: `bash -n scripts/bump.sh`
Expected: PASS (no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add scripts/bump.sh
git commit -m "feat: integrate AI release notes generation into bump script"
```

---

### Task 3: Enable automatic CI publishing

**Files:**
- Modify: `.github/workflows/desktop-release.yml`

- [ ] **Step 1: Check existing releaseDraft config**

Run: `grep "releaseDraft" .github/workflows/desktop-release.yml`
Expected: Output showing `releaseDraft: true`

- [ ] **Step 2: Update configuration**

In `.github/workflows/desktop-release.yml`, change `releaseDraft: true` to `releaseDraft: false`.

```yaml
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: apps/desktop
          tagName: v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version.
          releaseName: v__VERSION__
          releaseBody: ${{ steps.tag.outputs.message }}
          releaseDraft: false
          prerelease: false
          # includeDebug: true
          args: ${{ matrix.args }}
```

- [ ] **Step 3: Verify update**

Run: `grep "releaseDraft" .github/workflows/desktop-release.yml`
Expected: Output showing `releaseDraft: false`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/desktop-release.yml
git commit -m "ci: disable draft releases to publish instantly"
```