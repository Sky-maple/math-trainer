<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { settings, updateSettings, type Theme } from '@/stores/settings'

const route = useRoute()

const nav = [
  { path: '/', label: '仪表盘' },
  { path: '/train', label: '基础训练' },
  { path: '/timed', label: '限时挑战' },
  { path: '/mistakes', label: '错题本' },
  { path: '/stats', label: '统计' },
  { path: '/smart', label: '智能训练' }
]

const themeIcon = computed(() => {
  if (settings.theme === 'light') return Sunny
  if (settings.theme === 'dark') return Moon
  return Monitor
})

function onTheme(cmd: string | number | object) {
  updateSettings({ theme: cmd as Theme })
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/" class="brand">
        <span class="brand-logo">Σ</span>
        <span class="brand-name">数算</span>
      </router-link>

      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="header-right">
        <el-dropdown trigger="click" @command="onTheme">
          <button class="theme-btn" title="切换主题" aria-label="切换主题">
            <el-icon><component :is="themeIcon" /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="light">浅色</el-dropdown-item>
              <el-dropdown-item command="dark">深色</el-dropdown-item>
              <el-dropdown-item command="auto">跟随系统</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
  flex-shrink: 0;
}
.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}
.brand-name {
  font-weight: 600;
  font-size: 16px;
}
.nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.nav::-webkit-scrollbar {
  display: none;
}
.nav-link {
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--text-2);
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.nav-link:hover {
  background: var(--surface-2);
  color: var(--text);
}
.nav-link.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 500;
}
.header-right {
  margin-left: auto;
}
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  font-size: 16px;
}
.theme-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
@media (max-width: 640px) {
  .brand-name {
    display: none;
  }
  .header-inner {
    gap: 10px;
    padding: 0 10px;
  }
}
</style>
