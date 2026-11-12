<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TechniqueSessionPanel from '@/components/technique/TechniqueSessionPanel.vue'
import MasteryBadge from '@/components/technique/MasteryBadge.vue'
import type { TechniqueTrainingConfig, TechniqueMode } from '@/composables/useTechniqueTraining'
import { TECHNIQUE_MAP } from '@/core/techniques/catalog'
import { CATEGORY_LABELS } from '@/core/techniques/types'
import { masteryOf, accuracyOf } from '@/stores/techniqueMastery'
import { settings } from '@/stores/settings'
import { formatPercent } from '@/utils'
import { Back, Guide, VideoPlay, Timer, Lightning } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const technique = computed(() => TECHNIQUE_MAP[id.value])
const mastery = computed(() => masteryOf(id.value))

const session = ref<TechniqueTrainingConfig | null>(null)
const sessionKey = ref(0)

interface ModeDef {
  key: TechniqueMode
  title: string
  desc: string
  count: number
  seconds: number
  autoNext: boolean
  icon: unknown
}

const modes: ModeDef[] = [
  { key: 'teach', title: '教学模式', desc: '边学边练，可随时查看本题技巧解析', count: 5, seconds: 0, autoNext: false, icon: Guide },
  { key: 'beginner', title: '入门模式', desc: '不限时，重点理解技巧的用法', count: 10, seconds: 0, autoNext: true, icon: VideoPlay },
  { key: 'proficient', title: '熟练模式', desc: '每题限时 20 秒，练习控制答题时间', count: 10, seconds: 20, autoNext: true, icon: Timer },
  { key: 'speed', title: '极速模式', desc: '每题限时 8 秒，连续答题提升反应速度', count: 15, seconds: 8, autoNext: true, icon: Lightning }
]

function start(mode: ModeDef): void {
  session.value = {
    techniqueId: id.value,
    mode: mode.key,
    questionCount: mode.count,
    secondsPerQuestion: mode.seconds,
    autoNext: mode.key === 'teach' ? false : settings.autoNext
  }
  sessionKey.value++
}
</script>

<template>
  <div v-if="technique">
    <div class="head">
      <div class="crumb muted" @click="router.push('/techniques')">
        <el-icon><Back /></el-icon> 心算技巧中心 / {{ CATEGORY_LABELS[technique.category] }} /
        <span class="link" @click.stop="router.push(`/techniques/${id}`)">{{ technique.name }}</span>
      </div>
      <div class="head-row">
        <div>
          <h1 class="page-title">{{ technique.name }} · 专项练习</h1>
          <div class="head-sub">
            <MasteryBadge :technique-id="id" />
            <span class="muted">
              已练 {{ mastery.practiceCount }} 题 ·
              正确率 {{ mastery.practiceCount ? formatPercent(accuracyOf(mastery)) : '—' }}
            </span>
          </div>
        </div>
        <el-button size="small" @click="router.push(`/techniques/${id}`)">去复习技巧</el-button>
      </div>
    </div>

    <TechniqueSessionPanel
      v-if="session"
      :key="sessionKey"
      :config="session"
      @close="session = null"
    />

    <div v-else class="card">
      <h2 class="card-title">选择训练模式</h2>
      <p class="muted mode-tip">题目会按「{{ technique.name }}」的适用条件生成，不会出现无关题型。</p>
      <div class="mode-grid">
        <div v-for="m in modes" :key="m.key" class="mode-card" @click="start(m)">
          <el-icon class="mode-icon"><component :is="m.icon" /></el-icon>
          <div class="mode-title">{{ m.title }}</div>
          <div class="mode-desc">{{ m.desc }}</div>
          <div class="mode-meta muted">{{ m.count }} 题<template v-if="m.seconds"> · 每题 {{ m.seconds }}s</template></div>
        </div>
      </div>
    </div>
  </div>

  <el-empty v-else description="未找到该技巧">
    <el-button @click="router.push('/techniques')">返回技巧中心</el-button>
  </el-empty>
</template>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-bottom: 6px;
}
.link {
  color: var(--primary);
  cursor: pointer;
}
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.head-sub {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}
.mode-tip {
  margin: -6px 0 16px;
  font-size: 13px;
}
.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.mode-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  background: var(--surface);
}
.mode-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.mode-icon {
  font-size: 24px;
  color: var(--primary);
}
.mode-title {
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}
.mode-desc {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 6px;
  line-height: 1.6;
}
.mode-meta {
  font-size: 12px;
  margin-top: 10px;
}
@media (max-width: 640px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
