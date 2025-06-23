<script setup lang="ts">
import { TerminalIcon } from 'lucide-vue-next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <Alert variant="destructive" class="bg-red-500/10 border-red-500/30 text-red-500!">
    <TerminalIcon class="size-4" />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription class="text-red-500!">
      {{ description }}
    </AlertDescription>
    <slot />
  </Alert>
</template>
