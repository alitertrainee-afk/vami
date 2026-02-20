<script setup>
defineProps({
  label: { type: String, required: true },
  icon: { type: [Object, Function], required: true },
  iconBgClass: { type: String, default: "bg-white" },
  iconColorClass: { type: String, default: "text-white" },
  textColorClass: { type: String, default: "text-black" },
  hoverBgClass: { type: String, default: "hover:bg-gray-200" },
});

defineEmits(["click"]);
</script>

<template>
  <button
    @click="$emit('click')"
    :class="[
      'w-full mx-2 my-1 flex items-center transition-colors focus:outline-none',
      hoverBgClass,
    ]"
  >
    <div
      :class="[
        'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
        iconBgClass,
        iconColorClass,
      ]"
    >
      <component :is="icon" :size="24" variant="solid" />
    </div>

    <div class="ml-4 flex-1 text-left border-b border-white/5 pb-4 mt-4">
      <span :class="['text-[17px] font-normal tracking-wide', textColorClass]">
        {{ label }}
      </span>
    </div>
  </button>
</template>
