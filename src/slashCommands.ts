import type { SlashCommand } from './store'

export type SlashCommandMap = Record<string, string>

/**
 * Parses raw prompt shortcuts into a map of slash commands.
 */
export function parseSlashCommands(shortcuts: SlashCommand[]): SlashCommandMap {
  console.debug('parseSlashCommands', shortcuts)
  const entries: Array<[string, string]> = []

  for (const item of shortcuts) {
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

interface ResolvedPrompt {
  text: string
  systemPrompt: string
  command?: string
}

/**
 * Resolves slash commands from the input text (only leading or trailing).
 */
export function resolveSlashCommand(text: string, baseSystemPrompt: string, commands: SlashCommandMap): ResolvedPrompt {
  const trimmedText = text.trim()
  if (!trimmedText) {
    return { text, systemPrompt: baseSystemPrompt }
  }

  // 1. Check exact leading command key match.
  for (const [key, template] of Object.entries(commands)) {
    if (trimmedText.startsWith(key)) {
      const cleanText = trimmedText.slice(key.length).trim()
      return { text: cleanText, systemPrompt: template, command: key }
    }
    if (trimmedText.endsWith(key)) {
      const cleanText = trimmedText.slice(0, -key.length).trim()
      return { text: cleanText, systemPrompt: template, command: key }
    }
  }

  return { text, systemPrompt: baseSystemPrompt }
}
