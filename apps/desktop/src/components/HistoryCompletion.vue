<script setup lang="ts">
import type { CompletionRecord } from '@/api'
import { CheckIcon, CopyIcon, Loader2Icon, Trash2Icon } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  item: CompletionRecord
  isDeleting: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const { t } = useI18n()
const copiedField = ref<'input' | 'output' | null>(null)

async function copyText(text: string, field: 'input' | 'output') {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    toast.success(field === 'input' ? t('history.copy_input_success') : t('history.copy_output_success'))
    setTimeout(() => {
      if (copiedField.value === field) {
        copiedField.value = null
      }
    }, 2000)
  }
  catch (err) {
    console.error('Failed to copy to clipboard', err)
  }
}
</script>

<template>
  <div class="rounded-lg border border-border/50 bg-card/60 p-3 shadow-sm">
    <div
      v-if="item.prompt"
      class="mb-2 pr-16"
    >
      <div class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70 mb-0.5">
        {{ t('history.prompt') }}
      </div>
      <p class="text-xs text-muted-foreground leading-snug line-clamp-2 break-words">
        {{ item.prompt }}
      </p>
    </div>

    <div class="flex items-start gap-1.5">
      <div class="flex-1 min-w-0 space-y-2">
        <div>
          <div class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70 mb-0.5">
            {{ t('history.original') }}
          </div>
          <p class="text-xs text-foreground/85 leading-snug line-clamp-2 break-words">
            {{ item.input }}
          </p>
        </div>
        <div>
          <div class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70 mb-0.5">
            {{ t('history.polished') }}
          </div>
          <p class="text-xs font-medium text-foreground leading-snug line-clamp-2 break-words">
            {{ item.output }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          :title="t('history.copy_input')"
          @click="copyText(item.input, 'input')"
        >
          <CheckIcon
            v-if="copiedField === 'input'"
            class="h-3.5 w-3.5 text-emerald-500"
          />
          <CopyIcon
            v-else
            class="h-3.5 w-3.5"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          :title="t('history.copy_output')"
          @click="copyText(item.output, 'output')"
        >
          <CheckIcon
            v-if="copiedField === 'output'"
            class="h-3.5 w-3.5 text-emerald-500"
          />
          <CopyIcon
            v-else
            class="h-3.5 w-3.5"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          :disabled="isDeleting"
          :title="t('history.delete_confirm_title')"
          @click="emit('delete', item.id)"
        >
          <Loader2Icon
            v-if="isDeleting"
            class="h-3.5 w-3.5 animate-spin"
          />
          <Trash2Icon
            v-else
            class="h-3.5 w-3.5"
          />
        </Button>
      </div>
    </div>
  </div>
</template>
