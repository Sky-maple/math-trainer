<script setup lang="ts">
import { ref, computed } from 'vue'
import TrainingPanel from '@/components/training/TrainingPanel.vue'
import type { TrainingConfig } from '@/composables/useTraining'
import { recommend } from '@/core/adaptive'
import { allRecords, allMistakes, categoryStats } from '@/stores/history'
import { settings, updateSettings } from '@/stores/settings'
import { CATEGORY_MAP, DIFFICULTY_LABELS } from '@/core/generator'
import { formatPercent } from '@/utils'
import { MagicStick, VideoPlay } from '@element-plus/icons-vue'

const session = ref<TrainingConfig | null>(null)
const sessionKey = ref(0)

const advice = computed(() => recommend(allRecords(), allMistakes(), settings.currentLevel))
const focusMeta = computed(() => advice.value.focusCategories.map((c) => CATEGORY_MAP[c]).filter(Boolean))
const catStats = computed(() => categoryStats())

function startLevel(level: number): void {
  updateSettings({ currentLevel: level })
  session.value = {
    mode: 'smart',
    source: 'level',
    difficulty: level,
    questionCount: 20,
    timedSeconds: 0,
    autoNext: settings.autoNext,
    label: DIFFICULTY_LABELS[level] + ' · 智能训练'
  }
  sessionKey.value++
}

function startFocus(): void {
  const cats = advice.value.focusCategories
  if (cats.length === 0) return
  session.value = {
    mode: 'smart',
    source: 'set',
    categories: cats,
    difficulty: settings.currentLevel,
    questionCount: 15,
    timedSeconds: 0,
    autoNext: settings.autoNext,
    label: '薄弱题型专项'
  }
  sessionKey.value++
}

const levelDesc: Record<number, string> = {
  1: '基础入门，简单加减法',
  2: '基础进阶，两位数四则运算',
  3: '熟练训练，三位数、小数运算',
  4: '高级训练，多位数及混合运算',
  5: '挑战模式，复杂心算与快速计算'
}
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">智能训练</h1>
      <p class="page-desc">根据你最近的表现自动调整难度，并锁定薄弱题型专项突破。</p>
    </div>

    <TrainingPanel v-if="session" :key="sessionKey" :config="session" @close="session = null" />

    <template v-else>
      <div class="card advice-card">
        <div class="advice-head">
          <el-icon class="advice-icon"><MagicStick /></el-icon>
          <div>
            <div class="advice-title">智能建议</div>
            <div class="advice-msg">{{ advice.message }}</div>
          </div>
        </div>

        <div v-if="advice.recentAccuracy != null" class="advice-stat">
          <div class="advice-stat-item">
            <div class="asi-val mono">{{ formatPercent(advice.recentAccuracy) }}</div>
            <div class="asi-label">近 {{ advice.recentCount }} 题正确率</div>
          </div>
          <div class="advice-stat-item">
            <div class="asi-val mono">L{{ advice.recommendedLevel }}</div>
            <div class="asi-label">推荐难度</div>
          </div>
        </div>

        <div class="advice-actions">
          <el-button type="primary" size="large" :icon="VideoPlay" @click="startLevel(advice.recommendedLevel)">
            按推荐难度 L{{ advice.recommendedLevel }} 训练
          </el-button>
          <el-button
            v-if="focusMeta.length"
            size="large"
            :icon="MagicStick"
            @click="startFocus"
          >
            薄弱专项训练
          </el-button>
        </div>

        <div v-if="focusMeta.length" class="focus-tags mt-16">
          <span class="muted">薄弱题型：</span>
          <el-tag v-for="f in focusMeta" :key="f.key" type="danger" effect="plain">{{ f.label }}</el-tag>
        </div>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">难度等级</h2>
        <div class="level-cards">
          <button
            v-for="l in [1, 2, 3, 4, 5]"
            :key="l"
            class="level-card"
            :class="{ active: l === settings.currentLevel }"
            @click="startLevel(l)"
          >
            <div class="lc-name">L{{ l }}</div>
            <div class="lc-desc">{{ levelDesc[l] }}</div>
          </button>
        </div>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">自适应规则</h2>
        <ul class="rule-list">
          <li>近 20 题正确率 <b>低于 70%</b> → 自动降低一个难度。</li>
          <li>近 20 题正确率 <b>达到 90%</b> 以上 → 逐步增加难度。</li>
          <li>某类计算近 30 题中错误率 ≥ 50% 且错 ≥ 2 次 → 自动纳入专项练习。</li>
        </ul>
      </div>

      <div v-if="catStats.length" class="card mt-16">
        <h2 class="card-title">各题型正确率</h2>
        <div class="cat-list">
          <div v-for="c in catStats" :key="c.category" class="cat-row">
            <span class="cat-label">{{ c.label }}</span>
            <el-progress
              class="cat-bar"
              :percentage="Math.round(c.accuracy * 100)"
              :stroke-width="10"
              :color="c.accuracy >= 0.8 ? '#1d9e75' : c.accuracy >= 0.6 ? '#ba7517' : '#e24b4a'"
            />
            <span class="cat-pct mono">{{ c.questions }}题</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.advice-card {
  background: var(--surface);
}
.advice-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.advice-icon {
  font-size: 26px;
  color: var(--primary);
  margin-top: 2px;
}
.advice-title {
  font-size: 16px;
  font-weight: 600;
}
.advice-msg {
  margin-top: 4px;
  color: var(--text-2);
}
.advice-stat {
  display: flex;
  gap: 40px;
  margin-top: 20px;
}
.asi-val {
  font-size: 30px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.1;
}
.asi-label {
  font-size: 12px;
  color: var(--text-2);
}
.advice-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.focus-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.level-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.level-card {
  text-align: center;
  padding: 16px 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s;
}
.level-card:hover {
  border-color: var(--primary);
}
.level-card.active {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.lc-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}
.lc-desc {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 6px;
}
.rule-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-2);
  line-height: 2;
}
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cat-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cat-label {
  width: 130px;
  flex-shrink: 0;
  font-size: 13px;
}
.cat-bar {
  flex: 1;
}
.cat-pct {
  width: 60px;
  text-align: right;
  font-size: 13px;
  color: var(--text-2);
}
@media (max-width: 720px) {
  .level-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
