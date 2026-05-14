import type { Update } from '@tauri-apps/plugin-updater'
import { createGlobalState } from '@vueuse/core'
import { shallowRef } from 'vue'
import { logger } from '@/logger'

export const useGlobalState = createGlobalState(() => {
  const updateInfo = shallowRef<Update | null>(null)
  const setUpdateInfo = (update: Update) => {
    logger.info('state', 'setUpdateInfo', update)
    updateInfo.value = update
  }

  return {
    updateInfo,
    setUpdateInfo,
  }
})
