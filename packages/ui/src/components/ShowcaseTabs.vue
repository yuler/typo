<script setup lang="ts">
defineProps<{
  modelValue: number
  tabs: string[]
}>()

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
    <button
      v-for="(tab, index) in tabs"
      :key="tab"
      @click="$emit('update:modelValue', index)"
      :class="[
        'px-4 py-2 rounded-md text-sm font-medium transition-all',
        modelValue === index 
          ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' 
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
      ]"
    >
      {{ tab }}
    </button>
  </div>
</template>
