import type { PromptShortcut } from './store'

export type SlashCommandMap = Record<string, string>

export function parsePromptShortcuts(shortcuts: PromptShortcut[]): SlashCommandMap {
  return Object.fromEntries(
    shortcuts
      .filter(item => item.key.trim().startsWith('/') && item.value.trim())
      .map(item => [item.key.trim(), item.value.trim()]),
  )
}

interface ResolvedPrompt {
  text: string
  systemPrompt: string
  command?: string
}

interface CommandMatch {
  command: string
  args: string
  cleanText: string
}

function parseCommandLine(rawText: string, line: string): CommandMatch | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('/')) {
    return null
  }

  const spaceIndex = trimmed.indexOf(' ')
  const command = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
  const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim()

  let removed = false
  const cleanText = rawText
    .split(/\r?\n/)
    .filter((row) => {
      if (removed) {
        return true
      }
      if (row.trim() === trimmed) {
        removed = true
        return false
      }
      return true
    })
    .join('\n')
    .trim()

  return { command, args, cleanText }
}

function parseTrailingCommand(rawText: string, line: string): CommandMatch | null {
  const trimmed = line.trim()
  const parts = trimmed.split(/\s+/)
  const command = parts[parts.length - 1]
  if (!command.startsWith('/')) {
    return null
  }

  const contentLine = trimmed.slice(0, trimmed.length - command.length).trim()
  if (!contentLine) {
    return null
  }

  let removed = false
  const cleanText = rawText
    .split(/\r?\n/)
    .map((row) => {
      if (removed) {
        return row
      }
      if (row.trim() === trimmed) {
        removed = true
        return contentLine
      }
      return row
    })
    .join('\n')
    .trim()

  return { command, args: '', cleanText }
}

export function resolveSlashPrompt(text: string, baseSystemPrompt: string, commands: SlashCommandMap): ResolvedPrompt {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return { text, systemPrompt: baseSystemPrompt }
  }

  const firstLine = lines[0]
  const lastLine = lines[lines.length - 1]

  const matched = parseCommandLine(text, firstLine)
    ?? parseCommandLine(text, lastLine)
    ?? parseTrailingCommand(text, lastLine)

  if (!matched) {
    return { text, systemPrompt: baseSystemPrompt }
  }

  const template = commands[matched.command]
  if (!template) {
    return { text, systemPrompt: baseSystemPrompt }
  }

  const dynamicInstruction = template
    .replaceAll('{{args}}', matched.args)
    .replaceAll('{{text}}', matched.cleanText)
    .trim()

  if (!dynamicInstruction) {
    return { text: matched.cleanText, systemPrompt: baseSystemPrompt, command: matched.command }
  }

  return {
    text: matched.cleanText,
    systemPrompt: `${baseSystemPrompt}\n\nADDITIONAL TASK:\n${dynamicInstruction}`,
    command: matched.command,
  }
}
