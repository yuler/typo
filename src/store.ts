import { LazyStore } from '@tauri-apps/plugin-store'

const store = new LazyStore('store.json', { autoSave: false })

export const SYSTEM_PROMPT = `
I want you to help me improve my English writing and translation.
I will provide text that may contain Chinese words or English errors.

Your task:
1. Convert any Chinese text into natural, conversational English
2. Fix grammar and spelling mistakes
3. Make the text sound more natural and idiomatic, while keeping the core message
4. Use casual, everyday English expressions where appropriate

Rules:
- Only output the corrected/translated text
- No explanations or comments
- Keep the same tone and intent as the original
- Make it sound like a native English speaker wrote it
`.trim()

export type AI_PROVIDER = 'deepseek' | 'ollama'

const DEFAULT_STORE = {
  ai_provider: 'deepseek' as AI_PROVIDER,
  ai_system_prompt: SYSTEM_PROMPT,
  deepseek_api_key: '',
  ollama_model: '',
}

export async function initialize() {
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
