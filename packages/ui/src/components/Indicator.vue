<script setup lang="ts">
import { ClipboardCheckIcon, Loader2Icon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import AppLogo from './AppLogo.vue'
import { formatShortcut } from '../lib/utils'

export type IndicatorState = 'idle' | 'processing' | 'result' | 'error'

interface Props {
  state: IndicatorState
  inputText?: string
  commandName?: string
  resultText?: string
  errorText?: string
  isRateLimited?: boolean
  copyResult?: boolean
  globalShortcut?: string
  isMacOS?: boolean
  version?: string
  labels?: {
    copied?: string
  }
}

withDefaults(defineProps<Props>(), {
  inputText: '',
  commandName: '',
  resultText: '',
  errorText: '',
  isRateLimited: false,
  copyResult: false,
  globalShortcut: '',
  isMacOS: false,
  labels: () => ({
    copied: 'COPIED',
  }),
})

defineEmits<{
  (e: 'esc'): void
  (e: 'settings'): void
  (e: 'error-click'): void
}>()
</script>

<template>
  <div
    class="indicator-shell h-full w-full p-0.5"
    :class="{ 'indicator-shell--processing': state === 'processing' }"
    tabindex="0"
    data-tauri-drag-region
    @keydown.esc="$emit('esc')"
  >
    <div
      class="indicator-capsule h-full w-full flex items-center pl-4 gap-3 transition-shadow duration-300 select-none bg-neutral-800 rounded-lg border border-white/10 overflow-hidden cursor-grab active:cursor-grabbing"
      data-tauri-drag-region
    >
      <AppLogo :version="version" dark drag class="size-7" />

      <!-- Center: Status -->
      <div class="indicator-content flex overflow-hidden min-w-0 h-full items-center" data-tauri-drag-region>
        <div v-if="state === 'processing'" class="flex max-w-full items-center gap-2 px-2 overflow-hidden" data-tauri-drag-region>
          <div v-if="commandName" class="flex items-center gap-1 shrink-0 bg-blue-500/10 pl-1 pr-1.5 py-0.5 rounded border border-blue-500/20" data-tauri-drag-region>
            <TerminalIcon class="w-3 h-3 text-blue-400" data-tauri-drag-region />
            <span class="text-[10px] font-bold text-blue-400 tracking-tight uppercase" data-tauri-drag-region>
              {{ commandName.startsWith('/') ? commandName.slice(1) : commandName }}
            </span>
          </div>
          <Loader2Icon class="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" data-tauri-drag-region />
          <span class="truncate text-sm text-blue-100/90 shrink min-w-0 font-medium" data-tauri-drag-region>{{ inputText }}</span>
          <span class="text-[10px] text-blue-400/40 font-mono shrink-0" data-tauri-drag-region>{{ inputText?.length }}</span>
        </div>

        <div v-else-if="state === 'result'" class="flex items-center gap-2 px-2 overflow-hidden" data-tauri-drag-region>
          <span class="truncate text-sm text-green-400 font-medium" data-tauri-drag-region>{{ resultText }}</span>
          <template v-if="copyResult">
            <ClipboardCheckIcon class="w-4 h-4 text-green-400 shrink-0" data-tauri-drag-region />
            <span class="text-[10px] text-green-400/50 font-mono shrink-0" data-tauri-drag-region>{{ labels?.copied ?? 'COPIED' }}</span>
          </template>
        </div>

        <p
          v-else-if="state === 'error'"
          class="truncate text-sm text-red-400 px-2 font-medium"
          :class="{ 'cursor-pointer hover:underline': isRateLimited }"
          :data-tauri-drag-region="!isRateLimited"
          @mousedown="isRateLimited ? $event.stopPropagation() : undefined"
          @click="$emit('error-click')"
        >
          {{ errorText }}
        </p>

        <kbd v-else class="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] text-white/40" data-tauri-drag-region>
          {{ formatShortcut(globalShortcut, isMacOS) }}
        </kbd>
      </div>

      <!-- Right: Settings -->
      <button
        class="size-7 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        @mousedown.stop
        @click="$emit('settings')"
      >
        <SettingsIcon class="w-4 h-4 text-white/40 hover:text-white/60" />
      </button>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: transparent;
  overflow: hidden;
}

.indicator-shell {
  position: relative;
  border-radius: 0.625rem;
  background-color: transparent;
  overflow: hidden;
}

.indicator-capsule {
  position: relative;
  box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
}

.indicator-content {
  max-width: 390px;
}

.indicator-shell--processing::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
  background-color: rgb(52 52 52);
}

.indicator-shell--processing::before {
  position: absolute;
  inset: 0;
  padding: 2px;
  content: "";
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
  background:
    conic-gradient(
      from var(--indicator-runner-angle, 0deg),
      rgb(229 229 229 / 0%) 0deg,
      rgb(229 229 229 / 0%) 310deg,
      rgb(229 229 229 / 95%) 318deg,
      rgb(229 229 229 / 95%) 336deg,
      rgb(229 229 229 / 0%) 344deg,
      rgb(229 229 229 / 0%) 360deg
    );
  filter: drop-shadow(0 0 3px rgb(245 245 245 / 35%));
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation: indicator-border-runner 3.6s linear infinite;
}

.indicator-shell--processing .indicator-capsule {
  z-index: 1;
}

@property --indicator-runner-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes indicator-border-runner {
  to {
    --indicator-runner-angle: 360deg;
  }
}
</style>
