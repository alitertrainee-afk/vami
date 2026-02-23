<script setup>
import { ref, watch } from "vue";
import { useDebouncedRef } from "../../../hooks/useDebounce.js";
import { useChatStore } from "../../../store/chat.store.js";

// Import our new Molecule
import SearchInput from "../../ui/molecules/SearchInput.vue";

const chatStore = useChatStore();
const rawInput = ref(chatStore.searchQuery);
const debouncedSearch = useDebouncedRef("", 300);

// 1. Sync input to debouncer
watch(rawInput, (val) => {
  debouncedSearch.value = val;
});

// 2. Dispatch action to store when user stops typing
watch(debouncedSearch, (newQuery) => {
  chatStore.handleSearch(newQuery);
});

// 3. Clear input box if the store resets the search query externally
watch(
  () => chatStore.searchQuery,
  (newVal) => {
    if (newVal === "") {
      rawInput.value = "";
    }
  },
);
</script>

<template>
  <div class="px-3">
    <SearchInput
      v-model="rawInput"
      placeholder="Search or start a new chat"
      :isLoading="chatStore.isSearching"
    />
  </div>
</template>
