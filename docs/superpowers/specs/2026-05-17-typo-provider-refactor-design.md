# Design Spec: Typo AI Provider Refactor

**Date:** 2026-05-17  
**Topic:** Integrating `@core` service as the default AI provider in the Desktop app.

## Overview
Currently, the Typo desktop app requires users to provide their own DeepSeek API key or use a local Ollama server. We are introducing a native "Typo Cloud" provider that routes requests through the `@core` Rails service. This service provides anonymous rate-limited access and unlimited access for authenticated users.

## Goals
1. Make "Typo Cloud" the default AI provider.
2. Maintain support for DeepSeek (BYT - Bring Your Token) and Ollama.
3. Handle rate limiting for anonymous users gracefully by encouraging login.
4. Ensure authenticated requests are properly identified by the core service.

## Architecture & Data Flow

### Request Flow
1. **Desktop App** (Vue/Tauri) captures text and system prompt.
2. If `ai_provider` is `typo`:
   - Sends POST request to `https://app.typo.yuler.cc/api/v1/completions`.
   - Payload: `{ text: string, prompt: string }`.
   - Headers: `Authorization: Bearer <access_token>` (if logged in).
3. **Typo Core** (Rails) receives the request:
   - Authenticates user via Bearer token.
   - Applies rate limiting (5 req/15 min for anonymous, unlimited for authenticated).
   - Forwards request to LLM (e.g., DeepSeek) via `ruby_llm`.
   - Returns result to Desktop app.
4. **Desktop App** receives result and pastes it at the cursor position.

## Implementation Details

### 1. Settings Store (`apps/desktop/src/stores/settings.ts`)
- **Type Change:** Update `AI_PROVIDER` to include `'typo'`.
  ```typescript
  export type AI_PROVIDER = 'typo' | 'deepseek' | 'ollama'
  ```
- **Default Value:** Change `DEFAULT_STORE.ai_provider` to `'typo'`.

### 2. AI Processor (`apps/desktop/src/ai.ts`)
- **New Function:** `typoProcess(text, abortSignal, preResolved)`.
  - Retrieves `access_token` from `authStore`.
  - Calls `api('/api/v1/completions')` with appropriate headers and body.
  - Returns the `result` string from the JSON response.

### 3. Settings UI (`apps/desktop/src/components/AppSettings.vue`)
- **Dropdown Update:** Add "Typo Cloud (Default)" to the AI Provider select menu.
- **Provider-specific UI:** Ensure the "DeepSeek API Key" field only shows when `deepseek` is selected, and "Ollama Model" shows for `ollama`.
- **Typo Cloud Hint:** Add a descriptive hint explaining that Typo Cloud is the easiest way to get started and is unlimited for signed-in users.

### 4. Indicator Window (`apps/desktop/src/windows/Indicator.vue`)
- **Error Handling:** Catch `429 Too Many Requests` specifically.
- **Rate Limit UI:** When a 429 occurs:
  - Set state to `error`.
  - Set error text to: "Rate limit exceeded. Sign in for Unlimited Access".
  - (Optional) Implement a click handler on the error message to trigger `useAuth().login()`.

## Success Criteria
1. New installations default to the "Typo" provider.
2. Existing users can switch to "Typo" in settings.
3. Authenticated users can perform continuous completions without rate limit errors.
4. Anonymous users see a helpful login prompt when hitting the rate limit.
5. DeepSeek (BYT) and Ollama continue to function correctly when selected.

## Testing Strategy
- **Unit Tests:** Update `ai.ts` related tests if they exist.
- **Manual Verification:**
  - Test completions as an anonymous user until rate limited.
  - Log in and verify rate limit is gone.
  - Switch between all 3 providers and verify each works with its respective backend.
