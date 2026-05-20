# Desktop Home Page Stats Loading, Animation & Prompt Settings Navigation Design

Design specification for adding stats card loading skeletons, count-up animations for numeric statistics, a premium Default System Prompt preview banner, and click-through navigation settings.

## Goal Description

Currently, the `AppHome.vue` dashboard loads numeric stats (Completions & Slash Prompts) instantly without visual loading states or entry animations. Furthermore, there's no way to quickly see the active Default System Prompt on the dashboard, nor can users click the stats/prompt elements to quickly navigate to their respective settings pages.

This design introduces:
1. **Interactive Navigation**: Clickable stats and prompt cards that deep-link to the exact settings tab in the sidebar.
2. **Default System Prompt Preview Banner**: A high-fidelity card displaying a preview of the active default prompt.
3. **Skeleton Loading**: Pulsing shimmer state during API data fetching.
4. **Count-Up Animations**: A native deceleration-based numeric rolling count-up from `0` to the target values.

---

## Proposed Changes

### Desktop App Client Component

#### [MODIFY] [Main.vue](file:///home/yule/Sides/typo--desktop-app-home/apps/desktop/src/windows/Main.vue)
* Add a listener on `<AppHome>` component for `@navigate-to-tab="activeTab = $event"` to support smooth navigation updates.

#### [MODIFY] [AppHome.vue](file:///home/yule/Sides/typo--desktop-app-home/apps/desktop/src/components/AppHome.vue)
* **Stats and Prompt Loading**:
  * Introduce `isLoadingStats = ref(true)` state.
  * Load `defaultPrompt = ref('')` from settings store on mount.
  * Display a beautiful pulsing skeleton container when `isLoadingStats` is true.
* **Count-Up Animation Utility**:
  * Write a custom helper `animateNumber(start, end, duration, onUpdate)` using `requestAnimationFrame` with a quadratic deceleration easing function (`easeOutQuad`).
  * Integrate this helper to count up `totalCompletions` and `totalSlashPrompts` from `0` to the retrieved API values.
* **Default Prompt Card (System Card)**:
  * Add a wide, glassmorphic card above the stats grid (rendered when logged in).
  * Display `MessageSquareTextIcon`, a header label, and a CSS-clamped preview of the prompt value.
  * Clicking the card emits `@navigate-to-tab('default_prompt')`.
* **Interactive Stats Cards**:
  * Update statistical grid elements with modern hover states (`hover:-translate-y-0.5`, subtle shadow-md, and primary border transitions).
  * Clicking **Slash Prompts** stats card emits `@navigate-to-tab('slash_prompts')`.
  * Clicking **Completions** stats card emits `@navigate-to-tab('history')`.

---

## Verification Plan

### Manual Verification
1. **Login Experience**: Ensure stats display correctly when signed in.
2. **Skeleton & Count-Up Animation**: Verify the shimmering skeleton shows during fetch, and the numbers count up beautifully.
3. **System Prompt Banner**: Confirm the banner shows a proper text preview, or an elegant empty state if no prompt exists.
4. **Deep-linking & Navigation**: Click the Default System Prompt card, the Slash Prompts card, and the Completions card. Verify they navigate directly to **Default Prompt**, **Slash Prompts**, and **History** tabs respectively.
