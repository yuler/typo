<script setup lang="ts">
import { SettingsIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGlobalState } from '../composables/useGlobalState'

defineEmits<{
  (event: 'settings'): void
}>()

const appVersion = __APP_VERSION__

const { currentWindow } = useGlobalState()
</script>

<template>
  <div class="px-4 py-1 flex cursor-move items-center justify-between">
    <div class="flex gap-2 items-center cursor-pointer">
      <img data-tauri-drag-region src="@/assets/logo.png" alt="logo" class="w-10 h-10 object-contain rounded">
      <Badge variant="secondary">
        v{{ appVersion }}
      </Badge>
    </div>
    <Button v-if="currentWindow !== 'Settings'" variant="outline" size="icon" @click="$emit('settings')">
      <SettingsIcon class="h-6 w-6" />
    </Button>
  </div>
</template>
