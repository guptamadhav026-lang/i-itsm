package com.itsm.event;

import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;

import java.time.Instant;

/**
 * Something that happened to an incident. Immutable (a Java record).
 *
 * @param actor username of the person who caused it, or "SYSTEM" for automatic actions
 */
public record IncidentEvent(
        IncidentEventType type,
        Incident incident,
        String actor,
        IncidentStatus previousStatus,
        IncidentStatus newStatus,
        String description,
        Instant timestamp) {

    public static final String SYSTEM = "SYSTEM";

    public Long incidentId() {
        return incident.getId();
    }
}
