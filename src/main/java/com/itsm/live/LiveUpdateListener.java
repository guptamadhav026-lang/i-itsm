package com.itsm.live;

import com.itsm.event.IncidentEvent;
import com.itsm.event.IncidentEventListener;
import com.itsm.model.Incident;
import com.itsm.model.Role;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Observer pattern, third listener: pushes every incident event to the browsers that may see it.
 * It was added without changing IncidentService or the other listeners - the benefit of the pattern.
 *
 * The push happens only AFTER the database transaction commits, so a browser that reloads
 * the incident straight away sees the new data.
 */
@Component
public class LiveUpdateListener implements IncidentEventListener {

    private final LiveUpdateHub hub;

    public LiveUpdateListener(LiveUpdateHub hub) {
        this.hub = hub;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        Incident incident = event.incident();
        LiveUpdate update = new LiveUpdate(event.type(), incident.getId(), incident.getReference(),
                event.newStatus(), event.actor(), event.description(), event.timestamp());
        String reporter = incident.getReporter() == null ? null : incident.getReporter().getUsername();

        Runnable push = () -> hub.broadcast(update, s -> s.role() != Role.EMPLOYEE || s.username().equals(reporter));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    push.run();
                }
            });
        } else {
            push.run();
        }
    }
}
