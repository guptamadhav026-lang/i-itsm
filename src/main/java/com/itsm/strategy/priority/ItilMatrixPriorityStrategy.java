package com.itsm.strategy.priority;

import com.itsm.model.Incident;
import com.itsm.model.Priority;
import org.springframework.stereotype.Component;

/**
 * Alternative algorithm: the classic ITIL impact/urgency matrix.
 * It ignores the service and the number of users and only adds impact + urgency (2..8).
 * Exists mainly to show that priority algorithms are interchangeable (Strategy pattern).
 */
@Component
public class ItilMatrixPriorityStrategy implements PriorityStrategy {

    @Override
    public String name() {
        return "ITIL_MATRIX";
    }

    @Override
    public String description() {
        return "Classic ITIL matrix: impact + urgency only";
    }

    @Override
    public PriorityAssessment assess(Incident incident) {
        int sum = incident.getImpact().getWeight() + incident.getUrgency().getWeight();
        Priority priority;
        if (sum >= 7) {
            priority = Priority.P1;
        } else if (sum == 6) {
            priority = Priority.P2;
        } else if (sum >= 4) {
            priority = Priority.P3;
        } else {
            priority = Priority.P4;
        }
        String explanation = String.format("ITIL matrix: impact %s + urgency %s = %d → %s",
                incident.getImpact(), incident.getUrgency(), sum, priority);
        return new PriorityAssessment(priority, sum, explanation);
    }
}
