import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '../../api/client'
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

export function EmptyState({ title, message, action, compact }: {
  title: string; message?: ReactNode; action?: ReactNode; compact?: boolean
}) {
  return (
    <div className={cn('text-center', compact ? 'px-4 py-6' : 'px-6 py-12')}>
      <p className="text-sm font-medium text-fg">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  // Retrying only helps when the server was unreachable or failed, not when the answer was "no".
  const canRetry = onRetry && !(error instanceof ApiError && error.status >= 400 && error.status < 500)
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <p className="font-medium">Could not load this</p>
      <p className="mt-0.5">{message}</p>
      {canRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline cursor-pointer">Try again</button>
      )}
    </div>
  )
}

const avatarTones = [
  'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
]

/** Initials in a circle. The colour comes from the name, so a person always gets the same one. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', avatarTones[hash % avatarTones.length], sizes[size])}>
      {initials(name)}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-[22px] font-semibold leading-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A row of numbers in one bordered strip, e.g. "Open 4 | Waiting for you 1 | ...". */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-card sm:flex', className)}>
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
  const marker = { default: '', danger: 'bg-red-600', warning: 'bg-amber-500', success: 'bg-emerald-600' }[tone]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn('relative min-w-0 flex-1 bg-surface px-4 pb-3.5 pt-3 text-left odd:last:col-span-2', onClick && 'cursor-pointer hover:bg-surface-2')}
    >
      {marker && <span className={cn('absolute inset-x-0 top-0 h-0.5', marker)} />}
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('tabular mt-1 text-2xl font-semibold leading-none', valueColor)}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-faint">{hint}</div>}
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
            '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors cursor-pointer',
            t.value === value ? 'border-brand font-medium text-fg' : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('tabular rounded px-1.5 text-[11px] leading-4', t.value === value ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-faint')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** A thin horizontal bar, e.g. a technician's workload against their limit. */
export function Meter({ value, max, className, tone }: { value: number; max: number; className?: string; tone?: string }) {
  const ratio = Math.min(1, value / Math.max(1, max))
  const color = tone ?? (ratio >= 1 ? 'bg-red-600' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-brand')
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-2', className)}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}
