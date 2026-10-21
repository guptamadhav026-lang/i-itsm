import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, BadgeCheck, Building2, Check, CheckCircle2, ChevronRight, CircleCheckBig, Gauge, Hand, History,
  Lock, MessageCircleQuestion, MessagesSquare, Play, RotateCcw, Scale, Send, Sparkles, Tag, Timer, UserCog, Users, Wand2,
} from 'lucide-react'
import { incidentApi } from '../api/endpoints'
import { LEVELS, type IncidentDetail, type Level } from '../api/types'
import { useUser } from '../auth/AuthContext'
import { availableActions, type IncidentAction } from '../lib/permissions'
import { formatDateTime, LEVEL_LABEL, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Segmented, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Avatar, ErrorState, PageLoader, Tabs } from '../components/ui/misc'
import { useToast } from '../components/ui/Toast'
import { AwaitingInfoBadge, DuplicateBadge, EscalationBadge, PriorityBadge, SlaBadge, StatusBadge } from '../components/incident/badges'
import { LifecycleStepper } from '../components/incident/LifecycleStepper'
import { SlaCountdown } from '../components/incident/SlaCountdown'
import { AuditTimeline, NotesTimeline } from '../components/incident/Timelines'
import { RecommendedTechnicians, SmartAssist } from '../components/incident/SmartPanels'
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
    onError: (e) => toast.error('That did not work', (e as Error).message),
  })
  const run = (success: string, fn: () => Promise<IncidentDetail>) => action.mutate({ run: fn, success })
  const busy = action.isPending

  if (isLoading) return <PageLoader />
  if (error || !incident) return <ErrorState error={error ?? new Error('Not found')} onRetry={refetch} />

  const actions = availableActions(incident, user)
  const can = (a: IncidentAction) => actions.includes(a)
  const isWorker = user.role !== 'EMPLOYEE'
  const finished = ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(incident.status)

  return (
    <div className="animate-in">
      <Link to="/incidents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Incidents
      </Link>

      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted">{incident.reference}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{incident.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
            <SlaBadge state={incident.slaState} />
            <EscalationBadge level={incident.escalationLevel} />
            {incident.potentialDuplicateOf && <DuplicateBadge />}
            {incident.awaitingReporterInfo && <AwaitingInfoBadge />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {can('acknowledge') && <Button icon={<Hand className="size-4" />} loading={busy} onClick={() => run('Acknowledged: the response SLA is met', () => incidentApi.acknowledge(id))}>Acknowledge</Button>}
          {can('start') && <Button icon={<Play className="size-4" />} loading={busy} onClick={() => run('Investigation started', () => incidentApi.start(id))}>Start investigation</Button>}
          {can('requestInfo') && <Button variant="secondary" icon={<MessageCircleQuestion className="size-4" />} onClick={() => setModal('requestInfo')}>Ask reporter</Button>}
          {can('resolve') && <Button variant="success" icon={<CircleCheckBig className="size-4" />} onClick={() => setModal('resolve')}>Resolve</Button>}
          {can('verify') && <Button variant="success" icon={<BadgeCheck className="size-4" />} loading={busy} onClick={() => run('Thanks! Resolution confirmed', () => incidentApi.verify(id))}>Yes, it's fixed</Button>}
          {can('reopen') && <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => setModal('reopen')}>Still broken</Button>}
          {can('close') && <Button icon={<Lock className="size-4" />} loading={busy} onClick={() => run('Incident closed', () => incidentApi.close(id))}>Close incident</Button>}
          {can('assign') && <Button variant="secondary" icon={<UserCog className="size-4" />} onClick={() => setModal('assign')}>{incident.assignedTechnician ? 'Reassign' : 'Assign'}</Button>}
          {can('reassess') && <Button variant="ghost" icon={<Scale className="size-4" />} onClick={() => setModal('reassess')}>Re-assess</Button>}
        </div>
      </div>

      {/* ------------------------------------------------------------ banners */}
      {incident.awaitingReporterInfo && can('provideInfo') && (
        <InfoRequestBanner incident={incident} loading={busy}
          onSend={(text) => run('Reply sent to the technician', () => incidentApi.provideInfo(id, text))} />
      )}
      {incident.potentialDuplicateOf && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
          This may be the same problem as <b>{incident.potentialDuplicateOf}</b> (detected automatically from the description).
        </div>
      )}

      <Card className="mt-6 px-4 py-5 sm:px-6">
        <LifecycleStepper status={incident.status} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ------------------------------------------------------------ main column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Description" subtitle={`Reported by ${incident.reporter.fullName} · ${formatDateTime(incident.createdAt)}`} />
            <CardBody><p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{incident.description}</p></CardBody>
          </Card>

          {incident.resolution && (
            <Card className="border-emerald-200 dark:border-emerald-900/60">
              <CardHeader title="Resolution" icon={<CheckCircle2 className="size-4 text-emerald-500" />}
                subtitle={`${incident.assignedTechnician?.fullName ?? 'Technician'} · ${formatDateTime(incident.resolvedAt)}`} />
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-fg">{incident.resolution}</p>
                {incident.status === 'RESOLVED' && can('verify') && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                  { value: 'activity', label: <><MessagesSquare className="size-4" /> Activity</>, count: incident.notes.length },
                  { value: 'history', label: <><History className="size-4" /> History</> },
                  ...(isWorker ? [{ value: 'assist' as TabKey, label: <><Sparkles className="size-4" /> Smart assist</> }] : []),
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
                <SmartAssist
                  incidentId={id}
                  showResolutions={!finished}
                  onUseResolution={can('resolve') ? (text) => { setResolutionDraft(text); setModal('resolve') } : undefined}
                />
              )}
            </CardBody>
          </Card>
        </div>

        {/* ------------------------------------------------------------ side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Service level (SLA)" icon={<Timer className="size-4" />} subtitle={incident.priority ? `${incident.priority} targets` : undefined} />
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
            <CardHeader title="People" icon={<Users className="size-4" />} />
            <CardBody className="space-y-3">
              <Person label="Reported by" name={incident.reporter.fullName} sub={`@${incident.reporter.username}`} />
              {incident.assignedTechnician
                ? <Person label="Assigned technician" name={incident.assignedTechnician.fullName} sub={incident.assignedAt ? `since ${timeAgo(incident.assignedAt)}` : undefined} />
                : <div className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted">No technician assigned yet</div>}
              {can('assign') && (
                <Button variant="secondary" size="sm" className="w-full" icon={<Wand2 className="size-4" />} onClick={() => setModal('assign')}>
                  See recommended technicians
                </Button>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" icon={<Tag className="size-4" />} />
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <Detail label="Service" icon={<Building2 className="size-3.5" />}>{incident.service.name} <span className="text-xs text-faint">(criticality {incident.service.businessCriticality}/5)</span></Detail>
                <Detail label="Category" icon={<Tag className="size-3.5" />}>{incident.category?.name ?? '—'}</Detail>
                <Detail label="Impact" icon={<Gauge className="size-3.5" />}>{LEVEL_LABEL[incident.impact]}</Detail>
                <Detail label="Urgency" icon={<Timer className="size-3.5" />}>{LEVEL_LABEL[incident.urgency]}</Detail>
                <Detail label="Affected users" icon={<Users className="size-3.5" />}>{incident.affectedUsers.toLocaleString()}</Detail>
              </dl>
              {incident.priorityExplanation && (
                <div className="mt-4 rounded-lg bg-surface-2 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><Sparkles className="size-3.5" /> How the priority was calculated</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-fg">{incident.priorityExplanation}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {(can('feedback') || incident.feedbackRating != null) && (
            <Card>
              <CardHeader title="Your feedback" icon={<Check className="size-4" />} subtitle="How happy are you with the resolution?" />
              <CardBody>
                {incident.feedbackRating != null ? (
                  <div>
                    <Stars value={incident.feedbackRating} size="sm" />
                    {incident.feedbackComment && <p className="mt-2 text-sm text-muted">"{incident.feedbackComment}"</p>}
                  </div>
                ) : (
                  <FeedbackForm loading={busy} onSubmit={(rating, comment) => run('Thanks for your feedback!', () => incidentApi.feedback(id, rating, comment))} />
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ dialogs */}
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
        description="Ranked by the smart recommendation: skills, experience, history with this service and current workload.">
        <RecommendedTechnicians
          incidentId={id}
          currentId={incident.assignedTechnician?.id ?? null}
          assigning={busy ? -1 : null}
          onAssign={(t) => run(`Assigned to ${t.fullName}`, () => incidentApi.assign(id, t.technicianId))}
        />
        <div className="mt-4 flex justify-end border-t border-line pt-4">
          <Button variant="secondary" icon={<Wand2 className="size-4" />} loading={busy}
            onClick={() => run('Assigned automatically', () => incidentApi.autoAssign(id))}>
            Use active assignment strategy
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ------------------------------------------------------------------------------------------ pieces

function Person({ label, name, sub }: { label: string; name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{name}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}

function Detail({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted">{icon}{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  )
}

function InfoRequestBanner({ incident, onSend, loading }: { incident: IncidentDetail; onSend: (t: string) => void; loading: boolean }) {
  const [text, setText] = useState('')
  const question = [...incident.notes].reverse().find((n) => n.type === 'INFO_REQUEST')
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <MessageCircleQuestion className="size-4" /> {question?.author.fullName ?? 'The technician'} needs more information
      </p>
      {question && <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">"{question.text}"</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer…" className="bg-surface" />
        <Button icon={<Send className="size-4" />} disabled={!text.trim()} loading={loading} onClick={() => { onSend(text.trim()); setText('') }}>Send reply</Button>
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
      className="rounded-xl border border-line bg-surface-2/40 p-3"
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(selected, text.trim()); setText('') } }}
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an update…" rows={3} className="min-h-0 border-0 bg-transparent shadow-none focus:ring-0" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {options.length > 1
          ? <Select value={selected} onChange={(e) => setKind(e.target.value as ComposerKind)} className="h-8 w-auto text-xs">
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          : <span className="text-xs text-muted">Visible to everyone working on this incident</span>}
        <Button type="submit" size="sm" icon={<Send className="size-3.5" />} loading={loading} disabled={!text.trim()}>Post</Button>
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
        <Button loading={loading} icon={<ChevronRight className="size-4" />} onClick={() => onConfirm(impact, urgency, users)}>Recalculate</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Impact"><Segmented name="Impact" value={impact} onChange={setImpact} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Urgency"><Segmented name="Urgency" value={urgency} onChange={setUrgency} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} /></Field>
        <Field label="Affected users"><Input type="number" min={1} value={users} onChange={(e) => setUsers(Math.max(1, Number(e.target.value) || 1))} className={cn('w-36')} /></Field>
      </div>
    </Modal>
  )
}
