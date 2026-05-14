<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-vue-next'
import { ref } from 'vue'
import Logo from '@/components/Logo.vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { showNotification } from '@/utils'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

defineProps<{
  navItems: NavItem[]
  activeTab: string
}>()

const emit = defineEmits(['update:activeTab', 'openSettings'])

const user = {
  name: 'Yule',
  email: 'yule@example.com',
  avatar: 'https://github.com/yuler.png',
}

const isLoggedIn = ref(false)

function handleLogin() {
  showNotification('typo', 'Coming soon')
}
</script>

<template>
  <Sidebar collapsible="icon" class="pt-8">
    <SidebarHeader class="p-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Logo :drag="true" class="h-8" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent class="px-2">
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in navItems" :key="item.id">
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
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="p-4">
      <SidebarMenu>
        <SidebarMenuItem v-if="isLoggedIn">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar class="h-8 w-8 rounded-lg">
                  <AvatarImage :src="user.avatar" :alt="user.name" />
                  <AvatarFallback class="rounded-lg">
                    YU
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
                    <AvatarImage :src="user.avatar" :alt="user.name" />
                    <AvatarFallback class="rounded-lg">
                      YU
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
                <DropdownMenuItem>
                  <Sparkles class="mr-2 size-4" />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @click="emit('openSettings')">
                  <BadgeCheck class="mr-2 size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem @click="emit('openSettings')">
                  <CreditCard class="mr-2 size-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem @click="emit('openSettings')">
                  <Bell class="mr-2 size-4" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="isLoggedIn = false">
                <LogOut class="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
        <SidebarMenuItem v-else>
          <SidebarMenuButton
            size="lg"
            class="w-full justify-start gap-2"
            @click="handleLogin"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <LogIn class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">Sign in</span>
              <span class="truncate text-xs">Login to sync your data</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
