import { api, query } from './client'
import type {
  AuditRecord, Category, CategorySuggestion, CorrelationCluster, CountRow, IncidentDetail, IncidentSummary,
  Level, LoginResponse, Notification, Overview, Priority, ScoredTechnician, SearchCriteria, Service,
  SimilarIncident, SlaPolicy, SlaRisk, Strategy, SuggestedResolution, TechnicianWorkload, User, Role,
} from './types'

// Every backend endpoint the web app uses, in one file. Each function returns a Promise of typed data.

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/api/auth/login', { username, password }),
  register: (body: { username: string; password: string; fullName: string; email: string; department?: string }) =>
    api.post<User>('/api/auth/register', body),
  me: () => api.get<User>('/api/auth/me'),
}

export interface CreateIncidentBody {
  title: string
  description: string
  serviceId: number
  categoryId: number | null
  impact: Level
  urgency: Level
  affectedUsers: number
}

const inc = (id: number, action = '') => `/api/incidents/${id}${action}`

export const incidentApi = {
  list: () => api.get<IncidentSummary[]>('/api/incidents'),
  search: (criteria: SearchCriteria) => api.get<IncidentSummary[]>(`/api/incidents/search${query(criteria)}`),
  get: (id: number) => api.get<IncidentDetail>(inc(id)),
  audit: (id: number) => api.get<AuditRecord[]>(inc(id, '/audit')),
  create: (body: CreateIncidentBody) => api.post<IncidentDetail>('/api/incidents', body),

  assign: (id: number, technicianId: number) => api.post<IncidentDetail>(inc(id, '/assign'), { technicianId }),
  autoAssign: (id: number) => api.post<IncidentDetail>(inc(id, '/auto-assign')),
  recommended: (id: number) => api.get<ScoredTechnician[]>(inc(id, '/recommended-technicians')),

  acknowledge: (id: number) => api.post<IncidentDetail>(inc(id, '/acknowledge')),
  start: (id: number) => api.post<IncidentDetail>(inc(id, '/start')),
  addNote: (id: number, text: string) => api.post<IncidentDetail>(inc(id, '/notes'), { text }),
  requestInfo: (id: number, text: string) => api.post<IncidentDetail>(inc(id, '/info-request'), { text }),
  resolve: (id: number, resolution: string) => api.post<IncidentDetail>(inc(id, '/resolve'), { resolution }),
  reassess: (id: number, impact: Level, urgency: Level, affectedUsers: number) =>
    api.post<IncidentDetail>(inc(id, '/reassess'), { impact, urgency, affectedUsers }),

  provideInfo: (id: number, text: string) => api.post<IncidentDetail>(inc(id, '/info-response'), { text }),
  comment: (id: number, text: string) => api.post<IncidentDetail>(inc(id, '/comments'), { text }),
  reopen: (id: number, reason: string) => api.post<IncidentDetail>(inc(id, '/reopen'), { reason }),
  verify: (id: number) => api.post<IncidentDetail>(inc(id, '/verify')),
  close: (id: number) => api.post<IncidentDetail>(inc(id, '/close')),
  feedback: (id: number, rating: number, comment: string) =>
    api.post<IncidentDetail>(inc(id, '/feedback'), { rating, comment }),

  similar: (id: number) => api.get<SimilarIncident[]>(inc(id, '/similar')),
  suggestedResolutions: (id: number) => api.get<SuggestedResolution[]>(inc(id, '/suggested-resolutions')),
}

export const catalogApi = {
  services: () => api.get<Service[]>('/api/catalog/services'),
  categories: () => api.get<Category[]>('/api/catalog/categories'),
  suggestCategory: (text: string) => api.post<CategorySuggestion | undefined>('/api/catalog/suggest-category', { text }),
}

export const technicianApi = {
  setAvailability: (available: boolean) => api.put<User>('/api/technician/availability', { available }),
}

export interface CreateUserBody {
  role: Role
  username: string
  password: string
  fullName: string
  email: string
  department?: string
  skills?: string[]
  experienceYears?: number
  maxActiveIncidents?: number
  teamLead?: boolean
  itManager?: boolean
}

export interface UpdateTechnicianBody {
  skills?: string[]
  experienceYears?: number
  maxActiveIncidents?: number
  available?: boolean
  teamLead?: boolean
}

export interface ServiceBody { name: string; description: string; businessCriticality: number; active?: boolean }
export interface CategoryBody { name: string; description: string; keywords: string; active?: boolean }

export const adminApi = {
  users: () => api.get<User[]>('/api/admin/users'),
  createUser: (body: CreateUserBody) => api.post<User>('/api/admin/users', body),
  setActive: (id: number, active: boolean) => api.put<User>(`/api/admin/users/${id}/active?active=${active}`),
  technicians: () => api.get<User[]>('/api/admin/technicians'),
  updateTechnician: (id: number, body: UpdateTechnicianBody) => api.put<User>(`/api/admin/technicians/${id}`, body),

  services: () => api.get<Service[]>('/api/admin/services'),
  createService: (body: ServiceBody) => api.post<Service>('/api/admin/services', body),
  updateService: (id: number, body: ServiceBody) => api.put<Service>(`/api/admin/services/${id}`, body),
  categories: () => api.get<Category[]>('/api/admin/categories'),
  createCategory: (body: CategoryBody) => api.post<Category>('/api/admin/categories', body),
  updateCategory: (id: number, body: CategoryBody) => api.put<Category>(`/api/admin/categories/${id}`, body),

  slaPolicies: () => api.get<SlaPolicy[]>('/api/admin/sla-policies'),
  updateSlaPolicy: (priority: Priority, body: Omit<SlaPolicy, 'priority' | 'priorityLabel'>) =>
    api.put<SlaPolicy>(`/api/admin/sla-policies/${priority}`, body),

  assignmentStrategies: () => api.get<Strategy[]>('/api/admin/strategies/assignment'),
  setAssignmentStrategy: (name: string) => api.put<Strategy[]>('/api/admin/strategies/assignment', { name }),
  priorityStrategies: () => api.get<Strategy[]>('/api/admin/strategies/priority'),
  setPriorityStrategy: (name: string) => api.put<Strategy[]>('/api/admin/strategies/priority', { name }),

  audit: (limit = 200) => api.get<AuditRecord[]>(`/api/admin/audit?limit=${limit}`),
}

export const reportApi = {
  overview: () => api.get<Overview>('/api/reports/overview'),
  workload: () => api.get<TechnicianWorkload[]>('/api/reports/technician-workload'),
  services: () => api.get<CountRow[]>('/api/reports/services'),
  categories: () => api.get<CountRow[]>('/api/reports/categories'),
  slaRisk: () => api.get<SlaRisk[]>('/api/reports/sla-risk'),
  correlations: () => api.get<CorrelationCluster[]>('/api/reports/correlations'),
}

export const notificationApi = {
  list: () => api.get<Notification[]>('/api/notifications'),
  unreadCount: () => api.get<{ unread: number }>('/api/notifications/unread-count'),
  markRead: (id: number) => api.post<Notification>(`/api/notifications/${id}/read`),
}
