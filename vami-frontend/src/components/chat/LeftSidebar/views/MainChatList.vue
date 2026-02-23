<script setup>
import { useRouter } from "vue-router";

// Icons
import { BubbleChatAddIcon, MoreVerticalSquare01Icon } from "hugeicons-vue";

// Components
import PanelLayout from "../../layout/PanelLayout.vue";
import UserSearch from "../UserSearch.vue";
import FilterChip from "../FilterChip.vue";
import NewChatPanel from "./NewChatPanel.vue";
import ChatListItem from "../ChatListItem.vue"; // <-- Import New Component
import UserListItem from "../UserListItem.vue"; // <-- Import New Component

// UI Imports
import DropdownMenu from "../../../ui/molecules/DropdownMenu.vue";
import Button from "../../../ui/atoms/Button.vue";
import Tooltip from "../../../ui/atoms/Tooltip.vue";

// Config & Hooks
import { MAIN_MENU_ACTIONS } from "../config/sidebar.config.js";
import { useChatStore } from "../../../../store/chat.store.js";
import { useAuthStore } from "../../../../store/auth.store.js";
import { usePanelManager } from "../../../../hooks/usePanelManager.js";

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();
const { openPanel } = usePanelManager();

// Handlers
const handleMenuSelect = (action) => {
  if (action === "logout") {
    authStore?.logout();
    router.push("/login");
  }
};

const handleNewChatClick = () => openPanel("left", NewChatPanel);

const handleUserClick = async (user) => {
  try {
    await chatStore.setActiveChatFromUser(user._id);
    chatStore.handleSearch("");
  } catch (error) {
    console.error("Failed to start chat from search:", error);
  }
};

const handleChatContextAction = ({ action, chat }) => {
  console.log(`Action: ${action} triggered for chat:`, chat?._id);
  // Add logic here: e.g., if (action === 'delete') chatStore.deleteChat(chat._id);
};
</script>

<template>
  <PanelLayout
    title="Chats"
    :showBackButton="false"
    headerTextClass="text-gray-800"
    mainBgClass="bg-white"
  >
    <template #header-actions>
      <div class="flex gap-1 text-gray-600">
        <Tooltip text="New Chat Ctrl+Alt+N" position="bottom">
          <Button
            variant="ghost"
            :iconOnly="true"
            @click="handleNewChatClick"
            title="New Chat"
          >
            <BubbleChatAddIcon :size="22" />
          </Button>
        </Tooltip>
        <DropdownMenu
          :items="MAIN_MENU_ACTIONS"
          position="bottom-right"
          @select="handleMenuSelect"
        >
          <template #trigger>
            <Tooltip text="Menu" position="bottom">
              <Button variant="ghost" :iconOnly="true">
                <MoreVerticalSquare01Icon :size="22" />
              </Button>
            </Tooltip>
          </template>
        </DropdownMenu>
      </div>
    </template>

    <template #subheader>
      <UserSearch />
      <FilterChip v-show="!chatStore.searchQuery" />
    </template>

    <div v-if="chatStore.isLoadingChats" class="p-8 text-center text-gray-400">
      <span class="animate-pulse">Loading...</span>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div v-if="chatStore.filteredConversations.length > 0">
        <div
          v-if="chatStore.searchQuery"
          class="px-4 py-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50"
        >
          Recent Chats
        </div>
        <ul class="divide-y divide-gray-50">
          <li v-for="chat in chatStore.filteredConversations" :key="chat?._id">
            <ChatListItem
              :chat="chat"
              :isActive="chatStore.activeChat?._id === chat._id"
              @click="chatStore.setActiveChat(chat)"
              @contextAction="handleChatContextAction"
            />
          </li>
        </ul>
      </div>

      <div v-if="chatStore.searchQuery && chatStore.searchResults.length > 0">
        <div
          class="px-4 py-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50"
        >
          Global Search Results
        </div>
        <ul class="divide-y divide-gray-50">
          <li v-for="user in chatStore.searchResults" :key="user._id">
            <UserListItem :user="user" @click="handleUserClick" />
          </li>
        </ul>
      </div>

      <div
        v-if="
          !chatStore.filteredConversations.length &&
          (!chatStore.searchQuery || !chatStore.searchResults.length)
        "
        class="p-8 text-center text-gray-500 flex flex-col items-center gap-2"
      >
        <span class="text-sm">No results found.</span>
        <Button
          v-if="!chatStore.searchQuery"
          variant="soft"
          size="sm"
          @click="handleNewChatClick"
        >
          Start a new chat
        </Button>
      </div>
    </div>
  </PanelLayout>
</template>
