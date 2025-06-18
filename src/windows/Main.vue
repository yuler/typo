<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { deepSeekCorrect } from '../ai'
import { useGlobalState } from '../composables/useGlobalState'
import { getDeepSeekApiKey } from '../store'

const { setCurrentWindow } = useGlobalState()

const DEEPSEEK_API_KEY = ref('')
onMounted(async () => {
  DEEPSEEK_API_KEY.value = await getDeepSeekApiKey()
})

const input = ref('')
const output = ref('')

const submitting = ref(false)
async function correct() {
  submitting.value = true
  try {
    const result = await deepSeekCorrect(input.value)
    output.value = result.text
  }
  finally {
    submitting.value = false
  }
}

function copy(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="px-8 py-4 border-t">
    <form v-if="DEEPSEEK_API_KEY" @submit.prevent="correct">
      <div class="grid grid-cols-2 w-full gap-1.5">
        <div>
          <h2 class="text-lg font-bold mb-2">
            Input
          </h2>
          <Textarea
            v-model="input"
            placeholder="Enter your text here"
            rows="10"
            @keydown.ctrl.enter.prevent="correct"
          />
        </div>
        <div v-if="output">
          <h2 class="text-lg font-bold mb-2">
            Output
          </h2>
          <pre class="border rounded-md p-4 text-muted-foreground whitespace-pre-wrap">{{ output }}</pre>
          <Button class="mt-4" @click="copy(output)">
            Copy
          </Button>
        </div>
      </div>

      <div class="mt-4 flex">
        <Button type="submit" :disabled="submitting">
          {{ submitting ? 'Correcting...' : 'Correct' }}
        </Button>
      </div>
    </form>
    <div v-else>
      <h2 class="text-lg font-bold">
        No DeepSeek API Key
      </h2>
      <p class="text-sm text-muted-foreground">
        Please set your DeepSeek API Key in the settings page
      </p>
      <Button class="mt-4" @click="setCurrentWindow('Settings')">
        Settings
      </Button>
    </div>
  </div>
</template>
