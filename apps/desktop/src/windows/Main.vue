<script setup lang="ts">
import type { NavItem } from '@/components/AppSidebar.vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  HistoryIcon,
  HomeIcon,
  MessageSquareIcon,
  PaletteIcon,
  Settings2Icon,
  SparklesIcon,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AIProviderSettings from '@/components/AIProviderSettings.vue'
import AppearanceSettings from '@/components/AppearanceSettings.vue'
import AppHome from '@/components/AppHome.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import BasicSettings from '@/components/BasicSettings.vue'
import DeviceAuthModal from '@/components/DeviceAuthModal.vue'
import PromptsSettings from '@/components/PromptsSettings.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { setupGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/stores/settings'
import * as store from '@/stores/settings'
import { sleep } from '@/utils'

const { t } = useI18n()
const isMacOS = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const activeTab = ref('main')
const highlightShortcut = ref(false)
let highlightTimeout: ReturnType<typeof setTimeout> | null = null

const navItems = computed<NavItem[]>(() => [
  { id: 'main', label: t('main.nav.main'), icon: HomeIcon, group: 'workspace' },
  { id: 'history', label: t('main.nav.history'), icon: HistoryIcon, group: 'workspace' },
  { id: 'appearance', label: t('main.nav.appearance'), icon: PaletteIcon, group: 'preferences' },
  { id: 'ai_provider', label: t('main.nav.ai_provider'), icon: SparklesIcon, group: 'preferences' },
  { id: 'settings', label: t('main.nav.settings'), icon: Settings2Icon, group: 'preferences' },
  { id: 'prompts', label: t('main.nav.prompts'), icon: MessageSquareIcon, group: 'preferences' },
])

const activeNavItem = computed(() => navItems.value.find(i => i.id === activeTab.value))

function onNavigateToShortcut() {
  activeTab.value = 'settings'
  if (highlightTimeout) {
    clearTimeout(highlightTimeout)
  }
  highlightShortcut.value = true
  highlightTimeout = setTimeout(() => {
    highlightShortcut.value = false
    highlightTimeout = null
  }, 3000)
}

let unlistenOpenSettings: (() => void) | undefined
let isMounted = true

onMounted(async () => {
  logger.info('Main', 'onMounted')

  const unlisten = await listen('open-settings', () => {
    activeTab.value = 'settings'
  })

  if (!isMounted) {
    unlisten()
  }
  else {
    unlistenOpenSettings = unlisten
  }

  const systemInfo = await invoke<{ os: string, version: string, is_wayland: boolean }>('get_system_info')
  if (!isMounted) {
    return
  }
  isMacOS.value = systemInfo.os === 'macos'

  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!isMounted) {
        return
      }
      if (!trusted) {
        logger.warn('Main', 'accessibility not trusted')
      }
    }
    catch (err) {
      logger.error('Main', 'accessibility error', err)
    }
  }

  if (!isMounted) {
    return
  }
  globalShortcut.value = (await store.get('global_shortcut')) || DEFAULT_GLOBAL_SHORTCUT
  if (!isMounted) {
    return
  }

  // Initialize the global shortcut
  await setupGlobalShortcut()
  if (!isMounted) {
    return
  }

  // Show Settings window if AI key is missing
  const aiProvider = await store.get('ai_provider')
  if (!isMounted) {
    return
  }
  if (aiProvider === 'deepseek' && (await store.get('deepseek_api_key')) === '') {
    if (!isMounted) {
      return
    }
    await sleep(500)
    if (!isMounted) {
      return
    }
    activeTab.value = 'ai_provider'
  }
})

onUnmounted(() => {
  isMounted = false
  if (unlistenOpenSettings) {
    unlistenOpenSettings()
  }
})
</script>

<template>
  <div class="w-full h-screen flex flex-col overflow-hidden">
    <div v-if="isMacOS" class="h-7 w-full shrink-0 bg-sidebar border-sidebar-border select-none cursor-move" data-tauri-drag-region />
    <SidebarProvider class="flex-1 overflow-hidden">
      <AppSidebar
        v-model:active-tab="activeTab"
        :nav-items="navItems"
      />
      <SidebarInset>
        <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div class="flex items-center gap-2 px-4">
            <SidebarTrigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem class="hidden md:block">
                  <BreadcrumbLink href="#">
                    {{ t('main.breadcrumb.typo') }}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator class="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{{ activeNavItem?.label }}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
          <!-- Content based on activeTab -->
          <AppHome
            v-if="activeTab === 'main'"
            :global-shortcut="globalShortcut"
            :is-mac-os="isMacOS"
            @navigate-to-shortcut="onNavigateToShortcut"
          />

          <BasicSettings
            v-else-if="activeTab === 'settings'"
            :highlight-shortcut="highlightShortcut"
          />
          <AIProviderSettings v-else-if="activeTab === 'ai_provider'" />
          <AppearanceSettings v-else-if="activeTab === 'appearance'" />
          <PromptsSettings v-else-if="activeTab === 'prompts'" />

          <!-- Placeholder for other tabs (History) -->
          <div v-else class="flex-1 flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border">
            <div class="text-center space-y-4">
              <div class="p-4 bg-muted/20 rounded-full inline-block">
                <component :is="activeNavItem?.icon" class="w-12 h-12 text-muted-foreground/30" />
              </div>
              <h2 class="text-xl font-semibold text-foreground/40">
                {{ activeNavItem?.label }}
              </h2>
              <p class="text-sm text-muted-foreground/40">
                {{ t('main.common.coming_soon') }}
              </p>
            </div>
          </div>
        </main>
      </SidebarInset>

      <DeviceAuthModal />
    </SidebarProvider>
  </div>
</template>
