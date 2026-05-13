<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted } from 'vue'
import { initializeI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { initializeStore } from '@/store'
import Home from '@/windows/Home.vue'
import Indicator from '@/windows/Indicator.vue'
import Settings from '@/windows/Settings.vue'
import Upgrade from '@/windows/Upgrade.vue'

const appWindow = getCurrentWebviewWindow()
const currentLabel = appWindow.label

const windows: Record<string, any> = {
  home: Home,
  indicator: Indicator,
  settings: Settings,
  upgrade: Upgrade,
}

onMounted(async () => {
  logger.info('App', `onMounted for window: ${currentLabel}`)

  // 基础初始化在每个窗口都需要执行
  await initializeStore()
  await initializeI18n()

  // 对于 home 和 indicator 窗口，确保它在所有工作区可见
  if (currentLabel === 'home' || currentLabel === 'indicator') {
    await appWindow.setVisibleOnAllWorkspaces(true)
  }
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
