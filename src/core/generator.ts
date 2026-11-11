import type { Answer, Question } from './types'
import type { Rng } from './rng'
import { decToString } from './decimal'
import { Node, num, bin, evalNode, toInfix, genSteps, Op } from './expression'

export interface CategoryMeta {
  key: string
  label: string
  operation: 'add' | 'sub' | 'mul' | 'div' | 'mix'
  difficulty: number
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'mul-table', label: '乘法口诀', operation: 'mul', difficulty: 1 },
  { key: 'add-2-2', label: '两位数加法', operation: 'add', difficulty: 2 },
  { key: 'sub-2', label: '两位数减法', operation: 'sub', difficulty: 2 },
  { key: 'mul-2-1', label: '两位数 × 一位数', operation: 'mul', difficulty: 2 },
  { key: 'div-exact', label: '整除运算', operation: 'div', difficulty: 2 },
  { key: 'div-2-1', label: '两位数 ÷ 一位数', operation: 'div', difficulty: 2 },
  { key: 'add-3-3', label: '三位数加法', operation: 'add', difficulty: 3 },
  { key: 'sub-3', label: '三位数减法', operation: 'sub', difficulty: 3 },
  { key: 'mul-2-2', label: '两位数 × 两位数', operation: 'mul', difficulty: 3 },
  { key: 'div-rem', label: '带余数除法', operation: 'div', difficulty: 3 },
  { key: 'add-dec', label: '小数加法', operation: 'add', difficulty: 3 },
  { key: 'sub-dec', label: '小数减法', operation: 'sub', difficulty: 3 },
  { key: 'mix-addsub', label: '加减混合', operation: 'mix', difficulty: 3 },
  { key: 'mix-muldiv', label: '乘除混合', operation: 'mix', difficulty: 3 },
  { key: 'add-multi', label: '多位数加法', operation: 'add', difficulty: 4 },
  { key: 'sub-multi', label: '多位数减法', operation: 'sub', difficulty: 4 },
  { key: 'mul-3-2', label: '三位数 × 两位数', operation: 'mul', difficulty: 4 },
  { key: 'div-3-2', label: '三位数 ÷ 两位数', operation: 'div', difficulty: 4 },
  { key: 'mul-dec', label: '小数乘法', operation: 'mul', difficulty: 4 },
  { key: 'div-dec', label: '小数除法', operation: 'div', difficulty: 4 },
  { key: 'mix-all', label: '四则混合运算', operation: 'mix', difficulty: 4 },
  { key: 'mix-bracket', label: '带括号的运算', operation: 'mix', difficulty: 5 }
]

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
)

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'L1 基础入门',
  2: 'L2 基础进阶',
  3: 'L3 熟练训练',
  4: 'L4 高级训练',
  5: 'L5 挑战模式'
}

export const DIFFICULTY_LIST = [1, 2, 3, 4, 5]

/** 每个难度等级包含的题型 */
export const DIFFICULTY_CATEGORIES: Record<number, string[]> = {
  1: ['mul-table', 'add-2-2', 'sub-2'],
  2: ['add-2-2', 'sub-2', 'mul-2-1', 'div-2-1', 'div-exact', 'mix-addsub'],
  3: ['add-3-3', 'sub-3', 'mul-2-2', 'div-rem', 'add-dec', 'sub-dec', 'mix-muldiv'],
  4: ['add-multi', 'sub-multi', 'mul-3-2', 'div-3-2', 'mul-dec', 'div-dec', 'mix-all'],
  5: ['add-multi', 'sub-multi', 'mul-3-2', 'div-rem', 'mul-dec', 'div-dec', 'mix-all', 'mix-bracket']
}

/* ---------------- 答案构造 ---------------- */

function intAns(v: number): Answer {
  return { kind: 'integer', display: String(v), value: String(v), quotient: null, remainder: null, numeric: v }
}

function decAns(int: number, scale: number): Answer {
  const s = decToString(int, scale)
  return { kind: 'decimal', display: s, value: s, quotient: null, remainder: null, numeric: int / Math.pow(10, scale) }
}

function qrAns(q: number, r: number): Answer {
  return { kind: 'quotient-remainder', display: `${q} 余 ${r}`, value: null, quotient: q, remainder: r, numeric: null }
}

let seq = 0
function build(category: string, expr: string, answer: Answer, steps: string[], difficulty: number): Question {
  const meta = CATEGORY_MAP[category]
  seq++
  return {
    id: `${Date.now().toString(36)}-${seq}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    expr,
    answer,
    steps,
    category,
    categoryLabel: meta.label,
    operation: meta.operation,
    difficulty
  }
}

/* ---------------- 基础运算步骤 ---------------- */

function addSteps(a: string, b: string, ans: string): string[] {
  return ['列竖式，相同数位对齐（个位对个位、十位对十位）', '从个位起逐位相加，满十向前一位进 1', `${a} + ${b} = ${ans}`]
}
function subSteps(a: string, b: string, ans: string): string[] {
  return ['列竖式，相同数位对齐', '从个位起逐位相减，不够减时向前一位借 1 当 10', `${a} - ${b} = ${ans}`]
}
function mulSteps(a: string, b: string, ans: string): string[] {
  return [`把 ${b} 拆成十位和个位，分别与 ${a} 相乘后错位相加`, `${a} × ${b} = ${ans}`]
}
function divSteps(a: string, b: string, q: string): string[] {
  return [`试商：看 ${a} 里面最多有几个 ${b}`, `${a} ÷ ${b} = ${q}`]
}
function divRemSteps(a: number, b: number, q: number, r: number): string[] {
  return [
    `试商：${a} 里最多有 ${q} 个 ${b}，因为 ${b} × ${q} = ${b * q}`,
    `余数 = ${a} - ${b * q} = ${r}（余数必须小于除数 ${b}）`,
    `${a} ÷ ${b} = ${q} 余 ${r}`
  ]
}

/* ---------------- 各题型生成器 ---------------- */

function genAddSub(rng: Rng, category: string, min: number, max: number, difficulty: number): Question {
  const a = rng.int(min, max)
  const b = rng.int(min, max)
  if (category.startsWith('add')) {
    const ans = a + b
    return build(category, `${a} + ${b}`, intAns(ans), addSteps(String(a), String(b), String(ans)), difficulty)
  }
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  const ans = hi - lo
  return build(category, `${hi} - ${lo}`, intAns(ans), subSteps(String(hi), String(lo), String(ans)), difficulty)
}

function genMulSimple(rng: Rng, category: string, difficulty: number): Question {
  if (category === 'mul-table') {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    const ans = a * b
    return build(category, `${a} × ${b}`, intAns(ans), [`用乘法口诀：${a} × ${b}`, `${a} × ${b} = ${ans}`], difficulty)
  }
  if (category === 'mul-2-1') {
    const a = rng.int(10, 99)
    const b = rng.int(2, 9)
    const ans = a * b
    return build(category, `${a} × ${b}`, intAns(ans), mulSteps(String(a), String(b), String(ans)), difficulty)
  }
  if (category === 'mul-2-2') {
    const a = rng.int(10, 99)
    const b = rng.int(10, 99)
    const ans = a * b
    return build(category, `${a} × ${b}`, intAns(ans), mulSteps(String(a), String(b), String(ans)), difficulty)
  }
  // mul-3-2
  const a = rng.int(100, 999)
  const b = rng.int(10, 99)
  const ans = a * b
  return build(category, `${a} × ${b}`, intAns(ans), mulSteps(String(a), String(b), String(ans)), difficulty)
}

function genDivExact(rng: Rng, category: string, difficulty: number): Question {
  if (category === 'div-2-1') {
    // 两位数 ÷ 一位数：被除数落在 10..99
    for (let i = 0; i < 20; i++) {
      const b = rng.int(2, 9)
      const q = rng.int(2, 9)
      const a = b * q
      if (a >= 10 && a <= 99) {
        return build(category, `${a} ÷ ${b}`, intAns(q), divSteps(String(a), String(b), String(q)), difficulty)
      }
    }
    return build(category, '42 ÷ 6', intAns(7), divSteps('42', '6', '7'), difficulty)
  }
  if (category === 'div-3-2') {
    // 三位数 ÷ 两位数：被除数落在 100..999，除数 10..99，整除
    for (let i = 0; i < 40; i++) {
      const b = rng.int(10, 99)
      const q = rng.int(2, Math.floor(999 / b))
      if (q < 2) continue
      const a = b * q
      if (a >= 100 && a <= 999) {
        return build(category, `${a} ÷ ${b}`, intAns(q), divSteps(String(a), String(b), String(q)), difficulty)
      }
    }
    return build(category, '144 ÷ 12', intAns(12), divSteps('144', '12', '12'), difficulty)
  }
  // div-exact：整除运算（三位数 ÷ 一位数，商两位数）
  const b = rng.int(2, 9)
  const q = rng.int(10, 99)
  const a = b * q
  return build(category, `${a} ÷ ${b}`, intAns(q), divSteps(String(a), String(b), String(q)), difficulty)
}

function genDivRem(rng: Rng, difficulty: number): Question {
  let b: number, q: number, r: number
  if (difficulty >= 5) {
    b = rng.int(10, 99)
    q = rng.int(2, 49)
  } else {
    b = rng.int(2, 9)
    q = rng.int(2, 99)
  }
  r = rng.int(1, b - 1)
  const a = b * q + r
  return build('div-rem', `${a} ÷ ${b}`, qrAns(q, r), divRemSteps(a, b, q, r), difficulty)
}

function genDecAddSub(rng: Rng, category: string, difficulty: number): Question {
  const scale = rng.pick([1, 2])
  const max = scale === 1 ? 9999 : 99999
  const min = scale === 1 ? 11 : 105
  const ai = rng.int(min, max)
  const bi = rng.int(min, max)
  const op = category.startsWith('add') ? '+' : '-'
  const hi = Math.max(ai, bi)
  const lo = Math.min(ai, bi)
  // 减法用「大数 - 小数」保证非负；加法保持原顺序即可
  const left = op === '+' ? ai : hi
  const right = op === '+' ? bi : lo
  const ansInt = op === '+' ? ai + bi : hi - lo
  const aStr = decToString(left, scale)
  const bStr = decToString(right, scale)
  const ansStr = decToString(ansInt, scale)
  const steps = [
    '小数点对齐，再按整数规则相加减',
    op === '+' ? `整数部分相加、小数部分相加：${aStr} + ${bStr}` : `先对齐小数点，再逐位相减：${aStr} - ${bStr}`,
    `${aStr} ${op} ${bStr} = ${ansStr}`
  ]
  return build(category, `${aStr} ${op} ${bStr}`, decAns(ansInt, scale), steps, difficulty)
}

function genMulDec(rng: Rng, difficulty: number): Question {
  // 两种形态：小数×整数，或 小数×小数
  if (rng.next() < 0.5) {
    const ai = rng.int(11, 99) // 1.1 ~ 9.9
    const b = rng.int(2, 9)
    const ansInt = ai * b
    const aStr = decToString(ai, 1)
    return build(
      'mul-dec',
      `${aStr} × ${b}`,
      decAns(ansInt, 1),
      [`先按整数算：${ai} × ${b} = ${ansInt}`, `因数共 1 位小数，积的小数点向左移 1 位：${aStr} × ${b} = ${decToString(ansInt, 1)}`],
      difficulty
    )
  }
  const ai = rng.int(11, 99)
  const bi = rng.int(11, 99)
  const ansInt = ai * bi
  const aStr = decToString(ai, 1)
  const bStr = decToString(bi, 1)
  return build(
    'mul-dec',
    `${aStr} × ${bStr}`,
    decAns(ansInt, 2),
    [`先按整数算：${ai} × ${bi} = ${ansInt}`, `两个因数共 2 位小数，积的小数点向左移 2 位：${aStr} × ${bStr} = ${decToString(ansInt, 2)}`],
    difficulty
  )
}

function genDivDec(rng: Rng, difficulty: number): Question {
  if (rng.next() < 0.5) {
    // 形如 12.5 ÷ 5 = 2.5
    const d = rng.int(2, 9)
    let qi = rng.int(11, 99)
    // 保证被除数的小数位非零，题面才是真正的小数除法（而非“8 ÷ 5”这种整数式）
    let guard = 0
    while ((d * qi) % 10 === 0 && guard++ < 50) {
      qi = rng.int(11, 99)
    }
    const dividendInt = d * qi
    return build(
      'div-dec',
      `${decToString(dividendInt, 1)} ÷ ${d}`,
      decAns(qi, 1),
      [`把被除数看成整数：${dividendInt} ÷ ${d} = ${qi}`, `被除数有 1 位小数，商也有 1 位小数：${decToString(dividendInt, 1)} ÷ ${d} = ${decToString(qi, 1)}`],
      difficulty
    )
  }
  // 形如 3.2 ÷ 0.8 = 4
  const di = rng.int(2, 9) // 0.2 ~ 0.9
  const q = rng.int(2, 9)
  const dividendInt = di * q
  return build(
    'div-dec',
    `${decToString(dividendInt, 1)} ÷ ${decToString(di, 1)}`,
    intAns(q),
    [`把除数和被除数同时 × 10：${decToString(dividendInt, 1)} ÷ ${decToString(di, 1)} = ${dividendInt} ÷ ${di}`, `${dividendInt} ÷ ${di} = ${q}`],
    difficulty
  )
}

/* ---------------- 混合运算 ---------------- */

function divisorsOf(n: number): number[] {
  const res: number[] = []
  for (let i = 2; i <= n; i++) if (n % i === 0) res.push(i)
  return res
}

function genMixAddSub(rng: Rng, difficulty: number): Question {
  const opCount = difficulty >= 5 ? 3 : 2
  let value = rng.int(10, 99)
  const parts: string[] = [String(value)]
  let node: Node = num(value)
  const stepLog: string[] = []
  for (let i = 0; i < opCount; i++) {
    let op: Op = rng.next() < 0.5 ? '+' : '-'
    let d: number
    if (op === '-' && value >= 20) {
      d = rng.int(10, Math.min(99, value))
    } else {
      op = '+'
      d = rng.int(10, 99)
    }
    const prev = value
    value = op === '+' ? value + d : value - d
    parts.push(op, String(d))
    node = bin(op, node, num(d))
    stepLog.push(`${prev} ${op} ${d} = ${value}`)
  }
  return build('mix-addsub', parts.join(' '), intAns(value), stepLog, difficulty)
}

function genMixMulDiv(rng: Rng, difficulty: number): Question {
  const opCount = difficulty >= 5 ? 3 : 2
  let value = rng.int(2, 9)
  const parts: string[] = [String(value)]
  let node: Node = num(value)
  const stepLog: string[] = []
  for (let i = 0; i < opCount; i++) {
    const prev = value
    const isMul = rng.next() < 0.5
    if (isMul) {
      const d = rng.int(2, 9)
      value = value * d
      parts.push('×', String(d))
      node = bin('×', node, num(d))
      stepLog.push(`${prev} × ${d} = ${value}`)
    } else {
      const ds = divisorsOf(value).filter((x) => x >= 2 && x <= 12 && x !== value)
      if (ds.length === 0) {
        // 无合适除数，先乘再除，保证可整除
        const d = rng.int(2, 9)
        value = value * d
        parts.push('×', String(d))
        node = bin('×', node, num(d))
        stepLog.push(`${prev} × ${d} = ${value}`)
      } else {
        const d = rng.pick(ds)
        value = value / d
        parts.push('÷', String(d))
        node = bin('÷', node, num(d))
        stepLog.push(`${prev} ÷ ${d} = ${value}`)
      }
    }
  }
  return build('mix-muldiv', parts.join(' '), intAns(value), stepLog, difficulty)
}

function genTerm(rng: Rng): Node {
  if (rng.next() < 0.5) {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    return bin('×', num(a), num(b))
  }
  const b = rng.int(2, 9)
  const q = rng.int(2, 9)
  return bin('÷', num(b * q), num(b))
}

function genMixAll(rng: Rng, difficulty: number): Question {
  let node = genTerm(rng)
  const combines = difficulty >= 5 ? 2 : 1
  for (let i = 0; i < combines; i++) {
    const term = genTerm(rng)
    const lv = evalNode(node)
    const rv = evalNode(term)
    const op: Op = lv >= rv ? rng.pick(['+', '-']) : '+'
    node = bin(op, node, term)
  }
  const value = evalNode(node)
  return build('mix-all', toInfix(node), intAns(value), genSteps(node), difficulty)
}

function genMixBracket(rng: Rng, difficulty: number): Question {
  const type = rng.pick(['add-mul', 'sub-mul', 'mul-add', 'mul-sub', 'add-div', 'sub-div'])
  let node: Node
  if (type === 'add-mul') {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    const c = rng.int(2, 9)
    node = bin('×', bin('+', num(a), num(b)), num(c))
  } else if (type === 'sub-mul') {
    const a = rng.int(3, 9)
    const b = rng.int(2, a - 1)
    const c = rng.int(2, 9)
    node = bin('×', bin('-', num(a), num(b)), num(c))
  } else if (type === 'mul-add') {
    const c = rng.int(2, 9)
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    node = bin('×', num(c), bin('+', num(a), num(b)))
  } else if (type === 'mul-sub') {
    const c = rng.int(2, 9)
    const a = rng.int(3, 9)
    const b = rng.int(2, a - 1)
    node = bin('×', num(c), bin('-', num(a), num(b)))
  } else if (type === 'add-div') {
    let c = rng.int(2, 9)
    let q = rng.int(2, 9)
    if (c * q < 7) q = rng.int(4, 9)
    const sum = c * q
    const a = rng.int(2, sum - 2)
    const b = sum - a
    node = bin('÷', bin('+', num(a), num(b)), num(c))
  } else {
    // sub-div: (a - b) ÷ c = q
    const c = rng.int(2, 9)
    const q = rng.int(2, 9)
    const diff = c * q
    const b = rng.int(2, 9)
    const a = diff + b
    node = bin('÷', bin('-', num(a), num(b)), num(c))
  }
  const value = evalNode(node)
  return build('mix-bracket', toInfix(node), intAns(value), genSteps(node), difficulty)
}

/* ---------------- 分发 ---------------- */

function gen(category: string, rng: Rng, difficulty: number): Question {
  switch (category) {
    case 'add-2-2':
      return genAddSub(rng, category, 10, 99, difficulty)
    case 'sub-2':
      return genAddSub(rng, category, 10, 99, difficulty)
    case 'add-3-3':
      return genAddSub(rng, category, 100, 999, difficulty)
    case 'sub-3':
      return genAddSub(rng, category, 100, 999, difficulty)
    case 'add-multi':
      return genAddSub(rng, category, difficulty >= 5 ? 10000 : 1000, difficulty >= 5 ? 99999 : 9999, difficulty)
    case 'sub-multi':
      return genAddSub(rng, category, difficulty >= 5 ? 10000 : 1000, difficulty >= 5 ? 99999 : 9999, difficulty)
    case 'mul-table':
    case 'mul-2-1':
    case 'mul-2-2':
    case 'mul-3-2':
      return genMulSimple(rng, category, difficulty)
    case 'div-exact':
    case 'div-2-1':
    case 'div-3-2':
      return genDivExact(rng, category, difficulty)
    case 'div-rem':
      return genDivRem(rng, difficulty)
    case 'add-dec':
    case 'sub-dec':
      return genDecAddSub(rng, category, difficulty)
    case 'mul-dec':
      return genMulDec(rng, difficulty)
    case 'div-dec':
      return genDivDec(rng, difficulty)
    case 'mix-addsub':
      return genMixAddSub(rng, difficulty)
    case 'mix-muldiv':
      return genMixMulDiv(rng, difficulty)
    case 'mix-all':
      return genMixAll(rng, difficulty)
    case 'mix-bracket':
      return genMixBracket(rng, difficulty)
    default:
      throw new Error('未知题型: ' + category)
  }
}

/** 按指定题型出题 */
export function generateByCategory(category: string, rng: Rng, difficulty?: number): Question {
  const meta = CATEGORY_MAP[category]
  if (!meta) throw new Error('未知题型: ' + category)
  return gen(category, rng, difficulty ?? meta.difficulty)
}

/** 按难度等级随机出题 */
export function generateByDifficulty(level: number, rng: Rng): Question {
  const cats = DIFFICULTY_CATEGORIES[level] ?? DIFFICULTY_CATEGORIES[3]
  const category = rng.pick(cats)
  return gen(category, rng, level)
}

/** 按一组分类随机出题（用于专项/错题训练） */
export function generateFromSet(categories: string[], rng: Rng, difficulty?: number): Question {
  const category = rng.pick(categories)
  return generateByCategory(category, rng, difficulty)
}
