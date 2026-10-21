import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-muted', className)} />
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />
}

export function EmptyState({ title, message, action }: { title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <p className="font-medium">Could not load this</p>
      <p className="mt-0.5">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline cursor-pointer">Try again</button>
      )}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-medium text-muted ring-1 ring-line', sizes[size])}>
      {initials(name)}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A row of numbers in one bordered strip, e.g. "Open 4 | Waiting for you 1 | ...". */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:flex', className)}>
      {children}
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'default', onClick }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'danger' | 'warning' | 'success'
  onClick?: () => void
}) {
  const valueColor = {
    default: 'text-fg',
    danger: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    success: 'text-emerald-700 dark:text-emerald-400',
  }[tone]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn('min-w-0 flex-1 bg-surface px-4 py-3 text-left odd:last:col-span-2', onClick && 'cursor-pointer hover:bg-surface-2')}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('tabular mt-0.5 text-xl font-semibold', valueColor)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Tag>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: {
  value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors cursor-pointer',
            t.value === value ? 'border-brand font-medium text-fg' : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="tabular text-xs text-faint">({t.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}
