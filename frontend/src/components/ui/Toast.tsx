import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

type ToastKind = 'success' | 'error' | 'info' | 'warning' | 'live'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
  onClick?: () => void
}

interface ToastApi {
  show: (kind: ToastKind, title: string, message?: string, onClick?: () => void) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1

// Coloured left edge per kind; the title says what happened.
const edge: Record<ToastKind, string> = {
  success: 'border-l-emerald-600',
  error: 'border-l-red-600',
  warning: 'border-l-amber-500',
  info: 'border-l-slate-400',
  live: 'border-l-brand',
}

/** Small pop-up messages in the corner ("Incident resolved", "Assigned to you"...). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback((kind: ToastKind, title: string, message?: string, onClick?: () => void) => {
    const id = nextId++
    setToasts((t) => [...t.slice(-3), { id, kind, title, message, onClick }])
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 5000)
  }, [dismiss])

  const value = useMemo<ToastApi>(() => ({
    show,
    success: (title, message) => show('success', title, message),
    error: (title, message) => show('error', title, message),
  }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => { t.onClick?.(); dismiss(t.id) }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-md border border-line-strong border-l-4 bg-surface px-3 py-2.5 shadow-pop fade-in',
                edge[t.kind],
                t.onClick && 'cursor-pointer hover:border-line-strong',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-muted line-clamp-2">{t.message}</p>}
              </div>
              <button
                aria-label="Dismiss"
                onClick={(e) => { e.stopPropagation(); dismiss(t.id) }}
                className="shrink-0 rounded p-0.5 text-faint hover:text-fg cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
