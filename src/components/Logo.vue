<script setup lang="ts">
const appVersion = __APP_VERSION__
</script>

<template>
  <div
    class="relative flex flex-col items-center shrink-0"
    data-tauri-drag-region
  >
    <img src="@/assets/logo.png" alt="logo" class="w-12 pointer-events-none">
    <span class="text-[8px] absolute top-1 right-0 text-muted-foreground/60 pointer-events-none">v{{ appVersion }}</span>
  </div>
</template>
