import { useQuery } from '@tanstack/react-query'
import { Boxes, CheckCircle2, Clock, Flame, Layers, ShieldCheck, Tags, Users } from 'lucide-react'
import { reportApi } from '../api/endpoints'
import { PRIORITIES, STATUS_ORDER, type Priority } from '../api/types'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Avatar, ErrorState, PageHeader, PageLoader, StatCard } from '../components/ui/misc'
import { ChartCard, Columns, HorizontalBars, LegendItem, SEVERITY, useChartColors } from '../components/charts/charts'
import { cn } from '../lib/cn'
import { formatAverage, PRIORITY_LABEL, STATUS_LABEL } from '../lib/format'

const severityColor: Record<Priority, string> = {
  P1: SEVERITY.critical, P2: SEVERITY.serious, P3: SEVERITY.warning, P4: SEVERITY.neutral,
}

/** Management reports: built from ReportService on the backend (Java Streams grouping and counting). */
export function ReportsPage() {
  const colors = useChartColors()
  const overview = useQuery({ queryKey: ['reports', 'overview'], queryFn: reportApi.overview })
  const services = useQuery({ queryKey: ['reports', 'services'], queryFn: reportApi.services })
  const categories = useQuery({ queryKey: ['reports', 'categories'], queryFn: reportApi.categories })
  const workload = useQuery({ queryKey: ['reports', 'workload'], queryFn: reportApi.workload })

  if (overview.isLoading) return <PageLoader />
  if (overview.error || !overview.data) return <ErrorState error={overview.error} onRetry={overview.refetch} />
  const o = overview.data

  const statusData = STATUS_ORDER.map((s) => ({ name: STATUS_LABEL[s], value: o.byStatus[s] ?? 0 }))
  const priorityData = PRIORITIES.map((p) => ({ name: `${p} ${PRIORITY_LABEL[p]}`, value: o.byPriority[p] ?? 0, color: severityColor[p] }))
  const serviceData = (services.data ?? []).map((r) => ({ name: r.name, value: r.open, second: r.total - r.open }))
  const categoryData = (categories.data ?? []).map((r) => ({ name: r.name, value: r.total }))

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Reports" title="Service performance" subtitle="How incidents, SLAs and technicians are doing. Updates live." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
        <Card className="flex items-center gap-5 p-5">
          <ComplianceRing percent={o.slaCompliancePercent} />
          <div>
            <p className="text-xs font-medium text-muted">SLA compliance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-fg">{o.slaCompliancePercent}%</p>
            <p className="mt-1 text-xs text-muted">of resolved incidents met their SLA · {o.slaViolations} breached so far</p>
          </div>
        </Card>
        <StatCard label="Total incidents" value={o.totalIncidents} hint={`${o.unresolvedIncidents} still open`} icon={<Layers className="size-4" />} tone="brand" />
        <StatCard label="Critical open" value={o.criticalOpenIncidents} hint="P1, not yet resolved" icon={<Flame className="size-4" />} tone="danger" />
        <StatCard label="Average resolution" value={o.averageResolutionMinutes != null ? formatAverage(o.averageResolutionMinutes) : '–'} hint={`${o.resolvedIncidents} resolved`} icon={<Clock className="size-4" />} tone="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Incidents by lifecycle stage" subtitle="Where every incident is right now" icon={<CheckCircle2 className="size-4" />}
          rows={statusData} columns={[{ key: 'name', label: 'Stage' }, { key: 'value', label: 'Incidents', align: 'right' }]}>
          <Columns data={statusData} valueName="Incidents" />
        </ChartCard>

        <ChartCard title="Incidents by priority" subtitle="Calculated from impact × urgency × business criticality" icon={<Flame className="size-4" />}
          rows={priorityData} columns={[{ key: 'name', label: 'Priority' }, { key: 'value', label: 'Incidents', align: 'right' }]}>
          <HorizontalBars data={priorityData} valueName="Incidents" />
        </ChartCard>

        <ChartCard title="Incidents per service" subtitle="Which business services cause the most work" icon={<Boxes className="size-4" />}
          legend={<><LegendItem color={colors.series1} label="Open" /><LegendItem color={colors.series2} label="Closed" /></>}
          rows={(services.data ?? []).map((r) => ({ name: r.name, open: r.open, total: r.total, sla: r.slaViolations }))}
          columns={[{ key: 'name', label: 'Service' }, { key: 'open', label: 'Open', align: 'right' }, { key: 'total', label: 'Total', align: 'right' }, { key: 'sla', label: 'SLA violations', align: 'right' }]}>
          <HorizontalBars data={serviceData} valueName="Open" secondName="Closed" />
        </ChartCard>

        <ChartCard title="Incidents per category" subtitle="Set by auto-categorisation or by the reporter" icon={<Tags className="size-4" />}
          rows={(categories.data ?? []).map((r) => ({ name: r.name, total: r.total, open: r.open }))}
          columns={[{ key: 'name', label: 'Category' }, { key: 'open', label: 'Open', align: 'right' }, { key: 'total', label: 'Total', align: 'right' }]}>
          <HorizontalBars data={categoryData} valueName="Incidents" />
        </ChartCard>
      </div>

      <Card className="mt-6">
        <CardHeader title="Technician workload" subtitle="Active incidents against each technician's limit, and incidents resolved" icon={<Users className="size-4" />} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 text-left font-medium">Technician</th>
                  <th className="py-2 pr-4 text-left font-medium">Skills</th>
                  <th className="w-[40%] py-2 pr-4 text-left font-medium">Active / limit</th>
                  <th className="py-2 text-right font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {workload.data?.map((t) => {
                  const ratio = Math.min(1, t.activeIncidents / Math.max(1, t.maxActiveIncidents))
                  return (
                    <tr key={t.technicianId}>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={t.fullName} size="sm" />
                          <span>
                            <span className="block font-medium text-fg">{t.fullName}</span>
                            <span className="block text-xs text-muted">{t.available ? 'Available' : 'Unavailable'}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted">{t.skills.join(', ')}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3" title={`${t.activeIncidents} of ${t.maxActiveIncidents} active`}>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div className={cn('h-full rounded-full', ratio >= 1 ? 'bg-red-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-[#2a78d6] dark:bg-[#3987e5]')} style={{ width: `${ratio * 100}%` }} />
                          </div>
                          <span className="tabular w-10 text-right text-xs font-medium text-fg">{t.activeIncidents}/{t.maxActiveIncidents}</span>
                        </div>
                      </td>
                      <td className="tabular py-3 text-right font-medium text-fg">{t.resolvedIncidents}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ComplianceRing({ percent }: { percent: number }) {
  const r = 30
  const circumference = 2 * Math.PI * r
  const good = percent >= 95
  return (
    <svg viewBox="0 0 72 72" className="size-20 shrink-0 -rotate-90" role="img" aria-label={`SLA compliance ${percent} percent`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={good ? '#0ca30c' : percent >= 80 ? '#fab219' : '#d03b3b'} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
      <foreignObject x="0" y="0" width="72" height="72" className="rotate-90 origin-center">
        <div className="flex size-full items-center justify-center"><ShieldCheck className={cn('size-6', good ? 'text-emerald-600' : 'text-amber-500')} /></div>
      </foreignObject>
    </svg>
  )
}
