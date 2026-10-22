package com.itsm.service;

import com.itsm.event.IncidentEvent;
import com.itsm.event.IncidentEventPublisher;
import com.itsm.event.IncidentEventType;
import com.itsm.model.EscalationLevel;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.SlaPolicy;
import com.itsm.repository.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Background SLA checks (run every minute by {@link SlaMonitorScheduler}):
 * <ul>
 *   <li>records response and resolution SLA violations,</li>
 *   <li>sends one "SLA approaching" warning when the warning threshold is passed,</li>
 *   <li>Intelligent feature C, automatic escalation: a P1/P2 incident nobody has acknowledged is
 *       escalated Team Lead -> System Administrator -> IT Manager, one level per missed response window.</li>
 * </ul>
 */
@Service
public class SlaMonitorService {

    private final IncidentRepository incidents;
    private final SlaService slaService;
    private final IncidentEventPublisher events;
    private final Clock clock;

    public SlaMonitorService(IncidentRepository incidents, SlaService slaService,
                             IncidentEventPublisher events, Clock clock) {
        this.incidents = incidents;
        this.slaService = slaService;
        this.events = events;
        this.clock = clock;
    }

    /** @return how many incidents were changed in this run */
    @Transactional
    public int runChecks() {
        Instant now = Instant.now(clock);
        int changed = 0;
        for (Incident incident : incidents.findByStatusIn(IncidentStatus.UNRESOLVED)) {
            if (incident.getResolutionDeadline() == null) {
                continue;
            }
            boolean touched = checkResponse(incident, now);
            touched |= checkResolution(incident, now);
            touched |= checkWarning(incident, now);
            touched |= checkEscalation(incident, now);
            if (touched) {
                changed++;
            }
        }
        return changed;
    }

    private boolean checkResponse(Incident incident, Instant now) {
        if (incident.isResponseBreached() || incident.getAcknowledgedAt() != null
                || !now.isAfter(incident.getResponseDeadline())) {
            return false;
        }
        incident.markResponseBreached();
        publish(IncidentEventType.SLA_VIOLATED, incident,
                "Nobody acknowledged it by " + TimeText.of(incident.getResponseDeadline(), clock)
                        + ", so the response SLA was missed");
        return true;
    }

    private boolean checkResolution(Incident incident, Instant now) {
        if (incident.isResolutionBreached() || !now.isAfter(incident.getResolutionDeadline())) {
            return false;
        }
        incident.markResolutionBreached();
        publish(IncidentEventType.SLA_VIOLATED, incident,
                "Not resolved by " + TimeText.of(incident.getResolutionDeadline(), clock)
                        + ", so the resolution SLA was missed");
        return true;
    }

    private boolean checkWarning(Incident incident, Instant now) {
        if (incident.isSlaWarningSent() || incident.isResolutionBreached()) {
            return false;
        }
        SlaPolicy policy = slaService.policyFor(incident);
        double usedPercent = slaService.elapsedFraction(incident, now) * 100;
        if (usedPercent < policy.getWarningThresholdPercent()) {
            return false;
        }
        incident.markSlaWarningSent();
        publish(IncidentEventType.SLA_WARNING, incident, String.format(
                "%.0f%% of the resolution time is used up, %d min left",
                usedPercent, slaService.minutesLeft(incident, now)));
        return true;
    }

    private boolean checkEscalation(Incident incident, Instant now) {
        if (incident.getPriority() == null || !incident.getPriority().isHighPriority()
                || !slaService.isWaitingForResponse(incident) || !now.isAfter(incident.getResponseDeadline())) {
            return false;
        }
        long responseMinutes = Math.max(1, slaService.policyFor(incident).getResponseMinutes());
        long minutesOverdue = Duration.between(incident.getResponseDeadline(), now).toMinutes();
        int levelsDue = (int) Math.min(EscalationLevel.IT_MANAGER.ordinal(), 1 + minutesOverdue / responseMinutes);

        boolean escalated = false;
        while (incident.getEscalationLevel().ordinal() < levelsDue) {
            incident.escalate();
            publish(IncidentEventType.ESCALATED, incident, "Still not acknowledged, escalated to "
                    + incident.getEscalationLevel().getLabel());
            escalated = true;
        }
        return escalated;
    }

    private void publish(IncidentEventType type, Incident incident, String description) {
        events.publish(new IncidentEvent(type, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                incident.getStatus(), description, Instant.now(clock)));
    }
}
