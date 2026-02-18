<script setup>
import { computed } from "vue";

const props = defineProps({
  showSidebar: Boolean,
  showChat: Boolean,
  showInfo: Boolean,
});

const emit = defineEmits(["close-chat", "close-info"]);
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-gray-100">
    <div class="hidden lg:flex w-full h-full">
      <aside
        class="w-[380px] border-r border-gray-200 flex-shrink-0 bg-white z-20"
      >
        <slot name="sidebar" />
      </aside>

      <main class="flex-1 flex flex-col min-w-0 bg-gray-50 relative z-10">
        <slot name="chat" />
      </main>

      <aside
        class="bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden"
        :class="
          showInfo
            ? 'w-[320px] translate-x-0'
            : 'w-0 translate-x-full border-none'
        "
      >
        <slot name="info" />
      </aside>
    </div>

    <div class="lg:hidden relative w-full h-full">
      <div class="absolute inset-0 w-full h-full bg-white z-10">
        <slot name="sidebar" />
      </div>

      <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in duration-200"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="showChat"
          class="absolute inset-0 w-full h-full bg-gray-50 z-20 flex flex-col"
        >
          <slot name="chat" />
        </div>
      </Transition>

      <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in duration-200"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="showInfo"
          class="absolute inset-0 w-full h-full bg-white z-30"
        >
          <div
            class="h-16 flex items-center px-4 border-b border-gray-200 bg-white"
          >
            <button @click="$emit('close-info')" class="mr-3 text-gray-600">
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>
            <h3 class="font-semibold text-lg">Contact Info</h3>
          </div>
          <slot name="info" />
        </div>
      </Transition>
    </div>
  </div>
</template>
