import { ref, computed } from 'vue'
import type { TechniqueQuestion } from '../core/techniques/types'
import { generateTechniqueQuestion, isTechniqueCorrect } from '../core/techniques/generators'
import { TECHNIQUE_MAP } from '../core/techniques/catalog'
import { createRng, type Rng } from '../core/rng'
import { recordTechniqueResult, recordTechniqueMistake } from '../stores/techniqueMastery'

export type TechniqueMode = 'teach' | 'beginner' | 'proficient' | 'speed'
export type TechniqueStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface TechniqueTrainingConfig {
  techniqueId: string
  mode: TechniqueMode
  questionCount: number
  /** 每题限时（秒），0 表示不限 */
  secondsPerQuestion: number
  autoNext: boolean
}

export interface TechniqueResult {
  id: string
  techniqueId: string
  expr: string
  answerDisplay: string
  userAnswer: string
  correct: boolean
  timeMs: number
  timedOut: boolean
  steps: string[]
}

const TARGET_SECONDS: Record<TechniqueMode, number> = {
  teach: 15,
  beginner: 12,
  proficient: 8,
  speed: 5
}

export function useTechniqueTraining(config: TechniqueTrainingConfig) {
  const status = ref<TechniqueStatus>('idle')
  const current = ref<TechniqueQuestion | null>(null)
  const index = ref(0)
  const results = ref<TechniqueResult[]>([])
  const elapsedMs = ref(0)
  const qElapsedMs = ref(0)
  const feedback = ref<'none' | 'correct' | 'wrong'>('none')
  const lastInput = ref('')
  const revealed = ref(false)

  let rng: Rng = createRng()
  let timer: number | null = null
  let autoTimer: number | null = null

  const totalCount = config.questionCount
  const correctCount = computed(() => results.value.filter((r) => r.correct).length)
  const wrongCount = computed(() => results.value.length - correctCount.value)
  const accuracy = computed(() => (results.value.length ? correctCount.value / results.value.length : 0))
  const progress = computed(() => (totalCount > 0 ? Math.min(1, index.value / totalCount) : 0))

  function nextQuestion(): void {
    current.value = generateTechniqueQuestion(config.techniqueId, rng, 1)
    qElapsedMs.value = 0
    feedback.value = 'none'
    lastInput.value = ''
    revealed.value = false
  }

  function startTicker(): void {
    stopTicker()
    timer = window.setInterval(() => {
      elapsedMs.value += 100
      if (status.value === 'running' && feedback.value === 'none') {
        qElapsedMs.value += 100
        if (config.secondsPerQuestion > 0 && qElapsedMs.value >= config.secondsPerQuestion * 1000) {
          submit('', true)
        }
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

  function reveal(): void {
    if (status.value === 'running' && feedback.value === 'none') revealed.value = true
  }

  function submit(input: string, timedOut = false): void {
    if (status.value !== 'running' || !current.value || feedback.value !== 'none') return
    const q = current.value
    const correct = !timedOut && isTechniqueCorrect(q, input)
    const timeMs = qElapsedMs.value
    results.value.push({
      id: q.id,
      techniqueId: q.techniqueId,
      expr: q.expr,
      answerDisplay: q.answerDisplay,
      userAnswer: timedOut ? '超时' : input,
      correct,
      timeMs,
      timedOut,
      steps: q.steps
    })
    lastInput.value = timedOut ? '' : input
    feedback.value = correct ? 'correct' : 'wrong'
    revealed.value = true

    recordTechniqueResult(config.techniqueId, correct, timeMs)
    if (!correct) {
      recordTechniqueMistake(q, TECHNIQUE_MAP[config.techniqueId]?.name ?? config.techniqueId)
    }

    if (config.autoNext) {
      const delay = correct ? 700 : timedOut ? 1000 : 1800
      autoTimer = window.setTimeout(() => advance(), delay)
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

  function pause(): void {
    if (status.value === 'running') {
      status.value = 'paused'
      clearAuto()
    }
  }
  function resume(): void {
    if (status.value === 'paused') status.value = 'running'
  }
  function finish(): void {
    if (status.value === 'finished') return
    status.value = 'finished'
    stopTicker()
    clearAuto()
  }

  const wrongList = computed(() => results.value.filter((r) => !r.correct))

  const summary = computed(() => {
    const times = results.value.filter((r) => !r.timedOut).map((r) => r.timeMs)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    const target = TARGET_SECONDS[config.mode]
    const efficiency = avg > 0 ? Math.min(1, (target * 1000) / avg) : 0
    return {
      count: results.value.length,
      correct: correctCount.value,
      wrong: wrongCount.value,
      accuracy: accuracy.value,
      avgTimeMs: Math.round(avg),
      fastestMs: times.length ? Math.min(...times) : 0,
      targetSeconds: target,
      efficiency,
      wrongList: wrongList.value
    }
  })

  return {
    status,
    current,
    index,
    results,
    elapsedMs,
    qElapsedMs,
    feedback,
    lastInput,
    revealed,
    correctCount,
    wrongCount,
    accuracy,
    progress,
    totalCount,
    summary,
    start,
    submit,
    advance,
    pause,
    resume,
    finish,
    reveal
  }
}
