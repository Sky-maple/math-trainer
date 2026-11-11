import { reactive } from 'vue'
import { storage } from './persistence'
import type { TrainingRecord, MistakeRecord, QuestionResult } from '../core/types'
import { dateKey, daysAgo, todayKey, uid } from '../utils'

const RECORDS_KEY = 'records'
const MISTAKES_KEY = 'mistakes'

interface StoreState {
  records: TrainingRecord[]
  mistakes: MistakeRecord[]
}

const state = reactive<StoreState>({
  records: storage.get<TrainingRecord[]>(RECORDS_KEY) ?? [],
  mistakes: storage.get<MistakeRecord[]>(MISTAKES_KEY) ?? []
})

function persistRecords(): void {
  storage.set(RECORDS_KEY, state.records)
}
function persistMistakes(): void {
  storage.set(MISTAKES_KEY, state.mistakes)
}

/* ---------------- 写入 ---------------- */

export function addRecord(record: TrainingRecord): void {
  state.records.push(record)
  persistRecords()
}

/** 答错时记入错题本（同题合并，只累加错误次数） */
export function recordMistake(qr: QuestionResult): void {
  const existing = state.mistakes.find((m) => m.expr === qr.expr)
  if (existing) {
    existing.wrongCount++
    existing.lastWrongAt = Date.now()
    existing.difficulty = qr.difficulty
  } else {
    state.mistakes.push({
      id: uid(),
      expr: qr.expr,
      answerDisplay: qr.answerDisplay,
      steps: qr.steps,
      category: qr.category,
      categoryLabel: qr.categoryLabel,
      difficulty: qr.difficulty,
      wrongCount: 1,
      lastWrongAt: Date.now(),
      mastered: false
    })
  }
  persistMistakes()
}

export function setMistakeMastered(id: string, mastered: boolean): void {
  const m = state.mistakes.find((x) => x.id === id)
  if (m) {
    m.mastered = mastered
    persistMistakes()
  }
}

export function removeMistake(id: string): void {
  const i = state.mistakes.findIndex((x) => x.id === id)
  if (i >= 0) {
    state.mistakes.splice(i, 1)
    persistMistakes()
  }
}

export function clearMistakes(): void {
  state.mistakes = []
  persistMistakes()
}

export function clearAllData(): void {
  state.records = []
  state.mistakes = []
  persistRecords()
  persistMistakes()
}

/* ---------------- 读取 / 统计 ---------------- */

export function allRecords(): TrainingRecord[] {
  return state.records
}
export function allMistakes(): MistakeRecord[] {
  return state.mistakes
}

export interface Aggregate {
  count: number
  questions: number
  correct: number
  accuracy: number
  avgTimeMs: number
  totalTimeMs: number
}

function aggregate(records: TrainingRecord[]): Aggregate {
  const questions = records.reduce((s, r) => s + r.questionCount, 0)
  const correct = records.reduce((s, r) => s + r.correctCount, 0)
  const totalTimeMs = records.reduce((s, r) => s + r.totalTimeMs, 0)
  return {
    count: records.length,
    questions,
    correct,
    accuracy: questions ? correct / questions : 0,
    avgTimeMs: questions ? Math.round(totalTimeMs / questions) : 0,
    totalTimeMs
  }
}

/** 今日概况 */
export function todayStat(): Aggregate {
  const tk = todayKey()
  return aggregate(state.records.filter((r) => r.date === tk))
}

/** 累计答题总量 */
export function totalQuestions(): number {
  return state.records.reduce((s, r) => s + r.questionCount, 0)
}

/** 连续训练天数（今天没练则从昨天往前算） */
export function streakDays(): number {
  const days = new Set(state.records.map((r) => r.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const k = dateKey(daysAgo(i))
    if (days.has(k)) {
      streak++
    } else if (i === 0) {
      continue
    } else {
      break
    }
  }
  return streak
}

export interface DayStat extends Aggregate {
  date: string
  label: string
}

/** 最近 n 天逐日统计（用于趋势图） */
export function lastNDays(n: number): DayStat[] {
  const res: DayStat[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = daysAgo(i)
    const k = dateKey(d)
    const agg = aggregate(state.records.filter((r) => r.date === k))
    res.push({
      date: k,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      ...agg
    })
  }
  return res
}

export interface CategoryStat {
  category: string
  label: string
  questions: number
  correct: number
  accuracy: number
  avgTimeMs: number
}

/** 按题型分类统计 */
export function categoryStats(): CategoryStat[] {
  const map = new Map<string, { label: string; questions: number; correct: number; totalTime: number }>()
  for (const r of state.records) {
    const s = map.get(r.category) ?? { label: r.categoryLabel, questions: 0, correct: 0, totalTime: 0 }
    s.questions += r.questionCount
    s.correct += r.correctCount
    s.totalTime += r.totalTimeMs
    map.set(r.category, s)
  }
  return [...map.entries()]
    .map(([category, s]) => ({
      category,
      label: s.label || category,
      questions: s.questions,
      correct: s.correct,
      accuracy: s.questions ? s.correct / s.questions : 0,
      avgTimeMs: s.questions ? Math.round(s.totalTime / s.questions) : 0
    }))
    .sort((a, b) => b.questions - a.questions)
}

export interface ModeStat {
  mode: string
  label: string
  questions: number
  correct: number
  accuracy: number
}

const MODE_LABEL: Record<string, string> = {
  practice: '基础训练',
  timed: '限时挑战',
  smart: '智能训练',
  mistake: '错题重练'
}

/** 按训练模式统计 */
export function modeStats(): ModeStat[] {
  const map = new Map<string, { questions: number; correct: number }>()
  for (const r of state.records) {
    const s = map.get(r.mode) ?? { questions: 0, correct: 0 }
    s.questions += r.questionCount
    s.correct += r.correctCount
    map.set(r.mode, s)
  }
  return [...map.entries()].map(([mode, s]) => ({
    mode,
    label: MODE_LABEL[mode] ?? mode,
    questions: s.questions,
    correct: s.correct,
    accuracy: s.questions ? s.correct / s.questions : 0
  }))
}

export interface MonthStat {
  month: string
  questions: number
  correct: number
  accuracy: number
  avgTimeMs: number
}

/** 按月统计（近 12 个月） */
export function monthlyStats(): MonthStat[] {
  const map = new Map<string, { questions: number; correct: number; totalTime: number }>()
  for (const r of state.records) {
    const month = r.date.slice(0, 7)
    const s = map.get(month) ?? { questions: 0, correct: 0, totalTime: 0 }
    s.questions += r.questionCount
    s.correct += r.correctCount
    s.totalTime += r.totalTimeMs
    map.set(month, s)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, s]) => ({
      month,
      questions: s.questions,
      correct: s.correct,
      accuracy: s.questions ? s.correct / s.questions : 0,
      avgTimeMs: s.questions ? Math.round(s.totalTime / s.questions) : 0
    }))
}

export interface WeekStat {
  week: string
  label: string
  questions: number
  correct: number
  accuracy: number
  avgTimeMs: number
}

/** 按周统计（周一起始，近 8 周） */
export function weeklyStats(): WeekStat[] {
  const map = new Map<string, { questions: number; correct: number; totalTime: number }>()
  for (const r of state.records) {
    const d = new Date(r.date + 'T00:00:00')
    const offset = (d.getDay() + 6) % 7 // 周一 = 0
    const monday = new Date(d)
    monday.setDate(d.getDate() - offset)
    const key = dateKey(monday)
    const s = map.get(key) ?? { questions: 0, correct: 0, totalTime: 0 }
    s.questions += r.questionCount
    s.correct += r.correctCount
    s.totalTime += r.totalTimeMs
    map.set(key, s)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, s]) => ({
      week,
      label: week.slice(5).replace('-', '/') + ' 周',
      questions: s.questions,
      correct: s.correct,
      accuracy: s.questions ? s.correct / s.questions : 0,
      avgTimeMs: s.questions ? Math.round(s.totalTime / s.questions) : 0
    }))
}
