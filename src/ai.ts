import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText, type LanguageModelV1 } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { parsePromptShortcuts, resolveSlashPrompt } from './slashCommands'
import { get } from './store'

async function aiCorrect(model: LanguageModelV1, text: string, abortSignal?: AbortSignal): Promise<string> {
  const [systemPrompt, slashCommandsRaw] = await Promise.all([
    get('ai_system_prompt'),
    get('prompt_shortcuts'),
  ])

  const { text: inputText, systemPrompt: finalSystemPrompt } = resolveSlashPrompt(
    text,
    systemPrompt,
    parsePromptShortcuts(slashCommandsRaw),
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

export async function deepSeekCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const apiKey = await get('deepseek_api_key')
  return aiCorrect(createDeepSeek({ apiKey }).chat('deepseek-chat'), text, abortSignal)
}

export async function ollamaCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const model = await get('ollama_model')
  return aiCorrect(createOllama().chat(model), text, abortSignal)
}
