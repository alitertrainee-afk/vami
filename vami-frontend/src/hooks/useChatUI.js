import { ref, computed } from "vue";
import { useChatStore } from "../store/chat.store.js";

// Singleton state (optional, but good if you want state to persist across route changes)
const isInfoPanelOpen = ref(false);

export function useChatUI() {
  const chatStore = useChatStore();

  const showSidebar = computed(() => !chatStore.activeChat);

  // Chat is visible if we have an active chat
  const showChatWindow = computed(() => !!chatStore.activeChat);

  // Actions
  const openInfoPanel = () => {
    isInfoPanelOpen.value = true;
  };

  const closeInfoPanel = () => {
    isInfoPanelOpen.value = false;
  };

  const toggleInfoPanel = () => {
    isInfoPanelOpen.value = !isInfoPanelOpen.value;
  };

  const closeActiveChat = () => {
    chatStore.setActiveChat(null);
    closeInfoPanel();
  };

  return {
    isInfoPanelOpen,
    showSidebar,
    showChatWindow,
    openInfoPanel,
    closeInfoPanel,
    toggleInfoPanel,
    closeActiveChat,
  };
}
