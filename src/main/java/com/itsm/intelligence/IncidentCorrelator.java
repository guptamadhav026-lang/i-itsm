package com.itsm.intelligence;

import com.itsm.model.Incident;
import com.itsm.model.Priority;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Intelligent feature B: incident correlation.
 * When several open incidents hit the same IT service in a short time, they most likely
 * have one underlying cause (a "major incident"). This groups them so they can be handled together.
 */
@Component
public class IncidentCorrelator {

    static final int MIN_CLUSTER_SIZE = 2;

    public List<CorrelationCluster> correlate(Collection<Incident> recentOpenIncidents) {
        Map<Long, List<Incident>> byService = recentOpenIncidents.stream()
                .collect(Collectors.groupingBy(i -> i.getService().getId()));

        return byService.values().stream()
                .filter(group -> group.size() >= MIN_CLUSTER_SIZE)
                .map(this::toCluster)
                .sorted(Comparator.comparingInt(CorrelationCluster::incidentCount).reversed())
                .toList();
    }

    private CorrelationCluster toCluster(List<Incident> group) {
        Incident first = group.get(0);
        Priority highest = group.stream().map(Incident::getPriority).filter(Objects::nonNull)
                .min(Comparator.naturalOrder())   // P1 < P2 < P3 < P4 in enum order
                .orElse(null);
        List<String> refs = group.stream().map(Incident::getReference).sorted().toList();
        String message = String.format("Possible major incident: %d open incidents on %s (%s)",
                group.size(), first.getService().getName(), String.join(", ", refs));
        return new CorrelationCluster(first.getService().getId(), first.getService().getName(),
                group.size(), highest, refs, message);
    }
}
