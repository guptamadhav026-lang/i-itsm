package com.itsm.intelligence;

import com.itsm.model.IncidentStatus;
import com.itsm.model.Priority;
import com.itsm.model.SlaState;

/** How likely an open incident is to miss its SLA (riskScore 0-100). */
public record SlaRisk(Long incidentId, String reference, String title, Priority priority, IncidentStatus status,
                      String technician, long minutesLeft, int percentElapsed, SlaState slaState,
                      int riskScore, String reason) {
}
