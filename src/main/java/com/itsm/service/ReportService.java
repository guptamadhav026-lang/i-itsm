package com.itsm.service;

import com.itsm.intelligence.CorrelationCluster;
import com.itsm.intelligence.IncidentCorrelator;
import com.itsm.intelligence.SlaRisk;
import com.itsm.intelligence.SlaRiskAnalyzer;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.Technician;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.TechnicianRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Dashboards and reports for administrators, built with Java Streams and Collectors. */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private final IncidentRepository incidents;
    private final TechnicianRepository technicians;
    private final IncidentCorrelator correlator;
    private final SlaRiskAnalyzer slaRiskAnalyzer;
    private final Clock clock;
    private final Duration correlationWindow;

    public ReportService(IncidentRepository incidents, TechnicianRepository technicians,
                         IncidentCorrelator correlator, SlaRiskAnalyzer slaRiskAnalyzer, Clock clock,
                         @Value("${itsm.correlation.window-hours:24}") long correlationWindowHours) {
        this.incidents = incidents;
        this.technicians = technicians;
        this.correlator = correlator;
        this.slaRiskAnalyzer = slaRiskAnalyzer;
        this.clock = clock;
        this.correlationWindow = Duration.ofHours(correlationWindowHours);
    }

    public record Overview(long totalIncidents, long openIncidents, long unresolvedIncidents,
                           long criticalOpenIncidents, long resolvedIncidents, long slaViolations,
                           double slaCompliancePercent, Double averageResolutionMinutes,
                           Map<IncidentStatus, Long> byStatus, Map<Priority, Long> byPriority) {
    }

    public record TechnicianWorkload(Long technicianId, String username, String fullName, boolean available,
                                     long activeIncidents, int maxActiveIncidents, long resolvedIncidents,
                                     List<String> skills) {
    }

    public record CountRow(String name, long total, long open, long slaViolations) {
    }

    public Overview overview() {
        List<Incident> all = incidents.findAll();
        long resolved = all.stream().filter(i -> i.getResolvedAt() != null).count();
        long resolvedOnTime = all.stream().filter(i -> i.getResolvedAt() != null && !i.isSlaBreached()).count();
        OptionalDouble avgResolution = all.stream()
                .filter(i -> i.getResolvedAt() != null)
                .mapToLong(i -> Duration.between(i.getCreatedAt(), i.getResolvedAt()).toMinutes())
                .average();

        Map<IncidentStatus, Long> byStatus = new EnumMap<>(IncidentStatus.class);
        all.forEach(i -> byStatus.merge(i.getStatus(), 1L, Long::sum));
        Map<Priority, Long> byPriority = new EnumMap<>(Priority.class);
        all.stream().filter(i -> i.getPriority() != null).forEach(i -> byPriority.merge(i.getPriority(), 1L, Long::sum));

        return new Overview(
                all.size(),
                all.stream().filter(i -> i.getStatus() != IncidentStatus.CLOSED).count(),
                all.stream().filter(Incident::isUnresolved).count(),
                all.stream().filter(i -> i.isUnresolved() && i.getPriority() == Priority.P1).count(),
                resolved,
                all.stream().filter(Incident::isSlaBreached).count(),
                resolved == 0 ? 100.0 : Math.round(1000.0 * resolvedOnTime / resolved) / 10.0,
                avgResolution.isPresent() ? Math.round(avgResolution.getAsDouble() * 10) / 10.0 : null,
                byStatus, byPriority);
    }

    public List<TechnicianWorkload> technicianWorkload() {
        List<Incident> all = incidents.findAll();
        return technicians.findByActiveTrue().stream()
                .map(t -> new TechnicianWorkload(t.getId(), t.getUsername(), t.getFullName(), t.isAvailable(),
                        all.stream().filter(i -> t.isAssignedTo(i)
                                && IncidentStatus.ACTIVE_WORK.contains(i.getStatus())).count(),
                        t.getMaxActiveIncidents(),
                        all.stream().filter(i -> t.isAssignedTo(i) && i.getResolvedAt() != null).count(),
                        t.getSkills().stream().sorted().toList()))
                .sorted(Comparator.comparingLong(TechnicianWorkload::activeIncidents).reversed())
                .toList();
    }

    public List<CountRow> byService() {
        return countBy(i -> i.getService().getName());
    }

    public List<CountRow> byCategory() {
        return countBy(i -> i.getCategory() == null ? "UNCLASSIFIED" : i.getCategory().getName());
    }

    public List<SlaRisk> slaRisks() {
        return slaRiskAnalyzer.analyse(incidents.findByStatusIn(IncidentStatus.UNRESOLVED), Instant.now(clock));
    }

    public List<CorrelationCluster> correlations() {
        return correlator.correlate(incidents.findByStatusInAndCreatedAtAfter(
                IncidentStatus.UNRESOLVED, Instant.now(clock).minus(correlationWindow)));
    }

    private List<CountRow> countBy(Function<Incident, String> key) {
        Map<String, List<Incident>> groups = incidents.findAll().stream()
                .collect(Collectors.groupingBy(key, TreeMap::new, Collectors.toList()));
        return groups.entrySet().stream()
                .map(e -> new CountRow(e.getKey(), e.getValue().size(),
                        e.getValue().stream().filter(i -> i.getStatus() != IncidentStatus.CLOSED).count(),
                        e.getValue().stream().filter(Incident::isSlaBreached).count()))
                .sorted(Comparator.comparingLong(CountRow::total).reversed())
                .toList();
    }

    /** Used by the technician dashboard: their own active incidents. */
    public long activeCountFor(Technician technician) {
        return incidents.countByAssignedTechnicianAndStatusIn(technician, IncidentStatus.ACTIVE_WORK);
    }

}
