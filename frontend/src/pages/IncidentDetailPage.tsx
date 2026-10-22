import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { incidentApi } from '../api/endpoints'
import { ApiError } from '../api/client'
import { LEVELS, type IncidentDetail, type Level } from '../api/types'
import { useUser } from '../auth/AuthContext'
import { availableActions, type IncidentAction } from '../lib/permissions'
import { categoryLabel, formatDateTime, LEVEL_LABEL, timeAgo } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Segmented, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Avatar, EmptyState, ErrorState, PageLoader, Tabs } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { AwaitingInfoBadge, DuplicateBadge, EscalationBadge, PriorityBadge, SlaBadge, StatusBadge } from '../components/incident/badges'
import { LifecycleStepper } from '../components/incident/LifecycleStepper'
import { SlaCountdown } from '../components/incident/SlaCountdown'
import { AuditTimeline, NotesTimeline } from '../components/incident/Timelines'
import { RecommendedTechnicians, SimilarIncidentsPanel } from '../components/incident/SmartPanels'
import { FeedbackForm, Stars } from '../components/incident/Feedback'

type ModalKind = 'resolve' | 'requestInfo' | 'reopen' | 'reassess' | 'assign' | null
type TabKey = 'activity' | 'history' | 'assist'

export function IncidentDetailPage() {
  const id = Number(useParams().id)
  const user = useUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalKind>(null)
  const [tab, setTab] = useState<TabKey>('activity')
  const [resolutionDraft, setResolutionDraft] = useState('')

  const { data: incident, isLoading, error, refetch } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentApi.get(id),
    enabled: Number.isFinite(id),
  })
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => incidentApi.audit(id), enabled: tab === 'history' })

  /** Runs one lifecycle action, updates the page with the server's answer and shows a toast. */
  const action = useMutation({
    mutationFn: async ({ run }: { run: () => Promise<IncidentDetail>; success: string }) => run(),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData(['incident', id], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['audit', id] })
      queryClient.invalidateQueries({ queryKey: ['incident', id, 'recommended'] })
      setModal(null)
      toast.success(vars.success)
    },
    onError: (e) => toast.error('Action failed', (e as Error).message),
  })
  const run = (success: string, fn: () => Promise<IncidentDetail>) => action.mutate({ run: fn, success })
  const busy = action.isPending

  if (isLoading) return <PageLoader />
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    const reference = `INC${String(id).padStart(4, '0')}`
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          title={error.status === 403 ? `You can't open ${reference}` : `There is no incident ${reference}`}
          message={error.status === 403
            ? 'Employees only see the incidents they reported, and technicians the ones assigned to them.'
            : 'It may have been typed wrong. Search the list to find the one you need.'}
          action={<Link to="/incidents"><Button variant="secondary">Go to incidents</Button></Link>}
        />
      </Card>
    )
  }
  if (error || !incident) return <ErrorState error={error ?? new Error('Not found')} onRetry={refetch} />

  const actions = availableActions(incident, user)
  const can = (a: IncidentAction) => actions.includes(a)
  const isWorker = user.role !== 'EMPLOYEE'
  const finished = ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(incident.status)

  return (
    <div>
      <Link to="/incidents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Incidents
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="font-mono text-fg">{incident.reference}</span>
            <span className="text-faint">/</span>
            <span>{incident.service.name}</span>
            {incident.category && <><span className="text-faint">/</span><span>{categoryLabel(incident.category.name)}</span></>}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-fg">{incident.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} />
            <SlaBadge state={incident.slaState} />
            <EscalationBadge level={incident.escalationLevel} />
            {incident.potentialDuplicateOf && <DuplicateBadge />}
            {incident.awaitingReporterInfo && <AwaitingInfoBadge />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {can('acknowledge') && <Button loading={busy} onClick={() => run('Acknowledged: the response SLA is met', () => incidentApi.acknowledge(id))}>Acknowledge</Button>}
          {can('start') && <Button loading={busy} onClick={() => run('Investigation started', () => incidentApi.start(id))}>Start investigation</Button>}
          {can('requestInfo') && <Button variant="secondary" onClick={() => setModal('requestInfo')}>Ask reporter</Button>}
          {can('resolve') && <Button variant="success" onClick={() => setModal('resolve')}>Resolve</Button>}
          {can('verify') && <Button variant="success" loading={busy} onClick={() => run('Resolution confirmed', () => incidentApi.verify(id))}>Yes, it's fixed</Button>}
          {can('reopen') && <Button variant="secondary" onClick={() => setModal('reopen')}>Still broken</Button>}
          {can('close') && <Button loading={busy} onClick={() => run('Incident closed', () => incidentApi.close(id))}>Close incident</Button>}
          {can('assign') && <Button variant="secondary" onClick={() => setModal('assign')}>{incident.assignedTechnician ? 'Reassign' : 'Assign'}</Button>}
          {can('reassess') && <Button variant="ghost" onClick={() => setModal('reassess')}>Re-assess</Button>}
        </div>
      </div>

      {incident.awaitingReporterInfo && can('provideInfo') && (
        <InfoRequestBanner incident={incident} loading={busy}
          onSend={(text) => run('Reply sent to the technician', () => incidentApi.provideInfo(id, text))} />
      )}
      {incident.potentialDuplicateOf && (
        <div className="mt-4 rounded-md border border-line border-l-4 border-l-slate-400 bg-surface px-4 py-3 text-sm text-fg">
          This may be the same problem as{' '}
          {incident.potentialDuplicateOfId && isWorker
            ? <Link to={`/incidents/${incident.potentialDuplicateOfId}`} className="font-medium text-brand hover:underline">{incident.potentialDuplicateOf}</Link>
            : <b>{incident.potentialDuplicateOf}</b>}
          , which is already open. It was spotted automatically from the wording.
        </div>
      )}

      <Card className="mt-5 px-5 pb-3.5 pt-4">
        <LifecycleStepper status={incident.status} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Description" subtitle={`Reported by ${incident.reporter.fullName} · ${formatDateTime(incident.createdAt)}`} />
            <CardBody><p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{incident.description}</p></CardBody>
          </Card>

          {incident.resolution && (
            <Card className="border-emerald-200 dark:border-emerald-900/60">
              <CardHeader title="Resolution"
                subtitle={`${incident.assignedTechnician?.fullName ?? 'Technician'} · ${formatDateTime(incident.resolvedAt)}`} />
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-fg">{incident.resolution}</p>
                {incident.status === 'RESOLVED' && can('verify') && (
                  <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Does it work now? Confirm with <b>Yes, it's fixed</b>, or choose <b>Still broken</b> to send it back.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <div className="px-5 pt-2">
              <Tabs<TabKey>
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'activity', label: 'Activity', count: incident.notes.length },
                  { value: 'history', label: 'History' },
                  ...(isWorker ? [{ value: 'assist' as TabKey, label: 'Similar incidents' }] : []),
                ]}
              />
            </div>
            <CardBody className="pt-5">
              {tab === 'activity' && (
                <div className="space-y-6">
                  <NotesTimeline notes={incident.notes} />
                  {can('comment') && (
                    <Composer
                      canInvestigate={can('addNote')}
                      canAsk={can('requestInfo')}
                      canAnswer={can('provideInfo')}
                      loading={busy}
                      onSend={(kind, text) => {
                        if (kind === 'note') run('Note added', () => incidentApi.addNote(id, text))
                        else if (kind === 'ask') run('Question sent to the reporter', () => incidentApi.requestInfo(id, text))
                        else if (kind === 'answer') run('Reply sent', () => incidentApi.provideInfo(id, text))
                        else run('Comment added', () => incidentApi.comment(id, text))
                      }}
                    />
                  )}
                </div>
              )}
              {tab === 'history' && (audit.isLoading ? <PageLoader /> : <AuditTimeline records={audit.data ?? []} />)}
              {tab === 'assist' && (
                <SimilarIncidentsPanel
                  incidentId={id}
                  showResolutions={!finished}
                  onUseResolution={can('resolve') ? (text) => { setResolutionDraft(text); setModal('resolve') } : undefined}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Service level (SLA)" subtitle={incident.priority ? `${incident.priority} targets` : undefined} />
            <CardBody className="space-y-4">
              <SlaCountdown label="Response (acknowledge)" start={incident.createdAt} deadline={incident.responseDeadline}
                stoppedAt={incident.acknowledgedAt} breached={incident.responseBreached} />
              <SlaCountdown label="Resolution" start={incident.createdAt} deadline={incident.resolutionDeadline}
                stoppedAt={incident.resolvedAt} breached={incident.resolutionBreached} />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                <dt className="text-muted">Respond by</dt><dd className="text-right text-fg">{formatDateTime(incident.responseDeadline)}</dd>
                <dt className="text-muted">Resolve by</dt><dd className="text-right text-fg">{formatDateTime(incident.resolutionDeadline)}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="People" />
            <CardBody className="space-y-3">
              <Person label="Reported by" name={incident.reporter.fullName} sub={incident.reporter.username} />
              {incident.assignedTechnician
                ? <Person label="Assigned technician" name={incident.assignedTechnician.fullName} sub={incident.assignedAt ? `since ${timeAgo(incident.assignedAt)}` : undefined} />
                : <div className="rounded border border-dashed border-line px-3 py-3 text-sm text-muted">No technician assigned yet</div>}
              {can('assign') && (
                <Button variant="secondary" size="sm" className="w-full" onClick={() => setModal('assign')}>
                  See recommended technicians
                </Button>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <Detail label="Service">{incident.service.name} <span className="text-xs text-faint">(criticality {incident.service.businessCriticality}/5)</span></Detail>
                <Detail label="Category">{categoryLabel(incident.category?.name)}</Detail>
                <Detail label="Impact">{LEVEL_LABEL[incident.impact]}</Detail>
                <Detail label="Urgency">{LEVEL_LABEL[incident.urgency]}</Detail>
                <Detail label="Affected users">{incident.affectedUsers.toLocaleString()}</Detail>
              </dl>
              {incident.priorityExplanation && (
                <div className="mt-4 rounded bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted">How the priority was calculated</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-fg">{incident.priorityExplanation}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {(can('feedback') || incident.feedbackRating != null) && (
            <Card>
              <CardHeader title={incident.reporter.id === user.id ? 'Your feedback' : "Reporter's feedback"}
                subtitle={incident.feedbackRating == null ? 'How happy are you with the fix?' : undefined} />
              <CardBody>
                {incident.feedbackRating != null ? (
                  <div>
                    <Stars value={incident.feedbackRating} size="sm" />
                    {incident.feedbackComment && <p className="mt-2 text-sm text-muted">"{incident.feedbackComment}"</p>}
                  </div>
                ) : (
                  <FeedbackForm loading={busy} onSubmit={(rating, comment) => run('Feedback saved', () => incidentApi.feedback(id, rating, comment))} />
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <TextModal
        open={modal === 'resolve'} onClose={() => setModal(null)} title="Resolve incident"
        description="Describe what you did. The reporter will be asked to confirm the fix." label="Resolution" confirm="Mark as resolved"
        initial={resolutionDraft} loading={busy}
        onConfirm={(text) => run('Resolved: the reporter has been notified', () => incidentApi.resolve(id, text))}
      />
      <TextModal
        open={modal === 'requestInfo'} onClose={() => setModal(null)} title="Ask the reporter"
        description="The reporter gets a notification and can answer on this page." label="Your question" confirm="Send question"
        loading={busy} onConfirm={(text) => run('Question sent to the reporter', () => incidentApi.requestInfo(id, text))}
      />
      <TextModal
        open={modal === 'reopen'} onClose={() => setModal(null)} title="Reopen incident"
        description="Tell the technician what is still not working. The incident goes back to In progress." label="What's still wrong?" confirm="Reopen"
        loading={busy} onConfirm={(text) => run('Reopened: the technician has been notified', () => incidentApi.reopen(id, text))}
      />
      <ReassessModal
        open={modal === 'reassess'} onClose={() => setModal(null)} incident={incident} loading={busy}
        onConfirm={(impact, urgency, users) => run('Priority recalculated', () => incidentApi.reassess(id, impact, urgency, users))}
      />
      <Modal open={modal === 'assign'} onClose={() => setModal(null)} size="lg" title="Assign a technician"
        description="Ranked by the SMART strategy: skills, experience, past work on this service and current workload.">
        <RecommendedTechnicians
          incidentId={id}
          currentId={incident.assignedTechnician?.id ?? null}
          assigning={busy ? -1 : null}
          onAssign={(t) => run(`Assigned to ${t.fullName}`, () => incidentApi.assign(id, t.technicianId))}
        />
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button variant="secondary" loading={busy}
            onClick={() => run('Assigned automatically', () => incidentApi.autoAssign(id))}>
            Use active assignment strategy
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Person({ label, name, sub }: { label: string; name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{name}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  )
}

function InfoRequestBanner({ incident, onSend, loading }: { incident: IncidentDetail; onSend: (t: string) => void; loading: boolean }) {
  const [text, setText] = useState('')
  const question = [...incident.notes].reverse().find((n) => n.type === 'INFO_REQUEST')
  return (
    <div className="mt-4 rounded-md border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        {question?.author.fullName ?? 'The technician'} needs more information from you
      </p>
      {question && <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">"{question.text}"</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer" className="bg-surface" />
        <Button disabled={!text.trim()} loading={loading} onClick={() => { onSend(text.trim()); setText('') }}>Send reply</Button>
      </div>
    </div>
  )
}

type ComposerKind = 'comment' | 'note' | 'ask' | 'answer'

function Composer({ canInvestigate, canAsk, canAnswer, onSend, loading }: {
  canInvestigate: boolean; canAsk: boolean; canAnswer: boolean; loading: boolean
  onSend: (kind: ComposerKind, text: string) => void
}) {
  const options: { value: ComposerKind; label: string }[] = [
    ...(canInvestigate ? [{ value: 'note' as const, label: 'Investigation note' }] : []),
    ...(canAsk ? [{ value: 'ask' as const, label: 'Question for the reporter' }] : []),
    ...(canAnswer ? [{ value: 'answer' as const, label: 'Answer to the technician' }] : []),
    { value: 'comment', label: 'Comment' },
  ]
  const [kind, setKind] = useState<ComposerKind>(options[0].value)
  const [text, setText] = useState('')
  const selected = options.some((o) => o.value === kind) ? kind : options[0].value
  return (
    <form
      className="rounded border border-line-strong p-3"
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(selected, text.trim()); setText('') } }}
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an update" rows={3} className="border-0 bg-transparent focus:ring-0" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {options.length > 1
          ? <select value={selected} onChange={(e) => setKind(e.target.value as ComposerKind)} aria-label="Type of update"
              className="h-8 rounded border border-line-strong bg-surface px-2 text-xs text-fg cursor-pointer">
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          : <span className="text-xs text-muted">Visible to everyone working on this incident</span>}
        <Button type="submit" size="sm" loading={loading} disabled={!text.trim()}>Post</Button>
      </div>
    </form>
  )
}

function TextModal({ open, onClose, title, description, label, confirm, onConfirm, loading, initial = '' }: {
  open: boolean; onClose: () => void; title: string; description: string; label: string; confirm: string
  onConfirm: (text: string) => void; loading: boolean; initial?: string
}) {
  const [text, setText] = useState(initial)
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) { setLastInitial(initial); setText(initial) }
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={loading} disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>{confirm}</Button>
      </>}>
      <Field label={label}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
      </Field>
    </Modal>
  )
}

function ReassessModal({ open, onClose, incident, onConfirm, loading }: {
  open: boolean; onClose: () => void; incident: IncidentDetail; loading: boolean
  onConfirm: (impact: Level, urgency: Level, users: number) => void
}) {
  const [impact, setImpact] = useState<Level>(incident.impact)
  const [urgency, setUrgency] = useState<Level>(incident.urgency)
  const [users, setUsers] = useState(incident.affectedUsers)
  return (
    <Modal open={open} onClose={onClose} title="Re-assess impact and urgency"
      description="Priority and SLA deadlines are recalculated by the active priority strategy."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={() => onConfirm(impact, urgency, users)}>Recalculate</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Impact"><Segmented name="Impact" value={impact} onChange={setImpact} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Urgency"><Segmented name="Urgency" value={urgency} onChange={setUrgency} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Affected users"><div className="w-36"><Input type="number" min={1} value={users} onChange={(e) => setUsers(Math.max(1, Number(e.target.value) || 1))} /></div></Field>
      </div>
    </Modal>
  )
}
