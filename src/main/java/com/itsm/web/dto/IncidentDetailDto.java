package com.itsm.web.dto;

import com.itsm.model.EscalationLevel;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;
import com.itsm.model.Urgency;

import java.time.Instant;
import java.util.List;

/** Everything about one incident, including its notes and which status changes are possible next. */
public record IncidentDetailDto(
        Long id, String reference, String title, String description,
        IncidentStatus status, List<IncidentStatus> allowedNextStatuses,
        CategoryDto category, ServiceDto service,
        Impact impact, Urgency urgency, int affectedUsers,
        Priority priority, double priorityScore, String priorityExplanation,
        UserRefDto reporter, UserRefDto assignedTechnician,
        Instant createdAt, Instant assignedAt, Instant acknowledgedAt, Instant resolvedAt,
        Instant verifiedAt, Instant closedAt,
        Instant responseDeadline, Instant resolutionDeadline, SlaState slaState, long minutesToResolutionDeadline,
        boolean serviceSlaPolicy, boolean responseBreached, boolean resolutionBreached, EscalationLevel escalationLevel,
        String potentialDuplicateOf, Long potentialDuplicateOfId, String resolution, boolean awaitingReporterInfo,
        Integer feedbackRating, String feedbackComment,
        List<NoteDto> notes) {

    public static IncidentDetailDto from(Incident i, SlaState slaState, long minutesLeft, boolean serviceSlaPolicy) {
        return new IncidentDetailDto(
                i.getId(), i.getReference(), i.getTitle(), i.getDescription(),
                i.getStatus(), i.currentState().allowedTransitions().stream().sorted().toList(),
                i.getCategory() == null ? null : CategoryDto.from(i.getCategory()), ServiceDto.from(i.getService()),
                i.getImpact(), i.getUrgency(), i.getAffectedUsers(),
                i.getPriority(), i.getPriorityScore(), i.getPriorityExplanation(),
                UserRefDto.from(i.getReporter()), UserRefDto.from(i.getAssignedTechnician()),
                i.getCreatedAt(), i.getAssignedAt(), i.getAcknowledgedAt(), i.getResolvedAt(),
                i.getVerifiedAt(), i.getClosedAt(),
                i.getResponseDeadline(), i.getResolutionDeadline(), slaState, minutesLeft,
                serviceSlaPolicy, i.isResponseBreached(), i.isResolutionBreached(), i.getEscalationLevel(),
                i.getPotentialDuplicateOf() == null ? null : i.getPotentialDuplicateOf().getReference(),
                i.getPotentialDuplicateOf() == null ? null : i.getPotentialDuplicateOf().getId(),
                i.getResolution(), i.isAwaitingReporterInfo(),
                i.getFeedbackRating(), i.getFeedbackComment(),
                i.getNotes().stream().map(NoteDto::from).toList());
    }
}
