import { useState, useCallback } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

let listeners: Array<(toasts: ToastItem[]) => void> = []
let toastList: ToastItem[] = []

function emit(toasts: ToastItem[]) {
  toastList = toasts
  listeners.forEach(l => l(toasts))
}

export function toast(opts: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  const item: ToastItem = { id, ...opts }
  emit([...toastList, item])
  // Auto-dismiss after 4s
  setTimeout(() => {
    emit(toastList.filter(t => t.id !== id))
  }, 4000)
}

export function useToastStore() {
  const [toasts, setToasts] = useState<ToastItem[]>(toastList)
  const subscribe = useCallback((setter: (t: ToastItem[]) => void) => {
    listeners.push(setter)
    return () => { listeners = listeners.filter(l => l !== setter) }
  }, [])
  return { toasts, setToasts, subscribe }
}
