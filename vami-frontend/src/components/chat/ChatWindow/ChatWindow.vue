<script setup>

// Extracted Sub-Components
import ChatHeader from "./ChatHeader.vue";
import ChatMessageList from "./ChatMessageList.vue";
import MessageComposer from "./MessageComposer.vue";

// stores
import { useAuthStore } from "../../../store/auth.store";
import { useChatStore } from "../../../store/chat.store";

const chatStore = useChatStore();
const authStore = useAuthStore();

defineEmits(["back", "toggle-info"]);

// ... (Action handlers remain the same)
</script>

<template>
  <section
    class="flex flex-col h-full w-full relative bg-[#efeae2] overflow-hidden z-0"
  >
    <div
      class="absolute inset-0 z-0 opacity-40 pointer-events-none bg-[url('/chat-bg-pattern.png')] bg-repeat"
    ></div>

    <header class="shrink-0 z-20 w-full shadow-sm">
      <ChatHeader @back="$emit('back')" @toggle-info="$emit('toggle-info')" />
    </header>

    <main class="flex-1 min-h-0 min-w-0 relative z-10 flex flex-col">
      <ChatMessageList
        :messages="chatStore.messages"
        :isLoading="chatStore.isLoadingMessages"
        :hasNext="chatStore.pagination?.hasNext"
        :currentUserId="authStore.user?._id"
        :loadMore="handleLoadMore"
        class="flex-1"
      />
    </main>

    <footer class="shrink-0 z-20 w-full bg-white">
      <MessageComposer @send="handleSend" />
    </footer>
  </section>
</template>
