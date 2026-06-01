<script setup lang="ts">
import type { CompletionRecord } from '@/composables/useCompletions'
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, CopyIcon, Loader2Icon, Trash2Icon } from 'lucide-vue-next'
import { computed, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'

const props = defineProps<{
  item: CompletionRecord
  isDeleting: boolean
  isFocused: boolean
}>()
const emit = defineEmits<{
  delete: [id: string]
  requestDelete: [id: string]
}>()
const DELETE_HOLD_MS = 800
const PROGRESS_RADIUS = 18
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS

const { t } = useI18n()
const copied = ref(false)
const expanded = ref(false)
const deleteHoldProgress = ref(0)

let holdRaf = 0
let holdStartedAt = 0

const progressOffset = computed(() =>
  PROGRESS_CIRCUMFERENCE * (1 - deleteHoldProgress.value),
)

const formattedTime = computed(() => {
  const date = new Date(props.item.created_at)
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const durationLabel = computed(() => {
  const ms = props.item.duration_ms
  if (ms == null || ms < 0)
    return null
  if (ms < 1000)
    return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`
})

function cancelDeleteHold() {
  if (holdRaf) {
    cancelAnimationFrame(holdRaf)
    holdRaf = 0
  }
  deleteHoldProgress.value = 0
}

function startDeleteHold() {
  if (props.isDeleting)
    return

  cancelDeleteHold()
  deleteHoldProgress.value = 0.001
  holdStartedAt = performance.now()

  const tick = () => {
    const elapsed = performance.now() - holdStartedAt
    const progress = Math.min(1, elapsed / DELETE_HOLD_MS)
    deleteHoldProgress.value = progress

    if (progress >= 1) {
      cancelDeleteHold()
      emit('delete', props.item.id)
      return
    }

    holdRaf = requestAnimationFrame(tick)
  }

  holdRaf = requestAnimationFrame(tick)
}

onUnmounted(() => {
  cancelDeleteHold()
})

async function copyContent() {
  try {
    const text = `${props.item.input}\n---\n${props.item.output}`
    await navigator.clipboard.writeText(text)
    copied.value = true
    toast.success(t('history.copy_success'))
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch (err) {
    logger.error('HistoryCompletion', 'Failed to copy to clipboard', err)
    toast.error(t('history.copy_error'))
  }
}

function requestDelete() {
  if (props.isDeleting)
    return
  emit('requestDelete', props.item.id)
}

function openPromptDetail() {
  if (props.item.prompt)
    expanded.value = true
}

function closePromptDetail() {
  expanded.value = false
}

defineExpose({ copyContent, startDeleteHold, cancelDeleteHold, openPromptDetail, closePromptDetail })
</script>

<template>
  <div
    class="relative scroll-mt-9 rounded-lg border bg-card/60 p-3 shadow-sm transition-colors duration-150"
    :class="isFocused ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : 'border-border/50'"
  >
    <div
      v-if="deleteHoldProgress > 0"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/75 backdrop-blur-[2px]"
      aria-live="polite"
      :aria-label="t('history.delete_holding')"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="relative flex size-14 shrink-0 items-center justify-center">
          <svg
            class="absolute inset-0 size-14 -rotate-90"
            viewBox="0 0 44 44"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              :r="PROGRESS_RADIUS"
              fill="none"
              class="stroke-muted/40"
              stroke-width="3"
            />
            <circle
              cx="22"
              cy="22"
              :r="PROGRESS_RADIUS"
              fill="none"
              class="stroke-destructive transition-none"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="PROGRESS_CIRCUMFERENCE"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <Trash2Icon class="relative z-[1] size-5 text-destructive" />
        </div>
        <span class="text-[10px] font-medium text-muted-foreground">
          {{ t('history.delete_holding') }}
        </span>
      </div>
    </div>

    <!-- Header row: time + tags + actions -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
          {{ formattedTime }}
        </span>
        <Badge
          v-if="durationLabel"
          variant="outline"
          class="h-4 shrink-0 px-1.5 py-0 text-[10px] leading-none tabular-nums"
          :title="t('history.duration_tag', { duration: durationLabel })"
        >
          {{ durationLabel }}
        </Badge>
        <Badge
          v-if="item.prompt_key"
          variant="secondary"
          class="h-4 shrink-0 px-1.5 py-0 text-[10px] leading-none"
        >
          {{ item.prompt_key }}
        </Badge>
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          :title="t('history.copy_content')"
          tabindex="-1"
          @click.stop="copyContent"
        >
          <CheckIcon
            v-if="copied"
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
          class="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 select-none"
          :disabled="isDeleting"
          :title="t('history.delete_action')"
          tabindex="-1"
          @click.stop="requestDelete"
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

    <!-- Content preview: input → output -->
    <div class="space-y-1">
      <p class="text-xs text-foreground/70 leading-snug line-clamp-1 break-words">
        {{ item.input }}
      </p>
      <p class="text-xs font-medium text-foreground leading-snug line-clamp-1 break-words">
        {{ item.output }}
      </p>
    </div>

    <!-- Expand prompt detail -->
    <button
      v-if="item.prompt"
      class="mt-2 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors cursor-pointer"
      tabindex="-1"
      @click.stop="expanded = !expanded"
    >
      <ChevronDownIcon
        v-if="expanded"
        class="h-3 w-3"
      />
      <ChevronRightIcon
        v-else
        class="h-3 w-3"
      />
      {{ t('history.show_prompt') }}
    </button>
    <div
      v-if="expanded && item.prompt"
      class="mt-1.5 rounded-md bg-muted/40 border border-border/30 px-2.5 py-2"
    >
      <p class="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
        {{ item.prompt }}
      </p>
    </div>
  </div>
</template>
