import { reactive } from 'vue'
import { storage } from './persistence'
import type { TechniqueQuestion } from '../core/techniques/types'
import { TECHNIQUES } from '../core/techniques/catalog'
import { uid } from '../utils'

const MASTERY_KEY = 'technique-mastery'
const MISTAKES_KEY = 'technique-mistakes'

export type MasteryLevel = '未学习' | '学习中' | '初步掌握' | '熟练掌握' | '精通'

export const MASTERY_LEVELS: MasteryLevel[] = ['未学习', '学习中', '初步掌握', '熟练掌握', '精通']

export const MASTERY_COLOR: Record<MasteryLevel, string> = {
  未学习: '#9aa0a8',
  学习中: '#185fa5',
  初步掌握: '#ba7517',
  熟练掌握: '#1d9e75',
  精通: '#534ab7'
}

export interface TechniqueMastery {
  techniqueId: string
  learned: boolean
  practiceCount: number
  correctCount: number
  totalTimeMs: number
  lastPracticeAt: number | null
}

export interface TechniqueMistake {
  id: string
  techniqueId: string
  techniqueName: string
  expr: string
  answerDisplay: string
  steps: string[]
  wrongCount: number
  lastWrongAt: number
  mastered: boolean
}

interface StoreState {
  mastery: Record<string, TechniqueMastery>
  mistakes: TechniqueMistake[]
}

const state = reactive<StoreState>({
  mastery: storage.get<Record<string, TechniqueMastery>>(MASTERY_KEY) ?? {},
  mistakes: storage.get<TechniqueMistake[]>(MISTAKES_KEY) ?? []
})

function persistMastery(): void {
  storage.set(MASTERY_KEY, state.mastery)
}
function persistMistakes(): void {
  storage.set(MISTAKES_KEY, state.mistakes)
}

function emptyMastery(id: string): TechniqueMastery {
  return { techniqueId: id, learned: false, practiceCount: 0, correctCount: 0, totalTimeMs: 0, lastPracticeAt: null }
}

export function masteryOf(id: string): TechniqueMastery {
  return state.mastery[id] ?? emptyMastery(id)
}

/** 掌握等级：需要足够的样本量，避免「一次就对」被判精通 */
export function levelOf(m: TechniqueMastery): MasteryLevel {
  if (!m.learned && m.practiceCount === 0) return '未学习'
  const acc = m.practiceCount ? m.correctCount / m.practiceCount : 0
  const avg = m.practiceCount ? m.totalTimeMs / m.practiceCount : 99999
  if (m.practiceCount >= 50 && acc >= 0.9 && avg <= 5000) return '精通'
  if (m.practiceCount >= 25 && acc >= 0.8 && avg <= 8000) return '熟练掌握'
  if (m.practiceCount >= 10 && acc >= 0.6) return '初步掌握'
  return '学习中'
}

export function masteryLevelOf(id: string): MasteryLevel {
  return levelOf(masteryOf(id))
}

export function accuracyOf(m: TechniqueMastery): number {
  return m.practiceCount ? m.correctCount / m.practiceCount : 0
}
export function avgTimeOf(m: TechniqueMastery): number {
  return m.practiceCount ? Math.round(m.totalTimeMs / m.practiceCount) : 0
}

export function markLearned(id: string): void {
  const m = state.mastery[id] ?? emptyMastery(id)
  m.learned = true
  state.mastery[id] = m
  persistMastery()
}

export function recordTechniqueResult(techniqueId: string, correct: boolean, timeMs: number): void {
  const m = state.mastery[techniqueId] ?? emptyMastery(techniqueId)
  m.practiceCount++
  if (correct) m.correctCount++
  m.totalTimeMs += Math.max(0, timeMs)
  m.lastPracticeAt = Date.now()
  state.mastery[techniqueId] = m
  persistMastery()
}

export function recordTechniqueMistake(q: TechniqueQuestion, techniqueName: string): void {
  const existing = state.mistakes.find((m) => m.techniqueId === q.techniqueId && m.expr === q.expr)
  if (existing) {
    existing.wrongCount++
    existing.lastWrongAt = Date.now()
  } else {
    state.mistakes.push({
      id: uid(),
      techniqueId: q.techniqueId,
      techniqueName,
      expr: q.expr,
      answerDisplay: q.answerDisplay,
      steps: q.steps,
      wrongCount: 1,
      lastWrongAt: Date.now(),
      mastered: false
    })
  }
  persistMistakes()
}

export function setTechniqueMistakeMastered(id: string, mastered: boolean): void {
  const m = state.mistakes.find((x) => x.id === id)
  if (m) {
    m.mastered = mastered
    persistMistakes()
  }
}
export function removeTechniqueMistake(id: string): void {
  const i = state.mistakes.findIndex((x) => x.id === id)
  if (i >= 0) {
    state.mistakes.splice(i, 1)
    persistMistakes()
  }
}
export function clearTechniqueMistakes(): void {
  state.mistakes = []
  persistMistakes()
}
export function allTechniqueMistakes(): TechniqueMistake[] {
  return state.mistakes
}

export interface TechniqueRecommendation {
  techniqueId: string
  reason: string
  score: number
}

/**
 * 智能推荐：优先「未学习」，其次「错误多 / 练习不足」，已精通的不再重复推荐。
 */
export function recommendTechniques(limit = 5): TechniqueRecommendation[] {
  const out: TechniqueRecommendation[] = []
  for (const t of TECHNIQUES) {
    const m = masteryOf(t.id)
    const level = levelOf(m)
    if (level === '精通' || level === '熟练掌握') continue
    const acc = accuracyOf(m)
    let score = 0
    let reason = ''
    if (!m.learned && m.practiceCount === 0) {
      score = 100
      reason = '尚未学习'
    } else if (m.practiceCount >= 5 && acc < 0.6) {
      score = 90 + (0.6 - acc) * 100
      reason = `正确率仅 ${Math.round(acc * 100)}%，错误较多`
    } else if (m.practiceCount < 10) {
      score = 60 + (10 - m.practiceCount) * 2
      reason = '练习次数不足'
    } else if (level === '学习中' || level === '初步掌握') {
      score = 40 + (1 - acc) * 30
      reason = '继续巩固，冲击更高掌握度'
    } else {
      continue
    }
    out.push({ techniqueId: t.id, reason, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** 错误较多的技巧（正确率 < 70% 且练习 >= 5 次） */
export function weakTechniques(): string[] {
  return TECHNIQUES.filter((t) => {
    const m = masteryOf(t.id)
    return m.practiceCount >= 5 && accuracyOf(m) < 0.7
  }).map((t) => t.id)
}

/** 已学技巧数 */
export function learnedCount(): number {
  return TECHNIQUES.filter((t) => masteryOf(t.id).learned).length
}
