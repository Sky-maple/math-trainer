export type Operation = 'add' | 'sub' | 'mul' | 'div' | 'mix'

export type AnswerKind = 'integer' | 'decimal' | 'quotient-remainder'

/** 标准答案：整数 / 小数 / 商余数 三种形态 */
export interface Answer {
  kind: AnswerKind
  /** 展示用字符串 */
  display: string
  /** integer/decimal 的规范数值字符串 */
  value: string | null
  quotient: number | null
  remainder: number | null
  /** 用于判分的数值（integer/decimal 才有） */
  numeric: number | null
}

export interface Question {
  id: string
  /** 题面，如 "12 + 34"、"6 × 7 ÷ 3"、"(3 + 4) × 5" */
  expr: string
  answer: Answer
  /** 计算步骤解析 */
  steps: string[]
  category: string
  categoryLabel: string
  operation: Operation
  /** 难度 1-5 */
  difficulty: number
}

export type TrainMode = 'practice' | 'timed' | 'smart' | 'mistake'

export interface QuestionResult {
  id: string
  expr: string
  answerDisplay: string
  userAnswer: string
  correct: boolean
  timeMs: number
  category: string
  categoryLabel: string
  difficulty: number
  steps: string[]
}

export interface TrainingRecord {
  id: string
  /** yyyy-mm-dd */
  date: string
  timestamp: number
  mode: TrainMode
  category: string
  categoryLabel: string
  difficulty: number
  questionCount: number
  correctCount: number
  wrongCount: number
  /** 0-1 */
  accuracy: number
  avgTimeMs: number
  fastestTimeMs: number
  totalTimeMs: number
  questions: QuestionResult[]
}

export interface MistakeRecord {
  id: string
  expr: string
  answerDisplay: string
  steps: string[]
  category: string
  categoryLabel: string
  difficulty: number
  wrongCount: number
  lastWrongAt: number
  mastered: boolean
}
