package com.itsm.web.dto;

import com.itsm.model.EscalationLevel;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;

import java.time.Instant;

/** One row in an incident list. */
public record IncidentSummaryDto(Long id, String reference, String title, IncidentStatus status, Priority priority,
                                 String category, String service, UserRefDto reporter, UserRefDto assignedTechnician,
                                 Instant createdAt, Instant responseDeadline, Instant resolutionDeadline,
                                 Instant acknowledgedAt, SlaState slaState, EscalationLevel escalationLevel,
                                 boolean potentialDuplicate, boolean awaitingReporterInfo, boolean slaBreached) {

    public static IncidentSummaryDto from(Incident i, SlaState slaState) {
        return new IncidentSummaryDto(i.getId(), i.getReference(), i.getTitle(), i.getStatus(), i.getPriority(),
                i.getCategory() == null ? null : i.getCategory().getName(),
                i.getService().getName(),
                UserRefDto.from(i.getReporter()), UserRefDto.from(i.getAssignedTechnician()),
                i.getCreatedAt(), i.getResponseDeadline(), i.getResolutionDeadline(), i.getAcknowledgedAt(),
                slaState, i.getEscalationLevel(), i.getPotentialDuplicateOf() != null,
                i.isAwaitingReporterInfo(), i.isSlaBreached());
    }
}
