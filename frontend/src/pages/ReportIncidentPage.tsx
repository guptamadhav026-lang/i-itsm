import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BrainCircuit, CheckCircle2, Copy, Sparkles, Tag, Timer, UserCheck, Users, Wand2 } from 'lucide-react'
import { catalogApi, incidentApi } from '../api/endpoints'
import { ApiError } from '../api/client'
import { LEVELS, type IncidentDetail, type Level, type Priority } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Segmented, Select, Textarea } from '../components/ui/Field'
import { PageHeader } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { PriorityBadge } from '../components/incident/badges'
import { formatDateTime, formatMinutes, LEVEL_LABEL, PRIORITY_LABEL } from '../lib/format'

const levelWeight: Record<Level, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
const levelTone: Record<Level, string> = {
  LOW: '!text-sky-700 dark:!text-sky-300',
  MEDIUM: '!text-amber-700 dark:!text-amber-300',
  HIGH: '!text-orange-700 dark:!text-orange-300',
  CRITICAL: '!text-red-700 dark:!text-red-300',
}

/** Same formula as WeightedPriorityStrategy on the backend, used only to preview the result while typing. */
export function estimatePriority(impact: Level, urgency: Level, criticality: number, users: number): { score: number; priority: Priority } {
  const factor = users >= 100 ? 1.5 : users >= 20 ? 1.25 : users >= 5 ? 1.1 : 1
  const score = levelWeight[impact] * levelWeight[urgency] * criticality * factor
  const priority: Priority = score >= 40 ? 'P1' : score >= 20 ? 'P2' : score >= 8 ? 'P3' : 'P4'
  return { score, priority }
}

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

  const service = services.data?.find((s) => String(s.id) === serviceId)
  const estimate = useMemo(
    () => service ? estimatePriority(impact, urgency, service.businessCriticality, affectedUsers || 1) : null,
    [service, impact, urgency, affectedUsers],
  )

  const create = useMutation({
    mutationFn: incidentApi.create,
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setCreated(incident)
      toast.success(`${incident.reference} reported`, `Priority ${incident.priority}${incident.assignedTechnician ? `, assigned to ${incident.assignedTechnician.fullName}` : ''}`)
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fieldErrors)
      toast.error('Could not report the incident', (e as Error).message)
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
  return (
    <div className="animate-in">
      <PageHeader eyebrow="New incident" title="Report an incident" subtitle="Describe what's wrong. The system takes care of priority, SLA and assignment." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
            <Field label="What's the problem?" htmlFor="title" error={errors.title} required hint="A short summary, e.g. 'VPN keeps disconnecting'">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={150} placeholder="Payment application unavailable" />
            </Field>
            <Field label="Details" htmlFor="description" error={errors.description} required hint="What were you doing, what did you see, since when?">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} maxLength={4000} placeholder="Every payment fails with a timeout error since 10:00…" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Affected service" htmlFor="service" error={errors.serviceId} required>
                <Select id="service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                  <option value="" disabled>Choose a service…</option>
                  {services.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Category" htmlFor="category" hint={categoryId ? undefined : 'Leave on automatic and the system picks one'}>
                <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">✨ Automatic{suggested ? ` (${suggested.categoryName})` : ''}</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Impact" hint="How much of the business is affected?">
                <Segmented name="Impact" value={impact} onChange={setImpact}
                  options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l], tone: levelTone[l] }))} />
              </Field>
              <Field label="Urgency" hint="How quickly does it need fixing?">
                <Segmented name="Urgency" value={urgency} onChange={setUrgency}
                  options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l], tone: levelTone[l] }))} />
              </Field>
            </div>

            <Field label="How many people are affected?" htmlFor="users" error={errors.affectedUsers}>
              <div className="flex items-center gap-3">
                <Input id="users" type="number" min={1} max={1000000} value={affectedUsers}
                  onChange={(e) => setAffectedUsers(Math.max(1, Number(e.target.value) || 1))} className="w-32" />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 20, 100, 500].map((n) => (
                    <button key={n} type="button" onClick={() => setAffectedUsers(n)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-fg cursor-pointer">
                      {n === 1 ? 'Just me' : `${n}+`}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-5">
              <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" size="lg" loading={create.isPending} icon={<ArrowRight className="size-4" />}>Submit incident</Button>
            </div>
          </form>
        </Card>

        {/* Live preview of what the system will do */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="What the system will do" icon={<BrainCircuit className="size-4" />} subtitle="Updated as you type" />
            <CardBody className="space-y-4">
              <PreviewRow icon={<Tag className="size-4" />} label="Category">
                {categoryId
                  ? <span className="font-medium text-fg">{categories.data?.find((c) => String(c.id) === categoryId)?.name}</span>
                  : suggested
                    ? <span><span className="font-medium text-fg">{suggested.categoryName}</span><span className="block text-xs text-muted">matched: {suggested.matchedKeywords.join(', ')}</span></span>
                    : <span className="text-faint">Type a few words…</span>}
              </PreviewRow>
              <PreviewRow icon={<Sparkles className="size-4" />} label="Priority (estimate)">
                {estimate ? (
                  <span>
                    <PriorityBadge priority={estimate.priority} />
                    <span className="mt-1 block font-mono text-[11px] text-muted">
                      {levelWeight[impact]} × {levelWeight[urgency]} × {service!.businessCriticality} × users = {estimate.score.toFixed(1)}
                    </span>
                  </span>
                ) : <span className="text-faint">Choose a service</span>}
              </PreviewRow>
              <PreviewRow icon={<Timer className="size-4" />} label="SLA">
                {estimate ? <span className="text-fg">{slaText(estimate.priority)}</span> : <span className="text-faint">—</span>}
              </PreviewRow>
              <PreviewRow icon={<UserCheck className="size-4" />} label="Assignment">
                <span className="text-muted">Best available technician with matching skills</span>
              </PreviewRow>
            </CardBody>
          </Card>
          <p className="px-1 text-xs text-faint">
            <Wand2 className="mr-1 inline size-3" />The final priority is calculated on the server with the strategy the administrator selected.
          </p>
        </div>
      </div>
    </div>
  )
}

const defaultSla: Record<Priority, [number, number]> = { P1: [5, 30], P2: [15, 120], P3: [60, 480], P4: [240, 1440] }
function slaText(p: Priority) {
  const [r, f] = defaultSla[p]
  return `Respond within ${formatMinutes(r)}, resolve within ${formatMinutes(f)}`
}

function PreviewRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-faint">{icon}</span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}

/** Shown right after submitting: what the system decided, step by step (great for the demo video). */
function ReportedSummary({ incident, onAnother }: { incident: IncidentDetail; onAnother: () => void }) {
  const steps = [
    { icon: <Tag className="size-4" />, title: 'Classified', text: incident.category?.name ?? '—' },
    {
      icon: <Sparkles className="size-4" />, title: `Priority ${incident.priority} · ${incident.priority ? PRIORITY_LABEL[incident.priority] : ''}`,
      text: incident.priorityExplanation ?? '',
    },
    {
      icon: <Timer className="size-4" />, title: 'SLA started',
      text: `Respond by ${formatDateTime(incident.responseDeadline)}, resolve by ${formatDateTime(incident.resolutionDeadline)}`,
    },
    {
      icon: <Users className="size-4" />, title: incident.assignedTechnician ? `Assigned to ${incident.assignedTechnician.fullName}` : 'Waiting for a technician',
      text: incident.assignedTechnician ? 'They have been notified and the SLA clock is running.' : 'No technician with free capacity right now; an administrator will assign it.',
    },
  ]
  return (
    <div className="animate-in mx-auto max-w-2xl">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-white">
          <CheckCircle2 className="size-10" />
          <h1 className="mt-3 text-2xl font-semibold">Incident {incident.reference} reported</h1>
          <p className="mt-1 text-emerald-50/90">{incident.title}</p>
        </div>
        <ol className="space-y-5 p-6">
          {steps.map((s, i) => (
            <li key={i} className="animate-in flex gap-4" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{s.icon}</span>
              <div>
                <p className="text-sm font-semibold text-fg">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
          {incident.potentialDuplicateOf && (
            <li className="flex gap-4 rounded-xl bg-violet-50 p-4 dark:bg-violet-950/30">
              <Copy className="size-5 shrink-0 text-violet-600" />
              <p className="text-sm text-violet-900 dark:text-violet-200">
                This looks like <b>{incident.potentialDuplicateOf}</b>, which is already open. The team has been told so they can handle both together.
              </p>
            </li>
          )}
        </ol>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">
          <Button variant="secondary" onClick={onAnother}>Report another</Button>
          <Link to={`/incidents/${incident.id}`}><Button icon={<ArrowRight className="size-4" />}>Track this incident</Button></Link>
        </div>
      </Card>
    </div>
  )
}
