import { ref, computed } from 'vue'
import type { Question, QuestionResult, TrainMode, TrainingRecord } from '../core/types'
import { createRng, type Rng } from '../core/rng'
import { generateByCategory, generateByDifficulty, generateFromSet, DIFFICULTY_LABELS } from '../core/generator'
import { isCorrect } from '../core/evaluate'
import { todayKey, uid } from '../utils'

export interface TrainingConfig {
  mode: TrainMode
  /** 出题来源：指定题型 / 指定难度 / 分类集合 */
  source: 'category' | 'level' | 'set'
  category?: string
  categories?: string[]
  difficulty: number
  /** 目标题数，0 表示不限（限时模式） */
  questionCount: number
  /** 限时秒数，0 表示不限时 */
  timedSeconds: number
  autoNext: boolean
  /** 会话名称，用于记录展示 */
  label: string
}

export type TrainStatus = 'idle' | 'running' | 'paused' | 'finished'

export function useTraining(config: TrainingConfig) {
  const status = ref<TrainStatus>('idle')
  const current = ref<Question | null>(null)
  const index = ref(0)
  const results = ref<QuestionResult[]>([])
  const elapsedMs = ref(0)
  const feedback = ref<'none' | 'correct' | 'wrong'>('none')
  const lastInput = ref('')

  let rng: Rng = createRng()
  let timer: number | null = null
  let autoTimer: number | null = null
  let questionStartMs = 0

  const totalCount = config.questionCount
  const correctCount = computed(() => results.value.filter((r) => r.correct).length)
  const wrongCount = computed(() => results.value.length - correctCount.value)
  const accuracy = computed(() => (results.value.length ? correctCount.value / results.value.length : 0))
  const remainingMs = computed(() =>
    config.timedSeconds > 0 ? Math.max(0, config.timedSeconds * 1000 - elapsedMs.value) : null
  )
  const progress = computed(() => (totalCount > 0 ? Math.min(1, index.value / totalCount) : 0))

  function generateNext(): Question {
    if (config.source === 'level') return generateByDifficulty(config.difficulty, rng)
    if (config.source === 'set') return generateFromSet(config.categories ?? [], rng, config.difficulty)
    return generateByCategory(config.category ?? 'add-2-2', rng, config.difficulty)
  }

  function nextQuestion(): void {
    current.value = generateNext()
    questionStartMs = elapsedMs.value
    feedback.value = 'none'
    lastInput.value = ''
  }

  function startTicker(): void {
    stopTicker()
    timer = window.setInterval(() => {
      elapsedMs.value += 100
      if (config.timedSeconds > 0 && elapsedMs.value >= config.timedSeconds * 1000) {
        finish()
      }
    }, 100)
  }
  function stopTicker(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }
  function clearAuto(): void {
    if (autoTimer !== null) {
      clearTimeout(autoTimer)
      autoTimer = null
    }
  }

  function start(): void {
    rng = createRng()
    results.value = []
    index.value = 0
    elapsedMs.value = 0
    status.value = 'running'
    nextQuestion()
    startTicker()
  }

  function submit(input: string): void {
    if (status.value !== 'running' || !current.value || feedback.value !== 'none') return
    const q = current.value
    const correct = isCorrect(q, input)
    const timeMs = elapsedMs.value - questionStartMs
    results.value.push({
      id: q.id,
      expr: q.expr,
      answerDisplay: q.answer.display,
      userAnswer: input,
      correct,
      timeMs,
      category: q.category,
      categoryLabel: q.categoryLabel,
      difficulty: q.difficulty,
      steps: q.steps
    })
    lastInput.value = input
    feedback.value = correct ? 'correct' : 'wrong'

    if (config.autoNext) {
      autoTimer = window.setTimeout(() => advance(), correct ? 700 : 1600)
    }
  }

  function advance(): void {
    clearAuto()
    if (status.value !== 'running') return
    if (totalCount > 0 && results.value.length >= totalCount) {
      finish()
      return
    }
    index.value++
    nextQuestion()
  }

  function skip(): void {
    if (status.value !== 'running') return
    clearAuto()
    if (totalCount > 0 && results.value.length >= totalCount) {
      finish()
      return
    }
    index.value++
    nextQuestion()
  }

  function pause(): void {
    if (status.value === 'running') {
      status.value = 'paused'
      stopTicker()
      clearAuto()
    }
  }
  function resume(): void {
    if (status.value === 'paused') {
      status.value = 'running'
      startTicker()
    }
  }

  function finish(): void {
    if (status.value === 'finished') return
    status.value = 'finished'
    stopTicker()
    clearAuto()
  }

  function recordCategory(): { category: string; label: string } {
    if (config.source === 'category' && config.category) {
      return { category: config.category, label: config.label }
    }
    if (config.source === 'level') {
      return { category: 'level-' + config.difficulty, label: DIFFICULTY_LABELS[config.difficulty] ?? config.label }
    }
    return { category: 'set', label: config.label }
  }

  function buildRecord(): TrainingRecord | null {
    if (results.value.length === 0) return null
    const correct = correctCount.value
    const wrong = results.value.length - correct
    const times = results.value.map((r) => r.timeMs).filter((t) => t > 0)
    const avgTimeMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    const fastestTimeMs = times.length ? Math.min(...times) : 0
    const cat = recordCategory()
    return {
      id: uid(),
      date: todayKey(),
      timestamp: Date.now(),
      mode: config.mode,
      category: cat.category,
      categoryLabel: cat.label,
      difficulty: config.difficulty,
      questionCount: results.value.length,
      correctCount: correct,
      wrongCount: wrong,
      accuracy: correct / results.value.length,
      avgTimeMs,
      fastestTimeMs,
      totalTimeMs: elapsedMs.value,
      questions: results.value
    }
  }

  return {
    status,
    current,
    index,
    results,
    elapsedMs,
    feedback,
    lastInput,
    correctCount,
    wrongCount,
    accuracy,
    remainingMs,
    progress,
    totalCount,
    start,
    submit,
    advance,
    skip,
    pause,
    resume,
    finish,
    buildRecord
  }
}
