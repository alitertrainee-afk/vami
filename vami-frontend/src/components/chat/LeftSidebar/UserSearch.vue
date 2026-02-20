<script setup>
import { ref, watch } from "vue";
import { UserService } from "../../../services/user.service.js";
import { useDebouncedRef } from "../../../hooks/useDebounce.js";

// Import our new Molecule
import SearchInput from "../../ui/molecules/SearchInput.vue";

const isSearching = ref(false);
const searchResults = ref([]);
const rawInput = ref("");

const searchQuery = useDebouncedRef("", 300);

watch(rawInput, (val) => {
  searchQuery.value = val;
});

watch(searchQuery, async (newQuery) => {
  if (!newQuery.trim()) {
    searchResults.value = [];
    return;
  }

  isSearching.value = true;

  try {
    const response = await UserService.searchUsers(newQuery);
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
  <div class="px-3">
    <SearchInput
      v-model="rawInput"
      placeholder="Search or start a new chat"
      :isLoading="isSearching"
    />
  </div>
</template>
