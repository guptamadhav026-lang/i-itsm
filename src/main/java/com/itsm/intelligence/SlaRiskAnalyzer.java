package com.itsm.intelligence;

import com.itsm.model.Incident;
import com.itsm.model.SlaState;
import com.itsm.service.SlaService;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

/**
 * Intelligent feature E: SLA risk detection.
 * Predicts which open incidents are likely to violate their SLA before it happens:
 * <pre>
 *   risk = 70 x (share of resolution time used, max 1)
 *        + 30 if the response deadline was already missed, otherwise
 *          + 15 if nobody has acknowledged it yet
 *        + 15 if it is still waiting for information from the reporter
 * </pre>
 * Incidents with risk >= {@value #RISK_THRESHOLD} (or already AT_RISK/BREACHED) are listed, riskiest first.
 */
@Component
public class SlaRiskAnalyzer {

    static final int RISK_THRESHOLD = 50;

    private final SlaService slaService;

    public SlaRiskAnalyzer(SlaService slaService) {
        this.slaService = slaService;
    }

    public List<SlaRisk> analyse(Collection<Incident> openIncidents, Instant now) {
        return openIncidents.stream()
                .filter(Incident::isUnresolved)
                .filter(i -> i.getResolutionDeadline() != null)
                .map(i -> assess(i, now))
                .filter(r -> r.riskScore() >= RISK_THRESHOLD || r.slaState() != SlaState.ON_TRACK)
                .sorted(Comparator.comparingInt(SlaRisk::riskScore).reversed())
                .toList();
    }

    public SlaRisk assess(Incident incident, Instant now) {
        double elapsed = slaService.elapsedFraction(incident, now);
        List<String> reasons = new ArrayList<>();
        double risk = Math.min(1.0, elapsed) * 70;
        reasons.add(Math.round(elapsed * 100) + "% of resolution time used");
        if (incident.isResponseBreached()) {
            risk += 30;
            reasons.add("response deadline already missed");
        } else if (incident.getAcknowledgedAt() == null) {
            risk += 15;
            reasons.add("not yet acknowledged");
        }
        if (incident.isAwaitingReporterInfo()) {
            risk += 15;
            reasons.add("waiting for reporter information");
        }
        String technician = incident.getAssignedTechnician() == null ? null
                : incident.getAssignedTechnician().getFullName();
        return new SlaRisk(incident.getId(), incident.getReference(), incident.getTitle(), incident.getPriority(),
                incident.getStatus(), technician, slaService.minutesLeft(incident, now),
                (int) Math.round(elapsed * 100), slaService.stateOf(incident, now),
                (int) Math.min(100, Math.round(risk)), String.join(", ", reasons));
    }
}
