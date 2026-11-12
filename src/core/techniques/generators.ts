import type { Rng } from '../rng'
import type { TechniqueGenerator, TechniqueQuestion } from './types'

/* ---------------- 通用工具 ---------------- */

function fmt(n: number): string {
  const r = Math.round(n * 10000) / 10000
  return String(r)
}

let seq = 0
function mk(
  techniqueId: string,
  expr: string,
  evalExpr: string,
  answer: number,
  steps: string[],
  difficulty = 1,
  qr?: { q: number; r: number }
): TechniqueQuestion {
  seq++
  const id = `tq-${Date.now().toString(36)}-${seq}`
  if (qr) {
    return {
      id,
      techniqueId,
      expr,
      evalExpr,
      answerDisplay: `${qr.q} 余 ${qr.r}`,
      answerValue: null,
      judgeKind: 'qr',
      quotient: qr.q,
      remainder: qr.r,
      steps,
      difficulty
    }
  }
  return {
    id,
    techniqueId,
    expr,
    evalExpr,
    answerDisplay: fmt(answer),
    answerValue: answer,
    judgeKind: 'number',
    quotient: null,
    remainder: null,
    steps,
    difficulty
  }
}

function divisorsBetween(n: number, lo: number, hi: number): number[] {
  const out: number[] = []
  for (let d = lo; d <= hi; d++) {
    if (d !== n && n % d === 0) out.push(d)
  }
  return out
}

/* ---------------- A. 加减法 ---------------- */

const roundAdd: TechniqueGenerator = (rng) => {
  const round = rng.pick([100, 200, 300, 500, 1000])
  const k = rng.int(1, 5)
  if (rng.next() < 0.5) {
    const a = round - k
    const b = rng.int(101, 999)
    const ans = a + b
    return mk('round-add', `${a} + ${b}`, `${a} + ${b}`, ans, [
      `${a} 接近 ${round}，可以看成 ${round} - ${k}`,
      `先算 ${round} + ${b} = ${round + b}`,
      `再减去多算的 ${k}：${round + b} - ${k} = ${ans}`
    ])
  }
  const b = round - k
  const a = round + rng.int(100, 900)
  const ans = a - b
  return mk('round-add', `${a} - ${b}`, `${a} - ${b}`, ans, [
    `${b} 接近 ${round}，可以看成 ${round} - ${k}`,
    `先算 ${a} - ${round} = ${a - round}`,
    `再补回多减的 ${k}：${a - round} + ${k} = ${ans}`
  ])
}

const complement: TechniqueGenerator = (rng) => {
  if (rng.next() < 0.5) {
    const round = rng.pick([100, 1000])
    const b = round - rng.int(1, round - 1)
    const ans = round - b
    return mk('complement', `${round} - ${b}`, `${round} - ${b}`, ans, [
      `求 ${b} 的补数：先用 ${round - 1} 减 ${b} 得 ${round - 1 - b}`,
      `再加 1 得 ${ans}`,
      `所以 ${round} - ${b} = ${ans}`
    ])
  }
  const round = rng.pick([100, 1000])
  const a = round - rng.int(1, round - 1)
  const b = round - a
  return mk('complement', `${a} + ${b}`, `${a} + ${b}`, round, [
    `${a} 距离 ${round} 还差 ${b}，${b} 就是 ${a} 的补数`,
    `所以 ${a} + ${b} = ${round}`
  ])
}

const splitAddsub: TechniqueGenerator = (rng) => {
  const b = rng.int(11, 99)
  const t = Math.floor(b / 10) * 10
  const u = b % 10
  if (rng.next() < 0.6) {
    const a = rng.int(20, 999)
    const ans = a + b
    return mk('split-addsub', `${a} + ${b}`, `${a} + ${b}`, ans, [
      `把 ${b} 拆成 ${t} + ${u}`,
      `先加整十：${a} + ${t} = ${a + t}`,
      `再加个位：${a + t} + ${u} = ${ans}`
    ])
  }
  const a = rng.int(b + 10, 999)
  const ans = a - b
  return mk('split-addsub', `${a} - ${b}`, `${a} - ${b}`, ans, [
    `把 ${b} 拆成 ${t} + ${u}`,
    `先减整十：${a} - ${t} = ${a - t}`,
    `再减个位：${a - t} - ${u} = ${ans}`
  ])
}

const chainAddsub: TechniqueGenerator = (rng) => {
  let value = rng.int(20, 99)
  const parts: string[] = [String(value)]
  const steps: string[] = []
  const ops = rng.int(2, 3)
  for (let i = 0; i < ops; i++) {
    let op = rng.next() < 0.5 ? '+' : '-'
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
    steps.push(`${prev} ${op} ${d} = ${value}`)
  }
  const expr = parts.join(' ')
  return mk('chain-addsub', expr, expr, value, steps)
}

const leftToRight: TechniqueGenerator = (rng) => {
  if (rng.next() < 0.6) {
    const a = rng.int(100, 899)
    const b = rng.int(100, 899)
    const ah = Math.floor(a / 100)
    const at = Math.floor(a / 10) % 10
    const au = a % 10
    const bh = Math.floor(b / 100)
    const bt = Math.floor(b / 10) % 10
    const bu = b % 10
    const ans = a + b
    return mk('left-to-right', `${a} + ${b}`, `${a} + ${b}`, ans, [
      `按数位相加：百位 ${ah}+${bh}，十位 ${at}+${bt}，个位 ${au}+${bu}`,
      `合并：(${ah}+${bh})×100 + (${at}+${bt})×10 + (${au}+${bu}) = ${ans}`
    ])
  }
  const a = rng.int(300, 999)
  const b = rng.int(100, a - 1)
  const ah = Math.floor(a / 100)
  const at = Math.floor(a / 10) % 10
  const au = a % 10
  const bh = Math.floor(b / 100)
  const bt = Math.floor(b / 10) % 10
  const bu = b % 10
  const ans = a - b
  return mk('left-to-right', `${a} - ${b}`, `${a} - ${b}`, ans, [
    `按数位相减：百位 ${ah}-${bh}，十位 ${at}-${bt}，个位 ${au}-${bu}`,
    `合并：(${ah}-${bh})×100 + (${at}-${bt})×10 + (${au}-${bu}) = ${ans}`
  ])
}

const commuteAddsub: TechniqueGenerator = (rng) => {
  if (rng.next() < 0.5) {
    const a = rng.int(11, 89)
    const c = 100 - a
    const b = rng.int(11, 99)
    const ans = a + b + c
    return mk('commute-addsub', `${a} + ${b} + ${c}`, `${a} + ${b} + ${c}`, ans, [
      `先算能凑整的 ${a} + ${c} = 100`,
      `100 + ${b} = ${ans}`
    ])
  }
  const c = rng.int(11, 89)
  const a = 100 + c
  const b = rng.int(10, 60)
  const ans = a - b - c
  return mk('commute-addsub', `${a} - ${b} - ${c}`, `${a} - ${b} - ${c}`, ans, [
    `先算 ${a} - ${c} = 100`,
    `100 - ${b} = ${ans}`
  ])
}

/* ---------------- B. 乘法 ---------------- */

const mulDistribute: TechniqueGenerator = (rng) => {
  const a = rng.pick([12, 15, 16, 18, 24, 25, 32, 36, 45, 48, 55])
  let b = rng.int(12, 99)
  if (b % 10 === 0) b += 1
  const t = Math.floor(b / 10) * 10
  const u = b % 10
  const ans = a * b
  return mk('mul-distribute', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `把 ${b} 拆成 ${t} + ${u}`,
    `${a} × ${t} = ${a * t}`,
    `${a} × ${u} = ${a * u}`,
    `相加：${a * t} + ${a * u} = ${ans}`
  ])
}

const nearTenMul: TechniqueGenerator = (rng) => {
  const t = rng.int(2, 9) * 10
  const k = rng.int(1, 3)
  const minus = rng.next() < 0.5
  const a = minus ? t - k : t + k
  const b = rng.int(2, 9)
  const ans = a * b
  const base = t * b
  const delta = k * b
  return mk('near-ten-mul', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `把 ${a} 看成 ${t} ${minus ? '-' : '+'} ${k}`,
    `${t} × ${b} = ${base}`,
    `${minus ? '减去' : '加上'} ${k} × ${b} = ${delta}：${base} ${minus ? '-' : '+'} ${delta} = ${ans}`
  ])
}

const nearHundredMul: TechniqueGenerator = (rng) => {
  const k = rng.int(1, 5)
  const minus = rng.next() < 0.5
  const a = minus ? 100 - k : 100 + k
  const b = rng.next() < 0.5 ? rng.int(2, 9) : rng.int(11, 99)
  const ans = a * b
  const base = 100 * b
  const delta = k * b
  return mk('near-hundred-mul', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `把 ${a} 看成 100 ${minus ? '-' : '+'} ${k}`,
    `100 × ${b} = ${base}`,
    `${minus ? '减去' : '加上'} ${k} × ${b} = ${delta}：${base} ${minus ? '-' : '+'} ${delta} = ${ans}`
  ])
}

const mul11: TechniqueGenerator = (rng) => {
  const a = rng.int(12, 99)
  const tens = Math.floor(a / 10)
  const units = a % 10
  const sum = tens + units
  const ans = a * 11
  const steps =
    sum < 10
      ? [`把 ${a} 的数字分开：${tens} 和 ${units}`, `中间填入两数之和 ${tens}+${units}=${sum}`, `得到 ${tens}${sum}${units} = ${ans}`]
      : [
          `把 ${a} 的数字分开：${tens} 和 ${units}`,
          `中间两数之和 ${tens}+${units}=${sum}，超过 9 要进位`,
          `向百位进 1，中间保留 ${sum - 10}，得到 ${ans}`
        ]
  return mk('mul-11', `${a} × 11`, `${a} × 11`, ans, steps)
}

const mul525: TechniqueGenerator = (rng) => {
  const a = rng.int(12, 99)
  if (rng.next() < 0.5) {
    const ans = a * 5
    return mk('mul-5-25', `${a} × 5`, `${a} × 5`, ans, [
      '×5 相当于 ×10 再 ÷2',
      `${a} × 10 = ${a * 10}`,
      `${a * 10} ÷ 2 = ${ans}`
    ])
  }
  const ans = a * 25
  return mk('mul-5-25', `${a} × 25`, `${a} × 25`, ans, [
    '×25 相当于 ×100 再 ÷4',
    `${a} × 100 = ${a * 100}`,
    `${a * 100} ÷ 4 = ${ans}`
  ])
}

const mul999: TechniqueGenerator = (rng) => {
  const a = rng.int(12, 99)
  if (rng.next() < 0.5) {
    const ans = a * 9
    return mk('mul-9-99', `${a} × 9`, `${a} × 9`, ans, [
      '×9 相当于 ×10 再减去本身',
      `${a} × 10 = ${a * 10}`,
      `${a * 10} - ${a} = ${ans}`
    ])
  }
  const ans = a * 99
  return mk('mul-9-99', `${a} × 99`, `${a} × 99`, ans, [
    '×99 相当于 ×100 再减去本身',
    `${a} × 100 = ${a * 100}`,
    `${a * 100} - ${a} = ${ans}`
  ])
}

const mulSpecial: TechniqueGenerator = (rng) => {
  const kind = rng.pick([125, 50, 20] as const)
  if (kind === 125) {
    const mult = rng.int(2, 9)
    const a = 8 * mult
    const ans = a * 125
    return mk('mul-special', `${a} × 125`, `${a} × 125`, ans, [
      '125 × 8 = 1000，先算 ' + `${a} ÷ 8 = ${a / 8}`,
      `${a / 8} × 1000 = ${ans}`
    ])
  }
  if (kind === 50) {
    const a = rng.int(12, 99)
    const ans = a * 50
    return mk('mul-special', `${a} × 50`, `${a} × 50`, ans, [
      '×50 相当于 ×100 再 ÷2',
      `${a} × 100 = ${a * 100}`,
      `${a * 100} ÷ 2 = ${ans}`
    ])
  }
  const a = rng.int(12, 99)
  const ans = a * 20
  return mk('mul-special', `${a} × 20`, `${a} × 20`, ans, [
    '×20 相当于 ×2 再 ×10',
    `${a} × 2 = ${a * 2}`,
    `${a * 2} × 10 = ${ans}`
  ])
}

const squareFast: TechniqueGenerator = (rng) => {
  if (rng.next() < 0.5) {
    const t = rng.int(1, 9)
    const a = t * 10 + 5
    const ans = a * a
    return mk('square-fast', `${a} × ${a}`, `${a} × ${a}`, ans, [
      '尾数是 5 的平方：前数 × (前数+1)，后面接 25',
      `${t} × ${t + 1} = ${t * (t + 1)}`,
      `拼上 25 = ${ans}`
    ])
  }
  const t = rng.int(2, 9) * 10
  const k = rng.int(1, 3)
  const a = t - k
  const ans = a * a
  return mk('square-fast', `${a} × ${a}`, `${a} × ${a}`, ans, [
    `把 ${a} 看成 ${t} - ${k}`,
    `(${t} - ${k})² = ${t}² - 2×${t}×${k} + ${k}² = ${t * t} - ${2 * t * k} + ${k * k}`,
    `= ${ans}`
  ])
}

const diffSquares: TechniqueGenerator = (rng) => {
  const c = rng.pick([20, 30, 40, 50, 60, 70, 80, 90, 100])
  const d = rng.int(1, Math.min(9, c - 1))
  const a = c - d
  const b = c + d
  const ans = a * b
  return mk('diff-squares', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `${a} 和 ${b} 关于 ${c} 对称：${c} - ${d} 与 ${c} + ${d}`,
    `用平方差：(${c} - ${d})(${c} + ${d}) = ${c}² - ${d}²`,
    `${c * c} - ${d * d} = ${ans}`
  ])
}

const sameTenComplement: TechniqueGenerator = (rng) => {
  const t = rng.int(2, 9)
  const u = rng.int(1, 9)
  const a = t * 10 + u
  const b = t * 10 + (10 - u)
  const ans = a * b
  const head = t * (t + 1)
  const tail = u * (10 - u)
  const tailStr = String(tail).padStart(2, '0')
  return mk('same-ten-complement', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `十位相同（都是 ${t}），个位互补（${u} + ${10 - u} = 10）`,
    `前两位：${t} × ${t + 1} = ${head}`,
    `后两位：${u} × ${10 - u} = ${tailStr}`,
    `拼起来 = ${ans}`
  ])
}

/* ---------------- C. 除法 ---------------- */

const divReduce: TechniqueGenerator = (rng) => {
  const b = rng.pick([12, 16, 18, 24, 25, 36, 45, 48, 60, 72, 96])
  const q = rng.int(2, 9)
  const a = b * q
  const factors = divisorsBetween(b, 2, 12)
  const g = factors.length ? rng.pick(factors) : 2
  return mk('div-reduce', `${a} ÷ ${b}`, `${a} ÷ ${b}`, q, [
    `${a} 和 ${b} 同时除以 ${g}：${a / g} ÷ ${b / g}`,
    `${a / g} ÷ ${b / g} = ${q}`
  ])
}

const divSplitDivisor: TechniqueGenerator = (rng) => {
  const m = rng.int(2, 9)
  const n = rng.int(2, 9)
  const b = m * n
  const q = rng.int(2, 9)
  const a = b * q
  return mk('div-split-divisor', `${a} ÷ ${b}`, `${a} ÷ ${b}`, q, [
    `把 ${b} 拆成 ${m} × ${n}`,
    `${a} ÷ ${m} = ${a / m}`,
    `${a / m} ÷ ${n} = ${q}`
  ])
}

const divSpecial: TechniqueGenerator = (rng) => {
  const kind = rng.pick([5, 25, 50, 125] as const)
  const q = rng.int(2, kind === 125 ? 20 : 99)
  const a = kind * q
  if (kind === 5) {
    return mk('div-5-25-50-125', `${a} ÷ 5`, `${a} ÷ 5`, q, [
      '÷5 相当于 ×2 再 ÷10',
      `${a} × 2 = ${a * 2}`,
      `${a * 2} ÷ 10 = ${q}`
    ])
  }
  if (kind === 25) {
    return mk('div-5-25-50-125', `${a} ÷ 25`, `${a} ÷ 25`, q, [
      '÷25 相当于 ×4 再 ÷100',
      `${a} × 4 = ${a * 4}`,
      `${a * 4} ÷ 100 = ${q}`
    ])
  }
  if (kind === 50) {
    return mk('div-5-25-50-125', `${a} ÷ 50`, `${a} ÷ 50`, q, [
      '÷50 相当于 ×2 再 ÷100',
      `${a} × 2 = ${a * 2}`,
      `${a * 2} ÷ 100 = ${q}`
    ])
  }
  return mk('div-5-25-50-125', `${a} ÷ 125`, `${a} ÷ 125`, q, [
    '÷125 相当于 ×8 再 ÷1000',
    `${a} × 8 = ${a * 8}`,
    `${a * 8} ÷ 1000 = ${q}`
  ])
}

const divMultiple: TechniqueGenerator = (rng) => {
  const b = rng.int(11, 49)
  const q = rng.int(2, 9)
  const a = b * q
  return mk('div-multiple', `${a} ÷ ${b}`, `${a} ÷ ${b}`, q, [
    `想一想：${b} 乘几等于 ${a}？`,
    `${b} × ${q} = ${a}`,
    `所以 ${a} ÷ ${b} = ${q}`
  ])
}

const divEstimate: TechniqueGenerator = (rng) => {
  const b = rng.pick([20, 30, 40, 50, 60, 80])
  const q = rng.int(2, 30)
  const half = Math.floor(b / 2) - 1
  const delta = rng.int(-half, half)
  const a = b * q + delta
  return mk('div-estimate', `${a} ÷ ${b}`, `${a} ÷ ${b}`, q, [
    `把 ${a} 看成接近的 ${b * q}`,
    `${b} × ${q} = ${b * q}`,
    `所以 ${a} ÷ ${b} ≈ ${q}`
  ])
}

const divRemainder: TechniqueGenerator = (rng) => {
  const b = rng.int(3, 19)
  const q = rng.int(2, 30)
  const r = rng.int(1, b - 1)
  const a = b * q + r
  return mk(
    'div-remainder',
    `${a} ÷ ${b}`,
    `${a} ÷ ${b}`,
    0,
    [`${b} × ${q} = ${b * q}`, `余数 = ${a} - ${b * q} = ${r}（余数 < 除数 ${b}）`, `${a} ÷ ${b} = ${q} 余 ${r}`],
    1,
    { q, r }
  )
}

/* ---------------- D. 百分比 ---------------- */

const pctBase: TechniqueGenerator = (rng) => {
  const kind = rng.pick([10, 1, 5] as const)
  if (kind === 10) {
    const base = rng.int(11, 99) * 10
    const ans = base / 10
    return mk('pct-10-1-5', `${base} × 10%`, `${base} × 0.1`, ans, ['10% 就是除以 10', `${base} ÷ 10 = ${ans}`])
  }
  if (kind === 1) {
    const base = rng.int(11, 99) * 100
    const ans = base / 100
    return mk('pct-10-1-5', `${base} × 1%`, `${base} × 0.01`, ans, ['1% 就是除以 100', `${base} ÷ 100 = ${ans}`])
  }
  const base = rng.int(11, 99) * 20
  const ans = base / 20
  return mk('pct-10-1-5', `${base} × 5%`, `${base} × 0.05`, ans, [
    '5% 就是 10% 的一半',
    `${base} ÷ 10 = ${base / 10}`,
    `${base / 10} ÷ 2 = ${ans}`
  ])
}

const pctQuarter: TechniqueGenerator = (rng) => {
  const base = rng.int(10, 99) * 4
  const pct = rng.pick([25, 50, 75] as const)
  if (pct === 25) {
    return mk('pct-25-50-75', `${base} × 25%`, `${base} × 0.25`, base / 4, ['25% = 1/4', `${base} ÷ 4 = ${base / 4}`])
  }
  if (pct === 50) {
    return mk('pct-25-50-75', `${base} × 50%`, `${base} × 0.5`, base / 2, ['50% = 1/2', `${base} ÷ 2 = ${base / 2}`])
  }
  return mk('pct-25-50-75', `${base} × 75%`, `${base} × 0.75`, (base * 3) / 4, [
    '75% = 3/4',
    `${base} ÷ 4 = ${base / 4}`,
    `${base / 4} × 3 = ${(base * 3) / 4}`
  ])
}

const pctSplit: TechniqueGenerator = (rng) => {
  const base = rng.int(5, 50) * 20
  const tens = rng.int(1, 5) * 10
  const pct = tens + 5
  const ans = (base * pct) / 100
  return mk('pct-split', `${base} × ${pct}%`, `${base} × ${pct / 100}`, ans, [
    `${pct}% = ${tens}% + 5%`,
    `${base} × ${tens}% = ${(base * tens) / 100}`,
    `${base} × 5% = ${(base * 5) / 100}`,
    `相加 = ${ans}`
  ])
}

const pctDiscount: TechniqueGenerator = (rng) => {
  const price = rng.int(2, 30) * 10
  const d = rng.int(6, 9)
  const ans = (price * d) / 10
  return mk('pct-discount', `原价 ${price} 元，打 ${d} 折`, `${price} × ${d / 10}`, ans, [
    `${d} 折 = 原价 × ${d / 10}`,
    `${price} × ${d} ÷ 10 = ${ans}`
  ])
}

const pctGrowth: TechniqueGenerator = (rng) => {
  const base = rng.int(2, 30) * 20
  const rate = rng.int(1, 8) * 5
  const up = rng.next() < 0.5
  const ans = up ? (base * (100 + rate)) / 100 : (base * (100 - rate)) / 100
  return mk(
    'pct-growth',
    `${base} ${up ? '增长' : '下降'} ${rate}%`,
    up ? `${base} × ${1 + rate / 100}` : `${base} × ${1 - rate / 100}`,
    ans,
    [`变化量 = ${base} × ${rate}% = ${(base * rate) / 100}`, `新值 = ${base} ${up ? '+' : '-'} ${(base * rate) / 100} = ${ans}`]
  )
}

/* ---------------- E. 综合 ---------------- */

const mixDistribute: TechniqueGenerator = (rng) => {
  const a = rng.pick([12, 15, 18, 24, 25, 32, 35, 36, 45])
  const b = rng.int(11, 89)
  const c = 100 - b
  const ans = a * 100
  return mk('mix-distribute', `${a} × ${b} + ${a} × ${c}`, `${a} × ${b} + ${a} × ${c}`, ans, [
    `两道乘法都有公因数 ${a}，提取出来：${a} × (${b} + ${c})`,
    `${b} + ${c} = 100`,
    `${a} × 100 = ${ans}`
  ])
}

const mixCommute: TechniqueGenerator = (rng) => {
  const pairs: [number, number][] = [
    [4, 25],
    [2, 5],
    [8, 125],
    [5, 20],
    [4, 50]
  ]
  const [a, c] = rng.pick(pairs)
  const b = rng.int(11, 99)
  const ans = a * b * c
  return mk('mix-commute', `${a} × ${b} × ${c}`, `${a} × ${b} × ${c}`, ans, [
    `交换并结合：${a} × ${c} = ${a * c}`,
    `${a * c} × ${b} = ${ans}`
  ])
}

const mixMultistep: TechniqueGenerator = (rng) => {
  const a = rng.pick([25, 12, 15, 24])
  const b = rng.pick([4, 8, 5])
  if (rng.next() < 0.5) {
    const c = rng.int(20, 99)
    const ans = a * b + c
    return mk('mix-multistep', `${a} × ${b} + ${c}`, `${a} × ${b} + ${c}`, ans, [
      `先算乘法：${a} × ${b} = ${a * b}`,
      `再相加：${a * b} + ${c} = ${ans}`
    ])
  }
  const c = rng.int(10, a * b - 1)
  const ans = a * b - c
  return mk('mix-multistep', `${a} × ${b} - ${c}`, `${a} × ${b} - ${c}`, ans, [
    `先算乘法：${a} × ${b} = ${a * b}`,
    `再相减：${a * b} - ${c} = ${ans}`
  ])
}

const mixSplitRecombine: TechniqueGenerator = (rng) => {
  const a = rng.int(11, 89)
  const c = 100 - a
  const b = rng.int(11, 89)
  const d = 100 - b
  return mk('mix-split-recombine', `${a} + ${b} + ${c} + ${d}`, `${a} + ${b} + ${c} + ${d}`, 200, [
    `两两配对凑整：${a} + ${c} = 100，${b} + ${d} = 100`,
    '100 + 100 = 200'
  ])
}

const mixEstimate: TechniqueGenerator = (rng) => {
  const round = rng.pick([100, 200, 300])
  const k = rng.int(1, 5)
  const a = round - k
  const b = rng.int(2, 9)
  const ans = a * b
  const base = round * b
  return mk('mix-estimate', `${a} × ${b}`, `${a} × ${b}`, ans, [
    `估算：${a} ≈ ${round}，${round} × ${b} = ${base}`,
    `精确计算：${a} × ${b} = ${base} - ${k * b} = ${ans}`,
    '结果与估算接近，合理'
  ])
}

/* ---------------- 注册表 ---------------- */

export const TECHNIQUE_GENERATORS: Record<string, TechniqueGenerator> = {
  'round-add': roundAdd,
  complement,
  'split-addsub': splitAddsub,
  'chain-addsub': chainAddsub,
  'left-to-right': leftToRight,
  'commute-addsub': commuteAddsub,
  'mul-distribute': mulDistribute,
  'near-ten-mul': nearTenMul,
  'near-hundred-mul': nearHundredMul,
  'mul-11': mul11,
  'mul-5-25': mul525,
  'mul-9-99': mul999,
  'mul-special': mulSpecial,
  'square-fast': squareFast,
  'diff-squares': diffSquares,
  'same-ten-complement': sameTenComplement,
  'div-reduce': divReduce,
  'div-split-divisor': divSplitDivisor,
  'div-5-25-50-125': divSpecial,
  'div-multiple': divMultiple,
  'div-estimate': divEstimate,
  'div-remainder': divRemainder,
  'pct-10-1-5': pctBase,
  'pct-25-50-75': pctQuarter,
  'pct-split': pctSplit,
  'pct-discount': pctDiscount,
  'pct-growth': pctGrowth,
  'mix-distribute': mixDistribute,
  'mix-commute': mixCommute,
  'mix-multistep': mixMultistep,
  'mix-split-recombine': mixSplitRecombine,
  'mix-estimate': mixEstimate
}

export function generateTechniqueQuestion(techniqueId: string, rng: Rng, level = 1): TechniqueQuestion {
  const gen = TECHNIQUE_GENERATORS[techniqueId]
  if (!gen) throw new Error('未知技巧: ' + techniqueId)
  return gen(rng, level)
}

/** 技巧题判分 */
export function isTechniqueCorrect(q: TechniqueQuestion, raw: string): boolean {
  const s = raw.replace(/\s+/g, '').replace(/，/g, ',')
  if (!s) return false
  if (q.judgeKind === 'qr') {
    const m = s.match(/^(-?\d+)(?:余|r|,)(-?\d+)$/i)
    if (!m) return false
    return Number(m[1]) === q.quotient && Number(m[2]) === q.remainder
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return false
  return Math.abs(n - (q.answerValue ?? 0)) < 1e-6
}
