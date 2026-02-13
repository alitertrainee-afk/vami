<script setup>
import Input from "../atoms/Input.vue";

defineProps({
  modelValue: [String, Number],
  label: String,
  type: String,
  placeholder: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <Input
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :label="label"
    :type="type"
    :placeholder="placeholder"
    :error="error"
    :disabled="disabled"
    :required="required"
  />
</template>
