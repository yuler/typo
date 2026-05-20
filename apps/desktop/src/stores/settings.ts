import type { Locale } from '@typo/languages'
import { LazyStore } from '@tauri-apps/plugin-store'
import { defaultLocale } from '@typo/languages'
import { api } from '@/api'
import { logger } from '@/logger'
import * as authStore from './auth'

export type AI_PROVIDER = 'typo' | 'deepseek' | 'ollama'

export interface SlashPrompt {
  id?: string
  key: string
  aliases?: string[]
  value: string
}

export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+X'

const DEFAULT_STORE = {
  autoselect: false,
  copy_result: false,
  ai_provider: 'typo' as AI_PROVIDER,
  default_prompt: '',
  deepseek_api_key: '',
  ollama_model: '',
  slash_prompts: [] as SlashPrompt[],
  global_shortcut: DEFAULT_GLOBAL_SHORTCUT,
  locale: defaultLocale satisfies Locale,
}

const store = new LazyStore('settings.json', {
  autoSave: false,
  defaults: DEFAULT_STORE,
})

export async function initializeStore() {
  for (const [key, value] of Object.entries(DEFAULT_STORE)) {
    if (!(await store.has(key))) {
      await store.set(key, value)
    }
  }
  await syncPromptsWithServer()
}

export async function get<T extends keyof typeof DEFAULT_STORE>(key: T): Promise<typeof DEFAULT_STORE[T]> {
  return await store.get<typeof DEFAULT_STORE[T]>(key) ?? DEFAULT_STORE[key]
}

export async function set<T extends keyof typeof DEFAULT_STORE>(key: T, value: typeof DEFAULT_STORE[T] | undefined): Promise<void> {
  logger.info('store', `set ${key}`, value)
  await store.set(key, value)

  if (key === 'slash_prompts' && value) {
    const token = await authStore.getAuth('access_token')
    if (token) {
      await syncSlashPromptsToServer(value as SlashPrompt[], token)
    }
  }

  if (key === 'default_prompt' && value) {
    const token = await authStore.getAuth('access_token')
    if (token) {
      await syncDefaultPromptToServer(value as string, token)
    }
  }
}

export async function save(): Promise<void> {
  await store.save()
}

export async function fetchSlashPromptsFromServer(): Promise<void> {
  const token = await authStore.getAuth('access_token')
  if (!token)
    return

  const serverSlashPrompts = await api<SlashPrompt[]>('/api/v1/slash_prompts', {
    headers: { Authorization: `Bearer ${token}` },
  })

  await store.set('slash_prompts', serverSlashPrompts)
  await store.save()
}

export async function fetchDefaultPromptFromServer(): Promise<void> {
  const token = await authStore.getAuth('access_token')
  if (!token)
    return

  const serverDefaultPrompt = await api<{ value: string }>('/api/v1/default_prompt', {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)

  if (serverDefaultPrompt?.value) {
    await store.set('default_prompt', serverDefaultPrompt.value)
    await store.save()
  }
}

export async function syncPromptsWithServer() {
  try {
    await Promise.all([
      fetchSlashPromptsFromServer(),
      fetchDefaultPromptFromServer(),
    ])
  }
  catch (error) {
    logger.error('store', 'Failed to sync prompts with server', error)
  }
}

async function syncSlashPromptsToServer(newPrompts: SlashPrompt[], token: string) {
  try {
    const serverPrompts = await api<SlashPrompt[]>('/api/v1/slash_prompts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const serverPromptMap = new Map(serverPrompts.map(p => [p.id, p]))
    const newPromptMap = new Map(newPrompts.map(p => [p.id, p]))

    for (const serverPrompt of serverPrompts) {
      if (serverPrompt.id && !newPromptMap.has(serverPrompt.id)) {
        await api(`/api/v1/slash_prompts/${serverPrompt.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    }

    const syncedPrompts: SlashPrompt[] = []
    for (const newPrompt of newPrompts) {
      const existingServerPrompt = newPrompt.id ? serverPromptMap.get(newPrompt.id) : null

      if (existingServerPrompt) {
        const hasChanged = existingServerPrompt.key !== newPrompt.key
          || existingServerPrompt.value !== newPrompt.value
          || JSON.stringify(existingServerPrompt.aliases) !== JSON.stringify(newPrompt.aliases)

        if (hasChanged) {
          const updated = await api<SlashPrompt>(`/api/v1/slash_prompts/${newPrompt.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              slash_prompt: {
                key: newPrompt.key,
                value: newPrompt.value,
                aliases: newPrompt.aliases || [],
              },
            }),
          })
          syncedPrompts.push(updated)
        }
        else {
          syncedPrompts.push(existingServerPrompt)
        }
      }
      else {
        const created = await api<SlashPrompt>('/api/v1/slash_prompts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            slash_prompt: {
              key: newPrompt.key,
              value: newPrompt.value,
              aliases: newPrompt.aliases || [],
            },
          }),
        })
        syncedPrompts.push(created)
      }
    }

    await store.set('slash_prompts', syncedPrompts)
    await store.save()
  }
  catch (error) {
    logger.error('store', 'Failed to save slash prompts to server', error)
    throw error
  }
}

async function syncDefaultPromptToServer(value: string, token: string) {
  try {
    await api('/api/v1/default_prompt', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        default_prompt: { value },
      }),
    })
  }
  catch (error) {
    logger.error('store', 'Failed to save default prompt to server', error)
    throw error
  }
}

const OLLAMA_SERVER_URL = 'http://localhost:11434'
export async function existOllamaServer(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_SERVER_URL)
    return response.status === 200
  }
  catch {
    return false
  }
}

export interface OllamaModel {
  name: string
  details?: {
    parameter_size?: string
  }
}

export async function getOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${OLLAMA_SERVER_URL}/api/tags`)
    const { models } = await response.json()
    return models
  }
  catch {
    return []
  }
}

export default store
