import type { LanguageModelV1 } from 'ai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { api } from '@/api'
import { logger } from '@/logger'
import { getAuth } from '@/stores/auth'
import { parseSlashPrompts, resolveSlashPrompt } from './slashPrompts'
import { get } from './stores/settings'

export async function typoProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, prompt: string, command?: string }): Promise<string> {
  logger.debug('ai', 'typoProcess', { text, preResolved })
  const prompt = preResolved?.prompt ?? await get('default_prompt')
  const token = await getAuth('access_token')
  const bodyText = preResolved?.text ?? text

  const response = await api<{ result: string }>('/api/v1/completions', {
    method: 'POST',
    body: JSON.stringify({
      text: bodyText,
      prompt,
    }),
    signal: abortSignal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  logger.info('ai', 'typoProcess result', response.result)
  return response.result
}

export async function deepSeekProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, prompt: string, command?: string }): Promise<string> {
  const apiKey = await get('deepseek_api_key')
  const model = createDeepSeek({ apiKey }).chat('deepseek-chat')
  return resolveAndProcess(model, text, abortSignal, preResolved)
}

export async function ollamaProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, prompt: string, command?: string }): Promise<string> {
  const modelName = await get('ollama_model')
  const model = createOllama().chat(modelName)
  return resolveAndProcess(model, text, abortSignal, preResolved)
}

async function aiProcess(model: LanguageModelV1, text: string, prompt: string, abortSignal?: AbortSignal): Promise<string> {
  logger.info('ai', 'aiProcess', { text, prompt })
  const { text: result } = await generateText({
    model,
    system: prompt,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
    abortSignal,
  })
  logger.info('ai', 'aiProcess result', result)
  return result
}

async function resolveAndProcess(
  model: LanguageModelV1,
  text: string,
  abortSignal?: AbortSignal,
  preResolved?: { text: string, prompt: string, command?: string },
): Promise<string> {
  logger.debug('ai', 'resolveAndProcess', { text, preResolved })
  if (preResolved) {
    return aiProcess(model, preResolved.text, preResolved.prompt, abortSignal)
  }

  const [default_prompt, slash_prompts] = await Promise.all([
    get('default_prompt'),
    get('slash_prompts'),
  ])

  const { text: resolvedText, prompt } = resolveSlashPrompt(
    text,
    default_prompt,
    parseSlashPrompts(slash_prompts),
  )

  return aiProcess(model, resolvedText, prompt, abortSignal)
}
