package com.itsm.strategy.priority;

import com.itsm.model.Incident;
import com.itsm.model.Priority;
import org.springframework.stereotype.Component;

/**
 * Default algorithm, based on the formula in the brief:
 * <pre>
 *   score = impact (1-4) × urgency (1-4) × business criticality of the service (1-5)
 *           × a multiplier for the number of affected users
 * </pre>
 * Scores: ≥ 40 → P1, ≥ 20 → P2, ≥ 8 → P3, otherwise P4. The maximum possible score is 120.
 * Example: payment service down (impact HIGH 3, urgency CRITICAL 4, criticality 5) = 60 → P1.
 */
@Component
public class WeightedPriorityStrategy implements PriorityStrategy {

    static final double P1_THRESHOLD = 40;
    static final double P2_THRESHOLD = 20;
    static final double P3_THRESHOLD = 8;

    @Override
    public String name() {
        return "WEIGHTED";
    }

    @Override
    public String description() {
        return "Impact × Urgency × Business criticality, boosted when many users are affected";
    }

    @Override
    public PriorityAssessment assess(Incident incident) {
        int impact = incident.getImpact().getWeight();
        int urgency = incident.getUrgency().getWeight();
        int criticality = incident.getService().getBusinessCriticality();
        double multiplier = affectedUsersMultiplier(incident.getAffectedUsers());

        double score = impact * urgency * criticality * multiplier;
        Priority priority = toPriority(score);

        String explanation = String.format(
                "Impact %s(%d) × Urgency %s(%d) × Criticality of %s(%d) × Users factor %.2f = %.1f → %s",
                incident.getImpact(), impact, incident.getUrgency(), urgency,
                incident.getService().getName(), criticality, multiplier, score, priority);
        return new PriorityAssessment(priority, score, explanation);
    }

    static double affectedUsersMultiplier(int affectedUsers) {
        if (affectedUsers >= 100) {
            return 1.5;
        }
        if (affectedUsers >= 20) {
            return 1.25;
        }
        if (affectedUsers >= 5) {
            return 1.1;
        }
        return 1.0;
    }

    static Priority toPriority(double score) {
        if (score >= P1_THRESHOLD) {
            return Priority.P1;
        }
        if (score >= P2_THRESHOLD) {
            return Priority.P2;
        }
        if (score >= P3_THRESHOLD) {
            return Priority.P3;
        }
        return Priority.P4;
    }
}
