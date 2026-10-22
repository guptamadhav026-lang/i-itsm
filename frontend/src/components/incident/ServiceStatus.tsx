import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../../api/endpoints'
import type { ServiceStatus } from '../../api/types'
import { Card, CardHeader } from '../ui/Card'
import { Skeleton } from '../ui/misc'
import { PriorityBadge } from './badges'

/** Services with open incidents right now. The key starts with 'incidents' so live updates refresh it. */
export function useServiceStatus() {
  return useQuery({ queryKey: ['incidents', 'service-status'], queryFn: catalogApi.serviceStatus })
}

/** "Known problems" box: tells people a problem is already being worked on, so they don't report it twice. */
export function KnownProblems() {
  const { data, isLoading } = useServiceStatus()
  return (
    <Card>
      <CardHeader title="Known problems right now" subtitle="Services that already have open incidents" />
      {isLoading ? <div className="px-4 pb-4"><Skeleton className="h-16" /></div>
        : data && data.length > 0 ? (
          <>
            <ul className="divide-y divide-line border-t border-line">
              {data.map((s) => <ProblemRow key={s.serviceId} status={s} />)}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
              Same problem as one of these? It is already being worked on, you don't need to report it again.
            </p>
          </>
        ) : (
          <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm text-muted">
            <span className="size-2 rounded-full bg-emerald-500" /> No known problems. Everything looks normal.
          </p>
        )}
    </Card>
  )
}

function ProblemRow({ status }: { status: ServiceStatus }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{status.serviceName}</p>
        <p className="text-xs text-muted">
          {status.openIncidents} open {status.openIncidents === 1 ? 'report' : 'reports'}
        </p>
      </div>
      <PriorityBadge priority={status.highestPriority} />
    </li>
  )
}
