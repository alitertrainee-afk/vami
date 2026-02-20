<script setup>
import { computed } from "vue";

const props = defineProps({
  content: { type: String, required: true },
  timestamp: { type: [String, Date], required: true },
  isMe: { type: Boolean, required: true },
});

const formattedTime = computed(() => {
  return new Date(props.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
});
</script>

<template>
  <div :class="['flex w-full', isMe ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[75%] px-4 py-2 shadow-sm text-sm flex flex-col',
        isMe
          ? 'bg-indigo-600 text-white rounded-2xl rounded-br-none'
          : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none',
      ]"
    >
      <p class="leading-relaxed break-words">{{ content }}</p>
      <span
        :class="[
          'text-[10px] mt-1 text-right block',
          isMe ? 'text-indigo-200' : 'text-gray-400',
        ]"
      >
        {{ formattedTime }}
      </span>
    </div>
  </div>
</template>
