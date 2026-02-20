<script setup>
defineProps({
  name: { type: String, required: true },
  subtitle: { type: String, default: "" },
  avatar: { type: String, default: null }, // URL to image
  hoverBgClass: { type: String, default: "hover:bg-[#202c33]" },
});

defineEmits(["click"]);
</script>

<template>
  <button
    @click="$emit('click')"
    :class="[
      'w-full px-4 py-3 flex items-center transition-colors focus:outline-none',
      hoverBgClass,
    ]"
  >
    <div class="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gray-600">
      <img
        v-if="avatar"
        :src="avatar"
        :alt="name"
        class="w-full h-full object-cover"
      />
      <span
        v-else
        class="text-white flex items-center justify-center w-full h-full text-lg"
      >
        {{ name.charAt(0) }}
      </span>
    </div>

    <div
      class="ml-4 flex-1 text-left flex flex-col justify-center border-b border-white/5 pb-3 mt-3"
    >
      <span class="text-[17px] text-[#e9edef] font-normal tracking-wide">
        {{ name }}
      </span>
      <span v-if="subtitle" class="text-[14px] text-[#8696a0] mt-0.5">
        {{ subtitle }}
      </span>
    </div>
  </button>
</template>
