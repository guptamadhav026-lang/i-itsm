import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, Copy, Lightbulb, Sparkles, Trophy } from 'lucide-react'
import { incidentApi } from '../../api/endpoints'
import type { ScoredTechnician } from '../../api/types'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Avatar, Skeleton } from '../ui/misc'
import { StatusBadge } from './badges'

function Score({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span className={cn('tabular rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold',
      pct >= 70 ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' : 'bg-surface-2 text-muted')}>
      {pct}% match
    </span>
  )
}

/** Intelligent features A and G: open incidents that look the same, and fixes that worked before. */
export function SmartAssist({ incidentId, onUseResolution, showResolutions }: {
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
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Copy className="size-4 text-violet-500" /> Similar open incidents</h4>
        {similar.isLoading ? <Skeleton className="h-14" /> : similar.data?.length ? (
          <ul className="space-y-2">
            {similar.data.map((s) => (
              <li key={s.incidentId}>
                <Link to={`/incidents/${s.incidentId}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:border-line-strong hover:bg-surface-2">
                  <span className="font-mono text-xs text-faint">{s.reference}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{s.title}</span>
                  <StatusBadge status={s.status} />
                  <Score value={s.score} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No similar open incidents. This looks like a new problem.</p>}
      </section>

      {showResolutions && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Lightbulb className="size-4 text-amber-500" /> Fixes that worked for similar incidents</h4>
          {resolutions.isLoading ? <Skeleton className="h-14" /> : resolutions.data?.length ? (
            <ul className="space-y-2">
              {resolutions.data.map((r) => (
                <li key={r.incidentId} className="rounded-lg border border-line bg-amber-50/40 p-3 dark:bg-amber-950/10">
                  <div className="flex items-center gap-2">
                    <Link to={`/incidents/${r.incidentId}`} className="font-mono text-xs text-brand hover:underline">{r.reference}</Link>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{r.title}</span>
                    <Score value={r.score} />
                  </div>
                  <p className="mt-1.5 text-sm text-fg">{r.resolution}</p>
                  {onUseResolution && (
                    <Button size="sm" variant="secondary" className="mt-2" icon={<Sparkles className="size-3.5" />} onClick={() => onUseResolution(r.resolution)}>
                      Use this fix
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No past resolutions match yet. They are learned from every incident that gets resolved.</p>}
        </section>
      )}
    </div>
  )
}

/** Intelligent feature D: technicians ranked by the SMART strategy, with the reasons behind each score. */
export function RecommendedTechnicians({ incidentId, currentId, onAssign, assigning }: {
  incidentId: number
  currentId: number | null
  onAssign: (t: ScoredTechnician) => void
  assigning: number | null
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['incident', incidentId, 'recommended'],
    queryFn: () => incidentApi.recommended(incidentId),
  })
  if (isLoading) return <Skeleton className="h-24" />
  if (!data?.length) return <p className="text-sm text-muted">No technician has free capacity right now.</p>
  const best = data[0].score
  return (
    <ul className="space-y-2">
      {data.map((t, i) => (
        <li key={t.technicianId} className={cn('rounded-lg border p-3', i === 0 ? 'border-brand/40 bg-brand-soft/40' : 'border-line')}>
          <div className="flex items-center gap-3">
            <Avatar name={t.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                {t.fullName}
                {i === 0 && <Trophy className="size-3.5 text-amber-500" />}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(t.score / Math.max(1, best)) * 100}%` }} />
              </div>
            </div>
            <span className="tabular font-mono text-sm font-semibold text-fg">{Math.round(t.score)}</span>
            {t.technicianId === currentId ? (
              <span className="text-xs font-medium text-muted">Current</span>
            ) : (
              <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} loading={assigning === t.technicianId} onClick={() => onAssign(t)}>Assign</Button>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted"><BrainCircuit className="mt-px size-3 shrink-0" />{t.reasons}</p>
        </li>
      ))}
    </ul>
  )
}
