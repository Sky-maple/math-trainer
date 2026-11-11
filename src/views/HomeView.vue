<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { useRouter } from 'vue-router'
import StatCard from '@/components/StatCard.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import { chartColors } from '@/components/charts/palette'
import {
  todayStat,
  totalQuestions,
  streakDays,
  lastNDays,
  allRecords,
  allMistakes
} from '@/stores/history'
import { recommend } from '@/core/adaptive'
import { settings } from '@/stores/settings'
import { formatPercent, formatSeconds } from '@/utils'
import { VideoPlay, Timer, Notebook, MagicStick } from '@element-plus/icons-vue'

const router = useRouter()

const today = computed(() => todayStat())
const totalQ = computed(() => totalQuestions())
const streak = computed(() => streakDays())
const recent = computed(() => allRecords().slice(-5).reverse())
const advice = computed(() => recommend(allRecords(), allMistakes(), settings.currentLevel))

const trendOption = computed<EChartsOption>(() => {
  const c = chartColors()
  const days = lastNDays(7)
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['答题数', '正确率'], textStyle: { color: c.text } },
    grid: { left: 44, right: 44, top: 40, bottom: 28 },
    xAxis: {
      type: 'category',
      data: days.map((d) => d.label),
      axisLine: { lineStyle: { color: c.axis } },
      axisLabel: { color: c.text }
    },
    yAxis: [
      {
        type: 'value',
        name: '题数',
        nameTextStyle: { color: c.text },
        axisLabel: { color: c.text },
        splitLine: { lineStyle: { color: c.split } }
      },
      {
        type: 'value',
        name: '正确率',
        max: 100,
        nameTextStyle: { color: c.text },
        axisLabel: { color: c.text, formatter: '{value}%' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '答题数',
        type: 'bar',
        barMaxWidth: 26,
        data: days.map((d) => d.questions),
        itemStyle: { color: c.primary, borderRadius: [4, 4, 0, 0] }
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: days.map((d) => Math.round(d.accuracy * 100)),
        itemStyle: { color: c.success },
        lineStyle: { color: c.success }
      }
    ]
  }
})

const quick = [
  { path: '/train', label: '基础训练', desc: '四则运算专项', icon: VideoPlay },
  { path: '/timed', label: '限时挑战', desc: '30秒~5分钟', icon: Timer },
  { path: '/mistakes', label: '错题本', desc: '查漏补缺', icon: Notebook },
  { path: '/smart', label: '智能训练', desc: '自适应难度', icon: MagicStick }
]

const modeLabel: Record<string, string> = {
  practice: '基础训练',
  timed: '限时挑战',
  smart: '智能训练',
  mistake: '错题重练'
}
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-desc">每天练一点，数字更敏感。</p>
    </div>

    <div class="stat-grid">
      <StatCard label="今日训练次数" :value="String(today.count)" sub="次" />
      <StatCard label="今日答题数量" :value="String(today.questions)" sub="题" />
      <StatCard label="今日正确率" :value="today.questions ? formatPercent(today.accuracy) : '—'" :color="today.questions && today.accuracy >= 0.8 ? 'var(--success)' : today.questions ? 'var(--warning)' : undefined" />
      <StatCard label="平均答题时间" :value="today.questions ? formatSeconds(today.avgTimeMs) + 's' : '—'" />
      <StatCard label="连续训练天数" :value="String(streak)" sub="天" />
      <StatCard label="累计训练题目" :value="String(totalQ)" sub="题" />
    </div>

    <div class="home-grid">
      <div class="card">
        <h2 class="card-title">最近 7 天训练趋势</h2>
        <BaseChart v-if="totalQ > 0" :option="trendOption" height="280px" />
        <div v-else class="empty muted">还没有训练记录，先去练一组吧。</div>
      </div>

      <div class="card">
        <h2 class="card-title">智能建议</h2>
        <p class="advice-msg">{{ advice.message }}</p>
        <div class="advice-meta muted">
          <template v-if="advice.recentAccuracy != null">近 {{ advice.recentCount }} 题正确率 {{ formatPercent(advice.recentAccuracy) }}</template>
        </div>
        <el-button type="primary" class="mt-8" @click="router.push('/smart')">去智能训练</el-button>
      </div>
    </div>

    <div class="card mt-16">
      <h2 class="card-title">快速开始</h2>
      <div class="quick-grid">
        <button v-for="q in quick" :key="q.path" class="quick-item" @click="router.push(q.path)">
          <el-icon class="quick-icon"><component :is="q.icon" /></el-icon>
          <span class="quick-label">{{ q.label }}</span>
          <span class="quick-desc">{{ q.desc }}</span>
        </button>
      </div>
    </div>

    <div class="card mt-16">
      <h2 class="card-title">最近训练</h2>
      <el-empty v-if="recent.length === 0" description="暂无训练记录" :image-size="80" />
      <div v-else class="recent-list">
        <div v-for="r in recent" :key="r.id" class="recent-item">
          <div class="recent-main">
            <span class="recent-mode">{{ modeLabel[r.mode] ?? r.mode }}</span>
            <span class="recent-cat muted">{{ r.categoryLabel }}</span>
          </div>
          <div class="recent-right">
            <span class="mono" :style="{ color: r.accuracy >= 0.8 ? 'var(--success)' : 'var(--warning)' }">
              {{ formatPercent(r.accuracy) }}
            </span>
            <span class="muted recent-date">{{ r.date }} · {{ r.questionCount }}题</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.home-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.advice-msg {
  font-size: 14px;
  line-height: 1.6;
}
.advice-meta {
  font-size: 12px;
  margin-top: 4px;
}
.empty {
  text-align: center;
  padding: 40px 0;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s, transform 0.15s;
}
.quick-item:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.quick-icon {
  font-size: 26px;
  color: var(--primary);
}
.quick-label {
  font-weight: 500;
  font-size: 14px;
}
.quick-desc {
  font-size: 12px;
  color: var(--text-3);
}
.recent-list {
  display: flex;
  flex-direction: column;
}
.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}
.recent-item:last-child {
  border-bottom: none;
}
.recent-main {
  display: flex;
  gap: 10px;
  align-items: center;
}
.recent-mode {
  font-weight: 500;
}
.recent-cat {
  font-size: 13px;
}
.recent-right {
  display: flex;
  gap: 14px;
  align-items: center;
}
.recent-date {
  font-size: 12px;
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .home-grid {
    grid-template-columns: 1fr;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
