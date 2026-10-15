package com.itsm.web.dto;

import com.itsm.event.IncidentEventType;
import com.itsm.model.AuditRecord;
import com.itsm.model.IncidentStatus;

import java.time.Instant;

public record AuditRecordDto(Long id, Instant timestamp, String actor, IncidentEventType action, Long incidentId,
                             String incidentReference, IncidentStatus previousStatus, IncidentStatus newStatus,
                             String description) {

    public static AuditRecordDto from(AuditRecord r) {
        return new AuditRecordDto(r.getId(), r.getTimestamp(), r.getActor(), r.getAction(), r.getIncidentId(),
                r.getIncidentReference(), r.getPreviousStatus(), r.getNewStatus(), r.getDescription());
    }
}
