import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { getDeepSeekApiKey } from './store'

const DEFAULT_PROMPT = `
I am learning English and would like to improve my language skills.
I will provide you with text that may contain grammatical errors or Chinese words.

Please help me by:
1. Correcting any grammatical mistakes
2. Translating any Chinese words to English
3. Improving the overall fluency while maintaining the original meaning

**Important: Only return the corrected English text without any explanations or additional comments.**
`

export async function deepSeekCorrect(text: string) {
  const apiKey = await getDeepSeekApiKey()
  debugger
  return generateText({
    model: createDeepSeek({ apiKey }).languageModel('deepseek-chat'),
    prompt: `${DEFAULT_PROMPT}\n\n${text}`,
  })
}
