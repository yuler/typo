<script setup lang="ts">
import { ref } from 'vue'
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
import { Loader2 } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  id: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', data: any): void
}>()

const { t } = useI18n()
const loading = ref(false)
const error = ref<string | null>(null)

async function handleImport() {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`https://typo.yuler.cc/prompts/${props.id}.json`)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    const data = await response.json()
    emit('success', data)
    emit('close')
  }
  catch (err: any) {
    error.value = err.message || t('import.error')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AlertDialog :open="true" @update:open="(open) => !open && emit('close')">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('import.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          <div v-if="error" class="text-destructive mt-2">
            {{ t('import.error') }}: {{ error }}
          </div>
          <div v-else class="mt-2">
            {{ t('import.description', { id: props.id }) }}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading" @click="emit('close')">
          {{ t('import.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction :disabled="loading" @click="handleImport">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ t('import.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
