import { AlertOctagon, ArrowUpCircle, CheckCircle2, Clock, Copy, Flame, MessageCircleQuestion, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { EscalationLevel, IncidentStatus, Priority, SlaState } from '../../api/types'
import { ESCALATION_LABEL, PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL } from '../../lib/format'
import { Badge, type Tone } from '../ui/Badge'

const statusTone: Record<IncidentStatus, Tone> = {
  NEW: 'gray',
  CLASSIFIED: 'sky',
  ASSIGNED: 'indigo',
  ACKNOWLEDGED: 'violet',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  VERIFIED: 'teal',
  CLOSED: 'gray',
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={statusTone[status]} dot>{STATUS_LABEL[status]}</Badge>
}

export const priorityTone: Record<Priority, Tone> = { P1: 'red', P2: 'orange', P3: 'amber', P4: 'sky' }

/** Hex colours for charts, matching the badge colours. */
export const PRIORITY_COLOR: Record<Priority, string> = { P1: '#dc2626', P2: '#ea580c', P3: '#d97706', P4: '#0284c7' }
export const STATUS_COLOR: Record<IncidentStatus, string> = {
  NEW: '#94a3b8', CLASSIFIED: '#0ea5e9', ASSIGNED: '#6366f1', ACKNOWLEDGED: '#8b5cf6',
  IN_PROGRESS: '#3b82f6', RESOLVED: '#10b981', VERIFIED: '#14b8a6', CLOSED: '#64748b',
}

export function PriorityBadge({ priority, showLabel = true }: { priority: Priority | null; showLabel?: boolean }) {
  if (!priority) return <Badge>—</Badge>
  return (
    <Badge tone={priorityTone[priority]} icon={priority === 'P1' ? <Flame className="size-3" /> : undefined}>
      <span className="font-semibold">{priority}</span>
      {showLabel && <span className="opacity-80">{PRIORITY_LABEL[priority]}</span>}
    </Badge>
  )
}

const slaTone: Record<SlaState, Tone> = { ON_TRACK: 'green', AT_RISK: 'amber', BREACHED: 'red', MET: 'teal' }
const slaIcon: Record<SlaState, ReactNode> = {
  ON_TRACK: <Clock className="size-3" />,
  AT_RISK: <AlertOctagon className="size-3" />,
  BREACHED: <ShieldAlert className="size-3" />,
  MET: <CheckCircle2 className="size-3" />,
}

export function SlaBadge({ state }: { state: SlaState }) {
  return <Badge tone={slaTone[state]} icon={slaIcon[state]}>SLA {SLA_LABEL[state].toLowerCase()}</Badge>
}

export function EscalationBadge({ level }: { level: EscalationLevel }) {
  if (level === 'NONE') return null
  return (
    <Badge tone="red" icon={<ArrowUpCircle className="size-3" />} title="Escalated because it was not acknowledged in time">
      Escalated: {ESCALATION_LABEL[level]}
    </Badge>
  )
}

export function DuplicateBadge() {
  return <Badge tone="violet" icon={<Copy className="size-3" />} title="Looks like an incident that is already open">Possible duplicate</Badge>
}

export function AwaitingInfoBadge() {
  return <Badge tone="amber" icon={<MessageCircleQuestion className="size-3" />}>Waiting for reporter</Badge>
}
