<script setup>
import { reactive } from "vue";
import { useAuthStore } from "@/store/auth.store.js";
import Button from "../atoms/Button.vue";
import FormField from "../molecules/FormField.vue";
import Alert from "../atoms/Alert.vue";

const emit = defineEmits(["success"]);

const authStore = useAuthStore();

const form = reactive({
  email: "",
  password: "",
});

const errors = reactive({
  email: "",
  password: "",
});

const validate = () => {
  let valid = true;
  errors.email = "";
  errors.password = "";

  if (!form.email) {
    errors.email = "Email is required";
    valid = false;
  }

  if (!form.password) {
    errors.password = "Password is required";
    valid = false;
  }

  return valid;
};

const submit = async () => {
  if (!validate()) return;

  const success = await authStore.login(form);
  if (success) emit("success");
};
</script>

<template>
  <div>
    <Alert v-if="authStore.error" :message="authStore.error" variant="error" />

    <form @submit.prevent="submit" class="space-y-2">
      <FormField
        v-model="form.email"
        label="Email address"
        type="email"
        placeholder="you@company.com"
        :error="errors.email"
        :disabled="authStore.isLoading"
        required
      />

      <FormField
        v-model="form.password"
        label="Password"
        type="password"
        placeholder="••••••••"
        :error="errors.password"
        :disabled="authStore.isLoading"
        required
      />

      <Button type="submit" :loading="authStore.isLoading" fullWidth>
        Sign in
      </Button>
    </form>
  </div>
</template>
