<script setup lang="ts">
defineProps<{
  text: string
  showCursor?: boolean
  showSelection?: boolean
  highlight?: boolean
}>()
</script>

<template>
  <div
    id="composer"
    class="flex h-full flex-col overflow-hidden bg-white"
    :class="highlight ? 'ring-2 ring-inset ring-[#07c160]/35' : ''"
  >
    <div
      id="composer-text"
      class="relative min-h-0 flex-1 px-5 pt-4 pb-3 text-[15px] leading-[1.5] text-[#191919] whitespace-pre-wrap"
    >
      <div
        id="text-selection"
        class="pointer-events-none absolute inset-x-4 top-3.5 bottom-2 rounded-[2px] bg-[#95ec69]/55 transition-opacity"
        :class="showSelection ? 'opacity-100' : 'opacity-0'"
      />
      <span id="input-text" class="relative z-[1]">{{ text }}</span>
      <span
        id="input-cursor"
        class="ml-px inline-block h-[18px] w-[2px] translate-y-[2px] bg-[#07c160]"
        :class="showCursor ? 'opacity-100' : 'opacity-0'"
      />
    </div>

    <div class="composer-toolbar flex shrink-0 items-center gap-5 border-t border-[#ececec] px-5 py-3 text-[#6b6b6b]">
      <!-- emoji -->
      <svg class="h-5 w-5 stroke-current fill-none stroke-[1.4]" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
      <!-- cube -->
      <svg class="h-5 w-5 stroke-current fill-none stroke-[1.4]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </svg>
      <!-- folder -->
      <svg class="h-5 w-5 stroke-current fill-none stroke-[1.4]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16v12H4z" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      <!-- screenshot -->
      <div class="flex items-center gap-0.5">
        <svg class="h-5 w-5 stroke-current fill-none stroke-[1.4]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="7" r="2" />
          <circle cx="6" cy="17" r="2" />
          <path d="M8 8l12 8M8 16l12-8" />
        </svg>
        <svg class="h-2 w-2 stroke-current fill-none stroke-2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <!-- mic -->
      <svg class="h-5 w-5 stroke-current fill-none stroke-[1.4]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
        <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
        <path d="M12 19v3" />
      </svg>
    </div>
  </div>
</template>
