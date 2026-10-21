import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { IncidentSummary } from '../../api/types'
import { cn } from '../../lib/cn'
import { timeAgo } from '../../lib/format'
import { Avatar, EmptyState } from '../ui/misc'
import { AwaitingInfoBadge, DuplicateBadge, EscalationBadge, PriorityBadge, SlaBadge, StatusBadge } from './badges'
import { SlaTimeLeft } from './SlaCountdown'
import { STATUS_ORDER } from '../../api/types'

type SortKey = 'reference' | 'priority' | 'status' | 'deadline' | 'created'

interface Props {
  incidents: IncidentSummary[]
  /** columns to hide, e.g. the reporter column on an employee's own list */
  hide?: Array<'reporter' | 'technician'>
  emptyTitle?: string
  emptyMessage?: string
  compact?: boolean
}

const done = (i: IncidentSummary) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)

const comparators: Record<SortKey, (a: IncidentSummary, b: IncidentSummary) => number> = {
  reference: (a, b) => a.id - b.id,
  priority: (a, b) => (a.priority ?? 'P9').localeCompare(b.priority ?? 'P9'),
  status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  deadline: (a, b) => deadlineValue(a) - deadlineValue(b),
  created: (a, b) => a.createdAt.localeCompare(b.createdAt),
}

function deadlineValue(i: IncidentSummary): number {
  if (done(i) || !i.resolutionDeadline) return Number.MAX_SAFE_INTEGER
  return new Date(i.resolutionDeadline).getTime()
}

/** The incident list used on every dashboard and on the search page. Click a row to open it. */
export function IncidentTable({ incidents, hide = [], emptyTitle = 'No incidents', emptyMessage, compact }: Props) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'created', dir: -1 })

  const sorted = useMemo(
    () => [...incidents].sort((a, b) => comparators[sort.key](a, b) * sort.dir),
    [incidents, sort],
  )

  if (incidents.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={cn('px-4 py-2.5 text-left font-medium', className)}>
      <button
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'created' ? -1 : 1 }))}
        className="inline-flex items-center gap-1 hover:text-fg cursor-pointer"
      >
        {label}
        {sort.key === key
          ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
          : <ChevronsUpDown className="size-3 opacity-40" />}
      </button>
    </th>
  )

  return (
    <>
      {/* Phones: one card per incident */}
      <ul className="divide-y divide-line md:hidden">
        {sorted.map((i) => (
          <li key={i.id}>
            <button onClick={() => navigate(`/incidents/${i.id}`)} className="w-full px-4 py-3 text-left hover:bg-surface-2 cursor-pointer">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted">{i.reference}</span>
                <PriorityBadge priority={i.priority} showLabel={false} />
              </div>
              <p className="mt-1 text-sm font-medium text-fg">{i.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={i.status} />
                <SlaBadge state={i.slaState} />
                {i.awaitingReporterInfo && <AwaitingInfoBadge />}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Larger screens: a sortable table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-xs text-muted">
            <tr>
              {header('reference', 'Incident')}
              {header('priority', 'Priority')}
              {header('status', 'Status')}
              {header('deadline', 'SLA')}
              {!hide.includes('technician') && <th className="px-4 py-2.5 text-left font-medium">Assigned to</th>}
              {!hide.includes('reporter') && <th className="px-4 py-2.5 text-left font-medium">Reported by</th>}
              {header('created', 'Reported', 'text-right')}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((i) => (
              <tr
                key={i.id}
                onClick={() => navigate(`/incidents/${i.id}`)}
                className={cn('group cursor-pointer transition-colors hover:bg-surface-2/70', i.priority === 'P1' && !done(i) && 'bg-red-50/40 dark:bg-red-950/10')}
              >
                <td className={cn('px-4', compact ? 'py-2.5' : 'py-3')}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-faint">{i.reference}</span>
                    {/* A real link, so the row also works with the keyboard and "open in new tab" */}
                    <Link to={`/incidents/${i.id}`} onClick={(e) => e.stopPropagation()}
                      className="font-medium text-fg group-hover:text-brand line-clamp-1 focus-visible:underline focus-visible:outline-none">{i.title}</Link>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>{i.service}</span>
                    {i.category && <><span className="text-faint">·</span><span>{i.category}</span></>}
                    {i.potentialDuplicate && <DuplicateBadge />}
                    {i.awaitingReporterInfo && <AwaitingInfoBadge />}
                    <EscalationBadge level={i.escalationLevel} />
                  </div>
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={i.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <SlaBadge state={i.slaState} />
                    <SlaTimeLeft deadline={i.resolutionDeadline} done={done(i)} />
                  </div>
                </td>
                {!hide.includes('technician') && (
                  <td className="px-4 py-3">
                    {i.assignedTechnician ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={i.assignedTechnician.fullName} size="sm" />
                        <span className="text-fg">{i.assignedTechnician.fullName}</span>
                      </span>
                    ) : <span className="text-faint">Unassigned</span>}
                  </td>
                )}
                {!hide.includes('reporter') && <td className="px-4 py-3 text-muted">{i.reporter.fullName}</td>}
                <td className="px-4 py-3 text-right text-xs text-muted whitespace-nowrap">{timeAgo(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
