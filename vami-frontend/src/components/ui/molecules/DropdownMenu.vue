<script setup>
import { ref } from "vue";
import { useClickOutside } from "../../../hooks/useClickOutside.js";

const props = defineProps({
  items: { type: Array, required: true },
  position: { type: String, default: "bottom-right" },
  width: { type: String, default: "w-[220px]" },
});

const emit = defineEmits(["select"]);

const isOpen = ref(false);
const menuRef = ref(null);
const coords = ref({ top: "0px", right: "0px", left: "auto" });

const close = () => (isOpen.value = false);

// Grab exact position directly from the click event instantly
const toggle = (e) => {
  if (!isOpen.value) {
    const rect = e.currentTarget.getBoundingClientRect();
    coords.value = {
      top: `${rect.bottom + 4}px`,
      right:
        props.position === "bottom-right"
          ? `${window.innerWidth - rect.right}px`
          : "auto",
      left: props.position === "bottom-left" ? `${rect.left}px` : "auto",
    };
  }
  isOpen.value = !isOpen.value;
};

// Handle clicks outside the teleported menu
useClickOutside(menuRef, close);

const handleAction = (item) => {
  if (item.separator) return;
  emit("select", item.action);
  close();
};
</script>

<template>
  <div class="inline-block" @click.stop="toggle">
    <slot name="trigger" :isOpen="isOpen" />
  </div>

  <Teleport to="body">
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
        ref="menuRef"
        :style="{
          position: 'fixed',
          top: coords.top,
          right: coords.right,
          left: coords.left,
        }"
        :class="[
          'z-[9999] rounded-xl bg-white shadow-[0_2px_15px_rgba(11,20,26,.1)] ring-1 ring-black/5 focus:outline-none',
          width,
        ]"
      >
        <div class="py-2">
          <template v-for="(item, index) in items" :key="index">
            <div
              v-if="item.separator"
              class="h-[1px] bg-[#e9edef] my-1.5"
            ></div>
            <button
              v-else
              @click.stop="handleAction(item)"
              class="flex w-full items-center px-5 py-[10px] text-left hover:bg-[#f5f6f6] focus:outline-none"
              :class="item.danger ? 'text-[#ea0038]' : 'text-[#3b4a54]'"
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
  </Teleport>
</template>
