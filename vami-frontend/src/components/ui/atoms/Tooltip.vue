<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  text: { type: String, required: true },
  position: {
    type: String,
    default: "top",
    validator: (val) => ["top", "bottom", "left", "right"].includes(val),
  },
  delay: { type: Number, default: 150 },
  disabled: { type: Boolean, default: false },
});

const show = ref(false);
let timeoutId = null;

const showTooltip = () => {
  if (props.disabled) return;
  timeoutId = setTimeout(() => {
    show.value = true;
  }, props.delay);
};

const hideTooltip = () => {
  clearTimeout(timeoutId);
  show.value = false;
};

/* ---------------- Position Classes ---------------- */

const positionClasses = computed(() => {
  switch (props.position) {
    case "bottom":
      return "top-full mt-2 left-1/2 -translate-x-1/2";
    case "left":
      return "right-full mr-2 top-1/2 -translate-y-1/2";
    case "right":
      return "left-full ml-2 top-1/2 -translate-y-1/2";
    default:
      return "bottom-full mb-2 left-1/2 -translate-x-1/2";
  }
});
</script>

<template>
  <div
    class="relative inline-flex"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focusin="showTooltip"
    @focusout="hideTooltip"
  >
    <!-- Trigger Slot -->
    <slot />

    <!-- Tooltip -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="show"
        role="tooltip"
        class="absolute z-50 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-md pointer-events-none"
        :class="positionClasses"
      >
        {{ text }}
      </div>
    </transition>
  </div>
</template>
