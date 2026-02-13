<script setup>
defineProps({
  modelValue: { type: [String, Number], required: true },
  label: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="w-full mb-4">
    <label v-if="label" class="block text-sm font-semibold text-gray-700 mb-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <input
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'w-full px-4 py-2 border rounded-lg outline-none transition-all duration-200',
        'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
        'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
        error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white',
      ]"
      v-bind="$attrs"
    />

    <p v-if="error" class="mt-1 text-sm text-red-600 animate-pulse">
      {{ error }}
    </p>
  </div>
</template>
