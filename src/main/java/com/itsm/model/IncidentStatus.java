package com.itsm.model;

/**
 * The stages of the incident lifecycle:
 * NEW → CLASSIFIED → ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → VERIFIED → CLOSED.
 * Which moves are allowed is decided by the State classes in {@code com.itsm.model.state}.
 */
public enum IncidentStatus {
    NEW,
    CLASSIFIED,
    ASSIGNED,
    ACKNOWLEDGED,
    IN_PROGRESS,
    RESOLVED,
    VERIFIED,
    CLOSED;

    /** Statuses in which a technician is actively responsible for the incident. */
    public static final java.util.Set<IncidentStatus> ACTIVE_WORK =
            java.util.EnumSet.of(ASSIGNED, ACKNOWLEDGED, IN_PROGRESS);

    /** Statuses in which the problem is not yet fixed (the SLA clock is still running). */
    public static final java.util.Set<IncidentStatus> UNRESOLVED =
            java.util.EnumSet.of(NEW, CLASSIFIED, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS);
}
