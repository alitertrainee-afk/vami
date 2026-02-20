<script setup>
import { useRouter } from "vue-router";

// Icons
import {
  BubbleChatAddIcon,
  MoreVerticalSquare01Icon,
  ArrowDown01Icon,
  TickDouble02Icon,
  Tick01Icon,
  NotificationOff02Icon,
  PinLocation02Icon,
  Archive02Icon,
  Delete02Icon,
  UserBlock01Icon,
} from "hugeicons-vue";

// Components
import PanelLayout from "../../layout/PanelLayout.vue";
import UserSearch from "../UserSearch.vue";
import FilterChip from "../FilterChip.vue";
import NewChatPanel from "./NewChatPanel.vue";

// UI Imports - [Molecules]
import DropdownMenu from "../../../ui/molecules/DropdownMenu.vue";
import BaseListItem from "../../../ui/molecules/BaseListItem.vue";

// UI Imports - [Atoms]
import Avatar from "../../../ui/atoms/Avatar.vue";
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

const handleNewChatClick = () => {
  openPanel("left", NewChatPanel);
};

// --- CHAT CONTEXT MENU ACTIONS ---
const CHAT_CONTEXT_ACTIONS = [
  { label: "Archive chat", icon: Archive02Icon, action: "archive" },
  { label: "Mute notifications", icon: NotificationOff02Icon, action: "mute" },
  { separator: true },
  { label: "Pin chat", icon: PinLocation02Icon, action: "pin" },
  { label: "Mark as unread", icon: TickDouble02Icon, action: "mark_unread" },
  { separator: true },
  { label: "Block", icon: UserBlock01Icon, action: "block", danger: true },
  { label: "Delete chat", icon: Delete02Icon, action: "delete", danger: true },
];

const handleChatContextAction = (action, chat) => {
  console.log(`Action: ${action} triggered for chat:`, chat?._id);
  // Add your chat store logic here later (e.g., chatStore.deleteChat(chat._id))
};

// --- SCALABLE HELPERS ---

const getChatDetails = (chat) => {
  if (chat?.isGroupChat) {
    return { name: chat.chatName, avatar: null, isOnline: false };
  }
  const otherUser = chat?.participants.find(
    (p) => p?._id !== authStore.user?._id,
  );
  return {
    name: otherUser?.username || "Unknown User",
    avatar: otherUser?.profile?.avatar,
    isOnline: chatStore.onlineUsers.has(otherUser?._id),
  };
};

const getFormattedTime = (chat) => {
  if (!chat?.latestMessage) return "";
  return new Date(chat?.latestMessage?.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLeftIndicators = (chat) => {
  const indicators = [];
  const latestMsg = chat?.latestMessage;
  const isMine = latestMsg?.sender === authStore.user?._id;

  if (isMine) {
    const isRead = latestMsg?.status === "read";
    indicators.push({
      id: "receipt",
      isIcon: true,
      component: isRead ? TickDouble02Icon : Tick01Icon,
      class: isRead ? "text-blue-500" : "text-gray-400",
    });
  }

  if (chat?.isMentioned) {
    indicators.push({
      id: "mention",
      isIcon: false,
      text: "@",
      class:
        "bg-gray-200 text-gray-600 rounded-full px-1.5 text-[10px] font-bold flex items-center",
    });
  }

  return indicators;
};

const getRightBadges = (chat) => {
  const badges = [];

  if (chat?.isMuted) {
    badges.push({
      id: "muted",
      isIcon: true,
      component: NotificationOff02Icon,
      class: "text-gray-400",
    });
  }

  if (chat?.isPinned) {
    badges.push({
      id: "pinned",
      isIcon: true,
      component: PinLocation02Icon,
      class: "text-gray-400 transform rotate-45",
    });
  }

  if (chat?.unreadCount > 0) {
    badges.push({
      id: "unread",
      isIcon: false,
      text: chat.unreadCount,
      class:
        "bg-green-500 text-white text-[11px] font-bold px-1.5 py-0 min-w-[20px] h-[20px] rounded-full flex items-center justify-center",
    });
  }

  return badges;
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
      <li v-for="chat in chatStore.conversations" :key="chat?._id">
        <BaseListItem
          :title="getChatDetails(chat)?.name"
          :showBorder="false"
          titleClass="text-sm font-semibold text-gray-900"
          :hoverBgClass="
            chatStore.activeChat?._id === chat._id ? '' : 'hover:bg-gray-100'
          "
          :class="[
            'group border-l-4 transition-colors duration-150',
            chatStore.activeChat?._id === chat._id
              ? 'bg-gray-50 border-indigo-500'
              : 'border-transparent',
          ]"
          @click="chatStore.setActiveChat(chat)"
        >
          <template #leading>
            <Avatar
              :src="getChatDetails(chat).avatar"
              :name="getChatDetails(chat).name"
              :is-online="getChatDetails(chat).isOnline"
              size="md"
            />
          </template>

          <template #trailing>
            <span
              :class="[
                'text-xs whitespace-nowrap transition-colors',
                chat?.unreadCount > 0
                  ? 'text-green-500 font-semibold'
                  : 'text-gray-400',
              ]"
            >
              {{ getFormattedTime(chat) }}
            </span>
          </template>

          <template #subtitle>
            <div class="flex justify-between items-center mt-0.5 w-full">
              <div class="flex items-center gap-1 min-w-0 flex-1 mr-2">
                <span
                  v-if="chat?.isTyping"
                  class="text-sm text-green-500 font-medium tracking-wide"
                >
                  typing...
                </span>
                <template v-else>
                  <div
                    v-for="ind in getLeftIndicators(chat)"
                    :key="ind.id"
                    class="shrink-0"
                  >
                    <component
                      v-if="ind.isIcon"
                      :is="ind.component"
                      :size="16"
                      :class="ind.class"
                    />
                    <span v-else :class="ind.class">{{ ind.text }}</span>
                  </div>
                  <span
                    class="text-sm text-gray-500 truncate transition-all duration-300"
                  >
                    {{
                      chat.latestMessage?.content || "Started a conversation"
                    }}
                  </span>
                </template>
              </div>

              <div class="flex items-center shrink-0 gap-1.5 h-5">
                <div
                  v-for="badge in getRightBadges(chat)"
                  :key="badge.id"
                  class="shrink-0"
                >
                  <component
                    v-if="badge.isIcon"
                    :is="badge.component"
                    :size="16"
                    :class="badge.class"
                  />
                  <div v-else :class="badge.class">{{ badge.text }}</div>
                </div>

                <DropdownMenu
                  :items="CHAT_CONTEXT_ACTIONS"
                  position="bottom-right"
                  @select="handleChatContextAction($event, chat)"
                >
                  <template #trigger="{ isOpen }">
                    <div
                      :class="[
                        'flex items-center justify-end overflow-hidden transition-all duration-300 ease-in-out shrink-0 translate-x-2',
                        isOpen
                          ? 'w-5 opacity-100 ml-1 translate-x-0'
                          : 'w-0 opacity-0 ml-0 group-hover:w-5 group-hover:opacity-100 group-hover:ml-1 group-hover:translate-x-0',
                      ]"
                    >
                      <ArrowDown01Icon
                        :size="20"
                        class="text-gray-400 min-w-[20px] hover:text-gray-600 transition-colors"
                      />
                    </div>
                  </template>
                </DropdownMenu>
              </div>
            </div>
          </template>
        </BaseListItem>
      </li>
    </ul>
  </PanelLayout>
</template>
