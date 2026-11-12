<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MasteryBadge from '@/components/technique/MasteryBadge.vue'
import { TECHNIQUES } from '@/core/techniques/catalog'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/core/techniques/types'
import { masteryOf, levelOf, accuracyOf, avgTimeOf, MASTERY_LEVELS, MASTERY_COLOR } from '@/stores/techniqueMastery'
import { formatSeconds, formatPercent, dateKey } from '@/utils'
import { Back } from '@element-plus/icons-vue'

const router = useRouter()

const groups = computed(() =>
  CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: TECHNIQUES.filter((t) => t.category === cat).map((t) => {
      const m = masteryOf(t.id)
      return { t, m, level: levelOf(m), acc: accuracyOf(m), avg: avgTimeOf(m) }
    })
  }))
)

const summary = computed(() => {
  let learned = 0
  let practice = 0
  let correct = 0
  let advanced = 0
  for (const t of TECHNIQUES) {
    const m = masteryOf(t.id)
    if (m.learned) learned++
    practice += m.practiceCount
    correct += m.correctCount
    const lv = levelOf(m)
    if (lv === '熟练掌握' || lv === '精通') advanced++
  }
  return {
    learned,
    practice,
    accuracy: practice ? correct / practice : 0,
    advanced,
    total: TECHNIQUES.length
  }
})

const levelDist = computed(() => {
  const dist: Record<string, number> = {}
  for (const l of MASTERY_LEVELS) dist[l] = 0
  for (const t of TECHNIQUES) dist[levelOf(masteryOf(t.id))]++
  return MASTERY_LEVELS.map((l) => ({ level: l, count: dist[l] }))
})
</script>

<template>
  <div>
    <div class="page-head">
      <div class="crumb muted" @click="router.push('/techniques')">
        <el-icon><Back /></el-icon> 心算技巧中心 / 技巧掌握度
      </div>
      <h1 class="page-title">技巧掌握度</h1>
      <p class="page-desc">每个技巧独立记录练习量、正确率与用时，综合评估掌握等级。</p>
    </div>

    <div class="summary">
      <div class="card sum-item">
        <div class="sum-val mono">{{ summary.learned }} / {{ summary.total }}</div>
        <div class="sum-label">已开始学习</div>
      </div>
      <div class="card sum-item">
        <div class="sum-val mono">{{ summary.practice }}</div>
        <div class="sum-label">累计练习题数</div>
      </div>
      <div class="card sum-item">
        <div class="sum-val mono" style="color: var(--success)">{{ summary.practice ? formatPercent(summary.accuracy) : '—' }}</div>
        <div class="sum-label">总体正确率</div>
      </div>
      <div class="card sum-item">
        <div class="sum-val mono" style="color: var(--primary)">{{ summary.advanced }}</div>
        <div class="sum-label">熟练掌握及以上</div>
      </div>
    </div>

    <div class="card mt-16">
      <h2 class="card-title">等级分布</h2>
      <div class="dist">
        <div v-for="d in levelDist" :key="d.level" class="dist-item">
          <span class="dot" :style="{ background: MASTERY_COLOR[d.level] }"></span>
          <span class="dist-level">{{ d.level }}</span>
          <el-progress
            :percentage="Math.round((d.count / summary.total) * 100)"
            :stroke-width="10"
            :show-text="false"
            class="dist-bar"
          />
          <span class="dist-count mono">{{ d.count }}</span>
        </div>
      </div>
      <div class="note muted">
        等级规则：≥10 题且正确率 ≥60% → 初步掌握；≥25 题且 ≥80% → 熟练掌握；≥50 题且 ≥90% 且足够快 → 精通。样本不足时不会直接判为精通。
      </div>
    </div>

    <div v-for="g in groups" :key="g.cat" class="group">
      <div class="group-title">{{ g.label }}</div>
      <div class="table card">
        <div class="tr head">
          <span class="c-name">技巧</span>
          <span class="c-level">等级</span>
          <span class="c-count">练习</span>
          <span class="c-acc">正确率</span>
          <span class="c-time">平均用时</span>
          <span class="c-date">最近训练</span>
          <span class="c-act"></span>
        </div>
        <div v-for="it in g.items" :key="it.t.id" class="tr">
          <span class="c-name name">{{ it.t.name }}</span>
          <span class="c-level"><MasteryBadge :technique-id="it.t.id" /></span>
          <span class="c-count mono">{{ it.m.practiceCount }}</span>
          <span class="c-acc">
            <span class="acc-wrap">
              <el-progress
                :percentage="Math.round(it.acc * 100)"
                :stroke-width="8"
                :show-text="false"
                :color="it.acc >= 0.8 ? '#1d9e75' : it.acc >= 0.6 ? '#ba7517' : '#e24b4a'"
                class="acc-bar"
              />
              <span class="acc-num mono">{{ it.m.practiceCount ? formatPercent(it.acc) : '—' }}</span>
            </span>
          </span>
          <span class="c-time mono">{{ it.m.practiceCount ? formatSeconds(it.avg) + 's' : '—' }}</span>
          <span class="c-date muted">{{ it.m.lastPracticeAt ? dateKey(new Date(it.m.lastPracticeAt)) : '—' }}</span>
          <span class="c-act">
            <el-button size="small" type="primary" plain @click="router.push(`/techniques/${it.t.id}/practice`)">练习</el-button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 6px;
}
.crumb:hover {
  color: var(--primary);
}
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.sum-item {
  text-align: center;
  padding: 16px;
}
.sum-val {
  font-size: 24px;
  font-weight: 700;
}
.sum-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}
.dist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dist-level {
  width: 72px;
  font-size: 13px;
}
.dist-bar {
  flex: 1;
}
.dist-count {
  width: 30px;
  text-align: right;
  font-size: 13px;
  color: var(--text-2);
}
.note {
  font-size: 12px;
  margin-top: 14px;
  line-height: 1.7;
}
.group {
  margin-top: 20px;
}
.group-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}
.table {
  padding: 4px 14px;
}
.tr {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 0.6fr 1.4fr 0.9fr 1fr 0.7fr;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.tr:last-child {
  border-bottom: none;
}
.tr.head {
  font-size: 12px;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
}
.name {
  font-weight: 500;
}
.acc-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.acc-bar {
  flex: 1;
}
.acc-num {
  width: 34px;
  text-align: right;
}
@media (max-width: 860px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
  .tr {
    grid-template-columns: 1.3fr 0.9fr 0.5fr 1.2fr;
  }
  .c-time,
  .c-date,
  .c-act {
    display: none;
  }
}
</style>
