export interface Rng {
  next(): number
  /** [min, max] 闭区间整数 */
  int(min: number, max: number): number
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
}

/** mulberry32 —— 可复现的伪随机数生成器 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

export function createRng(seed?: number): Rng {
  const r = mulberry32(seed ?? randomSeed())
  return {
    next: r,
    int(min, max) {
      if (min > max) {
        const t = min
        min = max
        max = t
      }
      return Math.floor(r() * (max - min + 1)) + min
    },
    pick(arr) {
      return arr[Math.floor(r() * arr.length)]
    },
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
      }
      return a
    }
  }
}
