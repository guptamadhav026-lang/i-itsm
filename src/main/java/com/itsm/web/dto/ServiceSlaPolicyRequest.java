package com.itsm.web.dto;

import com.itsm.model.Priority;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Own SLA targets for one service and one priority. */
public record ServiceSlaPolicyRequest(@NotNull Long serviceId, @NotNull Priority priority,
                                      @Min(1) int responseMinutes, @Min(1) int resolutionMinutes,
                                      @Min(1) @Max(99) int warningThresholdPercent) {

    public SlaPolicyRequest targets() {
        return new SlaPolicyRequest(responseMinutes, resolutionMinutes, warningThresholdPercent);
    }
}
