<script setup lang="ts">
import type { CompletionRecord } from '@/api'
import {
  HistoryIcon,
  Loader2Icon,
  LockIcon,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HistoryCompletion from '@/components/HistoryCompletion.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/composables/useAuth'
import { useCompletions } from '@/composables/useCompletions'
import { useI18n } from '@/composables/useI18n'

type HistoryFilter = 'all' | 'today' | 'week' | 'month'

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

const activeFilter = ref<HistoryFilter>('all')
const itemToDelete = ref<string | null>(null)
const isConfirmOpen = ref(false)
const focusedIndex = ref(-1)
const listContainerRef = ref<HTMLElement | null>(null)
const completionRefs = ref<Map<string, InstanceType<typeof HistoryCompletion>>>(new Map())

const filterOptions = [
  { value: 'all', labelKey: 'history.filter.all' },
  { value: 'today', labelKey: 'history.filter.today' },
  { value: 'week', labelKey: 'history.filter.week' },
  { value: 'month', labelKey: 'history.filter.month' },
] as const satisfies ReadonlyArray<{ value: HistoryFilter, labelKey: string }>

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function matchesFilter(createdAt: string, filter: HistoryFilter) {
  const date = new Date(createdAt)
  const todayStart = startOfDay(new Date())

  if (filter === 'all')
    return true
  if (filter === 'today')
    return date >= todayStart
  if (filter === 'week') {
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 6)
    return date >= weekStart
  }
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 29)
  return date >= monthStart
}

function dayKey(createdAt: string) {
  const d = new Date(createdAt)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function dayLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = startOfDay(new Date(year, month - 1, day))
  const today = startOfDay(new Date())
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)

  if (diffDays === 0)
    return t('history.day_today')
  if (diffDays === 1)
    return t('history.day_yesterday')
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

const filteredCompletions = computed(() =>
  completions.value.filter(item => matchesFilter(item.created_at, activeFilter.value)),
)

const groupedByDay = computed(() => {
  const groups = new Map<string, CompletionRecord[]>()

  for (const item of filteredCompletions.value) {
    const key = dayKey(item.created_at)
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      key,
      label: dayLabel(key),
      items,
    }))
})

// Flat ordered list for keyboard navigation
const flatItems = computed(() =>
  groupedByDay.value.flatMap(group => group.items),
)

const focusedItemId = computed(() => {
  const items = flatItems.value
  if (focusedIndex.value < 0 || focusedIndex.value >= items.length) return null
  return items[focusedIndex.value]?.id ?? null
})

function moveFocus(delta: number) {
  const len = flatItems.value.length
  if (len === 0) return

  if (focusedIndex.value < 0) {
    focusedIndex.value = delta > 0 ? 0 : len - 1
  }
  else {
    focusedIndex.value = Math.max(0, Math.min(len - 1, focusedIndex.value + delta))
  }

  nextTick(() => scrollFocusedIntoView())
}

function scrollFocusedIntoView() {
  const id = focusedItemId.value
  if (!id) return
  const el = document.getElementById(`history-item-${id}`)
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function handleListKeydown(e: KeyboardEvent) {
  if (isConfirmOpen.value) return

  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
    e.preventDefault()
    moveFocus(1)
  }
  else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
    e.preventDefault()
    moveFocus(-1)
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const id = focusedItemId.value
    if (!id)
      return
    const comp = completionRefs.value.get(id)
    comp?.copyContent()
  }
  else if (e.key === 'Escape') {
    focusedIndex.value = -1
  }
}

function setCompletionRef(id: string, el: any) {
  if (el) {
    completionRefs.value.set(id, el)
  }
  else {
    completionRefs.value.delete(id)
  }
}

// Reset focus when filter changes
watch(activeFilter, () => {
  focusedIndex.value = -1
})

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
    <!-- Logged Out State -->
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
      <div class="flex items-center justify-between gap-3 pb-3">
        <h2 class="text-xl font-bold tracking-tight shrink-0">
          {{ t('history.title') }}
        </h2>
        <div class="flex flex-wrap justify-end gap-1">
          <Button
            v-for="option in filterOptions"
            :key="option.value"
            size="sm"
            :variant="activeFilter === option.value ? 'default' : 'outline'"
            class="h-7 px-2.5 text-xs rounded-lg"
            @click="activeFilter = option.value"
          >
            {{ t(option.labelKey) }}
          </Button>
        </div>
      </div>

      <!-- Initial Loading -->
      <div
        v-if="isLoading"
        class="flex-1 overflow-y-auto space-y-3 pr-1"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-lg border border-border/40 p-3 space-y-2"
        >
          <Skeleton class="h-3 w-2/3" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="h-3 w-5/6" />
        </div>
      </div>

      <!-- Empty (no items at all) -->
      <div
        v-else-if="completions.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-2xl border border-dashed border-border"
      >
        <div class="p-4 bg-muted/20 rounded-full inline-block text-muted-foreground/30 mb-4">
          <HistoryIcon class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-semibold text-foreground/70">
          {{ t('history.empty_title') }}
        </h3>
        <p class="text-sm text-muted-foreground max-w-xs mt-1">
          {{ t('history.empty_desc') }}
        </p>
      </div>

      <!-- Filtered empty -->
      <div
        v-else-if="filteredCompletions.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed border-border"
      >
        <p class="text-sm text-muted-foreground">
          {{ t('history.filter_empty') }}
        </p>
      </div>

      <!-- Grouped list -->
      <div
        v-else
        ref="listContainerRef"
        class="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 -mr-1 outline-none"
        tabindex="0"
        @keydown="handleListKeydown"
      >
        <div class="flex flex-col gap-5 pb-4">
          <section
            v-for="group in groupedByDay"
            :key="group.key"
            class="space-y-2"
          >
            <h3 class="text-xs font-semibold text-muted-foreground sticky top-0 z-10 bg-background/90 backdrop-blur-sm py-1">
              {{ group.label }}
            </h3>
            <TransitionGroup
              name="list"
              tag="div"
              class="flex flex-col gap-2"
            >
              <HistoryCompletion
                v-for="item in group.items"
                :id="`history-item-${item.id}`"
                :ref="(el: any) => setCompletionRef(item.id, el)"
                :key="item.id"
                :item="item"
                :is-deleting="isDeleting === item.id"
                :is-focused="focusedItemId === item.id"
                @delete="confirmDelete"
              />
            </TransitionGroup>
          </section>

          <div
            v-if="hasMore"
            class="pt-1 flex justify-center"
          >
            <Button
              variant="outline"
              size="sm"
              class="w-full rounded-lg text-xs font-semibold"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <Loader2Icon
                v-if="isLoadingMore"
                class="w-3.5 h-3.5 mr-2 animate-spin"
              />
              {{ t('history.load_more') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

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
            {{ t('action.cancel') }}
          </Button>
          <Button
            variant="destructive"
            class="rounded-xl px-5 shadow-sm font-semibold"
            @click="handleDeleteConfirm"
          >
            {{ t('history.delete_action') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
