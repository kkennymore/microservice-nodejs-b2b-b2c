<template>
  <div class="admin-section">
    <Card>
      <h3>Products Management</h3>
      <p>Manage products, approvals, and categories</p>
      <div class="placeholder-content">
        <span>📦 Product management interface coming soon</span>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card } from '@/components'
</script>

<style scoped>
.admin-section {
  padding: var(--spacing-lg);
}

.placeholder-content {
  padding: var(--spacing-xl);
  text-align: center;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  color: var(--text-muted);
  font-size: 1.1rem;
}
</style>