package com.itsm.strategy.assignment;

import com.itsm.model.Incident;
import com.itsm.model.Technician;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * INTELLIGENT FEATURE "Smart technician recommendation".
 * Gives every candidate a score out of 100 from four factors:
 * <ul>
 *   <li>Skill match with the incident category ........ 40 points</li>
 *   <li>Years of experience (capped at 10) ............ up to 20 (counts more for P1/P2)</li>
 *   <li>Has fixed incidents on this same service before up to 20</li>
 *   <li>Current workload (free = 20, at limit = 0) ..... up to 20</li>
 * </ul>
 * The highest score wins. {@link #rank} is also used to show recommendations to administrators.
 */
@Component
public class SmartAssignmentStrategy implements AssignmentStrategy {

    @Override
    public String name() {
        return "SMART";
    }

    @Override
    public String description() {
        return "Scores skills, experience, history with the service and workload (recommended)";
    }

    @Override
    public Optional<Technician> selectTechnician(Incident incident, List<TechnicianCandidate> candidates) {
        return candidates.stream()
                .max(Comparator.comparingDouble((TechnicianCandidate c) -> score(incident, c))
                        .thenComparing(c -> -c.activeIncidents()))
                .map(TechnicianCandidate::technician);
    }

    /** All candidates, best first, with their scores and reasons. */
    public List<ScoredTechnician> rank(Incident incident, List<TechnicianCandidate> candidates) {
        return candidates.stream()
                .map(c -> new ScoredTechnician(c.technician().getId(), c.technician().getUsername(),
                        c.technician().getFullName(), Math.round(score(incident, c) * 10) / 10.0,
                        reasons(incident, c)))
                .sorted(Comparator.comparingDouble(ScoredTechnician::score).reversed())
                .toList();
    }

    public double score(Incident incident, TechnicianCandidate candidate) {
        return skillPoints(incident, candidate) + experiencePoints(incident, candidate)
                + historyPoints(candidate) + workloadPoints(candidate);
    }

    private double skillPoints(Incident incident, TechnicianCandidate c) {
        String category = incident.getCategory() == null ? null : incident.getCategory().getName();
        return c.technician().hasSkill(category) ? 40 : 0;
    }

    private double experiencePoints(Incident incident, TechnicianCandidate c) {
        double points = Math.min(c.technician().getExperienceYears(), 10) * 2.0;   // max 20
        boolean urgent = incident.getPriority() != null && incident.getPriority().isHighPriority();
        return urgent ? points : points * 0.5;   // experience matters most for critical incidents
    }

    private double historyPoints(TechnicianCandidate c) {
        return Math.min(c.resolvedForService(), 5) * 4.0;   // max 20
    }

    private double workloadPoints(TechnicianCandidate c) {
        return (1.0 - c.loadRatio()) * 20;   // max 20
    }

    private String reasons(Incident incident, TechnicianCandidate c) {
        return String.format("skill %.0f + experience %.0f + service history %.0f + workload %.0f (%d active)",
                skillPoints(incident, c), experiencePoints(incident, c), historyPoints(c), workloadPoints(c),
                c.activeIncidents());
    }
}
