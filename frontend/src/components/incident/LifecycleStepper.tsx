import { Check } from 'lucide-react'
import { STATUS_ORDER, type IncidentStatus } from '../../api/types'
import { cn } from '../../lib/cn'
import { STATUS_LABEL } from '../../lib/format'

/**
 * Shows the 8-step lifecycle (the State pattern on the backend) with the current step highlighted.
 */
export function LifecycleStepper({ status }: { status: IncidentStatus }) {
  const current = STATUS_ORDER.indexOf(status)
  return (
    <ol className="flex w-full items-start overflow-x-auto pb-1">
      {STATUS_ORDER.map((s, i) => {
        const done = i < current || status === 'CLOSED'
        const active = i === current && status !== 'CLOSED'
        return (
          <li key={s} className="flex min-w-[78px] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : i <= current ? 'bg-brand' : 'bg-line')} />
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors',
                  done && 'border-brand bg-brand text-brand-fg',
                  active && 'border-brand bg-brand-soft text-brand ring-4 ring-brand/15',
                  !done && !active && 'border-line bg-surface text-faint',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <div className={cn('h-0.5 flex-1', i === STATUS_ORDER.length - 1 ? 'bg-transparent' : i < current ? 'bg-brand' : 'bg-line')} />
            </div>
            <span className={cn('mt-1.5 text-[11px] leading-tight', active ? 'font-semibold text-fg' : done ? 'text-muted' : 'text-faint')}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
