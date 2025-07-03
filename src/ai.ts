import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { get, SYSTEM_PROMPT } from './store'

export async function deepSeekCorrect(text: string, abortSignal?: AbortSignal) {
  const apiKey = await get('deepseek_api_key')
  return streamText({
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
}

export async function ollamaCorrect(text: string, abortSignal?: AbortSignal) {
  const model = await get('ollama_model')
  return streamText({
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
}
