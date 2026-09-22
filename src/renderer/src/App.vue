<script setup lang="ts">
import { ref } from 'vue'
import { House, PieChart, Setting } from '@element-plus/icons-vue'
import HomeView from './views/HomeView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'

type TabKey = 'home' | 'stats' | 'settings'

const activeTab = ref<TabKey>('home')

const navs: { key: TabKey; label: string; icon: typeof House }[] = [
  { key: 'home', label: '首页', icon: House },
  { key: 'stats', label: '统计', icon: PieChart },
  { key: 'settings', label: '设置', icon: Setting }
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="side-brand">
        <span class="brand-logo">¥</span>
        <span class="brand-name">个人记账</span>
      </div>
      <nav class="side-nav">
        <button
          v-for="n in navs"
          :key="n.key"
          class="nav-item"
          :class="{ 'nav-active': activeTab === n.key }"
          @click="activeTab = n.key"
        >
          <el-icon :size="18"><component :is="n.icon" /></el-icon>
          <span>{{ n.label }}</span>
        </button>
      </nav>
      <div class="side-footer">本地记账 · 数据不上传</div>
    </aside>

    <main class="content">
      <HomeView v-if="activeTab === 'home'" />
      <StatsView v-else-if="activeTab === 'stats'" />
      <SettingsView v-else />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 172px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  padding: 16px 10px;
}

.side-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px 20px;
}

.brand-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #10b981;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  color: #606266;
  text-align: left;
}

.nav-item:hover {
  background: #f5f7fa;
}

.nav-active {
  background: #e7f8f2;
  color: #10b981;
  font-weight: 600;
}

.nav-active:hover {
  background: #e7f8f2;
}

.side-footer {
  margin-top: auto;
  font-size: 11px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px 0;
}

.content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
</style>
