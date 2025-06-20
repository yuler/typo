import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { get, SYSTEM_PROMPT } from './store'

export async function deepSeekCorrect(text: string) {
  const apiKey = await get('deepseek_api_key')
  return generateText({
    model: createDeepSeek({ apiKey }).chat('deepseek-chat'),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  })
}

export async function ollamaCorrect(text: string) {
  const model = await get('ollama_model')
  return generateText({
    model: createOllama().chat(model),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  })
}
