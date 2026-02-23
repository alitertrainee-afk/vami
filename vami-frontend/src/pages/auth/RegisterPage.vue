<script setup>
import { useRouter } from "vue-router";
import AuthTemplate from "@/components/ui/templates/AuthTemplate.vue";
import RegisterForm from "@/components/ui/organisms/RegisterForm.vue";
import AuthFooterLink from "@/components/ui/molecules/AuthFooterLink.vue";

const router = useRouter();

const handleSuccess = () => {
  router.push("/chat");
};
</script>

<template>
  <AuthTemplate title="Create your account">
    <template #subtitle>
      <AuthFooterLink
        text="Already have an account?"
        linkText="Sign in"
        to="/login"
      />
    </template>

    <RegisterForm @success="handleSuccess" />
  </AuthTemplate>
</template>
