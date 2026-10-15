package com.itsm.strategy.assignment;

import com.itsm.model.Incident;
import com.itsm.model.Technician;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Only technicians skilled in the incident's category; among them, the least busy one. */
@Component
public class SkillBasedAssignmentStrategy implements AssignmentStrategy {

    @Override
    public String name() {
        return "SKILL_BASED";
    }

    @Override
    public String description() {
        return "Technician with a matching skill for the category; least busy first";
    }

    @Override
    public Optional<Technician> selectTechnician(Incident incident, List<TechnicianCandidate> candidates) {
        String category = incident.getCategory() == null ? null : incident.getCategory().getName();
        return candidates.stream()
                .filter(c -> c.technician().hasSkill(category))
                .min(Comparator.comparingDouble(TechnicianCandidate::loadRatio))
                .map(TechnicianCandidate::technician);
    }
}
