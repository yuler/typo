<script setup lang="ts">
import WeChatComposer from './WeChatComposer.vue'

defineProps<{
  title?: string
  composerText: string
  showCursor?: boolean
  showSelection?: boolean
  composerHighlight?: boolean
}>()

interface ChatItem {
  name: string
  preview: string
  time: string
  avatar: string
  active?: boolean
  muted?: boolean
}

const chatList: ChatItem[] = [
  { name: '#old-nicetuan (7)', preview: '南河: 群接龙—每位朋友都会看到您接龙', time: '14:27', active: true, avatar: 'hash' },
  { name: '南河', preview: '群接龙—每位朋友都会看到您接龙', time: '14:27', avatar: 'blue' },
  { name: 'Annual Fee', preview: '546754049@chatroom: Annual Fee', time: '14:26', avatar: 'orange', muted: true },
  { name: '马帮VIP服务群', preview: '[@所有人] 老板你好，我是马帮客服...', time: '14:25', avatar: 'group' },
  { name: '文件传输助手', preview: '[文件] report.pdf', time: '14:20', avatar: 'folder' },
  { name: '产品群', preview: '[图片]', time: '13:58', avatar: 'group' },
  { name: '李华', preview: '收到，我看看', time: 'Yesterday', avatar: 'green' },
  { name: '张三', preview: 'PDF 我发你了', time: 'Yesterday', avatar: 'purple' },
]

const avatarColors: Record<string, string> = {
  blue: 'bg-[#6b9bd1]',
  green: 'bg-[#7bc47f]',
  orange: 'bg-[#e8a04c]',
  purple: 'bg-[#9b8fd4]',
  group: 'bg-[#8fb4d9]',
  folder: 'bg-[#07c160]',
  hash: 'bg-[#5c9ce6]',
}
</script>

<template>
  <div
    id="scene-wechat"
    class="clip relative z-5 flex h-[740px] w-[1180px] flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5"
    data-start="0"
    data-duration="14.5"
    data-track-index="2"
  >
    <!-- macOS title bar -->
    <div class="flex h-7 shrink-0 items-center bg-[#ebebeb] px-3">
      <div class="flex shrink-0 gap-2">
        <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span class="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
    </div>

    <div class="flex min-h-0 flex-1">
      <!-- Left sidebar -->
      <aside class="flex w-[54px] shrink-0 flex-col items-center bg-[#e3e3e3] py-3">
        <div class="mb-5 h-9 w-9 shrink-0 overflow-hidden rounded-[4px]">
          <div class="h-full w-full bg-[linear-gradient(135deg,#8ecae6_0%,#219ebc_100%)]" />
        </div>
        <nav class="flex flex-1 flex-col items-center gap-5 text-[#888]">
          <svg class="h-[22px] w-[22px] fill-[#07c160] stroke-none" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3C7.03 3 3 6.58 3 11c0 2.03.9 3.86 2.36 5.24L4 21l4.98-1.18A9.8 9.8 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            <path d="M8 12c0-2.2 1.8-4 4-4" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16 16l5 5" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </nav>
        <div class="mt-auto flex flex-col items-center gap-5 text-[#888]">
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
          <svg class="h-[22px] w-[22px] stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </div>
      </aside>

      <!-- Chat list -->
      <div class="flex w-[280px] shrink-0 flex-col border-r border-[#d9d9d9] bg-[#f5f5f5]">
        <div class="flex shrink-0 items-center gap-2 px-3 py-2.5">
          <div class="flex h-7 flex-1 items-center gap-2 rounded-[4px] bg-[#e3e3e3] px-2.5 text-[13px] text-[#999]">
            <svg class="h-3.5 w-3.5 shrink-0 stroke-current fill-none stroke-2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16 16l5 5" />
            </svg>
            Search
          </div>
          <button type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#e3e3e3] text-[#666]">
            <svg class="h-4 w-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <div
            v-for="chat in chatList"
            :key="chat.name"
            class="flex items-center gap-2.5 px-3 py-2.5"
            :class="chat.active ? 'bg-[#07c160] text-white' : 'text-[#191919]'"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] text-[11px] font-medium text-white"
              :class="chat.active ? 'bg-white/25' : avatarColors[chat.avatar]"
            >
              <span v-if="chat.avatar === 'hash'">#</span>
              <span v-else>{{ chat.name.slice(0, 1) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div
                class="truncate text-[14px] leading-tight font-medium"
                :class="chat.active ? 'text-white' : 'text-[#191919]'"
              >
                {{ chat.name }}
              </div>
              <div
                class="truncate text-[12px] leading-tight"
                :class="chat.active ? 'text-white/80' : 'text-[#999]'"
              >
                {{ chat.preview }}
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <span
                class="text-[11px]"
                :class="chat.active ? 'text-white/85' : 'text-[#999]'"
              >{{ chat.time }}</span>
              <span
                v-if="chat.muted"
                class="text-[10px] text-[#b3b3b3]"
              >🔕</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat panel -->
      <div class="flex min-w-0 flex-1 flex-col bg-white">
        <div class="flex h-12 shrink-0 items-center justify-between border-b border-[#e7e7e7] px-4">
          <div class="truncate text-[15px] font-medium text-[#191919]">
            {{ title ?? '#old-nicetuan (7)' }}
          </div>
          <div class="flex shrink-0 items-center gap-3 text-[#666]">
            <svg class="h-[18px] w-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <svg class="h-[18px] w-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17v5" />
              <path d="M9 3h6l1 7H8L9 3z" />
              <path d="M8 10v4a4 4 0 0 0 8 0v-4" />
            </svg>
            <svg class="h-[18px] w-[18px] stroke-current fill-none stroke-[1.6]" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </div>
        </div>

        <!-- Message history -->
        <div class="wechat-chat relative min-h-0 flex-1 overflow-hidden bg-[#f5f5f5]">
          <div class="absolute top-0 right-1 bottom-0 w-1.5">
            <div class="mx-auto mt-3 h-24 w-1 rounded-full bg-[#c8c8c8]" />
          </div>

          <div class="flex flex-col gap-4 px-4 py-4 pr-6">
            <!-- incoming map card -->
            <div class="flex items-start gap-2.5">
              <div class="h-9 w-9 shrink-0 rounded-[4px] bg-[#6b9bd1]" />
              <div class="max-w-[360px] overflow-hidden rounded-[6px] border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div class="h-[120px] bg-[linear-gradient(180deg,#d8ecff_0%,#f0f6fb_55%,#e8f0ea_100%)]">
                  <div class="flex h-full items-center justify-center">
                    <div class="rounded-full bg-[#07c160] px-2 py-1 text-[11px] text-white shadow-sm">
                      📍 位置
                    </div>
                  </div>
                </div>
                <div class="border-t border-[#efefef] px-3 py-2 text-[13px] text-[#191919]">
                  北京市朝阳区
                </div>
              </div>
            </div>

            <!-- incoming link card -->
            <div class="flex items-start gap-2.5">
              <div class="h-9 w-9 shrink-0 rounded-[4px] bg-[#6b9bd1]" />
              <div class="max-w-[360px] overflow-hidden rounded-[6px] border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div class="border-b border-[#efefef] px-3 py-2.5 text-[14px] leading-snug text-[#191919]">
                  群接龙—每位朋友都会看到您接龙
                </div>
                <div class="flex items-center gap-2 px-3 py-2 text-[12px] text-[#999]">
                  <span class="inline-flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#07c160] text-[9px] text-white">链</span>
                  小程序
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <div class="h-[196px] shrink-0 border-t border-[#e5e5e5] bg-white">
          <WeChatComposer
            :text="composerText"
            :show-cursor="showCursor"
            :show-selection="showSelection"
            :highlight="composerHighlight"
          />
        </div>
      </div>
    </div>
  </div>
</template>
