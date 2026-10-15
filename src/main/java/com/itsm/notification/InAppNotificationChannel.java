package com.itsm.notification;

import com.itsm.model.Notification;
import com.itsm.model.NotificationChannelType;
import com.itsm.model.User;
import com.itsm.repository.NotificationRepository;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/** Stores the message so it appears in the user's notification list / dashboard bell. */
@Component
public class InAppNotificationChannel implements NotificationChannel {

    private final NotificationRepository notifications;
    private final Clock clock;

    public InAppNotificationChannel(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    @Override
    public NotificationChannelType type() {
        return NotificationChannelType.IN_APP;
    }

    @Override
    public void deliver(User recipient, String subject, String message, Long incidentId) {
        notifications.save(new Notification(recipient, type(), incidentId, subject, message, Instant.now(clock)));
    }
}
