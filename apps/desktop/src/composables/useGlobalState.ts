import type { Update } from '@tauri-apps/plugin-updater'
import { createGlobalState } from '@vueuse/core'
import { shallowRef } from 'vue'

export type CurrentWindow = 'Main' | 'Settings' | 'Upgrade' | 'None'
export type SettingsTab = 'basic' | 'prompts'

export const useGlobalState = createGlobalState(() => {
  const currentWindow = shallowRef<CurrentWindow>('Main')
  const setCurrentWindow = (window: CurrentWindow) => {
    currentWindow.value = window
  }

  const settingsTab = shallowRef<SettingsTab>('basic')
  const setSettingsTab = (tab: SettingsTab) => {
    settingsTab.value = tab
  }

  const updateInfo = shallowRef<Update | null>(null)
  const setUpdateInfo = (update: Update) => {
    updateInfo.value = update
  }

  return {
    currentWindow,
    setCurrentWindow,
    settingsTab,
    setSettingsTab,
    updateInfo,
    setUpdateInfo,
  }
})
