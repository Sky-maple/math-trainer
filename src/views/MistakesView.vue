<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import TrainingPanel from '@/components/training/TrainingPanel.vue'
import type { TrainingConfig } from '@/composables/useTraining'
import {
  allMistakes,
  setMistakeMastered,
  removeMistake,
  clearMistakes
} from '@/stores/history'
import { CATEGORY_MAP } from '@/core/generator'
import { settings } from '@/stores/settings'
import { ArrowDown, ArrowRight, Refresh, CircleCheck, Delete, MagicStick } from '@element-plus/icons-vue'

const filter = ref<'all' | 'unmastered' | 'mastered'>('all')
const expanded = ref<Set<string>>(new Set())
const session = ref<TrainingConfig | null>(null)
const sessionKey = ref(0)

const list = computed(() => {
  const all = allMistakes()
  if (filter.value === 'unmastered') return all.filter((m) => !m.mastered)
  if (filter.value === 'mastered') return all.filter((m) => m.mastered)
  return all
})

const unmasteredCount = computed(() => allMistakes().filter((m) => !m.mastered).length)

function toggleExpand(id: string): void {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expanded.value = s
}

function practiceCategory(category: string): void {
  const meta = CATEGORY_MAP[category]
  session.value = {
    mode: 'mistake',
    source: 'category',
    category,
    difficulty: meta?.difficulty ?? 3,
    questionCount: 10,
    timedSeconds: 0,
    autoNext: settings.autoNext,
    label: (meta?.label ?? category) + ' · 错题重练'
  }
  sessionKey.value++
}

function practiceAll(): void {
  const cats = [...new Set(allMistakes().filter((m) => !m.mastered).map((m) => m.category))]
  if (cats.length === 0) {
    ElMessage.warning('没有未掌握的错题')
    return
  }
  session.value = {
    mode: 'mistake',
    source: 'set',
    categories: cats,
    difficulty: 3,
    questionCount: 15,
    timedSeconds: 0,
    autoNext: settings.autoNext,
    label: '错题专项训练'
  }
  sessionKey.value++
}

function toggleMastered(id: string, current: boolean): void {
  setMistakeMastered(id, !current)
  ElMessage.success(current ? '已取消掌握' : '已标记掌握')
}

function onDelete(id: string): void {
  ElMessageBox.confirm('确定删除这道错题吗？', '提示', { type: 'warning' })
    .then(() => {
      removeMistake(id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function onClearAll(): void {
  ElMessageBox.confirm('确定清空全部错题吗？此操作不可恢复。', '清空错题本', { type: 'warning' })
    .then(() => {
      clearMistakes()
      ElMessage.success('已清空')
    })
    .catch(() => {})
}
</script>

<template>
  <div>
    <div class="page-head flex items-center justify-between">
      <div>
        <h1 class="page-title">错题本</h1>
        <p class="page-desc">答错的题会自动记录在这里，含解析，可重练。</p>
      </div>
      <div class="flex gap-8">
        <el-button type="primary" :icon="MagicStick" :disabled="unmasteredCount === 0" @click="practiceAll">
          专项训练
        </el-button>
        <el-button v-if="allMistakes().length" :icon="Delete" @click="onClearAll">清空</el-button>
      </div>
    </div>

    <TrainingPanel v-if="session" :key="sessionKey" :config="session" @close="session = null" />

    <template v-else>
      <div class="card">
        <div class="filter-bar">
          <el-radio-group v-model="filter" size="small">
            <el-radio-button value="all">全部（{{ allMistakes().length }}）</el-radio-button>
            <el-radio-button value="unmastered">未掌握（{{ unmasteredCount }}）</el-radio-button>
            <el-radio-button value="mastered">已掌握</el-radio-button>
          </el-radio-group>
        </div>

        <el-empty v-if="list.length === 0" description="太棒了，暂无错题" :image-size="100" />

        <div v-else class="mistake-list">
          <div v-for="m in list" :key="m.id" class="mistake-item" :class="{ mastered: m.mastered }">
            <div class="mi-main" @click="toggleExpand(m.id)">
              <span class="mi-expr mono">{{ m.expr }} = <b>{{ m.answerDisplay }}</b></span>
              <div class="mi-tags">
                <el-tag size="small" type="info" effect="plain">{{ m.categoryLabel }}</el-tag>
                <el-tag size="small" type="danger" effect="plain">错 {{ m.wrongCount }} 次</el-tag>
                <el-tag v-if="m.mastered" size="small" type="success" effect="plain">已掌握</el-tag>
              </div>
              <el-icon class="mi-arrow" :class="{ open: expanded.has(m.id) }">
                <ArrowRight />
              </el-icon>
            </div>

            <transition name="fade">
              <div v-if="expanded.has(m.id)" class="mi-detail">
                <div v-for="(s, i) in m.steps" :key="i" class="mi-step mono">{{ s }}</div>
              </div>
            </transition>

            <div class="mi-actions">
              <el-button size="small" :icon="Refresh" @click="practiceCategory(m.category)">练此题类型</el-button>
              <el-button size="small" :icon="CircleCheck" @click="toggleMastered(m.id, m.mastered)">
                {{ m.mastered ? '取消掌握' : '标记掌握' }}
              </el-button>
              <el-button size="small" :icon="Delete" @click="onDelete(m.id)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-bar {
  margin-bottom: 16px;
}
.mistake-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mistake-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  transition: opacity 0.2s;
}
.mistake-item.mastered {
  opacity: 0.6;
}
.mi-main {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex-wrap: wrap;
}
.mi-expr {
  font-size: 17px;
  font-weight: 500;
}
.mi-tags {
  display: flex;
  gap: 6px;
  flex: 1;
}
.mi-arrow {
  color: var(--text-3);
  transition: transform 0.2s;
}
.mi-arrow.open {
  transform: rotate(90deg);
}
.mi-detail {
  margin-top: 10px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mi-step {
  font-size: 13px;
  color: var(--text-2);
}
.mi-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
