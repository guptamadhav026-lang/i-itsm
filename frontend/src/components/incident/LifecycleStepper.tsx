import { Check } from 'lucide-react'
import { STATUS_ORDER, type IncidentStatus } from '../../api/types'
import { cn } from '../../lib/cn'
import { STATUS_LABEL } from '../../lib/format'

/**
 * The 8 lifecycle stages (State pattern on the backend) as a row of steps joined by a line.
 * On a phone only the current stage keeps its label, so the row still fits.
 */
export function LifecycleStepper({ status }: { status: IncidentStatus }) {
  const current = STATUS_ORDER.indexOf(status)
  const finished = status === 'CLOSED'
  return (
    <ol className="flex">
      {STATUS_ORDER.map((s, i) => {
        const done = i < current || finished
        const active = i === current && !finished
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="relative flex flex-1 flex-col items-center text-center">
            {/* line from the previous step and to the next one, meeting under the circle */}
            {i > 0 && <span className={cn('absolute left-0 right-1/2 top-[9px] h-0.5', i <= current || finished ? 'bg-brand' : 'bg-line')} />}
            {i < STATUS_ORDER.length - 1 && <span className={cn('absolute left-1/2 right-0 top-[9px] h-0.5', i < current || finished ? 'bg-brand' : 'bg-line')} />}
            <span className={cn(
              'relative z-10 flex size-5 items-center justify-center rounded-full border-2',
              done ? 'border-brand bg-brand text-brand-fg' : active ? 'border-brand bg-surface' : 'border-line-strong bg-surface',
            )}>
              {done && <Check className="size-3" strokeWidth={3} />}
              {active && <span className="size-2 rounded-full bg-brand" />}
            </span>
            <span className={cn(
              'mt-2 whitespace-nowrap text-xs',
              active ? 'font-semibold text-fg' : done ? 'text-muted' : 'text-faint',
              !active && 'hidden sm:block',
            )}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
