import { describe, expect, it } from 'vitest'
import { formatCountdown, formatMinutes, humanize, initials, timeAgo } from '../lib/format'

describe('format helpers', () => {
  it('formats minutes for people', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(125)).toBe('2 h 05 min')
    expect(formatMinutes(60 * 27)).toBe('1 d 3 h')
    expect(formatMinutes(-30)).toBe('30 min')
  })

  it('formats an SLA countdown', () => {
    expect(formatCountdown(12 * 60_000 + 9_000)).toBe('12:09')
    expect(formatCountdown(3_849_000)).toBe('1:04:09')
    expect(formatCountdown(5_000)).toBe('0:05')
  })

  it('says how long ago something happened', () => {
    const now = Date.parse('2026-10-21T12:00:00Z')
    expect(timeAgo('2026-10-21T11:59:50Z', now)).toBe('just now')
    expect(timeAgo('2026-10-21T11:57:00Z', now)).toBe('3 min ago')
    expect(timeAgo('2026-10-21T09:00:00Z', now)).toBe('3 h ago')
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo(null, now)).toBe('-')
  })

  it('builds initials and readable enum names', () => {
    expect(initials('Ananya Rao')).toBe('AR')
    expect(initials('System Administrator (admin)')).toBe('SA')
    expect(humanize('LEAST_LOADED')).toBe('Least loaded')
  })
})
