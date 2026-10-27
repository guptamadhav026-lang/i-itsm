package com.itsm.event;

/**
 * Everything the audit trail records. The incident events become audit records and may trigger notifications;
 * the administration events at the end are not about one incident and are written straight to the audit trail.
 */
public enum IncidentEventType {
    CREATED,
    CLASSIFIED,
    PRIORITY_CALCULATED,
    PRIORITY_CHANGED,
    REASSESSED,
    DETAILS_CHANGED,
    ASSIGNED,
    ASSIGNMENT_FAILED,
    ACKNOWLEDGED,
    INVESTIGATION_STARTED,
    NOTE_ADDED,
    INFO_REQUESTED,
    INFO_PROVIDED,
    RESOLVED,
    REOPENED,
    VERIFIED,
    CLOSED,
    FEEDBACK_GIVEN,
    DUPLICATE_DETECTED,
    SLA_WARNING,
    SLA_VIOLATED,
    ESCALATED,

    // Administration (no incident)
    USER_CREATED,
    USER_UPDATED,
    USER_ACTIVATED,
    USER_DEACTIVATED,
    PASSWORD_RESET,
    PASSWORD_CHANGED,
    SERVICE_CHANGED,
    CATEGORY_CHANGED,
    SLA_POLICY_CHANGED,
    STRATEGY_CHANGED
}
