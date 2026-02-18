<script setup>
import { computed, useSlots } from "vue";

const slots = useSlots();

const props = defineProps({
  modelValue: { type: [String, Number], required: true },
  label: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  noMargin: { type: Boolean, default: false },
  // New Props
  rounded: { type: String, default: "lg" }, // options: 'none', 'md', 'lg', 'full'
  variant: { type: String, default: "outlined" }, // options: 'outlined', 'filled'
});

const emit = defineEmits(["update:modelValue"]);

const hasLeftIcon = computed(() => !!slots.left);
const hasRightIcon = computed(() => !!slots.right);

const wrapperClasses = computed(() => [
  "w-full",
  !props.noMargin ? "mb-4" : "",
]);

// 1. Handle Shape (Border Radius)
const radiusClasses = computed(() => {
  const radii = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full", // The "Pill" shape
  };
  return radii[props.rounded] || "rounded-lg";
});

// 2. Handle Visual Style (Colors/Borders)
const variantClasses = computed(() => {
  // If there is an error, override everything with red styles
  if (props.error) {
    return "border border-red-500 bg-red-50 text-red-900 placeholder-red-300 focus:ring-red-500";
  }

  if (props.disabled) {
    return "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
  }

  switch (props.variant) {
    case "filled":
      // WhatsApp Style: Gray bg, turns white on focus, no default border
      return "border border-transparent bg-gray-100 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500";
    case "outlined":
    default:
      // Standard Form Style
      return "border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  }
});

const inputClasses = computed(() => [
  "w-full py-2 outline-none transition-all duration-200",
  hasLeftIcon.value ? "pl-10" : "px-4",
  hasRightIcon.value ? "pr-10" : "",
  radiusClasses.value,
  variantClasses.value,
]);
</script>

<template>
  <div :class="wrapperClasses">
    <label v-if="label" class="block text-sm font-semibold text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <div
        v-if="hasLeftIcon"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      >
        <slot name="left" />
      </div>

      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="inputClasses"
        @input="emit('update:modelValue', $event.target.value)"
        v-bind="$attrs"
      />

      <div
        v-if="hasRightIcon"
        class="absolute right-3 top-1/2 -translate-y-1/2"
      >
        <slot name="right" />
      </div>
    </div>

    <p v-if="error" class="mt-1 text-sm text-red-600 animate-pulse">
      {{ error }}
    </p>
  </div>
</template>
