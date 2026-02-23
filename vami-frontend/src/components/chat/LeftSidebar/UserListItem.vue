<script setup>
import { computed } from "vue";
import { useChatStore } from "@/store/chat.store.js";
import Avatar from "../../ui/atoms/Avatar.vue";
import BaseListItem from "../../ui/molecules/BaseListItem.vue";
const props = defineProps({
  user: { type: Object, required: true },
});

const emit = defineEmits(["click"]);
const chatStore = useChatStore();

const isOnline = computed(() => chatStore.onlineUsers.has(props.user._id));
</script>

<template>
  <BaseListItem
    :title="user.username"
    :showBorder="false"
    titleClass="text-sm font-semibold text-gray-900"
    hoverBgClass="hover:bg-gray-100"
    class="group transition-colors duration-150 border-transparent cursor-pointer"
    @click="emit('click', user)"
  >
    <template #leading>
      <Avatar
        :src="user.profile?.avatar"
        :name="user.username"
        :is-online="isOnline"
        size="md"
      />
    </template>
    <template #subtitle>
      <span class="text-sm text-gray-500">Click to start chatting</span>
    </template>
  </BaseListItem>
</template>
