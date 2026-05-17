import { invoke } from '@tauri-apps/api/core'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { logger } from '@/logger'
import { DEFAULT_GLOBAL_SHORTCUT, get } from './stores/settings'

async function onShortcut() {
  logger.info('shortcut', 'onShortcut')
  const selectedText = (await invoke('get_selected_text')) as string
  let payload: { text: string, mode: string } | null = null

  if (selectedText) {
    payload = { text: selectedText, mode: 'selected' }
  }
  else if (await get('autoselect')) {
    await invoke('keyboard_select_all')
    const autoSelectedText = (await invoke('get_selected_text')) as string
    if (autoSelectedText) {
      payload = { text: autoSelectedText, mode: 'autoselect' }
    }
  }

  // Always show the indicator window
  await invoke('open_indicator_window')

  const indicatorWindow = await WebviewWindow.getByLabel('indicator')
  if (indicatorWindow) {
    if (payload) {
      await invoke('set_pending_selection_input', { payload })
      logger.info('shortcut', 'emit set-input to indicator', payload)
      await indicatorWindow.emit('set-input', payload)
    }
    else {
      // Just show it if no payload
      await indicatorWindow.show()
    }
  }
}

export async function unregisterCurrentGlobalShortcut(): Promise<void> {
  try {
    await unregisterAll()
  }
  catch (e) {
    logger.error('shortcut', 'Failed to unregisterAll', e)
    const storedShortcut = await get('global_shortcut')
    for (const shortcut of [DEFAULT_GLOBAL_SHORTCUT, storedShortcut]) {
      if (shortcut) {
        try {
          await unregister(shortcut)
        }
        catch {}
      }
    }
  }
}

export async function setupGlobalShortcut(shortcut?: string): Promise<string> {
  logger.info('shortcut', 'setupGlobalShortcut', shortcut)
  // 1. Unregister all existing shortcuts first
  await unregisterCurrentGlobalShortcut()

  // 2. Determine shortcut to register
  const shortcutToRegister = shortcut || (await get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

  try {
    await register(shortcutToRegister, (event) => {
      logger.debug('shortcut', 'event', event)
      if (event.state === 'Released')
        onShortcut()
    })
    logger.info('shortcut', 'registered', shortcutToRegister)
    return shortcutToRegister
  }
  catch (e) {
    logger.error('shortcut', `Failed to register shortcut ${shortcutToRegister}:`, e)
    // 3. Fallback to default if custom fails
    if (shortcutToRegister !== DEFAULT_GLOBAL_SHORTCUT) {
      try {
        await register(DEFAULT_GLOBAL_SHORTCUT, (event) => {
          if (event.state === 'Released')
            onShortcut()
        })
        return DEFAULT_GLOBAL_SHORTCUT
      }
      catch (fallbackError) {
        logger.error('shortcut', 'Failed to register fallback shortcut:', fallbackError)
      }
    }
  }
  return ''
}
