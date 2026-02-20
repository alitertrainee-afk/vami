<script setup>
import { toRefs } from "vue";
import MessageBubble from "./MessageBubble.vue"; // Adjust path if needed
import { useChatScroll } from "../../../hooks/useChatScroll.js";

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  hasNext: {
    type: Boolean,
    default: false,
  },
  currentUserId: {
    type: String,
    required: true,
  },
  loadMore: {
    type: Function,
    required: true,
  },
});

// We use `toRefs` to ensure we don't lose Vue's reactivity
// when passing these props down into our custom composable.
const { messages, hasNext } = toRefs(props);

// Attach our highly optimized scroll logic
const { messagesContainer } = useChatScroll({
  messages,
  hasNext,
  loadMore: props.loadMore,
});

// Calculate if the current user sent the message
const isMe = (senderId) => {
  const id = typeof senderId === "object" ? senderId?._id : senderId;
  return id === props.currentUserId;
};
</script>

<template>
  <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-4">
    <div v-if="isLoading" class="flex justify-center p-4 transition-all">
      <div
        class="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-indigo-50"
      >
        <span class="animate-pulse text-indigo-500 font-semibold text-sm">
          Loading older messages...
        </span>
      </div>
    </div>

    <MessageBubble
      v-for="msg in messages"
      :key="msg?._id"
      :content="msg?.content"
      :timestamp="msg?.createdAt"
      :is-me="isMe(msg?.sender?._id || msg?.sender)"
    />
  </div>
</template>
