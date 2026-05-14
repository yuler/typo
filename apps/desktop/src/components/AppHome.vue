<script setup lang="ts">
import {
  ArrowRight,
  Clock,
  History,
  Zap,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { formatShortcut } from '@/utils'

defineProps<{
  globalShortcut: string
}>()

const { isLoggedIn, login } = useAuth()
const { t } = useI18n()

const stats = [
  {
    label: t('main.stats.total_polished'),
    value: '1,284',
    icon: Zap,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    label: t('main.stats.time_saved'),
    value: '12.5h',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: t('main.stats.history_items'),
    value: '856',
    icon: History,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
]
</script>

<template>
  <div class="flex-1 flex flex-col h-full overflow-y-auto">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-border/50 p-8 mb-8">
      <div class="relative z-10">
        <h1 class="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
          {{ t('main.hero.title') }}
        </h1>
        <p class="text-muted-foreground text-lg max-w-md mb-8 leading-relaxed">
          {{ t('main.hero.subtitle') }}
        </p>

        <div v-if="!isLoggedIn" class="flex flex-col gap-4 items-start">
          <Button size="lg" class="rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" @click="login">
            {{ t('main.hero.login_btn') }}
            <ArrowRight class="ml-2 size-4" />
          </Button>
          <p class="text-xs text-muted-foreground/60 px-2">
            {{ t('main.hero.login_hint') }}
          </p>
        </div>

        <div v-else class="flex items-center gap-4">
          <div class="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <div class="size-2 rounded-full bg-primary animate-pulse" />
            <span class="text-sm font-medium text-primary">{{ t('main.hero.pro_active') }}</span>
          </div>
        </div>
      </div>

      <!-- Decorative Elements -->
      <div class="absolute -right-20 -top-20 size-64 bg-primary/5 rounded-full blur-3xl" />
      <div class="absolute -left-20 -bottom-20 size-64 bg-primary/5 rounded-full blur-3xl" />
    </div>

    <!-- Stats Grid -->
    <div v-if="isLoggedIn" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group p-6 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 hover:border-primary/30"
      >
        <div class="flex items-center gap-4 mb-4">
          <div
            class="p-3 rounded-xl transition-transform group-hover:scale-110"
            :class="[stat.bg, stat.color]"
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
        <div class="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div class="h-full bg-primary/40 rounded-full w-2/3 transition-all group-hover:w-[75%]" />
        </div>
      </div>
    </div>

    <!-- Shortcut Hint -->
    <div class="mt-auto p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <kbd class="text-xs font-bold text-primary">{{ formatShortcut(globalShortcut, globalShortcut.includes('Command')) }}</kbd>
        </div>
        <div>
          <p class="font-medium">
            {{ t('main.hint.shortcut') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ t('main.hint.shortcut_desc', { shortcut: globalShortcut }) }}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" class="text-xs text-muted-foreground hover:text-primary transition-colors">
        {{ t('main.hint.change_shortcut') }}
      </Button>
    </div>
  </div>
</template>
