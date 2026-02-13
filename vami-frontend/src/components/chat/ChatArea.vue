<!-- <script setup>
// libs imports
import { ref, watch, nextTick, computed } from "vue";

// local imports
import { useChatStore } from "../../store/chat.store.js";
import { useAuthStore } from "../../store/auth.store.js";

const chatStore = useChatStore();
const authStore = useAuthStore();

const messageInput = ref("");
const messagesContainer = ref(null);

// Performance / UX: Scroll to bottom strictly after DOM updates
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Watch for changes in messages array AND active chat changes to trigger scroll
watch(
  () => chatStore.messages.length,
  () => scrollToBottom(),
);

watch(
  () => chatStore.activeChat,
  () => scrollToBottom(),
);

const handleSend = () => {
  if (!messageInput.value.trim()) return;
  chatStore.sendMessage(messageInput.value);
  messageInput.value = "";
  // Focus stays on input naturally
};

const isMe = (senderId) => {
  // Defensive check in case sender is an object (populated) or just an ID string
  const id = typeof senderId === "object" ? senderId._id : senderId;
  return id === authStore.user?._id;
};
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <div class="px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
      <h3 class="text-lg font-bold text-gray-800">
        <span v-if="chatStore.activeChat.isGroupChat">{{
          chatStore.activeChat.chatName
        }}</span>
        <span v-else>Conversation</span>
      </h3>
    </div>

    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
    >
      <div v-if="chatStore.isLoadingMessages" class="flex justify-center p-4">
        <span class="animate-pulse text-indigo-500 font-semibold"
          >Loading messages...</span
        >
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg._id"
        :class="['flex', isMe(msg.sender) ? 'justify-end' : 'justify-start']"
      >
        <div
          :class="[
            'max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm',
            isMe(msg.sender)
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none',
          ]"
        >
          <p class="leading-relaxed">{{ msg.content }}</p>
          <span
            :class="[
              'text-[10px] block mt-1 text-right',
              isMe(msg.sender) ? 'text-indigo-200' : 'text-gray-400',
            ]"
          >
            {{
              new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}
          </span>
        </div>
      </div>
    </div>

    <div class="p-4 bg-white border-t border-gray-200">
      <form @submit.prevent="handleSend" class="flex items-end space-x-2">
        <div
          class="flex-1 bg-gray-100 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
        >
          <textarea
            v-model="messageInput"
            @keydown.enter.prevent="handleSend"
            rows="1"
            placeholder="Type a message..."
            class="w-full bg-transparent border-none focus:ring-0 py-3 px-4 resize-none outline-none text-sm max-h-32 overflow-y-auto rounded-2xl"
          ></textarea>
        </div>
        <button
          type="submit"
          :disabled="!messageInput.trim()"
          class="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg
            class="w-5 h-5 transform rotate-45 -mt-1 -ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            ></path>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template> -->

<script setup>
import { ref, watch, nextTick } from "vue";
import { useChatStore } from "../../store/chat.store.js";
import { useAuthStore } from "../../store/auth.store.js";
import MessageBubble from "./MessageBubble.vue";
import MessageComposer from "./MessageComposer.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const messagesContainer = ref(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(
  [() => chatStore.messages.length, () => chatStore.activeChat],
  scrollToBottom,
);

const handleSend = (text) => {
  chatStore.sendMessage(text);
};

const isMe = (senderId) => {
  const id = typeof senderId === "object" ? senderId?._id : senderId;
  return id === authStore.user?._id;
};
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <div class="px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
      <h3 class="text-lg font-bold text-gray-800">
        {{
          chatStore.activeChat.isGroupChat
            ? chatStore.activeChat.chatName
            : "Conversation"
        }}
      </h3>
    </div>

    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
    >
      <div v-if="chatStore.isLoadingMessages" class="flex justify-center p-4">
        <span class="animate-pulse text-indigo-500 font-semibold"
          >Loading messages...</span
        >
      </div>
      {{ console.log("Hello", chatStore.messages, authStore.user?._id) }}
      <MessageBubble
        v-for="msg in chatStore.messages"
        :key="msg?._id"
        :content="msg?.content"
        :timestamp="msg?.createdAt"
        :is-me="isMe(msg?.sender?._id)"
      />
    </div>

    <MessageComposer @send="handleSend" />
  </div>
</template>
