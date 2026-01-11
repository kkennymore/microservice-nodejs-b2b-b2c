<template>
  <div class="register-page">
    <RegisterForm />
  </div>
</template>

<script setup lang="ts">
import { RegisterForm } from '@/components/auth'
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--bg-secondary);
}
</style>