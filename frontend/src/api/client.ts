import type { ApiErrorBody } from './types'

const TOKEN_KEY = 'itsm-token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked: the session just won't survive a reload */
  }
}

/** Thrown for any non-2xx answer. Carries the backend's JSON error (see GlobalExceptionHandler). */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string> | null) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors ?? {}
  }
}

/** Called when the token is missing or expired, so the app can send the user to the login page. */
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * One place for every HTTP call: adds the JWT token, sends/receives JSON,
 * and turns error responses into an ApiError with a readable message.
 */
export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
  }

  if (response.status === 401 && token && !path.startsWith('/api/auth/login')) {
    onUnauthorized()
  }
  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data = text ? safeJson(text) : undefined
  if (!response.ok) {
    const err = data as Partial<ApiErrorBody> | undefined
    const message = err?.message ?? defaultMessage(response.status)
    throw new ApiError(response.status, message, err?.fieldErrors)
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401: return 'Please log in again'
    case 403: return 'You are not allowed to do this'
    case 404: return 'Not found'
    default: return `Request failed (${status})`
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
}

/** Builds "?a=1&b=2", skipping empty values. */
export function query(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}
