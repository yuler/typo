<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  drag?: boolean
  version?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  drag: false,
  version: false,
})

const appVersion = __APP_VERSION__
</script>

<template>
  <div
    :class="cn('relative flex flex-col items-center shrink-0 h-12 w-12', props.class)"
    :data-tauri-drag-region="drag ? true : undefined"
  >
    <img src="@/assets/logo.png" alt="logo" class="w-full h-full object-contain pointer-events-none">
    <span v-if="version" class="text-[8px] absolute top-1 right-0 text-muted-foreground/60 pointer-events-none">v{{ appVersion }}</span>
  </div>
</template>
