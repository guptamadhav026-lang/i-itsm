package com.itsm.web;

import com.itsm.model.Incident;
import com.itsm.service.SlaService;
import com.itsm.web.dto.IncidentDetailDto;
import com.itsm.web.dto.IncidentSummaryDto;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

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

    public List<IncidentSummaryDto> summaries(List<Incident> incidents) {
        return incidents.stream().map(this::summary).toList();
    }

    public IncidentDetailDto detail(Incident incident) {
        Instant now = Instant.now(clock);
        return IncidentDetailDto.from(incident, slaService.stateOf(incident, now),
                slaService.minutesLeft(incident, now), slaService.usesServicePolicy(incident));
    }
}
