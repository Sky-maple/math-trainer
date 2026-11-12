<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useTechniqueTraining, type TechniqueTrainingConfig, type TechniqueMode } from '@/composables/useTechniqueTraining'
import { TECHNIQUE_MAP } from '@/core/techniques/catalog'
import { formatSeconds, formatDuration, formatPercent } from '@/utils'
import { CaretRight, VideoPause, VideoPlay, Close, View, MagicStick } from '@element-plus/icons-vue'

const props = defineProps<{ config: TechniqueTrainingConfig; autoStart?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const t = useTechniqueTraining(props.config)
const technique = computed(() => TECHNIQUE_MAP[props.config.techniqueId])
const answer = ref('')
const inputRef = ref<HTMLInputElement>()

const MODE_LABEL: Record<TechniqueMode, string> = {
  teach: '教学模式',
  beginner: '入门模式',
  proficient: '熟练模式',
  speed: '极速模式'
}

const qRemaining = computed(() => {
  if (props.config.secondsPerQuestion <= 0) return null
  return Math.max(0, props.config.secondsPerQuestion * 1000 - t.qElapsedMs.value)
})

function focusInput(): void {
  nextTick(() => inputRef.value?.focus())
}

watch(() => t.current.value?.id, () => {
  answer.value = ''
  focusInput()
})

function submitAnswer(): void {
  if (!answer.value.trim() || t.feedback.value !== 'none') return
  t.submit(answer.value.trim())
}

function onStart(): void {
  t.start()
  focusInput()
}

// 从教学页「生成练习题」进入时，直接开始，不用再点一次「开始训练」
onMounted(() => {
  if (props.autoStart) {
    t.start()
    focusInput()
  }
})

function onNext(): void {
  t.advance()
}

const isLast = computed(() => t.totalCount > 0 && t.results.value.length >= t.totalCount)
</script>

<template>
  <div>
    <!-- 待开始 -->
    <div v-if="t.status.value === 'idle'" class="card idle">
      <div class="idle-title">{{ technique?.name }}</div>
      <div class="idle-sub muted">
        {{ MODE_LABEL[config.mode] }} ·
        <template v-if="config.secondsPerQuestion > 0">每题 {{ config.secondsPerQuestion }} 秒 · </template>
        {{ config.questionCount }} 题
      </div>
      <p class="idle-hint muted">{{ technique?.scenario }}</p>
      <div class="idle-actions">
        <el-button type="primary" size="large" @click="onStart">开始训练</el-button>
        <el-button size="large" @click="emit('close')">返回</el-button>
      </div>
    </div>

    <!-- 进行中 -->
    <div v-else-if="t.status.value === 'running' || t.status.value === 'paused'" class="card run">
      <div class="topbar">
        <div class="progress-box">
          <div class="progress-info">
            <span class="tech-name">{{ technique?.name }} · {{ MODE_LABEL[config.mode] }}</span>
            <span class="meta" v-if="qRemaining != null && t.feedback.value === 'none'">
              本题剩余 <b class="mono">{{ Math.ceil(qRemaining / 1000) }}s</b>
            </span>
            <span class="meta" v-else>已答 {{ t.results.value.length }} / {{ t.totalCount }}</span>
          </div>
          <el-progress
            :percentage="Math.round(t.progress.value * 100)"
            :stroke-width="8"
            :show-text="false"
          />
        </div>
        <div class="controls">
          <el-button v-if="t.status.value === 'running'" size="small" :icon="VideoPause" @click="t.pause()">暂停</el-button>
          <el-button v-else size="small" :icon="VideoPlay" @click="t.resume()">继续</el-button>
          <el-button size="small" :icon="Close" @click="t.finish()">结束</el-button>
        </div>
      </div>

      <div v-if="t.status.value === 'paused'" class="paused">
        <el-icon><VideoPlay /></el-icon>
        <span>已暂停，点击「继续」接着练</span>
      </div>

      <template v-else>
        <div class="question">
          <div class="q-tag">{{ technique?.name }}</div>
          <div class="q-expr mono">{{ t.current.value?.expr }} = ?</div>
          <div v-if="t.current.value?.judgeKind === 'qr'" class="q-hint muted">输入「商 余 余数」，如 7余5</div>
        </div>

        <div class="input-row">
          <input
            ref="inputRef"
            v-model="answer"
            class="q-input mono"
            type="text"
            inputmode="decimal"
            :placeholder="t.current.value?.judgeKind === 'qr' ? '如 7余5' : '输入答案后回车'"
            :disabled="t.feedback.value !== 'none'"
            @keyup.enter="submitAnswer"
          />
          <el-button type="primary" size="large" :icon="CaretRight" :disabled="t.feedback.value !== 'none'" @click="submitAnswer">
            提交
          </el-button>
        </div>

        <!-- 学生可先看技巧（仅教学模式） -->
        <div v-if="config.mode === 'teach' && t.feedback.value === 'none'" class="reveal-row">
          <el-button v-if="!t.revealed.value" size="small" :icon="View" @click="t.reveal()">查看技巧解析</el-button>
        </div>

        <!-- 技巧解析（教学提前看 / 答完后展示） -->
        <div v-if="t.revealed.value" class="solution">
          <div class="sol-head">
            <el-icon><MagicStick /></el-icon>
            <span>本题推荐技巧：<b>{{ technique?.name }}</b></span>
          </div>
          <div class="sol-steps">
            <div v-for="(s, i) in t.current.value?.steps" :key="i" class="sol-step mono">{{ s }}</div>
          </div>
        </div>

        <!-- 判分反馈 -->
        <div v-if="t.feedback.value !== 'none'" class="feedback" :class="t.feedback.value">
          <template v-if="t.feedback.value === 'correct'">
            <div class="fb-title">回答正确</div>
          </template>
          <template v-else>
            <div class="fb-title">
              回答错误 · 正确答案：<b class="mono">{{ t.current.value?.answerDisplay }}</b>
            </div>
          </template>
          <el-button v-if="!config.autoNext" type="primary" class="mt-8" @click="onNext">
            {{ isLast ? '查看成绩' : '下一题' }}
          </el-button>
        </div>
      </template>
    </div>

    <!-- 成绩报告 -->
    <div v-else-if="t.status.value === 'finished'" class="card report">
      <div class="rp-head">
        <div class="rp-title">{{ technique?.name }} · 训练完成</div>
        <div class="muted">{{ MODE_LABEL[config.mode] }}</div>
      </div>

      <div class="rp-score">
        <div class="rp-big mono">{{ formatPercent(t.accuracy.value) }}</div>
        <div class="muted">正确率</div>
      </div>

      <div class="rp-grid">
        <div class="rp-item">
          <div class="rp-val mono">{{ t.summary.value.count }}</div>
          <div class="rp-label">题目数量</div>
        </div>
        <div class="rp-item">
          <div class="rp-val mono" style="color: var(--success)">{{ t.summary.value.correct }}</div>
          <div class="rp-label">正确数量</div>
        </div>
        <div class="rp-item">
          <div class="rp-val mono" style="color: var(--danger)">{{ t.summary.value.wrong }}</div>
          <div class="rp-label">错误数量</div>
        </div>
        <div class="rp-item">
          <div class="rp-val mono">{{ formatSeconds(t.summary.value.avgTimeMs) }}s</div>
          <div class="rp-label">平均耗时</div>
        </div>
        <div class="rp-item">
          <div class="rp-val mono">{{ formatSeconds(t.summary.value.fastestMs) }}s</div>
          <div class="rp-label">最快</div>
        </div>
        <div class="rp-item">
          <div class="rp-val mono">{{ formatDuration(t.elapsedMs.value) }}</div>
          <div class="rp-label">总耗时</div>
        </div>
      </div>

      <div class="efficiency">
        <div class="eff-head">
          <span>使用技巧的效率</span>
          <span class="mono">{{ Math.round(t.summary.value.efficiency * 100) }}%</span>
        </div>
        <el-progress
          :percentage="Math.round(t.summary.value.efficiency * 100)"
          :stroke-width="10"
          :color="t.summary.value.efficiency >= 0.8 ? '#1d9e75' : t.summary.value.efficiency >= 0.5 ? '#ba7517' : '#e24b4a'"
        />
        <div class="eff-hint muted">
          目标每题 {{ t.summary.value.targetSeconds }} 秒，实际平均 {{ formatSeconds(t.summary.value.avgTimeMs) }} 秒
        </div>
      </div>

      <div v-if="t.summary.value.wrongList.length" class="wrong">
        <div class="wrong-title">错题分析</div>
        <div v-for="r in t.summary.value.wrongList" :key="r.id" class="wrong-item">
          <div class="wrong-expr mono">{{ r.expr }} = <b>{{ r.answerDisplay }}</b></div>
          <div class="wrong-you muted">你的答案：{{ r.userAnswer }}{{ r.timedOut ? '（超时）' : '' }}</div>
          <div v-for="(s, i) in r.steps" :key="i" class="wrong-step mono">{{ s }}</div>
        </div>
      </div>

      <div class="rp-actions">
        <el-button type="primary" size="large" @click="onStart">再来一组</el-button>
        <el-button size="large" @click="emit('close')">返回</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.idle {
  text-align: center;
  padding: 40px 20px;
}
.idle-title {
  font-size: 22px;
  font-weight: 600;
}
.idle-sub {
  margin-top: 6px;
}
.idle-hint {
  margin-top: 12px;
}
.idle-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.run {
  padding: 20px;
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
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.tech-name {
  font-weight: 500;
}
.meta {
  color: var(--text-2);
  white-space: nowrap;
}
.controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.paused {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 0;
  color: var(--text-2);
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
  letter-spacing: 1px;
  line-height: 1.3;
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

.reveal-row {
  text-align: center;
  margin-top: 14px;
}

.solution {
  max-width: 520px;
  margin: 16px auto 0;
  padding: 14px 16px;
  background: var(--primary-soft);
  border-radius: 10px;
}
.sol-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--primary);
  margin-bottom: 8px;
}
.sol-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sol-step {
  font-size: 13px;
  color: var(--text);
}

.feedback {
  max-width: 520px;
  margin: 16px auto 0;
  padding: 14px 16px;
  border-radius: 10px;
  text-align: center;
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

.report .rp-head {
  text-align: center;
  margin-bottom: 10px;
}
.rp-title {
  font-size: 19px;
  font-weight: 600;
}
.rp-score {
  text-align: center;
  margin: 8px 0 18px;
}
.rp-big {
  font-size: 42px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1.1;
}
.rp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.rp-item {
  text-align: center;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 12px 6px;
}
.rp-val {
  font-size: 20px;
  font-weight: 600;
}
.rp-label {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}
.efficiency {
  margin-top: 20px;
}
.eff-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
  font-weight: 500;
}
.eff-hint {
  font-size: 12px;
  margin-top: 4px;
}
.wrong {
  margin-top: 20px;
}
.wrong-title {
  font-weight: 600;
  margin-bottom: 10px;
}
.wrong-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.wrong-expr {
  font-size: 16px;
  margin-bottom: 4px;
}
.wrong-you {
  font-size: 13px;
  margin-bottom: 6px;
}
.wrong-step {
  font-size: 13px;
  color: var(--text-2);
}
.rp-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}
@media (max-width: 640px) {
  .rp-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .topbar {
    flex-direction: column;
    gap: 10px;
  }
  .controls {
    width: 100%;
  }
}
</style>
