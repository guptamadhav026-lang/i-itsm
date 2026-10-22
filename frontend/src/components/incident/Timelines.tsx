import type { AuditRecord, Note, NoteType } from '../../api/types'
import { cn } from '../../lib/cn'
import { EVENT_LABEL, formatDateTime, NOTE_LABEL, STATUS_LABEL, timeAgo } from '../../lib/format'
import { Avatar, EmptyState } from '../ui/misc'

const noteStyle: Record<NoteType, { label: string; box: string }> = {
  INVESTIGATION: { label: 'text-blue-700 dark:text-blue-300', box: 'border-l-blue-500' },
  INFO_REQUEST: { label: 'text-amber-700 dark:text-amber-300', box: 'border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20' },
  INFO_RESPONSE: { label: 'text-emerald-700 dark:text-emerald-300', box: 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' },
  COMMENT: { label: 'text-faint', box: 'border-l-line-strong' },
}

/** Conversation on the incident: investigation notes, questions to the reporter, answers, comments. */
export function NotesTimeline({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <EmptyState title="No notes yet" message="Investigation notes, questions and comments are listed here." />
  }
  return (
    <ol className="space-y-5">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-3">
          <Avatar name={n.author.fullName} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-fg">{n.author.fullName}</span>
              <span className={cn('text-xs font-medium', noteStyle[n.type].label)}>{NOTE_LABEL[n.type]}</span>
              <span className="text-xs text-faint" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
            </div>
            <p className={cn('mt-1.5 whitespace-pre-wrap rounded-r-md border-l-2 py-1.5 pl-3 pr-2 text-sm leading-relaxed text-fg', noteStyle[n.type].box)}>{n.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

const eventColor = (a: AuditRecord) =>
  a.action === 'SLA_VIOLATED' || a.action === 'ESCALATED' ? 'bg-red-500'
    : a.action === 'SLA_WARNING' || a.action === 'DUPLICATE_DETECTED' ? 'bg-amber-500'
      : a.action === 'RESOLVED' || a.action === 'CLOSED' || a.action === 'VERIFIED' ? 'bg-emerald-500'
        : 'bg-brand'

/** The audit trail: every action ever taken on the incident, who did it and the state change. */
export function AuditTimeline({ records }: { records: AuditRecord[] }) {
  if (records.length === 0) return <EmptyState title="No history yet" />
  return (
    <ol className="relative space-y-4 border-l border-line pl-6">
      {records.map((r) => (
        <li key={r.id} className="relative">
          <span className={cn('absolute -left-[29px] top-1.5 size-2.5 rounded-full ring-4 ring-surface', eventColor(r))} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-fg">{EVENT_LABEL[r.action]}</span>
            {r.previousStatus && r.newStatus && r.previousStatus !== r.newStatus && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                {STATUS_LABEL[r.previousStatus]} to <b className="font-medium text-fg">{STATUS_LABEL[r.newStatus]}</b>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">{r.description}</p>
          <p className="mt-0.5 font-mono text-[11px] text-faint">{formatDateTime(r.timestamp)} · {r.actor}</p>
        </li>
      ))}
    </ol>
  )
}
