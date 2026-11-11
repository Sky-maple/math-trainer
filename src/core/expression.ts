/**
 * 混合运算：表达式树 + 求值 + 中缀序列化 + 步骤生成。
 * 生成时即保证每一步为非负整数、除法恰好整除。
 */

export type Op = '+' | '-' | '×' | '÷'

export type Node =
  | { kind: 'num'; value: number }
  | { kind: 'bin'; op: Op; left: Node; right: Node }

export function num(value: number): Node {
  return { kind: 'num', value }
}

export function bin(op: Op, left: Node, right: Node): Node {
  return { kind: 'bin', op, left, right }
}

export function apply(op: Op, l: number, r: number): number {
  switch (op) {
    case '+':
      return l + r
    case '-':
      return l - r
    case '×':
      return l * r
    case '÷':
      return l / r
  }
}

export function evalNode(n: Node): number {
  if (n.kind === 'num') return n.value
  return apply(n.op, evalNode(n.left), evalNode(n.right))
}

const PREC: Record<Op, number> = { '+': 1, '-': 1, '×': 2, '÷': 2 }

/**
 * 转中缀字符串，按优先级自动补括号。
 * isRight + 同级：对 - 和 ÷（非结合运算）右侧同级需要加括号。
 */
export function toInfix(n: Node, parentPrec = 0, isRight = false): string {
  if (n.kind === 'num') return String(n.value)
  const p = PREC[n.op]
  let needParens = p < parentPrec
  if (isRight && (n.op === '-' || n.op === '÷') && p <= parentPrec) {
    needParens = true
  }
  const s =
    toInfix(n.left, p, false) + ' ' + n.op + ' ' + toInfix(n.right, p, true)
  return needParens ? '(' + s + ')' : s
}

/**
 * 生成计算步骤：按「先算内层」顺序，逐步用已算出的子值代入。
 * 例："(3 + 4) × 5" → ["3 + 4 = 7", "7 × 5 = 35"]
 */
export function genSteps(n: Node): string[] {
  const steps: string[] = []
  walk(n)
  return steps

  function walk(node: Node): number {
    if (node.kind === 'num') return node.value
    const l = walk(node.left)
    const r = walk(node.right)
    const v = apply(node.op, l, r)
    steps.push(`${l} ${node.op} ${r} = ${v}`)
    return v
  }
}
