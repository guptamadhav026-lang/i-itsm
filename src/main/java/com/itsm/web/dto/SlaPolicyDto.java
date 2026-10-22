package com.itsm.web.dto;

import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;

/** serviceId and serviceName are null for the default policy of a priority. */
public record SlaPolicyDto(Long id, Priority priority, String priorityLabel, Long serviceId, String serviceName,
                           int responseMinutes, int resolutionMinutes, int warningThresholdPercent) {

    public static SlaPolicyDto from(SlaPolicy p) {
        return new SlaPolicyDto(p.getId(), p.getPriority(), p.getPriority().getLabel(),
                p.isDefault() ? null : p.getService().getId(), p.isDefault() ? null : p.getService().getName(),
                p.getResponseMinutes(), p.getResolutionMinutes(), p.getWarningThresholdPercent());
    }
}
