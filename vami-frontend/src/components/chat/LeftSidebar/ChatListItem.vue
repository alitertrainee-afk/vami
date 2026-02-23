<script setup>
import { computed } from "vue";
import { useAuthStore } from "../../../store/auth.store.js"; // Adjust paths as needed
import { useChatStore } from "../../../store/chat.store.js";

// Icons
import {
  TickDouble02Icon,
  Tick01Icon,
  NotificationOff02Icon,
  PinLocation02Icon,
  Archive02Icon,
  Delete02Icon,
  UserBlock01Icon,
  ArrowDown01Icon,
} from "hugeicons-vue";

// Components
import BaseListItem from "../../ui/molecules/BaseListItem.vue";
import Avatar from "../../ui/atoms/Avatar.vue";
import DropdownMenu from "../../ui/molecules/DropdownMenu.vue";

const props = defineProps({
  chat: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["click", "contextAction"]);

const authStore = useAuthStore();
const chatStore = useChatStore();

// --- CONTEXT MENU ---
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

const handleAction = (action) => {
  emit("contextAction", { action, chat: props.chat });
};

// --- COMPUTED HELPERS ---
const details = computed(() => {
  if (props.chat?.isGroupChat) {
    return { name: props.chat.chatName, avatar: null, isOnline: false };
  }
  const otherUser = props.chat?.participants?.find(
    (p) => p?._id !== authStore.user?._id,
  );
  return {
    name: otherUser?.username || "Unknown User",
    avatar: otherUser?.profile?.avatar,
    isOnline: chatStore.onlineUsers.has(otherUser?._id),
  };
});

const formattedTime = computed(() => {
  if (!props.chat?.latestMessage) return "";
  return new Date(props.chat.latestMessage.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
});

const leftIndicators = computed(() => {
  const indicators = [];
  const latestMsg = props.chat?.latestMessage;
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
  if (props.chat?.isMentioned) {
    indicators.push({
      id: "mention",
      isIcon: false,
      text: "@",
      class:
        "bg-gray-200 text-gray-600 rounded-full px-1.5 text-[10px] font-bold flex items-center",
    });
  }
  return indicators;
});

const rightBadges = computed(() => {
  const badges = [];
  if (props.chat?.isMuted)
    badges.push({
      id: "muted",
      isIcon: true,
      component: NotificationOff02Icon,
      class: "text-gray-400",
    });
  if (props.chat?.isPinned)
    badges.push({
      id: "pinned",
      isIcon: true,
      component: PinLocation02Icon,
      class: "text-gray-400 transform rotate-45",
    });
  if (props.chat?.unreadCount > 0) {
    badges.push({
      id: "unread",
      isIcon: false,
      text: props.chat.unreadCount,
      class:
        "bg-green-500 text-white text-[11px] font-bold px-1.5 py-0 min-w-[20px] h-[20px] rounded-full flex items-center justify-center",
    });
  }
  return badges;
});
</script>

<template>
  <BaseListItem
    :title="details.name"
    :showBorder="false"
    titleClass="text-sm font-semibold text-gray-900"
    :hoverBgClass="isActive ? '' : 'hover:bg-gray-100'"
    :class="[
      'group transition-colors duration-150',
      isActive ? 'bg-gray-100' : 'border-transparent',
    ]"
    @click="emit('click', chat)"
  >
    <template #leading>
      <Avatar
        :src="details.avatar"
        :name="details.name"
        :is-online="details.isOnline"
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
        {{ formattedTime }}
      </span>
    </template>

    <template #subtitle>
      <div class="flex justify-between items-center mt-0.5 w-full">
        <div class="flex items-center gap-1 min-w-0 flex-1 mr-2">
          <span
            v-if="chat?.isTyping"
            class="text-sm text-green-500 font-medium tracking-wide"
            >typing...</span
          >
          <template v-else>
            <div v-for="ind in leftIndicators" :key="ind.id" class="shrink-0">
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
              {{ chat.latestMessage?.content || "Started a conversation" }}
            </span>
          </template>
        </div>

        <div class="flex items-center shrink-0 gap-1.5 h-5">
          <div v-for="badge in rightBadges" :key="badge.id" class="shrink-0">
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
            @select="handleAction"
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
</template>
