<script setup>
// Icons
import { BubbleChatAddIcon, MoreVerticalSquare01Icon } from "hugeicons-vue";

// Components
import SidebarPanelLayout from "../../layout/SidebarPanelLayout.vue";
import UserSearch from "../UserSearch.vue";
import FilterChip from "../FilterChip.vue";
import ChatListItem from "../ChatListItem.vue";

// Config
import { MAIN_MENU_ACTIONS } from "../config/sidebar.config.js";

// Stores & hooks
import { useChatStore } from "../../../../store/chat.store.js";
import { useAuthStore } from "../../../../store/auth.store.js";
import { useSidebar } from "../../../../hooks/useSidebar.js";

// UI Imports - [Molecules]
import DropdownMenu from "../../../ui/molecules/DropdownMenu.vue";

// UI Imports - [Atoms]
import Button from "../../../ui/atoms/Button.vue";
import Tooltip from "../../../ui/atoms/Tooltip.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();
const { navigateTo, SIDEBAR_VIEWS } = useSidebar();

const handleMenuSelect = (action) => {
  if (action === "logout") authStore.logout();
  // Add other cases here
};

const handleNewChatClick = () => {
  navigateTo(SIDEBAR_VIEWS.NEW_CHAT);
};
</script>

<template>
  <SidebarPanelLayout
    title="Chats"
    :showBackButton="false"
    headerTextClass="text-gray-800"
    mainBgClass="bg-white"
  >
    <template #header-actions>
      <div class="flex gap-1 text-gray-600">
        <Tooltip text="New Chat Ctrl+Alt+N" position="bottom">
          <Button
            :variant="'ghost'"
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
              <Button :variant="'ghost'" :iconOnly="true">
                <MoreVerticalSquare01Icon :size="22" />
              </Button>
            </Tooltip>
          </template>
        </DropdownMenu>
      </div>
    </template>

    <template #subheader>
      <UserSearch />
      <FilterChip />
    </template>

    <div v-if="chatStore.isLoadingChats" class="p-8 text-center text-gray-400">
      <span class="animate-pulse">Loading...</span>
    </div>

    <ul v-else class="divide-y divide-gray-50">
      <ChatListItem
        v-for="chat in chatStore.conversations"
        :key="chat._id"
        :chat="chat"
        :isActive="chatStore.activeChat?._id === chat._id"
        :currentUserId="authStore.user?._id"
        :onlineUsers="chatStore.onlineUsers"
        @select="chatStore.setActiveChat(chat)"
      />
    </ul>
  </SidebarPanelLayout>
</template>
