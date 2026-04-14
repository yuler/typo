# Linux / Wayland global shortcuts — design

**Status:** Draft (brainstorming output)  
**Date:** 2026-04-14  
**Product:** Typo (Tauri 2)  
**Distribution priority:** GitHub Release artifacts (e.g. AppImage / generic Linux builds), heterogeneous user environments — not Flatpak-first.

## 1. Goals and success criteria

### Goals

- On **Wayland** with common desktops (GNOME, KDE, and similar), Typo’s **global** shortcuts (currently `CommandOrControl+Shift+X` and `CommandOrControl+,`) should work **without root**, whenever the host provides a suitable **XDG Desktop Portal** stack and the user completes any required OS permission flow.
- On **X11**, behavior should remain equivalent to today or improve (clearer failure modes).

### Success criteria

- With a typical Wayland session where `xdg-desktop-portal` and an appropriate backend are installed, and the user has granted shortcut registration where required, both shortcuts reliably trigger the same workflows as today.
- When Portal-based registration is **not** available or fails, the app must **not** fail silently: the user sees a visible signal (settings copy, notification, and/or tray-adjacent guidance) plus a pointer to the relevant README or doc section.

### Non-goals (initial scope)

- **evdev** as a default or supported first-class path is **out of scope** for this design revision: it implies extra permissions (`input` group or similar) and diverges from the no-root primary story. It may be revisited later as an optional appendix for power users.

## 2. Context (current codebase)

- Frontend: `@tauri-apps/plugin-global-shortcut` in `src/shortcut.ts` with **hard-coded** shortcuts.
- Backend: `tauri-plugin-global-shortcut` registered in `src-tauri/src/lib.rs`.
- README: documents Wayland/X11 mainly for **target applications** (e.g. VS Code); does not yet define Typo’s own global-shortcut strategy on Wayland.

## 3. Approach selection


| Approach                                    | Summary                                                                                                                                     | Verdict                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **A. Runtime detection + layered backends** | Wayland → Portal `GlobalShortcuts` first; unify dispatch with existing shortcut flows; fall back to plugin then user-visible errors + docs. | **Primary**                                        |
| **B. Documentation / env vars only**        | Low engineering cost; does not solve global capture when focus is on native Wayland clients.                                                | Supplement to A (user escape hatches)              |
| **C. Per-desktop D-Bus**                    | GNOME/KDE-specific integrations.                                                                                                            | Not primary (maintenance vs unknown Release users) |


## 4. Architecture and data flow

### 4.1 Session capabilities

- At startup (Rust), detect or infer **session type** (Wayland vs X11 vs unknown) and whether **Portal GlobalShortcuts** should be attempted (exact heuristics left to implementation planning).
- Expose a small **platform / shortcut backend** summary to the frontend (new or existing `invoke`) so UI can show accurate status strings.

### 4.2 Binding order (conceptual)

1. **Wayland:** Register shortcuts via **XDG Desktop Portal** `org.freedesktop.portal.GlobalShortcuts` (e.g. Rust `ashpd` or equivalent), using stable logical IDs mapped to the same two shortcuts as today.
2. **Unified dispatch:** Whether the trigger comes from Portal or from `tauri-plugin-global-shortcut`, route into **one** code path that performs today’s behavior (invoke `get_selected_text`, window visibility, emits, etc.) — avoid duplicated business logic.
3. **Fallback:** If Portal registration fails or is skipped, try the **existing global-shortcut plugin** (still useful on X11 and some environments).
4. **Terminal state:** If both fail, enter a **documented error / degraded** state with user-visible messaging.

### 4.3 Frontend coordination

- `src/shortcut.ts` must not double-register the same physical shortcuts. Implementation options (choose during planning): backend owns all global registration on Linux Wayland; frontend only registers when backend reports “plugin path active”; or frontend becomes a thin client of backend events only on Linux. Exact shape is an implementation detail; the invariant is **single owner per shortcut at runtime**.

## 5. Errors, UX, and documentation

- **Visibility:** Registration failure must surface beyond `console.error` (settings banner, startup notification, and/or tray context — at least one durable or semi-durable channel).
- **README:** Keep existing guidance for **target apps** under Wayland; **add** a section that Typo itself on Wayland relies on **Portal** for global shortcuts when using the Portal path; document env-var **workarounds** with explicit **limitations** (e.g. cannot fix all “Wayland target + Wayland Typo” combinations).
- **AppImage / generic binaries:** Do not bundle portal implementations; assume the host provides `xdg-desktop-portal` and a backend (standard on mainstream distros with full desktops).

## 6. Release and CI notes

- Current `.github/workflows/release.yml` builds Linux via `tauri-action` on `ubuntu-22.04` with WebKitGTK and related packages; no change required for this design by itself. Portal behavior is a **runtime** property of the user’s session, not the CI image.

## 7. Future work (optional)

- **evdev** mode: documented only as a possible future **opt-in** path with group membership and security trade-offs — not part of the initial implementation mandate from this spec.
- **User-rebindable shortcuts:** Not present today; any Portal binding refresh rules would be defined when rebinding is introduced.

## 8. Decisions captured

- **Distribution priority:** GitHub Release / generic Linux packages first (not Flatpak-first).
- **Technical direction:** Primary path **A** — runtime detection with Portal `GlobalShortcuts` on Wayland, unified dispatch, plugin fallback, then visible failure + documentation.
- If any item above does not match stakeholder intent, edit this file before implementation planning begins.