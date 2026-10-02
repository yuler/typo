<template>
  <div
    id="scene-hotkey"
    class="clip hotkey-hint pointer-events-none absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 scale-[0.85] items-center gap-2.5 rounded-[14px] border border-white/12 bg-neutral-900/92 px-5.5 py-3.5 opacity-0 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
    data-start="3.2"
    data-duration="1.4"
    data-track-index="3"
  >
    <span class="mr-1 text-[15px] text-white/65">Invoke typo</span>
    <kbd class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/15 bg-white/8 px-2.5 font-mono text-[15px] font-semibold text-white">⌃</kbd>
    <span class="text-sm text-white/35">+</span>
    <kbd class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/15 bg-white/8 px-2.5 font-mono text-[15px] font-semibold text-white">⇧</kbd>
    <span class="text-sm text-white/35">+</span>
    <kbd class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/15 bg-white/8 px-2.5 font-mono text-[15px] font-semibold text-white">X</kbd>
  </div>
</template>
