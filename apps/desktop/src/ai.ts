import type { LanguageModelV1 } from 'ai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { parseSlashCommands, resolveSlashCommand } from './slashCommands'
import { get } from './store'

async function aiProcess(model: LanguageModelV1, text: string, systemPrompt: string, command?: string, abortSignal?: AbortSignal): Promise<string> {
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
  return result
}

async function resolveAndProcess(
  model: LanguageModelV1,
  text: string,
  abortSignal?: AbortSignal,
  preResolved?: { text: string, systemPrompt: string, command?: string },
): Promise<string> {
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
