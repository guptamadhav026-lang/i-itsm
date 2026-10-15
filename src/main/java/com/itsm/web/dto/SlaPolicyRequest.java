package com.itsm.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record SlaPolicyRequest(@Min(1) int responseMinutes, @Min(1) int resolutionMinutes,
                               @Min(1) @Max(99) int warningThresholdPercent) {
}
