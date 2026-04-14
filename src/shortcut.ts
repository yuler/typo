import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useGlobalState } from '@/composables/useGlobalState'
import store from './store'
import {
  type ShortcutRegistrationStatus,
  shouldRegisterPluginGlobalShortcuts,
} from './shortcut_policy'

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+X'
const SETTING_SHORTCUT = 'CommandOrControl+,'

async function onMainShortcutReleased() {
  const selectedText = await invoke('get_selected_text')

  const appWindow = WebviewWindow.getCurrent()
  await appWindow?.setVisibleOnAllWorkspaces(true)

  if (selectedText) {
    await appWindow?.emit('set-input', { text: selectedText, mode: 'selected' })
  }
  else if (await store.get('autoselect')) {
    await invoke('select_all')
    const autoSelectedText = await invoke('get_selected_text')
    await appWindow?.emit('set-input', { text: autoSelectedText, mode: 'autoselect' })
  }
}

async function onSettingsShortcutReleased() {
  const { setCurrentWindow } = useGlobalState()
  setCurrentWindow('Settings')
}

export async function setupGlobalShortcut() {
  try {
    const status = await invoke<ShortcutRegistrationStatus>('get_shortcut_registration_status')

    await listen<string>('typo-global-shortcut', async (e) => {
      if (e.payload === 'main') {
        await onMainShortcutReleased()
      }
      else if (e.payload === 'settings') {
        await onSettingsShortcutReleased()
      }
    })

    if (!shouldRegisterPluginGlobalShortcuts(status)) {
      return
    }

    if (await isRegistered(DEFAULT_SHORTCUT)) {
      await unregister(DEFAULT_SHORTCUT)
    }
    if (await isRegistered(SETTING_SHORTCUT)) {
      await unregister(SETTING_SHORTCUT)
    }

    await register(DEFAULT_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }
      await onMainShortcutReleased()
    })

    await register(SETTING_SHORTCUT, async (event) => {
      if (event.state !== 'Released') {
        return
      }
      await onSettingsShortcutReleased()
    })

    await invoke('shortcut_mark_plugin_active')
  }
  catch (error) {
    console.error('Error setting up global shortcut:', error)
  }
}
