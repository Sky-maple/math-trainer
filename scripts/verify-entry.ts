// 出题引擎自检：用「独立实现的递归下降解析器」交叉验证题面与答案，
// 重点覆盖整除、带余数、小数精度、混合运算优先级与括号。
// 由 scripts/verify-generator.mjs 用 esbuild 打包后在 Node 中运行。

import {
  CATEGORIES,
  generateByCategory,
  generateByDifficulty,
  isCorrect,
  DIFFICULTY_LIST
} from '../src/core/index'

/* ---------- 独立表达式求值（与 expression.ts 无关，用于交叉验证） ---------- */

function evalExpr(input: string): number {
  let i = 0
  const s = input

  function skip() {
    while (i < s.length && s[i] === ' ') i++
  }
  function peek(): string {
    skip()
    return s[i] ?? ''
  }
  function expr(): number {
    let v = term()
    for (;;) {
      const c = peek()
      if (c === '+') {
        i++
        v = v + term()
      } else if (c === '-') {
        i++
        v = v - term()
      } else break
    }
    return v
  }
  function term(): number {
    let v = factor()
    for (;;) {
      const c = peek()
      if (c === '×') {
        i++
        v = v * factor()
      } else if (c === '÷') {
        i++
        const r = factor()
        if (r === 0) throw new Error('除零: ' + input)
        if (Number.isInteger(v) && Number.isInteger(r) && v % r !== 0) throw new Error('除不尽: ' + input)
        v = v / r
      } else break
    }
    return v
  }
  function factor(): number {
    const c = peek()
    if (c === '(') {
      i++
      const v = expr()
      if (peek() !== ')') throw new Error('括号不闭合: ' + input)
      i++
      return v
    }
    let num = ''
    let seenDot = false
    while (/\d/.test(peek()) || peek() === '.') {
      const ch = peek()
      if (ch === '.') {
        if (seenDot) throw new Error('多点: ' + input)
        seenDot = true
      }
      num += ch
      i++
    }
    if (num === '' || num === '.') throw new Error('缺数字: ' + input)
    return Number(num)
  }
  const v = expr()
  skip()
  if (i !== s.length) throw new Error('解析未消耗完: ' + input)
  return v
}

/* ---------- 数值解析（用于小数） ---------- */

function parseDec(s: string): number {
  return Number(s)
}

let checks = 0

function assert(cond: boolean, msg: string) {
  checks++
  if (!cond) throw new Error('断言失败: ' + msg)
}

export function run() {
  const seeds = [1, 42, 2026, 999983]
  const samplesPerCategory = 250

  for (const cat of CATEGORIES) {
    for (const seed of seeds) {
      const rng = makeRng(seed)
      for (let n = 0; n < samplesPerCategory; n++) {
        const q = generateByCategory(cat.key, rng)
        const label = `${cat.key} #${n} (seed ${seed}) expr=${q.expr} ans=${q.answer.display}`

        // 1) 标准答案必须被判定为正确
        assert(isCorrect(q, q.answer.display), label + ' 标准答案被判错')

        // 2) 整数类：独立解析器结果须与答案一致（校验优先级/括号/运算）
        if (q.answer.kind === 'integer') {
          assert(Math.abs(evalExpr(q.expr) - Number(q.answer.value)) < 1e-6, label + ' 独立求值不一致')
        }

        // 3) 小数类：独立按数字解析计算须与答案一致
        if (q.answer.kind === 'decimal') {
          const nums = q.expr.split(/\s*[+×÷-]\s*/).map(parseDec)
          const opMatch = q.expr.match(/[+×÷-]/)
          let expect = 0
          if (opMatch) {
            const op = opMatch[0]
            expect = op === '+' ? nums[0] + nums[1] : op === '-' ? nums[0] - nums[1] : op === '×' ? nums[0] * nums[1] : nums[0] / nums[1]
          }
          assert(Math.abs(expect - (q.answer.numeric ?? 0)) < 1e-6, label + ` 小数计算不一致 expect=${expect}`)
        }

        // 4) 除法整除性 / 带余数正确性
        const divM = q.expr.match(/^(\d+)\s*÷\s*(\d+)$/)
        if (divM) {
          const a = Number(divM[1])
          const b = Number(divM[2])
          if (q.answer.kind === 'quotient-remainder') {
            assert(b > 0 && (q.answer.remainder ?? 0) < b, label + ' 余数非法')
            assert(a === b * (q.answer.quotient ?? 0) + (q.answer.remainder ?? 0), label + ' 商余数关系不成立')
          } else {
            assert(a % b === 0, label + ' 未整除')
            assert(a / b === Number(q.answer.value), label + ' 商错误')
          }
        }
      }
    }
    console.log(`  ✓ ${cat.label}（${cat.key}）通过 ${seeds.length * samplesPerCategory} 次`)
  }

  // 难度随机出题也要自洽
  for (const level of DIFFICULTY_LIST) {
    const rng = makeRng(7)
    for (let n = 0; n < 1000; n++) {
      const q = generateByDifficulty(level, rng)
      assert(isCorrect(q, q.answer.display), `难度L${level} 标准答案被判错: ${q.expr}`)
      if (q.answer.kind === 'integer') {
        assert(Math.abs(evalExpr(q.expr) - Number(q.answer.value)) < 1e-6, `难度L${level} 独立求值不一致: ${q.expr}`)
      }
    }
    console.log(`  ✓ 难度 L${level} 通过 1000 次随机自检`)
  }

  console.log(`\n全部通过，共执行 ${checks} 条断言。`)
}

function makeRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle<T>(arr: T[]): T[] {
      return arr
    }
  }
}

run()
