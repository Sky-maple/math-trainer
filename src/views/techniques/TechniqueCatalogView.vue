<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MasteryBadge from '@/components/technique/MasteryBadge.vue'
import { TECHNIQUES } from '@/core/techniques/catalog'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/core/techniques/types'
import { recommendTechniques, learnedCount, masteryLevelOf } from '@/stores/techniqueMastery'
import { Right, MagicStick, Trophy, DataAnalysis, Warning } from '@element-plus/icons-vue'

const router = useRouter()

const grouped = computed(() =>
  CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: TECHNIQUES.filter((t) => t.category === cat)
  }))
)

const recs = computed(() =>
  recommendTechniques(3)
    .map((r) => ({ ...r, technique: TECHNIQUES.find((t) => t.id === r.techniqueId)! }))
    .filter((r) => r.technique)
)

const learned = computed(() => learnedCount())
const mastered = computed(() => TECHNIQUES.filter((t) => masteryLevelOf(t.id) === '熟练掌握' || masteryLevelOf(t.id) === '精通').length)
</script>

<template>
  <div>
    <div class="page-head">
      <h1 class="page-title">心算技巧中心</h1>
      <p class="page-desc">每天 10 分钟，系统学习心算技巧：先懂原理，再专项练习，最后限时提速。</p>
    </div>

    <!-- 概览 -->
    <div class="overview">
      <div class="ov-item card">
        <div class="ov-val mono">{{ TECHNIQUES.length }}</div>
        <div class="ov-label">技巧总数</div>
      </div>
      <div class="ov-item card">
        <div class="ov-val mono" style="color: var(--primary)">{{ learned }}</div>
        <div class="ov-label">已开始学习</div>
      </div>
      <div class="ov-item card">
        <div class="ov-val mono" style="color: var(--success)">{{ mastered }}</div>
        <div class="ov-label">熟练掌握及以上</div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="quick">
      <button class="quick-card" @click="router.push('/techniques/challenge')">
        <el-icon class="qc-icon"><Trophy /></el-icon>
        <span>技巧闯关</span>
        <span class="qc-desc">按技巧依次挑战</span>
      </button>
      <button class="quick-card" @click="router.push('/techniques/mastery')">
        <el-icon class="qc-icon"><DataAnalysis /></el-icon>
        <span>技巧掌握度</span>
        <span class="qc-desc">查看学习进度</span>
      </button>
      <button class="quick-card" @click="router.push('/techniques/mistakes')">
        <el-icon class="qc-icon"><Warning /></el-icon>
        <span>技巧错题本</span>
        <span class="qc-desc">针对性巩固</span>
      </button>
    </div>

    <!-- 今日建议 -->
    <div v-if="recs.length" class="card rec">
      <h2 class="card-title"><el-icon><MagicStick /></el-icon> 今日建议（约 10 分钟）</h2>
      <div class="rec-list">
        <div v-for="r in recs" :key="r.techniqueId" class="rec-item">
          <div class="rec-main">
            <span class="rec-name">{{ r.technique.name }}</span>
            <span class="rec-reason muted">{{ r.reason }}</span>
          </div>
          <div class="rec-actions">
            <el-button size="small" @click="router.push(`/techniques/${r.techniqueId}`)">学习</el-button>
            <el-button size="small" type="primary" @click="router.push(`/techniques/${r.techniqueId}/practice`)">练习</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类 -->
    <div v-for="g in grouped" :key="g.cat" class="cat-section">
      <div class="cat-title">
        <span>{{ g.label }}</span>
        <span class="cat-count muted">{{ g.items.length }} 个技巧</span>
      </div>
      <div class="tech-grid">
        <div v-for="t in g.items" :key="t.id" class="tech-card" @click="router.push(`/techniques/${t.id}`)">
          <div class="tc-top">
            <span class="tc-name">{{ t.name }}</span>
            <MasteryBadge :technique-id="t.id" />
          </div>
          <div class="tc-scenario">{{ t.scenario }}</div>
          <div class="tc-foot">
            <el-button size="small" text @click.stop="router.push(`/techniques/${t.id}`)">学习</el-button>
            <el-button size="small" text type="primary" @click.stop="router.push(`/techniques/${t.id}/practice`)">
              练习<el-icon><Right /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.ov-item {
  text-align: center;
  padding: 16px;
}
.ov-val {
  font-size: 26px;
  font-weight: 700;
}
.ov-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}
.quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  transition: border-color 0.15s, transform 0.15s;
}
.quick-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.qc-icon {
  font-size: 24px;
  color: var(--primary);
}
.qc-desc {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
}
.rec {
  margin-top: 12px;
}
.rec .card-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rec-list {
  display: flex;
  flex-direction: column;
}
.rec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.rec-item:last-child {
  border-bottom: none;
}
.rec-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rec-name {
  font-weight: 500;
}
.rec-reason {
  font-size: 12px;
}
.rec-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.cat-section {
  margin-top: 24px;
}
.cat-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.cat-count {
  font-size: 12px;
  font-weight: 400;
}
.tech-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.tech-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
}
.tech-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.tc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.tc-name {
  font-weight: 600;
  font-size: 15px;
}
.tc-scenario {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 8px;
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tc-foot {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
}
@media (max-width: 900px) {
  .tech-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .overview,
  .quick {
    grid-template-columns: 1fr;
  }
  .tech-grid {
    grid-template-columns: 1fr;
  }
}
</style>
