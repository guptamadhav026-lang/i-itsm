package com.itsm.notification;

import com.itsm.exception.NetworkFailureException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.exception.UnauthorizedOperationException;
import com.itsm.model.Notification;
import com.itsm.model.User;
import com.itsm.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Sends messages through the right channels and lets users read their notifications. */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationChannelFactory channelFactory;
    private final NotificationRepository notifications;

    public NotificationService(NotificationChannelFactory channelFactory, NotificationRepository notifications) {
        this.channelFactory = channelFactory;
        this.notifications = notifications;
    }

    public void notify(Collection<? extends User> recipients, String subject, String message,
                       Long incidentId, boolean important) {
        // Remove nulls and send each person only one copy (a Map keyed by user id keeps them unique).
        Map<Long, User> unique = new LinkedHashMap<>();
        recipients.stream().filter(Objects::nonNull).filter(User::isActive)
                .forEach(u -> unique.putIfAbsent(u.getId(), u));

        for (User recipient : unique.values()) {
            for (NotificationChannel channel : channelFactory.channelsFor(important)) {
                try {
                    channel.deliver(recipient, subject, message, incidentId);
                } catch (NetworkFailureException ex) {
                    // The in-app copy is already saved, so the person is still informed.
                    log.warn("{} notification failed: {}", channel.type(), ex.getMessage());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> forUser(User user) {
        return notifications.findByRecipientOrderByCreatedAtDescIdDesc(user);
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        return notifications.countByRecipientAndReadFlagFalse(user);
    }

    @Transactional
    public Notification markRead(Long notificationId, User user) {
        Notification notification = notifications.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification " + notificationId + " not found"));
        if (!notification.getRecipient().isSameUser(user)) {
            throw new UnauthorizedOperationException("This notification belongs to someone else");
        }
        notification.markRead();
        return notification;
    }
}
