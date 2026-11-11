/**
 * 小数统一用「整数 + 缩放位」表示，彻底规避浮点误差。
 * 实际值 = int / 10^scale。
 */

export function decToString(int: number, scale: number): string {
  if (scale <= 0) return String(int)
  const sign = int < 0 ? '-' : ''
  const abs = Math.abs(int)
  const s = String(abs).padStart(scale + 1, '0')
  const intPart = s.slice(0, s.length - scale)
  const fracPart = s.slice(s.length - scale)
  let result = intPart + '.' + fracPart
  result = result.replace(/0+$/, '').replace(/\.$/, '')
  return sign + (result === '' ? '0' : result)
}

export function decToNumber(int: number, scale: number): number {
  return int / Math.pow(10, scale)
}
