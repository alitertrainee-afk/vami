<script setup>
defineProps({
  text: String,
  linkText: String,
  to: String,
});
</script>

<template>
  <p class="mt-2 text-center text-sm text-gray-600">
    {{ text }}
    <router-link
      :to="to"
      class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
    >
      {{ linkText }}
    </router-link>
  </p>
</template>
