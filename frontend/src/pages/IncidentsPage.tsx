import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { adminApi, catalogApi, incidentApi } from '../api/endpoints'
import { PRIORITIES, STATUS_ORDER, type IncidentSummary, type SearchCriteria } from '../api/types'
import { useUser } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { ErrorState, PageHeader, Skeleton } from '../components/ui/misc'
import { IncidentTable } from '../components/incident/IncidentTable'
import { categoryLabel, PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL } from '../lib/format'

const FILTER_KEYS = ['keyword', 'reference', 'status', 'open', 'priority', 'slaState', 'serviceId', 'categoryId', 'technicianId', 'createdFrom', 'createdTo'] as const

/** The browser's time zone, so "reported from 1 Nov" means 1 Nov where the user is */
const TIME_ZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
})()

/**
 * Search and filter incidents with 11 criteria.
 * Filters live in the URL, so a filtered list can be bookmarked or shared.
 * Employees automatically only get their own incidents (enforced by the backend).
 */
export function IncidentsPage() {
  const user = useUser()
  const [params, setParams] = useSearchParams()

  const criteria = useMemo<SearchCriteria>(() => {
    const c: Record<string, string | number | boolean> = {}
    for (const key of FILTER_KEYS) {
      const v = params.get(key)
      if (v) c[key] = key.endsWith('Id') ? Number(v) : key === 'open' ? v === 'true' : v
    }
    if (TIME_ZONE && (c.createdFrom || c.createdTo)) c.timeZone = TIME_ZONE
    return c as SearchCriteria
  }, [params])

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['incidents', 'search', criteria],
    queryFn: () => incidentApi.search(criteria),
    placeholderData: (prev) => prev,
  })
  const services = useQuery({ queryKey: ['catalog', 'services'], queryFn: catalogApi.services })
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: catalogApi.categories })
  const technicians = useQuery({ queryKey: ['admin', 'technicians'], queryFn: adminApi.technicians, enabled: user.role === 'ADMIN' })

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  /** "Open" (anything not resolved yet) is a status choice on screen, but its own filter in the URL */
  const setStatus = (value: string) => {
    const next = new URLSearchParams(params)
    next.delete('status')
    next.delete('open')
    if (value === 'OPEN') next.set('open', 'true')
    else if (value) next.set('status', value)
    setParams(next, { replace: true })
  }
  const active = FILTER_KEYS.filter((k) => params.get(k)).length

  const title = user.role === 'EMPLOYEE' ? 'My incidents' : user.role === 'TECHNICIAN' ? 'Incidents' : 'All incidents'

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={user.role === 'EMPLOYEE' ? 'Everything you have reported' : 'Search across every incident'}
        actions={<Button variant="secondary" disabled={!data?.length} onClick={() => data && exportCsv(data)}>Export CSV</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input aria-label="Keyword" placeholder="Search title and description" defaultValue={params.get('keyword') ?? ''}
              key={params.get('keyword') ?? ''} className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && set('keyword', (e.target as HTMLInputElement).value.trim())}
              onBlur={(e) => e.target.value.trim() !== (params.get('keyword') ?? '') && set('keyword', e.target.value.trim())} />
          </div>
          <Input aria-label="Reference" placeholder="Reference, e.g. INC0003" defaultValue={params.get('reference') ?? ''}
            key={`r${params.get('reference') ?? ''}`}
            onKeyDown={(e) => e.key === 'Enter' && set('reference', (e.target as HTMLInputElement).value.trim())}
            onBlur={(e) => e.target.value.trim() !== (params.get('reference') ?? '') && set('reference', e.target.value.trim())} />
          <Select aria-label="Status" value={params.get('open') === 'true' ? 'OPEN' : params.get('status') ?? ''} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="OPEN">Open (not resolved yet)</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
          <Select aria-label="Priority" value={params.get('priority') ?? ''} onChange={(e) => set('priority', e.target.value)}>
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p} · {PRIORITY_LABEL[p]}</option>)}
          </Select>
          <Select aria-label="SLA" value={params.get('slaState') ?? ''} onChange={(e) => set('slaState', e.target.value)}>
            <option value="">Any SLA state</option>
            {(['ON_TRACK', 'AT_RISK', 'BREACHED', 'MET'] as const).map((s) => <option key={s} value={s}>SLA {SLA_LABEL[s].toLowerCase()}</option>)}
          </Select>
          <Select aria-label="Service" value={params.get('serviceId') ?? ''} onChange={(e) => set('serviceId', e.target.value)}>
            <option value="">Any service</option>
            {services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select aria-label="Category" value={params.get('categoryId') ?? ''} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Any category</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.name)}</option>)}
          </Select>
          {user.role === 'ADMIN' && (
            <Select aria-label="Technician" value={params.get('technicianId') ?? ''} onChange={(e) => set('technicianId', e.target.value)}>
              <option value="">Any technician</option>
              {technicians.data?.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </Select>
          )}
          {user.role === 'TECHNICIAN' && (
            <Select aria-label="Technician" value={params.get('technicianId') ?? ''} onChange={(e) => set('technicianId', e.target.value)}>
              <option value="">Everyone's incidents</option>
              <option value={user.id}>Assigned to me</option>
            </Select>
          )}
          <div className="flex items-center gap-2">
            <Input aria-label="Reported from" type="date" value={params.get('createdFrom') ?? ''} onChange={(e) => set('createdFrom', e.target.value)} />
            <span className="text-faint">–</span>
            <Input aria-label="Reported to" type="date" value={params.get('createdTo') ?? ''} onChange={(e) => set('createdTo', e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            {data ? `${data.length} incident${data.length === 1 ? '' : 's'}` : 'Loading'}
            {active > 0 && ` · ${active} filter${active === 1 ? '' : 's'}`}
            {isFetching && !isLoading && ' · updating'}
          </span>
          {active > 0 && (
            <button onClick={() => setParams({}, { replace: true })} className="font-medium text-brand hover:underline cursor-pointer">
              Clear filters
            </button>
          )}
        </div>
      </Card>

      <Card>
        {error ? <div className="p-5"><ErrorState error={error} onRetry={refetch} /></div>
          : isLoading ? <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            : <IncidentTable incidents={data ?? []} hide={user.role === 'EMPLOYEE' ? ['reporter'] : []}
                emptyTitle={active ? 'No incident matches these filters' : 'No incidents yet'} />}
      </Card>
    </div>
  )
}

/** Downloads the current list as a spreadsheet-friendly CSV file. */
function exportCsv(rows: IncidentSummary[]) {
  const header = ['Reference', 'Title', 'Status', 'Priority', 'SLA', 'Service', 'Category', 'Reporter', 'Technician', 'Created', 'Resolution deadline']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) => [r.reference, r.title, r.status, r.priority, r.slaState, r.service, r.category,
    r.reporter.fullName, r.assignedTechnician?.fullName, r.createdAt, r.resolutionDeadline].map(esc).join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
