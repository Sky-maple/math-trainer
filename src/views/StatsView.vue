<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/charts/BaseChart.vue'
import { chartColors } from '@/components/charts/palette'
import {
  allRecords,
  lastNDays,
  weeklyStats,
  monthlyStats,
  categoryStats,
  modeStats
} from '@/stores/history'
import { formatPercent, formatSeconds } from '@/utils'

const range = ref<'day' | 'week' | 'month'>('day')

const trendData = computed(() => {
  if (range.value === 'week') {
    const d = weeklyStats()
    return { labels: d.map((x) => x.label), questions: d.map((x) => x.questions), accuracy: d.map((x) => Math.round(x.accuracy * 100)) }
  }
  if (range.value === 'month') {
    const d = monthlyStats()
    return { labels: d.map((x) => x.month), questions: d.map((x) => x.questions), accuracy: d.map((x) => Math.round(x.accuracy * 100)) }
  }
  const d = lastNDays(30)
  return { labels: d.map((x) => x.label), questions: d.map((x) => x.questions), accuracy: d.map((x) => Math.round(x.accuracy * 100)) }
})

const trendOption = computed<EChartsOption>(() => {
  const c = chartColors()
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['答题数', '正确率'], textStyle: { color: c.text } },
    grid: { left: 44, right: 44, top: 40, bottom: 28 },
    xAxis: {
      type: 'category',
      data: trendData.value.labels,
      axisLine: { lineStyle: { color: c.axis } },
      axisLabel: { color: c.text, rotate: trendData.value.labels.length > 10 ? 45 : 0 }
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
        barMaxWidth: 18,
        data: trendData.value.questions,
        itemStyle: { color: c.primary, borderRadius: [4, 4, 0, 0] }
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: trendData.value.accuracy,
        itemStyle: { color: c.success },
        lineStyle: { color: c.success }
      }
    ]
  }
})

const catData = computed(() => categoryStats().slice(0, 10).reverse())
const catOption = computed<EChartsOption>(() => {
  const c = chartColors()
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 40, top: 20, bottom: 28 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: c.text, formatter: '{value}%' },
      splitLine: { lineStyle: { color: c.split } }
    },
    yAxis: {
      type: 'category',
      data: catData.value.map((x) => x.label),
      axisLine: { lineStyle: { color: c.axis } },
      axisLabel: { color: c.text }
    },
    series: [
      {
        name: '正确率',
        type: 'bar',
        barMaxWidth: 18,
        data: catData.value.map((x) => Math.round(x.accuracy * 100)),
        itemStyle: { color: c.warning, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: c.text, formatter: '{c}%' }
      }
    ]
  }
})

const modeOption = computed<EChartsOption>(() => {
  const c = chartColors()
  const data = modeStats().map((x) => ({ name: x.label, value: x.questions }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 题 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: c.text } },
    series: [
      {
        name: '训练模式',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: c.split, borderWidth: 2 },
        label: { color: c.text },
        data
      }
    ]
  }
})

const records = computed(() => allRecords().slice().reverse())
const hasData = computed(() => allRecords().length > 0)

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
      <h1 class="page-title">成绩统计</h1>
      <p class="page-desc">每日 / 每周 / 每月的数据与题型表现。</p>
    </div>

    <el-empty v-if="!hasData" description="暂无训练数据，先去练一组吧" :image-size="120" />

    <template v-else>
      <div class="card">
        <div class="flex items-center justify-between">
          <h2 class="card-title" style="margin: 0">训练趋势</h2>
          <el-radio-group v-model="range" size="small">
            <el-radio-button value="day">每日</el-radio-button>
            <el-radio-button value="week">每周</el-radio-button>
            <el-radio-button value="month">每月</el-radio-button>
          </el-radio-group>
        </div>
        <BaseChart class="mt-16" :option="trendOption" height="300px" />
      </div>

      <div class="stats-grid mt-16">
        <div class="card">
          <h2 class="card-title">题型正确率</h2>
          <BaseChart v-if="catData.length" :option="catOption" height="280px" />
          <div v-else class="muted text-center">暂无数据</div>
        </div>
        <div class="card">
          <h2 class="card-title">训练模式分布</h2>
          <BaseChart :option="modeOption" height="280px" />
        </div>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">训练记录</h2>
        <el-table :data="records" stripe style="width: 100%">
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column label="模式" width="100">
            <template #default="{ row }">{{ modeLabel[row.mode] ?? row.mode }}</template>
          </el-table-column>
          <el-table-column prop="categoryLabel" label="内容" min-width="140" />
          <el-table-column label="难度" width="70">
            <template #default="{ row }">L{{ row.difficulty }}</template>
          </el-table-column>
          <el-table-column prop="questionCount" label="题数" width="70" />
          <el-table-column prop="correctCount" label="正确" width="70" />
          <el-table-column prop="wrongCount" label="错误" width="70" />
          <el-table-column label="正确率" width="90">
            <template #default="{ row }">
              <span :style="{ color: row.accuracy >= 0.8 ? 'var(--success)' : 'var(--warning)' }">
                {{ formatPercent(row.accuracy) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="平均用时" width="90">
            <template #default="{ row }">{{ formatSeconds(row.avgTimeMs) }}s</template>
          </el-table-column>
          <el-table-column label="最快" width="80">
            <template #default="{ row }">{{ formatSeconds(row.fastestTimeMs) }}s</template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 800px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
