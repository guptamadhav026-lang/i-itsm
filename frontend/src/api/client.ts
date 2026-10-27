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
/** For calls made without request() (the live-update stream) that get a 401 */
export function reportUnauthorized() {
  if (getToken()) onUnauthorized()
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
  // 204 No Content: there is no body (for example "no category matched"), so callers get null
  if (response.status === 204) return null as T

  const text = await response.text()
  const data = text ? safeJson(text) : undefined
  if (!response.ok) {
    const err = data as Partial<ApiErrorBody> | undefined
    const message = err?.message ?? defaultMessage(response.status)
    throw new ApiError(response.status, message, err?.fieldErrors)
  }
  return data as T
}

/**
 * The text to show for a failed call: the server's message, plus what is wrong with each field
 * when a form was refused ("Title: size must be between 5 and 150").
 */
export function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong'
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fieldErrors)
    if (fields.length > 0) {
      return fields.map(([field, problem]) => `${fieldLabel(field)}: ${problem}`).join('. ')
    }
  }
  return error.message
}

/** "affectedUsers" -> "Affected users", "skills[]" -> "Skills" */
function fieldLabel(field: string): string {
  const words = field.replace(/\[.*?\]|<.*?>/g, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
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
  delete: <T>(path: string) => request<T>('DELETE', path),
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
