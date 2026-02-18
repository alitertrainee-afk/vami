<script setup>
// local imports
import { useChatStore } from "../../../store/chat.store.js";
import { useAuthStore } from "../../../store/auth.store.js";
import UserSearch from "./UserSearch.vue";
import ChatListItem from "./ChatListItem.vue";
import FilterChip from "./FilterChip.vue";

// UI Imports - [Atoms]
import { BubbleChatAddIcon, MoreVerticalSquare01Icon } from "hugeicons-vue";

const chatStore = useChatStore();
const authStore = useAuthStore();

const selectChat = (chat) => {
  if (chatStore.activeChat?._id === chat?._id) return;
  chatStore.setActiveChat(chat);
};
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <!-- Header -->
    <div class="p-4 flex justify-between items-center bg-white">
      <h2 class="text-xl font-bold text-gray-800 tracking-tight">Vami </h2>

      <div class="flex gap-3 items-center">
        <BubbleChatAddIcon
          :size="20"
          class="cursor-pointer "
        />
        <MoreVerticalSquare01Icon :size="20" class="cursor-pointer font-bold" />
      </div>
    </div>

    <!-- Filters -->
    <div>
      <FilterChip />
    </div>

    <!-- Search -->
    <div class="bg-white">
      <UserSearch />
    </div>

    <!-- Chat List -->
    <div class="flex-1 overflow-y-auto bg-white">
      <div
        v-if="chatStore.isLoadingChats"
        class="p-4 text-center text-gray-400 text-sm"
      >
        <span class="animate-pulse"> Loading conversations... </span>
      </div>

      <ul v-else class="divide-y divide-gray-100">
        <ChatListItem
          v-for="chat in chatStore?.conversations"
          :key="chat?._id"
          :chat="chat"
          :is-active="chatStore?.activeChat?._id === chat?._id"
          :current-user-id="authStore.user?._id"
          :online-users="chatStore?.onlineUsers"
          @select="selectChat"
        />
      </ul>

      <div
        v-if="!chatStore.isLoadingChats && chatStore.conversations.length === 0"
        class="p-8 text-center text-gray-400 text-sm"
      >
        No chats yet. Search for a user above to start messaging!
      </div>
    </div>
  </div>
</template>
