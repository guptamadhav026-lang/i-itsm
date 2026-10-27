package com.itsm.web;

import com.itsm.model.Incident;
import com.itsm.model.SlaPolicy;
import com.itsm.service.SlaService;
import com.itsm.web.dto.IncidentDetailDto;
import com.itsm.web.dto.IncidentSummaryDto;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Turns Incident entities into JSON-friendly DTOs, adding the live SLA state. */
@Component
public class IncidentViews {

    private final SlaService slaService;
    private final Clock clock;

    public IncidentViews(SlaService slaService, Clock clock) {
        this.slaService = slaService;
        this.clock = clock;
    }

    public IncidentSummaryDto summary(Incident incident) {
        return IncidentSummaryDto.from(incident, slaService.stateOf(incident, Instant.now(clock)));
    }

    /** A list needs only a few distinct SLA policies, so each is looked up once instead of once per incident. */
    public List<IncidentSummaryDto> summaries(List<Incident> incidents) {
        Instant now = Instant.now(clock);
        Map<String, SlaPolicy> policies = new HashMap<>();
        return incidents.stream()
                .map(i -> IncidentSummaryDto.from(i, slaService.stateOf(i, now, () -> policies.computeIfAbsent(
                        i.getPriority() + "/" + i.getService().getId(), key -> slaService.policyFor(i)))))
                .toList();
    }

    public IncidentDetailDto detail(Incident incident) {
        Instant now = Instant.now(clock);
        SlaPolicy policy = incident.getPriority() == null ? null : slaService.policyFor(incident);
        return IncidentDetailDto.from(incident, slaService.stateOf(incident, now),
                slaService.minutesLeft(incident, now), policy != null && !policy.isDefault(),
                policy == null ? SlaPolicy.DEFAULT_WARNING_PERCENT : policy.getWarningThresholdPercent());
    }
}
