<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  version: string
  notes: string
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()

const { t } = useI18n()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <AlertDialog v-model:open="model">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('upgrade.title', { version }) }}</AlertDialogTitle>
        <AlertDialogDescription>
          <span class="text-sm text-muted-foreground">
            {{ notes }}
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('cancel')">
          {{ t('upgrade.later') }}
        </AlertDialogCancel>
        <AlertDialogAction @click="emit('confirm')">
          {{ t('upgrade.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
