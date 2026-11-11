<script setup lang="ts">
import { ref, computed } from 'vue'
import TrainingPanel from '@/components/training/TrainingPanel.vue'
import type { TrainingConfig } from '@/composables/useTraining'
import { CATEGORIES, CATEGORY_MAP, DIFFICULTY_LABELS, DIFFICULTY_LIST } from '@/core/generator'
import { settings } from '@/stores/settings'

const mode = ref<'category' | 'level'>('category')
const selectedCategory = ref('add-2-2')
const selectedLevel = ref(1)
const questionCount = ref(20)

const session = ref<TrainingConfig | null>(null)
const sessionKey = ref(0)

const groups = computed(() => {
  const ops = [
    { label: '加法', keys: ['add-2-2', 'add-3-3', 'add-multi', 'add-dec'] },
    { label: '减法', keys: ['sub-2', 'sub-3', 'sub-multi', 'sub-dec'] },
    { label: '乘法', keys: ['mul-table', 'mul-2-1', 'mul-2-2', 'mul-3-2', 'mul-dec'] },
    { label: '除法', keys: ['div-exact', 'div-rem', 'div-2-1', 'div-3-2', 'div-dec'] },
    { label: '混合运算', keys: ['mix-addsub', 'mix-muldiv', 'mix-all', 'mix-bracket'] }
  ]
  return ops.map((g) => ({
    label: g.label,
    options: g.keys.map((k) => ({ value: k, label: CATEGORY_MAP[k].label }))
  }))
})

const selectedMeta = computed(() => CATEGORY_MAP[selectedCategory.value])

function start(): void {
  if (mode.value === 'category') {
    const meta = CATEGORY_MAP[selectedCategory.value]
    session.value = {
      mode: 'practice',
      source: 'category',
      category: selectedCategory.value,
      difficulty: meta.difficulty,
      questionCount: questionCount.value,
      timedSeconds: 0,
      autoNext: settings.autoNext,
      label: meta.label
    }
  } else {
    session.value = {
      mode: 'practice',
      source: 'level',
      difficulty: selectedLevel.value,
      questionCount: questionCount.value,
      timedSeconds: 0,
      autoNext: settings.autoNext,
      label: DIFFICULTY_LABELS[selectedLevel.value]
    }
  }
  sessionKey.value++
}
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">基础训练</h1>
      <p class="page-desc">按题型或难度进行四则运算专项训练。</p>
    </div>

    <TrainingPanel
      v-if="session"
      :key="sessionKey"
      :config="session"
      @close="session = null"
    />

    <div v-else class="card setup">
      <div class="setup-row">
        <span class="setup-label">训练方式</span>
        <el-radio-group v-model="mode">
          <el-radio-button value="category">按题型</el-radio-button>
          <el-radio-button value="level">按难度</el-radio-button>
        </el-radio-group>
      </div>

      <div class="setup-row">
        <span class="setup-label">{{ mode === 'category' ? '选择题型' : '难度等级' }}</span>
        <el-select v-if="mode === 'category'" v-model="selectedCategory" style="width: 240px" placeholder="选择题型">
          <el-option-group v-for="g in groups" :key="g.label" :label="g.label">
            <el-option v-for="o in g.options" :key="o.value" :value="o.value" :label="o.label" />
          </el-option-group>
        </el-select>
        <div v-else class="level-list">
          <el-radio-group v-model="selectedLevel">
            <el-radio-button v-for="l in DIFFICULTY_LIST" :key="l" :value="l">{{ l }}</el-radio-button>
          </el-radio-group>
          <span class="level-hint muted">{{ DIFFICULTY_LABELS[selectedLevel] }}</span>
        </div>
      </div>

      <div v-if="mode === 'category'" class="setup-row">
        <span class="setup-label">难度</span>
        <el-tag size="small" effect="plain">L{{ selectedMeta.difficulty }}</el-tag>
      </div>

      <div class="setup-row">
        <span class="setup-label">题目数量</span>
        <el-radio-group v-model="questionCount">
          <el-radio-button :value="10">10</el-radio-button>
          <el-radio-button :value="20">20</el-radio-button>
          <el-radio-button :value="30">30</el-radio-button>
          <el-radio-button :value="50">50</el-radio-button>
        </el-radio-group>
      </div>

      <div class="setup-actions">
        <el-button type="primary" size="large" @click="start">开始训练</el-button>
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
  width: 76px;
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
