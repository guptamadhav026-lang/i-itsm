import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { adminApi } from '../../api/endpoints'
import type { EventType } from '../../api/types'
import { Card } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, PageHeader, PageLoader } from '../../components/ui/misc'
import { EVENT_LABEL, formatDateTime, STATUS_LABEL } from '../../lib/format'
import { cn } from '../../lib/cn'

const alarming: EventType[] = ['SLA_VIOLATED', 'ESCALATED']
const warning: EventType[] = ['SLA_WARNING', 'DUPLICATE_DETECTED', 'REOPENED']

/** The complete audit trail across all incidents (records are immutable: nobody can edit history). */
export function AuditLogPage() {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['audit', 'all'], queryFn: () => adminApi.audit(500) })
  const [text, setText] = useState('')
  const [action, setAction] = useState<EventType | ''>('')

  const shown = useMemo(() => data.filter((r) =>
    (!action || r.action === action) &&
    (!text || `${r.incidentReference} ${r.actor} ${r.description}`.toLowerCase().includes(text.toLowerCase()))), [data, text, action])

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Who did what, when, and how it changed the incident. Newest first." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input aria-label="Search the audit log" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by incident, user or text" className="pl-9" />
          </div>
          <Select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value as EventType | '')} className="sm:w-56">
            <option value="">All actions</option>
            {(Object.keys(EVENT_LABEL) as EventType[]).map((a) => <option key={a} value={a}>{EVENT_LABEL[a]}</option>)}
          </Select>
        </div>
        {error ? <div className="p-5"><ErrorState error={error} onRetry={refetch} /></div> : isLoading ? <PageLoader />
          : shown.length === 0 ? <EmptyState title="No matching records" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2/50 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Time</th>
                    <th className="px-4 py-2.5 text-left font-medium">Incident</th>
                    <th className="px-4 py-2.5 text-left font-medium">Action</th>
                    <th className="px-4 py-2.5 text-left font-medium">State change</th>
                    <th className="px-4 py-2.5 text-left font-medium">By</th>
                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{formatDateTime(r.timestamp)}</td>
                      <td className="px-4 py-2.5"><Link to={`/incidents/${r.incidentId}`} className="font-mono text-xs text-brand hover:underline">{r.incidentReference}</Link></td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={cn('text-xs font-medium', alarming.includes(r.action) ? 'text-red-600 dark:text-red-400' : warning.includes(r.action) ? 'text-amber-600 dark:text-amber-400' : 'text-fg')}>
                          {EVENT_LABEL[r.action]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                        {r.previousStatus && r.newStatus && r.previousStatus !== r.newStatus
                          ? <span>{STATUS_LABEL[r.previousStatus]} to {STATUS_LABEL[r.newStatus]}</span>
                          : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-fg">{r.actor}</td>
                      <td className="px-4 py-2.5 text-xs text-muted">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  )
}
