<script setup>
// local imports
import { useChatStore } from "../../store/chat.store.js";
import { useAuthStore } from "../../store/auth.store.js";

const chatStore = useChatStore();
const authStore = useAuthStore();

// Helper to get the name/avatar of the *other* person in a 1-on-1 chat
const getChatDetails = (chat) => {
  if (!chat || !authStore.user) return { name: "Unknown", avatar: null };

  if (chat.isGroupChat) {
    return { name: chat.chatName, avatar: null };
  }

  // Find the participant that is NOT the current user
  const otherUser = chat.participants.find((p) => p._id !== authStore.user._id);
  return {
    name: otherUser?.username || "Unknown User",
    avatar: otherUser?.profile?.avatar,
    isOnline: chatStore.onlineUsers.has(otherUser?._id),
  };
};

const selectChat = (chat) => {
  chatStore.setActiveChat(chat);
};
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="p-4 border-b border-gray-200 flex justify-between items-center bg-white"
    >
      <h2 class="text-xl font-bold text-gray-800 tracking-tight">Chats</h2>
      <button
        @click="authStore.logout()"
        class="text-sm text-red-500 hover:text-red-700 font-medium"
      >
        Logout
      </button>
    </div>

    <div class="p-3">
      <input
        type="text"
        placeholder="Search chats..."
        class="w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
      />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="chatStore.isLoadingChats"
        class="p-4 text-center text-gray-400 text-sm"
      >
        Loading conversations...
      </div>

      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="chat in chatStore.conversations"
          :key="chat._id"
          @click="selectChat(chat)"
          :class="[
            'p-3 flex items-center cursor-pointer transition-colors duration-150 hover:bg-gray-50',
            chatStore.activeChat?._id === chat._id
              ? 'bg-indigo-50 border-l-4 border-indigo-500'
              : 'border-l-4 border-transparent',
          ]"
        >
          <div class="relative flex-shrink-0">
            <div
              class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg border border-indigo-200 overflow-hidden"
            >
              <img
                v-if="getChatDetails(chat).avatar"
                :src="getChatDetails(chat).avatar"
                alt="Avatar"
                class="w-full h-full object-cover"
              />
              <span v-else>{{
                getChatDetails(chat).name.charAt(0).toUpperCase()
              }}</span>
            </div>
            <span
              v-if="getChatDetails(chat).isOnline"
              class="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white"
            ></span>
          </div>

          <div class="ml-4 flex-1 min-w-0">
            <div class="flex justify-between items-baseline">
              <h3 class="text-sm font-semibold text-gray-900 truncate">
                {{ getChatDetails(chat).name }}
              </h3>
              <span
                class="text-xs text-gray-400 whitespace-nowrap ml-2"
                v-if="chat.latestMessage"
              >
                {{
                  new Date(chat.latestMessage.createdAt).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" },
                  )
                }}
              </span>
            </div>
            <p class="text-sm text-gray-500 truncate mt-0.5">
              {{ chat.latestMessage?.content || "Started a conversation" }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
