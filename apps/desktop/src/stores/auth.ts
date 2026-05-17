import { LazyStore } from '@tauri-apps/plugin-store'
import { logger } from '@/logger'

export interface UserInfo {
  name: string
  email: string
  avatar: string
}

const DEFAULT_AUTH_STORE = {
  access_token: '',
  user_info: null as UserInfo | null,
}

const authStore = new LazyStore('auth.json', {
  autoSave: false,
  defaults: DEFAULT_AUTH_STORE,
})

export async function initializeAuthStore() {
  for (const [key, value] of Object.entries(DEFAULT_AUTH_STORE)) {
    if (!(await authStore.has(key))) {
      await authStore.set(key, value)
    }
  }
}

export async function getAuth<T extends keyof typeof DEFAULT_AUTH_STORE>(key: T): Promise<typeof DEFAULT_AUTH_STORE[T]> {
  return await authStore.get<typeof DEFAULT_AUTH_STORE[T]>(key) ?? DEFAULT_AUTH_STORE[key]
}

export async function setAuth<T extends keyof typeof DEFAULT_AUTH_STORE>(key: T, value: typeof DEFAULT_AUTH_STORE[T] | undefined): Promise<void> {
  logger.info('authStore', `set ${key}`, value)
  await authStore.set(key, value)
}

export async function saveAuth(): Promise<void> {
  await authStore.save()
}

export default authStore
