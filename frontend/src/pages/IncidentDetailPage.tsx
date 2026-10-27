import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { catalogApi, incidentApi, type UpdateIncidentBody } from '../api/endpoints'
import { ApiError, errorText } from '../api/client'
import { LEVELS, type IncidentDetail, type Level } from '../api/types'
import { useUser } from '../auth/AuthContext'
import { availableActions, type IncidentAction } from '../lib/permissions'
import { categoryLabel, formatDateTime, LEVEL_LABEL, timeAgo } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Segmented, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Avatar, EmptyState, ErrorState, PageLoader, Tabs } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { AwaitingInfoBadge, DuplicateBadge, EscalationBadge, PriorityBadge, SlaBadge, StatusBadge } from '../components/incident/badges'
import { LifecycleStepper } from '../components/incident/LifecycleStepper'
import { SlaCountdown } from '../components/incident/SlaCountdown'
import { AuditTimeline, NotesTimeline } from '../components/incident/Timelines'
import { RecommendedTechnicians, SimilarIncidentsPanel } from '../components/incident/SmartPanels'
import { FeedbackForm, Stars } from '../components/incident/Feedback'

type ModalKind = 'resolve' | 'requestInfo' | 'reopen' | 'reassess' | 'assign' | 'edit' | null
/** A fixed message, or one worked out from the server's answer (e.g. whether the deadline was met) */
type SuccessText = string | ((updated: IncidentDetail) => string)
type TabKey = 'activity' | 'history' | 'assist'

export function IncidentDetailPage() {
  const id = Number(useParams().id)
  const user = useUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalKind>(null)
  const [tab, setTab] = useState<TabKey>('activity')
  const [resolutionDraft, setResolutionDraft] = useState('')
  const [assigningId, setAssigningId] = useState<number | null>(null)

  const { data: incident, isLoading, error, refetch } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentApi.get(id),
    enabled: Number.isFinite(id),
  })
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => incidentApi.audit(id), enabled: tab === 'history' })

  /** Runs one lifecycle action, updates the page with the server's answer and shows a toast. */
  const action = useMutation({
    mutationFn: async ({ run }: { run: () => Promise<IncidentDetail>; success: SuccessText }) => run(),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData(['incident', id], updated)
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['audit', id] })
      queryClient.invalidateQueries({ queryKey: ['incident', id, 'recommended'] })
      setModal(null)
      setResolutionDraft('')
      toast.success(typeof vars.success === 'function' ? vars.success(updated) : vars.success)
    },
    // the dialog stays open and the typed text stays, so nothing is lost when the server refuses
    onError: (e) => toast.error('That did not work', errorText(e)),
    onSettled: () => setAssigningId(null),
  })
  /** onDone runs only when the server accepted the change (used to clear a text box) */
  const run = (success: SuccessText, fn: () => Promise<IncidentDetail>, onDone?: () => void) =>
    action.mutate({ run: fn, success }, { onSuccess: () => onDone?.() })
  const busy = action.isPending
  const closeModal = () => { setModal(null); setResolutionDraft('') }

  if (isLoading) return <PageLoader />
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    const reference = `INC${String(id).padStart(4, '0')}`
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          title={error.status === 403 ? `You can't open ${reference}` : `There is no incident ${reference}`}
          message={error.status === 403
            ? 'You can only open the incidents you reported yourself. Ask the IT service desk if you need this one.'
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
          {can('acknowledge') && <Button loading={busy} onClick={() => run(
            (u) => u.responseBreached ? 'Acknowledged, but after the response deadline' : 'Acknowledged in time: the response target is met',
            () => incidentApi.acknowledge(id))}>Acknowledge</Button>}
          {can('start') && <Button loading={busy} onClick={() => run('Investigation started', () => incidentApi.start(id))}>Start investigation</Button>}
          {can('requestInfo') && <Button variant="secondary" onClick={() => setModal('requestInfo')}>Ask reporter</Button>}
          {can('resolve') && <Button variant="success" onClick={() => setModal('resolve')}>Resolve</Button>}
          {can('verify') && <Button variant="success" loading={busy} onClick={() => run('Resolution confirmed', () => incidentApi.verify(id))}>Yes, it's fixed</Button>}
          {can('reopen') && <Button variant="secondary" onClick={() => setModal('reopen')}>Still broken</Button>}
          {can('close') && <Button loading={busy} onClick={() => run('Incident closed', () => incidentApi.close(id))}>Close incident</Button>}
          {can('assign') && <Button variant="secondary" onClick={() => setModal('assign')}>{incident.assignedTechnician ? 'Reassign' : 'Assign'}</Button>}
          {can('reassess') && <Button variant="ghost" onClick={() => setModal('reassess')}>Re-assess</Button>}
          {can('edit') && <Button variant="ghost" onClick={() => setModal('edit')}>Edit</Button>}
        </div>
      </div>

      {incident.awaitingReporterInfo && can('provideInfo') && (
        <InfoRequestBanner incident={incident} loading={busy}
          onSend={(text, done) => run('Reply sent to the technician', () => incidentApi.provideInfo(id, text), done)} />
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
                      onSend={(kind, text, done) => {
                        if (kind === 'note') run('Note added', () => incidentApi.addNote(id, text), done)
                        else if (kind === 'ask') run('Question sent to the reporter', () => incidentApi.requestInfo(id, text), done)
                        else if (kind === 'answer') run('Reply sent', () => incidentApi.provideInfo(id, text), done)
                        else run('Comment added', () => incidentApi.comment(id, text), done)
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
            <CardHeader title="Service level (SLA)" subtitle={incident.priority
              ? incident.serviceSlaPolicy ? `${incident.priority} targets for ${incident.service.name}` : `Default ${incident.priority} targets`
              : undefined} />
            <CardBody className="space-y-4">
              <SlaCountdown label="Response (acknowledge)" start={incident.slaStartedAt ?? incident.createdAt} deadline={incident.responseDeadline}
                stoppedAt={incident.acknowledgedAt} breached={incident.responseBreached} warningPercent={incident.slaWarningPercent} />
              <SlaCountdown label="Resolution" start={incident.slaStartedAt ?? incident.createdAt} deadline={incident.resolutionDeadline}
                stoppedAt={incident.resolvedAt} breached={incident.resolutionBreached} warningPercent={incident.slaWarningPercent} />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                <dt className="text-muted">Respond by</dt><dd className="text-right text-fg">{formatDateTime(incident.responseDeadline)}</dd>
                <dt className="text-muted">Resolve by</dt><dd className="text-right text-fg">{formatDateTime(incident.resolutionDeadline)}</dd>
              </dl>
              {incident.slaStartedAt && incident.slaStartedAt !== incident.createdAt && (
                <p className="text-xs text-muted">The targets were set again at {formatDateTime(incident.slaStartedAt)}, after the priority or service changed.</p>
              )}

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
                  <FeedbackForm loading={busy} onSubmit={(rating, comment) => run('Thank you, your feedback was saved', () => incidentApi.feedback(id, rating, comment))} />
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* each dialog is mounted only while it is open, so it starts empty (or with the suggested text) every time */}
      {modal === 'resolve' && (
        <TextModal onClose={closeModal} title="Resolve incident" maxLength={4000}
          description="Describe what you did. The reporter will be asked to confirm the fix." label="Resolution" confirm="Mark as resolved"
          initial={resolutionDraft} loading={busy}
          onConfirm={(text) => run('Resolved: the reporter has been notified', () => incidentApi.resolve(id, text))}
        />
      )}
      {modal === 'requestInfo' && (
        <TextModal onClose={closeModal} title="Ask the reporter" maxLength={4000}
          description="The reporter gets a notification and can answer on this page." label="Your question" confirm="Send question"
          loading={busy} onConfirm={(text) => run('Question sent to the reporter', () => incidentApi.requestInfo(id, text))}
        />
      )}
      {modal === 'reopen' && (
        <TextModal onClose={closeModal} title="Reopen incident" maxLength={2000}
          description="Tell the technician what is still not working. The incident goes back to In progress, and the resolution clock carries on from where it stopped."
          label="What's still wrong?" confirm="Reopen"
          loading={busy} onConfirm={(text) => run('Reopened: the technician has been notified', () => incidentApi.reopen(id, text))}
        />
      )}
      {modal === 'reassess' && (
        <ReassessModal onClose={closeModal} incident={incident} loading={busy}
          onConfirm={(impact, urgency, users) => run(
            (u) => u.priority === incident.priority ? `Priority stays ${u.priority}` : `Priority changed to ${u.priority}: new SLA targets apply from now`,
            () => incidentApi.reassess(id, impact, urgency, users))}
        />
      )}
      {modal === 'edit' && (
        <EditModal onClose={closeModal} incident={incident} canReclassify={isWorker} loading={busy}
          onConfirm={(body) => run(
            (u) => u.priority !== incident.priority ? `Saved. The priority is now ${u.priority}` : 'Changes saved',
            () => incidentApi.update(id, body))}
        />
      )}
      <Modal open={modal === 'assign'} onClose={closeModal} size="lg" title="Assign a technician"
        description="Ranked by the SMART strategy: skills, experience, past work on this service and current workload.">
        <RecommendedTechnicians
          incidentId={id}
          currentId={incident.assignedTechnician?.id ?? null}
          assigning={assigningId}
          disabled={busy}
          onAssign={(t) => {
            setAssigningId(t.technicianId)
            run(`Assigned to ${t.fullName}`, () => incidentApi.assign(id, t.technicianId))
          }}
        />
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button variant="secondary" loading={busy && assigningId === null} disabled={busy}
            onClick={() => run((u) => u.assignedTechnician ? `Assigned to ${u.assignedTechnician.fullName}` : 'No technician is free right now',
              () => incidentApi.autoAssign(id))}>
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

function InfoRequestBanner({ incident, onSend, loading }: {
  incident: IncidentDetail; onSend: (text: string, done: () => void) => void; loading: boolean
}) {
  const [text, setText] = useState('')
  const question = [...incident.notes].reverse().find((n) => n.type === 'INFO_REQUEST')
  return (
    <div className="mt-4 rounded-md border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        {question?.author.fullName ?? 'The technician'} needs more information from you
      </p>
      {question && <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">"{question.text}"</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer" aria-label="Your answer"
          maxLength={4000} className="bg-surface" />
        <Button disabled={!text.trim()} loading={loading} onClick={() => onSend(text.trim(), () => setText(''))}>Send reply</Button>
      </div>
    </div>
  )
}

type ComposerKind = 'comment' | 'note' | 'ask' | 'answer'

function Composer({ canInvestigate, canAsk, canAnswer, onSend, loading }: {
  canInvestigate: boolean; canAsk: boolean; canAnswer: boolean; loading: boolean
  /** done() clears the box, and is called only once the server has saved the text */
  onSend: (kind: ComposerKind, text: string, done: () => void) => void
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
      onSubmit={(e) => { e.preventDefault(); if (text.trim() && !loading) onSend(selected, text.trim(), () => setText('')) }}
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an update" aria-label="Write an update"
        rows={3} maxLength={4000} className="border-0 bg-transparent focus:ring-0" />
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

function TextModal({ onClose, title, description, label, confirm, onConfirm, loading, maxLength, initial = '' }: {
  onClose: () => void; title: string; description: string; label: string; confirm: string
  onConfirm: (text: string) => void; loading: boolean; maxLength: number; initial?: string
}) {
  const [text, setText] = useState(initial)
  return (
    <Modal open onClose={onClose} title={title} description={description}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={loading} disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>{confirm}</Button>
      </>}>
      <Field label={label} hint={text.length > maxLength * 0.9 ? `${text.length} of ${maxLength} characters` : undefined}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={maxLength} />
      </Field>
    </Modal>
  )
}

function ReassessModal({ onClose, incident, onConfirm, loading }: {
  onClose: () => void; incident: IncidentDetail; loading: boolean
  onConfirm: (impact: Level, urgency: Level, users: number) => void
}) {
  const [impact, setImpact] = useState<Level>(incident.impact)
  const [urgency, setUrgency] = useState<Level>(incident.urgency)
  const [users, setUsers] = useState(incident.affectedUsers)
  return (
    <Modal open onClose={onClose} title="Re-assess impact and urgency"
      description="The active priority strategy works out the priority again. If it changes, the new SLA targets count from now."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={() => onConfirm(impact, urgency, users)}>Recalculate</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Impact"><Segmented name="Impact" value={impact} onChange={setImpact} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Urgency"><Segmented name="Urgency" value={urgency} onChange={setUrgency} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Affected users"><Input type="number" min={1} max={1_000_000} className="w-36" value={users}
          onChange={(e) => setUsers(Math.min(1_000_000, Math.max(1, Number(e.target.value) || 1)))} /></Field>
      </div>
    </Modal>
  )
}

function EditModal({ onClose, incident, canReclassify, onConfirm, loading }: {
  onClose: () => void; incident: IncidentDetail; canReclassify: boolean; loading: boolean
  onConfirm: (body: UpdateIncidentBody) => void
}) {
  const [title, setTitle] = useState(incident.title)
  const [description, setDescription] = useState(incident.description)
  const [categoryId, setCategoryId] = useState(incident.category?.id ?? 0)
  const [serviceId, setServiceId] = useState(incident.service.id)
  const categories = useQuery({ queryKey: ['catalog', 'categories'], queryFn: catalogApi.categories, enabled: canReclassify })
  const services = useQuery({ queryKey: ['catalog', 'services'], queryFn: catalogApi.services, enabled: canReclassify })

  // only what changed is sent, so the history says exactly what was corrected
  const body: UpdateIncidentBody = {}
  if (title.trim() !== incident.title) body.title = title.trim()
  if (description.trim() !== incident.description) body.description = description.trim()
  if (canReclassify && categoryId && categoryId !== incident.category?.id) body.categoryId = categoryId
  if (canReclassify && serviceId !== incident.service.id) body.serviceId = serviceId
  const changed = Object.keys(body).length > 0
  const valid = title.trim().length >= 5 && description.trim().length > 0

  return (
    <Modal open onClose={onClose} size="lg" title={`Edit ${incident.reference}`}
      description={canReclassify
        ? 'Correct the details, or move it to the right category or service. Everyone involved is told, and the change is kept in the history.'
        : 'You can correct your report until a technician starts on it. After that, add a comment instead.'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={loading} disabled={!changed || !valid} onClick={() => onConfirm(body)}>Save changes</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Title" required error={title.trim().length < 5 ? 'At least 5 characters' : undefined}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Description" required>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={4000} />
        </Field>
        {canReclassify && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" hint="Re-classifying can change who the right technician is.">
              <Select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                {!incident.category && <option value={0}>Not classified</option>}
                {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.name)}</option>)}
              </Select>
            </Field>
            <Field label="Service" hint="A different service can change the priority and the SLA targets.">
              <Select value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>
                {(services.data ?? []).map((sv) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  )
}
