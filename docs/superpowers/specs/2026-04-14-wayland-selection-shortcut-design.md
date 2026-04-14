# Typo Linux Wayland `--selection` Trigger Design

## Context

On Linux Wayland, Typo may not reliably receive global shortcuts in all applications.  
The product needs a reliable Wayland path that lets users trigger Typo through the desktop environment's custom shortcut mechanism.

This design applies only to Linux Wayland users.

## Goals

- Provide a stable user-trigger path for Linux Wayland via system custom shortcuts.
- Expose a CLI entry `typo --selection`.
- Reuse existing downstream Typo flow after text is obtained.
- Keep existing behavior unchanged on non-Wayland platforms.

## Non-goals

- Replacing all existing global shortcut logic across all platforms.
- Building compositor-specific integrations beyond system custom shortcuts.
- Refactoring unrelated text processing or AI request logic.

## User Experience

### Target users

Linux users running Wayland sessions.

### Setup instructions (documentation)

Typo documentation will explicitly guide users to:

1. Open `Settings -> Keyboard -> Custom Shortcuts`
2. Create a shortcut command: `typo --selection`
3. Bind key: `Ctrl + Shift + X`

### Runtime behavior

- When users trigger the system shortcut, Typo executes `typo --selection`.
- If Typo is already running, arguments are forwarded to the existing instance.
- If Typo is not running, startup still processes `--selection` after initialization.

## Platform gating

`--selection` selection-capture behavior is active only when:

- OS is Linux
- Session is Wayland

On other platforms/sessions, existing behavior remains unchanged.

## Technical design

### 1) Trigger entry and argument forwarding

Use existing single-instance wiring to support both cases:

- **Warm start**: second launch with `--selection` forwards argv to main instance.
- **Cold start**: first launch reads startup argv and triggers the same handler.

Define a shared handler (example name): `handle_selection_trigger`.

### 2) Selection capture pipeline (Linux Wayland path)

For Linux Wayland only, `handle_selection_trigger` runs:

1. Simulate `Ctrl + C` key action.
2. Wait a short delay (about 80-150ms) to allow clipboard updates.
3. Read text from clipboard.
4. Trim and validate text.
5. If non-empty, send text into existing Typo downstream flow.

This avoids relying on inaccessible direct selected-text APIs in problematic Wayland contexts.

### 3) Frontend/global-shortcut behavior

On Linux Wayland:

- Do not rely on Typo's internal global shortcut as the main trigger path.
- Users should use system custom shortcut with `typo --selection`.

On non-Linux-Wayland:

- Keep existing global shortcut registration and behavior.

## Error handling

- **Copy simulation failure**: log error and stop processing.
- **Clipboard read failure**: show actionable message and stop processing.
- **Empty clipboard text**: show "No selected text captured" style feedback.
- **Unexpected argument state**: ignore safely with logs.

## Compatibility and regression expectations

- Linux Wayland: system shortcut path becomes reliable default.
- Linux X11/macOS/Windows: no behavioral regression expected.
- Existing text typing/paste and AI request flow remains unchanged.

## Test plan

### Manual validation

1. **Linux Wayland + Typo already running**
   - Trigger system shortcut bound to `typo --selection`.
   - Verify selected text is captured and enters Typo flow.
2. **Linux Wayland + Typo not running**
   - Trigger system shortcut.
   - Verify app starts and still executes `--selection`.
3. **Linux non-Wayland**
   - Verify existing shortcut path remains functional.
4. **macOS/Windows**
   - Smoke-check existing shortcut flow.
5. **Error scenarios**
   - No selection / clipboard unavailable / copy blocked.
   - Verify clear feedback and no crash.

## Risks and mitigations

- **Risk**: Clipboard race after `Ctrl + C`.
  - **Mitigation**: bounded delay and optional one retry read.
- **Risk**: Some apps block synthetic key events.
  - **Mitigation**: clear docs and user feedback when capture fails.
- **Risk**: Session detection ambiguity.
  - **Mitigation**: explicit Linux + Wayland checks and logging.

## Rollout notes

- Update README Wayland section with explicit setup steps and command.
- Keep legacy notes for X11 fallback where still useful.
- This design intentionally limits scope to Linux Wayland only.

