<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import {
  BookIcon,
  ChevronDownIcon,
  ClockIcon,
  HelpCircleIcon,
  HistoryIcon,
  HomeIcon,
  LockIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import Logo from '@/components/Logo.vue'
import { logger } from '@/logger'
import { setupGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/store'
import * as store from '@/store'
import { sleep } from '@/utils'
import { initializeWindow } from '@/window'

const isMacOS = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const activeTab = ref('history')

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'dictionary', label: 'Dictionary', icon: BookIcon },
]

const historyItems = [
  { time: '03:16 PM', text: '你前面不要加贴纸，加一个大头针（图钉）的样式，大头针就用 emoji 表情就好了', pinned: true },
  { time: '03:16 PM', text: '改一下，改成那种打印机的样式，打印出来的一个 receipt 的样式', pinned: false },
  { time: '03:16 PM', text: '背景颜色改成透明色', pinned: false },
  { time: '03:14 PM', text: '我把这个页面的背景改一下，让它看起来更像是一个无限画布。加点网格效果，以及放大缩小的按钮指示器吧。', pinned: false },
  { time: '03:13 PM', text: '一边框和 sticker，然后其中', pinned: false },
  { time: '03:12 PM', text: '不需要背景颜色，还是保持一个白色的吧。然后，边框改成更像贴纸的风格，我们的主题设计主要还是黑白灰', pinned: false },
]

onMounted(async () => {
  logger.info('Home', 'onMounted')

  await initializeWindow(true)

  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  isMacOS.value = systemInfo.os === 'macos'

  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!trusted) {
        logger.warn('Home', 'accessibility not trusted')
      }
    }
    catch (err) {
      logger.error('Home', 'accessibility error', err)
    }
  }

  globalShortcut.value = (await store.get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT

  // Initialize the global shortcut
  await setupGlobalShortcut()

  // Show Settings window if AI key is missing
  const aiProvider = await store.get('ai_provider')
  if (aiProvider === 'deepseek' && (await store.get('deepseek_api_key')) === '') {
    await sleep(500)
    invoke('open_settings_window')
  }
})

function openSettings() {
  invoke('open_settings_window')
}
</script>

<template>
  <div class="flex h-screen w-screen bg-background overflow-hidden select-none rounded-xl">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border bg-background flex flex-col p-4 shrink-0">
      <div class="flex items-center gap-2 mb-8 px-2" data-tauri-drag-region>
        <Logo class="w-8 h-8" />
        <span class="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Free</span>
      </div>

      <nav class="flex-1 space-y-1">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
          :class="activeTab === item.id ? 'bg-muted/40 shadow-sm border border-border/50 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="activeTab = item.id"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="flex items-center justify-between px-2 text-muted-foreground/60">
        <button class="p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors">
          <UserIcon class="w-4 h-4" />
        </button>
        <button class="p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors">
          <MessageCircleIcon class="w-4 h-4" />
        </button>
        <button class="p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors" @click="openSettings">
          <SettingsIcon class="w-4 h-4" />
        </button>
        <button class="p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors">
          <HelpCircleIcon class="w-4 h-4" />
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
      <!-- Content based on activeTab -->
      <div v-if="activeTab === 'history'" class="flex-1 flex flex-col p-10 overflow-y-auto">
        <header class="flex items-center justify-end mb-10">
          <button class="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
            <MoreHorizontalIcon class="w-5 h-5" />
          </button>
        </header>

        <!-- Settings Info Card -->
        <div class="bg-muted/10 border border-border/40 rounded-2xl p-7 space-y-6 mb-10">
          <div class="flex items-start justify-between gap-6">
            <div class="flex gap-4">
              <div class="p-1 bg-muted/30 rounded">
                <ClockIcon class="w-4 h-4 text-foreground/80" />
              </div>
              <div>
                <h4 class="font-bold text-sm">
                  Keep history
                </h4>
                <p class="text-xs text-muted-foreground mt-1.5 leading-normal">
                  How long do you want to keep your dictation history on your device?
                </p>
              </div>
            </div>
            <div class="relative min-w-[140px]">
              <button class="w-full flex items-center justify-between bg-background border border-border rounded-lg px-4 py-2 text-xs font-medium shadow-sm hover:bg-muted/20 transition-colors">
                Forever
                <ChevronDownIcon class="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div class="flex gap-4">
            <div class="p-1 bg-muted/30 rounded">
              <LockIcon class="w-4 h-4 text-foreground/80" />
            </div>
            <div>
              <h4 class="font-bold text-sm">
                Your data stays private
              </h4>
              <p class="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Your voice dictations are private with zero data retention. They are stored only on your device and cannot be accessed from anywhere else.
              </p>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-2 mb-10">
          <button
            v-for="tab in ['All', 'Dictations', 'Ask anything']"
            :key="tab"
            class="px-5 py-1.5 rounded-full text-xs font-semibold transition-all"
            :class="tab === 'All' ? 'bg-muted text-foreground ring-1 ring-border/20 shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          >
            {{ tab }}
          </button>
        </div>

        <!-- History List -->
        <div class="space-y-10">
          <div>
            <h2 class="text-xs font-semibold text-muted-foreground/70 mb-5">
              May 1, 2026
            </h2>
            <div class="border border-border/40 rounded-2xl overflow-hidden bg-card/10 backdrop-blur-sm">
              <div
                v-for="(item, index) in historyItems"
                :key="index"
                class="flex gap-6 p-5 hover:bg-muted/10 transition-colors group relative border-b border-border/30 last:border-0"
              >
                <div class="text-[10px] text-muted-foreground/50 font-bold tabular-nums whitespace-nowrap mt-1 uppercase w-16">
                  {{ item.time }}
                </div>
                <div class="text-sm leading-relaxed text-foreground/90 flex-1 pr-6">
                  {{ item.text }}
                  <span v-if="item.pinned" class="ml-1 opacity-100 transition-opacity">📌</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Placeholder for other tabs -->
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <div class="p-4 bg-muted/20 rounded-full inline-block">
            <component :is="navItems.find(i => i.id === activeTab)?.icon" class="w-12 h-12 text-muted-foreground/30" />
          </div>
          <h2 class="text-xl font-semibold text-foreground/40">
            {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1) }}
          </h2>
          <p class="text-sm text-muted-foreground/40">
            Coming soon
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
