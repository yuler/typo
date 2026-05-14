<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted, onUnmounted } from 'vue'
import AppSettings from '@/components/AppSettings.vue'
import { initializeI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { initializeStore } from '@/store'
import Indicator from '@/windows/Indicator.vue'
import Main from '@/windows/Main.vue'
import Upgrade from '@/windows/Upgrade.vue'

const appWindow = getCurrentWebviewWindow()
const currentLabel = appWindow.label

const windows: Record<string, any> = {
  main: Main,
  indicator: Indicator,
  settings: AppSettings,
  upgrade: Upgrade,
}

let isMounted = true
onMounted(async () => {
  logger.info('App', `onMounted for window: ${currentLabel}`)

  // 基础初始化在每个窗口都需要执行
  await initializeStore()
  if (!isMounted) {
    return
  }
  await initializeI18n()
  if (!isMounted) {
    return
  }

  // 对于 main 和 indicator 窗口，确保它在所有工作区可见
  if (currentLabel === 'main' || currentLabel === 'indicator') {
    await appWindow.setVisibleOnAllWorkspaces(true)
  }
})

onUnmounted(() => {
  isMounted = false
})
</script>

<template>
  <main
    class="h-screen w-screen overflow-hidden bg-transparent"
  >
    <component :is="windows[currentLabel]" v-if="windows[currentLabel]" />
    <div v-else class="flex items-center justify-center h-full text-white">
      Unknown window label: {{ currentLabel }}
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  overflow: hidden;
}

#app {
  height: 100vh;
  background-color: transparent;
  overflow: hidden;
}
</style>
