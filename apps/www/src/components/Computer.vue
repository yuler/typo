<script setup lang="ts">
import { AppLogo } from '@typo/ui'
import { BatteryMediumIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, RotateCwIcon, WifiIcon } from 'lucide-vue-next'
import { useId } from 'vue'

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

const svgId = useId().replace(/:/g, '')

const dockApps = [
  { id: 'finder' },
  { id: 'launchpad' },
  { id: 'safari' },
  { id: 'messages' },
  { id: 'mail' },
  { id: 'notes' },
  { id: 'music' },
  { id: 'chrome', active: true },
  { id: 'typo', typo: true as const },
  { id: 'trash', separated: true },
]
</script>

<template>
  <div
    class="relative flex h-[400px] w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-[linear-gradient(165deg,#0c2d4a_0%,#1a3d5c_30%,#3d2a5c_60%,#5a2d4e_85%,#120a1e_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/8%)]"
  >
    <!-- macOS wallpaper + background windows -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span class="absolute -top-1/4 left-1/4 h-2/3 w-2/3 rounded-full bg-sky-400/25 blur-[80px]" />
      <span class="absolute right-0 bottom-0 h-1/2 w-1/2 rounded-full bg-fuchsia-500/20 blur-[70px]" />
      <div
        class="absolute top-[18%] -left-[5%] h-[55%] w-[34%] -rotate-6 overflow-hidden rounded-lg border border-white/15 bg-zinc-900/40 shadow-lg backdrop-blur-sm transition-all duration-500"
        :class="dimmed ? 'scale-[0.98] opacity-40 blur-md' : ''"
      >
        <div class="flex h-5 items-center gap-1.5 border-b border-white/10 px-2">
          <span class="size-2 rounded-full bg-[#ff5f56]" />
          <span class="size-2 rounded-full bg-[#ffbd2e]" />
          <span class="size-2 rounded-full bg-[#27c93f]" />
        </div>
      </div>
      <div
        class="absolute top-[26%] -right-[6%] h-[50%] w-[32%] rotate-4 overflow-hidden rounded-lg border border-white/15 bg-zinc-900/40 shadow-lg backdrop-blur-sm transition-all duration-500"
        :class="dimmed ? 'scale-[0.98] opacity-40 blur-md' : ''"
      >
        <div class="flex h-5 items-center gap-1.5 border-b border-white/10 px-2">
          <span class="size-2 rounded-full bg-[#ff5f56]" />
          <span class="size-2 rounded-full bg-[#ffbd2e]" />
          <span class="size-2 rounded-full bg-[#27c93f]" />
        </div>
      </div>
    </div>

    <!-- macOS menu bar -->
    <div
      class="relative z-2 flex h-6 shrink-0 items-center justify-between border-b border-white/10 bg-black/25 px-3 text-[11px] text-white/90 backdrop-blur-xl"
      aria-hidden="true"
    >
      <div class="flex items-center gap-3">
        <span class="text-[13px] leading-none" aria-label="Apple">&#63743;</span>
        <span class="font-semibold">{{ menuAppName }}</span>
        <span class="hidden text-white/75 sm:inline">File</span>
        <span class="hidden text-white/75 sm:inline">Edit</span>
        <span class="hidden text-white/75 sm:inline">View</span>
        <span class="hidden text-white/75 md:inline">History</span>
        <span class="hidden text-white/75 md:inline">Bookmarks</span>
      </div>
      <div class="flex items-center gap-2.5 text-white/80">
        <WifiIcon class="size-3.5" />
        <BatteryMediumIcon class="size-3.5" />
        <span class="tabular-nums">Fri 2:30 PM</span>
      </div>
    </div>

    <!-- Focused browser window -->
    <div class="relative z-1 flex min-h-0 flex-1 items-center justify-center px-5 pt-3 pb-16">
      <div
        class="flex w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-black/40 bg-zinc-900/95 shadow-[0_24px_48px_rgb(0_0_0/45%)] transition-[border-color,box-shadow] duration-300"
        :class="dimmed && 'ring-1 ring-indigo-400/40 shadow-[0_0_0_1px_rgb(129_140_248/20%),0_24px_56px_rgb(0_0_0/50%)]'"
      >
        <div class="flex items-end gap-1 bg-zinc-950/90 px-2 pt-2">
          <div class="mb-1.5 flex items-center gap-1.5 pr-1" aria-hidden="true">
            <span class="size-3 rounded-full bg-[#ff5f56]" />
            <span class="size-3 rounded-full bg-[#ffbd2e]" />
            <span class="size-3 rounded-full bg-[#27c93f]" />
          </div>
          <div
            class="flex max-w-44 items-center gap-2 rounded-t-lg border border-b-0 border-white/10 bg-zinc-800 px-2.5 py-1.5"
          >
            <span class="size-3 shrink-0 rounded-full bg-linear-to-br from-red-400 to-orange-400" />
            <span class="truncate text-[11px] text-zinc-300">{{ appName }}</span>
            <span class="ml-0.5 text-[10px] leading-none text-zinc-500">×</span>
          </div>
          <div class="mb-1 flex size-6 shrink-0 items-center justify-center rounded-md text-sm text-zinc-500">
            +
          </div>
        </div>

        <div class="flex items-center gap-2 border-b border-white/10 bg-zinc-800/95 px-2.5 py-1.5">
          <div class="flex items-center gap-0.5 text-zinc-500" aria-hidden="true">
            <span class="flex size-6 items-center justify-center rounded-md">
              <ChevronLeftIcon class="size-3.5" />
            </span>
            <span class="flex size-6 items-center justify-center rounded-md">
              <ChevronRightIcon class="size-3.5" />
            </span>
            <span class="flex size-6 items-center justify-center rounded-md">
              <RotateCwIcon class="size-3" />
            </span>
          </div>
          <div class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1">
            <LockIcon class="size-3 shrink-0 text-emerald-500/80" />
            <span class="truncate text-[11px] text-zinc-400">
              https://{{ pageUrl }}
            </span>
          </div>
        </div>

        <div class="relative min-h-30 bg-zinc-950 p-4">
          <slot name="page" />
        </div>
      </div>

      <slot name="stage" />
    </div>

    <slot name="hud" />

    <!-- macOS Dock -->
    <div class="absolute inset-x-0 bottom-2 z-20 flex justify-center px-3" aria-hidden="true">
      <div
        class="flex items-end gap-1.5 rounded-[20px] border border-white/20 bg-white/10 px-2.5 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/35%),0_12px_40px_rgb(0_0_0/45%)] backdrop-blur-2xl"
      >
        <template v-for="app in dockApps" :key="app.id">
          <div
            v-if="'separated' in app && app.separated"
            class="mx-0.5 mb-1 h-9 w-px self-center bg-white/20"
          />
          <div class="group flex flex-col items-center gap-1">
            <div
              class="relative size-9 transition-transform duration-200 ease-out will-change-transform"
              :class="(app.active || ('typo' in app && typoActive))
                ? '-translate-y-1.5 scale-110'
                : 'group-hover:-translate-y-1 group-hover:scale-110'"
            >
              <svg v-if="app.id === 'trash'" viewBox="0 0 64 64" class="size-full drop-shadow-sm">
                <g fill="none" stroke="#dfe5ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18 H49" />
                  <path d="M27 18 V14 H37 V18" />
                  <path d="M20 18 L23.5 50 H40.5 L44 18" />
                  <path d="M29 26 V44 M35 26 V44" />
                </g>
              </svg>

              <div
                v-else-if="'typo' in app"
                class="flex size-full items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-md ring-1 ring-black/10"
              >
                <AppLogo class="size-7" />
              </div>

              <div v-else class="size-full overflow-hidden rounded-[22%] shadow-md ring-1 ring-black/10">
                <svg v-if="app.id === 'finder'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <linearGradient :id="`${svgId}-finder-r`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#3aa0ff" />
                      <stop offset="1" stop-color="#1277e8" />
                    </linearGradient>
                    <linearGradient :id="`${svgId}-finder-l`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#0d63c8" />
                      <stop offset="1" stop-color="#054ea0" />
                    </linearGradient>
                    <clipPath :id="`${svgId}-finder-left`"><rect x="0" y="0" width="32" height="64" /></clipPath>
                    <clipPath :id="`${svgId}-finder-right`"><rect x="32" y="0" width="32" height="64" /></clipPath>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-finder-r)`" />
                  <rect width="32" height="64" :fill="`url(#${svgId}-finder-l)`" />
                  <rect x="20" y="18" width="3.2" height="13" rx="1.6" fill="#fff" />
                  <rect x="40.8" y="18" width="3.2" height="13" rx="1.6" fill="#073a78" />
                  <g fill="none" stroke-width="3.2" stroke-linecap="round">
                    <path d="M14 40 q18 16 36 0" stroke="#fff" :clip-path="`url(#${svgId}-finder-left)`" />
                    <path d="M14 40 q18 16 36 0" stroke="#073a78" :clip-path="`url(#${svgId}-finder-right)`" />
                  </g>
                </svg>

                <svg v-else-if="app.id === 'launchpad'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <linearGradient :id="`${svgId}-lp-bg`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#e4e8ee" />
                      <stop offset="1" stop-color="#b9c0ca" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-lp-bg)`" />
                  <g>
                    <rect x="14" y="14" width="10" height="10" rx="3" fill="#ff6b6b" />
                    <rect x="27" y="14" width="10" height="10" rx="3" fill="#feca57" />
                    <rect x="40" y="14" width="10" height="10" rx="3" fill="#54a0ff" />
                    <rect x="14" y="27" width="10" height="10" rx="3" fill="#5f27cd" />
                    <rect x="27" y="27" width="10" height="10" rx="3" fill="#1dd1a1" />
                    <rect x="40" y="27" width="10" height="10" rx="3" fill="#ff9ff3" />
                    <rect x="14" y="40" width="10" height="10" rx="3" fill="#48dbfb" />
                    <rect x="27" y="40" width="10" height="10" rx="3" fill="#ff6348" />
                    <rect x="40" y="40" width="10" height="10" rx="3" fill="#10ac84" />
                  </g>
                </svg>

                <svg v-else-if="app.id === 'safari'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <radialGradient :id="`${svgId}-safari-bg`" cx="50%" cy="42%" r="62%">
                      <stop offset="0" stop-color="#19a0ff" />
                      <stop offset="1" stop-color="#0066e0" />
                    </radialGradient>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-safari-bg)`" />
                  <circle cx="32" cy="32" r="24" fill="#f2f6fb" />
                  <circle cx="32" cy="32" r="22" fill="#2090ff" />
                  <g stroke="#fff" stroke-opacity=".75" stroke-width="1.4">
                    <line x1="32" y1="11" x2="32" y2="15" />
                    <line x1="32" y1="49" x2="32" y2="53" />
                    <line x1="11" y1="32" x2="15" y2="32" />
                    <line x1="49" y1="32" x2="53" y2="32" />
                  </g>
                  <polygon points="32,32 44,20 34,33" fill="#ff3b30" />
                  <polygon points="32,32 20,44 30,31" fill="#fff" />
                  <circle cx="32" cy="32" r="2" fill="#fff" />
                </svg>

                <svg v-else-if="app.id === 'messages'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <linearGradient :id="`${svgId}-msg-bg`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#5bf675" />
                      <stop offset="1" stop-color="#1bbb3a" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-msg-bg)`" />
                  <path
                    d="M32 14 C18 14 12 22 12 30 C12 38 18 45 28 46 L22 53 C30 52 34 49 38 46 C48 44 52 38 52 30 C52 22 46 14 32 14 Z"
                    fill="#fff"
                  />
                </svg>

                <svg v-else-if="app.id === 'mail'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <linearGradient :id="`${svgId}-mail-bg`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#28b6ff" />
                      <stop offset="1" stop-color="#0a73f0" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-mail-bg)`" />
                  <rect x="12" y="20" width="40" height="26" rx="5" fill="#fff" />
                  <path
                    d="M14 23 L32 37 L50 23"
                    fill="none"
                    stroke="#bcd9ff"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <svg v-else-if="app.id === 'notes'" viewBox="0 0 64 64" class="size-full">
                  <rect width="64" height="64" fill="#fdfdf8" />
                  <rect width="64" height="17" fill="#ffd23b" />
                  <g stroke="#e4e2da" stroke-width="2.4">
                    <line x1="14" y1="30" x2="50" y2="30" />
                    <line x1="14" y1="40" x2="50" y2="40" />
                    <line x1="14" y1="50" x2="42" y2="50" />
                  </g>
                </svg>

                <svg v-else-if="app.id === 'music'" viewBox="0 0 64 64" class="size-full">
                  <defs>
                    <linearGradient :id="`${svgId}-music-bg`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#fb5c74" />
                      <stop offset="1" stop-color="#fa233b" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" :fill="`url(#${svgId}-music-bg)`" />
                  <g fill="#fff">
                    <rect x="26" y="19" width="3" height="22" />
                    <rect x="40" y="16" width="3" height="22" />
                    <path d="M26 19 L43 16 V21 L26 24 Z" />
                    <ellipse cx="24" cy="41" rx="6" ry="5" />
                    <ellipse cx="38" cy="38" rx="6" ry="5" />
                  </g>
                </svg>

                <svg v-else-if="app.id === 'chrome'" viewBox="0 0 64 64" class="size-full">
                  <rect width="64" height="64" fill="#fff" />
                  <path d="M32 32 L32 8 A24 24 0 0 1 52.8 44 Z" fill="#ea4335" />
                  <path d="M32 32 L52.8 44 A24 24 0 0 1 11.2 44 Z" fill="#34a853" />
                  <path d="M32 32 L11.2 44 A24 24 0 0 1 32 8 Z" fill="#fbbc05" />
                  <circle cx="32" cy="32" r="11" fill="#fff" />
                  <circle cx="32" cy="32" r="8" fill="#4285f4" />
                </svg>
              </div>
            </div>
            <span
              class="size-1 rounded-full bg-white/90 transition-opacity duration-200"
              :class="(app.active || ('typo' in app && typoActive)) ? 'opacity-100' : 'opacity-0'"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
