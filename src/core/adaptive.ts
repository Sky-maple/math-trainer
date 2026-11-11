import type { TrainingRecord, MistakeRecord } from './types'

export interface AdaptiveAdvice {
  recommendedLevel: number
  message: string
  focusCategories: string[]
  recentAccuracy: number | null
  recentCount: number
}

/**
 * 智能训练：基于最近表现推荐难度与专项。
 * - 近 20 题正确率 < 70% → 降一档
 * - 近 20 题正确率 >= 90% → 升一档
 * - 近 30 题中某分类错误率 >= 50% 且错 >= 2 次 → 列入专项练习
 */
export function recommend(records: TrainingRecord[], mistakes: MistakeRecord[], currentLevel: number): AdaptiveAdvice {
  const questions = records.flatMap((r) => r.questions).slice(-20)
  const recentCount = questions.length
  let recommendedLevel = currentLevel
  let message: string
  let recentAccuracy: number | null = null

  if (recentCount >= 5) {
    const correct = questions.filter((q) => q.correct).length
    recentAccuracy = correct / recentCount
    if (recentAccuracy < 0.7) {
      recommendedLevel = Math.max(1, currentLevel - 1)
      message = '最近正确率低于 70%，建议降低一个难度，先把基础打牢。'
    } else if (recentAccuracy >= 0.9 && currentLevel < 5) {
      recommendedLevel = currentLevel + 1
      message = '最近正确率达到 90% 以上，可以挑战更高难度了。'
    } else {
      recommendedLevel = currentLevel
      message = '当前难度合适，保持练习节奏即可。'
    }
  } else {
    message = '训练数据还不够，先完成几组练习，我再给出个性化建议。'
  }

  const recent30 = records.flatMap((r) => r.questions).slice(-30)
  const stat = new Map<string, { wrong: number; total: number }>()
  for (const q of recent30) {
    const s = stat.get(q.category) ?? { wrong: 0, total: 0 }
    s.total++
    if (!q.correct) s.wrong++
    stat.set(q.category, s)
  }
  const focusCategories = [...stat.entries()]
    .filter(([, s]) => s.wrong >= 2 && s.wrong / s.total >= 0.5)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .map(([c]) => c)

  return { recommendedLevel, message, focusCategories, recentAccuracy, recentCount }
}
