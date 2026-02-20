<script setup>
// libs import
import { ref } from "vue";

// UI Imports - [Atoms]
import Button from "../../ui/atoms/Button.vue";

// state
const activeFilter = ref("all");

const filters = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread", count: 181 },
  { key: "favourites", label: "Favourites" },
];

const buttonVariant = (key) =>
  activeFilter.value === key ? "soft-success" : "soft";
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
      @click="activeFilter = filter?.key"
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
