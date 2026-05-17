# Typo AI Provider Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `@core` service as the default "Typo Cloud" AI provider in the Desktop app, while maintaining support for DeepSeek (BYT) and Ollama.

**Architecture:** Update the settings store to include the `typo` provider as default. Implement a new processing logic that calls the core Rails API with authentication headers if available. Update the UI to handle rate-limit errors from the core service by prompting for login.

**Tech Stack:** TypeScript, Vue 3, Tauri, Pinia (actually Tauri Store), Fetch API.

---

### Task 1: Update Settings Store

**Files:**
- Modify: `apps/desktop/src/stores/settings.ts`

- [ ] **Step 1: Add 'typo' to AI_PROVIDER type**

Modify `AI_PROVIDER` definition:
```typescript
export type AI_PROVIDER = 'typo' | 'deepseek' | 'ollama'
```

- [ ] **Step 2: Update DEFAULT_STORE to use 'typo' as default**

Change `ai_provider` in `DEFAULT_STORE`:
```typescript
const DEFAULT_STORE = {
  // ...
  ai_provider: 'typo' as AI_PROVIDER,
  // ...
}
```

- [ ] **Step 3: Verify initialization logic**

Ensure `initializeStore` correctly handles the new default for existing users if appropriate (or just let them manually switch).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/stores/settings.ts
git commit -m "feat: add 'typo' AI provider to settings store and make it default"
```

---

### Task 2: Implement Typo AI Processor

**Files:**
- Modify: `apps/desktop/src/ai.ts`

- [ ] **Step 1: Import necessary utilities**

Add `api` and `getAuth` imports:
```typescript
import { api } from '@/api'
import { getAuth } from '@/stores/auth'
```

- [ ] **Step 2: Implement typoProcess function**

Add the `typoProcess` function:
```typescript
export async function typoProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, systemPrompt: string, command?: string }): Promise<string> {
  logger.debug('ai', 'typoProcess', { text, preResolved })
  const systemPrompt = preResolved?.systemPrompt || await get('ai_system_prompt')
  const token = await getAuth('access_token')

  const response = await api<{ result: string }>('/api/v1/completions', {
    method: 'POST',
    body: JSON.stringify({ text, prompt: systemPrompt }),
    signal: abortSignal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  logger.info('ai', 'typoProcess result', response.result)
  return response.result
}
```

- [ ] **Step 3: Update resolveAndProcess fix (Variable scope)**

Ensure `resolveAndProcess` uses `preResolved` variables correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/ai.ts
git commit -m "feat: implement typoProcess for core service integration"
```

---

### Task 3: Update Indicator Window & Rate Limit Handling

**Files:**
- Modify: `apps/desktop/src/windows/Indicator.vue`
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/zh.json`

- [ ] **Step 1: Update fetchCorrection to use typoProcess**

Import `typoProcess` and add to switch case:
```typescript
import { deepSeekProcess, ollamaProcess, typoProcess } from '@/ai'

// in fetchCorrection:
  switch (aiProvider) {
    case 'typo':
      process = typoProcess
      break
    // ...
  }
```

- [ ] **Step 2: Add rate limit translation keys**

Add `main.error.rate_limit` to locales.
`en.json`: `"main.error.rate_limit": "Rate limit exceeded. Sign in for Unlimited Access"`
`zh.json`: `"main.error.rate_limit": "请求过于频繁。登录以获取无限制访问"`

- [ ] **Step 3: Handle 429 errors in processSetInputPayload**

Modify the catch block in `processSetInputPayload`:
```typescript
  catch (err: any) {
    if (!isMounted) return
    if (err.name === 'AbortError') { /* ... */ }
    
    // Check for 429 error message from api utility
    if (err.message?.includes('Rate limit exceeded')) {
      errorText.value = t('main.error.rate_limit')
    } else {
      errorText.value = (typeof err === 'string' ? err : err?.message) || t('main.error.generic')
    }
    state.value = 'error'
    // ...
  }
```

- [ ] **Step 4: Make error message clickable to trigger login**

In `Indicator.vue`, import `useAuth`:
```typescript
import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()
```

In the template, add `@click` to the error message area:
```html
<p 
  v-else-if="state === 'error'" 
  class="truncate text-sm text-red-400 px-2 font-medium cursor-pointer hover:underline"
  @click="errorText === t('main.error.rate_limit') ? login() : null"
>
  {{ errorText }}
</p>
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/windows/Indicator.vue apps/desktop/src/locales/*.json
git commit -m "feat: handle rate limit errors in indicator with login prompt"
```

---

### Task 4: Update Settings UI

**Files:**
- Modify: `apps/desktop/src/components/AppSettings.vue`
- Modify: `apps/desktop/src/locales/en.json`
- Modify: `apps/desktop/src/locales/zh.json`

- [ ] **Step 1: Add translation keys for Typo provider**

`en.json`:
```json
"settings.basic.typo.label": "Typo Cloud (Default)",
"settings.basic.typo.description": "Use our optimized cloud service. Unlimited for signed-in users."
```
`zh.json`:
```json
"settings.basic.typo.label": "Typo 云服务 (默认)",
"settings.basic.typo.description": "使用我们优化的云服务。登录用户享受无限制访问。"
```

- [ ] **Step 2: Update AI Provider dropdown in AppSettings.vue**

Add the Typo option:
```html
<SelectItem value="typo">
  {{ t('settings.basic.typo.label') }}
</SelectItem>
```

- [ ] **Step 3: Add provider description/hint**

Show the hint when 'typo' is selected:
```html
<div v-if="form.ai_provider === 'typo'" class="text-xs text-muted-foreground p-3 border border-dashed rounded-md bg-muted/20">
  {{ t('settings.basic.typo.description') }}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/AppSettings.vue apps/desktop/src/locales/*.json
git commit -m "feat: update settings UI with Typo provider and hints"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Build the frontend**

Run: `pnpm desktop:build:frontend`
Expected: SUCCESS

- [ ] **Step 2: Manual Check (Simulated)**

- Verify default provider is 'typo' in a fresh store.
- Verify DeepSeek and Ollama still work.
- Verify rate limit message appears (can mock API response for 429).
