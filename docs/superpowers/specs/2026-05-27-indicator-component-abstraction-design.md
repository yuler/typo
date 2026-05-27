# Design: Abstracting Indicator Component

## Overview
The goal is to extract the `Indicator.vue` UI component from the `apps/desktop` Tauri application into a standalone, framework-agnostic (Vue 3) pure UI component located in a new shared package: `packages/ui`. This allows the component to be reused across the `typo` ecosystem, specifically enabling a live interactive demo on the `apps/www` marketing site.

## Architecture & Responsibilities

### `packages/ui` (New Shared Package)
A new workspace package dedicated to shared Vue 3 components and UI utilities.
- **Dependencies**: `vue`, `lucide-vue-next`, `clsx`, `tailwind-merge` (for the `cn` utility).
- **Exports**: `Indicator` and `AppLogo` components.
- **Build**: Uses `tsc` (or `vue-tsc`) to generate type declarations if needed, but since it's an internal workspace package consumed by Vite/Astro, exporting raw `.vue` and `.ts` files is sufficient.

### `Indicator.vue` (The Pure UI Component)
Located at `packages/ui/src/components/Indicator.vue`.
- **Role**: Strictly a presentational ("dumb") component. It will contain NO Tauri-specific APIs, NO global state management, and NO business logic regarding AI text processing or shortcut handling.
- **Props**:
  - `state` (`'idle' | 'processing' | 'result' | 'error'`): Drives the visual mode.
  - `inputText` (`string`): The text being analyzed.
  - `commandName` (`string`): The specific slash command invoked (e.g., `/fix`).
  - `resultText` (`string`): The generated correction/result.
  - `errorText` (`string`): Error message to display.
  - `copyResult` (`boolean`): Determines if the "Copied" badge is shown in the result state.
  - `globalShortcut` (`string`): The raw shortcut string (e.g., `CommandOrControl+Shift+X`).
  - `isMacOS` (`boolean`): Flag to correctly format the shortcut display (Cmd vs Ctrl).
  - `isRateLimited` (`boolean`): Affects the styling/behavior of the error state.
  - `labels` (`{ copied?: string }`): Optional dictionary for i18n overrides.
- **Events**:
  - `esc`: Fired when the user presses the Escape key while focused on the component.
  - `settings`: Fired when the user clicks the settings gear icon.
  - `error-click`: Fired when the user clicks the error message text.
- **Styling**: Retains the custom CSS for the `indicator-border-runner` animation and layout constraints.

### `AppLogo.vue` (Shared Logo Component)
Located at `packages/ui/src/components/AppLogo.vue`.
- **Role**: Displays the application logo.
- **Changes**: Will be moved from `apps/desktop/src/components/AppLogo.vue`. Since it relies on local SVG assets (`@/assets/logo.svg`), we will configure it to either accept the logo source as a prop, or we will move the necessary logo assets into `packages/ui/assets` to be bundled with the component.

### `apps/desktop` (The Consumer)
- The desktop app will import `Indicator` from `@typo/ui`.
- The current `src/windows/Indicator.vue` file will become a **wrapper/controller**. It will manage the Tauri window resizing logic, handle `invoke` commands, listen for global events, and pass the required state down as props to the shared `Indicator` component.

## Implementation Steps

1. **Scaffold `packages/ui`**:
   - Create directory structure: `packages/ui/src/components`, `packages/ui/src/lib`.
   - Initialize `package.json` specifying `"name": "@typo/ui"` and necessary `peerDependencies`.
   - Setup `tsconfig.json` extending the workspace base.
   - Add `@typo/ui` to the top-level `pnpm-workspace.yaml` if not already wildcard matched.

2. **Migrate UI Utilities**:
   - Move `cn` utility from `apps/desktop/src/lib/utils.ts` to `packages/ui/src/lib/utils.ts`.
   - Move `formatShortcut` utility from `apps/desktop/src/utils.ts` to `packages/ui/src/lib/utils.ts`.

3. **Migrate Components**:
   - Move `AppLogo.vue` to `packages/ui` and ensure logo SVGs are accessible.
   - Extract the `<template>` and `<style>` blocks from `apps/desktop/src/windows/Indicator.vue` into the new `packages/ui/src/components/Indicator.vue`.
   - Define the `defineProps` and `defineEmits` interfaces in the new component.
   - Ensure `lucide-vue-next` icons are correctly imported in the new component.

4. **Refactor Desktop App**:
   - Update `apps/desktop/src/windows/Indicator.vue` to import and use `<Indicator ... />` from `@typo/ui`.
   - Replace local `state`, `inputText`, etc., bindings with props passed to the child component.
   - Wire up the emitted events (`@settings`, `@esc`, `@error-click`) to the existing handler functions (`gotoSettings`, `onESC`, etc.).
   - Ensure the Tauri window size calculation (`estimateIndicatorContentWidth`) remains in the wrapper since it depends on measuring text.

5. **Expose package**:
   - Add `packages/ui/src/index.ts` to export the components and utilities.
   - Run `pnpm install` at the workspace root to link the new package.

## Future Considerations
- Once the abstraction is complete and verified in the desktop app, the `apps/www` marketing site can import `@typo/ui` and use the `Indicator` component to build an interactive live demo.