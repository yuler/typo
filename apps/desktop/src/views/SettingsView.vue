<!-- apps/desktop/src/views/SettingsView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { logger } from '@/logger'

const { setCurrentWindow } = useGlobalState()

onMounted(() => {
  logger.info('SettingsView', 'onMounted, setting state to Settings')
  setCurrentWindow('Settings')
})

function onSettings() {
  setCurrentWindow('Settings')
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-[#181818]">
    <Navbar @settings="onSettings" />
    <Window class="flex-1" />
  </div>
</template>

<style scoped>
/* 确保设置窗口有正确的背景色 */
div {
  color-scheme: dark;
}
</style>
