<script setup>
// local imports
import { useChatStore } from "../../../store/chat.store.js";
import { useAuthStore } from "../../../store/auth.store.js";
import UserSearch from "./UserSearch.vue";
import ChatListItem from "./ChatListItem.vue";
import FilterChip from "./FilterChip.vue";
import {
  Archive02Icon,
  BubbleChatAddIcon,
  CheckListIcon,
  Logout01Icon,
  MoreVerticalSquare01Icon,
  Settings01Icon,
  StarIcon,
  UserGroupIcon,
} from "hugeicons-vue";

// UI Imports - [Molecules]
import DropdownMenu from "../../ui/molecules/DropdownMenu.vue";
import { useRouter } from "vue-router";

const chatStore = useChatStore();
const authStore = useAuthStore();

// initialze router for navigation
const router = useRouter();

// menu actions for the three-dot icon in the header
const menuActions = [
  { label: "New group", icon: UserGroupIcon, action: "create_group" },
  { label: "Archived", icon: Archive02Icon, action: "view_archived" },
  { label: "Starred messages", icon: StarIcon, action: "view_starred" },
  { separator: true }, // The divider
  { label: "Select chats", icon: CheckListIcon, action: "select_chats" },
  { label: "Settings", icon: Settings01Icon, action: "settings" },
  { separator: true },
  { label: "Log out", icon: Logout01Icon, action: "logout", danger: true },
];

const handleMenuSelect = (action) => {
  console.log("Menu Action:", action);

  switch (action) {
    case "logout":
      authStore.logout();
      if(!authStore.isAuthenticated) {
        router.push("/login");
      }
      break;
    case "create_group":
      // openGroupModal.value = true;
      break;
    // ... handle others
  }
};

const selectChat = (chat) => {
  if (chatStore.activeChat?._id === chat?._id) return;
  chatStore.setActiveChat(chat);
};
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <!-- Header -->
    <div class="p-4 flex justify-between items-center bg-white">
      <h2 class="text-xl font-bold text-gray-800 tracking-tight">Vami</h2>

      <div class="flex gap-3 items-center">
        <BubbleChatAddIcon :size="20" class="cursor-pointer" />

        <DropdownMenu
          :items="menuActions"
          position="bottom-right"
          @select="handleMenuSelect"
        >
          <template #trigger="{ isOpen }">
            <div
              class="p-2 rounded-full cursor-pointer transition-colors duration-200"
              :class="
                isOpen
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-gray-100 text-gray-600'
              "
            >
              <MoreVerticalSquare01Icon :size="20" class="font-bold" />
            </div>
          </template>
        </DropdownMenu>
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
