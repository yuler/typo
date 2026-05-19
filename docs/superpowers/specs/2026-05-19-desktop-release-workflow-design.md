# Desktop Release Workflow Redesign

## Objective
Redesign the current `typo` desktop release workflow to eliminate manual bottlenecks and enable faster shipping during the alpha phase.

## Current Bottleneck
The current process requires waiting for the GitHub Actions CI (which builds the Tauri apps across platforms) to create a draft release. Only then can the developer manually pull the release notes, translate/curate them into the `notes_i18n` field, and push them back. This blocks the developer during the slow CI build phase.

## Proposed Solution
Decouple the release notes generation from the CI build by automating it locally with AI during the `pnpm bump` step. This allows the developer to review and commit the finalized release data instantly, enabling the CI pipeline to publish the release automatically without requiring manual follow-up.

## Architecture & Data Flow

1. **Local Release Notes Generation (`scripts/generate-notes.js`)**:
   - **Trigger**: Called by `scripts/bump.sh` after the version has been bumped but before the release commit.
   - **Input**: The script extracts the raw `git log` messages between the last tag and HEAD.
   - **Processing**: It reads the `DEEPSEEK_API_KEY` from the environment/`.env`. It makes a direct REST API call (via native Node.js `fetch`) to DeepSeek (`api.deepseek.com/v1/chat/completions`). The prompt will instruct the model to summarize the commits and output a JSON structure containing the `notes` (English raw summary) and `notes_i18n` (translations in English, Chinese, and Japanese).
   - **Output**: Writes the validated JSON payload into a new file: `packages/releases/data/v<VERSION>.json`.

2. **Bump Script Adjustments (`scripts/bump.sh`)**:
   - Executes `node ./scripts/generate-notes.js $package_version`.
   - Stages the newly created `packages/releases/data/v$package_version.json` file.
   - Commits this file alongside the standard `package.json` and `Cargo.toml` version bumps.
   - Tags the release and pushes to the origin.

3. **CI Pipeline Automation (`.github/workflows/desktop-release.yml`)**:
   - Modifies the GitHub Action configuration by setting `releaseDraft: false`.
   - Once the binaries for macOS, Linux, and Windows are successfully built, the CI automatically publishes the GitHub Release.

## Error Handling & Fallbacks
- If `DEEPSEEK_API_KEY` is missing or the AI API call fails, the `generate-notes.js` script will gracefully fail or prompt the developer, preventing a malformed JSON from being committed.
- The developer retains the ability to manually inspect the generated `v<VERSION>.json` file locally if needed, since it is generated *before* the push.

## Scope & Constraints
- **Dependencies**: No external npm packages (e.g., `openai` or `ai-sdk`) will be added to the root. The script relies on native Node.js features (ES Modules, `fetch`).
- **AI Model**: Strictly utilizes the DeepSeek API as requested by the user.

## Testing Strategy
- Dry-run the `generate-notes.js` script locally with mock git logs to verify the DeepSeek API interaction and JSON formatting.
- Perform a complete test of `pnpm bump` (potentially with a test patch version) to ensure the script integrates correctly and the correct files are staged and committed.