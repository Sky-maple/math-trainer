<script setup lang="ts">
import { ref, computed } from 'vue'
import TrainingPanel from '@/components/training/TrainingPanel.vue'
import type { TrainingConfig } from '@/composables/useTraining'
import { CATEGORY_MAP, DIFFICULTY_LABELS, DIFFICULTY_LIST } from '@/core/generator'
import { settings } from '@/stores/settings'
import { formatDuration } from '@/utils'

const durations = [
  { label: '30 秒', seconds: 30 },
  { label: '1 分钟', seconds: 60 },
  { label: '3 分钟', seconds: 180 },
  { label: '5 分钟', seconds: 300 }
]

const timedSeconds = ref(settings.timedSeconds)
const customSeconds = ref(120)
const isCustom = ref(false)
const scope = ref<'level' | 'category'>('level')
const selectedLevel = ref(settings.currentLevel)
const selectedCategory = ref('add-2-2')

const session = ref<TrainingConfig | null>(null)
const sessionKey = ref(0)

const effectiveSeconds = computed(() => (isCustom.value ? customSeconds.value : timedSeconds.value))

function start(): void {
  if (scope.value === 'level') {
    session.value = {
      mode: 'timed',
      source: 'level',
      difficulty: selectedLevel.value,
      questionCount: 0,
      timedSeconds: effectiveSeconds.value,
      autoNext: settings.autoNext,
      label: `${DIFFICULTY_LABELS[selectedLevel.value]} · ${formatDuration(effectiveSeconds.value * 1000)}挑战`
    }
  } else {
    const meta = CATEGORY_MAP[selectedCategory.value]
    session.value = {
      mode: 'timed',
      source: 'category',
      category: selectedCategory.value,
      difficulty: meta.difficulty,
      questionCount: 0,
      timedSeconds: effectiveSeconds.value,
      autoNext: settings.autoNext,
      label: `${meta.label} · ${formatDuration(effectiveSeconds.value * 1000)}挑战`
    }
  }
  sessionKey.value++
}
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">限时挑战</h1>
      <p class="page-desc">在限定时间内尽量多、尽量快地作答。</p>
    </div>

    <TrainingPanel v-if="session" :key="sessionKey" :config="session" @close="session = null" />

    <div v-else class="card setup">
      <div class="setup-row">
        <span class="setup-label">时长</span>
        <el-radio-group v-model="isCustom">
          <el-radio-button :value="false">预设</el-radio-button>
          <el-radio-button :value="true">自定义</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="!isCustom" class="setup-row">
        <span class="setup-label"></span>
        <el-radio-group v-model="timedSeconds">
          <el-radio-button v-for="d in durations" :key="d.seconds" :value="d.seconds">{{ d.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <div v-else class="setup-row">
        <span class="setup-label">自定义秒数</span>
        <el-input-number v-model="customSeconds" :min="10" :max="3600" :step="10" />
      </div>

      <div class="setup-row">
        <span class="setup-label">出题范围</span>
        <el-radio-group v-model="scope">
          <el-radio-button value="level">综合（按难度）</el-radio-button>
          <el-radio-button value="category">指定题型</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="scope === 'level'" class="setup-row">
        <span class="setup-label">难度</span>
        <div class="level-list">
          <el-radio-group v-model="selectedLevel">
            <el-radio-button v-for="l in DIFFICULTY_LIST" :key="l" :value="l">{{ l }}</el-radio-button>
          </el-radio-group>
          <span class="level-hint muted">{{ DIFFICULTY_LABELS[selectedLevel] }}</span>
        </div>
      </div>
      <div v-else class="setup-row">
        <span class="setup-label">题型</span>
        <el-select v-model="selectedCategory" style="width: 220px">
          <el-option
            v-for="c in Object.values(CATEGORY_MAP)"
            :key="c.key"
            :value="c.key"
            :label="c.label"
          />
        </el-select>
      </div>

      <div class="setup-actions">
        <el-button type="primary" size="large" @click="start">开始挑战</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup {
  max-width: 640px;
}
.setup-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.setup-label {
  width: 88px;
  flex-shrink: 0;
  color: var(--text-2);
  font-size: 14px;
}
.level-list {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.level-hint {
  font-size: 13px;
}
.setup-actions {
  margin-top: 8px;
}
@media (max-width: 640px) {
  .setup-label {
    width: 100%;
    margin-bottom: -8px;
  }
}
</style>
