export function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0')
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

/** 单题耗时（秒，1 位小数） */
export function formatSeconds(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return '0.0'
  return (ms / 1000).toFixed(1)
}

/** 百分比（整数） */
export function formatPercent(v: number): string {
  return Math.round(v * 100) + '%'
}

/** 时长：x 分 y 秒 */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m} 分 ${r} 秒` : `${r} 秒`
}

/** 限时倒计时 mm:ss */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

export function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}
