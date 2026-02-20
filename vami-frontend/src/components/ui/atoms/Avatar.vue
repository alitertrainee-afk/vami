<script setup>
import { computed } from "vue";

const props = defineProps({
  src: { type: String, default: null },
  name: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm, md, lg
  fallbackIcon: { type: [Object, Function], default: null }, // <-- Dynamic fallback prop
});

const initials = computed(() => {
  if (!props.name) return "?";
  return props.name.charAt(0).toUpperCase();
});

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

// Scale the hugeicons based on the avatar size wrapper
const iconSize = computed(() => {
  if (props.size === "sm") return 16;
  if (props.size === "lg") return 32;
  return 24; // md
});
</script>

<template>
  <div class="relative flex-shrink-0 inline-block">
    <div
      :class="[
        'rounded-full flex items-center justify-center font-bold overflow-hidden',
        'bg-indigo-100 text-indigo-700 border border-indigo-200',
        sizeClasses[size],
      ]"
    >
      <img
        v-if="src"
        :src="src"
        :alt="name"
        class="w-full h-full object-cover"
      />

      <component
        v-else-if="fallbackIcon"
        :is="fallbackIcon"
        :size="iconSize"
        variant="solid"
        class="opacity-70"
      />

      <span v-else>{{ initials }}</span>
    </div>

    <span
      v-if="isOnline"
      class="absolute bottom-0 right-0 block rounded-full bg-green-400 ring-2 ring-white"
      :class="size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'"
    ></span>
  </div>
</template>
