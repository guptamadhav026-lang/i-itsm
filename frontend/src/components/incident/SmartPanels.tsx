import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { incidentApi } from '../../api/endpoints'
import type { ScoredTechnician } from '../../api/types'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Avatar, Skeleton } from '../ui/misc'
import { StatusBadge } from './badges'

function Score({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span className={cn('tabular shrink-0 font-mono text-xs', pct >= 70 ? 'font-medium text-fg' : 'text-muted')}>
      {pct}% similar
    </span>
  )
}

/** Intelligent features A and G: open incidents that look the same, and fixes that worked before. */
export function SimilarIncidentsPanel({ incidentId, onUseResolution, showResolutions }: {
  incidentId: number
  onUseResolution?: (text: string) => void
  showResolutions: boolean
}) {
  const similar = useQuery({ queryKey: ['incident', incidentId, 'similar'], queryFn: () => incidentApi.similar(incidentId) })
  const resolutions = useQuery({
    queryKey: ['incident', incidentId, 'suggestions'],
    queryFn: () => incidentApi.suggestedResolutions(incidentId),
    enabled: showResolutions,
  })

  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-2 text-sm font-semibold text-fg">Similar open incidents</h4>
        {similar.isLoading ? <Skeleton className="h-14" /> : similar.data?.length ? (
          <ul className="space-y-2">
            {similar.data.map((s) => (
              <li key={s.incidentId}>
                <Link to={`/incidents/${s.incidentId}`} className="flex items-center gap-3 rounded border border-line px-3 py-2.5 hover:border-line-strong hover:bg-surface-2">
                  <span className="font-mono text-xs text-faint">{s.reference}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{s.title}</span>
                  <StatusBadge status={s.status} />
                  <Score value={s.score} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No similar open incidents found.</p>}
      </section>

      {showResolutions && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-fg">Fixes used on similar resolved incidents</h4>
          {resolutions.isLoading ? <Skeleton className="h-14" /> : resolutions.data?.length ? (
            <ul className="space-y-2">
              {resolutions.data.map((r) => (
                <li key={r.incidentId} className="rounded border border-line p-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/incidents/${r.incidentId}`} className="font-mono text-xs text-brand hover:underline">{r.reference}</Link>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{r.title}</span>
                    <Score value={r.score} />
                  </div>
                  <p className="mt-1.5 text-sm text-fg">{r.resolution}</p>
                  {onUseResolution && (
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => onUseResolution(r.resolution)}>
                      Use this fix
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No resolved incident is similar enough yet.</p>}
        </section>
      )}
    </div>
  )
}

/** Intelligent feature D: technicians ranked by the SMART strategy, with the reasons behind each score. */
export function RecommendedTechnicians({ incidentId, currentId, onAssign, assigning, disabled }: {
  incidentId: number
  currentId: number | null
  onAssign: (t: ScoredTechnician) => void
  /** the technician being assigned right now (their button shows a spinner) */
  assigning: number | null
  /** while any change is being saved, so a second click cannot start another */
  disabled: boolean
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['incident', incidentId, 'recommended'],
    queryFn: () => incidentApi.recommended(incidentId),
  })
  if (isLoading) return <Skeleton className="h-24" />
  if (!data?.length) {
    return <p className="text-sm text-muted">No technician is free right now: everyone is away or at their limit of active incidents.</p>
  }
  const best = data[0].score
  return (
    <ul className="space-y-2">
      {data.map((t, i) => (
        <li key={t.technicianId} className={cn('rounded border p-3', i === 0 ? 'border-brand' : 'border-line')}>
          <div className="flex items-center gap-3">
            <Avatar name={t.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">
                {t.fullName}
                {i === 0 && <span className="ml-2 text-xs font-normal text-muted">best match</span>}
              </p>
              <div className="mt-1 h-1 overflow-hidden bg-surface-2">
                <div className="h-full bg-brand" style={{ width: `${(t.score / Math.max(1, best)) * 100}%` }} />
              </div>
            </div>
            <span className="tabular font-mono text-sm font-semibold text-fg">{Math.round(t.score)}</span>
            {t.technicianId === currentId ? (
              <span className="text-xs font-medium text-muted">Current</span>
            ) : (
              <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} loading={assigning === t.technicianId} disabled={disabled} onClick={() => onAssign(t)}>Assign</Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{t.reasons}</p>
        </li>
      ))}
    </ul>
  )
}
