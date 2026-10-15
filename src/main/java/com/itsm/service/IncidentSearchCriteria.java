package com.itsm.service;

import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;

import java.time.LocalDate;

/**
 * All the ways incidents can be searched (the brief asks for at least five). Every field is optional.
 *
 * @param reference "INC0007" or just "7"
 * @param keyword   searched in title and description
 */
public record IncidentSearchCriteria(
        String reference,
        IncidentStatus status,
        Priority priority,
        Long categoryId,
        Long serviceId,
        Long technicianId,
        Long reporterId,
        LocalDate createdFrom,
        LocalDate createdTo,
        SlaState slaState,
        String keyword) {
}
