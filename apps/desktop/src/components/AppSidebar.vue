<script setup lang="ts">
import type { Component } from 'vue'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import AppLogo from '@/components/AppLogo.vue'
import AppVersion from '@/components/AppVersion.vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'

export interface NavItem {
  id: string
  label: string
  icon: Component
  group: 'workspace' | 'preferences'
}

defineProps<{
  navItems: NavItem[]
  activeTab: string
}>()

const emit = defineEmits(['update:activeTab'])

const { isLoggedIn, user, login, logout } = useAuth()
const { t } = useI18n()

function onUpgrade() {
  toast.info(t('main.sidebar.upgrade_toast'))
}

const userInitials = computed(() => {
  if (!user.value?.name)
    return 'YU'
  return user.value.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

function onLogin() {
  login()
}
</script>

<template>
  <Sidebar collapsible="icon" class="group-data-[state=expanded]:min-w-64">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" class="hover:bg-transparent cursor-default">
            <AppLogo drag class="size-12 group-data-[collapsible=icon]:size-8 transition-[width,height]" />
            <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <div class="flex items-center">
                <AppVersion />
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>{{ t('main.sidebar.workspace') }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navItems.filter(i => i.group === 'workspace')" :key="item.id">
              <SidebarMenuButton
                :tooltip="item.label"
                :is-active="activeTab === item.id"
                @click="emit('update:activeTab', item.id)"
              >
                <component :is="item.icon" />
                <span>{{ item.label }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>{{ t('main.sidebar.preferences') }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navItems.filter(i => i.group === 'preferences')" :key="item.id">
              <SidebarMenuButton
                :tooltip="item.label"
                :is-active="activeTab === item.id"
                @click="emit('update:activeTab', item.id)"
              >
                <component :is="item.icon" />
                <span>{{ item.label }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem v-if="isLoggedIn">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar class="h-8 w-8 rounded-lg">
                  <AvatarImage :src="user.avatar_url" :alt="user.name" />
                  <AvatarFallback class="rounded-lg">
                    {{ userInitials }}
                  </AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">{{ user.name }}</span>
                  <span class="truncate text-xs">{{ user.email }}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              :side-offset="4"
            >
              <DropdownMenuLabel class="p-0 font-normal">
                <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar class="h-8 w-8 rounded-lg">
                    <AvatarImage :src="user.avatar_url" :alt="user.name" />
                    <AvatarFallback class="rounded-lg">
                      {{ userInitials }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">{{ user.name }}</span>
                    <span class="truncate text-xs">{{ user.email }}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @click="onUpgrade">
                  <Sparkles class="mr-2 size-4" />
                  {{ t('main.sidebar.upgrade') }}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled>
                  <BadgeCheck class="mr-2 size-4" />
                  {{ t('main.sidebar.account') }}
                  <Badge variant="secondary" class="ml-auto text-[10px] py-0 px-1.5 h-4">
                    {{ t('main.common.coming_soon') }}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <CreditCard class="mr-2 size-4" />
                  {{ t('main.sidebar.billing') }}
                  <Badge variant="secondary" class="ml-auto text-[10px] py-0 px-1.5 h-4">
                    {{ t('main.common.coming_soon') }}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Bell class="mr-2 size-4" />
                  {{ t('main.sidebar.notifications') }}
                  <Badge variant="secondary" class="ml-auto text-[10px] py-0 px-1.5 h-4">
                    {{ t('main.common.coming_soon') }}
                  </Badge>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="logout">
                <LogOut class="mr-2 size-4" />
                {{ t('main.sidebar.logout') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
        <SidebarMenuItem v-else>
          <SidebarMenuButton
            :tooltip="t('main.sidebar.login')"
            @click="onLogin"
          >
            <LogIn />
            <span>{{ t('main.sidebar.login') }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
