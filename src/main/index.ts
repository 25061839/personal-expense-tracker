import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  addCategory,
  addTransaction,
  deleteCategory,
  deleteTransaction,
  initDb,
  listAllTransactions,
  listCategories,
  listTransactions,
  listTransactionsInRange,
  monthSummary,
  renameCategory,
  summaryInRange,
  updateTransaction
} from './db'
import type { TransactionInput, TxType } from '@shared/types'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: '个人记账',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.on('ready-to-show', () => win.show())
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** 把全部账单导出成 CSV 文件（可用 Excel 打开），弹窗让用户选保存位置 */
async function exportCsv(): Promise<{ canceled: boolean; path?: string; count: number }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出账单',
    defaultPath: `个人记账-账单-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV 表格', extensions: ['csv'] }]
  })
  if (canceled || !filePath) return { canceled: true, count: 0 }
  const rows = listAllTransactions()
  const escape = (s: string): string => `"${s.replace(/"/g, '""')}"`
  const lines = [['日期', '类型', '一级分类', '二级分类', '金额(元)', '备注'].join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.type === 'expense' ? '支出' : '收入',
        escape(r.parentName ?? ''),
        escape(r.categoryName),
        (r.amountCents / 100).toFixed(2),
        escape(r.note)
      ].join(',')
    )
  }
  writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8')
  return { canceled: false, path: filePath, count: rows.length }
}

/** 注册界面与数据之间的通道（界面发请求，这里执行数据库操作） */
function registerIpc(): void {
  ipcMain.handle('cat:list', () => listCategories())
  ipcMain.handle('cat:add', (_e, name: string, parentId: number | null, type: TxType) =>
    addCategory(name, parentId, type)
  )
  ipcMain.handle('cat:rename', (_e, id: number, name: string) => renameCategory(id, name))
  ipcMain.handle('cat:delete', (_e, id: number) => deleteCategory(id))
  ipcMain.handle('tx:list', (_e, month: string) => listTransactions(month))
  ipcMain.handle('tx:list-range', (_e, from: string, to: string) => listTransactionsInRange(from, to))
  ipcMain.handle('tx:add', (_e, data: TransactionInput) => addTransaction(data))
  ipcMain.handle('tx:update', (_e, id: number, data: TransactionInput) => updateTransaction(id, data))
  ipcMain.handle('tx:delete', (_e, id: number) => deleteTransaction(id))
  ipcMain.handle('summary:month', (_e, month: string) => monthSummary(month))
  ipcMain.handle('summary:range', (_e, from: string, to: string) => summaryInRange(from, to))
  ipcMain.handle('export:csv', () => exportCsv())
}

app.whenReady().then(() => {
  initDb()
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
