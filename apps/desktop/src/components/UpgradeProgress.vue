<script setup lang="ts">
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'

defineProps<{
  progress: number
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <AlertDialog v-model:open="model">
    <AlertDialogContent @escape-key-down.prevent>
      <AlertDialogHeader>
        <AlertDialogTitle>Downloading...</AlertDialogTitle>
        <AlertDialogDescription>
          <Progress :model-value="progress" class="w-full" />
        </AlertDialogDescription>
      </AlertDialogHeader>
    </AlertDialogContent>
  </AlertDialog>
</template>
