<script setup>
defineProps({ item: { type: Object, required: true } });
</script>

<template>
  <div class="flex justify-center my-2 shrink-0 clear-both">
    <span
      class="bg-yellow-50 text-yellow-800 border border-yellow-100 text-[13px] px-3 py-1 rounded-full text-center max-w-[80%]"
    >
      {{ item.content }}
    </span>
  </div>
</template>
