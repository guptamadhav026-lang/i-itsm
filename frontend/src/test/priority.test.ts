import { describe, expect, it } from 'vitest'
import { estimatePriority } from '../pages/ReportIncidentPage'

// The preview on the report form must agree with the backend's ImpactUrgencyPriorityStrategy.
describe('estimatePriority', () => {
  it('matches the worked example in WeightedPriorityStrategy (payment service down = 60, P1)', () => {
    expect(estimatePriority('HIGH', 'CRITICAL', 5, 1)).toEqual({ score: 60, priority: 'P1' })
  })

  it('makes a single-user cosmetic issue P4', () => {
    expect(estimatePriority('LOW', 'LOW', 2, 1)).toEqual({ score: 2, priority: 'P4' })
  })

  it('raises the priority when more people are affected', () => {
    const one = estimatePriority('MEDIUM', 'HIGH', 3, 1)
    const many = estimatePriority('MEDIUM', 'HIGH', 3, 150)
    expect(one).toEqual({ score: 18, priority: 'P3' })
    expect(many).toEqual({ score: 27, priority: 'P2' })
  })
})
