<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { onMounted } from 'vue'
import { initializeI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { initializeStore } from '@/store'
import CapsuleMain from '@/views/CapsuleMain.vue'
import SettingsView from '@/views/SettingsView.vue'
import UpgradeView from '@/views/UpgradeView.vue'

const appWindow = getCurrentWebviewWindow()
const currentLabel = appWindow.label

onMounted(async () => {
  logger.info('App', `onMounted for window: ${currentLabel}`)

  // 基础初始化在每个窗口都需要执行
  await initializeStore()
  await initializeI18n()

  // 对于 main 窗口，确保它在所有工作区可见
  if (currentLabel === 'main') {
    await appWindow.setVisibleOnAllWorkspaces(true)
  }
})
</script>

<template>
  <main class="h-screen w-screen overflow-hidden bg-transparent">
    <CapsuleMain v-if="currentLabel === 'main'" />
    <SettingsView v-else-if="currentLabel === 'settings'" />
    <UpgradeView v-else-if="currentLabel === 'upgrade'" />
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
  color: #fff;
}
</style>
