<script setup>
import { Search01Icon, Loading01Icon, Cancel01Icon } from "hugeicons-vue";
import Input from "../atoms/Input.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Search..." },
  isLoading: { type: Boolean, default: false },

  // Pass-through styling props to the Input atom
  variant: { type: String, default: "filled" },
  rounded: { type: String, default: "full" },
  noMargin: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue", "clear"]);

const handleClear = () => {
  emit("update:modelValue", "");
  emit("clear");
};
</script>

<template>
  <div class="relative w-full">
    <Input
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :placeholder="placeholder"
      :variant="variant"
      :rounded="rounded"
      :noMargin="noMargin"
    >
      <template #left>
        <Search01Icon :size="20" class="text-gray-500" />
      </template>

      <template #right>
        <Loading01Icon
          v-if="isLoading"
          :size="20"
          class="text-teal-600 animate-spin"
        />
        <button
          v-else-if="modelValue.length > 0"
          @click="handleClear"
          class="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors flex items-center justify-center"
          title="Clear search"
        >
          <Cancel01Icon :size="18" />
        </button>
      </template>
    </Input>
  </div>
</template>
s