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
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
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
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { setupGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/stores/settings'
import * as store from '@/stores/settings'
import { sleep } from '@/utils'
import { initializeWindow } from '@/window'

const { isLoggedIn } = useAuth()
const { t } = useI18n()
const isMacOS = ref(false)
const globalShortcut = ref(DEFAULT_GLOBAL_SHORTCUT)
const activeTab = ref('main')

const navItems: NavItem[] = [
  { id: 'main', label: t('main.nav.main'), icon: HomeIcon, group: 'workspace' },
  { id: 'history', label: t('main.nav.history'), icon: HistoryIcon, group: 'workspace' },
  { id: 'basic', label: t('main.nav.basic'), icon: Settings2Icon, group: 'preferences' },
  { id: 'appearance', label: t('main.nav.appearance'), icon: PaletteIcon, group: 'preferences' },
  { id: 'prompts', label: t('main.nav.prompts'), icon: MessageSquareIcon, group: 'preferences' },
]

let unlistenOpenSettings: (() => void) | undefined
let isMounted = true

onMounted(async () => {
  logger.info('Main', 'onMounted')

  const unlisten = await listen('open-settings', () => {
    activeTab.value = 'basic'
  })

  if (!isMounted) {
    unlisten()
  }
  else {
    unlistenOpenSettings = unlisten
  }

  await initializeWindow(true)
  if (!isMounted) {
    return
  }

  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
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
    activeTab.value = 'appearance'
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
  <SidebarProvider>
    <AppSidebar
      v-model:active-tab="activeTab"
      :nav-items="navItems"
    />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="#">
                  {{ t('main.breadcrumb.typo') }}
                  <span
                    class="text-[10px] ml-1 px-1 py-0.5 rounded uppercase font-bold"
                    :class="isLoggedIn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'"
                  >
                    {{ isLoggedIn ? t('main.breadcrumb.pro') : t('main.breadcrumb.free') }}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{{ navItems.find(i => i.id === activeTab)?.label }}</BreadcrumbPage>
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
        />

        <BasicSettings v-else-if="activeTab === 'basic'" />
        <AppearanceSettings v-else-if="activeTab === 'appearance'" />
        <PromptsSettings v-else-if="activeTab === 'prompts'" />

        <!-- Placeholder for other tabs (History) -->
        <div v-else class="flex-1 flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border">
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
    </SidebarInset>

    <DeviceAuthModal />
  </SidebarProvider>
</template>
