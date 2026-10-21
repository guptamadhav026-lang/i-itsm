import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock, Flame, Hourglass, ListChecks, MessageCircleQuestion,
  PlusCircle, Radar, ShieldAlert, Siren, Timer, TrendingUp, UserX,
} from 'lucide-react'
import { useAuth, useUser } from '../auth/AuthContext'
import { adminApi, incidentApi, reportApi, technicianApi } from '../api/endpoints'
import type { IncidentSummary, User } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Toggle } from '../components/ui/Field'
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { IncidentTable } from '../components/incident/IncidentTable'
import { PriorityBadge, StatusBadge } from '../components/incident/badges'
import { SlaTimeLeft } from '../components/incident/SlaCountdown'
import { cn } from '../lib/cn'
import { EVENT_LABEL, formatAverage, timeAgo } from '../lib/format'

const isOpen = (i: IncidentSummary) => !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)

function greeting(name: string) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name.split(' ')[0]}`
}

/** Every role lands here after login, but each sees a dashboard made for its job. */
export function DashboardPage() {
  const user = useUser()
  if (user.role === 'EMPLOYEE') return <EmployeeDashboard user={user} />
  if (user.role === 'TECHNICIAN') return <TechnicianDashboard user={user} />
  return <AdminDashboard user={user} />
}

// =============================================================================== EMPLOYEE

function EmployeeDashboard({ user }: { user: User }) {
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const open = data.filter(isOpen)
  const questions = data.filter((i) => i.awaitingReporterInfo && isOpen(i))
  const toVerify = data.filter((i) => i.status === 'RESOLVED')

  return (
    <div className="animate-in">
      <PageHeader
        title={greeting(user.fullName)}
        subtitle="Report a problem and follow it until it's fixed."
        actions={<Link to="/incidents/new"><Button icon={<PlusCircle className="size-4" />}>Report an incident</Button></Link>}
      />

      <div className="space-y-3">
        {questions.map((i) => (
          <ActionBanner key={`q${i.id}`} tone="amber" icon={<MessageCircleQuestion className="size-5" />} to={`/incidents/${i.id}`}
            title={`${i.assignedTechnician?.fullName ?? 'The technician'} needs more information`}
            message={`${i.reference} · ${i.title}`} cta="Answer" />
        ))}
        {toVerify.map((i) => (
          <ActionBanner key={`v${i.id}`} tone="green" icon={<CheckCircle2 className="size-5" />} to={`/incidents/${i.id}`}
            title="Fixed? Please confirm the resolution" message={`${i.reference} · ${i.title}`} cta="Review" />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={isLoading ? '–' : open.length} icon={<CircleDot className="size-4" />} tone="brand" />
        <StatCard label="Waiting for you" value={isLoading ? '–' : questions.length + toVerify.length} icon={<Hourglass className="size-4" />} tone="warning" />
        <StatCard label="Critical open" value={isLoading ? '–' : open.filter((i) => i.priority === 'P1').length} icon={<Flame className="size-4" />} tone="danger" />
        <StatCard label="Resolved" value={isLoading ? '–' : data.length - open.length} icon={<CheckCircle2 className="size-4" />} tone="success" />
      </div>

      <Card className="mt-6">
        <CardHeader title="My incidents" subtitle="Everything you have reported" icon={<ListChecks className="size-4" />} />
        {error ? <CardBody><ErrorState error={error} onRetry={refetch} /></CardBody>
          : isLoading ? <ListSkeleton />
            : <IncidentTable incidents={data} hide={['reporter']} emptyTitle="You haven't reported anything yet"
                emptyMessage="When something IT-related stops working, report it here." />}
      </Card>
    </div>
  )
}

// =============================================================================== TECHNICIAN

function TechnicianDashboard({ user }: { user: User }) {
  const { refresh } = useAuth()
  const toast = useToast()
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['incidents', 'mine'], queryFn: incidentApi.list })
  const availability = useMutation({
    mutationFn: technicianApi.setAvailability,
    onSuccess: async (u) => {
      await refresh()
      toast.success(u.available ? 'You are available for new incidents' : 'You will not receive new assignments')
    },
    onError: (e) => toast.error('Could not change availability', (e as Error).message),
  })

  const active = data.filter((i) => ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(i.status))
  const toAcknowledge = data.filter((i) => i.status === 'ASSIGNED')
    .sort((a, b) => (a.responseDeadline ?? '').localeCompare(b.responseDeadline ?? ''))
  const max = user.maxActiveIncidents ?? 5
  const load = Math.min(1, active.length / max)

  return (
    <div className="animate-in">
      <PageHeader title={greeting(user.fullName)} subtitle="Your queue, sorted by what needs attention first." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-fg">Availability</p>
              <p className="mt-0.5 text-xs text-muted">{user.available ? 'Receiving new assignments' : 'Not receiving new assignments'}</p>
            </div>
            <Toggle checked={!!user.available} disabled={availability.isPending} onChange={(v) => availability.mutate(v)} label="Available for new incidents" />
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-muted">Workload</span>
              <span className="tabular font-medium text-fg">{active.length} / {max} active</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className={cn('h-full rounded-full transition-all', load >= 1 ? 'bg-red-500' : load >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${load * 100}%` }} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(user.skills ?? []).map((s) => <span key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted ring-1 ring-line">{s}</span>)}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Active" value={isLoading ? '–' : active.length} icon={<Timer className="size-4" />} tone="brand" />
          <StatCard label="To acknowledge" value={isLoading ? '–' : toAcknowledge.length} icon={<Siren className="size-4" />} tone={toAcknowledge.length ? 'danger' : 'default'} />
          <StatCard label="SLA at risk or breached" value={isLoading ? '–' : active.filter((i) => i.slaState !== 'ON_TRACK').length} icon={<AlertTriangle className="size-4" />} tone="warning" />
          <StatCard label="Waiting for reporter" value={isLoading ? '–' : active.filter((i) => i.awaitingReporterInfo).length} icon={<MessageCircleQuestion className="size-4" />} />
        </div>
      </div>

      {toAcknowledge.length > 0 && (
        <Card className="mt-6 border-red-200 dark:border-red-900/60">
          <CardHeader title="Acknowledge these first" subtitle="The response SLA is running: acknowledging stops the clock" icon={<Siren className="size-4 text-red-500" />} />
          <ul className="divide-y divide-line border-t border-line">
            {toAcknowledge.map((i) => (
              <li key={i.id}>
                <Link to={`/incidents/${i.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2">
                  <PriorityBadge priority={i.priority} showLabel={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{i.title}</p>
                    <p className="text-xs text-muted">{i.reference} · {i.service} · reported {timeAgo(i.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-faint">respond within</p>
                    <SlaTimeLeft deadline={i.responseDeadline} done={false} />
                  </div>
                  <ArrowRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="My queue" subtitle="Incidents assigned to you" icon={<ListChecks className="size-4" />} />
        {error ? <CardBody><ErrorState error={error} onRetry={refetch} /></CardBody>
          : isLoading ? <ListSkeleton />
            : <IncidentTable incidents={data} hide={['technician']} emptyTitle="Nothing assigned to you" emptyMessage="New incidents matching your skills will appear here automatically." />}
      </Card>
    </div>
  )
}

// =============================================================================== ADMIN

function AdminDashboard({ user }: { user: User }) {
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
    <div className="animate-in">
      <PageHeader
        eyebrow="Operations"
        title={greeting(user.fullName)}
        subtitle="Live view of every incident, SLA and technician."
        actions={<>
          <Link to="/reports"><Button variant="secondary" icon={<TrendingUp className="size-4" />}>Reports</Button></Link>
          <Link to="/incidents/new"><Button icon={<PlusCircle className="size-4" />}>Report incident</Button></Link>
        </>}
      />

      {/* Major-incident alerts from correlation */}
      {clusters.data && clusters.data.length > 0 && (
        <div className="mb-6 space-y-3">
          {clusters.data.map((c) => (
            <div key={c.serviceId} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:flex-row sm:items-center dark:border-red-900/60 dark:from-red-950/40 dark:to-orange-950/20">
              <span className="pulse-danger flex size-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"><Radar className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">Possible major incident on {c.serviceName}</p>
                <p className="text-sm text-red-800/80 dark:text-red-300/80">
                  {c.incidentCount} related open incidents ({c.incidentReferences.join(', ')}), highest priority {c.highestPriority}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => navigate(`/incidents?serviceId=${c.serviceId}`)}>View incidents</Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Open incidents" value={o?.unresolvedIncidents ?? '–'} hint={o && `${o.totalIncidents} in total`} icon={<CircleDot className="size-4" />} tone="brand" onClick={() => navigate('/incidents')} />
        <StatCard label="Critical (P1) open" value={o?.criticalOpenIncidents ?? '–'} icon={<Flame className="size-4" />} tone="danger" onClick={() => navigate('/incidents?priority=P1')} />
        <StatCard label="Unassigned" value={unassigned.data?.length ?? '–'} hint={unassigned.data?.length ? "waiting for a free technician" : "every incident has an owner"} icon={<UserX className="size-4" />} tone={unassigned.data?.length ? 'warning' : 'default'} onClick={() => navigate('/incidents?status=CLASSIFIED')} />
        <StatCard label="SLA compliance" value={o ? `${o.slaCompliancePercent}%` : '–'} hint={o && `resolved on time · ${o.slaViolations} breached so far`} icon={<ShieldAlert className="size-4" />} tone={o && o.slaCompliancePercent < 90 ? 'warning' : 'success'} />
        <StatCard label="Avg. resolution" value={o?.averageResolutionMinutes != null ? formatAverage(o.averageResolutionMinutes) : '–'} hint={o && `${o.resolvedIncidents} resolved`} icon={<Clock className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="SLA risk" subtitle="Open incidents most likely to miss their deadline" icon={<AlertTriangle className="size-4" />}
            action={<Link to="/incidents?slaState=AT_RISK" className="text-xs font-medium text-brand hover:underline">See at risk</Link>} />
          {risks.isLoading ? <ListSkeleton /> : risks.data && risks.data.length > 0 ? (
            <ul className="divide-y divide-line border-t border-line">
              {risks.data.slice(0, 6).map((r) => (
                <li key={r.incidentId}>
                  <Link to={`/incidents/${r.incidentId}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 hover:bg-surface-2">
                    <PriorityBadge priority={r.priority} showLabel={false} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{r.title}</p>
                      <p className="truncate text-xs text-muted">{r.reference} · {r.technician ?? 'unassigned'} · {r.reason}</p>
                    </div>
                    <div className="w-28">
                      <div className="flex justify-between text-[11px]"><span className="text-faint">risk</span><span className="tabular font-semibold text-fg">{r.riskScore}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className={cn('h-full rounded-full', r.riskScore >= 80 ? 'bg-red-500' : r.riskScore >= 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${r.riskScore}%` }} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={<CheckCircle2 className="size-5" />} title="No incident is at risk" message="Every open incident is comfortably within its SLA." />}
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Updates live" icon={<ListChecks className="size-4" />}
            action={<Link to="/admin/audit" className="text-xs font-medium text-brand hover:underline">Audit log</Link>} />
          <ul className="space-y-0 px-5 pb-4">
            {activity.isLoading && <ListSkeleton />}
            {activity.data?.map((a) => (
              <li key={a.id} className="relative flex gap-3 pb-3 pl-4 before:absolute before:left-[3px] before:top-2 before:h-full before:w-px before:bg-line last:before:hidden">
                <span className="absolute left-0 top-1.5 size-[7px] rounded-full bg-brand ring-2 ring-surface" />
                <div className="min-w-0">
                  <p className="text-sm text-fg">
                    <Link to={`/incidents/${a.incidentId}`} className="font-mono text-xs text-brand hover:underline">{a.incidentReference}</Link>{' '}
                    <span className="font-medium">{EVENT_LABEL[a.action]}</span>
                  </p>
                  <p className="truncate text-xs text-muted">{a.actor} · {timeAgo(a.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Technician workload" subtitle="Active incidents compared with each technician's limit" icon={<TrendingUp className="size-4" />}
          action={<Link to="/admin/users" className="text-xs font-medium text-brand hover:underline">Manage</Link>} />
        <CardBody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workload.isLoading && <Skeleton className="h-16" />}
          {workload.data?.map((t) => {
            const ratio = Math.min(1, t.activeIncidents / Math.max(1, t.maxActiveIncidents))
            return (
              <div key={t.technicianId} className="rounded-lg border border-line p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={t.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{t.fullName}</p>
                    <p className="truncate text-[11px] text-muted">{t.skills.join(' · ')}</p>
                  </div>
                  <span className={cn('size-2 rounded-full', t.available ? 'bg-emerald-500' : 'bg-slate-400')} title={t.available ? 'Available' : 'Unavailable'} />
                </div>
                <div className="mt-3 flex justify-between text-xs"><span className="text-muted">{t.resolvedIncidents} resolved</span><span className="tabular font-medium text-fg">{t.activeIncidents}/{t.maxActiveIncidents}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn('h-full rounded-full', ratio >= 1 ? 'bg-red-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${ratio * 100}%` }} />
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      {unassigned.data && unassigned.data.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Waiting for a technician" subtitle="Nobody with free capacity was available; assign them manually" icon={<UserX className="size-4" />} />
          <ul className="divide-y divide-line border-t border-line">
            {unassigned.data.map((i) => (
              <li key={i.id}>
                <Link to={`/incidents/${i.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <PriorityBadge priority={i.priority} showLabel={false} />
                  <span className="flex-1 truncate text-sm text-fg">{i.reference} · {i.title}</span>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {overview.error && <div className="mt-6"><ErrorState error={overview.error} onRetry={overview.refetch} /></div>}
    </div>
  )
}

// =============================================================================== shared bits

function ActionBanner({ tone, icon, title, message, to, cta }: {
  tone: 'amber' | 'green'; icon: ReactNode; title: string; message: string; to: string; cta: string
}) {
  const styles = tone === 'amber'
    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
  return (
    <Link to={to} className={cn('flex items-center gap-3 rounded-xl border p-4 transition hover:shadow-sm', styles)}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-sm opacity-80">{message}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-medium">{cta} <ArrowRight className="size-4" /></span>
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3 px-5 pb-5">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
    </div>
  )
}
