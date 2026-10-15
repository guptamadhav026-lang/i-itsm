package com.itsm.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.Set;

/** Any field left null keeps its current value. */
public record UpdateTechnicianRequest(
        Set<String> skills,
        @Min(0) @Max(50) Integer experienceYears,
        @Min(1) @Max(50) Integer maxActiveIncidents,
        Boolean available,
        Boolean teamLead) {
}
