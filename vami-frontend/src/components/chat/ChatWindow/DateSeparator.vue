<script setup>
defineProps({ item: { type: Object, required: true } });
</script>

<template>
  <div class="flex justify-center my-4 shrink-0 clear-both">
    <span
      class="bg-[#f1f1f2] text-[#54656f] text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm"
    >
      {{ item.label }}
    </span>
  </div>
</template>
