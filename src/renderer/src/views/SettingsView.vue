<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Category, TxType } from '@shared/types'

const categories = ref<Category[]>([])
const exporting = ref(false)

const expenseParents = computed(() =>
  categories.value.filter((c) => c.type === 'expense' && c.parentId === null)
)
const incomeCategories = computed(() => categories.value.filter((c) => c.type === 'income'))

function childrenOf(parentId: number): Category[] {
  return categories.value.filter((c) => c.parentId === parentId)
}

async function load(): Promise<void> {
  categories.value = await window.api.listCategories()
}

/** 弹一个输入框让用户填分类名称，取消则返回 null */
async function promptName(title: string, initial = ''): Promise<string | null> {
  try {
    const { value } = await ElMessageBox.prompt(title, '分类名称', {
      inputValue: initial,
      inputValidator: (v: string) => (v.trim() ? true : '名称不能为空'),
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    return value.trim()
  } catch {
    return null
  }
}

async function addParent(type: TxType): Promise<void> {
  const title = type === 'expense' ? '输入新的一级分类名称' : '输入新的收入分类名称'
  const name = await promptName(title)
  if (!name) return
  await window.api.addCategory(name, null, type)
  ElMessage.success('已添加')
  load()
}

async function addChild(parent: Category): Promise<void> {
  const name = await promptName(`在「${parent.name}」下添加二级分类`)
  if (!name) return
  await window.api.addCategory(name, parent.id, 'expense')
  ElMessage.success('已添加')
  load()
}

async function rename(cat: Category): Promise<void> {
  const name = await promptName('输入新名称', cat.name)
  if (!name) return
  await window.api.renameCategory(cat.id, name)
  ElMessage.success('已改名')
  load()
}

async function remove(cat: Category): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除分类「${cat.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  const result = await window.api.deleteCategory(cat.id)
  if (result.ok) ElMessage.success('已删除')
  else ElMessage.warning(result.message)
  load()
}

async function handleExport(): Promise<void> {
  exporting.value = true
  try {
    const result = await window.api.exportCsv()
    if (!result.canceled) {
      ElMessage.success(`已导出 ${result.count} 笔账单到 ${result.path}`)
    }
  } finally {
    exporting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="settings">
    <section class="card">
      <div class="card-head">
        <h2 class="card-title">支出分类</h2>
        <el-button size="small" @click="addParent('expense')">＋ 添加一级分类</el-button>
      </div>
      <div v-for="p in expenseParents" :key="p.id" class="cat-group">
        <div class="cat-parent-line">
          <span class="cat-parent-name">{{ p.name }}</span>
          <el-button link size="small" @click="rename(p)">改名</el-button>
          <el-button link size="small" @click="addChild(p)">＋ 二级分类</el-button>
          <el-button link size="small" type="danger" @click="remove(p)">删除</el-button>
        </div>
        <div class="cat-children-line">
          <el-tag
            v-for="c in childrenOf(p.id)"
            :key="c.id"
            closable
            class="child-tag"
            @click="rename(c)"
            @close="remove(c)"
          >
            {{ c.name }}
          </el-tag>
          <span v-if="childrenOf(p.id).length === 0" class="no-child">暂无二级分类</span>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2 class="card-title">收入分类</h2>
        <el-button size="small" @click="addParent('income')">＋ 添加分类</el-button>
      </div>
      <div class="cat-children-line">
        <el-tag
          v-for="c in incomeCategories"
          :key="c.id"
          closable
          class="child-tag"
          @click="rename(c)"
          @close="remove(c)"
        >
          {{ c.name }}
        </el-tag>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">数据导出</h2>
      <p class="export-desc">
        把全部账单导出成 CSV 表格文件，可用 Excel 打开，适合备份或自己分析。
      </p>
      <el-button type="primary" :loading="exporting" @click="handleExport">导出全部账单</el-button>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
}

.card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 18px 20px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.cat-group {
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
}

.cat-group:last-child {
  border-bottom: none;
}

.cat-parent-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-parent-name {
  font-weight: 600;
  margin-right: 8px;
}

.cat-children-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  padding-left: 4px;
}

.child-tag {
  cursor: pointer;
}

.no-child {
  color: #c0c4cc;
  font-size: 12px;
}

.export-desc {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
