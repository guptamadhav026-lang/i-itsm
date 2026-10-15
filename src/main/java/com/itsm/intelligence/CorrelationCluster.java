package com.itsm.intelligence;

import com.itsm.model.Priority;

import java.util.List;

/** A group of open incidents on the same service that probably share one root cause. */
public record CorrelationCluster(Long serviceId, String serviceName, int incidentCount,
                                 Priority highestPriority, List<String> incidentReferences, String message) {
}
