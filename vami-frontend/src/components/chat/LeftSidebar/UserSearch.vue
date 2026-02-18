<script setup>
// Vue
import { ref, watch } from "vue";

// Icons
import { Search01Icon, Loading01Icon } from "hugeicons-vue";

// Services & Stores
import { UserService } from "../../../services/user.service.js";
import { useDebouncedRef } from "../../../hooks/useDebounce.js";

// UI Imports - [Atoms]
import Input from "../../ui/atoms/Input.vue"; 

// State
const isSearching = ref(false);
const searchResults = ref([]); 
const rawInput = ref("");

// Debounced Search
const searchQuery = useDebouncedRef("", 300);

// Sync raw input -> debounced value
watch(rawInput, (val) => {
  searchQuery.value = val;
});

// Watch debounced query to fetch API
watch(searchQuery, async (newQuery) => {
  if (!newQuery.trim()) {
    searchResults.value = [];
    return;
  }

  isSearching.value = true;

  try {
    const response = await UserService.searchUsers(newQuery);
    // Store results directly in the ref
    searchResults.value = response.data.data || [];
  } catch (error) {
    console.error("Search failed:", error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
});
</script>

<template>
  <div class="relative w-full px-3 py-2">
    <Input
      v-model="rawInput"
      placeholder="Search or start a new chat"
      variant="filled"
      rounded="full"
      :noMargin="true"
    >
      <template #left>
        <Search01Icon :size="20" class="text-gray-500" />
      </template>

      <template #right v-if="isSearching">
        <Loading01Icon :size="20" class="text-indigo-500 animate-spin" />
      </template>
    </Input>
  </div>
</template>
