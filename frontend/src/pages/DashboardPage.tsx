import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useAuth, useUser } from '../auth/AuthContext'
import { adminApi, incidentApi, reportApi, technicianApi } from '../api/endpoints'
import { errorText } from '../api/client'
import { PRIORITIES, STATUS_ORDER, type IncidentSummary, type Priority, type User } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader, CardLink } from '../components/ui/Card'
import { Toggle } from '../components/ui/Field'
import { EmptyState, ErrorState, Meter, PageHeader, Skeleton, Stat, StatRow } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { IncidentTable } from '../components/incident/IncidentTable'
import { PriorityBadge, priorityBar } from '../components/incident/badges'
import { SlaTimeLeft } from '../components/incident/SlaCountdown'
import { KnownProblems } from '../components/incident/ServiceStatus'
import { cn } from '../lib/cn'
import {
  categoryLabel, EVENT_LABEL, formatDateTime, formatLongDay, greeting, PRIORITY_LABEL, STATUS_LABEL, timeAgo,
} from '../lib/format'

const isOpen = (i: IncidentSummary) => !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)
const firstName = (u: User) => u.fullName.split(' ')[0]
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Every role lands here after login, but each one sees a page for its own job. */
export function DashboardPage() {
  const user = useUser()
  if (user.role === 'EMPLOYEE') return <EmployeeDashboard user={user} />
  if (user.role === 'TECHNICIAN') return <TechnicianDashboard user={user} />
  return <AdminDashboard user={user} />
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-fg">{children}</h2>
      {action}
    </div>
  )
}

// Employee: what they reported, what is waiting for them, and what is already known to be broken.

function EmployeeDashboard({ user }: { user: User }) {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const open = data.filter(isOpen)
  const done = data.filter((i) => !isOpen(i))
  const questions = open.filter((i) => i.awaitingReporterInfo)
  const toVerify = data.filter((i) => i.status === 'RESOLVED')
  const toClose = data.filter((i) => i.status === 'VERIFIED')

  return (
    <div>
      <PageHeader
        eyebrow={formatLongDay()}
        title={`${greeting()}, ${firstName(user)}`}
        subtitle={isLoading ? ' ' : open.length
          ? `You have ${plural(open.length, 'open incident')}. You will get a notification when anything changes.`
          : 'Nothing you reported is open right now.'}
        actions={<Link to="/incidents/new"><Button icon={<Plus className="size-4" />}>Report a problem</Button></Link>}
      />

      {(questions.length > 0 || toVerify.length > 0 || toClose.length > 0) && (
        <Card className="mb-6 border-amber-300 dark:border-amber-800">
          <CardHeader title="Waiting for you" subtitle="These incidents need an answer or a check from you before they can move on." />
          <ul className="divide-y divide-line border-t border-line">
            {questions.map((i) => (
              <ActionRow key={`q${i.id}`} incident={i} cta="Answer" text="The IT team asked you a question about it" />
            ))}
            {toVerify.map((i) => (
              <ActionRow key={`v${i.id}`} incident={i} cta="Check the fix" text="Marked as fixed. Does it work for you now?" />
            ))}
            {toClose.map((i) => (
              <ActionRow key={`c${i.id}`} incident={i} cta="Close it" text="You confirmed the fix. Close it, and rate the help if you like." />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section>
            <SectionTitle action={data.length > 0 && <Link to="/incidents"><CardLink>All my incidents</CardLink></Link>}>
              Open
            </SectionTitle>
            {error ? <ErrorState error={error} onRetry={refetch} />
              : isLoading ? <ListSkeleton />
                : open.length > 0 ? <div className="space-y-3">{open.map((i) => <OpenIncidentCard key={i.id} incident={i} />)}</div>
                  : (
                    <Card>
                      <EmptyState title={data.length ? 'All your incidents are fixed' : 'You have not reported anything yet'}
                        message="When something IT-related stops working, report it and we'll find the right person for it." />
                    </Card>
                  )}
          </section>

          {done.length > 0 && (
            <section>
              <SectionTitle>Fixed recently</SectionTitle>
              <Card><IncidentTable incidents={done.slice(0, 5)} hide={['reporter']} compact /></Card>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <KnownProblems />
          <HowItWorks />
        </aside>
      </div>
    </div>
  )
}

/** One open incident, written for the person who reported it. */
function OpenIncidentCard({ incident: i }: { incident: IncidentSummary }) {
  const step = STATUS_ORDER.indexOf(i.status) + 1
  return (
    <Link to={`/incidents/${i.id}`} className="group relative block overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
      {i.priority && <span className={cn('absolute inset-y-0 left-0 w-1', priorityBar[i.priority])} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-faint">{i.reference}</p>
          <p className="mt-0.5 font-medium text-fg group-hover:text-brand">{i.title}</p>
          <p className="mt-0.5 text-xs text-muted">{i.service} · {categoryLabel(i.category)} · reported {timeAgo(i.createdAt)}</p>
        </div>
        <PriorityBadge priority={i.priority} />
      </div>
      <div className="mt-3.5 flex gap-0.5" aria-hidden="true">
        {STATUS_ORDER.map((s, n) => <span key={s} className={cn('h-1 flex-1 rounded-full', n < step ? 'bg-brand' : 'bg-surface-2')} />)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">
          <span className="font-medium text-fg">{STATUS_LABEL[i.status]}</span>
          {i.assignedTechnician ? ` · ${i.assignedTechnician.fullName} is on it` : ' · waiting for a technician'}
        </span>
        <span className="text-muted">Target fix {formatDateTime(i.resolutionDeadline)}</span>
      </div>
    </Link>
  )
}

function HowItWorks() {
  const steps = [
    ['You report it', 'Say what broke and how many people it affects.'],
    ['We rate it', 'The priority comes from the impact, the urgency and how important the service is.'],
    ['A technician takes it', 'The right person is picked from skills and workload, with a deadline to meet.'],
    ['You confirm the fix', 'When they mark it fixed, you check it and close it, or send it back.'],
  ]
  return (
    <Card>
      <CardHeader title="What happens after you report" />
      <ol className="space-y-3 px-4 pb-4">
        {steps.map(([title, text], n) => (
          <li key={title} className="flex gap-3">
            <span className="tabular flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{n + 1}</span>
            <span className="text-sm">
              <span className="font-medium text-fg">{title}.</span> <span className="text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// Technician: availability switch, workload and the personal queue.

function TechnicianDashboard({ user }: { user: User }) {
  const { refresh } = useAuth()
  const toast = useToast()
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const availability = useMutation({
    mutationFn: technicianApi.setAvailability,
    onSuccess: async (u) => {
      await refresh()
      toast.success(u.available ? 'You will get new incidents again' : 'You will not get new incidents for now')
    },
    onError: (e) => toast.error('Could not change availability', errorText(e)),
  })

  const active = data.filter((i) => ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status))
  const toAcknowledge = data.filter((i) => i.status === 'ASSIGNED')
    .sort((a, b) => (a.responseDeadline ?? '').localeCompare(b.responseDeadline ?? ''))
  const atRisk = active.filter((i) => i.slaState !== 'ON_TRACK').length
  const waiting = active.filter((i) => i.awaitingReporterInfo).length
  const max = user.maxActiveIncidents ?? 5
  const count = (n: number) => (isLoading ? '-' : n)
  const skills = (user.skills ?? []).map(categoryLabel).join(', ') || 'no skills set'

  return (
    <div>
      <PageHeader
        eyebrow={formatLongDay()}
        title={`${greeting()}, ${firstName(user)}`}
        subtitle={`${skills} · ${isLoading ? '-' : active.length} of ${max} active incidents`}
        actions={
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg shadow-card">
            <Toggle checked={!!user.available} disabled={availability.isPending} onChange={(v) => availability.mutate(v)} label="Available for new incidents" />
            {user.available ? 'Taking new incidents' : 'Not taking new incidents'}
          </label>
        } />

      <StatRow>
        <Stat label="Active" value={isLoading ? '-' : `${active.length} / ${max}`} hint="the limit is set by an admin"
          tone={active.length >= max ? 'danger' : 'default'} />
        <Stat label="Not acknowledged yet" value={count(toAcknowledge.length)} tone={toAcknowledge.length ? 'danger' : 'default'} />
        <Stat label="SLA at risk or breached" value={count(atRisk)} tone={atRisk ? 'warning' : 'default'} />
        <Stat label="Waiting for the reporter" value={count(waiting)} />
      </StatRow>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {toAcknowledge.length > 0 && (
            <Card className="border-red-300 dark:border-red-900">
              <CardHeader title="Acknowledge these first" subtitle="The response clock keeps running until you do." />
              <ul className="divide-y divide-line border-t border-line">
                {toAcknowledge.map((i) => (
                  <li key={i.id}>
                    <Link to={`/incidents/${i.id}`} className="flex items-center gap-4 px-4 py-2.5 hover:bg-surface-2">
                      <PriorityBadge priority={i.priority} showLabel={false} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{i.title}</p>
                        <p className="text-xs text-muted">{i.reference} · {i.service} · reported {timeAgo(i.createdAt)}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-faint">respond within</p>
                        <SlaTimeLeft deadline={i.responseDeadline} done={false} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Assigned to me" subtitle={isLoading ? undefined : `${plural(data.length, 'incident')}, newest first`} />
            {error ? <CardBody><ErrorState error={error} onRetry={refetch} /></CardBody>
              : isLoading ? <ListSkeleton />
                : <div className="border-t border-line"><IncidentTable incidents={data} hide={['technician']} emptyTitle="Nothing assigned to you"
                    emptyMessage="Incidents that match your skills are assigned to you automatically." /></div>}
          </Card>
        </div>
        <aside className="space-y-6">
          <KnownProblems />
        </aside>
      </div>
    </div>
  )
}

// Admin: the whole service desk at a glance.

function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate()
  const overview = useQuery({ queryKey: ['reports', 'overview'], queryFn: reportApi.overview })
  const risks = useQuery({ queryKey: ['reports', 'sla-risk'], queryFn: reportApi.slaRisk })
  const clusters = useQuery({ queryKey: ['reports', 'correlations'], queryFn: reportApi.correlations })
  const workload = useQuery({ queryKey: ['reports', 'workload'], queryFn: reportApi.workload })
  const activity = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => adminApi.audit(8), refetchInterval: 30_000 })
  const all = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const o = overview.data
  const open = (all.data ?? []).filter(isOpen)
  const unassigned = open.filter((i) => !i.assignedTechnician)

  return (
    <div>
      <PageHeader
        eyebrow={formatLongDay()}
        title={`${greeting()}, ${firstName(user)}`}
        subtitle={o ? `${plural(o.unresolvedIncidents, 'open incident')}, ${o.criticalOpenIncidents} of them critical.` : ' '}
      />

      {/* Several open incidents on one service in a short time usually mean one bigger outage. */}
      {clusters.data && clusters.data.length > 0 && (
        <div className="mb-6 space-y-2">
          {clusters.data.map((c) => (
            <div key={c.serviceId} className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-950/30">
              <span className="relative hidden size-2.5 shrink-0 sm:flex">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-50 [animation-duration:2s]" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">Possible major incident on {c.serviceName}</p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  {c.incidentCount} related open incidents ({c.incidentReferences.join(', ')}), highest priority {c.highestPriority}.
                  Handling them together will be quicker.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => navigate(`/incidents?serviceId=${c.serviceId}`)}>See the incidents</Button>
            </div>
          ))}
        </div>
      )}

      <StatRow>
        <Stat label="Open incidents" value={o?.unresolvedIncidents ?? '-'} hint={o && `${o.totalIncidents} reported in total`} onClick={() => navigate('/incidents?open=true')} />
        <Stat label="Critical (P1) open" value={o?.criticalOpenIncidents ?? '-'} tone={o?.criticalOpenIncidents ? 'danger' : 'default'}
          onClick={() => navigate('/incidents?priority=P1&open=true')} />
        <Stat label="Without a technician" value={all.data ? unassigned.length : '-'} hint={unassigned.length ? 'need a manual assignment' : 'everything has an owner'}
          tone={unassigned.length ? 'warning' : 'default'} onClick={() => navigate('/incidents?status=CLASSIFIED')} />
        <Stat label="SLA breaches" value={o?.slaViolations ?? '-'} hint="open and closed incidents" tone={o?.slaViolations ? 'warning' : 'default'}
          onClick={() => navigate('/incidents?slaState=BREACHED')} />
        <Stat label="Fixed within SLA" value={o ? `${o.slaCompliancePercent}%` : '-'} hint={o && `of ${plural(o.resolvedIncidents, 'resolved incident')}`}
          tone={o && o.resolvedIncidents > 0 && o.slaCompliancePercent < 90 ? 'warning' : 'default'} />
      </StatRow>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Needs attention" subtitle="Unassigned incidents, then the ones most likely to miss their SLA"
              action={<Link to="/incidents?slaState=AT_RISK"><CardLink>All at risk</CardLink></Link>} />
            {risks.isLoading || all.isLoading ? <ListSkeleton /> : (unassigned.length > 0 || (risks.data?.length ?? 0) > 0) ? (
              <ul className="divide-y divide-line border-t border-line">
                {unassigned.map((i) => (
                  <AttentionRow key={`u${i.id}`} to={`/incidents/${i.id}`} priority={i.priority} title={i.title}
                    meta={`${i.reference} · ${i.service} · no technician was free when it came in`}
                    right={<span className="text-xs font-medium text-amber-700 dark:text-amber-400">Assign</span>} />
                ))}
                {risks.data?.filter((r) => !unassigned.some((u) => u.id === r.incidentId)).slice(0, 6).map((r) => (
                  <AttentionRow key={r.incidentId} to={`/incidents/${r.incidentId}`} priority={r.priority} title={r.title}
                    meta={`${r.reference} · ${r.technician ?? 'unassigned'} · ${r.reason}`}
                    right={
                      <span className="flex w-20 flex-col items-end gap-1" title="Risk score from 0 to 100">
                        <span className={cn('tabular font-mono text-sm font-medium',
                          r.riskScore >= 80 ? 'text-red-700 dark:text-red-400' : r.riskScore >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-fg')}>{r.riskScore}</span>
                        <Meter value={r.riskScore} max={100} className="w-full"
                          tone={r.riskScore >= 80 ? 'bg-red-600' : r.riskScore >= 50 ? 'bg-amber-500' : 'bg-brand'} />
                      </span>
                    } />
                ))}
              </ul>
            ) : <p className="border-t border-line px-4 py-4 text-sm text-muted">No open incident is waiting for a technician or close to missing its SLA.</p>}
          </Card>

          <Card>
            <CardHeader title="Technicians" subtitle="Active incidents against each person's limit"
              action={<Link to="/admin/users"><CardLink>Manage</CardLink></Link>} />
            {workload.isLoading ? <ListSkeleton /> : (
              <ul className="divide-y divide-line border-t border-line">
                {workload.data?.map((t) => (
                  <li key={t.technicianId} className="grid grid-cols-[minmax(0,1fr)_120px_64px] items-center gap-4 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px_80px]">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg">
                        {t.fullName}
                        {!t.available && <span className="text-xs font-normal text-faint">away</span>}
                      </p>
                      <p className="truncate text-xs text-muted">{t.skills.map(categoryLabel).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Meter value={t.activeIncidents} max={t.maxActiveIncidents} className="flex-1" />
                      <span className="tabular w-8 text-right text-xs text-fg">{t.activeIncidents}/{t.maxActiveIncidents}</span>
                    </div>
                    <span className="tabular text-right text-xs text-muted">{t.resolvedIncidents} fixed</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <OpenByPriority incidents={open} loading={all.isLoading} />
          <Card>
            <CardHeader title="Latest activity" action={<Link to="/admin/audit"><CardLink>Audit log</CardLink></Link>} />
            {activity.isLoading && <ListSkeleton />}
            <ul className="border-t border-line py-1">
              {activity.data?.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2 px-4 py-1.5 text-sm">
                  <Link to={`/incidents/${a.incidentId}`} className="shrink-0 font-mono text-xs text-brand hover:underline">{a.incidentReference}</Link>
                  <span className="min-w-0 flex-1 truncate text-fg">{EVENT_LABEL[a.action]}
                    <span className="text-muted"> · {a.actor === 'SYSTEM' ? 'system' : a.actor}</span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{timeAgo(a.timestamp)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      {overview.error && <div className="mt-6"><ErrorState error={overview.error} onRetry={overview.refetch} /></div>}
    </div>
  )
}

function AttentionRow({ to, priority, title, meta, right }: { to: string; priority: Priority | null; title: string; meta: string; right: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
        <PriorityBadge priority={priority} showLabel={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{title}</p>
          <p className="truncate text-xs text-muted">{meta}</p>
        </div>
        {right}
      </Link>
    </li>
  )
}

/** Open incidents split by priority: one stacked bar and the counts underneath. */
function OpenByPriority({ incidents, loading }: { incidents: IncidentSummary[]; loading: boolean }) {
  const counts = PRIORITIES.map((p) => ({ p, n: incidents.filter((i) => i.priority === p).length }))
  const total = incidents.length
  return (
    <Card>
      <CardHeader title="Open by priority" subtitle={loading ? undefined : `${plural(total, 'incident')} not yet resolved`} />
      <CardBody>
        {loading ? <Skeleton className="h-12" /> : (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-2">
              {total > 0 && counts.filter((c) => c.n > 0).map((c) => (
                <span key={c.p} className={cn('h-full', priorityBar[c.p])} style={{ width: `${(c.n / total) * 100}%` }} title={`${c.p}: ${c.n}`} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {counts.map((c) => (
                <li key={c.p}>
                  <Link to={`/incidents?priority=${c.p}`} className="flex items-center justify-between gap-2 text-sm hover:text-brand">
                    <span className="flex items-center gap-2 text-muted"><span className={cn('size-2 rounded-sm', priorityBar[c.p])} />{c.p} {PRIORITY_LABEL[c.p]}</span>
                    <span className="tabular font-medium text-fg">{c.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  )
}

function ActionRow({ incident, text, cta }: { incident: IncidentSummary; text: string; cta: string }) {
  return (
    <li>
      <Link to={`/incidents/${incident.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{incident.reference} · {incident.title}</span>
          <span className="block text-xs text-muted">{text}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-brand">{cta}</span>
      </Link>
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2 px-4 pb-4">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
    </div>
  )
}
