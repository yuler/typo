import type { Locale } from '@typo/languages'
import { LazyStore } from '@tauri-apps/plugin-store'
import { defaultLocale } from '@typo/languages'
import { logger } from '@/logger'
import { saveAuth, setAuth } from './auth'

export const SYSTEM_PROMPT = `
Improve and polish the following text. 
Fix grammar, spelling, and punctuation. 
Enhance readability and flow while preserving original meaning.
Return ONLY the improved text.
`.trim()

export type AI_PROVIDER = 'typo' | 'deepseek' | 'ollama'

export interface SlashCommand {
  id?: string
  key: string
  aliases?: string[]
  value: string
}

export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: '1', key: '/tr:zh', value: 'Translate the input text into Simplified Chinese while preserving meaning. Return only translated text.' },
  { id: '2', key: '/tr:jp', aliases: ['/tr:ja'], value: 'Translate the input text into Japanese while preserving meaning. Return only translated text.' },
  { id: '4', key: '/tr:en', value: 'Translate the input text into natural English while preserving meaning. Return only translated text.' },
  { id: '5', key: '/prompt', aliases: ['/p'], value: 'Apply this extra instruction: {{args}}' },
]

export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+X'

const DEFAULT_STORE = {
  autoselect: false,
  copy_result: false,
  ai_provider: 'typo' as AI_PROVIDER,
  ai_system_prompt: SYSTEM_PROMPT,
  deepseek_api_key: '',
  ollama_model: '',
  slash_commands: DEFAULT_SLASH_COMMANDS,
  global_shortcut: DEFAULT_GLOBAL_SHORTCUT,
  locale: defaultLocale satisfies Locale,
}

const store = new LazyStore('settings.json', {
  autoSave: false,
  defaults: DEFAULT_STORE,
})

const legacyStore = new LazyStore('store.json', { autoSave: false, defaults: {} })

/**
 * Backward compatibility migration for legacy `store.json`.
 * Automatically moves credentials to `auth.json` and preferences to `settings.json`.
 * TODO: Remove in the next major release (v2.0) once legacy migration is fully transitioned.
 */
async function migrateLegacyStore() {
  try {
    const keys = await legacyStore.keys()
    if (keys.length > 0) {
      logger.info('store', 'Migrating legacy store.json data to settings.json and auth.json')

      if (await legacyStore.has('access_token')) {
        const token = await legacyStore.get<string>('access_token')
        if (token) {
          await setAuth('access_token', token)
        }
      }
      if (await legacyStore.has('user_info')) {
        const userInfo = await legacyStore.get<any>('user_info')
        if (userInfo?.email) {
          await setAuth('email', userInfo.email)
        }
      }
      await saveAuth()

      for (const key of Object.keys(DEFAULT_STORE)) {
        if (await legacyStore.has(key)) {
          const val = await legacyStore.get(key)
          if (val !== undefined) {
            await store.set(key, val)
          }
        }
      }
      await store.save()

      await legacyStore.clear()
      await legacyStore.save()
      logger.info('store', 'Legacy store migration successfully completed')
    }
  }
  catch (err) {
    logger.error('store', 'Failed to migrate legacy store', err)
  }
}

// only set default when key not exists
export async function initializeStore() {
  await migrateLegacyStore()
  for (const [key, value] of Object.entries(DEFAULT_STORE)) {
    if (!(await store.has(key))) {
      await store.set(key, value)
    }
  }
}

export async function get<T extends keyof typeof DEFAULT_STORE>(key: T): Promise<typeof DEFAULT_STORE[T]> {
  return await store.get<typeof DEFAULT_STORE[T]>(key) ?? DEFAULT_STORE[key]
}

export async function set<T extends keyof typeof DEFAULT_STORE>(key: T, value: typeof DEFAULT_STORE[T] | undefined): Promise<void> {
  logger.info('store', `set ${key}`, value)
  await store.set(key, value)
}

export async function save(): Promise<void> {
  await store.save()
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
