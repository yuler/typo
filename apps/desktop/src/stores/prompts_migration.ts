import { api } from '@/api'
import { logger } from '@/logger'
import * as authStore from './auth'
import * as settingsStore from './settings'

/**
 * Returns true when the signed-in account has no server prompts but local prompts exist.
 *
 * TODO: Remove this file entirely in v2.0 once all legacy users are migrated.
 */
export async function needsPromptsMigration(): Promise<boolean> {
  const token = await authStore.getAuth('access_token')
  if (!token)
    return false

  try {
    const [serverSlashPrompts, serverDefaultPrompt] = await Promise.all([
      api<any[]>('/api/v1/slash_prompts', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      api<{ value: string }>('/api/v1/default_prompt', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null),
    ])

    const needsSlashMigration = serverSlashPrompts.length === 0
    const localSlashPrompts = await settingsStore.get('slash_commands')
    const hasLocalSlashPrompts = localSlashPrompts.length > 0

    const needsDefaultMigration = !serverDefaultPrompt?.value
    const localDefaultPrompt = await settingsStore.get('ai_system_prompt')
    const hasLocalDefaultPrompt = Boolean(localDefaultPrompt?.trim())

    return (needsSlashMigration && hasLocalSlashPrompts) || (needsDefaultMigration && hasLocalDefaultPrompt)
  }
  catch (error) {
    logger.error('prompts_migration', 'Failed to check prompts migration status', error)
    return false
  }
}

/**
 * Handles one-time migration for older users whose accounts have no prompts on the server.
 * Returns true if a migration was executed, false if already migrated or skipped.
 *
 * TODO: Remove this file entirely in v2.0 once all legacy users are migrated.
 */
export async function runPromptsMigration(): Promise<boolean> {
  const token = await authStore.getAuth('access_token')
  if (!token)
    return false

  try {
    const [serverSlashPrompts, serverDefaultPrompt] = await Promise.all([
      api<any[]>('/api/v1/slash_prompts', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      api<{ value: string }>('/api/v1/default_prompt', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null),
    ])

    let migrated = false

    if (serverSlashPrompts.length === 0) {
      logger.info('prompts_migration', 'Starting one-time local slash prompts migration to server.')

      const localPrompts = await settingsStore.get('slash_commands')
      const uploadedPrompts: any[] = []

      for (const localPrompt of localPrompts) {
        const created = await api<any>('/api/v1/slash_prompts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            slash_prompt: {
              key: localPrompt.key,
              value: localPrompt.value,
              aliases: localPrompt.aliases || [],
            },
          }),
        })
        uploadedPrompts.push(created)
      }

      await settingsStore.set('slash_commands', uploadedPrompts)
      migrated = uploadedPrompts.length > 0
    }

    if (!serverDefaultPrompt?.value) {
      logger.info('prompts_migration', 'Starting one-time local default prompt migration to server.')

      const localDefaultPrompt = await settingsStore.get('ai_system_prompt')
      if (localDefaultPrompt?.trim()) {
        await api('/api/v1/default_prompt', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            default_prompt: { value: localDefaultPrompt },
          }),
        })
        migrated = true
      }
    }

    await settingsStore.save()

    if (migrated) {
      logger.info('prompts_migration', 'Local prompts migration completed successfully.')
    }

    return migrated
  }
  catch (error) {
    logger.error('prompts_migration', 'Failed to run prompts migration', error)
    return false
  }
}
