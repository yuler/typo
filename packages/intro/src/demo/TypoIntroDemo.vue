<script setup lang="ts">
import type gsap from 'gsap'
import { computed, ref } from 'vue'
import HotkeyHint from '@/components/HotkeyHint.vue'
import IntroEndCard from '@/components/IntroEndCard.vue'
import TypoIndicator from '@/components/TypoIndicator.vue'
import WeChatFileTransferWindow from '@/components/WeChatFileTransferWindow.vue'
import { INTRO_HEIGHT, INTRO_ORIGINAL_TEXT, INTRO_REFINED_TEXT, INTRO_WIDTH } from './constants'
import { useIntroTimeline } from './useIntroTimeline'

const props = withDefaults(defineProps<{
  mode?: 'interactive' | 'render'
  autoplay?: boolean
  loop?: boolean
  scalable?: boolean
  composerText?: import('vue').Ref<string>
  showCursor?: import('vue').Ref<boolean>
  showSelection?: import('vue').Ref<boolean>
  composerHighlight?: import('vue').Ref<boolean>
  renderTimeline?: gsap.core.Timeline
}>(), {
  mode: 'interactive',
  autoplay: true,
  loop: false,
  scalable: true,
})

const composerText = props.composerText ?? ref('')
const showCursor = props.showCursor ?? ref(false)
const showSelection = props.showSelection ?? ref(false)
const composerHighlight = props.composerHighlight ?? ref(false)

const indicatorInput = computed(() => {
  const t = composerText.value || INTRO_ORIGINAL_TEXT
  return t.length > 26 ? `${t.slice(0, 25)}…` : t
})

const { play } = useIntroTimeline(
  { composerText, showCursor, showSelection, composerHighlight },
  {
    mode: props.mode,
    autoplay: props.autoplay,
    loop: props.loop,
    timeline: props.renderTimeline,
  },
)

defineExpose({ play })
</script>

<template>
  <div
    class="typo-intro-demo relative overflow-hidden bg-transparent font-[Helvetica_Neue,PingFang_SC,-apple-system,BlinkMacSystemFont,sans-serif]"
    :class="mode === 'render' ? '' : 'w-full'"
    :style="mode === 'render' ? { width: `${INTRO_WIDTH}px`, height: `${INTRO_HEIGHT}px` } : undefined"
  >
    <div
      class="relative flex w-full items-center justify-center"
      :class="mode === 'render' ? 'h-full' : 'min-h-[760px] py-6'"
    >
      <WeChatFileTransferWindow
        :composer-text="composerText"
        :show-cursor="showCursor"
        :show-selection="showSelection"
        :composer-highlight="composerHighlight"
      />

      <HotkeyHint />

      <TypoIndicator
        :input-text="indicatorInput"
        :result-text="INTRO_REFINED_TEXT"
        :char-count="INTRO_ORIGINAL_TEXT.length"
      />

      <IntroEndCard v-if="mode === 'render'" />
    </div>
  </div>
</template>
