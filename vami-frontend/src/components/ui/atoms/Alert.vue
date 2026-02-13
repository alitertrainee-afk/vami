<script setup>
defineProps({
  message: { type: String, required: true },
  variant: { type: String, default: "error" },
});
</script>

<template>
  <div
    class="mb-6 border-l-4 p-4 rounded-r-md"
    :class="
      variant === 'error'
        ? 'bg-red-50 border-red-500'
        : 'bg-green-50 border-green-500'
    "
  >
    <p
      class="text-sm font-medium"
      :class="variant === 'error' ? 'text-red-700' : 'text-green-700'"
    >
      {{ message }}
    </p>
  </div>
</template>
