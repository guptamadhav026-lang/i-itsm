package com.itsm.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ServiceRequest(@NotBlank @Size(max = 100) String name,
                             @Size(max = 500) String description,
                             @Min(1) @Max(5) int businessCriticality,
                             Boolean active) {
}
