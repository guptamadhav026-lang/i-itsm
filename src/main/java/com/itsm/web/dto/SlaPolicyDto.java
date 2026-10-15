package com.itsm.web.dto;

import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;

public record SlaPolicyDto(Priority priority, String priorityLabel, int responseMinutes, int resolutionMinutes,
                           int warningThresholdPercent) {

    public static SlaPolicyDto from(SlaPolicy p) {
        return new SlaPolicyDto(p.getPriority(), p.getPriority().getLabel(), p.getResponseMinutes(),
                p.getResolutionMinutes(), p.getWarningThresholdPercent());
    }
}
