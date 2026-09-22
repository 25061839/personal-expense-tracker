<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Summary, Transaction } from '@shared/types'
import TransactionDialog from '../components/TransactionDialog.vue'

/** 默认筛选范围：本月（1 号到最后一天） */
function firstOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function lastOfMonth(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

const range = ref<[string, string]>([firstOfMonth(), lastOfMonth()])
const transactions = ref<Transaction[]>([])
const summary = ref<Summary>({ incomeCents: 0, expenseCents: 0 })
const dialogVisible = ref(false)
const editing = ref<Transaction | null>(null)

async function loadAll(): Promise<void> {
  const [tx, sum] = await Promise.all([
    window.api.listTransactionsInRange(range.value[0], range.value[1]),
    window.api.summaryInRange(range.value[0], range.value[1])
  ])
  transactions.value = tx
  summary.value = sum
}

const balanceText = computed(() => {
  const balance = summary.value.incomeCents - summary.value.expenseCents
  const sign = balance >= 0 ? '' : '−'
  return `${sign}¥ ${fmt(Math.abs(balance))}`
})

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function openAdd(): void {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Transaction): void {
  editing.value = row
  dialogVisible.value = true
}

async function handleDelete(row: Transaction): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${row.date} 这笔${row.type === 'expense' ? '支出' : '收入'}（¥ ${fmt(row.amountCents)}）吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  await window.api.deleteTransaction(row.id)
  ElMessage.success('已删除')
  loadAll()
}

onMounted(loadAll)
</script>

<template>
  <div class="home">
    <div class="toolbar">
      <el-date-picker
        v-model="range"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        :clearable="false"
        @change="loadAll"
      />
      <el-button type="primary" size="large" @click="openAdd">＋ 记一笔</el-button>
    </div>

    <section class="summary-cards">
      <div class="card">
        <div class="card-label">收入</div>
        <div class="card-value income">¥ {{ fmt(summary.incomeCents) }}</div>
      </div>
      <div class="card">
        <div class="card-label">支出</div>
        <div class="card-value expense">¥ {{ fmt(summary.expenseCents) }}</div>
      </div>
      <div class="card">
        <div class="card-label">结余</div>
        <div class="card-value" :class="summary.incomeCents - summary.expenseCents >= 0 ? 'income' : 'negative'">
          {{ balanceText }}
        </div>
      </div>
    </section>

    <el-table
      :data="transactions"
      stripe
      class="tx-table"
      empty-text="所选日期范围内没有账单，点右上角「记一笔」开始吧"
    >
      <el-table-column prop="date" label="日期" width="110" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.type === 'expense' ? 'info' : 'success'" effect="plain" size="small">
            {{ row.type === 'expense' ? '支出' : '收入' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分类" min-width="170">
        <template #default="{ row }">
          {{ row.parentName ? `${row.parentName} · ${row.categoryName}` : row.categoryName }}
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="170">
        <template #default="{ row }">{{ row.note || '—' }}</template>
      </el-table-column>
      <el-table-column label="金额（元）" width="150" align="right">
        <template #default="{ row }">
          <span class="amount" :class="row.type === 'expense' ? 'expense' : 'income'">
            {{ row.type === 'expense' ? '−' : '+' }}{{ fmt(row.amountCents) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <TransactionDialog v-model="dialogVisible" :editing="editing" @saved="loadAll" />
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  flex: 1;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 18px 20px;
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.income {
  color: #10b981;
}

.expense {
  color: #303133;
}

.negative {
  color: #f56c6c;
}

.tx-table {
  border-radius: 12px;
  overflow: hidden;
}

.amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.amount.expense {
  color: #303133;
}

.amount.income {
  color: #10b981;
}
</style>
