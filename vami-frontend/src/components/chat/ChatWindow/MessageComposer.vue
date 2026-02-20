<script setup>
import { ref } from "vue";

const emit = defineEmits(["send"]);
const messageInput = ref("");

const submit = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  emit("send", text);
  messageInput.value = "";
};
</script>

<template>
  <div class="p-4 bg-white border-t border-gray-200">
    <form @submit.prevent="submit" class="flex items-end space-x-2">
      <div
        class="flex-1 bg-gray-100 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
      >
        <textarea
          v-model="messageInput"
          @keydown.enter.prevent="submit"
          rows="1"
          placeholder="Type a message..."
          class="w-full bg-transparent border-none focus:ring-0 py-3 px-4 resize-none outline-none text-sm max-h-32 overflow-y-auto rounded-2xl"
        ></textarea>
      </div>

      <button
        type="submit"
        :disabled="!messageInput.trim()"
        class="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg
          class="w-5 h-5 transform rotate-45 -mt-1 -ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          ></path>
        </svg>
      </button>
    </form>
  </div>
</template>
