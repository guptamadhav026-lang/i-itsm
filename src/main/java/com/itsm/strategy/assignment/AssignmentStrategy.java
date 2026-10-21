package com.itsm.strategy.assignment;

import com.itsm.model.Incident;
import com.itsm.model.Technician;
import com.itsm.strategy.NamedStrategy;

import java.util.List;
import java.util.Optional;

/**
 * Strategy pattern: different ways of choosing a technician for an incident.
 * The candidates passed in are already filtered (active, available, under their workload limit).
 * The administrator picks the active strategy at runtime through the admin API.
 */
public interface AssignmentStrategy extends NamedStrategy {

    Optional<Technician> selectTechnician(Incident incident, List<TechnicianCandidate> candidates);
}
