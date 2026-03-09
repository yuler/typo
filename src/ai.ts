import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { parsePromptShortcuts, resolveSlashPrompt } from './slashCommands'
import { get } from './store'

export async function deepSeekCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const [apiKey, systemPrompt, slashCommandsRaw] = await Promise.all([
    get('deepseek_api_key'),
    get('ai_system_prompt'),
    get('prompt_shortcuts'),
  ])

  const { text: inputText, systemPrompt: finalSystemPrompt } = resolveSlashPrompt(
    text,
    systemPrompt,
    parsePromptShortcuts(slashCommandsRaw),
  )

  const { text: result } = await generateText({
    model: createDeepSeek({ apiKey }).chat('deepseek-chat'),
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

export async function ollamaCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const [model, systemPrompt, slashCommandsRaw] = await Promise.all([
    get('ollama_model'),
    get('ai_system_prompt'),
    get('prompt_shortcuts'),
  ])

  const { text: inputText, systemPrompt: finalSystemPrompt } = resolveSlashPrompt(
    text,
    systemPrompt,
    parsePromptShortcuts(slashCommandsRaw),
  )

  const { text: result } = await generateText({
    model: createOllama().chat(model),
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
