package com.itsm.notification;

import com.itsm.model.NotificationChannelType;
import com.itsm.model.User;

/**
 * One way of delivering a message (in-app, e-mail, ...). INTERFACE + POLYMORPHISM:
 * NotificationService calls deliver() without knowing which kind of channel it is.
 * To add SMS or push notifications, write one more class implementing this interface.
 */
public interface NotificationChannel {

    NotificationChannelType type();

    void deliver(User recipient, String subject, String message, Long incidentId);
}
