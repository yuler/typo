<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const appVersion = __APP_VERSION__
</script>

<template>
  <Badge variant="outline" class="text-[10px] font-normal text-muted-foreground/60 px-1.5 py-0">
    v{{ appVersion }}
  </Badge>
</template>
