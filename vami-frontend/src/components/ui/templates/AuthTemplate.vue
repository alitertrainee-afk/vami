<script setup>
defineProps({
  title: String,
});
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
        {{ title }}
      </h2>

      <slot name="subtitle" />
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div
        class="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
