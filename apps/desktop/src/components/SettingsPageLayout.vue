<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="shrink-0 border-b border-border/40 bg-background/95 px-1 pb-4 backdrop-blur-sm">
      <h1 class="text-2xl font-bold">
        {{ title }}
      </h1>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pr-4 -mr-4">
      <div class="flex flex-col gap-6 py-4">
        <slot />
      </div>
    </div>

    <footer v-if="$slots.footer" class="shrink-0 border-t border-border/40 bg-background/95 px-1 py-4 backdrop-blur-sm">
      <div class="flex justify-end px-3">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>
