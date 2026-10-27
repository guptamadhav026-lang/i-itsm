package com.itsm.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** Any field left null keeps its current value. */
public record UpdateTechnicianRequest(
        Set<@NotBlank @Size(max = 50) String> skills,
        @Min(0) @Max(50) Integer experienceYears,
        @Min(1) @Max(50) Integer maxActiveIncidents,
        Boolean available,
        Boolean teamLead) {
}
