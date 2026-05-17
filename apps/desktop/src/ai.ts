import type { LanguageModelV1 } from 'ai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { api } from '@/api'
import { logger } from '@/logger'
import { getAuth } from '@/stores/auth'
import { parseSlashCommands, resolveSlashCommand } from './slashCommands'
import { get } from './stores/settings'

async function aiProcess(model: LanguageModelV1, text: string, systemPrompt: string, command?: string, abortSignal?: AbortSignal): Promise<string> {
  logger.info('ai', 'aiProcess', { text, systemPrompt, command })
  const { text: result } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        // If a slash command is used, we send the raw text to be more compatible with the custom instructions
        // If not, we use our standard wrapper
        content: command ? text : `### Input\n${text}\n###`,
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
  preResolved?: { text: string, systemPrompt: string, command?: string },
): Promise<string> {
  logger.debug('ai', 'resolveAndProcess', { text, preResolved })
  if (preResolved) {
    return aiProcess(model, preResolved.text, preResolved.systemPrompt, preResolved.command, abortSignal)
  }

  const [systemPrompt, shortcuts] = await Promise.all([
    get('ai_system_prompt'),
    get('slash_commands'),
  ])

  const { text: resolvedText, systemPrompt: finalSystemPrompt, command } = resolveSlashCommand(
    text,
    systemPrompt,
    parseSlashCommands(shortcuts),
  )

  return aiProcess(model, resolvedText, finalSystemPrompt, command, abortSignal)
}

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

export async function deepSeekProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, systemPrompt: string, command?: string }): Promise<string> {
  const apiKey = await get('deepseek_api_key')
  const model = createDeepSeek({ apiKey }).chat('deepseek-chat')
  return resolveAndProcess(model, text, abortSignal, preResolved)
}

export async function ollamaProcess(text: string, abortSignal?: AbortSignal, preResolved?: { text: string, systemPrompt: string, command?: string }): Promise<string> {
  const modelName = await get('ollama_model')
  const model = createOllama().chat(modelName)
  return resolveAndProcess(model, text, abortSignal, preResolved)
}
