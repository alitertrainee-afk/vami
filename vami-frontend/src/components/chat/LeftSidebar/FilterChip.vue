<script setup>
import { computed } from "vue";
import { useChatStore } from "../../../store/chat.store.js";

// UI Imports - [Atoms]
import Button from "../../ui/atoms/Button.vue";

const chatStore = useChatStore();

// Dynamically generate filters so counts are reactive
const filters = computed(() => [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread", count: chatStore.unreadChatsCount },
  { key: "groups", label: "Groups" }, // Added to match store logic
]);

const buttonVariant = (key) =>
  chatStore.activeFilter === key ? "soft-success" : "soft";
</script>

<template>
  <div
    class="flex items-center gap-2 p-3 overflow-x-auto scroll-hidden bg-white"
  >
    <Button
      v-for="filter in filters"
      :key="filter?.key"
      :variant="buttonVariant(filter?.key)"
      size="sm"
      rounded="2xl"
      @click="chatStore.setFilter(filter?.key)"
    >
      {{ filter?.label }}
      <span v-if="filter.count" class="ml-1 opacity-70">
        {{ filter?.count }}
      </span>
    </Button>
  </div>
</template>

<style scoped>
.scroll-hidden {
  -ms-overflow-style: none; /* IE & Edge */
  scrollbar-width: none; /* Firefox */
}

.scroll-hidden::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}
</style>
