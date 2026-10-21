package com.itsm.strategy.priority;

import com.itsm.model.Incident;
import com.itsm.strategy.NamedStrategy;

/**
 * Strategy pattern: different algorithms for working out an incident's priority.
 * IncidentService only talks to this interface, so the algorithm can be swapped freely.
 */
public interface PriorityStrategy extends NamedStrategy {

    PriorityAssessment assess(Incident incident);
}
