<script setup>
import { computed } from "vue";
import { useSidebar } from "../../../hooks/useSidebar.js";

// Import Views
import MainChatList from "./views/MainChatList.vue"; 
import NewChatPanel from "./views/NewChatPanel.vue";
// import NewGroupPanel from "./views/NewGroupPanel.vue"; // Future scalable addition

const { currentView, SIDEBAR_VIEWS: VIEWS } = useSidebar();

// Dynamic Component Lookup 
const activeComponent = computed(() => {
  switch (currentView.value) {
    case VIEWS.NEW_CHAT:
      return NewChatPanel;
    case VIEWS.NEW_GROUP:
      return null; // Add later
    default:
      return MainChatList;
  } 
});

</script>

<template>
  <div class="h-full w-full bg-white flex flex-col overflow-hidden relative">
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
      mode="out-in"
    >
      <component :is="activeComponent" class="h-full w-full flex-1" />
    </Transition>
  </div>
</template>