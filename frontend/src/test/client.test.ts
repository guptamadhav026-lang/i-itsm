import { describe, expect, it } from 'vitest'
import { ApiError, errorText, query } from '../api/client'

describe('API client helpers', () => {
  it('shows what is wrong with each refused field', () => {
    const e = new ApiError(400, 'Validation failed', { title: 'size must be between 5 and 150', affectedUsers: 'must be at least 1' })
    expect(errorText(e)).toBe('Title: size must be between 5 and 150. Affected users: must be at least 1')
  })

  it('falls back to the server message, or a plain one for unknown errors', () => {
    expect(errorText(new ApiError(409, 'Username \'rohan\' is already taken'))).toBe('Username \'rohan\' is already taken')
    expect(errorText('oops')).toBe('Something went wrong')
  })

  it('builds a query string without the empty filters', () => {
    expect(query({ status: 'NEW', keyword: '', open: true, serviceId: undefined })).toBe('?status=NEW&open=true')
    expect(query({})).toBe('')
  })
})
