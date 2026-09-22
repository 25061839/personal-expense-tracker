import { contextBridge, ipcRenderer } from 'electron'
import type { Api, TransactionInput, TxType } from '@shared/types'

const api: Api = {
  listCategories: () => ipcRenderer.invoke('cat:list'),
  listTransactions: (month: string) => ipcRenderer.invoke('tx:list', month),
  listTransactionsInRange: (from: string, to: string) => ipcRenderer.invoke('tx:list-range', from, to),
  addTransaction: (data: TransactionInput) => ipcRenderer.invoke('tx:add', data),
  updateTransaction: (id: number, data: TransactionInput) => ipcRenderer.invoke('tx:update', id, data),
  deleteTransaction: (id: number) => ipcRenderer.invoke('tx:delete', id),
  monthSummary: (month: string) => ipcRenderer.invoke('summary:month', month),
  summaryInRange: (from: string, to: string) => ipcRenderer.invoke('summary:range', from, to),
  addCategory: (name: string, parentId: number | null, type: TxType) =>
    ipcRenderer.invoke('cat:add', name, parentId, type),
  renameCategory: (id: number, name: string) => ipcRenderer.invoke('cat:rename', id, name),
  deleteCategory: (id: number) => ipcRenderer.invoke('cat:delete', id),
  exportCsv: () => ipcRenderer.invoke('export:csv')
}

contextBridge.exposeInMainWorld('api', api)
