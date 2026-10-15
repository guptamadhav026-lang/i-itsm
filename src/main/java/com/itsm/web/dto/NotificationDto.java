package com.itsm.web.dto;

import com.itsm.model.Notification;
import com.itsm.model.NotificationChannelType;

import java.time.Instant;

public record NotificationDto(Long id, NotificationChannelType channel, Long incidentId, String subject,
                              String message, Instant createdAt, boolean read) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getChannel(), n.getIncidentId(), n.getSubject(), n.getMessage(),
                n.getCreatedAt(), n.isRead());
    }
}
