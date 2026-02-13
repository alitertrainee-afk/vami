<script setup>
import { computed } from "vue";
import Avatar from "../ui/atoms/Avatar.vue";

const props = defineProps({
  chat: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  currentUserId: { type: String, required: true },
  onlineUsers: { type: Set, required: true },
});

const emit = defineEmits(["select"]);

// Encapsulated Logic: Figure out what to display based on chat type
const details = computed(() => {
  if (props.chat.isGroupChat) {
    return { name: props.chat.chatName, avatar: null, isOnline: false };
  }

  const otherUser = props.chat.participants.find(
    (p) => p._id !== props.currentUserId,
  );
  return {
    name: otherUser?.username || "Unknown User",
    avatar: otherUser?.profile?.avatar,
    isOnline: props.onlineUsers.has(otherUser?._id),
  };
});

const formattedTime = computed(() => {
  if (!props.chat.latestMessage) return "";
  return new Date(props.chat.latestMessage.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
});
</script>

<template>
  <li
    @click="emit('select', chat)"
    :class="[
      'p-3 flex items-center cursor-pointer transition-colors duration-150 hover:bg-gray-50',
      isActive
        ? 'bg-indigo-50 border-l-4 border-indigo-500'
        : 'border-l-4 border-transparent',
    ]"
  >
    <Avatar
      :src="details.avatar"
      :name="details.name"
      :is-online="details.isOnline"
      size="md"
    />

    <div class="ml-4 flex-1 min-w-0">
      <div class="flex justify-between items-baseline">
        <h3 class="text-sm font-semibold text-gray-900 truncate">
          {{ details.name }}
        </h3>
        <span class="text-xs text-gray-400 whitespace-nowrap ml-2">
          {{ formattedTime }}
        </span>
      </div>
      <p class="text-sm text-gray-500 truncate mt-0.5">
        {{ chat.latestMessage?.content || "Started a conversation" }}
      </p>
    </div>
  </li>
</template>
