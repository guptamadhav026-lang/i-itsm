import { cn } from '../../lib/cn'

/** The I-ITSM mark: a ticket with a tick on it. Same drawing as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="7" fill="#0f5e66" />
      <path d="M8 9h16a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V21a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6V11a2 2 0 0 1 2-2z" fill="#fff" />
      <path d="M12 16.2l2.6 2.6 5.4-5.4" fill="none" stroke="#0f5e66" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ tone = 'default', className }: { tone?: 'default' | 'inverse'; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className={cn('text-[15px] font-semibold tracking-tight', tone === 'inverse' ? 'text-side-fg' : 'text-fg')}>I-ITSM</p>
        <p className={cn('text-[11px]', tone === 'inverse' ? 'text-side-muted' : 'text-muted')}>Service desk</p>
      </div>
    </div>
  )
}
