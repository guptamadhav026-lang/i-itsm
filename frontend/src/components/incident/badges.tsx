import type { EscalationLevel, IncidentStatus, Priority, SlaState } from '../../api/types'
import { cn } from '../../lib/cn'
import { ESCALATION_LABEL, PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL } from '../../lib/format'
import { Badge } from '../ui/Badge'

// Status is a coloured dot and a word: grey while waiting, blue while someone works on it, green when fixed.
const statusDot: Record<IncidentStatus, string> = {
  NEW: 'bg-slate-400',
  CLASSIFIED: 'bg-slate-400',
  ASSIGNED: 'bg-sky-500',
  ACKNOWLEDGED: 'bg-blue-600 dark:bg-blue-400',
  IN_PROGRESS: 'bg-blue-600 dark:bg-blue-400',
  RESOLVED: 'bg-emerald-500',
  VERIFIED: 'bg-emerald-600',
  CLOSED: 'bg-slate-300 dark:bg-slate-600',
}

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-fg', status === 'CLOSED' && 'text-muted', className)}>
      <span className={cn('size-2 shrink-0 rounded-full', statusDot[status])} />
      {STATUS_LABEL[status]}
    </span>
  )
}

// Priority: a small solid block with the code, then the word.
const priorityBlock: Record<Priority, string> = {
  P1: 'bg-red-600 text-white',
  P2: 'bg-orange-500 text-white',
  P3: 'bg-amber-300 text-amber-950',
  P4: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
}

export const priorityBar: Record<Priority, string> = {
  P1: 'bg-red-600',
  P2: 'bg-orange-500',
  P3: 'bg-amber-400',
  P4: 'bg-slate-300 dark:bg-slate-600',
}

export function PriorityBadge({ priority, showLabel = true }: { priority: Priority | null; showLabel?: boolean }) {
  if (!priority) return <span className="text-xs text-faint">-</span>
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs" title={`${priority} ${PRIORITY_LABEL[priority]}`}>
      <span className={cn('rounded-[3px] px-1 py-px font-mono text-[11px] font-semibold leading-4', priorityBlock[priority])}>{priority}</span>
      {showLabel && <span className="text-muted">{PRIORITY_LABEL[priority]}</span>}
    </span>
  )
}

// SLA only draws attention when something is wrong; "on track" stays quiet.
export function SlaBadge({ state }: { state: SlaState }) {
  if (state === 'AT_RISK') return <Badge tone="amber">SLA at risk</Badge>
  if (state === 'BREACHED') return <Badge tone="red">SLA breached</Badge>
  return (
    <span className={cn('whitespace-nowrap text-xs', state === 'MET' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')}>
      SLA {SLA_LABEL[state].toLowerCase()}
    </span>
  )
}

export function EscalationBadge({ level }: { level: EscalationLevel }) {
  if (level === 'NONE') return null
  return (
    <Badge tone="red" title="Escalated because it was not acknowledged in time">
      Escalated to {ESCALATION_LABEL[level].toLowerCase()}
    </Badge>
  )
}

export function DuplicateBadge() {
  return <Badge title="Looks like an incident that is already open">Possible duplicate</Badge>
}

export function AwaitingInfoBadge() {
  return <Badge tone="amber">Waiting for reporter</Badge>
}
