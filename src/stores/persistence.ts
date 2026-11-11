/**
 * 持久化仓储接口：第一阶段用浏览器本地存储实现；
 * 未来接入后端时，只需新增一个实现同接口的 ApiAdapter 替换即可，上层无感知。
 */
export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
}

const PREFIX = 'math-trainer:'

class LocalAdapter implements StorageAdapter {
  private fullKey(key: string): string {
    return PREFIX + key
  }
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.fullKey(key))
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.fullKey(key), JSON.stringify(value))
    } catch {
      // 存储不可用/空间不足时静默降级
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(this.fullKey(key))
    } catch {
      /* ignore */
    }
  }
}

export const storage: StorageAdapter = new LocalAdapter()
