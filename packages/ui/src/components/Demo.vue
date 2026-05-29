<script setup lang="ts">
import { RotateCcwIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import Indicator from './Indicator.vue'

interface Props {
  initialText: string
  resolvedText: string
  command?: string
  active?: boolean
  inputLabel?: string
  replayLabel?: string
  globalShortcut?: string
}

const props = withDefaults(defineProps<Props>(), {
  inputLabel: 'Input',
  replayLabel: 'Replay',
  globalShortcut: 'CommandOrControl+Shift+X',
})

const currentText = ref('')
const status = ref<'idle' | 'typing' | 'pending' | 'processing' | 'result'>('idle')
const showIndicator = ref(false)

async function runSimulation() {
  if (status.value === 'typing')
    return
  status.value = 'typing'
  currentText.value = ''

  for (let i = 0; i < props.initialText.length; i++) {
    currentText.value += props.initialText[i]
    await new Promise(r => setTimeout(r, 50 + Math.random() * 50))
  }

  status.value = 'pending'
  await new Promise(r => setTimeout(r, 800))

  status.value = 'processing'
  showIndicator.value = true

  await new Promise(r => setTimeout(r, 1500))

  status.value = 'result'
  currentText.value = props.resolvedText

  await new Promise(r => setTimeout(r, 2000))
  showIndicator.value = false
  status.value = 'idle'
}

watch(() => props.active, (isActive) => {
  if (isActive)
    runSimulation()
}, { immediate: true })

function replay() {
  runSimulation()
}
</script>

<template>
  <div class="demo-interact">
    <div class="demo-interact__input">
      <p class="demo-interact__label">
        {{ inputLabel }}
      </p>
      <textarea
        v-model="currentText"
        readonly
        class="demo-interact__text"
        rows="1"
      />

      <div v-if="showIndicator" class="demo-interact__indicator">
        <Indicator
          embedded
          :state="status === 'processing' ? 'processing' : (status === 'result' ? 'result' : 'idle')"
          :input-text="currentText"
          :command-name="command ?? ''"
          :result-text="resolvedText"
          :global-shortcut="globalShortcut"
        />
      </div>
    </div>

    <button
      v-if="status === 'idle' && currentText === resolvedText"
      type="button"
      class="demo-interact__replay"
      @click="replay"
    >
      <RotateCcwIcon class="demo-interact__replay-icon" />
      {{ replayLabel }}
    </button>
  </div>
</template>

<style scoped>
.demo-interact {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.demo-interact__input {
  position: relative;
  border-radius: 0.75rem;
  border: 1px solid rgb(255 255 255 / 10%);
  background: rgb(39 39 42);
  padding: 0.875rem 1rem;
}

.demo-interact__label {
  margin: 0 0 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(161 161 170);
}

.demo-interact__text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgb(228 228 231);
  background: transparent;
  border: none;
  resize: none;
  width: 100%;
  outline: none;
  padding: 0;
  font-family: inherit;
  display: block;
}

.demo-interact__indicator {
  position: absolute;
  inset: 0.375rem;
  z-index: 10;
}

.demo-interact__replay {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 0.5rem;
  background: rgb(39 39 42);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(161 161 170);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.demo-interact__replay:hover {
  color: rgb(228 228 231);
  border-color: rgb(255 255 255 / 20%);
  background: rgb(63 63 70);
}

.demo-interact__replay-icon {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
