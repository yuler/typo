# Desktop Device Flow Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the desktop side of the Device Authorization Grant (RFC 8628) to allow users to log in via `https://app.typo.yuler.cc`.

**Architecture:** Refactor `useAuth.ts` into a reactive state machine that handles authorization initiation and polling. Use a centralized `DeviceAuthModal` component triggered by the auth state.

**Tech Stack:** Vue 3, Tauri, Tailwind CSS, Lucide icons, `@tauri-apps/plugin-store`.

---

### Task 1: Environment and Constants Setup

**Files:**
- Create: `apps/desktop/src/lib/api.ts`

- [ ] **Step 1: Create API constants and basic fetch wrapper**

```typescript
export const API_BASE_URL = 'https://app.typo.yuler.cc'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/lib/api.ts
git commit -m "feat(auth): add API constants and fetch wrapper"
```

---

### Task 2: Refactor `useAuth` Composable

**Files:**
- Modify: `apps/desktop/src/composables/useAuth.ts`
- Modify: `apps/desktop/src/store.ts`

- [ ] **Step 1: Update store types to include token and user info**

```typescript
// apps/desktop/src/store.ts

// ... update DEFAULT_STORE
const DEFAULT_STORE = {
  // ... existing
  access_token: '',
  user_info: null as { name: string; email: string; avatar: string } | null,
}
```

- [ ] **Step 2: Implement Device Flow logic in `useAuth.ts`**

```typescript
import { createGlobalState } from '@vueuse/core'
import { ref, onMounted } from 'vue'
import * as store from '@/store'
import { apiFetch } from '@/lib/api'
import { logger } from '@/logger'

export type AuthStatus = 'idle' | 'authorizing' | 'success' | 'error'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_in: number
}

export const useAuth = createGlobalState(() => {
  const isLoggedIn = ref(false)
  const authStatus = ref<AuthStatus>('idle')
  const deviceCode = ref<DeviceCodeResponse | null>(null)
  const user = ref({
    name: '',
    email: '',
    avatar: '',
  })

  let pollTimer: number | null = null

  async function initialize() {
    const token = await store.get('access_token')
    const userInfo = await store.get('user_info')
    if (token && userInfo) {
      isLoggedIn.value = true
      user.value = userInfo
    }
  }

  async function login() {
    try {
      authStatus.value = 'authorizing'
      const data = await apiFetch<DeviceCodeResponse>('/api/v1/device/authorization', {
        method: 'POST'
      })
      deviceCode.value = data
      startPolling(data.device_code, data.interval)
    } catch (err) {
      logger.error('Auth', 'Failed to start login', err)
      authStatus.value = 'error'
    }
  }

  function startPolling(code: string, interval: number) {
    if (pollTimer) clearTimeout(pollTimer)
    
    const poll = async () => {
      try {
        const data = await apiFetch<{ access_token: string; identity: any }>('/api/v1/device/token', {
          method: 'POST',
          body: JSON.stringify({ device_code: code })
        })

        if (data.access_token) {
          await handleSuccess(data.access_token, data.identity)
        }
      } catch (err: any) {
        if (err.message === 'authorization_pending') {
          pollTimer = window.setTimeout(poll, interval * 1000)
        } else if (err.message === 'slow_down') {
          startPolling(code, interval + 5)
        } else {
          authStatus.value = 'error'
        }
      }
    }

    pollTimer = window.setTimeout(poll, interval * 1000)
  }

  async function handleSuccess(token: string, identity: any) {
    isLoggedIn.value = true
    authStatus.value = 'success'
    user.value = {
      name: identity.name || identity.email.split('@')[0],
      email: identity.email,
      avatar: identity.avatar_url || `https://github.com/${identity.email.split('@')[0]}.png`,
    }
    await store.set('access_token', token)
    await store.set('user_info', user.value)
    await store.save()
    if (pollTimer) clearTimeout(pollTimer)
  }

  async function logout() {
    isLoggedIn.value = false
    authStatus.value = 'idle'
    await store.set('access_token', '')
    await store.set('user_info', null)
    await store.save()
  }

  function cancel() {
    if (pollTimer) clearTimeout(pollTimer)
    authStatus.value = 'idle'
    deviceCode.value = null
  }

  onMounted(initialize)

  return {
    isLoggedIn,
    authStatus,
    deviceCode,
    user,
    login,
    logout,
    cancel,
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/composables/useAuth.ts apps/desktop/src/store.ts
git commit -m "feat(auth): implement real device flow logic in useAuth"
```

---

### Task 3: Create `DeviceAuthModal` Component

**Files:**
- Create: `apps/desktop/src/components/DeviceAuthModal.vue`

- [ ] **Step 1: Implement the modal UI**

```vue
<script setup lang="ts">
import { Loader2, ExternalLink, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const { authStatus, deviceCode, cancel } = useAuth()

const isOpen = computed({
  get: () => authStatus.value === 'authorizing',
  set: (val) => { if (!val) cancel() }
})

async function openBrowser() {
  if (deviceCode.value) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(deviceCode.value.verification_uri)
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Authorize Device</DialogTitle>
        <DialogDescription>
          Please enter the code below on your other device to log in.
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col items-center justify-center py-6 space-y-6">
        <div v-if="deviceCode" class="bg-muted/50 border-2 border-dashed border-primary/20 rounded-xl px-8 py-4 text-3xl font-mono font-bold tracking-[0.2em] text-primary">
          {{ deviceCode.user_code }}
        </div>
        
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin text-primary" />
          Waiting for authorization...
        </div>

        <div class="w-full space-y-2">
          <Button variant="outline" class="w-full gap-2" @click="openBrowser">
            <ExternalLink class="h-4 w-4" />
            Open Browser
          </Button>
          <Button variant="ghost" class="w-full text-muted-foreground" @click="cancel">
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/components/DeviceAuthModal.vue
git commit -m "feat(auth): add DeviceAuthModal component"
```

---

### Task 4: Integration in Main Window

**Files:**
- Modify: `apps/desktop/src/windows/Main.vue`

- [ ] **Step 1: Add the modal to `Main.vue`**

```vue
<!-- apps/desktop/src/windows/Main.vue -->
<script setup lang="ts">
// ... existing imports
import DeviceAuthModal from '@/components/DeviceAuthModal.vue'
// ...
</script>

<template>
  <SidebarProvider>
    <!-- ... existing content -->
    
    <DeviceAuthModal />
    
    <!-- Settings Dialog -->
    <Dialog v-model:open="isSettingsOpen">
      <!-- ... -->
    </Dialog>
  </SidebarProvider>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/windows/Main.vue
git commit -m "feat(auth): integrate DeviceAuthModal in Main window"
```

---

### Task 5: Final UI Polish and Notification

**Files:**
- Modify: `apps/desktop/src/components/AppSidebar.vue`

- [ ] **Step 1: Update Sidebar login handler to use real login**

```typescript
// apps/desktop/src/components/AppSidebar.vue

const { isLoggedIn, user, login, logout, authStatus } = useAuth()

function handleLogin() {
  login()
}

// Add watch for success notification
import { watch } from 'vue'
watch(authStatus, (status) => {
  if (status === 'success') {
    showNotification('typo', 'Successfully logged in!')
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/components/AppSidebar.vue
git commit -m "feat(auth): use real login flow in sidebar and add notification"
```
