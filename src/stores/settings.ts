import { reactive, watch } from 'vue'
import { storage } from './persistence'

export type Theme = 'light' | 'dark' | 'auto'

export interface Settings {
  theme: Theme
  /** 答完自动进入下一题 */
  autoNext: boolean
  /** 当前智能训练难度 */
  currentLevel: number
  /** 默认限时秒数 */
  timedSeconds: number
}

const KEY = 'settings'

const DEFAULT: Settings = {
  theme: 'auto',
  autoNext: true,
  currentLevel: 1,
  timedSeconds: 60
}

const loaded = storage.get<Partial<Settings>>(KEY)

export const settings = reactive<Settings>({ ...DEFAULT, ...(loaded ?? {}) })

function resolveTheme(): 'light' | 'dark' {
  if (settings.theme === 'auto') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return settings.theme
}

export function applyTheme(): void {
  const t = resolveTheme()
  document.documentElement.classList.toggle('dark', t === 'dark')
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch)
}

/** 应用启动时先应用主题，避免闪屏 */
export function initSettings(): void {
  applyTheme()
}

watch(settings, applyTheme)
watch(
  settings,
  () => storage.set(KEY, { ...settings }),
  { deep: true }
)

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'auto') applyTheme()
  })
}
