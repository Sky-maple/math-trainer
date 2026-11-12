export type TechniqueCategory = 'addsub' | 'mul' | 'div' | 'percent' | 'mixed'

export const CATEGORY_LABELS: Record<TechniqueCategory, string> = {
  addsub: '加减法技巧',
  mul: '乘法技巧',
  div: '除法技巧',
  percent: '百分比技巧',
  mixed: '综合技巧'
}

export const CATEGORY_ORDER: TechniqueCategory[] = ['addsub', 'mul', 'div', 'percent', 'mixed']

/** 教学示例：expr 为展示用题面，evalExpr 为等价纯算术式（供自动化测试） */
export interface TechniqueExample {
  expr: string
  evalExpr: string
  answer: number
  steps: string[]
}

export interface Technique {
  id: string
  name: string
  category: TechniqueCategory
  /** 适用场景 */
  scenario: string
  /** 数学原理 */
  principle: string
  /** 一般计算步骤 */
  steps: string[]
  /** 至少 3 个教学示例 */
  examples: TechniqueExample[]
  /** 常见错误 */
  mistakes: string[]
  /** 使用技巧的判断方法 */
  judge: string
  /** 适合的专项练习建议 */
  practiceHint: string
}

/** 生成器产出的专项题 */
export interface TechniqueQuestion {
  id: string
  techniqueId: string
  /** 展示题面 */
  expr: string
  /** 等价纯算术式（用于自动化测试，不展示） */
  evalExpr: string
  answerDisplay: string
  answerValue: number | null
  judgeKind: 'number' | 'qr'
  quotient: number | null
  remainder: number | null
  /** 本题使用该技巧的解析步骤 */
  steps: string[]
  /** 技巧内难度 1-3 */
  difficulty: number
}

export type TechniqueGenerator = (rng: import('../rng').Rng, level: number) => TechniqueQuestion
