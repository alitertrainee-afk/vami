import { ref, shallowRef } from "vue";

// Define View Constants for Type Safety
export const SIDEBAR_VIEWS = {
  MAIN: "main",
  NEW_CHAT: "new_chat",
  NEW_GROUP: "new_group",
  COMMUNITIES: "communities",
};

// Singleton State (shared across components)
const currentView = ref(SIDEBAR_VIEWS.MAIN);
const viewHistory = ref([]); // For "Back" functionality

export function useSidebar() {
  const navigateTo = (view) => {
    if (currentView.value !== view) {
      viewHistory.value.push(currentView.value);
      currentView.value = view;
    }
  };

  const goBack = () => {
    const previous = viewHistory.value.pop();
    if (previous) {
      currentView.value = previous;
    } else {
      currentView.value = SIDEBAR_VIEWS.MAIN;
    }
  };

  const resetToMain = () => {
    viewHistory.value = [];
    currentView.value = SIDEBAR_VIEWS.MAIN;
  };

  return {
    currentView,
    navigateTo,
    goBack,
    resetToMain,
    SIDEBAR_VIEWS,
  };
}
