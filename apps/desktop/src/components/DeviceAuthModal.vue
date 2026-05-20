<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/composables/useAuth'
import { sleep } from '@/utils'

const { authStatus, deviceCode, cancel } = useAuth()

const isOpen = computed({
  get: () => authStatus.value === 'authorizing',
  set: (val) => {
    if (!val)
      cancel()
  },
})

const copied = ref(false)
let copyCount = 0

async function copyLink() {
  if (deviceCode.value) {
    try {
      await navigator.clipboard.writeText(deviceCode.value.verification_uri)
      copied.value = true
      const currentCount = ++copyCount
      await sleep(2000)
      if (currentCount === copyCount) {
        copied.value = false
      }
    }
    catch (err) {
      console.error('Failed to copy link:', err)
    }
  }
}

async function openBrowser() {
  if (deviceCode.value) {
    await openUrl(deviceCode.value.verification_uri)
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent
      class="sm:max-w-xl"
      @interact-outside="(e) => e.preventDefault()"
      @pointer-down-outside="(e) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle class="text-xl">
          Authorize Device
        </DialogTitle>
        <DialogDescription class="text-base">
          Please enter the code below on your other device to log in.
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col items-center justify-center py-8 space-y-6">
        <div v-if="deviceCode" class="bg-muted/50 border-2 border-dashed border-primary/30 rounded-2xl px-16 py-8 text-5xl font-mono font-bold tracking-[0.25em] text-primary shadow-sm">
          {{ deviceCode.user_code }}
        </div>

        <div v-if="deviceCode" class="flex flex-col items-center gap-1.5 w-full text-center">
          <div class="flex items-center gap-1.5 justify-center max-w-full px-4">
            <span class="font-mono text-xs text-muted-foreground truncate select-all">
              {{ deviceCode.verification_uri }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md hover:bg-accent/40"
              title="Copy link"
              @click="copyLink"
            >
              <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-500 animate-in fade-in zoom-in-50 duration-200" />
              <Copy v-else class="h-3.5 w-3.5 transition-transform active:scale-95 duration-200" />
            </Button>
          </div>
        </div>

        <div class="flex items-center gap-2 text-base text-muted-foreground">
          <Loader2 class="h-5 w-5 animate-spin text-primary" />
          Waiting for authorization...
        </div>
      </div>

      <DialogFooter class="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" class="text-muted-foreground" @click="cancel">
          Cancel
        </Button>
        <Button v-if="deviceCode" variant="default" class="gap-2 px-6" @click="openBrowser">
          <ExternalLink class="h-4 w-4" />
          Open Browser
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
