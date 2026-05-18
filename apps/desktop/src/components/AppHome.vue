<script setup lang="ts">
import {
  ArrowRight,
  CheckCircleIcon,
  TerminalIcon,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'
import { formatShortcut } from '@/utils'

defineProps<{
  globalShortcut: string
  isMacOS?: boolean
}>()

const emit = defineEmits(['navigateToShortcut'])

const { isLoggedIn, login } = useAuth()
const { t } = useI18n()

const totalCompletions = ref(0)
const totalSlashCommands = ref(0)

onMounted(async () => {
  const [completions, slashCommands] = await Promise.all([
    store.get('total_completions'),
    store.get('total_slash_commands'),
  ])
  totalCompletions.value = completions as number
  totalSlashCommands.value = slashCommands as number
})

const stats = computed(() => [
  {
    label: t('main.stats.completions'),
    value: totalCompletions.value.toLocaleString(),
    icon: CheckCircleIcon,
    color: 'text-blue-500',
  },
  {
    label: t('main.stats.slash_commands'),
    value: totalSlashCommands.value.toLocaleString(),
    icon: TerminalIcon,
    color: 'text-purple-500',
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

    <!-- Stats Grid -->
    <div v-if="isLoggedIn" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group p-6 rounded-2xl border border-border/40 transition-all hover:border-primary/20"
      >
        <div class="flex items-center gap-4">
          <div
            class="p-3 rounded-xl transition-transform group-hover:scale-110 bg-muted/20"
            :class="[stat.color]"
          >
            <component :is="stat.icon" class="size-6" />
          </div>
          <div>
            <p class="text-sm text-muted-foreground font-medium">
              {{ stat.label }}
            </p>
            <p class="text-2xl font-bold tracking-tight">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </div>
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
