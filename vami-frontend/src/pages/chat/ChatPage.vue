<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import { useAuthStore } from "../../store/auth.store.js";
import { useChatStore } from "../../store/chat.store.js";
import { useChatUI } from "../../hooks/useChatUI.js";

// Components
import ChatLayout from "../../components/chat/layout/ChatLayout.vue";
import ChatSidebar from "../../components/chat/LeftSidebar/ChatSidebar.vue";
import ChatWindow from "../../components/chat/ChatWindow.vue";
// import SharedMediaPanel from "../../components/chat/RightSidebar/SharedMediaPanel.vue"; // Create this later

const authStore = useAuthStore();
const chatStore = useChatStore();
const chatUI = useChatUI();

onMounted(async () => {
  if (authStore.token) {
    chatStore.initializeSocket(authStore.token);
  }
  await chatStore.loadConversations();
});

onBeforeUnmount(() => {
  chatStore.disconnectSocket();
});
</script>

<template>
  <ChatLayout
    :show-sidebar="chatUI.showSidebar.value"
    :show-chat="chatUI.showChatWindow.value"
    :show-info="chatUI.isInfoPanelOpen.value"
    @close-chat="chatUI.closeActiveChat"
    @close-info="chatUI.closeInfoPanel"
  >
    <template #sidebar>
      <ChatSidebar />
    </template>

    <template #chat>
      <ChatWindow
        v-if="chatStore.activeChat"
        @toggle-info="chatUI.toggleInfoPanel"
        @back="chatUI.closeActiveChat"
      />

      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 border-b-8 border-indigo-500"
      >
        <div class="bg-gray-100 p-6 rounded-full mb-4">
          <svg
            class="w-16 h-16 text-gray-300"
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
        </div>
        <h3 class="text-2xl font-bold text-gray-700">Vami for Web</h3>
        <p class="text-sm mt-2 text-gray-500 max-w-xs text-center">
          Send and receive messages without keeping your phone online.
        </p>
      </div>
    </template>

    <template #info>
      <div class="p-8 text-center text-gray-500 mt-10">
        <p>Shared Media & Info Panel</p>
        <p class="text-xs mt-2 text-gray-400">(Coming Soon)</p>
      </div>
    </template>
  </ChatLayout>
</template>
