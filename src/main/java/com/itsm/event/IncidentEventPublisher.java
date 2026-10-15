package com.itsm.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * OBSERVER PATTERN - the "subject". Spring hands it every IncidentEventListener bean,
 * and {@link #publish} informs all of them. One failing listener (say, the e-mail
 * channel) must not stop the others, so each call is protected separately.
 */
@Component
public class IncidentEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(IncidentEventPublisher.class);

    private final List<IncidentEventListener> listeners;

    public IncidentEventPublisher(List<IncidentEventListener> listeners) {
        this.listeners = List.copyOf(listeners);
    }

    public void publish(IncidentEvent event) {
        for (IncidentEventListener listener : listeners) {
            try {
                listener.onIncidentEvent(event);
            } catch (RuntimeException ex) {
                log.error("Listener {} failed for event {} on {}", listener.getClass().getSimpleName(),
                        event.type(), event.incident().getReference(), ex);
            }
        }
    }
}
