<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  ArrowRight,
  CheckCircleIcon,
  MessageSquareTextIcon,
  TerminalIcon,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@/api'
import CountUp from '@/components/CountUp.vue'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { getAuth } from '@/stores/auth'
import * as store from '@/stores/settings'
import { formatShortcut } from '@/utils'

defineProps<{
  globalShortcut: string
  isMacOS?: boolean
}>()

const emit = defineEmits(['navigateToShortcut', 'navigateToTab'])

const { isLoggedIn, login } = useAuth()
const { t } = useI18n()

const totalCompletions = ref(0)
const totalSlashPrompts = ref(0)
const isLoadingStats = ref(true)
const defaultPrompt = ref('')

let isFetchingStats = false

async function fetchStats() {
  if (!isLoggedIn.value || isFetchingStats)
    return
  isFetchingStats = true
  // Only show skeleton on first load (when values are still 0)
  if (!totalCompletions.value && !totalSlashPrompts.value)
    isLoadingStats.value = true
  try {
    const token = await getAuth('access_token')
    if (token) {
      const data = await api<{ completions: number, slash_prompts: number }>('/api/v1/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const completionsTarget = data.completions ?? 0
      const slashPromptsTarget = data.slash_prompts ?? 0
      totalCompletions.value = completionsTarget
      totalSlashPrompts.value = slashPromptsTarget
    }
  }
  catch (err) {
    console.error('Failed to fetch stats', err)
  }
  finally {
    isFetchingStats = false
    isLoadingStats.value = false
  }
}

async function fetchDefaultPrompt() {
  try {
    defaultPrompt.value = await store.get('default_prompt')
  }
  catch (err) {
    console.error('Failed to fetch default prompt', err)
  }
}

watch(isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    await Promise.all([fetchStats(), fetchDefaultPrompt()])
  }
}, { immediate: true })

let unlistenFocus: UnlistenFn | undefined

onMounted(async () => {
  // Tauri's onFocusChanged covers all focus events; no need for duplicate DOM listeners
  unlistenFocus = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) {
      fetchStats()
      fetchDefaultPrompt()
    }
  })
})

onUnmounted(() => {
  unlistenFocus?.()
})

const stats = computed(() => [
  {
    label: t('main.stats.completions'),
    value: totalCompletions.value,
    icon: CheckCircleIcon,
    color: 'text-blue-500',
    tab: 'history',
  },
  {
    label: t('main.stats.slash_prompts'),
    value: totalSlashPrompts.value,
    icon: TerminalIcon,
    color: 'text-purple-500',
    tab: 'slash_prompts',
  },
])
</script>

<template>
  <div class="flex-1 flex flex-col h-full overflow-y-auto">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-3xl border border-border/40 p-8 mb-8">
      <div class="relative z-10">
        <h1 class="text-4xl font-bold tracking-tight mb-4 text-foreground">
          {{ t('main.hero.title') }}
        </h1>
        <p class="text-muted-foreground text-lg max-w-md mb-8 leading-relaxed">
          {{ t('main.hero.subtitle') }}
        </p>

        <div v-if="!isLoggedIn" class="flex flex-col gap-4 items-start">
          <Button size="lg" class="rounded-full px-8 h-12 text-base font-medium shadow-sm transition-all hover:scale-105 active:scale-95" @click="login">
            {{ t('main.hero.login_btn') }}
            <ArrowRight class="ml-2 size-4" />
          </Button>
          <p class="text-xs text-muted-foreground/60 px-2">
            {{ t('main.hero.login_hint') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Default System Prompt Card -->
    <button
      v-if="isLoggedIn"
      class="w-full text-left p-6 mb-6 rounded-2xl border border-border/40 bg-muted/5 backdrop-blur-sm transition-all hover:bg-muted/10 hover:border-primary/20 hover:-translate-y-0.5 group flex items-center justify-between"
      @click="emit('navigateToTab', 'default_prompt')"
    >
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <div class="p-3 rounded-xl transition-transform group-hover:scale-110 bg-muted/20 text-amber-500">
          <MessageSquareTextIcon class="size-6" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-muted-foreground font-medium">
            {{ t('main.nav.default_prompt') }}
          </p>
          <div v-if="isLoadingStats" class="h-5 w-48 bg-muted/30 rounded-md animate-pulse mt-1" />
          <p v-else class="text-sm font-bold tracking-tight text-foreground truncate max-w-xl mt-1">
            {{ defaultPrompt || t('settings.default_prompt.placeholder') }}
          </p>
        </div>
      </div>
      <div class="size-8 rounded-full flex items-center justify-center bg-background border border-border/50 group-hover:border-primary/50 transition-colors shrink-0 ml-4">
        <ArrowRight class="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>

    <!-- Stats Grid -->
    <div v-if="isLoggedIn" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <button
        v-for="stat in stats"
        :key="stat.label"
        class="group p-6 rounded-2xl border border-border/40 text-left transition-all hover:bg-muted/10 hover:border-primary/20 hover:-translate-y-0.5 flex items-center justify-between"
        @click="emit('navigateToTab', stat.tab)"
      >
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <div
            class="p-3 rounded-xl transition-transform group-hover:scale-110 bg-muted/20 shrink-0"
            :class="[stat.color]"
          >
            <component :is="stat.icon" class="size-6" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-muted-foreground font-medium">
              {{ stat.label }}
            </p>
            <div v-if="isLoadingStats" class="h-8 w-24 bg-muted/30 rounded-md animate-pulse mt-1" />
            <p v-else class="text-2xl font-bold tracking-tight mt-1 truncate">
              <CountUp :value="stat.value" />
            </p>
          </div>
        </div>
        <div class="size-8 rounded-full flex items-center justify-center bg-background border border-border/50 group-hover:border-primary/50 transition-colors shrink-0 ml-4">
          <ArrowRight class="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </button>
    </div>

    <!-- Shortcut Hint -->
    <button
      class="mt-auto p-6 rounded-2xl bg-muted/10 border border-border/40 flex items-center justify-between text-left transition-all hover:bg-muted/20 group"
      @click="emit('navigateToShortcut')"
    >
      <div class="flex items-center gap-4">
        <div class="px-3 py-1.5 h-10 min-w-10 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
          <kbd class="text-xs font-bold text-primary font-mono tracking-wider">{{ formatShortcut(globalShortcut, !!isMacOS) }}</kbd>
        </div>
        <div>
          <p class="font-medium">
            {{ t('main.hint.shortcut') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ t('main.hint.shortcut_desc', { shortcut: formatShortcut(globalShortcut, !!isMacOS) }) }}
          </p>
        </div>
      </div>
      <div class="size-8 rounded-full flex items-center justify-center bg-background border border-border/50 group-hover:border-primary/50 transition-colors shrink-0">
        <ArrowRight class="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  </div>
</template>
