import type { IncidentDetail, User } from '../api/types'

export type IncidentAction =
  | 'acknowledge' | 'start' | 'resolve' | 'requestInfo' | 'addNote' | 'reassess' | 'assign'
  | 'provideInfo' | 'verify' | 'reopen' | 'close' | 'feedback' | 'comment' | 'edit'

const UNRESOLVED = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS']
/** The technician is working on it from here on (they may still ask questions and write notes) */
const BEING_WORKED_ON = ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS']
/** The reporter may correct the text until a technician acknowledges it (IncidentState.isEditable) */
const REPORTER_EDITABLE = ['NEW', 'CLASSIFIED', 'ASSIGNED']

/**
 * Which buttons to show for this user on this incident. It mirrors the rules the backend enforces
 * (State pattern + ownership checks in IncidentService), so people only see actions that will work.
 * The backend still checks everything: hiding a button is for convenience, not security.
 */
export function availableActions(incident: IncidentDetail, user: User): IncidentAction[] {
  const actions: IncidentAction[] = []
  const isAdmin = user.role === 'ADMIN'
  const isAssignedTech = user.role === 'TECHNICIAN' && incident.assignedTechnician?.id === user.id
  const isReporter = incident.reporter.id === user.id
  const worker = isAdmin || isAssignedTech
  const next = incident.allowedNextStatuses
  const unresolved = UNRESOLVED.includes(incident.status)

  if (worker) {
    if (incident.status === 'ASSIGNED' && next.includes('ACKNOWLEDGED')) actions.push('acknowledge')
    if (incident.status === 'ACKNOWLEDGED' && next.includes('IN_PROGRESS')) actions.push('start')
    if (incident.status === 'IN_PROGRESS') actions.push('resolve')
    if (BEING_WORKED_ON.includes(incident.status)) actions.push('requestInfo', 'addNote')
    if (unresolved) actions.push('reassess')
  }
  if (unresolved && (worker || (isReporter && REPORTER_EDITABLE.includes(incident.status)))) actions.push('edit')
  if (isAdmin && next.includes('ASSIGNED')) actions.push('assign')

  if (isReporter && incident.awaitingReporterInfo && unresolved) actions.push('provideInfo')
  if (isReporter || isAdmin) {
    if (incident.status === 'RESOLVED') actions.push('verify', 'reopen')
    if (incident.status === 'VERIFIED') actions.push('close')
  }
  // feedback is on a confirmed fix, so only after the reporter verified it
  if (isReporter && ['VERIFIED', 'CLOSED'].includes(incident.status) && incident.feedbackRating == null) {
    actions.push('feedback')
  }
  if (incident.status !== 'CLOSED') actions.push('comment')
  return actions
}
