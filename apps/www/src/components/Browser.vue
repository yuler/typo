<script setup lang="ts">
import { ChevronLeftIcon, LockIcon } from 'lucide-vue-next'

interface Props {
  appName?: string
  pageUrl?: string
}

withDefaults(defineProps<Props>(), {
  appName: 'Typo',
  pageUrl: 'typo.yuler.cc',
})
</script>

<template>
  <div
    class="relative z-1 flex min-h-0 flex-1 px-2 pt-4 pb-8 sm:px-3 lg:pb-16"
  >
    <div
      class="flex w-full flex-col overflow-hidden rounded border border-slate-700 bg-white shadow-xl transition-[border-color,box-shadow] duration-300"
    >
      <div class="flex items-end gap-2 border-b border-slate-700 bg-pink-50/50 px-4 pt-3">
        <div class="mb-2.5 flex items-center gap-2 pr-2" aria-hidden="true">
          <span class="size-3.5 rounded-full border border-slate-700 bg-[#ff5f56]" />
          <span class="size-3.5 rounded-full border border-slate-700 bg-[#ffbd2e]" />
          <span class="size-3.5 rounded-full border border-slate-700 bg-[#27c93f]" />
        </div>
        <div
          class="flex max-w-44 items-center gap-2 rounded-t-xl border border-b-0 border-slate-700 bg-white px-3 py-1.5 translate-y-[1px]"
        >
          <span class="size-3.5 shrink-0 rounded-full border border-slate-700 bg-blue-300" />
          <span class="truncate text-[12px] font-semibold text-slate-700">{{ appName }}</span>
          <span class="ml-1 text-[13px] font-semibold leading-none text-slate-400">×</span>
        </div>
      </div>

      <div class="flex items-center gap-3 border-b border-slate-700 bg-white px-4 py-2.5">
        <ChevronLeftIcon class="size-5 stroke-2 text-slate-500" />
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-50 px-4 py-1.5 shadow-sm">
          <LockIcon class="size-3.5 shrink-0 stroke-2 text-slate-600" />
          <span class="truncate text-[13px] font-medium text-slate-600">
            https://{{ pageUrl }}
          </span>
        </div>
      </div>

      <div class="relative min-h-30 flex-1 bg-white p-4">
        <slot name="page" />
      </div>
    </div>
  </div>
</template>
