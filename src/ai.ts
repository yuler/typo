import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { getDeepSeekApiKey } from './store'

const DEFAULT_PROMPT = `
I want you to help me improve my English writing and translation.
I will provide text that may contain Chinese words or English errors.

Your task:
1. Convert any Chinese text into natural, conversational English
2. Fix grammar and spelling mistakes
3. Make the text sound more natural and idiomatic, while keeping the core message
4. Use casual, everyday English expressions where appropriate

Rules:
- Only output the corrected/translated text
- No explanations or comments
- Keep the same tone and intent as the original
- Make it sound like a native English speaker wrote it
`

export async function deepSeekCorrect(text: string) {
  const apiKey = await getDeepSeekApiKey()
  return generateText({
    model: createDeepSeek({ apiKey }).languageModel('deepseek-chat'),
    prompt: `${DEFAULT_PROMPT}\n\n${text}`,
  })
}
