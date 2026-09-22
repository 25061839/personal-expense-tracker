<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { Category, Transaction, TransactionInput, TxType } from '@shared/types'

const props = defineProps<{
  modelValue: boolean
  editing: Transaction | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const categories = ref<Category[]>([])
const form = ref({ type: 'expense' as TxType, amount: '', date: today(), note: '' })
const primaryId = ref<number | undefined>(undefined)
const secondaryId = ref<number | undefined>(undefined)
const saving = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

/** 一级下拉框选项：当前类型下的一级分类 */
const primaryOptions = computed(() =>
  categories.value
    .filter((c) => c.type === form.value.type && c.parentId === null)
    .map((c) => ({ value: c.id, label: c.name }))
)

/** 二级下拉框选项：所选一级分类下的二级分类 */
const secondaryOptions = computed(() =>
  categories.value.filter((c) => c.parentId === primaryId.value).map((c) => ({ value: c.id, label: c.name }))
)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    categories.value = await window.api.listCategories()
    resetForm()
  }
)

function resetForm(): void {
  primaryId.value = undefined
  secondaryId.value = undefined
  const row = props.editing
  if (row) {
    form.value = {
      type: row.type,
      amount: (row.amountCents / 100).toFixed(2),
      date: row.date,
      note: row.note
    }
    const cat = categories.value.find((c) => c.id === row.categoryId)
    if (cat?.parentId) {
      primaryId.value = cat.parentId
      secondaryId.value = cat.id
    } else {
      primaryId.value = row.categoryId
    }
  } else {
    form.value = { type: 'expense', amount: '', date: today(), note: '' }
  }
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function handleTypeChange(): void {
  primaryId.value = undefined
  secondaryId.value = undefined
}

function handlePrimaryChange(): void {
  secondaryId.value = undefined
}

async function handleSave(): Promise<void> {
  const m = /^\d+(\.\d{1,2})?$/.exec(form.value.amount.trim())
  const amountNum = m ? Number(m[0]) : 0
  if (!m || amountNum <= 0) {
    ElMessage.warning('请输入正确的金额（最多两位小数）')
    return
  }
  const categoryId = form.value.type === 'expense' ? secondaryId.value : primaryId.value
  if (categoryId === undefined) {
    ElMessage.warning(form.value.type === 'expense' ? '请选择二级分类' : '请选择收入分类')
    return
  }
  if (!form.value.date) {
    ElMessage.warning('请选择日期')
    return
  }
  const data: TransactionInput = {
    type: form.value.type,
    amountCents: Math.round(amountNum * 100),
    categoryId,
    date: form.value.date,
    note: form.value.note.trim()
  }
  saving.value = true
  try {
    if (props.editing) {
      await window.api.updateTransaction(props.editing.id, data)
      ElMessage.success('修改已保存')
    } else {
      await window.api.addTransaction(data)
      ElMessage.success('记好了！')
    }
    visible.value = false
    emit('saved')
  } catch (err) {
    ElMessage.error(`保存失败：${String(err)}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="editing ? '编辑账单' : '记一笔'"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form label-width="120px" @submit.prevent>
      <el-form-item label="类型">
        <el-radio-group v-model="form.type" @change="handleTypeChange">
          <el-radio-button value="expense">支出</el-radio-button>
          <el-radio-button value="income">收入</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="分类（一级）">
        <el-select
          v-model="primaryId"
          placeholder="选择一级分类"
          style="width: 100%"
          @change="handlePrimaryChange"
        >
          <el-option v-for="o in primaryOptions" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.type === 'expense'" label="分类（二级）">
        <el-select
          v-model="secondaryId"
          placeholder="选择二级分类"
          :disabled="primaryId === undefined"
          style="width: 100%"
        >
          <el-option v-for="o in secondaryOptions" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
      </el-form-item>
      <el-form-item :label="form.type === 'expense' ? '金额（花了多少？）' : '金额（收入多少？）'">
        <el-input v-model="form.amount" placeholder="0.00" maxlength="12">
          <template #prefix>¥</template>
          <template #suffix>元</template>
        </el-input>
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          :clearable="false"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注（选填）">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          placeholder="选填，比如：和同事聚餐"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
