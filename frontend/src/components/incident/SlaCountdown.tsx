import type { SlaState } from '../../api/types'
import { cn } from '../../lib/cn'
import { formatCountdown } from '../../lib/format'
import { useNow } from '../../lib/useNow'

interface Props {
  start: string
  deadline: string | null
  /** set once the clock has stopped (e.g. resolved / acknowledged) */
  stoppedAt?: string | null
  label: string
  breached?: boolean
  warningPercent?: number
}

/**
 * A live SLA timer with a progress bar: green while there's time, amber after the warning
 * threshold, red when the deadline has passed. Stops once the SLA step is done.
 */
export function SlaCountdown({ start, deadline, stoppedAt, label, breached, warningPercent = 75 }: Props) {
  const now = useNow()
  if (!deadline) return null
  const startMs = new Date(start).getTime()
  const endMs = new Date(deadline).getTime()
  const at = stoppedAt ? new Date(stoppedAt).getTime() : now
  const left = endMs - at
  const used = Math.min(1, Math.max(0, (at - startMs) / Math.max(1, endMs - startMs)))
  const late = left < 0 || !!breached
  const state: SlaState = stoppedAt ? (late ? 'BREACHED' : 'MET') : late ? 'BREACHED' : used * 100 >= warningPercent ? 'AT_RISK' : 'ON_TRACK'

  const bar = { ON_TRACK: 'bg-emerald-500', AT_RISK: 'bg-amber-500', BREACHED: 'bg-red-500', MET: 'bg-teal-500' }[state]
  const text = { ON_TRACK: 'text-fg', AT_RISK: 'text-amber-600 dark:text-amber-400', BREACHED: 'text-red-600 dark:text-red-400', MET: 'text-teal-600 dark:text-teal-400' }[state]

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={cn('tabular font-mono text-sm font-medium', text)}>
          {stoppedAt
            ? late ? 'Missed' : 'Met'
            : left < 0 ? `-${formatCountdown(left)} late` : `${formatCountdown(left)} left`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={cn('h-full rounded-full transition-all duration-1000', bar)} style={{ width: `${(late && !stoppedAt ? 1 : used) * 100}%` }} />
      </div>
    </div>
  )
}

/** Compact "12:04 left" text for tables. */
export function SlaTimeLeft({ deadline, done }: { deadline: string | null; done: boolean }) {
  const now = useNow(1000)
  if (!deadline || done) return <span className="text-faint">-</span>
  const left = new Date(deadline).getTime() - now
  return (
    <span className={cn('tabular font-mono text-xs', left < 0 ? 'text-red-600 dark:text-red-400 font-medium' : left < 15 * 60_000 ? 'text-amber-600 dark:text-amber-400' : 'text-muted')}>
      {left < 0 ? `-${formatCountdown(left)}` : formatCountdown(left)}
    </span>
  )
}
