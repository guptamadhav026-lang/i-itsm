package com.itsm.notification;

import com.itsm.model.NotificationChannelType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Factory pattern: hands out the right NotificationChannel for a channel type.
 * Callers never create channels themselves, so new channels plug in here only.
 */
@Component
public class NotificationChannelFactory {

    private final Map<NotificationChannelType, NotificationChannel> channels =
            new EnumMap<>(NotificationChannelType.class);

    public NotificationChannelFactory(List<NotificationChannel> available) {
        available.forEach(channel -> channels.put(channel.type(), channel));
    }

    public NotificationChannel getChannel(NotificationChannelType type) {
        NotificationChannel channel = channels.get(type);
        if (channel == null) {
            throw new IllegalArgumentException("No notification channel registered for " + type);
        }
        return channel;
    }

    /** Everyone gets in-app notifications; important ones are also sent by e-mail. */
    public List<NotificationChannel> channelsFor(boolean important) {
        return important
                ? List.of(getChannel(NotificationChannelType.IN_APP), getChannel(NotificationChannelType.EMAIL))
                : List.of(getChannel(NotificationChannelType.IN_APP));
    }
}
