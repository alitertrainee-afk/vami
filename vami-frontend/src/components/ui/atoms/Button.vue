<script setup>
import { computed } from "vue";

const props = defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: "button" },
  fullWidth: { type: Boolean, default: false },

  // New Props for customization
  rounded: { type: String, default: "lg" }, // 'lg', 'full', '2xl'
  size: { type: String, default: "md" }, // 'sm', 'md', 'icon'

  variant: {
    type: String,
    default: "primary",
    validator: (value) =>
      [
        "primary",
        "secondary",
        "danger",
        "outline",
        "ghost",
        // New Variants for Chips
        "soft", // Gray (Inactive)
        "soft-success", // Green (Active)
      ].includes(value),
  },
});

const emits = defineEmits(["click"]);

// 1. Base Styles (Removed fixed padding/radius to make them dynamic)
const baseStyles =
  "inline-flex justify-center items-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

// 2. Size Variants (Controls padding & font size)
const sizes = {
  sm: "px-3 py-1.5 text-sm", // Perfect for text chips
  md: "px-4 py-2 text-base", // Standard button
  icon: "p-2 w-10 h-10", // Perfect for circular icon buttons
};

// 3. Shape Variants
const shapes = {
  lg: "rounded-lg",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

// 4. Color Variants
const variants = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  outline:
    "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
  ghost:
    "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",

  // New WhatsApp Light Theme Chip Styles
  soft: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300",
  "soft-success":
    "bg-green-100 hover:bg-green-200 text-green-800 focus:ring-green-300",
};

const computedClasses = computed(() => [
  baseStyles,
  variants[props.variant],
  sizes[props.size] || sizes.md,
  shapes[props.rounded] || shapes.lg,
  props.fullWidth ? "w-full" : "",
  !props.loading && !props.disabled ? "active:scale-95" : "",
]);
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :class="computedClasses"
    @click="$emit('click')"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>

    <slot v-if="!loading" />
  </button>
</template>
