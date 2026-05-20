import type { SlashPrompt } from './stores/settings'
import { logger } from '@/logger'

export type SlashPromptMap = Record<string, string>

/**
 * Parses slash prompts into a lookup map keyed by command.
 */
export function parseSlashPrompts(prompts: SlashPrompt[]): SlashPromptMap {
  const entries: Array<[string, string]> = []

  for (const item of prompts) {
    const key = item.key.trim()
    const value = item.value.trim()
    if (!key.startsWith('/') || !value) {
      continue
    }

    entries.push([key, value])
    for (const alias of item.aliases ?? []) {
      const trimmedAlias = alias.trim()
      if (trimmedAlias.startsWith('/')) {
        entries.push([trimmedAlias, value])
      }
    }
  }

  return Object.fromEntries(entries)
}

interface ResolvedSlashPrompt {
  text: string
  instruction: string
  command?: string
}

/**
 * Resolves slash prompts from the input text (only leading or trailing).
 */
export function resolveSlashPrompt(text: string, baseInstruction: string, prompts: SlashPromptMap): ResolvedSlashPrompt {
  const trimmedText = text.trim()
  if (!trimmedText) {
    return { text, instruction: baseInstruction }
  }

  const lines = trimmedText.split(/\r?\n/)
  const firstLine = lines[0]?.trim() ?? ''
  const lastLine = lines[lines.length - 1]?.trim() ?? ''
  const sortedKeys = Object.keys(prompts).sort((a, b) => b.length - a.length)

  for (const key of sortedKeys) {
    const template = prompts[key]
    const matches = (line: string) => line === key || line.startsWith(`${key} `)
    let commandLine = ''
    let contentLines: string[] = []

    if (matches(firstLine)) {
      commandLine = firstLine
      contentLines = lines.slice(1)
    }
    else if (matches(lastLine)) {
      commandLine = lastLine
      contentLines = lines.slice(0, -1)
    }
    else if (lastLine.includes(` ${key}`)) {
      const idx = lastLine.lastIndexOf(` ${key}`)
      const potentialCommand = lastLine.slice(idx + 1)
      if (!matches(potentialCommand))
        continue

      commandLine = potentialCommand
      const prefix = lastLine.slice(0, idx)
      contentLines = [...lines.slice(0, -1), prefix]
    }
    else {
      continue
    }

    const args = commandLine.slice(key.length).trim()
    const content = contentLines.join('\n').trim()

    const instruction = template
      .split('{{args}}')
      .join(args)
      .split('{{text}}')
      .join(content)
      .trim()

    const hasArgsPlaceholder = template.includes('{{args}}')
    const hasTextPlaceholder = template.includes('{{text}}')

    let finalText = content
    if (args && !hasArgsPlaceholder) {
      finalText = `${args}${finalText ? `\n${finalText}` : ''}`.trim()
    }
    if (hasTextPlaceholder) {
      finalText = ''
    }

    const result = {
      text: finalText,
      instruction: instruction ? `${baseInstruction}\n\n${instruction}` : baseInstruction,
      command: key,
    }
    logger.info('slash', 'resolved', result)
    return result
  }

  return { text, instruction: baseInstruction }
}
