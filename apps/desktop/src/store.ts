import type { Locale } from '@typo/languages'
import { LazyStore } from '@tauri-apps/plugin-store'
import { defaultLocale } from '@typo/languages'

export const SYSTEM_PROMPT = `
You are an expert English writing and translation assistant with native-level proficiency.
Your task is to improve and polish English text, including translating Chinese content and fixing errors.

CORE RESPONSIBILITIES:
1. Convert Chinese text into natural, idiomatic English
2. Fix all grammar, spelling, and punctuation mistakes
3. Enhance readability through better sentence structure and flow
4. Ensure the text sounds authentically native while keeping the original meaning
5. Match writing style to the context (formal/casual/technical)

KEY RULES:
- Return ONLY the improved text - no explanations or comments
- Keep the original meaning and tone intact
- Write clearly and concisely
- Follow standard English grammar and conventions
- Make it sound natural and native
- Maintain technical terms and proper names exactly
- Mirror the original text's formatting

OUT FORMAT:
Simply provide the corrected text without any additional notes or commentary.

INPUT FORMAT:
The text to improve will be provided in the user message between ### markers:

### Input
(The input text will be here)
###
`.trim()

export type AI_PROVIDER = 'deepseek' | 'ollama'

export interface SlashCommand {
  id?: string
  key: string
  aliases?: string[]
  value: string
}

export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: '1', key: '/tr:zh', value: '!Translate the input text into Simplified Chinese while preserving meaning. Return only translated text.' },
  { id: '2', key: '/tr:jp', aliases: ['/tr:ja'], value: '!Translate the input text into Japanese while preserving meaning. Return only translated text.' },
  { id: '4', key: '/tr:en', value: '!Translate the input text into natural English while preserving meaning. Return only translated text.' },
  { id: '5', key: '/prompt', aliases: ['/p'], value: 'Apply this extra instruction on top of the saved System Prompt: {{args}}' },
]

export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+X'

const DEFAULT_STORE = {
  autostart: false,
  autoselect: false,
  ai_provider: 'deepseek' as AI_PROVIDER,
  ai_system_prompt: SYSTEM_PROMPT,
  deepseek_api_key: '',
  ollama_model: '',
  slash_commands: DEFAULT_SLASH_COMMANDS,
  global_shortcut: DEFAULT_GLOBAL_SHORTCUT,
  locale: defaultLocale satisfies Locale,
}

const store = new LazyStore('store.json', {
  autoSave: false,
  defaults: DEFAULT_STORE,
})

// only set default when key not exists
export async function initializeStore() {
  for (const [key, value] of Object.entries(DEFAULT_STORE)) {
    if (!(await store.has(key))) {
      await store.set(key, value)
    }
  }
}

export async function get<T extends keyof typeof DEFAULT_STORE>(key: T): Promise<typeof DEFAULT_STORE[T]> {
  return (await store.get(key)) ?? DEFAULT_STORE[key]
}

export async function set<T extends keyof typeof DEFAULT_STORE>(key: T, value: typeof DEFAULT_STORE[T] | undefined): Promise<void> {
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

export async function getOllamaModels(): Promise<any[]> {
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
