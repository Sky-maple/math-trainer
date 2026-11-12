// 技巧模块自检：验证 32 个技巧的教学数据与出题器。
// 重点：答案与题面自洽、题目符合技巧适用条件、教学示例答案正确。
import { TECHNIQUES } from '../src/core/techniques/catalog'
import {
  generateTechniqueQuestion,
  isTechniqueCorrect,
  TECHNIQUE_GENERATORS
} from '../src/core/techniques/generators'

/* ---------- 独立表达式求值（支持小数、四则运算、括号） ---------- */
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
        v += term()
      } else if (c === '-') {
        i++
        v -= term()
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
        v *= factor()
      } else if (c === '÷') {
        i++
        v /= factor()
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
    let dot = false
    while (/\d/.test(peek()) || peek() === '.') {
      const ch = peek()
      if (ch === '.') {
        if (dot) throw new Error('多点: ' + input)
        dot = true
      }
      num += ch
      i++
    }
    if (num === '' || num === '.') throw new Error('缺数字: ' + input)
    return Number(num)
  }
  const v = expr()
  skip()
  if (i !== s.length) throw new Error('解析未完全: ' + input)
  return v
}

function splitOp(expr: string, op: string): [number, number] | null {
  const parts = expr.split(op)
  if (parts.length !== 2) return null
  const a = Number(parts[0].trim())
  const b = Number(parts[1].trim())
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null
}

let checks = 0
function assert(cond: boolean, msg: string) {
  checks++
  if (!cond) throw new Error('断言失败: ' + msg)
}

/** 题目是否符合该技巧的适用条件 */
function applicability(techId: string, q: ReturnType<typeof generateTechniqueQuestion>): boolean {
  const expr = q.expr
  switch (techId) {
    case 'mul-11': {
      const p = splitOp(expr, '×')
      return !!p && p[1] === 11
    }
    case 'mul-5-25': {
      const p = splitOp(expr, '×')
      return !!p && (p[1] === 5 || p[1] === 25)
    }
    case 'mul-9-99': {
      const p = splitOp(expr, '×')
      return !!p && (p[1] === 9 || p[1] === 99)
    }
    case 'mul-special': {
      const p = splitOp(expr, '×')
      if (!p) return false
      if (p[1] === 125) return p[0] % 8 === 0
      return p[1] === 50 || p[1] === 20
    }
    case 'near-ten-mul': {
      const p = splitOp(expr, '×')
      if (!p) return false
      const [a, b] = p
      return b >= 2 && b <= 9 && a % 10 !== 0 && Math.abs(a - Math.round(a / 10) * 10) <= 3
    }
    case 'near-hundred-mul': {
      const p = splitOp(expr, '×')
      return !!p && p[0] >= 95 && p[0] <= 105 && p[0] !== 100
    }
    case 'square-fast': {
      const p = splitOp(expr, '×')
      return !!p && p[0] === p[1]
    }
    case 'diff-squares': {
      const p = splitOp(expr, '×')
      if (!p) return false
      const [a, b] = p
      return a < b && (a + b) % 20 === 0
    }
    case 'same-ten-complement': {
      const p = splitOp(expr, '×')
      if (!p) return false
      const [a, b] = p
      return Math.floor(a / 10) === Math.floor(b / 10) && (a % 10) + (b % 10) === 10
    }
    case 'div-5-25-50-125': {
      const p = splitOp(expr, '÷')
      return !!p && [5, 25, 50, 125].includes(p[1])
    }
    case 'div-remainder':
      return q.judgeKind === 'qr'
    case 'div-estimate': {
      const p = splitOp(expr, '÷')
      return !!p && p[1] % 10 === 0 && Math.round(p[0] / p[1]) === q.answerValue
    }
    case 'pct-10-1-5':
      return expr.includes('10%') || expr.includes('1%') || expr.includes('5%')
    case 'pct-25-50-75':
      return expr.includes('25%') || expr.includes('50%') || expr.includes('75%')
    case 'pct-split': {
      const m = expr.match(/(\d+)%/)
      if (!m) return false
      const pct = Number(m[1])
      return pct % 10 === 5 && pct >= 15 && pct <= 55
    }
    case 'pct-discount':
      return expr.includes('折')
    case 'pct-growth':
      return expr.includes('增长') || expr.includes('下降')
    case 'mul-distribute': {
      const p = splitOp(expr, '×')
      return !!p && [12, 15, 16, 18, 24, 25, 32, 36, 45, 48, 55].includes(p[0]) && p[1] >= 12 && p[1] <= 99 && p[1] % 10 !== 0
    }
    case 'mix-distribute': {
      const m = expr.match(/^(\d+) × (\d+) \+ (\d+) × (\d+)$/)
      if (!m) return false
      return Number(m[1]) === Number(m[3]) && Number(m[2]) + Number(m[4]) === 100
    }
    case 'mix-commute': {
      const m = expr.match(/^(\d+) × (\d+) × (\d+)$/)
      if (!m) return false
      const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])]
      return [a * b, a * c, b * c].some((v) => v === 100 || v === 1000 || v === 10 || v === 200)
    }
    case 'mix-split-recombine': {
      const nums = expr.split('+').map((x) => Number(x.trim()))
      return nums.length === 4 && nums[0] + nums[2] === 100 && nums[1] + nums[3] === 100
    }
    case 'round-add': {
      const p = expr.includes('+') ? splitOp(expr, '+') : splitOp(expr, '-')
      if (!p) return false
      return p.some((o) => [100, 200, 300, 500, 1000].some((r) => Math.abs(o - r) <= 5 && o !== r))
    }
    case 'complement': {
      if (expr.includes('-')) {
        const p = splitOp(expr, '-')
        return !!p && (p[0] === 100 || p[0] === 1000)
      }
      const p = splitOp(expr, '+')
      return !!p && (p[0] + p[1] === 100 || p[0] + p[1] === 1000)
    }
    case 'commute-addsub': {
      if (expr.includes('-')) {
        const m = expr.match(/^(\d+) - (\d+) - (\d+)$/)
        return !!m && Number(m[1]) - Number(m[3]) === 100
      }
      const m = expr.match(/^(\d+) \+ (\d+) \+ (\d+)$/)
      return !!m && Number(m[1]) + Number(m[3]) === 100
    }
    case 'split-addsub': {
      const p = expr.includes('+') ? splitOp(expr, '+') : splitOp(expr, '-')
      return !!p && p[1] >= 11 && p[1] <= 99
    }
    case 'left-to-right': {
      const p = expr.includes('+') ? splitOp(expr, '+') : splitOp(expr, '-')
      return !!p && p[0] >= 100
    }
    case 'chain-addsub': {
      const nums = expr.split(/[+-]/).map((x) => Number(x.trim()))
      return nums.length >= 3 && nums.every((n) => Number.isFinite(n))
    }
    case 'div-reduce': {
      const p = splitOp(expr, '÷')
      return !!p && p[1] >= 12 && p[0] % p[1] === 0
    }
    case 'div-split-divisor': {
      const p = splitOp(expr, '÷')
      if (!p) return false
      return p[0] % p[1] === 0 && [2, 3, 4, 5, 6, 7, 8, 9].some((d) => p[1] % d === 0 && p[1] !== d)
    }
    case 'div-multiple': {
      const p = splitOp(expr, '÷')
      return !!p && p[1] >= 11 && p[1] <= 49 && p[0] % p[1] === 0
    }
    case 'mix-multistep':
      return expr.includes('×') && (expr.includes('+') || expr.includes('-'))
    case 'mix-estimate': {
      const p = splitOp(expr, '×')
      if (!p) return false
      return [100, 200, 300].some((r) => Math.abs(p[0] - r) <= 5) && p[1] >= 2 && p[1] <= 9
    }
    default:
      return true
  }
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
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
      }
      return a
    }
  }
}

export function run() {
  const seeds = [3, 77, 2026]
  const perTech = 400

  // 1) 教学数据完整性 + 教学示例正确性
  for (const t of TECHNIQUES) {
    assert(t.name.length > 0, `${t.id} 缺少名称`)
    assert(t.scenario.length > 0, `${t.id} 缺少适用场景`)
    assert(t.principle.length > 0, `${t.id} 缺少数学原理`)
    assert(t.steps.length >= 2, `${t.id} 步骤不足`)
    assert(t.examples.length >= 3, `${t.id} 教学示例不足 3 个`)
    assert(t.mistakes.length >= 1, `${t.id} 缺少常见错误`)
    assert(t.judge.length > 0, `${t.id} 缺少判断方法`)
    assert(t.practiceHint.length > 0, `${t.id} 缺少练习建议`)
    for (const ex of t.examples) {
      const v = evalExpr(ex.evalExpr)
      if (t.id === 'div-estimate') {
        assert(Math.round(v) === ex.answer, `${t.id} 示例 ${ex.expr} 估算答案错误：算出 ${v}，标注 ${ex.answer}`)
      } else if (t.id === 'div-remainder') {
        assert(Math.floor(v) === ex.answer, `${t.id} 示例 ${ex.expr} 商错误：算出 ${v}，标注 ${ex.answer}`)
      } else {
        assert(Math.abs(v - ex.answer) < 1e-6, `${t.id} 示例 ${ex.expr} 答案错误：算出 ${v}，标注 ${ex.answer}`)
      }
    }
  }
  console.log(`  ✓ ${TECHNIQUES.length} 个技巧的教学数据与示例全部通过`)

  // 2) 每个技巧的出题器
  for (const t of TECHNIQUES) {
    const gen = TECHNIQUE_GENERATORS[t.id]
    assert(!!gen, `${t.id} 缺少出题器`)
    for (const seed of seeds) {
      const rng = makeRng(seed)
      for (let n = 0; n < perTech; n++) {
        const q = generateTechniqueQuestion(t.id, rng, 1)
        const label = `${t.id} #${n} seed=${seed} expr=${q.expr}`
        assert(q.techniqueId === t.id, label + ' techniqueId 不符')
        assert(q.expr.length > 0, label + ' 题面为空')
        assert(q.steps.length > 0, label + ' 缺少解析')
        assert(isTechniqueCorrect(q, q.answerDisplay), label + ' 标准答案被判错')
        assert(applicability(t.id, q), label + ' 不符合技巧适用条件')

        if (q.judgeKind === 'qr') {
          const p = splitOp(q.expr, '÷')
          assert(!!p, label + ' 余数题解析失败')
          const [a, b] = p!
          assert(b > 0 && (q.remainder ?? 0) > 0 && (q.remainder ?? 0) < b, label + ' 余数非法')
          assert(a === b * (q.quotient ?? 0) + (q.remainder ?? 0), label + ' 商余数关系不成立')
        } else {
          const v = evalExpr(q.evalExpr)
          if (t.id === 'div-estimate') {
            assert(Math.round(v) === q.answerValue, `${label} 估算值不符：算出 ${v}`)
          } else {
            assert(Math.abs(v - (q.answerValue ?? 0)) < 1e-6, `${label} 答案错误：算出 ${v}，标注 ${q.answerValue}`)
          }
        }
      }
    }
    console.log(`  ✓ ${t.name}（${t.id}）通过 ${seeds.length * perTech} 次`)
  }

  console.log(`\n技巧模块全部通过，共执行 ${checks} 条断言。`)
}

run()
