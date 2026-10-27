// These TypeScript types mirror the Java DTO records in com.itsm.web.dto,
// so the compiler catches mismatches between the frontend and the API.

export type Role = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN'
export type Priority = 'P1' | 'P2' | 'P3' | 'P4'
export type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus =
  | 'NEW' | 'CLASSIFIED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED'
export type SlaState = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET'
export type EscalationLevel = 'NONE' | 'TEAM_LEAD' | 'SYSTEM_ADMINISTRATOR' | 'IT_MANAGER'
export type NoteType = 'INVESTIGATION' | 'INFO_REQUEST' | 'INFO_RESPONSE' | 'COMMENT'
export type IncidentEventType =
  | 'CREATED' | 'CLASSIFIED' | 'PRIORITY_CALCULATED' | 'PRIORITY_CHANGED' | 'REASSESSED' | 'DETAILS_CHANGED'
  | 'ASSIGNED' | 'ASSIGNMENT_FAILED' | 'ACKNOWLEDGED' | 'INVESTIGATION_STARTED' | 'NOTE_ADDED' | 'INFO_REQUESTED'
  | 'INFO_PROVIDED' | 'RESOLVED' | 'REOPENED' | 'VERIFIED' | 'CLOSED' | 'FEEDBACK_GIVEN' | 'DUPLICATE_DETECTED'
  | 'SLA_WARNING' | 'SLA_VIOLATED' | 'ESCALATED'
/** Changes an administrator (or a user to their own password) makes; these have no incident. */
export type AdminEventType =
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_ACTIVATED' | 'USER_DEACTIVATED' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED'
  | 'SERVICE_CHANGED' | 'CATEGORY_CHANGED' | 'SLA_POLICY_CHANGED' | 'STRATEGY_CHANGED'
export type EventType = IncidentEventType | AdminEventType

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

/** Settings the login page needs before anyone is logged in. */
export interface LoginOptions {
  /** true while the demo accounts are loaded, so the page can list them */
  demoAccounts: boolean
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
  /** When the SLA clock started: the report time, or later if the targets were reset (priority raised) */
  slaStartedAt: string | null
  responseDeadline: string | null
  resolutionDeadline: string | null
  slaState: SlaState
  minutesToResolutionDeadline: number
  /** true when the service has its own SLA targets for this priority */
  serviceSlaPolicy: boolean
  /** The SLA warning threshold for this incident, e.g. 75 (%) */
  slaWarningPercent: number
  responseBreached: boolean
  resolutionBreached: boolean
  escalationLevel: EscalationLevel
  potentialDuplicateOf: string | null
  potentialDuplicateOfId: number | null
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
  /** null for administration changes, which belong to no incident */
  incidentId: number | null
  incidentReference: string | null
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
  id: number
  priority: Priority
  priorityLabel: string
  /** null for the default targets of a priority */
  serviceId: number | null
  serviceName: string | null
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

/** What the active priority strategy says for the values on the report form. */
export interface PriorityAssessment {
  priority: Priority
  score: number
  explanation: string
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
  /** "keywords", or the AI service that chose it (e.g. "Gemini") */
  source: string
}

export interface Overview {
  totalIncidents: number
  openIncidents: number
  unresolvedIncidents: number
  criticalOpenIncidents: number
  resolvedIncidents: number
  slaViolations: number
  slaCompliancePercent: number
  averageResponseMinutes: number | null
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
  /** only incidents that are not resolved yet */
  open?: boolean
  /** IANA name such as "Asia/Kolkata", so "created from/to" dates match the user's own calendar */
  timeZone?: string
}

export interface ServiceStatus {
  serviceId: number
  serviceName: string
  openIncidents: number
  highestPriority: Priority | null
}

export interface SlaByPriority {
  priority: Priority
  incidents: number
  averageResponseMinutes: number | null
  averageResolutionMinutes: number | null
  responseBreaches: number
  resolutionBreaches: number
}

export interface IntegrationStatus {
  name: string
  enabled: boolean
  detail: string
}
