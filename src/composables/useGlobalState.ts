import { createGlobalState } from '@vueuse/core'
import { shallowRef } from 'vue'

export type CurrentWindow = 'Main' | 'Settings' | 'None'

export const useGlobalState = createGlobalState(() => {
  const currentWindow = shallowRef<CurrentWindow>('Main')
  const setCurrentWindow = (window: CurrentWindow) => {
    currentWindow.value = window
  }

  return {
    currentWindow,
    setCurrentWindow,
  }
})
