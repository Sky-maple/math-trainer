<script setup lang="ts">
import { computed } from 'vue'
import { masteryLevelOf, MASTERY_COLOR } from '@/stores/techniqueMastery'

const props = defineProps<{ techniqueId: string }>()
const level = computed(() => masteryLevelOf(props.techniqueId))
const color = computed(() => MASTERY_COLOR[level.value])
</script>

<template>
  <span
    class="mastery-badge"
    :style="{ color: color, borderColor: color, backgroundColor: color + '18' }"
  >
    {{ level }}
  </span>
</template>

<style scoped>
.mastery-badge {
  display: inline-block;
  padding: 1px 9px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  white-space: nowrap;
}
</style>
