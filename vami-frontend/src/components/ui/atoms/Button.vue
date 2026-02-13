<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: "button" },
  variant: { type: String, default: "primary" },
  fullWidth: { type: Boolean, default: false },
});

const variants = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  outline:
    "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
};
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :class="[
      'flex justify-center items-center px-4 py-2 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
      variants[variant],
      fullWidth ? 'w-full' : '',
      loading || disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95',
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
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

    <slot v-else />
  </button>
</template>
