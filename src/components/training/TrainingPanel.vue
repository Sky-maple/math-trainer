<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useTraining, type TrainingConfig } from '@/composables/useTraining'
import { addRecord, recordMistake } from '@/stores/history'
import { formatSeconds, formatDuration, formatCountdown, formatPercent } from '@/utils'
import { CaretRight, VideoPause, VideoPlay, Close } from '@element-plus/icons-vue'

const props = defineProps<{ config: TrainingConfig }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const t = useTraining(props.config)
const answer = ref('')
const inputRef = ref<HTMLInputElement>()
const reported = ref(false)

const isLast = computed(() => t.totalCount > 0 && t.results.value.length >= t.totalCount)
const buttonText = computed(() => (isLast.value ? '查看成绩' : '下一题'))

function submitAnswer(): void {
  if (!answer.value.trim() || t.feedback.value !== 'none') return
  t.submit(answer.value.trim())
}

function onNext(): void {
  t.advance()
}

function onStart(): void {
  reported.value = false
  t.start()
  focusInput()
}

function focusInput(): void {
  nextTick(() => inputRef.value?.focus())
}

// 题目切换后自动聚焦输入框
watch(
  () => t.current.value?.id,
  () => {
    answer.value = ''
    focusInput()
  }
)

// 训练结束：写入历史 + 错题本（只写一次）
watch(
  () => t.status.value,
  (s) => {
    if (s === 'finished' && !reported.value && t.results.value.length > 0) {
      reported.value = true
      const record = t.buildRecord()
      if (record) {
        addRecord(record)
        for (const r of t.results.value) {
          if (!r.correct) recordMistake(r)
        }
      }
    }
  }
)

const wrongList = computed(() => t.results.value.filter((r) => !r.correct))
const summary = computed(() => {
  const times = t.results.value.map((r) => r.timeMs).filter((x) => x > 0)
  return {
    avg: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    fastest: times.length ? Math.min(...times) : 0
  }
})
</script>

<template>
  <div class="tp">
    <!-- 待开始 -->
    <div v-if="t.status.value === 'idle'" class="card tp-idle">
      <div class="tp-idle-head">
        <div>
          <div class="tp-idle-title">{{ config.label }}</div>
          <div class="tp-idle-desc muted">
            难度 {{ config.difficulty }} ·
            <template v-if="config.timedSeconds > 0">限时 {{ formatDuration(config.timedSeconds * 1000) }}</template>
            <template v-else-if="config.questionCount > 0">{{ config.questionCount }} 题</template>
            <template v-else>不限题数</template>
          </div>
        </div>
      </div>
      <div class="tp-idle-actions">
        <el-button type="primary" size="large" @click="onStart">开始训练</el-button>
        <el-button size="large" @click="emit('close')">返回</el-button>
      </div>
    </div>

    <!-- 进行中 / 暂停 -->
    <div v-else-if="t.status.value === 'running' || t.status.value === 'paused'" class="card tp-run">
      <div class="tp-topbar">
        <div class="tp-progress">
          <div class="tp-progress-info">
            <span class="muted">{{ config.label }}</span>
            <span class="tp-meta">
              <template v-if="config.timedSeconds > 0">
                剩余 <b class="mono">{{ formatCountdown(t.remainingMs.value ?? 0) }}</b>
              </template>
              <template v-else>
                第 {{ Math.min(t.index.value + 1, t.totalCount || t.index.value + 1) }} 题<template v-if="t.totalCount > 0"> / {{ t.totalCount }}</template>
              </template>
              · 已答 {{ t.results.value.length }}
            </span>
          </div>
          <el-progress
            v-if="t.totalCount > 0"
            :percentage="Math.round(t.progress.value * 100)"
            :stroke-width="8"
            :show-text="false"
          />
          <el-progress
            v-else-if="t.remainingMs.value != null"
            :percentage="Math.round(((config.timedSeconds * 1000 - (t.remainingMs.value ?? 0)) / (config.timedSeconds * 1000)) * 100)"
            :stroke-width="8"
            :show-text="false"
            status="warning"
          />
        </div>
        <div class="tp-controls">
          <el-button v-if="t.status.value === 'running'" size="small" :icon="VideoPause" @click="t.pause()">暂停</el-button>
          <el-button v-else size="small" :icon="VideoPlay" @click="t.resume()">继续</el-button>
          <el-button size="small" :icon="Close" @click="t.finish()">结束</el-button>
        </div>
      </div>

      <div v-if="t.status.value === 'paused'" class="tp-paused">
        <el-icon><VideoPlay /></el-icon>
        <span>已暂停，点击「继续」接着练</span>
      </div>

      <template v-else>
        <div class="tp-question">
          <div class="tp-q-tag">{{ t.current.value?.categoryLabel }}</div>
          <div class="tp-q-expr mono">{{ t.current.value?.expr }} = ?</div>
          <div class="tp-q-hint muted" v-if="t.current.value?.answer.kind === 'quotient-remainder'">
            输入「商 余 余数」，例如 7余5
          </div>
        </div>

        <div class="tp-input-row">
          <input
            ref="inputRef"
            v-model="answer"
            class="tp-input mono"
            type="text"
            inputmode="decimal"
            :placeholder="t.current.value?.answer.kind === 'quotient-remainder' ? '如 7余5' : '输入答案后回车'"
            :disabled="t.feedback.value !== 'none'"
            @keyup.enter="submitAnswer"
          />
          <el-button
            type="primary"
            size="large"
            :icon="CaretRight"
            :disabled="t.feedback.value !== 'none'"
            @click="submitAnswer"
          >
            提交
          </el-button>
        </div>

        <!-- 反馈 -->
        <transition name="fade">
          <div v-if="t.feedback.value !== 'none'" class="tp-feedback" :class="t.feedback.value">
            <template v-if="t.feedback.value === 'correct'">
              <div class="tp-fb-title">回答正确</div>
            </template>
            <template v-else>
              <div class="tp-fb-title">
                回答错误 · 正确答案：<b class="mono">{{ t.current.value?.answer.display }}</b>
              </div>
              <div class="tp-steps">
                <div v-for="(s, i) in t.current.value?.steps" :key="i" class="tp-step mono">{{ s }}</div>
              </div>
            </template>
            <el-button v-if="!config.autoNext" type="primary" class="mt-8" @click="onNext">
              {{ buttonText }}
            </el-button>
          </div>
        </transition>
      </template>
    </div>

    <!-- 成绩报告 -->
    <div v-else-if="t.status.value === 'finished'" class="tp-report">
      <div class="card">
        <div class="rp-head">
          <div>
            <div class="rp-title">训练完成</div>
            <div class="muted">{{ config.label }}</div>
          </div>
        </div>

        <div class="rp-score">
          <div class="rp-big mono">{{ formatPercent(t.accuracy.value) }}</div>
          <div class="muted">正确率</div>
        </div>

        <div class="rp-grid">
          <div class="rp-item">
            <div class="rp-val mono">{{ t.results.value.length }}</div>
            <div class="rp-label">总题数</div>
          </div>
          <div class="rp-item">
            <div class="rp-val mono" style="color: var(--success)">{{ t.correctCount.value }}</div>
            <div class="rp-label">答对</div>
          </div>
          <div class="rp-item">
            <div class="rp-val mono" style="color: var(--danger)">{{ t.wrongCount.value }}</div>
            <div class="rp-label">答错</div>
          </div>
          <div class="rp-item">
            <div class="rp-val mono">{{ formatSeconds(summary.avg) }}s</div>
            <div class="rp-label">平均用时</div>
          </div>
          <div class="rp-item">
            <div class="rp-val mono">{{ formatSeconds(summary.fastest) }}s</div>
            <div class="rp-label">最快</div>
          </div>
          <div class="rp-item">
            <div class="rp-val mono">{{ formatDuration(t.elapsedMs.value) }}</div>
            <div class="rp-label">总耗时</div>
          </div>
        </div>

        <div v-if="wrongList.length" class="rp-wrong">
          <div class="rp-wrong-title">错题回顾</div>
          <div v-for="r in wrongList" :key="r.id" class="rp-wrong-item">
            <div class="rp-wrong-expr mono">{{ r.expr }} = <b>{{ r.answerDisplay }}</b></div>
            <div class="rp-wrong-you muted">你的答案：{{ r.userAnswer }}</div>
            <div v-for="(s, i) in r.steps" :key="i" class="rp-step mono">{{ s }}</div>
          </div>
        </div>

        <div class="rp-actions">
          <el-button type="primary" size="large" @click="onStart">再来一组</el-button>
          <el-button size="large" @click="emit('close')">返回</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tp-idle {
  text-align: center;
  padding: 40px 20px;
}
.tp-idle-title {
  font-size: 20px;
  font-weight: 600;
}
.tp-idle-desc {
  margin-top: 8px;
}
.tp-idle-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.tp-run {
  padding: 20px;
}
.tp-topbar {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
}
.tp-progress {
  flex: 1;
  min-width: 0;
}
.tp-progress-info {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.tp-meta {
  color: var(--text-2);
  white-space: nowrap;
}
.tp-controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tp-paused {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 0;
  color: var(--text-2);
  font-size: 15px;
}

.tp-question {
  text-align: center;
  margin: 40px 0 28px;
}
.tp-q-tag {
  display: inline-block;
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 2px 10px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.tp-q-expr {
  font-size: clamp(28px, 7vw, 44px);
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 1.3;
  word-break: break-all;
}
.tp-q-hint {
  margin-top: 10px;
  font-size: 13px;
}

.tp-input-row {
  display: flex;
  gap: 12px;
  max-width: 460px;
  margin: 0 auto;
}
.tp-input {
  flex: 1;
  height: 46px;
  font-size: 20px;
  text-align: center;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.tp-input:focus {
  border-color: var(--primary);
}

.tp-feedback {
  max-width: 460px;
  margin: 18px auto 0;
  padding: 16px;
  border-radius: 10px;
  text-align: center;
}
.tp-feedback.correct {
  background: var(--success-soft);
  color: var(--success);
}
.tp-feedback.wrong {
  background: var(--danger-soft);
  color: var(--danger);
  text-align: left;
}
.tp-fb-title {
  font-size: 15px;
  font-weight: 600;
}
.tp-steps {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tp-step {
  font-size: 13px;
  color: var(--text);
}

.tp-report .rp-head {
  text-align: center;
  margin-bottom: 12px;
}
.rp-title {
  font-size: 20px;
  font-weight: 600;
}
.rp-score {
  text-align: center;
  margin: 10px 0 20px;
}
.rp-big {
  font-size: 44px;
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
.rp-wrong {
  margin-top: 20px;
}
.rp-wrong-title {
  font-weight: 600;
  margin-bottom: 10px;
}
.rp-wrong-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.rp-wrong-expr {
  font-size: 16px;
  margin-bottom: 4px;
}
.rp-wrong-you {
  font-size: 13px;
  margin-bottom: 6px;
}
.rp-step {
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
  .tp-topbar {
    flex-direction: column;
    gap: 10px;
  }
  .tp-controls {
    width: 100%;
  }
}
</style>
