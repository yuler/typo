import type { Ref } from 'vue'
import gsap from 'gsap'
import { onMounted, onUnmounted } from 'vue'
import { INTRO_ORIGINAL_TEXT, INTRO_REFINED_TEXT } from './constants'

declare global {
  interface Window {
    __timelines?: Record<string, gsap.core.Timeline>
  }
}

export interface IntroTimelineState {
  composerText: Ref<string>
  showCursor: Ref<boolean>
  showSelection: Ref<boolean>
  composerHighlight: Ref<boolean>
}

export interface UseIntroTimelineOptions {
  mode?: 'interactive' | 'render'
  autoplay?: boolean
  loop?: boolean
  timeline?: gsap.core.Timeline
}

export function registerIntroTimeline(timeline: gsap.core.Timeline) {
  window.__timelines = window.__timelines ?? {}
  window.__timelines['typo-intro'] = timeline
  window.__timelines.main = timeline
}

export function buildIntroTimeline(
  state: IntroTimelineState,
  options: Pick<UseIntroTimelineOptions, 'loop' | 'timeline'> = {},
) {
  const { composerText, showCursor, showSelection, composerHighlight } = state
  const tl = options.timeline ?? gsap.timeline({
    paused: true,
    onComplete: () => {
      if (options.loop)
        tl.restart()
    },
  })

  gsap.set('#scene-indicator', { y: 24 })

  tl.from('#scene-wechat', { opacity: 0, y: 20, duration: 0.8, ease: 'power2.out' }, 0)

  tl.call(() => { showCursor.value = true }, [], 0.9)
  tl.to({}, {
    duration: 1.6,
    onUpdate() {
      const p = this.progress()
      const len = Math.floor(INTRO_ORIGINAL_TEXT.length * Math.min(1, p * 1.1))
      composerText.value = INTRO_ORIGINAL_TEXT.slice(0, len)
    },
  }, 1)

  tl.call(() => { showCursor.value = false }, [], 2.7)
  tl.call(() => { showSelection.value = true }, [], 2.9)
  tl.call(() => { composerHighlight.value = true }, [], 2.9)

  tl.to('#scene-hotkey', { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)' }, 3.15)
  tl.to('#scene-hotkey', { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' }, 3.9)
  tl.set('#scene-hotkey', { opacity: 0 }, 4.2)

  tl.to('#scene-indicator', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 4.05)
  tl.to('#ind-idle', { opacity: 1, duration: 0.2 }, 4.15)
  tl.to('#ind-idle', { opacity: 0, duration: 0.2 }, 4.65)

  tl.to('#ind-processing', { opacity: 1, duration: 0.25 }, 4.75)

  tl.to('#ind-processing', { opacity: 0, duration: 0.25 }, 7.4)
  tl.to('#ind-result', { opacity: 1, duration: 0.35 }, 7.55)

  tl.call(() => {
    showSelection.value = false
    composerHighlight.value = false
    composerText.value = INTRO_REFINED_TEXT
  }, [], 8.2)

  tl.fromTo('#input-text', { color: '#07c160' }, { color: '#1a1a1a', duration: 1.2, ease: 'power1.out' }, 8.35)

  tl.to('#scene-indicator', { opacity: 0, y: 20, duration: 0.45, ease: 'power2.in' }, 9.8)

  tl.to('#scene-wechat', { opacity: 0.35, scale: 0.98, duration: 0.6, ease: 'power1.inOut' }, 14.2)
  tl.to('#scene-end', { opacity: 1, duration: 0.5 }, 14.5)

  registerIntroTimeline(tl)
  return tl
}

export function useIntroTimeline(
  state: IntroTimelineState,
  options: UseIntroTimelineOptions = {},
) {
  let timeline: gsap.core.Timeline | null = options.timeline ?? null

  onMounted(() => {
    if (options.timeline)
      return

    timeline = buildIntroTimeline(state, { loop: options.loop })

    if (options.autoplay !== false && options.mode !== 'render')
      timeline.play()
  })

  onUnmounted(() => {
    if (!options.timeline)
      timeline?.kill()
    timeline = null
  })

  function play() {
    timeline?.restart()
  }

  return { play, getTimeline: () => timeline }
}
