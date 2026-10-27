import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi, incidentApi } from '../api/endpoints'
import { ApiError, errorText } from '../api/client'
import { LEVELS, type IncidentDetail, type Level, type SlaPolicy } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Segmented, Select, Textarea } from '../components/ui/Field'
import { PageHeader } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { PriorityBadge } from '../components/incident/badges'
import { useServiceStatus } from '../components/incident/ServiceStatus'
import { categoryLabel, formatDateTime, formatMinutes, LEVEL_LABEL, PRIORITY_LABEL } from '../lib/format'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

export function ReportIncidentPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const services = useQuery({ queryKey: ['catalog', 'services'], queryFn: catalogApi.services })
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: catalogApi.categories })
  const serviceStatus = useServiceStatus()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [impact, setImpact] = useState<Level>('MEDIUM')
  const [urgency, setUrgency] = useState<Level>('MEDIUM')
  const [affectedUsers, setAffectedUsers] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<IncidentDetail | null>(null)

  // Live category suggestion while the user types (intelligent feature F)
  const text = useDebounced(`${title} ${description}`.trim(), 400)
  const suggestion = useQuery({
    queryKey: ['suggest-category', text],
    queryFn: () => catalogApi.suggestCategory(text),
    enabled: text.length >= 4,
    staleTime: 60_000,
  })

  const sla = useQuery({
    queryKey: ['catalog', 'sla', serviceId],
    queryFn: () => catalogApi.serviceSla(Number(serviceId)),
    enabled: !!serviceId,
  })
  // Asks the server, so the preview uses whichever priority strategy the administrator selected
  const users = useDebounced(affectedUsers || 1, 300)
  const preview = useQuery({
    queryKey: ['priority-preview', serviceId, impact, urgency, users],
    queryFn: () => incidentApi.previewPriority(Number(serviceId), impact, urgency, users),
    enabled: !!serviceId,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })
  const estimate = serviceId ? preview.data : undefined

  const create = useMutation({
    mutationFn: incidentApi.create,
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setCreated(incident)
      toast.success(`${incident.reference} reported`, `Priority ${incident.priority}${incident.assignedTechnician ? `, assigned to ${incident.assignedTechnician.fullName}` : ''}`)
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fieldErrors)
      toast.error('Could not report the incident', errorText(e))
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    create.mutate({
      title: title.trim(),
      description: description.trim(),
      serviceId: Number(serviceId),
      categoryId: categoryId ? Number(categoryId) : null,
      impact,
      urgency,
      affectedUsers,
    })
  }

  if (created) return <ReportedSummary incident={created} onAnother={() => { setCreated(null); setTitle(''); setDescription(''); setCategoryId('') }} />

  const suggested = suggestion.data
  const known = serviceStatus.data?.find((x) => String(x.serviceId) === serviceId)
  return (
    <div>
      <PageHeader title="Report an incident" subtitle="Describe the problem. Priority, SLA deadlines and the technician are worked out after you submit." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
            <Field label="What's the problem?" htmlFor="title" error={errors.title} required hint="A short summary, e.g. 'VPN keeps disconnecting'">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={150} placeholder="Payment application unavailable" />
            </Field>
            <Field label="Details" htmlFor="description" error={errors.description} required hint="What were you doing, what did you see, since when?">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} maxLength={4000} placeholder="Every payment fails with a timeout error since 10:00" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Affected service" htmlFor="service" error={errors.serviceId} required>
                <Select id="service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                  <option value="" disabled>Choose a service</option>
                  {services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Category" htmlFor="category" hint={categoryId ? undefined : 'Leave on Automatic to have it picked from your text'}>
                <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Automatic{suggested ? ` (${categoryLabel(suggested.categoryName)})` : text.length >= 4 && suggestion.isSuccess ? ' (no match yet)' : ''}</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.name)}</option>)}
                </Select>
              </Field>
            </div>

            {known && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {known.serviceName} already has {known.openIncidents} open {known.openIncidents === 1 ? 'incident' : 'incidents'}
                {known.highestPriority && ` (highest ${known.highestPriority})`}. If yours is the same problem, it is already being worked on.
                A new report is still fine if it is something different.
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Impact" hint="How much of the business is affected?">
                <Segmented name="Impact" value={impact} onChange={setImpact}
                  options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
              </Field>
              <Field label="Urgency" hint="How quickly does it need fixing?">
                <Segmented name="Urgency" value={urgency} onChange={setUrgency}
                  options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
              </Field>
            </div>

            <Field label="How many people are affected?" htmlFor="users" error={errors.affectedUsers}>
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <Input id="users" type="number" min={1} max={1000000} value={affectedUsers}
                    onChange={(e) => setAffectedUsers(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 20, 100, 500].map((n) => (
                    <button key={n} type="button" onClick={() => setAffectedUsers(n)}
                      className="rounded border border-line-strong px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg cursor-pointer">
                      {n === 1 ? 'Just me' : `${n}+`}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-5">
              <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={create.isPending}>Submit incident</Button>
            </div>
          </form>
        </Card>

        {/* Preview only: the server recalculates everything when the form is submitted */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="Preview" subtitle="Updates while you fill in the form" />
            <CardBody className="space-y-4">
              <PreviewRow label="Category">
                {categoryId
                  ? <span className="font-medium text-fg">{categoryLabel(categories.data?.find((c) => String(c.id) === categoryId)?.name)}</span>
                  : suggested
                    ? <span><span className="font-medium text-fg">{categoryLabel(suggested.categoryName)}</span>
                        <span className="block text-xs text-muted">
                          {suggested.matchedKeywords.length ? `matched: ${suggested.matchedKeywords.join(', ')}` : `chosen by ${suggested.source}`}
                        </span></span>
                    : text.length >= 4 && suggestion.isSuccess
                      ? <span className="text-muted">No keyword matched yet. A technician can set the category later.</span>
                      : <span className="text-faint">Type a few words first</span>}
              </PreviewRow>
              <PreviewRow label="Priority">
                {estimate ? (
                  <span>
                    <PriorityBadge priority={estimate.priority} />
                    <span className="mt-1 block font-mono text-[11px] leading-relaxed text-muted">{estimate.explanation}</span>
                  </span>
                ) : preview.isError ? <span className="text-muted">Worked out when you submit</span>
                  : <span className="text-faint">Choose a service</span>}
              </PreviewRow>
              <PreviewRow label="SLA">
                {estimate ? <span className="text-fg">{slaText(sla.data?.find((p) => p.priority === estimate.priority))}</span> : <span className="text-faint">-</span>}
              </PreviewRow>
              <PreviewRow label="Assignment">
                <span className="text-muted">Chosen by the active assignment strategy (skills, workload, experience)</span>
              </PreviewRow>
            </CardBody>
          </Card>
          <p className="px-1 text-xs text-faint">
            Worked out with the priority strategy the administrator selected. It is calculated again when you submit, and a technician can re-assess it later.
          </p>
        </div>
      </div>
    </div>
  )
}

function slaText(policy: SlaPolicy | undefined) {
  if (!policy) return '...'
  const text = `Respond within ${formatMinutes(policy.responseMinutes)}, resolve within ${formatMinutes(policy.resolutionMinutes)}`
  return policy.serviceName ? `${text} (this service's own targets)` : text
}

function PreviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

/** Shown right after submitting: what the server decided for the new incident. */
function ReportedSummary({ incident, onAnother }: { incident: IncidentDetail; onAnother: () => void }) {
  const rows: [string, ReactNode][] = [
    ['Category', incident.category ? categoryLabel(incident.category.name) : '-'],
    ['Priority', <>
      {incident.priority ? `${incident.priority} (${PRIORITY_LABEL[incident.priority]})` : '-'}
      {incident.priorityExplanation && <span className="mt-0.5 block font-mono text-[11px] text-muted">{incident.priorityExplanation}</span>}
    </>],
    ['Respond by', formatDateTime(incident.responseDeadline)],
    ['Resolve by', formatDateTime(incident.resolutionDeadline)],
    ['Technician', incident.assignedTechnician
      ? `${incident.assignedTechnician.fullName} (notified)`
      : 'Not assigned yet. It is offered to a free technician again every minute, and an administrator can also assign it.'],
  ]
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <div className="border-b border-line border-l-4 border-l-emerald-600 px-5 py-4">
          <p className="text-sm text-muted">Incident reported</p>
          <h1 className="mt-0.5 text-lg font-semibold text-fg">{incident.reference}: {incident.title}</h1>
        </div>
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[130px_1fr] gap-3 px-5 py-2.5 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        {incident.potentialDuplicateOf && (
          <p className="border-t border-line bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            This looks like <b>{incident.potentialDuplicateOf}</b>, which is already open. The technician will see that the two are linked.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
          <Button variant="secondary" onClick={onAnother}>Report another</Button>
          <Link to={`/incidents/${incident.id}`}><Button>Open incident</Button></Link>
        </div>
      </Card>
    </div>
  )
}
