// 主进程、预加载脚本、界面三层共用的数据类型定义

/** 账单类型：支出或收入 */
export type TxType = 'expense' | 'income'

/** 分类：一级分类 parentId 为 null，二级分类 parentId 指向一级分类 */
export interface Category {
  id: number
  name: string
  parentId: number | null
  type: TxType
  sort: number
}

/** 一条账单（含分类名称，方便界面直接显示） */
export interface Transaction {
  id: number
  type: TxType
  amountCents: number
  categoryId: number
  date: string
  note: string
  categoryName: string
  parentName: string | null
}

/** 新增/修改账单时提交的数据 */
export interface TransactionInput {
  type: TxType
  amountCents: number
  categoryId: number
  date: string
  note: string
}

/** 时间段汇总：收入与支出总额（单位：分） */
export interface Summary {
  incomeCents: number
  expenseCents: number
}

/** 删除分类的结果 */
export interface DeleteCategoryResult {
  ok: boolean
  message: string
}

/** 导出 CSV 的结果 */
export interface ExportCsvResult {
  canceled: boolean
  path?: string
  count: number
}

/** 界面可用的全部功能入口（由预加载脚本注入 window.api） */
export interface Api {
  listCategories(): Promise<Category[]>
  listTransactions(month: string): Promise<Transaction[]>
  listTransactionsInRange(from: string, to: string): Promise<Transaction[]>
  addTransaction(data: TransactionInput): Promise<void>
  updateTransaction(id: number, data: TransactionInput): Promise<void>
  deleteTransaction(id: number): Promise<void>
  monthSummary(month: string): Promise<Summary>
  summaryInRange(from: string, to: string): Promise<Summary>
  addCategory(name: string, parentId: number | null, type: TxType): Promise<number>
  renameCategory(id: number, name: string): Promise<void>
  deleteCategory(id: number): Promise<DeleteCategoryResult>
  exportCsv(): Promise<ExportCsvResult>
}
