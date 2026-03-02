import { useEffect } from 'react'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast'
import { useToastStore } from '@/hooks/useToast'

export function Toaster() {
  const { toasts, setToasts, subscribe } = useToastStore()

  useEffect(() => {
    return subscribe(setToasts)
  }, [subscribe, setToasts])

  return (
    <ToastProvider>
      {toasts.map(t => (
        <Toast key={t.id} variant={t.variant}>
          <div className="grid gap-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
