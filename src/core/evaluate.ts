import type { Question } from './types'

/** 归一化用户输入：去空白、统一分隔符 */
export function normalizeInput(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/，/g, ',').replace(/。/g, '')
}

/** 判断用户答案是否正确 */
export function isCorrect(q: Question, raw: string): boolean {
  const input = normalizeInput(raw)
  if (!input) return false
  const ans = q.answer

  if (ans.kind === 'quotient-remainder') {
    const m = parseQr(input)
    if (!m) return false
    return m.q === ans.quotient && m.r === (ans.remainder ?? 0)
  }

  const n = Number(input)
  if (!Number.isFinite(n)) return false
  if (ans.kind === 'integer') return n === Number(ans.value)
  // 小数：容差 1e-6，规避浮点抖动
  return Math.abs(n - (ans.numeric ?? 0)) < 1e-6
}

/** 解析「商余数」输入：支持 "3余2"、"3 余 2"、"3,2"、"3r2" */
function parseQr(s: string): { q: number; r: number } | null {
  const m = s.match(/^(-?\d+)(?:余|r|,)(-?\d+)$/i)
  if (m) return { q: Number(m[1]), r: Number(m[2]) }
  const only = s.match(/^-?\d+$/)
  if (only) return { q: Number(only[0]), r: 0 }
  return null
}
