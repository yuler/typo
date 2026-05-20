<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { ExternalLink, Loader2 } from 'lucide-vue-next'
import { computed } from 'vue'
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

const { authStatus, deviceCode, cancel } = useAuth()

const isOpen = computed({
  get: () => authStatus.value === 'authorizing',
  set: (val) => {
    if (!val)
      cancel()
  },
})

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
      <div class="flex flex-col items-center justify-center py-8 space-y-8">
        <div v-if="deviceCode" class="bg-muted/50 border-2 border-dashed border-primary/30 rounded-2xl px-16 py-8 text-5xl font-mono font-bold tracking-[0.25em] text-primary shadow-sm">
          {{ deviceCode.user_code }}
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
        <Button variant="default" class="gap-2 px-6" @click="openBrowser">
          <ExternalLink class="h-4 w-4" />
          Open Browser
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
