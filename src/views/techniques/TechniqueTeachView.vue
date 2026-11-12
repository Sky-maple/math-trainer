<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MasteryBadge from '@/components/technique/MasteryBadge.vue'
import TechniqueSessionPanel from '@/components/technique/TechniqueSessionPanel.vue'
import type { TechniqueTrainingConfig, TechniqueMode } from '@/composables/useTechniqueTraining'
import { TECHNIQUES, TECHNIQUE_MAP } from '@/core/techniques/catalog'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/core/techniques/types'
import {
  markLearned,
  masteryOf,
  levelOf,
  accuracyOf,
  avgTimeOf,
  masteryLevelOf,
  MASTERY_COLOR
} from '@/stores/techniqueMastery'
import { formatSeconds, formatPercent } from '@/utils'
import { Back, Warning, Guide, MagicStick, VideoPlay } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const id = computed(() => String(route.params.id))
const technique = computed(() => TECHNIQUE_MAP[id.value])
const mastery = computed(() => masteryOf(id.value))
const level = computed(() => levelOf(mastery.value))
const acc = computed(() => accuracyOf(mastery.value))
const avg = computed(() => avgTimeOf(mastery.value))

/** 左侧目录：按分类分组，带掌握度色点 */
const groups = computed(() =>
  CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: TECHNIQUES.filter((t) => t.category === cat).map((t) => ({ t, lv: masteryLevelOf(t.id) }))
  }))
)

const mode = ref<TechniqueMode>('beginner')
const session = ref<TechniqueTrainingConfig | null>(null)
const sessionKey = ref(0)
const practiceRef = ref<HTMLElement>()

const modeMeta: Record<TechniqueMode, { count: number; seconds: number }> = {
  teach: { count: 5, seconds: 0 },
  beginner: { count: 10, seconds: 0 },
  proficient: { count: 10, seconds: 20 },
  speed: { count: 15, seconds: 8 }
}

function go(nid: string): void {
  if (nid !== id.value) router.push(`/techniques/${nid}`)
}

// 路由在同一组件内切换时：标记学习、重置本页练习
watch(
  id,
  (nid) => {
    if (TECHNIQUE_MAP[nid]) markLearned(nid)
    session.value = null
    mode.value = 'beginner'
  },
  { immediate: true }
)

function generatePractice(): void {
  const m = modeMeta[mode.value]
  session.value = {
    techniqueId: id.value,
    mode: mode.value,
    questionCount: m.count,
    secondsPerQuestion: m.seconds,
    autoNext: mode.value === 'teach' ? false : true
  }
  sessionKey.value++
  nextTick(() => practiceRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<template>
  <div v-if="technique" class="teach-layout">
    <!-- 左：技巧目录 -->
    <aside class="teach-side">
      <div class="side-title">技巧目录</div>

      <el-select class="side-select only-mobile" :model-value="id" @change="go">
        <el-option-group v-for="g in groups" :key="g.cat" :label="g.label">
          <el-option v-for="it in g.items" :key="it.t.id" :value="it.t.id" :label="it.t.name" />
        </el-option-group>
      </el-select>

      <div class="side-scroll only-desktop">
        <div v-for="g in groups" :key="g.cat" class="side-group">
          <div class="side-group-title">{{ g.label }}</div>
          <button
            v-for="it in g.items"
            :key="it.t.id"
            type="button"
            class="side-item"
            :class="{ active: it.t.id === id }"
            @click="go(it.t.id)"
          >
            <span class="si-dot" :style="{ background: MASTERY_COLOR[it.lv] }"></span>
            <span class="si-name">{{ it.t.name }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- 右：技巧讲解 -->
    <section class="teach-main">
      <div class="crumb muted" @click="router.push('/techniques')">
        <el-icon><Back /></el-icon> 心算技巧中心 / {{ CATEGORY_LABELS[technique.category] }}
      </div>

      <div class="teach-head">
        <h1 class="page-title">{{ technique.name }}</h1>
        <div class="head-tags">
          <el-tag size="small" effect="plain">{{ CATEGORY_LABELS[technique.category] }}</el-tag>
          <MasteryBadge :technique-id="id" />
        </div>
      </div>

      <div class="teach-grid">
        <div class="card">
          <h2 class="card-title"><el-icon><Guide /></el-icon> 适用场景</h2>
          <p>{{ technique.scenario }}</p>
        </div>
        <div class="card">
          <h2 class="card-title"><el-icon><MagicStick /></el-icon> 数学原理</h2>
          <p>{{ technique.principle }}</p>
        </div>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">详细计算步骤</h2>
        <ol class="steps">
          <li v-for="(s, i) in technique.steps" :key="i">{{ s }}</li>
        </ol>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">教学示例（由易到难）</h2>
        <div class="examples">
          <div v-for="(ex, i) in technique.examples" :key="i" class="example">
            <div class="ex-head">
              <span class="ex-index">例 {{ i + 1 }}</span>
              <span class="ex-expr mono">{{ ex.expr }} = <b>{{ ex.answer }}</b></span>
            </div>
            <div class="ex-steps">
              <div v-for="(s, j) in ex.steps" :key="j" class="ex-step mono">{{ s }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="teach-grid mt-16">
        <div class="card">
          <h2 class="card-title"><el-icon><Warning /></el-icon> 常见错误</h2>
          <ul class="mistakes">
            <li v-for="(m, i) in technique.mistakes" :key="i">{{ m }}</li>
          </ul>
        </div>
        <div class="card">
          <h2 class="card-title">什么时候用这个技巧</h2>
          <p>{{ technique.judge }}</p>
          <div class="hint-box mt-8">
            <span class="muted">练习建议：</span>{{ technique.practiceHint }}
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <h2 class="card-title">你的掌握度</h2>
        <div class="mastery-row">
          <div class="mr-item">
            <div class="mr-val"><MasteryBadge :technique-id="id" /></div>
            <div class="mr-label">当前等级</div>
          </div>
          <div class="mr-item">
            <div class="mr-val mono">{{ mastery.practiceCount }}</div>
            <div class="mr-label">累计练习</div>
          </div>
          <div class="mr-item">
            <div class="mr-val mono">{{ mastery.practiceCount ? formatPercent(acc) : '—' }}</div>
            <div class="mr-label">正确率</div>
          </div>
          <div class="mr-item">
            <div class="mr-val mono">{{ mastery.practiceCount ? formatSeconds(avg) + 's' : '—' }}</div>
            <div class="mr-label">平均用时</div>
          </div>
        </div>
        <div class="mastery-note muted">
          等级规则：≥10 题且正确率 ≥60% 为「初步掌握」，≥25 题且 ≥80% 为「熟练掌握」，≥50 题且 ≥90% 并足够快才可能「精通」。
        </div>
      </div>

      <!-- 底部：本页生成练习题 -->
      <div ref="practiceRef" class="practice-wrap mt-16">
        <div v-if="!session" class="card practice-card">
        <div class="pc-head">
          <el-icon><VideoPlay /></el-icon>
          <span>专项练习</span>
        </div>
        <p class="pc-desc muted">
          选择模式后点击「生成练习题」，会在本页直接生成「{{ technique.name }}」的针对性题目，题目只符合该技巧的适用条件。
        </p>
        <div class="pc-actions">
          <el-radio-group v-model="mode" size="small">
            <el-radio-button value="teach">教学</el-radio-button>
            <el-radio-button value="beginner">入门</el-radio-button>
            <el-radio-button value="proficient">熟练</el-radio-button>
            <el-radio-button value="speed">极速</el-radio-button>
          </el-radio-group>
          <el-button type="primary" :icon="VideoPlay" @click="generatePractice">生成练习题</el-button>
        </div>
      </div>

      <TechniqueSessionPanel
        v-else
        :key="sessionKey"
        :config="session"
        :auto-start="true"
        @close="session = null"
      />
      </div>
    </section>
  </div>

  <el-empty v-else description="未找到该技巧">
    <el-button @click="router.push('/techniques')">返回技巧中心</el-button>
  </el-empty>
</template>

<style scoped>
.teach-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  align-items: start;
}

/* 左侧目录 */
.teach-side {
  position: sticky;
  top: 72px;
  max-height: calc(100vh - 92px);
  overflow-y: auto;
  padding-right: 6px;
  border-right: 1px solid var(--border);
}
.side-title {
  font-size: 12px;
  color: var(--text-3);
  padding: 0 8px 8px;
}
.side-group {
  margin-bottom: 10px;
}
.side-group-title {
  font-size: 12px;
  color: var(--text-3);
  padding: 6px 8px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.side-item:hover {
  background: var(--surface-2);
  color: var(--text);
}
.side-item.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 500;
}
.si-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.9;
}
.si-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side-select {
  width: 100%;
}
.only-mobile {
  display: none;
}

/* 右侧讲解 */
.teach-main {
  min-width: 0;
}
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
.teach-head {
  margin-bottom: 16px;
}
.head-tags {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.teach-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.steps {
  margin: 0;
  padding-left: 22px;
  line-height: 2;
}
.examples {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.example {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
.ex-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ex-index {
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 1px 8px;
  border-radius: 12px;
}
.ex-expr {
  font-size: 17px;
  font-weight: 500;
}
.ex-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ex-step {
  font-size: 13px;
  color: var(--text-2);
}
.mistakes {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  color: var(--text-2);
}
.hint-box {
  font-size: 13px;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 10px 12px;
}
.mastery-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.mr-item {
  text-align: center;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 14px 6px;
}
.mr-val {
  font-size: 20px;
  font-weight: 600;
}
.mr-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 4px;
}
.mastery-note {
  font-size: 12px;
  margin-top: 12px;
  line-height: 1.7;
}

/* 底部练习题 */
.practice-wrap {
  scroll-margin-top: 72px;
}
.practice-card {
  border-top: 3px solid var(--primary);
}
.pc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
}
.pc-desc {
  margin: 8px 0 16px;
  font-size: 13px;
  line-height: 1.6;
}
.pc-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 860px) {
  .teach-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .teach-side {
    position: static;
    max-height: none;
    overflow: visible;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 0 0 12px;
  }
  .only-mobile {
    display: block;
  }
  .only-desktop {
    display: none;
  }
  .teach-grid {
    grid-template-columns: 1fr;
  }
  .mastery-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
