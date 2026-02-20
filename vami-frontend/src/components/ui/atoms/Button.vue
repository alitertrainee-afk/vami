<script setup>
import { computed } from "vue";

const props = defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: "button" },
  fullWidth: { type: Boolean, default: false },

  // Icon Only Mode
  iconOnly: { type: Boolean, default: false },
  ariaLabel: { type: String, default: "" },

  // Shape & Size
  rounded: { type: String, default: "lg" },
  size: { type: String, default: "md" },

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
        "soft",
        "soft-success",
      ].includes(value),
  },
});

defineEmits(["click"]);

/* ---------------- Base Styles ---------------- */

const baseStyles =
  "inline-flex justify-center items-center font-semibold transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

/* ---------------- Sizes ---------------- */

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  icon: "w-10 h-10 p-0", // perfect square
};

/* ---------------- Shapes ---------------- */

const shapes = {
  lg: "rounded-lg",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

/* ---------------- Variants ---------------- */

const variants = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  outline:
    "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
  ghost:
    "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
  soft: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300",
  "soft-success":
    "bg-green-100 hover:bg-green-200 text-green-800 focus:ring-green-300",
};

/* ---------------- Computed Classes ---------------- */

const computedClasses = computed(() => [
  baseStyles,
  variants[props.variant],
  props.iconOnly ? sizes.icon : sizes[props.size] || sizes.md,

  // 🔥 Force rounded-full if iconOnly
  props.iconOnly ? "rounded-full" : shapes[props.rounded] || shapes.lg,

  props.fullWidth && !props.iconOnly ? "w-full" : "",
  !props.loading && !props.disabled ? "active:scale-95" : "",
]);
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :aria-label="iconOnly ? ariaLabel : null"
    :class="computedClasses"
    @click="$emit('click')"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-5 w-5 text-current"
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
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>

    <slot v-else />
  </button>
</template>
