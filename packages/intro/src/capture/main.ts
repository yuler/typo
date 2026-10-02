import gsap from 'gsap'
import { createApp, ref } from 'vue'
import TypoIntroDemo from '@/demo/TypoIntroDemo.vue'
import { buildIntroTimeline, registerIntroTimeline } from '@/demo/useIntroTimeline'
import '@/style.css'

const interactive = import.meta.env.DEV

if (!interactive) {
  const placeholder = gsap.timeline({ paused: true })
  registerIntroTimeline(placeholder)
}

const composerText = ref('')
const showCursor = ref(false)
const showSelection = ref(false)
const composerHighlight = ref(false)

const renderTimeline = interactive ? undefined : gsap.timeline({ paused: true })

const app = createApp(TypoIntroDemo, {
  mode: interactive ? 'interactive' : 'render',
  autoplay: interactive,
  scalable: interactive,
  composerText,
  showCursor,
  showSelection,
  composerHighlight,
  renderTimeline,
})

app.mount('#app')

if (!interactive && renderTimeline) {
  renderTimeline.clear()
  buildIntroTimeline(
    { composerText, showCursor, showSelection, composerHighlight },
    { timeline: renderTimeline },
  )
}
