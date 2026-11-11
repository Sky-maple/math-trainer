<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
  color?: string
}>()
</script>

<template>
  <div class="stat-card card">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value" :style="color ? { color } : {}">{{ value }}</div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 16px;
}
.stat-label {
  font-size: 12px;
  color: var(--text-2);
}
.stat-value {
  font-size: 26px;
  font-weight: 600;
  margin-top: 6px;
  line-height: 1.2;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.stat-sub {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 4px;
}
</style>
