<!-- apps/desktop/src/views/UpgradeView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import Window from '@/components/Window.vue'
import { useGlobalState } from '@/composables/useGlobalState'
import { logger } from '@/logger'

const { setCurrentWindow } = useGlobalState()

onMounted(() => {
  logger.info('UpgradeView', 'onMounted, setting state to Upgrade')
  setCurrentWindow('Upgrade')
})
</script>

<template>
  <div class="h-full flex flex-col bg-[#181818] text-white">
    <Window class="flex-1" />
  </div>
</template>
