<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  allTechniqueMistakes,
  setTechniqueMistakeMastered,
  removeTechniqueMistake,
  clearTechniqueMistakes
} from '@/stores/techniqueMastery'
import { Back, ArrowRight, Refresh, CircleCheck, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const filter = ref<'all' | 'unmastered' | 'mastered'>('all')
const expanded = ref<Set<string>>(new Set())

const list = computed(() => {
  const all = allTechniqueMistakes()
  if (filter.value === 'unmastered') return all.filter((m) => !m.mastered)
  if (filter.value === 'mastered') return all.filter((m) => m.mastered)
  return all
})

const unmastered = computed(() => allTechniqueMistakes().filter((m) => !m.mastered).length)

function toggleExpand(id: string): void {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expanded.value = s
}

function practice(techniqueId: string): void {
  router.push(`/techniques/${techniqueId}/practice`)
}

function toggleMastered(id: string, current: boolean): void {
  setTechniqueMistakeMastered(id, !current)
  ElMessage.success(current ? '已取消掌握' : '已标记掌握')
}

function onDelete(id: string): void {
  ElMessageBox.confirm('确定删除这道错题吗？', '提示', { type: 'warning' })
    .then(() => {
      removeTechniqueMistake(id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function onClearAll(): void {
  ElMessageBox.confirm('确定清空全部技巧错题吗？此操作不可恢复。', '清空错题本', { type: 'warning' })
    .then(() => {
      clearTechniqueMistakes()
      ElMessage.success('已清空')
    })
    .catch(() => {})
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="crumb muted" @click="router.push('/techniques')">
        <el-icon><Back /></el-icon> 心算技巧中心 / 技巧错题本
      </div>
      <div class="head-row">
        <div>
          <h1 class="page-title">技巧错题本</h1>
          <p class="page-desc">专项练习中答错的题会按技巧记录在这里，附完整解析。</p>
        </div>
        <el-button v-if="allTechniqueMistakes().length" :icon="Delete" @click="onClearAll">清空</el-button>
      </div>
    </div>

    <div class="card">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="all">全部（{{ allTechniqueMistakes().length }}）</el-radio-button>
        <el-radio-button value="unmastered">未掌握（{{ unmastered }}）</el-radio-button>
        <el-radio-button value="mastered">已掌握</el-radio-button>
      </el-radio-group>

      <el-empty v-if="list.length === 0" description="暂无技巧错题，继续保持" :image-size="100" />

      <div v-else class="list">
        <div v-for="m in list" :key="m.id" class="item" :class="{ mastered: m.mastered }">
          <div class="item-main" @click="toggleExpand(m.id)">
            <el-tag size="small" effect="plain">{{ m.techniqueName }}</el-tag>
            <span class="expr mono">{{ m.expr }} = <b>{{ m.answerDisplay }}</b></span>
            <el-tag size="small" type="danger" effect="plain">错 {{ m.wrongCount }} 次</el-tag>
            <el-tag v-if="m.mastered" size="small" type="success" effect="plain">已掌握</el-tag>
            <el-icon class="arrow" :class="{ open: expanded.has(m.id) }"><ArrowRight /></el-icon>
          </div>

          <transition name="fade">
            <div v-if="expanded.has(m.id)" class="detail">
              <div v-for="(s, i) in m.steps" :key="i" class="step mono">{{ s }}</div>
            </div>
          </transition>

          <div class="actions">
            <el-button size="small" :icon="Refresh" @click="practice(m.techniqueId)">练此题类型</el-button>
            <el-button size="small" :icon="CircleCheck" @click="toggleMastered(m.id, m.mastered)">
              {{ m.mastered ? '取消掌握' : '标记掌握' }}
            </el-button>
            <el-button size="small" :icon="Delete" @click="onDelete(m.id)">删除</el-button>
          </div>
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
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
}
.item.mastered {
  opacity: 0.6;
}
.item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-wrap: wrap;
}
.expr {
  font-size: 16px;
  font-weight: 500;
  flex: 1;
  min-width: 140px;
}
.arrow {
  color: var(--text-3);
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(90deg);
}
.detail {
  margin-top: 10px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step {
  font-size: 13px;
  color: var(--text-2);
}
.actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
