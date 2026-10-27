import { describe, expect, it } from 'vitest'
import { availableActions } from '../lib/permissions'
import type { IncidentDetail, IncidentStatus, User } from '../api/types'

const rohan = { id: 1, username: 'rohan', fullName: 'Rohan Mehta', role: 'EMPLOYEE' } as User
const ananya = { id: 2, username: 'ananya', fullName: 'Ananya Rao', role: 'TECHNICIAN' } as User
const vikram = { id: 3, username: 'vikram', fullName: 'Vikram Singh', role: 'TECHNICIAN' } as User
const admin = { id: 9, username: 'kavita', fullName: 'Kavita Sharma', role: 'ADMIN' } as User

function incident(status: IncidentStatus, extra: Partial<IncidentDetail> = {}): IncidentDetail {
  const next: Record<IncidentStatus, IncidentStatus[]> = {
    NEW: ['CLASSIFIED'], CLASSIFIED: ['ASSIGNED'], ASSIGNED: ['ACKNOWLEDGED', 'ASSIGNED'], ACKNOWLEDGED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'], RESOLVED: ['VERIFIED', 'IN_PROGRESS'], VERIFIED: ['CLOSED'], CLOSED: [],
  }
  return {
    status,
    allowedNextStatuses: next[status],
    reporter: { id: 1, username: 'rohan', fullName: 'Rohan Mehta' },
    assignedTechnician: { id: 2, username: 'ananya', fullName: 'Ananya Rao' },
    awaitingReporterInfo: false,
    feedbackRating: null,
    ...extra,
  } as IncidentDetail
}

describe('availableActions', () => {
  it('lets the assigned technician acknowledge an assigned incident', () => {
    expect(availableActions(incident('ASSIGNED'), ananya)).toContain('acknowledge')
  })

  it('does not let another technician act on it', () => {
    const actions = availableActions(incident('ASSIGNED'), vikram)
    expect(actions).not.toContain('acknowledge')
    expect(actions).not.toContain('reassess')
    expect(actions).toEqual(['comment'])
  })

  it('gives the technician resolve, request-info and note actions while in progress', () => {
    expect(availableActions(incident('IN_PROGRESS'), ananya)).toEqual(
      expect.arrayContaining(['resolve', 'requestInfo', 'addNote', 'reassess', 'comment', 'edit']))
  })

  it('lets the technician ask the reporter a question before starting work', () => {
    const actions = availableActions(incident('ASSIGNED'), ananya)
    expect(actions).toEqual(expect.arrayContaining(['acknowledge', 'requestInfo', 'addNote']))
    expect(actions).not.toContain('resolve')
  })

  it('lets the reporter edit only until a technician acknowledges it', () => {
    expect(availableActions(incident('ASSIGNED'), rohan)).toContain('edit')
    expect(availableActions(incident('ACKNOWLEDGED'), rohan)).not.toContain('edit')
    expect(availableActions(incident('RESOLVED'), ananya)).not.toContain('edit')
  })

  it('lets only the reporter (or an admin) verify or reopen a resolved incident', () => {
    expect(availableActions(incident('RESOLVED'), rohan)).toEqual(expect.arrayContaining(['verify', 'reopen']))
    expect(availableActions(incident('RESOLVED'), rohan)).not.toContain('feedback')
    expect(availableActions(incident('RESOLVED'), ananya)).not.toContain('verify')
    expect(availableActions(incident('RESOLVED'), admin)).toContain('verify')
  })

  it('shows "provide info" to the reporter only when the technician asked a question', () => {
    expect(availableActions(incident('IN_PROGRESS'), rohan)).not.toContain('provideInfo')
    expect(availableActions(incident('IN_PROGRESS', { awaitingReporterInfo: true }), rohan)).toContain('provideInfo')
    expect(availableActions(incident('IN_PROGRESS', { awaitingReporterInfo: true }), admin)).not.toContain('provideInfo')
  })

  it('offers feedback once the fix is confirmed, and never comments on a closed incident', () => {
    expect(availableActions(incident('VERIFIED'), rohan)).toEqual(expect.arrayContaining(['close', 'feedback']))
    expect(availableActions(incident('CLOSED'), rohan)).toEqual(['feedback'])
    expect(availableActions(incident('CLOSED', { feedbackRating: 5 }), rohan)).toEqual([])
  })

  it('lets an admin assign while assignment is still allowed', () => {
    expect(availableActions(incident('ASSIGNED'), admin)).toContain('assign')
    expect(availableActions(incident('IN_PROGRESS'), admin)).not.toContain('assign')
  })
})
