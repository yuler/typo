<script setup lang="ts">
import type { CompletionRecord } from '@/api'
import {
  CircleHelpIcon,
  HistoryIcon,
  Loader2Icon,
  LockIcon,
  SearchIcon,
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
import { Input } from '@/components/ui/input'
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
const searchQuery = ref('')
const itemToDelete = ref<string | null>(null)
const isConfirmOpen = ref(false)
const isShortcutsOpen = ref(false)
const focusedIndex = ref(-1)
const listContainerRef = ref<HTMLElement | null>(null)
const completionRefs = ref<Map<string, InstanceType<typeof HistoryCompletion>>>(new Map())

const filterOptions = [
  { value: 'all', labelKey: 'history.filter.all' },
  { value: 'today', labelKey: 'history.filter.today' },
  { value: 'week', labelKey: 'history.filter.week' },
  { value: 'month', labelKey: 'history.filter.month' },
] as const satisfies ReadonlyArray<{ value: HistoryFilter, labelKey: string }>

const shortcutRows = computed(() => [
  { label: t('history.shortcuts.navigate'), keys: t('history.shortcuts.navigate_keys') },
  { label: t('history.shortcuts.copy'), keys: t('history.shortcuts.copy_keys') },
  { label: t('history.shortcuts.delete'), keys: t('history.shortcuts.delete_keys') },
  { label: t('history.shortcuts.search'), keys: t('history.shortcuts.search_keys') },
  { label: t('history.shortcuts.help'), keys: t('history.shortcuts.help_keys') },
  { label: t('history.shortcuts.clear_focus'), keys: t('history.shortcuts.clear_focus_keys') },
])

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

const flatItems = computed(() =>
  groupedByDay.value.flatMap(group => group.items),
)

const focusedItemId = computed(() => {
  const items = flatItems.value
  if (focusedIndex.value < 0 || focusedIndex.value >= items.length)
    return null
  return items[focusedIndex.value]?.id ?? null
})

const showList = computed(() =>
  !isLoading.value
  && completions.value.length > 0
  && filteredCompletions.value.length > 0,
)

function focusListAt(index: number) {
  const len = flatItems.value.length
  if (len === 0) {
    focusedIndex.value = -1
    return
  }
  focusedIndex.value = Math.max(0, Math.min(len - 1, index))
  nextTick(() => {
    listContainerRef.value?.focus()
    scrollFocusedIntoView()
  })
}

function autoFocusFirst() {
  focusListAt(0)
}

function moveFocus(delta: number) {
  const len = flatItems.value.length
  if (len === 0)
    return

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
  if (!id)
    return
  const el = document.getElementById(`history-item-${id}`)
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function copyFocusedItem() {
  const id = focusedItemId.value
  if (!id)
    return
  completionRefs.value.get(id)?.copyContent()
}

function focusSearchInput() {
  nextTick(() => {
    document.querySelector<HTMLInputElement>('[data-history-search]')?.focus()
  })
}

function isListShortcutEvent(e: KeyboardEvent) {
  if (isConfirmOpen.value || isShortcutsOpen.value)
    return false
  if (e.metaKey || e.ctrlKey || e.altKey)
    return false
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
    return false
  return true
}

function handleListKeydown(e: KeyboardEvent) {
  if (!isListShortcutEvent(e))
    return

  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
    e.preventDefault()
    moveFocus(1)
  }
  else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
    e.preventDefault()
    moveFocus(-1)
  }
  else if (e.key === 'Home') {
    e.preventDefault()
    focusListAt(0)
  }
  else if (e.key === 'End') {
    e.preventDefault()
    focusListAt(flatItems.value.length - 1)
  }
  else if (e.key === 'Enter' || e.key === 'c') {
    e.preventDefault()
    copyFocusedItem()
  }
  else if (e.key === 'd') {
    e.preventDefault()
    const id = focusedItemId.value
    if (id)
      confirmDelete(id)
  }
  else if (e.key === 'f') {
    e.preventDefault()
    focusSearchInput()
  }
  else if (e.key === '?') {
    e.preventDefault()
    isShortcutsOpen.value = true
  }
  else if (e.key === 'Escape') {
    focusedIndex.value = -1
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape')
    return
  e.preventDefault()
  const restoreIndex = focusedIndex.value < 0 ? 0 : focusedIndex.value
  ;(e.target as HTMLInputElement)?.blur()
  focusListAt(restoreIndex)
}

function handleConfirmKeydown(e: KeyboardEvent) {
  if (!isConfirmOpen.value)
    return
  if (e.key === 'Enter') {
    e.preventDefault()
    handleDeleteConfirm()
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    isConfirmOpen.value = false
    itemToDelete.value = null
    nextTick(() => listContainerRef.value?.focus())
  }
}

function focusItemById(id: string) {
  const idx = flatItems.value.findIndex(item => item.id === id)
  if (idx >= 0)
    focusListAt(idx)
}

function setCompletionRef(id: string, el: any) {
  if (el) {
    completionRefs.value.set(id, el)
  }
  else {
    completionRefs.value.delete(id)
  }
}

watch(activeFilter, () => {
  if (flatItems.value.length > 0)
    focusListAt(0)
  else
    focusedIndex.value = -1
})

watch(
  () => flatItems.value.length,
  (len) => {
    if (len === 0) {
      focusedIndex.value = -1
      return
    }
    if (focusedIndex.value >= len)
      focusedIndex.value = len - 1
  },
)

watch(
  () => [isLoading.value, showList.value] as const,
  ([loading, listVisible], prev) => {
    const wasLoading = prev?.[0] ?? true
    if (wasLoading && !loading && listVisible)
      autoFocusFirst()
  },
)

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
    nextTick(() => listContainerRef.value?.focus())
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
      <div class="space-y-2 pb-3 shrink-0">
        <div class="flex items-center justify-between gap-3">
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

        <p class="text-[11px] text-muted-foreground/80 leading-snug">
          {{ t('history.keyboard_tip') }}
          <button
            type="button"
            class="ml-1 underline underline-offset-2 decoration-muted-foreground/40 hover:text-foreground transition-colors"
            @click="isShortcutsOpen = true"
          >
            {{ t('history.shortcuts.help_keys') }}
          </button>
        </p>

        <div class="flex items-center gap-2">
          <div class="relative flex-1 min-w-0">
            <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              v-model="searchQuery"
              data-history-search
              :placeholder="t('history.search_placeholder')"
              class="h-8 pl-8 text-sm rounded-lg"
              @keydown="handleSearchKeydown"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 shrink-0 rounded-lg"
            :title="t('history.shortcuts_title')"
            tabindex="-1"
            @click="isShortcutsOpen = true"
          >
            <CircleHelpIcon class="h-4 w-4" />
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
                @click="focusItemById(item.id)"
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
      :open="isShortcutsOpen"
      @update:open="isShortcutsOpen = $event"
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('history.shortcuts_title') }}</DialogTitle>
        </DialogHeader>
        <dl class="space-y-2.5 pt-1">
          <div
            v-for="row in shortcutRows"
            :key="row.label"
            class="flex items-center justify-between gap-4 text-sm"
          >
            <dt class="text-muted-foreground">
              {{ row.label }}
            </dt>
            <dd>
              <kbd class="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                {{ row.keys }}
              </kbd>
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="isConfirmOpen"
      @update:open="isConfirmOpen = $event"
    >
      <DialogContent
        class="sm:max-w-md"
        @keydown="handleConfirmKeydown"
      >
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
