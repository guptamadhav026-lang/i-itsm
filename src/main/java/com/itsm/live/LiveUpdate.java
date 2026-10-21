package com.itsm.live;

import com.itsm.event.IncidentEventType;
import com.itsm.model.IncidentStatus;

import java.time.Instant;

/** The small message pushed to browsers when something happens to an incident. */
public record LiveUpdate(IncidentEventType type, Long incidentId, String reference, IncidentStatus status,
                         String actor, String description, Instant timestamp) {
}
