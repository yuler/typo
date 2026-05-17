<script setup lang="ts">
import { PlusIcon, SaveIcon, Trash2Icon } from 'lucide-vue-next'
import { nextTick, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/composables/useI18n'
import * as store from '@/stores/settings'
import { toast } from 'vue-sonner'

const { t } = useI18n()

const form = ref({
  system_prompt: '',
  slash_commands: [] as store.SlashCommand[],
})

onMounted(async () => {
  const [systemPrompt, shortcuts] = await Promise.all([
    store.get('ai_system_prompt'),
    store.get('slash_commands'),
  ])
  form.value.system_prompt = systemPrompt
  form.value.slash_commands = shortcuts.map(s => ({ ...s, id: s.id || crypto.randomUUID() }))

  nextTick(() => {
    const textarea = document.getElementById('system_prompt') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(0, 0)
    }
  })
})

function addPromptSlash() {
  if (form.value.slash_commands.length >= 5) {
    return
  }
  form.value.slash_commands.push({ id: crypto.randomUUID(), key: '', value: '' })
}

function removePromptSlash(index: number) {
  form.value.slash_commands.splice(index, 1)
}

async function onSubmit() {
  const slashCommands = form.value.slash_commands
    .map(item => ({ ...item, key: item.key.trim(), value: item.value.trim() }))
    .filter(item => item.key && item.value)
    .slice(0, 5)

  await Promise.all([
    store.set('ai_system_prompt', form.value.system_prompt),
    store.set('slash_commands', slashCommands),
  ])
  await store.save()
  toast.success(t('settings.save_success'))
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden px-1">
    <div class="flex-1 overflow-y-auto pr-4 -mr-4">
      <div class="flex flex-col gap-6 pb-24">
        <h1 class="text-2xl font-bold">
          {{ t('settings.prompts.title') }}
        </h1>

        <!-- System Prompt Card -->
        <div class="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div class="p-6 space-y-4">
            <div class="space-y-2">
              <Label for="system_prompt" class="text-base font-semibold">{{ t('settings.prompts.system.label') }}</Label>
              <p class="text-sm text-muted-foreground">
                {{ t('settings.prompts.system.placeholder') }}
              </p>
            </div>
            <Textarea
              id="system_prompt"
              v-model="form.system_prompt"
              autofocus
              :rows="12"
              class="min-h-[300px] resize-none bg-muted/20"
              placeholder="You are a helpful assistant..."
            />
          </div>
        </div>

        <!-- Slash Commands Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label class="text-base font-semibold">{{ t('settings.prompts.slash.label') }}</Label>
              <p class="text-xs text-muted-foreground">
                <template v-for="(part, i) in t('settings.prompts.slash.hint').split(/(<code>.*?<\/code>)/g)" :key="i">
                  <code v-if="part.startsWith('<code>')" class="bg-muted px-1 rounded">{{ part.replace(/<\/?code>/g, '') }}</code>
                  <template v-else>
                    {{ part }}
                  </template>
                </template>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="form.slash_commands.length >= 5"
              @click="addPromptSlash"
            >
              <PlusIcon class="w-4 h-4 mr-2" />
              {{ t('settings.prompts.slash.add') }}
            </Button>
          </div>

          <div class="grid gap-4">
            <div
              v-for="(item, index) in form.slash_commands"
              :key="item.id"
              class="group relative rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div class="grid gap-6">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label :for="`prompt-key-${index}`" class="text-sm font-medium">{{ t('settings.prompts.slash.key_label') }}</Label>
                    <Input :id="`prompt-key-${index}`" v-model="item.key" placeholder="/tr:zh" class="bg-muted/20" />
                  </div>
                  <div class="space-y-2">
                    <Label :for="`prompt-aliases-${index}`" class="text-sm font-medium">{{ t('settings.prompts.slash.aliases_label') }}</Label>
                    <Input
                      :id="`prompt-aliases-${index}`"
                      :model-value="item.aliases?.join(', ')"
                      placeholder="/tr, /zh"
                      class="bg-muted/20"
                      @update:model-value="(val) => item.aliases = String(val).split(',').map(s => s.trim()).filter(Boolean)"
                    />
                  </div>
                </div>
                <div class="space-y-2">
                  <Label :for="`prompt-value-${index}`" class="text-sm font-medium">{{ t('settings.prompts.slash.instruction_label') }}</Label>
                  <Textarea
                    :id="`prompt-value-${index}`"
                    v-model="item.value"
                    :rows="4"
                    class="resize-none bg-muted/20"
                    :placeholder="t('settings.prompts.slash.instruction_placeholder')"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                @click="removePromptSlash(index)"
              >
                <Trash2Icon class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sticky Footer for Save Button -->
    <div class="shrink-0 flex justify-end py-4 border-t bg-background/80 backdrop-blur-sm -mx-1 px-4">
      <Button variant="secondary" size="lg" @click="onSubmit">
        <SaveIcon class="w-4 h-4 mr-2" />
        {{ t('settings.save') }}
      </Button>
    </div>
  </div>
</template>
