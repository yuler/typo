import type { Update } from '@tauri-apps/plugin-updater'
import { createGlobalState } from '@vueuse/core'
import { shallowRef } from 'vue'
import { logger } from '@/logger'

export type CurrentWindow = 'Main' | 'Settings' | 'Upgrade' | 'None'

export const useGlobalState = createGlobalState(() => {
  const currentWindow = shallowRef<CurrentWindow>('Main')
  const setCurrentWindow = (window: CurrentWindow) => {
    logger.info('state', 'setCurrentWindow', window)
    currentWindow.value = window
  }

  const updateInfo = shallowRef<Update | null>(null)
  const setUpdateInfo = (update: Update) => {
    logger.info('state', 'setUpdateInfo', update)
    updateInfo.value = update
  }

  return {
    currentWindow,
    setCurrentWindow,
    updateInfo,
    setUpdateInfo,
  }
})
