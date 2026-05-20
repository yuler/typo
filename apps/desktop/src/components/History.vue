<script setup lang="ts">
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  HistoryIcon,
  Loader2Icon,
  LockIcon,
  Trash2Icon,
} from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/composables/useAuth'
import { useCompletions } from '@/composables/useCompletions'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const { isLoggedIn, login, authStatus } = useAuth()
const {
  completions,
  isLoading,
  isLoadingMore,
  isDeleting,
  hasMore,
  loadInitial,
  loadMore,
  remove,
} = useCompletions()

const expandedIds = ref<Set<string>>(new Set())
const copiedId = ref<string | null>(null)
const itemToDelete = ref<string | null>(null)
const isConfirmOpen = ref(false)

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  }
  else {
    expandedIds.value.add(id)
  }
}

async function copyToClipboard(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    toast.success(t('history.copy_success'))
    setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null
      }
    }, 2000)
  }
  catch (err) {
    console.error('Failed to copy to clipboard', err)
  }
}

function confirmDelete(id: string) {
  itemToDelete.value = id
  isConfirmOpen.value = true
}

async function handleDeleteConfirm() {
  if (itemToDelete.value) {
    const id = itemToDelete.value
    isConfirmOpen.value = false
    itemToDelete.value = null
    await remove(id)
  }
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  catch {
    return dateStr
  }
}

onMounted(() => {
  if (isLoggedIn.value) {
    loadInitial()
  }
})

watch(isLoggedIn, (newVal) => {
  if (newVal) {
    loadInitial()
  }
})
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
    <!-- Logged Out State (Login Wall) -->
    <div
      v-if="!isLoggedIn"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div class="max-w-md w-full bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-md shadow-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
          <LockIcon class="w-8 h-8" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('history.sign_in_title') }}
          </h2>
          <p class="text-sm text-muted-foreground leading-relaxed">
            {{ t('history.sign_in_desc') }}
          </p>
        </div>
        <Button
          class="w-full py-6 rounded-xl text-base font-semibold shadow-md transition-all active:scale-[0.98] duration-200"
          :disabled="authStatus === 'authorizing'"
          @click="login"
        >
          <Loader2Icon
            v-if="authStatus === 'authorizing'"
            class="w-5 h-5 mr-2 animate-spin"
          />
          <HistoryIcon
            v-else
            class="w-5 h-5 mr-2"
          />
          {{ t('history.sign_in_btn') }}
        </Button>
      </div>
    </div>

    <!-- Logged In State -->
    <div
      v-else
      class="flex-1 flex flex-col min-h-0 h-full overflow-hidden"
    >
      <!-- Title header -->
      <div class="flex items-center justify-between pb-4">
        <h2 class="text-xl font-bold tracking-tight">
          {{ t('history.title') }}
        </h2>
      </div>

      <!-- Initial Loading Skeleton -->
      <div
        v-if="isLoading"
        class="flex-1 overflow-y-auto space-y-4 pr-1"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="rounded-xl border border-border/40 p-6 space-y-4 bg-muted/10 animate-pulse"
        >
          <div class="flex items-center justify-between">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="h-6 w-16 rounded-full" />
          </div>
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
          </div>
          <Separator class="border-border/30" />
          <div class="space-y-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="completions.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-2xl border border-dashed border-border"
      >
        <div class="p-4 bg-muted/20 rounded-full inline-block text-muted-foreground/30 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <HistoryIcon class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-semibold text-foreground/70">
          {{ t('history.empty_title') }}
        </h3>
        <p class="text-sm text-muted-foreground max-w-xs mt-1">
          {{ t('history.empty_desc') }}
        </p>
      </div>

      <!-- History List -->
      <div
        v-else
        class="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 -mr-1"
      >
        <div class="flex flex-col gap-4 py-1">
          <TransitionGroup name="list">
            <div
              v-for="item in completions"
              :key="item.id"
              class="group relative rounded-xl border border-border/40 bg-gradient-to-br from-card to-card/50 p-5 shadow-sm transition-all hover:shadow-md hover:border-border/80 duration-300"
            >
              <!-- Card Header -->
              <div class="flex items-center justify-between pb-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5 font-medium">
                  <CalendarIcon class="w-3.5 h-3.5" />
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                    {{ item.status }}
                  </span>
                </div>
              </div>

              <!-- Input Section (Original) -->
              <div class="space-y-1.5 pb-3">
                <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                  {{ t('history.original') }}
                </div>
                <div class="text-sm text-foreground/80 leading-relaxed break-words bg-muted/30 p-3 rounded-lg border border-border/20">
                  <span v-if="!expandedIds.has(item.id) && item.input.length > 150">
                    {{ item.input.slice(0, 150) }}...
                  </span>
                  <span v-else>
                    {{ item.input }}
                  </span>
                  <button
                    v-if="item.input.length > 150"
                    type="button"
                    class="inline-flex items-center text-xs font-semibold text-primary hover:text-primary/80 ml-1 select-none"
                    @click="toggleExpand(item.id)"
                  >
                    {{ expandedIds.has(item.id) ? t('history.show_less') : t('history.show_more') }}
                    <ChevronUpIcon v-if="expandedIds.has(item.id)" class="w-3 h-3 ml-0.5" />
                    <ChevronDownIcon v-else class="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </div>

              <Separator class="opacity-40" />

              <!-- Output Section (Polished) -->
              <div class="space-y-1.5 pt-3">
                <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                  {{ t('history.polished') }}
                </div>
                <div class="text-sm font-medium text-foreground leading-relaxed break-words bg-primary/[0.02] dark:bg-primary/[0.01] p-3 rounded-lg border border-primary/10">
                  {{ item.output }}
                </div>
              </div>

              <!-- Top-right Quick Actions -->
              <div class="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/60"
                  @click="copyToClipboard(item.output, item.id)"
                >
                  <CheckIcon
                    v-if="copiedId === item.id"
                    class="w-4 h-4 text-emerald-500 animate-in fade-in zoom-in-50 duration-200"
                  />
                  <CopyIcon v-else class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md"
                  :disabled="isDeleting === item.id"
                  @click="confirmDelete(item.id)"
                >
                  <Loader2Icon
                    v-if="isDeleting === item.id"
                    class="w-4 h-4 animate-spin"
                  />
                  <Trash2Icon v-else class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TransitionGroup>

          <!-- Load More Control -->
          <div
            v-if="hasMore"
            class="pt-2 pb-6 flex justify-center"
          >
            <Button
              variant="outline"
              size="lg"
              class="w-full md:w-auto px-10 py-5 rounded-xl text-sm font-semibold transition-all hover:bg-accent/40 active:scale-[0.98] duration-200"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <Loader2Icon
                v-if="isLoadingMore"
                class="w-4 h-4 mr-2 animate-spin"
              />
              {{ t('history.load_more') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Deletion Confirmation Dialog -->
    <Dialog
      :open="isConfirmOpen"
      @update:open="isConfirmOpen = $event"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('history.delete_confirm_title') }}</DialogTitle>
          <DialogDescription class="pt-2 text-sm leading-relaxed text-muted-foreground">
            {{ t('history.delete_confirm_desc') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex items-center justify-end gap-2.5 pt-4">
          <Button
            variant="ghost"
            class="rounded-xl px-5"
            @click="isConfirmOpen = false"
          >
            {{ t('settings.slash_prompts.remove').replace(/.*?/, 'Cancel') }}
          </Button>
          <Button
            variant="destructive"
            class="rounded-xl px-5 shadow-sm font-semibold"
            @click="handleDeleteConfirm"
          >
            {{ t('settings.slash_prompts.remove') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}
.list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
