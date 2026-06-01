<script setup lang="ts">
import type { CompletionRecord } from '@/composables/useCompletions'
import {
  CircleHelpIcon,
  HistoryIcon,
  Loader2Icon,
  LockIcon,
  SearchIcon,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import HistoryCompletion from '@/components/HistoryCompletion.vue'
import { Badge } from '@/components/ui/badge'
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
type CompletionRef = InstanceType<typeof HistoryCompletion>

const { t, locale } = useI18n()

const intlLocale = computed(() => {
  const map = { en: 'en', zh: 'zh-CN', jp: 'ja-JP' } as const
  return map[locale.value]
})
const { isLoggedIn, login, authStatus } = useAuth()
const {
  completions,
  isLoading,
  isLoadingMore,
  isDeleting,
  hasMore,
  error,
  loadInitial,
  loadMore,
  remove,
} = useCompletions()

// --- state ---

const activeFilter = ref<HistoryFilter>('all')
const isShortcutsOpen = ref(false)
const deleteKeyHeld = ref(false)
const isDeleteDialogOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)
const confirmDeleteButtonRef = ref<{ $el?: HTMLElement } | null>(null)
const focusedIndex = ref(-1)
const listContainerRef = ref<HTMLElement | null>(null)
const loadMoreSentinelRef = ref<HTMLElement | null>(null)
const completionRefs = ref<Map<string, CompletionRef>>(new Map())

let loadMoreObserver: IntersectionObserver | null = null
let scrollAnimFrame = 0

const LOAD_MORE_ROOT_MARGIN_PX = 120
const SCROLL_EDGE_PADDING = 36
const SCROLL_DURATION_MS = 260
const MS_PER_DAY = 86_400_000

const filterOptions = [
  { value: 'all', labelKey: 'history.filter.all' },
  { value: 'today', labelKey: 'history.filter.today' },
  { value: 'week', labelKey: 'history.filter.week' },
  { value: 'month', labelKey: 'history.filter.month' },
] as const satisfies ReadonlyArray<{ value: HistoryFilter, labelKey: string }>

// --- derived list ---

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function matchesFilter(createdAt: string, filter: HistoryFilter, todayStart: Date) {
  const date = new Date(createdAt)

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

const filteredCompletions = computed(() => {
  const todayStart = startOfDay(new Date())
  return completions.value.filter(item =>
    matchesFilter(item.created_at, activeFilter.value, todayStart),
  )
})

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
  const diffDays = Math.round((today.getTime() - date.getTime()) / MS_PER_DAY)

  if (diffDays === 0)
    return t('history.day_today')
  if (diffDays === 1)
    return t('history.day_yesterday')
  return date.toLocaleDateString(intlLocale.value, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

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
  !isLoading.value && filteredCompletions.value.length > 0,
)

const shortcutSections = computed(() => [
  {
    title: t('history.shortcuts.section_general'),
    items: [
      { label: t('history.shortcuts.help'), keys: ['?'] },
      { label: t('history.shortcuts.refresh'), keys: ['r'] },
    ],
  },
  {
    title: t('history.shortcuts.section_list'),
    items: [
      { label: t('history.shortcuts.navigate'), keys: ['↑', '↓', 'j', 'k', 'Tab', 'Home', 'End'] },
      { label: t('history.shortcuts.prompt_open'), keys: ['→'] },
      { label: t('history.shortcuts.prompt_close'), keys: ['←'] },
      { label: t('history.shortcuts.copy'), keys: ['Enter', 'c'] },
      { label: t('history.shortcuts.delete'), keys: ['d', t('history.shortcuts.delete_hold_badge')] },
      { label: t('history.shortcuts.clear_focus'), keys: ['Esc'] },
    ],
  },
])

// --- focus helpers ---

function withFocusedCompletion(run: (comp: CompletionRef) => void) {
  const id = focusedItemId.value
  if (!id)
    return

  const invoke = () => {
    const comp = completionRefs.value.get(id)
    if (comp)
      run(comp)
  }

  if (completionRefs.value.has(id))
    invoke()
  else
    nextTick(invoke)
}

function setCompletionRef(id: string, el: unknown) {
  const comp = el as CompletionRef | null
  if (comp)
    completionRefs.value.set(id, comp)
  else
    completionRefs.value.delete(id)
}

function focusListAt(index: number) {
  const len = flatItems.value.length
  if (len === 0) {
    focusedIndex.value = -1
    return
  }
  focusedIndex.value = Math.max(0, Math.min(len - 1, index))
  nextTick(() => {
    listContainerRef.value?.focus()
    requestAnimationFrame(scrollFocusedIntoView)
  })
}

function focusItemById(id: string) {
  const idx = flatItems.value.findIndex(item => item.id === id)
  if (idx >= 0)
    focusListAt(idx)
}

function moveFocus(delta: number) {
  const len = flatItems.value.length
  if (len === 0)
    return

  if (focusedIndex.value < 0)
    focusedIndex.value = delta > 0 ? 0 : len - 1
  else
    focusedIndex.value = Math.max(0, Math.min(len - 1, focusedIndex.value + delta))

  nextTick(() => requestAnimationFrame(scrollFocusedIntoView))
}

// --- scroll into view ---

function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function computeScrollTarget(container: HTMLElement, el: HTMLElement) {
  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const viewHeight = container.clientHeight
  const currentScroll = container.scrollTop
  const maxScroll = Math.max(0, container.scrollHeight - viewHeight)

  const elTop = elRect.top - containerRect.top + currentScroll
  const elBottom = elTop + elRect.height
  const visibleTop = currentScroll + SCROLL_EDGE_PADDING
  const visibleBottom = currentScroll + viewHeight - SCROLL_EDGE_PADDING

  if (elTop >= visibleTop && elBottom <= visibleBottom)
    return currentScroll

  if (elTop < visibleTop)
    return Math.max(0, elTop - SCROLL_EDGE_PADDING)

  return Math.min(maxScroll, elBottom - viewHeight + SCROLL_EDGE_PADDING)
}

function animateListScroll(container: HTMLElement, targetTop: number) {
  if (scrollAnimFrame) {
    cancelAnimationFrame(scrollAnimFrame)
    scrollAnimFrame = 0
  }

  const startTop = container.scrollTop
  const distance = targetTop - startTop

  if (Math.abs(distance) < 1) {
    container.scrollTop = targetTop
    return
  }

  if (prefersReducedMotion()) {
    container.scrollTop = targetTop
    return
  }

  const startTime = performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / SCROLL_DURATION_MS)
    const eased = 1 - (1 - progress) ** 3
    container.scrollTop = startTop + distance * eased
    scrollAnimFrame = progress < 1 ? requestAnimationFrame(step) : 0
  }

  scrollAnimFrame = requestAnimationFrame(step)
}

function scrollFocusedIntoView() {
  const container = listContainerRef.value
  const id = focusedItemId.value
  if (!container || !id)
    return

  const el = document.getElementById(`history-item-${id}`)
  if (el)
    animateListScroll(container, computeScrollTarget(container, el))
}

// --- infinite scroll ---

function teardownLoadMoreObserver() {
  loadMoreObserver?.disconnect()
  loadMoreObserver = null
}

function tryLoadMore() {
  if (hasMore.value && !isLoadingMore.value && !isLoading.value)
    loadMore()
}

function flushLoadMoreIfNeeded() {
  const root = listContainerRef.value
  const sentinel = loadMoreSentinelRef.value
  if (!root || !sentinel || !hasMore.value || isLoadingMore.value || isLoading.value)
    return

  const rootRect = root.getBoundingClientRect()
  const sentinelRect = sentinel.getBoundingClientRect()
  if (sentinelRect.top <= rootRect.bottom + LOAD_MORE_ROOT_MARGIN_PX)
    tryLoadMore()
}

function setupLoadMoreObserver() {
  teardownLoadMoreObserver()

  const root = listContainerRef.value
  const sentinel = loadMoreSentinelRef.value
  if (!root || !sentinel || !hasMore.value)
    return

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some(entry => entry.isIntersecting))
        tryLoadMore()
    },
    { root, rootMargin: `0px 0px ${LOAD_MORE_ROOT_MARGIN_PX}px 0px`, threshold: 0 },
  )
  loadMoreObserver.observe(sentinel)
}

// --- keyboard ---

function isTypingInField(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function isListShortcutEvent(e: KeyboardEvent) {
  return !isShortcutsOpen.value
    && !isDeleteDialogOpen.value
    && !e.metaKey && !e.ctrlKey && !e.altKey
    && !isTypingInField(e)
}

function handleListKeydown(e: KeyboardEvent) {
  if (!isListShortcutEvent(e))
    return

  const key = e.key

  if (key === 'ArrowDown' || key === 'j' || (key === 'Tab' && !e.shiftKey)) {
    e.preventDefault()
    moveFocus(1)
  }
  else if (key === 'ArrowUp' || key === 'k' || (key === 'Tab' && e.shiftKey)) {
    e.preventDefault()
    moveFocus(-1)
  }
  else if (key === 'Home') {
    e.preventDefault()
    focusListAt(0)
  }
  else if (key === 'End') {
    e.preventDefault()
    focusListAt(flatItems.value.length - 1)
  }
  else if (key === 'ArrowRight') {
    e.preventDefault()
    withFocusedCompletion(comp => comp.openPromptDetail())
  }
  else if (key === 'ArrowLeft') {
    e.preventDefault()
    withFocusedCompletion(comp => comp.closePromptDetail())
  }
  else if (key === 'Enter' || key === 'c') {
    e.preventDefault()
    withFocusedCompletion(comp => comp.copyContent())
  }
  else if (key === 'd' && !e.repeat) {
    e.preventDefault()
    if (!focusedItemId.value)
      return
    deleteKeyHeld.value = true
    withFocusedCompletion(comp => comp.startDeleteHold())
  }
  else if (key === 'r' || key === 'R') {
    e.preventDefault()
    void refreshHistory()
  }
  else if (key === '?') {
    e.preventDefault()
    isShortcutsOpen.value = true
  }
  else if (key === 'Escape') {
    focusedIndex.value = -1
  }
}

function handleListKeyup(e: KeyboardEvent) {
  if (e.key !== 'd' || !deleteKeyHeld.value)
    return
  deleteKeyHeld.value = false
  withFocusedCompletion(comp => comp.cancelDeleteHold())
}

function handleHistoryKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey || isShortcutsOpen.value || isDeleteDialogOpen.value || isTypingInField(e))
    return
  if (e.key === '?') {
    e.preventDefault()
    isShortcutsOpen.value = true
  }
  else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    void refreshHistory()
  }
}

// --- actions ---

async function refreshHistory() {
  if (isLoading.value || isLoadingMore.value)
    return

  focusedIndex.value = -1
  teardownLoadMoreObserver()
  await loadInitial()
  nextTick(() => {
    listContainerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
    if (showList.value)
      focusListAt(0)
  })
}

async function handleDelete(id: string) {
  await remove(id)
  nextTick(() => listContainerRef.value?.focus())
}

function promptDelete(id: string) {
  pendingDeleteId.value = id
  isDeleteDialogOpen.value = true
}

function focusConfirmDelete(e: Event) {
  e.preventDefault()
  nextTick(() => confirmDeleteButtonRef.value?.$el?.focus())
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  isDeleteDialogOpen.value = false
  pendingDeleteId.value = null
  if (id)
    await handleDelete(id)
}

// --- lifecycle ---

watch(
  () => [showList.value, hasMore.value] as const,
  ([visible, more]) => {
    if (visible && more)
      nextTick(setupLoadMoreObserver)
    else
      teardownLoadMoreObserver()
  },
)

watch(isLoadingMore, (loading, wasLoading) => {
  if (!loading && wasLoading)
    nextTick(flushLoadMoreIfNeeded)
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
      focusListAt(0)
  },
)

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn)
    loadInitial()
})

onMounted(() => {
  if (isLoggedIn.value)
    loadInitial()
})

onUnmounted(() => {
  teardownLoadMoreObserver()
  if (scrollAnimFrame)
    cancelAnimationFrame(scrollAnimFrame)
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <div
      v-if="!isLoggedIn"
      class="flex flex-1 items-center justify-center p-6"
    >
      <div class="w-full max-w-md space-y-6 rounded-2xl border border-border/50 bg-card/40 p-8 text-center shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
          <LockIcon class="h-8 w-8" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('history.sign_in_title') }}
          </h2>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {{ t('history.sign_in_desc') }}
          </p>
        </div>
        <Button
          class="w-full rounded-xl py-6 text-base font-semibold shadow-md transition-all duration-200 active:scale-[0.98]"
          :disabled="authStatus === 'authorizing'"
          @click="login"
        >
          <Loader2Icon
            v-if="authStatus === 'authorizing'"
            class="mr-2 h-5 w-5 animate-spin"
          />
          <HistoryIcon
            v-else
            class="mr-2 h-5 w-5"
          />
          {{ t('history.sign_in_btn') }}
        </Button>
      </div>
    </div>

    <div
      v-else
      class="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      @keydown="handleHistoryKeydown"
    >
      <header class="shrink-0 space-y-2 pb-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="shrink-0 text-xl font-bold tracking-tight">
            {{ t('history.title') }}
          </h2>
          <div class="flex flex-wrap items-center justify-end gap-1">
            <Button
              v-for="option in filterOptions"
              :key="option.value"
              size="sm"
              :variant="activeFilter === option.value ? 'default' : 'outline'"
              class="h-7 rounded-lg px-2.5 text-xs"
              @click="activeFilter = option.value"
            >
              {{ t(option.labelKey) }}
            </Button>
          </div>
        </div>

        <p class="flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground/80">
          <span>{{ t('history.keyboard_tip') }}</span>
          <button
            type="button"
            class="inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
            :title="t('history.shortcuts_title')"
            :aria-label="t('history.shortcuts_title')"
            @click="isShortcutsOpen = true"
          >
            <CircleHelpIcon class="h-3.5 w-3.5" />
          </button>
        </p>

        <div class="flex items-center gap-2">
          <div class="relative min-w-0 flex-1">
            <SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              disabled
              :placeholder="t('history.search_placeholder')"
              class="h-8 rounded-lg pl-8 pr-24 text-sm opacity-60"
            />
            <Badge
              variant="secondary"
              class="pointer-events-none absolute right-2 top-1/2 h-5 -translate-y-1/2 px-1.5 py-0 text-[10px]"
            >
              {{ t('main.common.coming_soon') }}
            </Badge>
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
      </header>

      <div
        v-if="error && !isLoading"
        class="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center"
      >
        <p class="max-w-xs text-sm text-muted-foreground">
          {{ t('history.load_error') }}
        </p>
        <Button
          variant="outline"
          size="sm"
          class="rounded-lg"
          @click="loadInitial"
        >
          {{ t('history.retry') }}
        </Button>
      </div>

      <div
        v-else-if="isLoading"
        class="flex-1 space-y-3 overflow-y-auto pr-1"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="space-y-2 rounded-lg border border-border/40 p-3"
        >
          <Skeleton class="h-3 w-2/3" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="h-3 w-5/6" />
        </div>
      </div>

      <div
        v-else-if="completions.length === 0"
        class="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center"
      >
        <div class="mb-4 inline-block rounded-full bg-muted/20 p-4 text-muted-foreground/30">
          <HistoryIcon class="h-12 w-12" />
        </div>
        <h3 class="text-lg font-semibold text-foreground/70">
          {{ t('history.empty_title') }}
        </h3>
        <p class="mt-1 max-w-xs text-sm text-muted-foreground">
          {{ t('history.empty_desc') }}
        </p>
      </div>

      <div
        v-else-if="filteredCompletions.length === 0"
        class="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center"
      >
        <p class="max-w-xs text-sm text-muted-foreground">
          {{ t('history.filter_empty') }}
        </p>
      </div>

      <div
        v-else
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          ref="listContainerRef"
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 -mr-1 outline-none"
          tabindex="0"
          @keydown="handleListKeydown"
          @keyup="handleListKeyup"
        >
          <div class="flex flex-col gap-5 pb-4">
            <section
              v-for="group in groupedByDay"
              :key="group.key"
              class="space-y-2"
            >
              <h3 class="sticky top-0 z-10 bg-background/90 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
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
                  :key="item.id"
                  :ref="(el) => setCompletionRef(item.id, el)"
                  :item="item"
                  :is-deleting="isDeleting === item.id"
                  :is-focused="focusedItemId === item.id"
                  @click="focusItemById(item.id)"
                  @delete="handleDelete"
                  @request-delete="promptDelete"
                />
              </TransitionGroup>
            </section>

            <div
              v-if="hasMore"
              ref="loadMoreSentinelRef"
              class="h-px w-full shrink-0"
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          v-if="isLoadingMore"
          class="flex shrink-0 items-center justify-center gap-2 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2Icon class="h-4 w-4 shrink-0 animate-spin text-primary" />
          <span class="text-xs font-medium text-muted-foreground">
            {{ t('history.loading_more') }}
          </span>
        </div>
        <p
          v-else-if="!hasMore"
          class="shrink-0 border-t border-border/40 px-4 py-4 text-center text-xs leading-relaxed text-muted-foreground/80"
        >
          {{ t('history.end_of_history') }}
        </p>
      </div>
    </div>

    <Dialog
      :open="isShortcutsOpen"
      @update:open="isShortcutsOpen = $event"
    >
      <DialogContent class="flex max-h-[min(85vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader class="shrink-0 space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle class="text-lg">
            {{ t('history.shortcuts_title') }}
          </DialogTitle>
          <p class="text-sm font-normal text-muted-foreground">
            {{ t('history.shortcuts_subtitle') }}
          </p>
        </DialogHeader>
        <div class="overflow-y-auto px-6 py-5">
          <div class="grid gap-8 sm:grid-cols-2">
            <section
              v-for="section in shortcutSections"
              :key="section.title"
            >
              <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                {{ section.title }}
              </h3>
              <ul class="space-y-2.5">
                <li
                  v-for="item in section.items"
                  :key="item.label"
                  class="flex items-center justify-between gap-4 text-sm"
                >
                  <span class="text-muted-foreground">{{ item.label }}</span>
                  <span class="flex shrink-0 items-center gap-1">
                    <kbd
                      v-for="(key, keyIndex) in item.keys"
                      :key="`${item.label}-${keyIndex}`"
                      class="inline-flex min-w-6 items-center justify-center rounded border border-border/80 bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground shadow-sm"
                    >
                      {{ key }}
                    </kbd>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="isDeleteDialogOpen"
      @update:open="isDeleteDialogOpen = $event"
    >
      <DialogContent
        class="max-w-[340px] gap-6 p-6"
        @open-auto-focus="focusConfirmDelete"
      >
        <DialogHeader class="space-y-2.5">
          <DialogTitle class="text-lg font-bold leading-none tracking-tight">
            {{ t('history.delete_confirm_title') }}
          </DialogTitle>
          <DialogDescription class="text-sm leading-relaxed text-muted-foreground">
            {{ t('history.delete_confirm_desc') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button
            variant="outline"
            class="h-9 rounded-lg px-4 text-xs font-medium"
            @click="isDeleteDialogOpen = false"
          >
            {{ t('main.common.cancel') }}
          </Button>
          <Button
            ref="confirmDeleteButtonRef"
            variant="destructive"
            class="h-9 rounded-lg px-4 text-xs font-medium shadow-sm"
            @click="confirmDelete"
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
