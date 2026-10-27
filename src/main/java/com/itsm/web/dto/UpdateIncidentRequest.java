package com.itsm.web.dto;

import jakarta.validation.constraints.Size;

/** Corrections to an incident. Any field left out (null) keeps its current value. */
public record UpdateIncidentRequest(
        @Size(min = 5, max = 150) String title,
        @Size(min = 1, max = 4000) String description,
        Long categoryId,
        Long serviceId) {
}
