import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText, type LanguageModelV1 } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { parseSlashCommands, resolveSlashCommand } from './slashCommands'
import { get } from './store'

async function aiProcess(model: LanguageModelV1, text: string, abortSignal?: AbortSignal): Promise<string> {
  const [systemPrompt, shortcuts] = await Promise.all([
    get('ai_system_prompt'),
    get('prompt_shortcuts'),
  ])

  const { text: inputText, systemPrompt: finalSystemPrompt } = resolveSlashCommand(
    text,
    systemPrompt,
    parseSlashCommands(shortcuts),
  )

  const { text: result } = await generateText({
    model,
    system: finalSystemPrompt,
    messages: [
      {
        role: 'user',
        content: `### Input\n${inputText}\n###`,
      },
    ],
    abortSignal,
  })
  return result
}

export async function deepSeekProcess(text: string, abortSignal?: AbortSignal): Promise<string> {
  const apiKey = await get('deepseek_api_key')
  return aiProcess(createDeepSeek({ apiKey }).chat('deepseek-chat'), text, abortSignal)
}

export async function ollamaProcess(text: string, abortSignal?: AbortSignal): Promise<string> {
  const model = await get('ollama_model')
  return aiProcess(createOllama().chat(model), text, abortSignal)
}
