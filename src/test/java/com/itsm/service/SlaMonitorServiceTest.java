package com.itsm.service;

import com.itsm.MutableClock;
import com.itsm.model.EscalationLevel;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;
import com.itsm.model.Technician;
import com.itsm.model.Urgency;
import com.itsm.model.User;
import com.itsm.repository.AuditRecordRepository;
import com.itsm.repository.ItServiceRepository;
import com.itsm.repository.TechnicianRepository;
import com.itsm.event.IncidentEventType;
import com.itsm.web.dto.CreateIncidentRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SLA monitoring, warnings, breaches and escalation, using a clock the test can fast-forward. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SlaMonitorServiceTest {

    @TestConfiguration
    static class ClockOverride {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(Instant.now());
        }
    }

    @Autowired private MutableClock clock;
    @Autowired private Clock injectedClock;
    @Autowired private IncidentService incidentService;
    @Autowired private UserService userService;
    @Autowired private SlaMonitorService monitor;
    @Autowired private SlaService slaService;
    @Autowired private ItServiceRepository services;
    @Autowired private AuditRecordRepository audit;
    @Autowired private TechnicianRepository technicians;

    private Incident reportCriticalPaymentIncident() {
        User rohan = userService.getByUsername("rohan");
        Long paymentId = services.findAll().stream()
                .filter(s -> s.getName().equals("Payment Gateway")).findFirst().orElseThrow().getId();
        return incidentService.create(rohan, new CreateIncidentRequest("Checkout completely broken",
                "No customer can pay", paymentId, null, Impact.CRITICAL, Urgency.CRITICAL, 500));
    }

    @Test
    @DisplayName("TC21 A P1 incident gets the P1 SLA deadlines")
    void deadlinesApplied() {
        assertThat(injectedClock).isSameAs(clock);
        Incident incident = reportCriticalPaymentIncident();
        assertThat(incident.getPriority()).isEqualTo(Priority.P1);
        assertThat(Duration.between(incident.getCreatedAt(), incident.getResponseDeadline())).hasMinutes(5);
        assertThat(Duration.between(incident.getCreatedAt(), incident.getResolutionDeadline())).hasMinutes(30);
        assertThat(slaService.stateOf(incident, Instant.now(clock))).isEqualTo(SlaState.ON_TRACK);
    }

    @Test
    @DisplayName("TC22 Not acknowledged in time: response SLA breached and escalated")
    void responseBreachAndEscalation() {
        Incident incident = reportCriticalPaymentIncident();

        clock.advance(Duration.ofMinutes(6));
        monitor.runChecks();

        assertThat(incident.isResponseBreached()).isTrue();
        assertThat(incident.getEscalationLevel()).isEqualTo(EscalationLevel.TEAM_LEAD);

        clock.advance(Duration.ofMinutes(10));   // even later: escalate further up the chain
        monitor.runChecks();
        assertThat(incident.getEscalationLevel()).isEqualTo(EscalationLevel.IT_MANAGER);
        assertThat(audit.findByIncidentIdOrderByTimestampAscIdAsc(incident.getId()))
                .extracting(r -> r.getAction())
                .contains(IncidentEventType.SLA_VIOLATED, IncidentEventType.ESCALATED);
    }

    @Test
    @DisplayName("TC44 Warning before the response deadline while nobody has acknowledged the incident")
    void responseWarning() {
        Incident incident = reportCriticalPaymentIncident();

        clock.advance(Duration.ofSeconds(4 * 60));   // 4 of the 5 response minutes = 80 %
        monitor.runChecks();

        assertThat(incident.isResponseWarningSent()).isTrue();
        assertThat(incident.isResponseBreached()).isFalse();
        assertThat(audit.findByIncidentIdOrderByTimestampAscIdAsc(incident.getId()))
                .anyMatch(r -> r.getAction() == IncidentEventType.SLA_WARNING
                        && r.getDescription().contains("response time"));
    }

    @Test
    @DisplayName("TC45 A late acknowledgement is logged first, then the missed response SLA")
    void lateAcknowledgeOrder() {
        Incident incident = reportCriticalPaymentIncident();
        clock.advance(Duration.ofMinutes(6));

        incidentService.acknowledge(incident.getId(), incident.getAssignedTechnician());

        assertThat(audit.findByIncidentIdOrderByTimestampAscIdAsc(incident.getId()))
                .extracting(r -> r.getAction())
                .containsSubsequence(IncidentEventType.ACKNOWLEDGED, IncidentEventType.SLA_VIOLATED);
    }

    @Test
    @DisplayName("TC46 Raising an old P4 to P1 gives new targets from that moment, so it is not late at once")
    void priorityRaiseRestartsTargets() {
        User rohan = userService.getByUsername("rohan");
        Long laptopsId = services.findAll().stream()
                .filter(s -> s.getName().equals("Employee Laptops")).findFirst().orElseThrow().getId();
        Incident incident = incidentService.create(rohan, new CreateIncidentRequest("Laptop screen flickers",
                "The screen flickers now and then", laptopsId, null, Impact.LOW, Urgency.LOW, 1));
        assertThat(incident.getPriority()).isEqualTo(Priority.P4);

        clock.advance(Duration.ofMinutes(30));   // longer than the whole P1 response time
        Instant now = Instant.now(clock);
        incidentService.reassess(incident.getId(), userService.getByUsername("kavita"),
                Impact.CRITICAL, Urgency.CRITICAL, 400);
        monitor.runChecks();

        assertThat(incident.getPriority()).isEqualTo(Priority.P1);   // 4 x 4 x 2 x 1.5 = 48
        assertThat(incident.getSlaStartedAt()).isEqualTo(now);
        assertThat(incident.getResponseDeadline()).isAfter(now);
        assertThat(incident.isSlaBreached()).isFalse();
        assertThat(audit.findByIncidentIdOrderByTimestampAscIdAsc(incident.getId()))
                .extracting(r -> r.getAction()).contains(IncidentEventType.PRIORITY_CHANGED)
                .doesNotContain(IncidentEventType.SLA_VIOLATED);
    }

    @Test
    @DisplayName("TC47 Nobody free: the incident waits, admins are told why, and it is assigned once someone is free")
    void waitingForTechnician() {
        List<Technician> all = technicians.findAll();
        all.forEach(t -> t.setAvailable(false));
        Incident incident = reportCriticalPaymentIncident();
        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.CLASSIFIED);
        assertThat(audit.findByIncidentIdOrderByTimestampAscIdAsc(incident.getId()))
                .anyMatch(r -> r.getAction() == IncidentEventType.ASSIGNMENT_FAILED
                        && r.getDescription().contains("busy, away or at their limit"));

        all.forEach(t -> t.setAvailable(true));
        assertThat(incidentService.assignWaitingIncidents()).isGreaterThanOrEqualTo(1);
        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.ASSIGNED);
    }

    @Test
    @DisplayName("TC23 Warning at 75% of the resolution time, breach after the deadline")
    void warningThenBreach() {
        Incident incident = reportCriticalPaymentIncident();
        incidentService.acknowledge(incident.getId(), incident.getAssignedTechnician());

        clock.advance(Duration.ofMinutes(23));   // 23/30 = 77 %
        monitor.runChecks();
        assertThat(incident.isSlaWarningSent()).isTrue();
        assertThat(incident.isResolutionBreached()).isFalse();
        assertThat(slaService.stateOf(incident, Instant.now(clock))).isEqualTo(SlaState.AT_RISK);

        clock.advance(Duration.ofMinutes(10));
        monitor.runChecks();
        assertThat(incident.isResolutionBreached()).isTrue();
        assertThat(slaService.stateOf(incident, Instant.now(clock))).isEqualTo(SlaState.BREACHED);
    }
}
