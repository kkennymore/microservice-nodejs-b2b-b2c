<template>
  <div class="login-page">
    <LoginForm />
  </div>
</template>

<script setup lang="ts">
import { LoginForm } from '@/components/auth'
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
}
</style>