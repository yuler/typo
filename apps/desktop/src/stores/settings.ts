import type { Locale } from '@typo/languages'
import { LazyStore } from '@tauri-apps/plugin-store'
import { defaultLocale } from '@typo/languages'
import { logger } from '@/logger'
import { api } from '@/api'
import * as authStore from './auth'
import { saveAuth, setAuth } from './auth'

export const SYSTEM_PROMPT = `
You are an expert English writing and translation assistant with native-level proficiency.
Your task is to improve and polish text, which includes translating Chinese content into English and correcting any errors.

CORE RESPONSIBILITIES:
1. Translate Chinese text into natural, idiomatic English.
2. Fix all grammar, spelling, and punctuation errors.
3. Improve readability by refining sentence structure and flow.
4. Ensure the text sounds authentic and native while preserving its original meaning.
5. Adapt the writing style to fit the context (e.g., formal, casual, or technical).

KEY RULES:
- Return ONLY the improved text. Do not include any explanations or comments.
- Preserve the original meaning and tone.
- Write clearly and concisely.
- Follow standard English grammar and conventions.
- Maintain the exact spelling of technical terms and proper nouns.
- Keep the original text's formatting intact.

OUTPUT FORMAT:
Provide only the corrected text, without any additional notes or commentary.

INPUT FORMAT:
The text to be improved will be provided in the user message.
`.trim()

export type AI_PROVIDER = 'typo' | 'deepseek' | 'ollama'

export interface SlashCommand {
  id?: string
  key: string
  aliases?: string[]
  value: string
}

export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: '1', key: '/prompt', aliases: ['/p'], value: 'Follow this instruction: \n{{args}}\nThe input text is: \n{{text}}\nReturn only the result.' },
  { id: '2', key: '/zh', aliases: ['/cn'], value: 'Translate the input text into Simplified Chinese while preserving meaning. Return only translated text.' },
  { id: '3', key: '/jp', aliases: ['/ja'], value: 'Translate the input text into Japanese while preserving meaning. Return only translated text.' },
  {
    id: '4',
    key: '/ph',
    aliases: ['/py'],
    value: `# 任务：多语种自动注音与视觉对齐
你是一个专业的注音标注助手。请根据输入文本的语种（日语、中文或英语），自动执行以下转换逻辑：

### 核心规则：
1. **立即判定**：接收到文本后，首先判断其语种。
2. **两行输出**：必须且仅返回两行结果，严禁输出任何解释或额外文字。
   - **第一行**：注音层。
     - 日语：小写罗马字（Romaji），逐假名对齐。
     - 中文：带声调拼音（Pinyin），逐字对齐。
     - 英语：**IPA 国际音标**，逐词对齐。
   - **第二行**：原文层。
3. **严格对齐**：使用下划线 \`_\` 填充，确保第一行的注音符号与其下方的原文块在视觉上精确上下对齐。

### 示例参考：

**输入**：Hello world
**输出**：
həˈloʊ___wɜrld
Hello____world

**输入**：我爱学习
**输出**：
wǒ_____ài____xué_xí
我_____爱____学__习

**输入**：君は勉強する
**输出**：
ki_mi___wa___be_n_kyo_u___su_ru
君______は___勉___強_______す_る

---

请对接下来输入的任何内容执行上述转换。`,
  },
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
  await syncPromptsWithServer()
}

export async function get<T extends keyof typeof DEFAULT_STORE>(key: T): Promise<typeof DEFAULT_STORE[T]> {
  return await store.get<typeof DEFAULT_STORE[T]>(key) ?? DEFAULT_STORE[key]
}

export async function set<T extends keyof typeof DEFAULT_STORE>(key: T, value: typeof DEFAULT_STORE[T] | undefined): Promise<void> {
  logger.info('store', `set ${key}`, value)
  await store.set(key, value)

  if (key === 'slash_commands' && value) {
    const token = await authStore.getAuth('access_token')
    if (token) {
      await syncSlashCommandsToServer(value as SlashCommand[], token)
    }
  }
}

export async function save(): Promise<void> {
  await store.save()
}

export async function syncPromptsWithServer() {
  const token = await authStore.getAuth('access_token')
  if (!token) return

  try {
    const serverPrompts = await api<SlashCommand[]>('/api/v1/prompts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const { runPromptsMigration } = await import('./prompts_migration')
    const migrated = await runPromptsMigration(serverPrompts)

    if (!migrated) {
      await store.set('slash_commands', serverPrompts)
      await store.save()
    }
  }
  catch (error) {
    logger.error('store', 'Failed to sync prompts with server', error)
  }
}

export async function resetLocalPrompts() {
  await store.set('slash_commands', DEFAULT_SLASH_COMMANDS)
  await store.save()
}

async function syncSlashCommandsToServer(newCommands: SlashCommand[], token: string) {
  try {
    const serverPrompts = await api<SlashCommand[]>('/api/v1/prompts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const serverPromptMap = new Map(serverPrompts.map(p => [p.id, p]))
    const newCommandMap = new Map(newCommands.map(c => [c.id, c]))

    // 1. DELETE prompts removed in UI
    for (const serverPrompt of serverPrompts) {
      if (serverPrompt.id && !newCommandMap.has(serverPrompt.id)) {
        await api(`/api/v1/prompts/${serverPrompt.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    }

    // 2. CREATE or UPDATE prompts
    const syncedCommands: SlashCommand[] = []
    for (const newCommand of newCommands) {
      const existingServerPrompt = newCommand.id ? serverPromptMap.get(newCommand.id) : null

      if (existingServerPrompt) {
        const hasChanged = existingServerPrompt.key !== newCommand.key
          || existingServerPrompt.value !== newCommand.value
          || JSON.stringify(existingServerPrompt.aliases) !== JSON.stringify(newCommand.aliases)

        if (hasChanged) {
          const updated = await api<SlashCommand>(`/api/v1/prompts/${newCommand.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              key: newCommand.key,
              value: newCommand.value,
              aliases: newCommand.aliases || [],
            }),
          })
          syncedCommands.push(updated)
        }
        else {
          syncedCommands.push(existingServerPrompt)
        }
      }
      else {
        const created = await api<SlashCommand>('/api/v1/prompts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            key: newCommand.key,
            value: newCommand.value,
            aliases: newCommand.aliases || [],
          }),
        })
        syncedCommands.push(created)
      }
    }

    // Save final list containing DB-generated UUIDs back to store
    await store.set('slash_commands', syncedCommands)
    await store.save()
  }
  catch (error) {
    logger.error('store', 'Failed to save prompts to server', error)
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
