<script setup>
// libs imports
import { onMounted, onBeforeUnmount } from "vue";

// local imports
import { useAuthStore } from "../../store/auth.store.js";
import { useChatStore } from "../../store/chat.store.js";

// Child Components (We will build these next)
import ChatArea from "../../components/chat/ChatArea.vue";
import ChatSidebar from "../../components/chat/ChatSidebar.vue";

const authStore = useAuthStore();
const chatStore = useChatStore();

// Strict Lifecycle Management
onMounted(async () => {
  // 1. Initialize WebSocket with JWT
  if (authStore.token) {
    chatStore.initializeSocket(authStore.token);
  }

  // 2. Fetch sidebar conversations via REST
  await chatStore.loadConversations();
});

onBeforeUnmount(() => {
  // CRITICAL: Prevent memory leaks and zombie connections
  chatStore.disconnectSocket();
});
</script>

<template>
  <div class="flex h-screen bg-gray-100 overflow-hidden">
    <aside
      class="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0"
    >
      <ChatSidebar />
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-gray-50">
      <ChatArea v-if="chatStore.activeChat" />

      <div
        v-else
        class="flex-1 flex items-center justify-center flex-col text-gray-400"
      >
        <svg
          class="w-20 h-20 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          ></path>
        </svg>
        <h3 class="text-xl font-medium text-gray-600">Welcome to Vami</h3>
        <p class="text-sm mt-1">Select a conversation to start messaging</p>
      </div>
    </main>
  </div>
</template>
