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
    default: "w-[220px]", // WhatsApp menus are usually a bit wider
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
    <div @click.stop="toggle" class="cursor-pointer">
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
          'absolute z-50 mt-1 origin-top-right rounded-xl bg-white shadow-[0_2px_15px_rgba(11,20,26,.1)] ring-1 ring-black/5 focus:outline-none',
          width,
          position === 'bottom-right' ? 'right-0' : 'left-0',
        ]"
        role="menu"
      >
        <div class="py-2">
          <template v-for="(item, index) in items" :key="index">
            <div
              v-if="item.separator"
              class="h-[1px] bg-[#e9edef] my-1.5"
              role="separator"
            ></div>

            <button
              v-else
              @click.stop="handleAction(item)"
              class="flex w-full items-center px-5 py-[10px] text-left hover:bg-[#f5f6f6] focus:bg-[#f5f6f6] outline-none"
              :class="item.danger ? 'text-[#ea0038]' : 'text-[#3b4a54]'"
              role="menuitem"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                :size="20"
                class="mr-4 shrink-0"
                :class="item.danger ? 'text-[#ea0038]' : 'text-[#54656f]'"
              />
              <span class="text-[15px] font-normal truncate">{{
                item.label
              }}</span>
            </button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>
