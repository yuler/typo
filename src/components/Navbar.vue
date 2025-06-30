<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { SettingsIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGlobalState } from '../composables/useGlobalState'

defineEmits<{
  (event: 'settings'): void
}>()

// __APP_VERSION__ is defined in vite.config.ts and available as a global variable
const appVersion = __APP_VERSION__

const { currentWindow } = useGlobalState()

function openGitHubRepo() {
  openUrl('https://github.com/yuler/typo')
}
</script>

<template>
  <div data-tauri-drag-region class="px-4 py-1 flex cursor-move items-center justify-between">
    <div class="flex gap-2 items-end cursor-pointer" @click="openGitHubRepo">
      <img src="@/assets/logo.png" alt="logo" class="h-8 rounded">
      <Badge variant="secondary">
        v{{ appVersion }}
      </Badge>
    </div>
    <Button v-if="currentWindow !== 'Settings'" variant="outline" size="icon" @click="$emit('settings')">
      <SettingsIcon class="h-6 w-6" />
    </Button>
  </div>
</template>
