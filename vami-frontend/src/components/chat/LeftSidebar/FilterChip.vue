<script setup>
import { ref } from "vue";
import Button from "../../ui/atoms/Button.vue"; // Your updated button
import { FilterHorizontalIcon } from "hugeicons-vue";

const activeFilter = ref("all");
</script>

<template>
  <div class="flex items-center gap-2 p-4 overflow-x-auto bg-white">
    <Button
      :variant="activeFilter === 'all' ? 'soft-success' : 'soft'"
      size="sm"
      rounded="2xl"
      @click="activeFilter = 'all'"
    >
      All
    </Button>

    <Button
      :variant="activeFilter === 'unread' ? 'soft-success' : 'soft'"
      size="sm"
      rounded="2xl"
      @click="activeFilter = 'unread'"
    >
      Unread <span class="ml-1 opacity-70">181</span>
    </Button>

    <Button
      :variant="activeFilter === 'favourites' ? 'soft-success' : 'soft'"
      size="sm"
      rounded="2xl"
      @click="activeFilter = 'favourites'"
    >
      Favourites
    </Button>

    <Button variant="soft" size="icon" rounded="full" class="!w-8 !h-8">
      <FilterHorizontalIcon :size="16" />
    </Button>
  </div>
</template>
