package com.itsm.service;

import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;

import java.time.LocalDate;

/**
 * All the ways incidents can be searched. Every field is optional.
 *
 * @param reference "INC0007" or just "7"
 * @param keyword   searched in title and description
 * @param openOnly  true: only incidents that are not resolved yet
 * @param timeZone  the user's time zone (e.g. "Asia/Kolkata"), so "reported on 26 Oct" means their 26 Oct
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
        String keyword,
        Boolean openOnly,
        String timeZone) {
}
