package com.itsm.service;

import com.itsm.exception.MissingSlaConfigurationException;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;
import com.itsm.model.SlaState;
import com.itsm.repository.SlaPolicyRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Works out SLA deadlines and where an incident stands against them. */
@Service
public class SlaService {

    private final SlaPolicyRepository slaPolicies;

    public SlaService(SlaPolicyRepository slaPolicies) {
        this.slaPolicies = slaPolicies;
    }

    /** The targets for this priority on this service: the service's own policy if it has one, else the default. */
    public SlaPolicy policyFor(Priority priority, ItService service) {
        if (service != null) {
            Optional<SlaPolicy> own = slaPolicies.findByPriorityAndService(priority, service);
            if (own.isPresent()) {
                return own.get();
            }
        }
        return slaPolicies.findByPriorityAndServiceIsNull(priority)
                .orElseThrow(() -> new MissingSlaConfigurationException("No SLA policy configured for " + priority));
    }

    public SlaPolicy policyFor(Incident incident) {
        return policyFor(incident.getPriority(), incident.getService());
    }

    /** True when the incident's service has its own targets for this priority (not the defaults). */
    public boolean usesServicePolicy(Incident incident) {
        return incident.getPriority() != null && incident.getService() != null
                && slaPolicies.findByPriorityAndService(incident.getPriority(), incident.getService()).isPresent();
    }

    /** The four policies that apply to a service, P1 first. Used for the preview on the report form. */
    public List<SlaPolicy> policiesFor(ItService service) {
        return Arrays.stream(Priority.values()).map(p -> policyFor(p, service)).toList();
    }

    /** Sets the response and resolution deadlines, counted from when the incident was reported. */
    public void applyDeadlines(Incident incident) {
        SlaPolicy policy = policyFor(incident);
        Instant start = incident.getCreatedAt();
        incident.applySlaDeadlines(start.plus(policy.responseTime()), start.plus(policy.resolutionTime()));
    }

    /** Share of the resolution window already used: 0.0 at creation, 1.0 at the deadline. */
    public double elapsedFraction(Incident incident, Instant now) {
        if (incident.getResolutionDeadline() == null) {
            return 0.0;
        }
        Instant end = incident.isUnresolved() ? now : incident.getResolvedAt();
        long total = Duration.between(incident.getCreatedAt(), incident.getResolutionDeadline()).toSeconds();
        long used = Duration.between(incident.getCreatedAt(), end).toSeconds();
        return total <= 0 ? 1.0 : Math.max(0.0, (double) used / total);
    }

    public SlaState stateOf(Incident incident, Instant now) {
        if (incident.isSlaBreached()) {
            return SlaState.BREACHED;
        }
        if (incident.getResolutionDeadline() == null) {
            return SlaState.ON_TRACK;
        }
        if (!incident.isUnresolved()) {
            return SlaState.MET;
        }
        if (now.isAfter(incident.getResolutionDeadline())
                || (incident.getAcknowledgedAt() == null && now.isAfter(incident.getResponseDeadline()))) {
            return SlaState.BREACHED;   // the monitor will record it on its next run
        }
        int threshold = policyFor(incident).getWarningThresholdPercent();
        return elapsedFraction(incident, now) * 100 >= threshold ? SlaState.AT_RISK : SlaState.ON_TRACK;
    }

    /** Minutes left until the resolution deadline (negative once it has passed). */
    public long minutesLeft(Incident incident, Instant now) {
        return incident.getResolutionDeadline() == null ? 0
                : Duration.between(now, incident.getResolutionDeadline()).toMinutes();
    }

    public boolean isWaitingForResponse(Incident incident) {
        return incident.getAcknowledgedAt() == null
                && (incident.getStatus() == IncidentStatus.CLASSIFIED || incident.getStatus() == IncidentStatus.ASSIGNED);
    }
}
