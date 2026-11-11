import { settings } from '@/stores/settings'

export function isDarkTheme(): boolean {
  if (settings.theme === 'auto') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  }
  return settings.theme === 'dark'
}

/** 图表配色（跟随主题） */
export function chartColors() {
  const dark = isDarkTheme()
  return {
    text: dark ? '#a8adb6' : '#5f6672',
    axis: dark ? '#3a3d44' : '#e5e7eb',
    split: dark ? '#2a2c32' : '#f0f1f4',
    primary: dark ? '#7f77dd' : '#534ab7',
    success: dark ? '#5dcaa5' : '#1d9e75',
    danger: dark ? '#f09595' : '#e24b4a',
    warning: dark ? '#ef9f27' : '#ba7517'
  }
}
