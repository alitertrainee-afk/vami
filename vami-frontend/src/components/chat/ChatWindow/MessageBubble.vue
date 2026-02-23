<script setup>
import { TickDouble02Icon, Tick01Icon } from "hugeicons-vue";
import MessageContent from "./MessageContent.vue"; // Import the Dispatcher

const props = defineProps({
  message: { type: Object, required: true },
  isMe: { type: Boolean, required: true },
  isFirstInCluster: { type: Boolean, default: true },
});

// Helper for formatting the time in the corner of the bubble
const formattedTime = new Date(props.message.createdAt).toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
});

// Example check if message was read (replace with your actual data mapping)
const isRead = props.message.status === "read";
</script>

<template>
  <div
    :class="[
      'flex w-full',
      isMe ? 'justify-end' : 'justify-start',
      isFirstInCluster ? 'mt-3' : 'mt-1', // Extra spacing for new clusters
    ]"
  >
    <div
      :class="[
        // Layout
        'relative max-w-[85%] md:max-w-[75%] lg:max-w-[65%] flex flex-col',
        'px-2.5 py-1.5 shadow-sm',

        // Background
        isMe ? 'bg-[#d9fdd3]' : 'bg-white',

        // Border Radius Logic
        isFirstInCluster
          ? isMe
            ? 'rounded-l-lg rounded-br-lg rounded-tr-none'
            : 'rounded-r-lg rounded-bl-lg rounded-tl-none'
          : 'rounded-lg',
      ]"
    >
      <div
        v-if="!isMe && isFirstInCluster && message.senderName"
        class="text-[13px] font-medium text-indigo-500 mb-0.5 cursor-pointer hover:underline w-full truncate"
      >
        {{ message.senderName }}
      </div>

      <MessageContent :message="message" />

      <div
        class="flex items-center justify-end gap-1 mt-1 -mb-1 ml-4 float-right select-none"
      >
        <span class="text-[11px] text-gray-500 whitespace-nowrap">
          {{ formattedTime }}
        </span>

        <div v-if="isMe" class="shrink-0 -mr-0.5">
          <TickDouble02Icon v-if="isRead" :size="16" class="text-blue-500" />
          <Tick01Icon v-else :size="16" class="text-gray-400" />
        </div>
      </div>

      <div class="clear-both"></div>
    </div>
  </div>
</template>
