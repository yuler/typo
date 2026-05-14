<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import {
  HistoryIcon,
  HomeIcon,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
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
  // { id: 'dictionary', label: 'Dictionary', icon: BookIcon },
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
  <SidebarProvider>
    <AppSidebar
      v-model:active-tab="activeTab"
      :nav-items="navItems"
      @open-settings="openSettings"
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
                  Typo
                  <span class="text-[10px] ml-1 bg-muted px-1 py-0.5 rounded text-muted-foreground uppercase">Free</span>
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
        <div v-if="activeTab === 'home'" class="flex-1 flex flex-col min-h-0 bg-muted/20 rounded-xl border border-border overflow-hidden p-4">
          <p>Press <kbd class="kbd">{{ globalShortcut }}</kbd> to start</p>
          Or you can change the global shortcut in the settings
        </div>

        <!-- Placeholder for other tabs -->
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
  </SidebarProvider>
</template>
