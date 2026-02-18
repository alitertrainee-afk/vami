<script setup>
import { ref } from "vue";
import { useClickOutside } from "../../../hooks/useClickOutside.js";

const props = defineProps({
  items: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(
        (item) => item.separator || (item.label && item.action),
      );
    },
  },
  position: {
    type: String,
    default: "bottom-right",
  },
  width: {
    type: String,
    default: "w-56",
  },
});

const emit = defineEmits(["select"]);

const isOpen = ref(false);
const menuRef = ref(null);

// Close menu logic
const close = () => (isOpen.value = false);
const toggle = () => (isOpen.value = !isOpen.value);

// Apply strict outside click detection
useClickOutside(menuRef, () => {
  if (isOpen.value) close();
});

const handleAction = (item) => {
  if (item.separator) return;
  emit("select", item.action);
  close();
};
</script>

<template>
  <div class="relative inline-block text-left" ref="menuRef">
    <div @click.stop="toggle">
      <slot name="trigger" :isOpen="isOpen" />
    </div>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        :class="[
          'absolute z-50 mt-2 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          width,
          position === 'bottom-right' ? 'right-0' : 'left-0',
        ]"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        <div class="py-1 divide-y divide-gray-100">
          <template v-for="(item, index) in items" :key="index">
            <div
              v-if="item.separator"
              class="h-px bg-gray-100 my-1"
              role="separator"
            ></div>

            <button
              v-else
              @click="handleAction(item)"
              class="group flex w-full items-center px-4 py-2.5 text-sm transition-colors duration-150"
              :class="[
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50',
              ]"
              role="menuitem"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                :size="20"
                class="mr-3 opacity-70 group-hover:opacity-100 transition-opacity"
                :class="item.danger ? 'text-red-500' : 'text-gray-500'"
              />

              <span class="font-medium">{{ item.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>
