import type { EscalationLevel, IncidentStatus, Priority, SlaState } from '../../api/types'
import { ESCALATION_LABEL, PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL } from '../../lib/format'
import { Badge, type Tone } from '../ui/Badge'

// Waiting stages are grey, stages someone is working on are blue, finished ones green.
const statusTone: Record<IncidentStatus, Tone> = {
  NEW: 'gray',
  CLASSIFIED: 'gray',
  ASSIGNED: 'blue',
  ACKNOWLEDGED: 'blue',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  VERIFIED: 'green',
  CLOSED: 'gray',
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={statusTone[status]}>{STATUS_LABEL[status]}</Badge>
}

export const priorityTone: Record<Priority, Tone> = { P1: 'red', P2: 'orange', P3: 'amber', P4: 'gray' }

export function PriorityBadge({ priority, showLabel = true }: { priority: Priority | null; showLabel?: boolean }) {
  if (!priority) return <Badge>-</Badge>
  return (
    <Badge tone={priorityTone[priority]}>
      <span className="font-semibold">{priority}</span>
      {showLabel && <span>{PRIORITY_LABEL[priority]}</span>}
    </Badge>
  )
}

const slaTone: Record<SlaState, Tone> = { ON_TRACK: 'gray', AT_RISK: 'amber', BREACHED: 'red', MET: 'green' }

export function SlaBadge({ state }: { state: SlaState }) {
  return <Badge tone={slaTone[state]}>SLA {SLA_LABEL[state].toLowerCase()}</Badge>
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
