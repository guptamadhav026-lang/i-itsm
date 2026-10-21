// These TypeScript types mirror the Java DTO records in com.itsm.web.dto,
// so the editor can check that we use the API correctly (like Java's type checking).

export type Role = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN'
export type Priority = 'P1' | 'P2' | 'P3' | 'P4'
export type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus =
  | 'NEW' | 'CLASSIFIED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED'
export type SlaState = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET'
export type EscalationLevel = 'NONE' | 'TEAM_LEAD' | 'SYSTEM_ADMINISTRATOR' | 'IT_MANAGER'
export type NoteType = 'INVESTIGATION' | 'INFO_REQUEST' | 'INFO_RESPONSE' | 'COMMENT'
export type EventType =
  | 'CREATED' | 'CLASSIFIED' | 'PRIORITY_CALCULATED' | 'PRIORITY_CHANGED' | 'ASSIGNED' | 'ACKNOWLEDGED'
  | 'INVESTIGATION_STARTED' | 'NOTE_ADDED' | 'INFO_REQUESTED' | 'INFO_PROVIDED' | 'RESOLVED' | 'REOPENED'
  | 'VERIFIED' | 'CLOSED' | 'FEEDBACK_GIVEN' | 'DUPLICATE_DETECTED' | 'SLA_WARNING' | 'SLA_VIOLATED' | 'ESCALATED'

export const STATUS_ORDER: IncidentStatus[] = [
  'NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED',
]
export const LEVELS: Level[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']

export interface User {
  id: number
  username: string
  fullName: string
  email: string
  role: Role
  active: boolean
  department: string | null
  skills: string[] | null
  experienceYears: number | null
  maxActiveIncidents: number | null
  available: boolean | null
  teamLead: boolean | null
  itManager: boolean | null
}

export interface UserRef {
  id: number
  username: string
  fullName: string
}

export interface LoginResponse {
  token: string
  tokenType: string
  expiresAt: string
  user: User
}

export interface Service {
  id: number
  name: string
  description: string | null
  businessCriticality: number
  active: boolean
}

export interface Category {
  id: number
  name: string
  description: string | null
  keywords: string | null
  active: boolean
}

export interface IncidentSummary {
  id: number
  reference: string
  title: string
  status: IncidentStatus
  priority: Priority | null
  category: string | null
  service: string
  reporter: UserRef
  assignedTechnician: UserRef | null
  createdAt: string
  responseDeadline: string | null
  resolutionDeadline: string | null
  acknowledgedAt: string | null
  slaState: SlaState
  escalationLevel: EscalationLevel
  potentialDuplicate: boolean
  awaitingReporterInfo: boolean
  slaBreached: boolean
}

export interface Note {
  id: number
  type: NoteType
  text: string
  author: UserRef
  createdAt: string
}

export interface IncidentDetail {
  id: number
  reference: string
  title: string
  description: string
  status: IncidentStatus
  allowedNextStatuses: IncidentStatus[]
  category: Category | null
  service: Service
  impact: Level
  urgency: Level
  affectedUsers: number
  priority: Priority | null
  priorityScore: number
  priorityExplanation: string | null
  reporter: UserRef
  assignedTechnician: UserRef | null
  createdAt: string
  assignedAt: string | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  verifiedAt: string | null
  closedAt: string | null
  responseDeadline: string | null
  resolutionDeadline: string | null
  slaState: SlaState
  minutesToResolutionDeadline: number
  responseBreached: boolean
  resolutionBreached: boolean
  escalationLevel: EscalationLevel
  potentialDuplicateOf: string | null
  resolution: string | null
  awaitingReporterInfo: boolean
  feedbackRating: number | null
  feedbackComment: string | null
  notes: Note[]
}

export interface AuditRecord {
  id: number
  timestamp: string
  actor: string
  action: EventType
  incidentId: number
  incidentReference: string
  previousStatus: IncidentStatus | null
  newStatus: IncidentStatus | null
  description: string
}

export interface Notification {
  id: number
  channel: 'IN_APP' | 'EMAIL'
  incidentId: number | null
  subject: string
  message: string
  createdAt: string
  read: boolean
}

export interface SlaPolicy {
  priority: Priority
  priorityLabel: string
  responseMinutes: number
  resolutionMinutes: number
  warningThresholdPercent: number
}

export interface Strategy {
  name: string
  description: string
  active: boolean
}

export interface SimilarIncident {
  incidentId: number
  reference: string
  title: string
  status: IncidentStatus
  score: number
}

export interface SuggestedResolution {
  incidentId: number
  reference: string
  title: string
  resolution: string
  score: number
}

export interface ScoredTechnician {
  technicianId: number
  username: string
  fullName: string
  score: number
  reasons: string
}

export interface CategorySuggestion {
  categoryId: number
  categoryName: string
  matches: number
  matchedKeywords: string[]
}

export interface Overview {
  totalIncidents: number
  openIncidents: number
  unresolvedIncidents: number
  criticalOpenIncidents: number
  resolvedIncidents: number
  slaViolations: number
  slaCompliancePercent: number
  averageResolutionMinutes: number | null
  byStatus: Partial<Record<IncidentStatus, number>>
  byPriority: Partial<Record<Priority, number>>
}

export interface TechnicianWorkload {
  technicianId: number
  username: string
  fullName: string
  available: boolean
  activeIncidents: number
  maxActiveIncidents: number
  resolvedIncidents: number
  skills: string[]
}

export interface CountRow {
  name: string
  total: number
  open: number
  slaViolations: number
}

export interface SlaRisk {
  incidentId: number
  reference: string
  title: string
  priority: Priority
  status: IncidentStatus
  technician: string | null
  minutesLeft: number
  percentElapsed: number
  slaState: SlaState
  riskScore: number
  reason: string
}

export interface CorrelationCluster {
  serviceId: number
  serviceName: string
  incidentCount: number
  highestPriority: Priority
  incidentReferences: string[]
  message: string
}

export interface LiveUpdate {
  type: EventType
  incidentId: number
  reference: string
  status: IncidentStatus
  actor: string
  description: string
  timestamp: string
}

export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors: Record<string, string> | null
}

export interface SearchCriteria {
  reference?: string
  status?: IncidentStatus
  priority?: Priority
  categoryId?: number
  serviceId?: number
  technicianId?: number
  reporterId?: number
  createdFrom?: string
  createdTo?: string
  slaState?: SlaState
  keyword?: string
}
