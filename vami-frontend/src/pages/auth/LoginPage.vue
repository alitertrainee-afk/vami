<script setup>
import { useRouter } from "vue-router";
import AuthTemplate from "@/components/ui/templates/AuthTemplate.vue";
import LoginForm from "@/components/ui/organisms/LoginForm.vue";
import AuthFooterLink from "@/components/ui/molecules/AuthFooterLink.vue";

const router = useRouter();

const handleSuccess = () => {
  router.push("/chat");
};
</script>

<template>
  <AuthTemplate title="Sign in to Vami">
    <template #subtitle>
      <AuthFooterLink
        text="Or"
        linkText="create a new account"
        to="/register"
      />
    </template>

    <LoginForm @success="handleSuccess" />
  </AuthTemplate>
</template>
