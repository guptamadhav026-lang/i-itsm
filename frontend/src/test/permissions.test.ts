import { describe, expect, it } from 'vitest'
import { availableActions } from '../lib/permissions'
import type { IncidentDetail, IncidentStatus, User } from '../api/types'

const john = { id: 1, username: 'john', fullName: 'John Employee', role: 'EMPLOYEE' } as User
const alice = { id: 2, username: 'alice', fullName: 'Alice Tech', role: 'TECHNICIAN' } as User
const bob = { id: 3, username: 'bob', fullName: 'Bob Tech', role: 'TECHNICIAN' } as User
const admin = { id: 9, username: 'admin', fullName: 'Admin', role: 'ADMIN' } as User

function incident(status: IncidentStatus, extra: Partial<IncidentDetail> = {}): IncidentDetail {
  const next: Record<IncidentStatus, IncidentStatus[]> = {
    NEW: ['CLASSIFIED'], CLASSIFIED: ['ASSIGNED'], ASSIGNED: ['ACKNOWLEDGED', 'ASSIGNED'], ACKNOWLEDGED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'], RESOLVED: ['VERIFIED', 'IN_PROGRESS'], VERIFIED: ['CLOSED'], CLOSED: [],
  }
  return {
    status,
    allowedNextStatuses: next[status],
    reporter: { id: 1, username: 'john', fullName: 'John Employee' },
    assignedTechnician: { id: 2, username: 'alice', fullName: 'Alice Tech' },
    awaitingReporterInfo: false,
    feedbackRating: null,
    ...extra,
  } as IncidentDetail
}

describe('availableActions', () => {
  it('lets the assigned technician acknowledge an assigned incident', () => {
    expect(availableActions(incident('ASSIGNED'), alice)).toContain('acknowledge')
  })

  it('does not let another technician act on it', () => {
    const actions = availableActions(incident('ASSIGNED'), bob)
    expect(actions).not.toContain('acknowledge')
    expect(actions).not.toContain('reassess')
    expect(actions).toEqual(['comment'])
  })

  it('gives the technician resolve, request-info and note actions while in progress', () => {
    expect(availableActions(incident('IN_PROGRESS'), alice)).toEqual(
      expect.arrayContaining(['resolve', 'requestInfo', 'addNote', 'reassess', 'comment']))
  })

  it('lets only the reporter (or an admin) verify or reopen a resolved incident', () => {
    expect(availableActions(incident('RESOLVED'), john)).toEqual(expect.arrayContaining(['verify', 'reopen', 'feedback']))
    expect(availableActions(incident('RESOLVED'), alice)).not.toContain('verify')
    expect(availableActions(incident('RESOLVED'), admin)).toContain('verify')
  })

  it('shows "provide info" to the reporter only when the technician asked a question', () => {
    expect(availableActions(incident('IN_PROGRESS'), john)).not.toContain('provideInfo')
    expect(availableActions(incident('IN_PROGRESS', { awaitingReporterInfo: true }), john)).toContain('provideInfo')
  })

  it('offers feedback once, and never comments on a closed incident', () => {
    expect(availableActions(incident('CLOSED'), john)).toEqual(['feedback'])
    expect(availableActions(incident('CLOSED', { feedbackRating: 5 }), john)).toEqual([])
  })

  it('lets an admin assign while assignment is still allowed', () => {
    expect(availableActions(incident('ASSIGNED'), admin)).toContain('assign')
    expect(availableActions(incident('IN_PROGRESS'), admin)).not.toContain('assign')
  })
})
