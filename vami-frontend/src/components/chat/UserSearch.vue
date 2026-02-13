<script setup>
import { ref, watch } from "vue";
import { UserService } from "../../services/user.service";
import { useChatStore } from "../../store/chat.store.js";
import { useDebouncedRef } from "../../hooks/useDebounce.js";

const chatStore = useChatStore();

// UI State
const isSearching = ref(false);
const searchResults = ref([]);
const isDropdownOpen = ref(false);

// The debounced input: Will only update 300ms after the user STOPS typing
const searchQuery = useDebouncedRef("", 300);
const rawInput = ref(""); // We bind the input to this so the UI feels fast

// Sync raw input to debounced ref
const handleInput = (e) => {
  rawInput.value = e.target.value;
  searchQuery.value = e.target.value;
};

// Watch the DEBOUNCED query, not the raw input.
watch(searchQuery, async (newQuery) => {
  if (!newQuery.trim()) {
    searchResults.value = [];
    isDropdownOpen.value = false;
    return;
  }

  isSearching.value = true;
  isDropdownOpen.value = true;

  try {
    const response = await UserService.searchUsers(newQuery);
    console.log("🚀 ~ response:", response);
    searchResults.value = response.data.data || [];
    isSearching.value = false;
  } catch (error) {
    console.error("Search failed:", error);
  } finally {
  }
});

const startChat = async (user) => {
  isDropdownOpen.value = false;
  rawInput.value = "";
  searchQuery.value = "";

  // This calls the accessChat API. If the chat exists, it loads it.
  // If not, the backend creates a new Conversation and returns it.
  try {
    const response = await chatStore.setActiveChatFromUser(user._id);
    // Force a refresh of the sidebar to show the new chat
    await chatStore.loadConversations();
  } catch (error) {
    console.error("Failed to start chat:", error);
  }
};
</script>

<template>
  <div class="relative w-full">
    <div class="relative">
      <input
        type="text"
        :value="rawInput"
        @input="handleInput"
        placeholder="Search users by email or username..."
        class="w-full px-4 py-2 pl-10 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
      />
      <svg
        class="w-4 h-4 text-gray-400 absolute left-3 top-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        ></path>
      </svg>
      <svg
        v-if="isSearching"
        class="w-4 h-4 text-indigo-500 absolute right-3 top-3 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>

    <div
      v-if="isDropdownOpen"
      class="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto"
    >
      <div
        v-if="searchResults.length === 0 && !isSearching"
        class="p-4 text-sm text-gray-500 text-center"
      >
        No users found.
      </div>

      <ul v-else class="py-1">
        <li
          v-for="user in searchResults"
          :key="user._id"
          @click="startChat(user)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center transition-colors"
        >
          <div
            class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0"
          >
            <img
              v-if="user.profile?.avatar"
              :src="user.profile.avatar"
              alt="Avatar"
              class="w-full h-full object-cover rounded-full"
            />
            <span v-else>{{ user.username.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ user.username }}
            </p>
            <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
          </div>
        </li>
      </ul>
    </div>

    <div
      v-if="isDropdownOpen"
      @click="isDropdownOpen = false"
      class="fixed inset-0 z-40 bg-transparent"
    ></div>
  </div>
</template>
