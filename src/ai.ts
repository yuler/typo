import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText, type LanguageModelV1 } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { parseSlashCommands, resolveSlashCommand } from './slashCommands'
import { get } from './store'

async function aiProcess(model: LanguageModelV1, text: string, abortSignal?: AbortSignal): Promise<string> {
  const [systemPrompt, shortcuts] = await Promise.all([
    get('ai_system_prompt'),
    get('slash_commands'),
  ])

  const { text: inputText, systemPrompt: finalSystemPrompt, command } = resolveSlashCommand(
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
        // If a slash command is used, we send the raw text to be more compatible with the custom instructions
        // If not, we use our standard wrapper
        content: command ? inputText : `### Input\n${inputText}\n###`,
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
