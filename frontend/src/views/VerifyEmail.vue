<template>
  <div class="auth-page">
    <EmailVerification />
  </div>
</template>

<script setup lang="ts">
import EmailVerification from '@/components/auth/EmailVerification.vue'
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
}
</style>