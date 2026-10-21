import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth, useUser } from '../auth/AuthContext'
import { adminApi, incidentApi, reportApi, technicianApi } from '../api/endpoints'
import type { IncidentSummary, User } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Toggle } from '../components/ui/Field'
import { EmptyState, ErrorState, PageHeader, Skeleton, Stat, StatRow } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { IncidentTable } from '../components/incident/IncidentTable'
import { PriorityBadge, StatusBadge } from '../components/incident/badges'
import { SlaTimeLeft } from '../components/incident/SlaCountdown'
import { cn } from '../lib/cn'
import { EVENT_LABEL, formatAverage, timeAgo } from '../lib/format'

const isOpen = (i: IncidentSummary) => !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)

/** Every role lands here after login, but each one sees a dashboard for its own job. */
export function DashboardPage() {
  const user = useUser()
  if (user.role === 'EMPLOYEE') return <EmployeeDashboard />
  if (user.role === 'TECHNICIAN') return <TechnicianDashboard user={user} />
  return <AdminDashboard />
}

// Employee: their own incidents, and anything waiting for them.

function EmployeeDashboard() {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const open = data.filter(isOpen)
  const questions = data.filter((i) => i.awaitingReporterInfo && isOpen(i))
  const toVerify = data.filter((i) => i.status === 'RESOLVED')
  const count = (n: number) => (isLoading ? '-' : n)

  return (
    <div>
      <PageHeader
        title="My incidents"
        subtitle="Problems you have reported and where each one is."
      />

      {(questions.length > 0 || toVerify.length > 0) && (
        <Card className="mb-5 border-amber-300 dark:border-amber-800">
          <CardHeader title="Waiting for you" />
          <ul className="divide-y divide-line border-t border-line">
            {questions.map((i) => (
              <ActionRow key={`q${i.id}`} to={`/incidents/${i.id}`} incident={i}
                text={`${i.assignedTechnician?.fullName ?? 'The technician'} asked you a question`} cta="Answer" />
            ))}
            {toVerify.map((i) => (
              <ActionRow key={`v${i.id}`} to={`/incidents/${i.id}`} incident={i}
                text="Marked as resolved. Please check that it works." cta="Confirm" />
            ))}
          </ul>
        </Card>
      )}

      <StatRow>
        <Stat label="Open" value={count(open.length)} />
        <Stat label="Waiting for you" value={count(questions.length + toVerify.length)} tone={questions.length + toVerify.length ? 'warning' : 'default'} />
        <Stat label="Critical (P1) open" value={count(open.filter((i) => i.priority === 'P1').length)} tone="danger" />
        <Stat label="Resolved or closed" value={count(data.length - open.length)} />
      </StatRow>

      <Card className="mt-5">
        {error ? <CardBody className="pt-4"><ErrorState error={error} onRetry={refetch} /></CardBody>
          : isLoading ? <ListSkeleton />
            : <IncidentTable incidents={data} hide={['reporter']} emptyTitle="You have not reported anything yet"
                emptyMessage="When something IT-related stops working, report it here." />}
      </Card>
    </div>
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
    onError: (e) => toast.error('Could not change availability', (e as Error).message),
  })

  const active = data.filter((i) => ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status))
  const toAcknowledge = data.filter((i) => i.status === 'ASSIGNED')
    .sort((a, b) => (a.responseDeadline ?? '').localeCompare(b.responseDeadline ?? ''))
  const max = user.maxActiveIncidents ?? 5
  const count = (n: number) => (isLoading ? '-' : n)

  return (
    <div>
      <PageHeader title="My queue" subtitle={`${user.fullName} · skills: ${(user.skills ?? []).join(', ') || 'none set'}`}
        actions={
          <span className="flex items-center gap-2 text-sm text-fg">
            <Toggle checked={!!user.available} disabled={availability.isPending} onChange={(v) => availability.mutate(v)} label="Available for new incidents" />
            {user.available ? 'Available for new incidents' : 'Not taking new incidents'}
          </span>
        } />

      <StatRow>
        <Stat label="Active" value={isLoading ? '-' : `${active.length} of ${max}`} hint="your limit is set by an admin"
          tone={active.length >= max ? 'danger' : 'default'} />
        <Stat label="Not acknowledged yet" value={count(toAcknowledge.length)} tone={toAcknowledge.length ? 'danger' : 'default'} />
        <Stat label="SLA at risk or breached" value={count(active.filter((i) => i.slaState !== 'ON_TRACK').length)} tone="warning" />
        <Stat label="Waiting for reporter" value={count(active.filter((i) => i.awaitingReporterInfo).length)} />
      </StatRow>

      {toAcknowledge.length > 0 && (
        <Card className="mt-5 border-red-300 dark:border-red-900">
          <CardHeader title="Acknowledge first" subtitle="The response SLA keeps running until you acknowledge." />
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

      <Card className="mt-5">
        <CardHeader title="Assigned to me" />
        {error ? <CardBody><ErrorState error={error} onRetry={refetch} /></CardBody>
          : isLoading ? <ListSkeleton />
            : <IncidentTable incidents={data} hide={['technician']} emptyTitle="Nothing assigned to you"
                emptyMessage="Incidents that match your skills are assigned to you automatically." />}
      </Card>
    </div>
  )
}

// Admin: the whole service desk at a glance.

function AdminDashboard() {
  const navigate = useNavigate()
  const overview = useQuery({ queryKey: ['reports', 'overview'], queryFn: reportApi.overview })
  const risks = useQuery({ queryKey: ['reports', 'sla-risk'], queryFn: reportApi.slaRisk })
  const clusters = useQuery({ queryKey: ['reports', 'correlations'], queryFn: reportApi.correlations })
  const workload = useQuery({ queryKey: ['reports', 'workload'], queryFn: reportApi.workload })
  const activity = useQuery({ queryKey: ['audit', 'recent'], queryFn: () => adminApi.audit(12), refetchInterval: 30_000 })
  const unassigned = useQuery({
    queryKey: ['incidents', 'search', { status: 'CLASSIFIED' }],
    queryFn: () => incidentApi.search({ status: 'CLASSIFIED' }),
  })
  const o = overview.data

  return (
    <div>
      <PageHeader
        title="Service desk overview"
        subtitle="All incidents, SLAs and technicians. Changes show up here as they happen."
      />

      {/* Several open incidents on one service in a short time usually mean one bigger outage. */}
      {clusters.data && clusters.data.length > 0 && (
        <div className="mb-5 space-y-2">
          {clusters.data.map((c) => (
            <div key={c.serviceId} className="flex flex-col gap-3 rounded-md border border-red-300 border-l-4 border-l-red-600 bg-red-50 px-4 py-3 sm:flex-row sm:items-center dark:border-red-900 dark:border-l-red-500 dark:bg-red-950/30">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">Possible major incident on {c.serviceName}</p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  {c.incidentCount} related open incidents ({c.incidentReferences.join(', ')}), highest priority {c.highestPriority}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => navigate(`/incidents?serviceId=${c.serviceId}`)}>View incidents</Button>
            </div>
          ))}
        </div>
      )}

      <StatRow>
        <Stat label="Open incidents" value={o?.unresolvedIncidents ?? '-'} hint={o && `${o.totalIncidents} in total`} onClick={() => navigate('/incidents')} />
        <Stat label="Critical (P1) open" value={o?.criticalOpenIncidents ?? '-'} tone="danger" onClick={() => navigate('/incidents?priority=P1')} />
        <Stat label="Unassigned" value={unassigned.data?.length ?? '-'} hint={unassigned.data?.length ? 'no technician was free' : 'all have an owner'}
          tone={unassigned.data?.length ? 'warning' : 'default'} onClick={() => navigate('/incidents?status=CLASSIFIED')} />
        <Stat label="SLA compliance" value={o ? `${o.slaCompliancePercent}%` : '-'} hint={o && `${o.slaViolations} breached so far`}
          tone={o && o.slaCompliancePercent < 90 ? 'warning' : 'default'} />
        <Stat label="Average resolution" value={o?.averageResolutionMinutes != null ? formatAverage(o.averageResolutionMinutes) : '-'} hint={o && `${o.resolvedIncidents} resolved`} />
      </StatRow>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="SLA risk" subtitle="Open incidents most likely to miss their deadline (score 0 to 100)"
            action={<Link to="/incidents?slaState=AT_RISK" className="text-xs font-medium text-brand hover:underline">All at risk</Link>} />
          {risks.isLoading ? <ListSkeleton /> : risks.data && risks.data.length > 0 ? (
            <table className="w-full border-t border-line text-sm">
              <tbody className="divide-y divide-line">
                {risks.data.slice(0, 6).map((r) => (
                  <tr key={r.incidentId} onClick={() => navigate(`/incidents/${r.incidentId}`)} className="cursor-pointer hover:bg-surface-2">
                    <td className="w-12 py-2.5 pl-4"><PriorityBadge priority={r.priority} showLabel={false} /></td>
                    <td className="max-w-0 py-2.5 pr-3">
                      <Link to={`/incidents/${r.incidentId}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-fg hover:underline">{r.title}</Link>
                      <p className="truncate text-xs text-muted">{r.reference} · {r.technician ?? 'unassigned'} · {r.reason}</p>
                    </td>
                    <td className={cn('tabular w-16 py-2.5 pr-4 text-right font-mono font-medium',
                      r.riskScore >= 80 ? 'text-red-700 dark:text-red-400' : r.riskScore >= 50 ? 'text-amber-700 dark:text-amber-400' : 'text-fg')}>
                      {r.riskScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="Nothing at risk" message="Every open incident is well within its SLA." />}
        </Card>

        <Card>
          <CardHeader title="Recent activity"
            action={<Link to="/admin/audit" className="text-xs font-medium text-brand hover:underline">Audit log</Link>} />
          {activity.isLoading && <ListSkeleton />}
          <ul className="divide-y divide-line border-t border-line">
            {activity.data?.map((a) => (
              <li key={a.id} className="px-4 py-2">
                <p className="text-sm text-fg">
                  <Link to={`/incidents/${a.incidentId}`} className="font-mono text-xs text-brand hover:underline">{a.incidentReference}</Link>{' '}
                  {EVENT_LABEL[a.action]}
                </p>
                <p className="truncate text-xs text-muted">{a.actor} · {timeAgo(a.timestamp)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Technician workload" subtitle="Active incidents against each technician's limit"
          action={<Link to="/admin/users" className="text-xs font-medium text-brand hover:underline">Manage</Link>} />
        {workload.isLoading ? <ListSkeleton /> : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Technician</th>
                  <th className="px-4 py-2 text-left font-medium">Skills</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Active</th>
                  <th className="px-4 py-2 text-right font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {workload.data?.map((t) => (
                  <tr key={t.technicianId}>
                    <td className="px-4 py-2 font-medium text-fg">{t.fullName}</td>
                    <td className="px-4 py-2 text-xs text-muted">{t.skills.join(', ')}</td>
                    <td className="px-4 py-2 text-xs text-muted">{t.available ? 'Available' : 'Unavailable'}</td>
                    <td className={cn('tabular px-4 py-2 text-right', t.activeIncidents >= t.maxActiveIncidents ? 'font-medium text-red-700 dark:text-red-400' : 'text-fg')}>
                      {t.activeIncidents} / {t.maxActiveIncidents}
                    </td>
                    <td className="tabular px-4 py-2 text-right text-fg">{t.resolvedIncidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {unassigned.data && unassigned.data.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Waiting for a technician" subtitle="Nobody with free capacity was available, so these need a manual assignment." />
          <ul className="divide-y divide-line border-t border-line">
            {unassigned.data.map((i) => (
              <li key={i.id}>
                <Link to={`/incidents/${i.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <PriorityBadge priority={i.priority} showLabel={false} />
                  <span className="flex-1 truncate text-sm text-fg">{i.reference} · {i.title}</span>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {overview.error && <div className="mt-5"><ErrorState error={overview.error} onRetry={overview.refetch} /></div>}
    </div>
  )
}

function ActionRow({ incident, text, to, cta }: { incident: IncidentSummary; text: string; to: string; cta: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{incident.reference} · {incident.title}</span>
          <span className="block text-xs text-muted">{text}</span>
        </span>
        <span className="text-sm font-medium text-brand">{cta}</span>
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
