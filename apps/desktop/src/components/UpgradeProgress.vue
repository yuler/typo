<script setup lang="ts">
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  progress: number
}>()

const { t } = useI18n()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <AlertDialog v-model:open="model">
    <AlertDialogContent @escape-key-down.prevent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('upgrade.downloading') }}</AlertDialogTitle>
        <AlertDialogDescription>
          <Progress :model-value="progress" class="w-full" />
        </AlertDialogDescription>
      </AlertDialogHeader>
    </AlertDialogContent>
  </AlertDialog>
</template>
