<script setup lang="ts">
import { ExternalLink, Loader2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(deviceCode.value.verification_uri)
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Authorize Device</DialogTitle>
        <DialogDescription>
          Please enter the code below on your other device to log in.
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col items-center justify-center py-6 space-y-6">
        <div v-if="deviceCode" class="bg-muted/50 border-2 border-dashed border-primary/20 rounded-xl px-8 py-4 text-3xl font-mono font-bold tracking-[0.2em] text-primary">
          {{ deviceCode.user_code }}
        </div>

        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin text-primary" />
          Waiting for authorization...
        </div>

        <div class="w-full space-y-2">
          <Button variant="outline" class="w-full gap-2" @click="openBrowser">
            <ExternalLink class="h-4 w-4" />
            Open Browser
          </Button>
          <Button variant="ghost" class="w-full text-muted-foreground" @click="cancel">
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
