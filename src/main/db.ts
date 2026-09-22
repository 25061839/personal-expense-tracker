import { app } from 'electron'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type {
  Category,
  DeleteCategoryResult,
  Summary,
  Transaction,
  TransactionInput,
  TxType
} from '@shared/types'

let db!: Database.Database

/** 默认支出分类（一级大类 → 二级小类） */
const EXPENSE_CATEGORIES: [string, string[]][] = [
  ['餐饮美食', ['早餐', '午餐', '晚餐', '外卖', '零食饮料', '食材']],
  ['交通出行', ['公交地铁', '打车', '加油停车', '火车机票']],
  ['购物消费', ['服饰鞋包', '数码电子', '日用品', '美妆护肤', '礼物']],
  ['居住生活', ['房租', '水电燃气', '物业', '家居用品', '通讯网络']],
  ['休闲娱乐', ['电影演出', '游戏', '旅游', '运动健身', '宠物']],
  ['医疗健康', ['看病买药', '体检', '保健']],
  ['学习教育', ['书籍', '课程培训', '文具']],
  ['人情往来', ['红包礼金', '请客', '孝敬长辈']],
  ['其他', ['其他']]
]

/** 默认收入分类 */
const INCOME_CATEGORIES = ['工资', '奖金', '理财收益', '红包', '其他']

const TX_SELECT = `
  SELECT t.id, t.type, t.amount_cents AS amountCents, t.category_id AS categoryId, t.date, t.note,
         c.name AS categoryName, p.name AS parentName
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN categories p ON p.id = c.parent_id
`

/** 初始化数据库：建表 + 首次使用时写入默认分类 */
export function initDb(): void {
  db = new Database(join(app.getPath('userData'), 'expense.db'))
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id),
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount_cents INTEGER NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  `)
  seedCategories()
}

function seedCategories(): void {
  const row = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number }
  if (row.n > 0) return
  const insertCat = db.prepare('INSERT INTO categories (name, parent_id, type, sort) VALUES (?, ?, ?, ?)')
  db.transaction(() => {
    EXPENSE_CATEGORIES.forEach(([parent, children], pi) => {
      const parentId = insertCat.run(parent, null, 'expense', pi).lastInsertRowid as number
      children.forEach((child, ci) => insertCat.run(child, parentId, 'expense', ci))
    })
    INCOME_CATEGORIES.forEach((name, i) => insertCat.run(name, null, 'income', i))
  })()
}

// ---------- 分类 ----------

export function listCategories(): Category[] {
  return db
    .prepare('SELECT id, name, parent_id AS parentId, type, sort FROM categories ORDER BY type, sort, id')
    .all() as Category[]
}

export function addCategory(name: string, parentId: number | null, type: TxType): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS nextSort FROM categories WHERE type = ? AND parent_id IS ?')
    .get(type, parentId) as { nextSort: number }
  return db
    .prepare('INSERT INTO categories (name, parent_id, type, sort) VALUES (?, ?, ?, ?)')
    .run(name, parentId, type, row.nextSort).lastInsertRowid as number
}

export function renameCategory(id: number, name: string): void {
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
}

export function deleteCategory(id: number): DeleteCategoryResult {
  const childCount = (
    db.prepare('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?').get(id) as { n: number }
  ).n
  if (childCount > 0) return { ok: false, message: '该大类下还有二级分类，请先删除它们' }
  const used = (
    db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?').get(id) as { n: number }
  ).n
  if (used > 0) return { ok: false, message: `该分类下已有 ${used} 笔账单，无法删除` }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return { ok: true, message: '已删除' }
}

// ---------- 账单 ----------

export function listTransactions(month: string): Transaction[] {
  return db
    .prepare(`${TX_SELECT} WHERE t.date LIKE ? ORDER BY t.date DESC, t.id DESC`)
    .all(`${month}%`) as Transaction[]
}

export function listTransactionsInRange(from: string, to: string): Transaction[] {
  return db
    .prepare(`${TX_SELECT} WHERE t.date BETWEEN ? AND ? ORDER BY t.date DESC, t.id DESC`)
    .all(from, to) as Transaction[]
}

export function listAllTransactions(): Transaction[] {
  return db.prepare(`${TX_SELECT} ORDER BY t.date DESC, t.id DESC`).all() as Transaction[]
}

export function addTransaction(data: TransactionInput): void {
  db.prepare(
    'INSERT INTO transactions (type, amount_cents, category_id, date, note) VALUES (@type, @amountCents, @categoryId, @date, @note)'
  ).run(data)
}

export function updateTransaction(id: number, data: TransactionInput): void {
  db.prepare(
    'UPDATE transactions SET type = @type, amount_cents = @amountCents, category_id = @categoryId, date = @date, note = @note WHERE id = @id'
  ).run({ ...data, id })
}

export function deleteTransaction(id: number): void {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

// ---------- 汇总 ----------

export function monthSummary(month: string): Summary {
  return db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents END), 0) AS incomeCents,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expenseCents
       FROM transactions WHERE date LIKE ?`
    )
    .get(`${month}%`) as Summary
}

export function summaryInRange(from: string, to: string): Summary {
  return db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents END), 0) AS incomeCents,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expenseCents
       FROM transactions WHERE date BETWEEN ? AND ?`
    )
    .get(from, to) as Summary
}
