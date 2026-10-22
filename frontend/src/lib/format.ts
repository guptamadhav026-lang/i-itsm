import type { EscalationLevel, EventType, IncidentStatus, Level, NoteType, Priority, SlaState } from '../api/types'

// Small helpers that turn raw API values into text people read on screen.

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: 'New',
  CLASSIFIED: 'Classified',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
}

export const SLA_LABEL: Record<SlaState, string> = {
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  BREACHED: 'Breached',
  MET: 'Met',
}

export const LEVEL_LABEL: Record<Level, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const ESCALATION_LABEL: Record<EscalationLevel, string> = {
  NONE: 'Not escalated',
  TEAM_LEAD: 'Team lead',
  SYSTEM_ADMINISTRATOR: 'System administrator',
  IT_MANAGER: 'IT manager',
}

export const NOTE_LABEL: Record<NoteType, string> = {
  INVESTIGATION: 'Investigation note',
  INFO_REQUEST: 'Information requested',
  INFO_RESPONSE: 'Reporter replied',
  COMMENT: 'Comment',
}

export const EVENT_LABEL: Record<EventType, string> = {
  CREATED: 'Reported',
  CLASSIFIED: 'Classified',
  PRIORITY_CALCULATED: 'Priority calculated',
  PRIORITY_CHANGED: 'Priority changed',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  INVESTIGATION_STARTED: 'Investigation started',
  NOTE_ADDED: 'Note added',
  INFO_REQUESTED: 'Information requested',
  INFO_PROVIDED: 'Information provided',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
  FEEDBACK_GIVEN: 'Feedback given',
  DUPLICATE_DETECTED: 'Possible duplicate',
  SLA_WARNING: 'SLA warning',
  SLA_VIOLATED: 'SLA violated',
  ESCALATED: 'Escalated',
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
})
const dateOnly = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const timeOnly = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '-'
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateOnly.format(new Date(iso)) : '-'
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? timeOnly.format(new Date(iso)) : '-'
}

/** "3 min ago", "2 h ago", "yesterday"... */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '-'
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

/** Minutes as "45 min", "2 h 05 min", "8 h", "1 d 3 h", "1 d". */
export function formatMinutes(total: number): string {
  const m = Math.abs(Math.round(total))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return m % 60 === 0 ? `${h} h` : `${h} h ${String(m % 60).padStart(2, '0')} min`
  const d = Math.floor(h / 24)
  return h % 24 === 0 ? `${d} d` : `${d} d ${h % 24} h`
}

/** An average duration: "under 1 min" reads better than "0 min". */
export function formatAverage(minutes: number): string {
  return minutes < 1 ? 'under 1 min' : formatMinutes(minutes)
}

/** Milliseconds as a countdown "1:04:09" or "12:09". */
export function formatCountdown(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function initials(name: string): string {
  const parts = name.replace(/\(.*\)/, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function humanize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ')
}

/** Category names are stored as codes ("AUTHENTICATION"); people read "Authentication". */
export function categoryLabel(name: string | null | undefined): string {
  if (!name) return '-'
  if (name === 'EMAIL') return 'E-mail'
  return humanize(name)
}

/** Readable names for the strategy codes the backend uses. */
export const STRATEGY_LABEL: Record<string, string> = {
  SMART: 'Smart',
  SKILL_BASED: 'Skill based',
  LOAD_BASED: 'Least busy',
  ROUND_ROBIN: 'Round robin',
  WEIGHTED: 'Weighted score',
  ITIL_MATRIX: 'ITIL matrix',
}

export function strategyLabel(name: string): string {
  return STRATEGY_LABEL[name] ?? humanize(name)
}

/** "Good morning" before noon, "Good afternoon" until six, then "Good evening". */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

/** "Wednesday 22 October" */
export function formatLongDay(date: Date = new Date()): string {
  return longDay.format(date)
}

/** "Today", "Yesterday" or a date, used to group lists by day. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(now) - start(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return dateOnly.format(d)
}
