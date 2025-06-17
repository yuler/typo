<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { HomeIcon, SettingsIcon } from 'lucide-vue-next'
// import { useCurrentWindow } from '../composables/useCurrentWindow'
import { useGlobalState } from '../composables/useGlobalState'

defineEmits<{
  (event: 'changeWindow', window: 'Main' | 'Settings'): void
}>()

const { currentWindow } = useGlobalState()

function openGitHubRepo() {
  openUrl('https://github.com/yuler/typo')
}
</script>

<template>
  <div data-tauri-drag-region class="p-4 bg-white flex cursor-move items-center justify-between">
    <div class="flex gap-2 items-center">
      <!-- <img src="/logo.png" alt="logo" class="w-10 h-10"> -->
      <h1 class="text-xl text-black font-bold" @click="openGitHubRepo">
        🤖 Typo
      </h1>
    </div>
    {{ currentWindow }}
    <div class="flex gap-2 items-center">
      <button v-if="currentWindow === 'Main'" class="cursor-pointer" @click="$emit('changeWindow', 'Settings')">
        <SettingsIcon class="text-black h-6 w-6" />
      </button>
      <button v-else class="cursor-pointer" @click="$emit('changeWindow', 'Main')">
        <HomeIcon class="text-black h-6 w-6" />
      </button>
    </div>
  </div>
</template>
