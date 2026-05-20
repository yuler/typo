<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useI18n } from '@/composables/useI18n'

const emit = defineEmits<{
  (event: 'confirm'): void
}>()

const { t } = useI18n()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <AlertDialog v-model:open="model">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('slash_prompts_migration.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('slash_prompts_migration.description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction @click="emit('confirm')">
          {{ t('slash_prompts_migration.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
