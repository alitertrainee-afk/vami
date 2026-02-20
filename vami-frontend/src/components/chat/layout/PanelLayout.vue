<script setup>
import { ArrowLeft02Icon } from "hugeicons-vue";
import Button from "../../ui/atoms/Button.vue";

const props = defineProps({
  title: { type: String, required: true },
  showBackButton: { type: Boolean, default: true },
  headerBgClass: { type: String, default: "bg-white" },
  headerTextClass: { type: String, default: "text-black" },
  mainBgClass: { type: String, default: "bg-white" },
});

const emit = defineEmits(["back"]);
</script>

<template>
  <div class="flex flex-col h-full w-full relative" :class="mainBgClass">
    <header
      :class="[
        'flex items-center px-4 shrink-0 transition-colors h-[60px]',
        headerBgClass,
        headerTextClass,
      ]"
    >
      <div class="flex items-center gap-6 w-full mt-auto mb-3">
        <Button
          v-if="showBackButton"
          variant="ghost"
          :icon-only="true"
          @click="emit('back')"
          class="hover:bg-gray-200 p-1.5 -ml-1.5 rounded-full transition-colors focus:outline-none"
        >
          <ArrowLeft02Icon :size="24" />
        </Button>

        <h2 class="text-[19px] font-semibold tracking-wide">{{ title }}</h2>

        <div class="ml-auto flex items-center gap-1">
          <slot name="header-actions" />
        </div>
      </div>
    </header>

    <div v-if="$slots.subheader" class="shrink-0 z-10">
      <slot name="subheader" />
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <slot />
    </div>
  </div>
</template>
