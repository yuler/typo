import { api } from '@/api'
import { logger } from '@/logger'
import * as authStore from './auth'
import * as settingsStore from './settings'

/**
 * Handles one-time migration for older users whose accounts have no prompts on the server.
 * Returns true if a migration was executed, false if already migrated or skipped.
 *
 * TODO: Remove this file entirely in v2.0 once all legacy users are migrated.
 */
export async function runPromptsMigration(serverPrompts: any[]): Promise<boolean> {
  // If the server already has prompts, this account is already migrated/new.
  if (serverPrompts.length > 0) {
    return false
  }

  const token = await authStore.getAuth('access_token')
  if (!token)
    return false

  try {
    logger.info('prompts_migration', 'Starting one-time local prompts migration to server.')

    // Get current local prompts
    const localPrompts = await settingsStore.get('slash_commands')

    const uploadedPrompts: any[] = []
    for (const localPrompt of localPrompts) {
      const created = await api<any>('/api/v1/prompts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          key: localPrompt.key,
          value: localPrompt.value,
          aliases: localPrompt.aliases || [],
        }),
      })
      uploadedPrompts.push(created)
    }

    // Save synced prompts (with their database UUIDs) back to settings
    await settingsStore.set('slash_commands', uploadedPrompts)
    await settingsStore.save()

    logger.info('prompts_migration', 'Local prompts migration completed successfully.')
    return true
  }
  catch (error) {
    logger.error('prompts_migration', 'Failed to run prompts migration', error)
    return false
  }
}
