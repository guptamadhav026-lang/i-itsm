package com.itsm.web.dto;

import com.itsm.model.Impact;
import com.itsm.model.Urgency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * What an employee fills in to report a problem.
 * categoryId is optional: if it is left out the system suggests one automatically.
 */
public record CreateIncidentRequest(
        @NotBlank @Size(min = 5, max = 150) String title,
        @NotBlank @Size(max = 4000) String description,
        @NotNull Long serviceId,
        Long categoryId,
        @NotNull Impact impact,
        @NotNull Urgency urgency,
        @Min(1) @Max(1_000_000) int affectedUsers) {
}
