<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { TechniqueQuestion } from '@/core/techniques/types'
import { TECHNIQUES, TECHNIQUE_MAP } from '@/core/techniques/catalog'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/core/techniques/types'
import { generateTechniqueQuestion, isTechniqueCorrect } from '@/core/techniques/generators'
import { createRng } from '@/core/rng'
import { recordTechniqueResult, recordTechniqueMistake } from '@/stores/techniqueMastery'
import { formatPercent } from '@/utils'
import { Back, Trophy, Refresh, CaretRight, Close } from '@element-plus/icons-vue'

const router = useRouter()

const stage = ref<'setup' | 'running' | 'finished'>('setup')
const scope = ref<string>('all')

const scopeOptions = computed(() => [
  { value: 'all', label: '全部（随机抽 6 个技巧）' },
  ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))
])

const questions = ref<TechniqueQuestion[]>([])
const idx = ref(0)
const input = ref('')
const feedback = ref<'none' | 'correct' | 'wrong'>('none')
const log = ref<{ techniqueId: string; correct: boolean }[]>([])
const answerRef = ref<HTMLInputElement>()
let qStart = 0
let autoTimer: number | null = null

const PER_TECH = 3

const current = computed(() => questions.value[idx.value] ?? null)
const total = computed(() => questions.value.length)
const progress = computed(() => (total.value ? Math.round((idx.value / total.value) * 100) : 0))
const currentTechnique = computed(() => (current.value ? TECHNIQUE_MAP[current.value.techniqueId] : null))

function clearAuto(): void {
  if (autoTimer !== null) {
    clearTimeout(autoTimer)
    autoTimer = null
  }
}

function buildQuestions(): TechniqueQuestion[] {
  const rng = createRng()
  const techs =
    scope.value === 'all'
      ? rng.shuffle(TECHNIQUES.slice()).slice(0, 6)
      : TECHNIQUES.filter((t) => t.category === scope.value)
  const out: TechniqueQuestion[] = []
  for (const t of techs) {
    for (let i = 0; i < PER_TECH; i++) out.push(generateTechniqueQuestion(t.id, rng, 1))
  }
  return out
}

function focus(): void {
  nextTick(() => answerRef.value?.focus())
}

function start(): void {
  clearAuto()
  questions.value = buildQuestions()
  idx.value = 0
  log.value = []
  input.value = ''
  feedback.value = 'none'
  stage.value = 'running'
  qStart = Date.now()
  focus()
}

function submit(): void {
  if (!current.value || feedback.value !== 'none') return
  const q = current.value
  const correct = isTechniqueCorrect(q, input.value)
  log.value.push({ techniqueId: q.techniqueId, correct })
  recordTechniqueResult(q.techniqueId, correct, Date.now() - qStart)
  if (!correct) recordTechniqueMistake(q, TECHNIQUE_MAP[q.techniqueId]?.name ?? q.techniqueId)
  feedback.value = correct ? 'correct' : 'wrong'
  autoTimer = window.setTimeout(advance, correct ? 700 : 1600)
}

function advance(): void {
  clearAuto()
  if (stage.value !== 'running') return
  if (idx.value + 1 >= questions.value.length) {
    stage.value = 'finished'
    return
  }
  idx.value++
  input.value = ''
  feedback.value = 'none'
  qStart = Date.now()
  focus()
}

function exit(): void {
  clearAuto()
  stage.value = 'setup'
}

const techResults = computed(() => {
  const map = new Map<string, { total: number; correct: number }>()
  for (const r of log.value) {
    const s = map.get(r.techniqueId) ?? { total: 0, correct: 0 }
    s.total++
    if (r.correct) s.correct++
    map.set(r.techniqueId, s)
  }
  return [...map.entries()].map(([id, s]) => ({
    id,
    name: TECHNIQUE_MAP[id]?.name ?? id,
    total: s.total,
    correct: s.correct,
    passed: s.correct >= Math.ceil((s.total * 2) / 3)
  }))
})

const overall = computed(() => {
  const correct = log.value.filter((r) => r.correct).length
  const totalQ = log.value.length
  return {
    correct,
    total: totalQ,
    accuracy: totalQ ? correct / totalQ : 0,
    passedCount: techResults.value.filter((t) => t.passed).length,
    techCount: techResults.value.length
  }
})
</script>

<template>
  <div>
    <div class="page-head">
      <div class="crumb muted" @click="router.push('/techniques')">
        <el-icon><Back /></el-icon> 心算技巧中心 / 技巧闯关
      </div>
      <h1 class="page-title">技巧闯关</h1>
      <p class="page-desc">每个技巧 3 题，答对 2 题才算通过。按分类依次检验你的技巧掌握情况。</p>
    </div>

    <!-- 选择范围 -->
    <div v-if="stage === 'setup'" class="card">
      <h2 class="card-title">选择闯关范围</h2>
      <el-radio-group v-model="scope" class="scope-group">
        <el-radio v-for="o in scopeOptions" :key="o.value" :value="o.value" border class="scope-item">{{ o.label }}</el-radio>
      </el-radio-group>
      <div class="mt-16">
        <el-button type="primary" size="large" :icon="Trophy" @click="start">开始闯关</el-button>
      </div>
    </div>

    <!-- 进行中 -->
    <div v-else-if="stage === 'running' && current" class="card run">
      <div class="topbar">
        <div class="progress-box">
          <div class="progress-info">
            <span class="tech">{{ currentTechnique?.name }}</span>
            <span class="muted">第 {{ idx + 1 }} / {{ total }} 题</span>
          </div>
          <el-progress :percentage="progress" :stroke-width="8" :show-text="false" />
        </div>
        <el-button size="small" :icon="Close" @click="exit">退出</el-button>
      </div>

      <div class="question">
        <div class="q-tag">{{ currentTechnique?.name }}</div>
        <div class="q-expr mono">{{ current.expr }} = ?</div>
        <div v-if="current.judgeKind === 'qr'" class="q-hint muted">输入「商 余 余数」，如 7余5</div>
      </div>

      <div class="input-row">
        <input
          ref="answerRef"
          v-model="input"
          class="q-input mono"
          type="text"
          inputmode="decimal"
          :placeholder="current.judgeKind === 'qr' ? '如 7余5' : '输入答案后回车'"
          :disabled="feedback !== 'none'"
          @keyup.enter="submit"
        />
        <el-button type="primary" size="large" :icon="CaretRight" :disabled="feedback !== 'none'" @click="submit">提交</el-button>
      </div>

      <div v-if="feedback !== 'none'" class="feedback" :class="feedback">
        <template v-if="feedback === 'correct'">
          <div class="fb-title">通过</div>
        </template>
        <template v-else>
          <div class="fb-title">答错 · 正确答案：<b class="mono">{{ current.answerDisplay }}</b></div>
        </template>
        <div class="steps">
          <div v-for="(s, i) in current.steps" :key="i" class="step mono">{{ s }}</div>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div v-else-if="stage === 'finished'" class="card">
      <div class="res-head">
        <el-icon class="trophy"><Trophy /></el-icon>
        <div class="res-title">闯关完成</div>
        <div class="muted">{{ overall.passedCount }} / {{ overall.techCount }} 个技巧通过</div>
      </div>

      <div class="res-grid">
        <div class="res-item">
          <div class="res-val mono">{{ formatPercent(overall.accuracy) }}</div>
          <div class="res-label">总正确率</div>
        </div>
        <div class="res-item">
          <div class="res-val mono">{{ overall.correct }} / {{ overall.total }}</div>
          <div class="res-label">答对 / 总题</div>
        </div>
        <div class="res-item">
          <div class="res-val mono">{{ overall.passedCount }}</div>
          <div class="res-label">通过技巧数</div>
        </div>
      </div>

      <div class="tech-table mt-16">
        <div v-for="t in techResults" :key="t.id" class="tech-row">
          <span class="tr-name">{{ t.name }}</span>
          <span class="tr-score mono">{{ t.correct }} / {{ t.total }}</span>
          <el-tag :type="t.passed ? 'success' : 'danger'" size="small" effect="plain">
            {{ t.passed ? '通过' : '未通过' }}
          </el-tag>
        </div>
      </div>

      <div class="res-actions">
        <el-button type="primary" size="large" :icon="Refresh" @click="start">再来一次</el-button>
        <el-button size="large" @click="stage = 'setup'">换个范围</el-button>
        <el-button size="large" @click="router.push('/techniques/mastery')">查看掌握度</el-button>
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
.scope-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
.scope-item {
  margin-right: 0;
}
.topbar {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
}
.progress-box {
  flex: 1;
  min-width: 0;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}
.tech {
  font-weight: 500;
  color: var(--primary);
}
.question {
  text-align: center;
  margin: 36px 0 24px;
}
.q-tag {
  display: inline-block;
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 2px 10px;
  border-radius: 20px;
  margin-bottom: 14px;
}
.q-expr {
  font-size: clamp(28px, 7vw, 42px);
  font-weight: 600;
  word-break: break-all;
}
.q-hint {
  margin-top: 10px;
  font-size: 13px;
}
.input-row {
  display: flex;
  gap: 12px;
  max-width: 460px;
  margin: 0 auto;
}
.q-input {
  flex: 1;
  height: 46px;
  font-size: 20px;
  text-align: center;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  outline: none;
}
.q-input:focus {
  border-color: var(--primary);
}
.feedback {
  max-width: 520px;
  margin: 16px auto 0;
  padding: 14px 16px;
  border-radius: 10px;
}
.feedback.correct {
  background: var(--success-soft);
  color: var(--success);
}
.feedback.wrong {
  background: var(--danger-soft);
  color: var(--danger);
}
.fb-title {
  font-size: 15px;
  font-weight: 600;
}
.steps {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step {
  font-size: 13px;
  color: var(--text);
}
.res-head {
  text-align: center;
}
.trophy {
  font-size: 34px;
  color: var(--warning);
}
.res-title {
  font-size: 20px;
  font-weight: 600;
  margin-top: 4px;
}
.res-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.res-item {
  text-align: center;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 14px 6px;
}
.res-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary);
}
.res-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}
.tech-table {
  display: flex;
  flex-direction: column;
}
.tech-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--border);
}
.tech-row:last-child {
  border-bottom: none;
}
.tr-name {
  flex: 1;
  font-size: 14px;
}
.tr-score {
  font-size: 13px;
  color: var(--text-2);
}
.res-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}
</style>
