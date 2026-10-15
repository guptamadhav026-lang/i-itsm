package com.itsm.event;

/** Everything that can happen to an incident. Each event becomes an audit record and may trigger notifications. */
public enum IncidentEventType {
    CREATED,
    CLASSIFIED,
    PRIORITY_CALCULATED,
    PRIORITY_CHANGED,
    ASSIGNED,
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
    ESCALATED
}
