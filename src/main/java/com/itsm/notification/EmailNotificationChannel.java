package com.itsm.notification;

import com.itsm.exception.NetworkFailureException;
import com.itsm.model.Notification;
import com.itsm.model.NotificationChannelType;
import com.itsm.model.User;
import com.itsm.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * Simulated e-mail channel: the e-mail is written to the
 * console log and kept as an EMAIL-type notification so it can be shown in the demo.
 * To send real e-mails later, only this class needs to change (e.g. call Spring's JavaMailSender).
 */
@Component
public class EmailNotificationChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationChannel.class);

    private final NotificationRepository notifications;
    private final Clock clock;
    private final boolean mailServerUp;

    public EmailNotificationChannel(NotificationRepository notifications, Clock clock,
                                    @Value("${itsm.notifications.email.server-up:true}") boolean mailServerUp) {
        this.notifications = notifications;
        this.clock = clock;
        this.mailServerUp = mailServerUp;
    }

    @Override
    public NotificationChannelType type() {
        return NotificationChannelType.EMAIL;
    }

    @Override
    public void deliver(User recipient, String subject, String message, Long incidentId) {
        if (!mailServerUp) {
            throw new NetworkFailureException("Mail server not reachable, e-mail to " + recipient.getEmail() + " not sent");
        }
        log.info("[EMAIL] To: {} <{}> | Subject: {} | {}", recipient.getFullName(), recipient.getEmail(),
                subject, message);
        notifications.save(new Notification(recipient, type(), incidentId, subject, message, Instant.now(clock)));
    }
}
