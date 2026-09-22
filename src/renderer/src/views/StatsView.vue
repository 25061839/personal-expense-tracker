<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { Transaction } from '@shared/types'

const month = ref(nowMonth())

function nowMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const pieRef = ref<HTMLDivElement | null>(null)
const barRef = ref<HTMLDivElement | null>(null)
const hasExpense = ref(false)

let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

const PALETTE = [
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#94a3b8'
]

function fmtYuan(cents: number): string {
  return (cents / 100).toFixed(2)
}

async function load(): Promise<void> {
  const list = await window.api.listTransactions(month.value)
  const expense = list.filter((t) => t.type === 'expense')
  hasExpense.value = expense.length > 0
  if (!hasExpense.value) return
  await nextTick()
  initCharts()
  renderPie(expense)
  renderBar(expense)
}

function initCharts(): void {
  if (!pieChart && pieRef.value) pieChart = echarts.init(pieRef.value)
  if (!barChart && barRef.value) barChart = echarts.init(barRef.value)
}

/** 圆环图：本月各一级大类的支出占比 */
function renderPie(expense: Transaction[]): void {
  const group = new Map<string, number>()
  for (const t of expense) {
    const key = t.parentName ?? t.categoryName
    group.set(key, (group.get(key) ?? 0) + t.amountCents)
  }
  const data = [...group.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
  pieChart?.setOption({
    color: PALETTE,
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `${p.name}<br/>¥ ${fmtYuan(Number(p.value))}（${p.percent}%）`
    },
    legend: { bottom: 0, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}', color: '#606266' },
        data
      }
    ]
  })
}

/** 柱状图：本月每天的支出金额 */
function renderBar(expense: Transaction[]): void {
  const [y, m] = month.value.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const perDay = new Map<string, number>()
  for (const t of expense) {
    perDay.set(t.date, (perDay.get(t.date) ?? 0) + t.amountCents)
  }
  const values = Array.from({ length: days }, (_, i) => {
    const d = `${month.value}-${String(i + 1).padStart(2, '0')}`
    return perDay.get(d) ?? 0
  })
  const dayLabels = Array.from({ length: days }, (_, i) => `${i + 1}日`)
  barChart?.setOption({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: any) => `¥ ${fmtYuan(Number(v))}`
    },
    grid: { left: 8, right: 8, top: 24, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: dayLabels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dcdfe6' } }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } },
      axisLabel: { formatter: (v: number) => `${v / 100}` }
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 18
      }
    ]
  })
}

function handleResize(): void {
  pieChart?.resize()
  barChart?.resize()
}

watch(month, load)
onMounted(() => {
  window.addEventListener('resize', handleResize)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  pieChart = null
  barChart = null
})
</script>

<template>
  <div class="stats">
    <div class="toolbar">
      <el-date-picker
        v-model="month"
        type="month"
        value-format="YYYY-MM"
        format="YYYY年MM月"
        :clearable="false"
      />
    </div>

    <section class="card">
      <h2 class="card-title">支出分类占比</h2>
      <div v-show="hasExpense" ref="pieRef" class="chart" />
      <el-empty v-if="!hasExpense" description="本月还没有支出记录" :image-size="90" />
    </section>

    <section class="card">
      <h2 class="card-title">每日支出走势</h2>
      <div v-show="hasExpense" ref="barRef" class="chart" />
      <el-empty v-if="!hasExpense" description="本月还没有支出记录" :image-size="90" />
    </section>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  margin-bottom: 0;
}

.card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 18px 20px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.chart {
  height: 320px;
  width: 100%;
}
</style>
