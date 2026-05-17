<script setup lang="ts">
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:p-4 group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:gap-3',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }"
  />
</template>

<style>
/* 
  Sonner basic styles for visibility when the default CSS is missing or restricted.
  These provide basic positioning and animations.
*/
[data-sonner-toaster] {
  position: fixed;
  width: var(--width);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --light-border: #f0f0f0;
  --dark-border: #222;
  --base-gap: 10px;
  --toast-button-duration: 400ms;
}

[data-sonner-toaster][data-y-position="bottom"] {
  bottom: var(--mobile-offset, 20px);
}

[data-sonner-toaster][data-x-position="right"] {
  right: var(--mobile-offset, 20px);
}

[data-sonner-toast] {
  display: flex;
  align-items: center;
  width: 356px;
  background: white;
  border: 1px solid var(--light-border);
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 9999;
  position: absolute;
  transition: transform 400ms, opacity 400ms;
}

.dark [data-sonner-toast] {
  background: #000;
  border-color: var(--dark-border);
}
</style>
