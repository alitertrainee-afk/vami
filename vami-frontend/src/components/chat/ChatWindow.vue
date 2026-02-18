<script setup>
// libs imports
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";

// local imports
import { useChatStore } from "../../store/chat.store.js";
import { useAuthStore } from "../../store/auth.store.js";

//
import MessageBubble from "./MessageBubble.vue";
import MessageComposer from "./MessageComposer.vue";
import { ArrowLeft01Icon, MoreVerticalSquare01Icon } from "hugeicons-vue";

const chatStore = useChatStore();
const authStore = useAuthStore();

const messagesContainer = ref(null);
let isFetchingMore = false;

const scrollToBottom = async () => {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const container = messagesContainer.value;
  if (!container) return;

  container.scrollTop = container.scrollHeight;
};

const loadOlderMessages = async () => {
  const container = messagesContainer.value;

  if (!container || isFetchingMore || !chatStore.pagination?.hasNext) return;

  isFetchingMore = true;

  const previousHeight = container.scrollHeight;

  const loaded = await chatStore.loadMoreMessages();
  if (!loaded) {
    isFetchingMore = false;
    return;
  }

  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const newHeight = container.scrollHeight;
  container.scrollTop = newHeight - previousHeight;

  isFetchingMore = false;
};

const handleScroll = () => {
  const container = messagesContainer.value;
  if (!container) return;

  if (container.scrollTop <= 100) {
    loadOlderMessages();
  }
};

onMounted(async () => {
  await nextTick();
  messagesContainer.value?.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  messagesContainer.value?.removeEventListener("scroll", handleScroll);
});

/* -------------------------------------------------
   WATCH MESSAGES FOR AUTO-SCROLL
------------------------------------------------- */
watch(
  () => chatStore.messages.length,
  async (newVal, oldVal) => {
    const container = messagesContainer.value;
    if (!container) return;

    // Initial load
    if (oldVal === 0 && newVal > 0) {
      await scrollToBottom();
      return;
    }

    // Only scroll if user is near bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      await scrollToBottom();
    }
  },
);

/* -------------------------------------------------
   SEND MESSAGE
------------------------------------------------- */
const handleSend = (text) => {
  chatStore.sendMessage(text);
};

const isMe = (senderId) => {
  const id = typeof senderId === "object" ? senderId?._id : senderId;
  console.log("🚀 ~ isMe ~ senderId:", senderId, id === authStore.user?._id);

  return id === authStore.user?._id;
};
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <div
      class="px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10 flex justify-between items-center"
    >
      <div class="flex items-center gap-3">
        <button
          @click="$emit('back')"
          class="lg:hidden p-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft01Icon :size="24" />
        </button>

        <div
          class="flex items-center gap-3 cursor-pointer"
          @click="$emit('toggle-info')"
        >
          <div
            class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold"
          >
            {{ chatStore.activeChat.chatName.charAt(0) }}
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-800 leading-tight">
              {{
                chatStore.activeChat.isGroupChat
                  ? chatStore.activeChat.chatName
                  : "Conversation"
              }}
            </h3>
            <p class="text-xs text-green-500 font-medium" v-if="true">Online</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          @click="$emit('toggle-info')"
          class="text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <MoreVerticalSquare01Icon :size="20" />
        </button>
      </div>
    </div>

    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-4">
      <div v-if="chatStore.isLoadingMessages" class="flex justify-center p-4">
        <span class="animate-pulse text-indigo-500 font-semibold">
          Loading messages...
        </span>
      </div>
      <MessageBubble
        v-for="msg in chatStore.messages"
        :key="msg?._id"
        :content="msg?.content"
        :timestamp="msg?.createdAt"
        :is-me="isMe(msg?.sender?._id || msg?.sender)"
        @before-render="logMessage(msg)"
      />
    </div>

    <MessageComposer @send="handleSend" />
  </div>
</template>
