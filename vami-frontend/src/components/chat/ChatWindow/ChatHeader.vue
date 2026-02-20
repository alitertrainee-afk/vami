<script setup>
import { computed } from "vue";
import { getChatDisplayName } from "../../../utils/common.utils.js";
import { useChatStore } from "../../../store/chat.store.js";
import { useAuthStore } from "../../../store/auth.store.js";

// Icons
import {
  ArrowLeft01Icon,
  MoreVerticalSquare01Icon,
  UserGroupIcon,
  UserIcon,
} from "hugeicons-vue";

// UI Imports - [Atoms]
import Avatar from "../../ui/atoms/Avatar.vue";

const chatStore = useChatStore();
const authStore = useAuthStore();

defineEmits(["back", "toggle-info"]);

// --- DYNAMIC HEADER DETAILS ---
const activeChatDetails = computed(() => {
  const chat = chatStore.activeChat;
  if (!chat) {
    return {
      name: "Unnamed Chat",
      avatar: null,
      isOnline: false,
      fallbackIcon: null,
    };
  }

  const displayName =
    getChatDisplayName(chat, authStore.user?._id) || "Unnamed Chat";

  if (chat.isGroupChat) {
    return {
      name: displayName,
      avatar: chat.groupAvatar || null,
      isOnline: false,
      fallbackIcon: UserGroupIcon,
    };
  }

  const otherUser = chat.participants?.find(
    (p) => p?._id !== authStore.user?._id,
  );

  return {
    name: displayName,
    avatar: otherUser?.profile?.avatar,
    isOnline: chatStore.onlineUsers?.has(otherUser?._id),
    fallbackIcon: UserIcon,
  };
});
</script>

<template>
  <header
    class="px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10 flex justify-between items-center shrink-0"
  >
    <div class="flex items-center gap-3">
      <button
        @click="$emit('back')"
        class="lg:hidden p-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 focus:outline-none transition-colors"
      >
        <ArrowLeft01Icon :size="24" />
      </button>

      <div
        class="flex items-center gap-3 cursor-pointer group"
        @click="$emit('toggle-info')"
      >
        <Avatar
          :src="activeChatDetails?.avatar"
          :name="activeChatDetails?.name"
          :is-online="activeChatDetails?.isOnline"
          :fallback-icon="activeChatDetails?.fallbackIcon"
          size="md"
        />

        <div>
          <h3
            class="text-[16px] font-semibold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors"
          >
            {{ activeChatDetails.name }}
          </h3>
          <p
            v-if="
              activeChatDetails.isOnline &&
              activeChatDetails.fallbackIcon !== UserGroupIcon
            "
            class="text-[13px] text-green-500 font-medium mt-0.5"
          >
            Online
          </p>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <button
        @click="$emit('toggle-info')"
        class="text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none p-2 -mr-2 rounded-full hover:bg-gray-50"
      >
        <MoreVerticalSquare01Icon :size="20" />
      </button>
    </div>
  </header>
</template>
