import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { get, SYSTEM_PROMPT } from './store'

export async function deepSeekCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const apiKey = await get('deepseek_api_key')
  const { text: result } = await generateText({
    model: createDeepSeek({ apiKey }).chat('deepseek-chat'),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `### Input\n${text}\n###`,
      },
    ],
    abortSignal,
  })
  return result
}

export async function ollamaCorrect(text: string, abortSignal?: AbortSignal): Promise<string> {
  const model = await get('ollama_model')
  const { text: result } = await generateText({
    model: createOllama().chat(model),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `### Input\n${text}\n###`,
      },
    ],
    abortSignal,
  })
  return result
}
