import { STATUS_ORDER, type IncidentStatus } from '../../api/types'
import { cn } from '../../lib/cn'
import { STATUS_LABEL } from '../../lib/format'

/** The 8 lifecycle stages (State pattern on the backend). Stages already passed get a filled bar. */
export function LifecycleStepper({ status }: { status: IncidentStatus }) {
  const current = STATUS_ORDER.indexOf(status)
  return (
    <ol className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-8">
      {STATUS_ORDER.map((s, i) => {
        const reached = i <= current
        const active = i === current && status !== 'CLOSED'
        return (
          <li key={s} aria-current={active ? 'step' : undefined}>
            <div className={cn('h-1', reached ? 'bg-brand' : 'bg-line')} />
            <p className={cn('mt-1.5 text-xs', active ? 'font-semibold text-fg' : reached ? 'text-muted' : 'text-faint')}>
              <span className="tabular mr-1 text-faint">{i + 1}.</span><span>{STATUS_LABEL[s]}</span>
            </p>
          </li>
        )
      })}
    </ol>
  )
}
