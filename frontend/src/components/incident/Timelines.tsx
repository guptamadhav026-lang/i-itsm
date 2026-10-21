import type { AuditRecord, Note, NoteType } from '../../api/types'
import { cn } from '../../lib/cn'
import { EVENT_LABEL, formatDateTime, NOTE_LABEL, STATUS_LABEL, timeAgo } from '../../lib/format'
import { Avatar, EmptyState } from '../ui/misc'

const noteStyle: Record<NoteType, string> = {
  INVESTIGATION: 'text-blue-700 dark:text-blue-300',
  INFO_REQUEST: 'text-amber-700 dark:text-amber-300',
  INFO_RESPONSE: 'text-emerald-700 dark:text-emerald-300',
  COMMENT: 'text-muted',
}

/** Conversation on the incident: investigation notes, questions to the reporter, answers, comments. */
export function NotesTimeline({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <EmptyState title="No notes yet" message="Investigation notes, questions and comments are listed here." />
  }
  return (
    <ol className="space-y-5">
      {notes.map((n) => {
        return (
          <li key={n.id} className="flex gap-3">
            <Avatar name={n.author.fullName} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-fg">{n.author.fullName}</span>
                <span className={cn('text-xs font-medium', noteStyle[n.type])}>{NOTE_LABEL[n.type]}</span>
                <span className="text-xs text-faint" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{n.text}</p>
            </div>
          </li>
        )
      })}
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
