<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import {
  BatteryChargingIcon,
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  BatteryWarningIcon,
  WifiHighIcon,
  WifiIcon,
  WifiLowIcon,
  WifiOffIcon,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Browser from './Browser.vue'

interface Props {
  dimmed?: boolean
  typoActive?: boolean
  appName?: string
  pageUrl?: string
  menuAppName?: string
}

withDefaults(defineProps<Props>(), {
  dimmed: false,
  typoActive: false,
  appName: 'Typo',
  pageUrl: 'typo.yuler.cc',
  menuAppName: 'Chrome',
})

function formatMenuBarTime(date: Date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(', ', ' ')
}

interface BatteryManager extends EventTarget {
  charging: boolean
  level: number
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string
  type?: string
}

type NavigatorWithDeviceStatus = Navigator & {
  connection?: NetworkInformation
  getBattery?: () => Promise<BatteryManager>
}

const menuBarTime = ref('')
const batteryLevel = ref<number | null>(null)
const batteryCharging = ref(false)
const networkOnline = ref(true)
const networkEffectiveType = ref<string | null>(null)
const networkType = ref<string | null>(null)

const batteryIcon = computed((): FunctionalComponent => {
  if (batteryCharging.value)
    return BatteryChargingIcon
  const level = batteryLevel.value
  if (level === null)
    return BatteryMediumIcon
  if (level <= 0.15)
    return BatteryWarningIcon
  if (level <= 0.4)
    return BatteryLowIcon
  if (level <= 0.8)
    return BatteryMediumIcon
  return BatteryFullIcon
})

const wifiIcon = computed((): FunctionalComponent => {
  if (!networkOnline.value || networkType.value === 'none')
    return WifiOffIcon
  const effectiveType = networkEffectiveType.value
  if (effectiveType === 'slow-2g' || effectiveType === '2g')
    return WifiLowIcon
  if (effectiveType === '3g')
    return WifiLowIcon
  if (effectiveType === '4g')
    return WifiHighIcon
  return WifiIcon
})

let menuBarTimer: ReturnType<typeof setInterval>
let batteryManager: BatteryManager | undefined

function getConnection() {
  return (navigator as NavigatorWithDeviceStatus).connection
}

function syncBattery(battery: BatteryManager) {
  batteryLevel.value = battery.level
  batteryCharging.value = battery.charging
}

function syncConnection() {
  const connection = getConnection()
  if (!connection)
    return
  networkEffectiveType.value = connection.effectiveType ?? null
  networkType.value = connection.type ?? null
}

function syncOnline() {
  networkOnline.value = navigator.onLine
  syncConnection()
}

function onBatteryChange() {
  if (batteryManager)
    syncBattery(batteryManager)
}

onMounted(async () => {
  const tick = () => {
    menuBarTime.value = formatMenuBarTime(new Date())
  }
  tick()
  menuBarTimer = setInterval(tick, 60_000)

  syncOnline()
  getConnection()?.addEventListener('change', syncConnection)
  window.addEventListener('online', syncOnline)
  window.addEventListener('offline', syncOnline)

  const getBattery = (navigator as NavigatorWithDeviceStatus).getBattery
  if (!getBattery)
    return

  try {
    batteryManager = await getBattery.call(navigator)
    syncBattery(batteryManager)
    batteryManager.addEventListener('chargingchange', onBatteryChange)
    batteryManager.addEventListener('levelchange', onBatteryChange)
  }
  catch {
    // Battery Status API unavailable or denied
  }
})

onUnmounted(() => {
  clearInterval(menuBarTimer)
  getConnection()?.removeEventListener('change', syncConnection)
  window.removeEventListener('online', syncOnline)
  window.removeEventListener('offline', syncOnline)
  if (batteryManager) {
    batteryManager.removeEventListener('chargingchange', onBatteryChange)
    batteryManager.removeEventListener('levelchange', onBatteryChange)
  }
})
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col overflow-hidden rounded border-2 border-slate-700 bg-white/50 backdrop-blur-2xl shadow-xl"
  >
    <!-- Simple cute wallpaper -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span class="absolute -top-1/4 left-1/4 h-2/3 w-2/3 rounded-full bg-blue-300/60 blur-[80px]" />
      <span class="absolute right-0 bottom-0 h-1/2 w-1/2 rounded-full bg-pink-300/60 blur-[70px]" />
    </div>

    <!-- macOS menu bar -->
    <div
      class="relative z-2 flex h-8 shrink-0 items-center justify-between border-b border-slate-700 bg-white/70 px-4 text-[13px] font-medium text-slate-700 backdrop-blur-md"
      aria-hidden="true"
    >
      <div class="flex items-center gap-4">
        <!-- SVG Apple Logo -->
        <svg viewBox="0 0 14 17" fill="currentColor" class="h">
          <path d="M12.65 8.91c-.04-1.92 1.58-2.85 1.65-2.9-1.28-1.85-3.26-2.1-3.99-2.14-1.68-.17-3.28.98-4.14.98-.86 0-2.19-1.02-3.6-1-1.83.02-3.52 1.05-4.46 2.67-1.9 3.25-.49 8.08 1.36 10.7 .91 1.29 1.98 2.73 3.4 2.68 1.36-.05 1.88-.86 3.52-.86 1.64 0 2.12.86 3.55.83 1.47-.02 2.4-1.3 3.3-2.58 1.05-1.5 1.48-2.95 1.5-3.03-.03-.01-2.81-1.06-2.85-3.41L12.65 8.91zM9.54 2.91c.76-.9 1.26-2.15 1.13-3.39-1.08.04-2.43.7-3.21 1.61-.69.79-1.29 2.06-1.14 3.28 1.21.09 2.47-.62 3.22-1.5z" />
        </svg>
        <span class="font-bold">{{ menuAppName }}</span>
      </div>
      <div class="flex items-center gap-3">
        <component :is="wifiIcon" class="size-4 stroke-2" />
        <component :is="batteryIcon" class="size-4 stroke-2" />
        <span class="tabular-nums font-semibold">{{ menuBarTime }}</span>
      </div>
    </div>

    <Browser class="mx-auto w-full" :app-name="appName" :page-url="pageUrl">
      <template #page>
        <slot name="page" />
      </template>
    </Browser>

    <div class="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex flex-col items-center gap-2 lg:bottom-4">
      <slot name="stage" />
      <slot name="hud" />
    </div>
  </div>
</template>
