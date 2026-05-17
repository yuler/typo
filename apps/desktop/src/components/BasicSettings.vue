<script setup lang="ts">
import type { UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { RotateCcwIcon, SaveIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/logger'
import { setupGlobalShortcut, unregisterCurrentGlobalShortcut } from '@/shortcut'
import { DEFAULT_GLOBAL_SHORTCUT } from '@/stores/settings'
import * as store from '@/stores/settings'
import { updateTrayMenu } from '@/tray'
import { toast } from 'vue-sonner'
import { formatShortcut } from '@/utils'

const { t } = useI18n()
const isMacOS = ref(false)
const isCapturingShortcut = ref(false)
const shortcutConflictError = ref('')
const captureButtonEl = ref<HTMLElement | null>(null)
const pressedCaptureKeys = new Set<string>()
const recordedCaptureKeys = new Set<string>()

const form = ref({
  autostart: false,
  autoselect: false,
  copy_result: false,
  global_shortcut: '',
})

let unlistenAutostart: UnlistenFn | undefined
let isMounted = true

async function openLogFolder(): Promise<void> {
  try {
    await invoke('open_log_folder')
  }
  catch (err) {
    logger.error('BasicSettings', 'failed to open log folder:', err)
  }
}

function normalizeCaptureKey(e: KeyboardEvent): string {
  const code = e.code
  if (/^Key[A-Z]$/.test(code))
    return code.slice(3).toUpperCase()
  if (/^Digit\d$/.test(code))
    return code.slice(5)
  if (/^F\d+$/.test(code))
    return code

  const keyByCode: Record<string, string> = {
    Space: 'Space',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  }
  if (keyByCode[code])
    return keyByCode[code]

  if (e.key === ' ')
    return 'Space'
  if (e.key.length === 1)
    return e.key.toUpperCase()
  return e.key
}

function buildCapturedShortcut(keys: Set<string>): string {
  const keyList = [...keys]
  const hasCtrlOrMeta = keyList.includes('Control') || keyList.includes('Meta')
  const hasAlt = keyList.includes('Alt')
  const hasShift = keyList.includes('Shift')

  const mainKey = keyList.find(k => !['Control', 'Meta', 'Alt', 'Shift', 'CapsLock'].includes(k))
  if (!mainKey)
    return ''

  const modifiers: string[] = []
  if (hasCtrlOrMeta)
    modifiers.push('CommandOrControl')
  if (hasAlt)
    modifiers.push('Alt')
  if (hasShift)
    modifiers.push('Shift')

  if (modifiers.length === 0)
    return ''

  return [...modifiers, mainKey].join('+')
}

async function startCapture() {
  await unregisterCurrentGlobalShortcut()
  isCapturingShortcut.value = true
  shortcutConflictError.value = ''
  pressedCaptureKeys.clear()
  recordedCaptureKeys.clear()
  window.addEventListener('keydown', onShortcutKeyDown)
  window.addEventListener('keyup', onShortcutKeyUp)
  window.addEventListener('blur', onCaptureWindowBlur)
  window.addEventListener('pointerdown', onCapturePointerDown, true)
}

function stopCapture() {
  if (!isCapturingShortcut.value)
    return

  isCapturingShortcut.value = false
  window.removeEventListener('keydown', onShortcutKeyDown)
  window.removeEventListener('keyup', onShortcutKeyUp)
  window.removeEventListener('blur', onCaptureWindowBlur)
  window.removeEventListener('pointerdown', onCapturePointerDown, true)
  pressedCaptureKeys.clear()
  recordedCaptureKeys.clear()
}

function onCaptureWindowBlur() {
  stopCapture()
}

function onCapturePointerDown(e: PointerEvent) {
  const target = e.target
  if (!(target instanceof Node))
    return

  if (captureButtonEl.value?.contains(target))
    return

  stopCapture()
}

function onShortcutKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (e.repeat)
    return

  if (e.key === 'Escape') {
    stopCapture()
    return
  }
  const normalizedKey = normalizeCaptureKey(e)
  pressedCaptureKeys.add(normalizedKey)
  recordedCaptureKeys.add(normalizedKey)
}

function onShortcutKeyUp(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()
  const normalizedKey = normalizeCaptureKey(e)
  pressedCaptureKeys.delete(normalizedKey)

  if (pressedCaptureKeys.size !== 0 || recordedCaptureKeys.size === 0)
    return

  const captured = buildCapturedShortcut(recordedCaptureKeys)
  if (!captured) {
    shortcutConflictError.value = t('settings.basic.shortcut.error_modifier')
    recordedCaptureKeys.clear()
    return
  }

  shortcutConflictError.value = ''
  form.value.global_shortcut = captured
  stopCapture()
}

onMounted(async () => {
  const autostartEnabled = await invoke<boolean>('is_autostart_enabled')
  if (!isMounted)
    return
  form.value.autostart = autostartEnabled

  const [autoselect, copyResult, globalShortcut] = await Promise.all([
    store.get('autoselect'),
    store.get('copy_result'),
    store.get('global_shortcut'),
  ])
  if (!isMounted)
    return
  form.value.autoselect = autoselect
  form.value.copy_result = copyResult
  form.value.global_shortcut = globalShortcut || DEFAULT_GLOBAL_SHORTCUT

  const systemInfo = await invoke<{ os: string, is_wayland: boolean }>('get_system_info')
  if (!isMounted)
    return
  isMacOS.value = systemInfo.os === 'macos'

  const unlisten = await listen<boolean>('autostart-changed', (event) => {
    form.value.autostart = event.payload
  })

  if (!isMounted) {
    unlisten()
  }
  else {
    unlistenAutostart = unlisten
  }
})

onUnmounted(() => {
  isMounted = false
  if (isCapturingShortcut.value) {
    stopCapture()
  }
  unlistenAutostart?.()
})

async function onAutostartToggle(value: boolean) {
  form.value.autostart = value
  try {
    await invoke('set_autostart', { enabled: value })
    await updateTrayMenu()
  }
  catch (error) {
    logger.error('BasicSettings', 'Failed to update autostart setting:', error)
    form.value.autostart = !value
  }
}

async function onSubmit() {
  const requestedShortcut = form.value.global_shortcut
  const actualShortcut = await setupGlobalShortcut(requestedShortcut)

  if (requestedShortcut && actualShortcut !== requestedShortcut) {
    shortcutConflictError.value = t('settings.basic.shortcut.conflict', { shortcut: actualShortcut })
    form.value.global_shortcut = actualShortcut
  }

  await Promise.all([
    store.set('autoselect', form.value.autoselect),
    store.set('copy_result', form.value.copy_result),
    store.set('global_shortcut', actualShortcut),
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
          {{ t('main.nav.settings') }}
        </h1>

        <div class="space-y-6">
          <!-- Shortcut Card -->
          <div class="rounded-xl border bg-card p-6 shadow-sm">
            <div class="space-y-4">
              <div class="space-y-1">
                <Label for="global_shortcut" class="text-base font-semibold">{{ t('settings.basic.shortcut.label') }}</Label>
                <p class="text-sm text-muted-foreground">
                  {{ isCapturingShortcut ? t('settings.basic.shortcut.capturing_hint') : t('settings.basic.shortcut.hint') }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  ref="captureButtonEl"
                  type="button"
                  variant="outline"
                  class="flex-1 justify-start font-mono h-12 text-base"
                  :class="{ 'border-primary ring-2 ring-primary bg-primary/5': isCapturingShortcut }"
                  @click="isCapturingShortcut ? stopCapture() : startCapture()"
                >
                  {{
                    isCapturingShortcut
                      ? t('settings.basic.shortcut.listening')
                      : formatShortcut(form.global_shortcut, isMacOS)
                  }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-12 w-12"
                  @click="form.global_shortcut = DEFAULT_GLOBAL_SHORTCUT"
                >
                  <RotateCcwIcon class="h-5 w-5" />
                </Button>
              </div>
              <p v-if="shortcutConflictError" class="text-xs font-medium text-destructive animate-pulse">
                {{ shortcutConflictError }}
              </p>
            </div>
          </div>

          <!-- Behavior Card -->
          <div class="rounded-xl border bg-card p-6 shadow-sm">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label class="text-base font-semibold">{{ t('settings.basic.autostart.label') }}</Label>
                  <p class="text-sm text-muted-foreground">
                    {{ t('settings.basic.autostart.description') }}
                  </p>
                </div>
                <Switch id="autostart" :model-value="form.autostart" @update:model-value="onAutostartToggle" />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label class="text-base font-semibold">{{ t('settings.basic.autoselect.label') }}</Label>
                  <p class="text-sm text-muted-foreground">
                    {{ t('settings.basic.autoselect.description', { shortcut: isMacOS ? '⌘ + A' : 'Ctrl + A' }) }}
                  </p>
                </div>
                <Switch id="autoselect" v-model="form.autoselect" />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label class="text-base font-semibold">{{ t('settings.basic.copy_result.label') }}</Label>
                  <p class="text-sm text-muted-foreground">
                    {{ t('settings.basic.copy_result.description') }}
                  </p>
                </div>
                <Switch id="copy_result" v-model="form.copy_result" />
              </div>
            </div>
          </div>

          <!-- Logs Card -->
          <div class="rounded-xl border bg-card p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label class="text-base font-semibold">{{ t('settings.basic.logs.label') }}</Label>
                <p class="text-sm text-muted-foreground">
                  {{ t('settings.basic.logs.description') }}
                </p>
              </div>
              <Button type="button" variant="outline" @click="openLogFolder">
                {{ t('settings.basic.logs.open_button') }}
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
