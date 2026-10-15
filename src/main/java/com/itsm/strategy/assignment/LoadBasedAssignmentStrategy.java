package com.itsm.strategy.assignment;

import com.itsm.model.Incident;
import com.itsm.model.Technician;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Whoever has the fewest active incidents, regardless of skills. Spreads work evenly. */
@Component
public class LoadBasedAssignmentStrategy implements AssignmentStrategy {

    @Override
    public String name() {
        return "LOAD_BASED";
    }

    @Override
    public String description() {
        return "Technician with the fewest active incidents";
    }

    @Override
    public Optional<Technician> selectTechnician(Incident incident, List<TechnicianCandidate> candidates) {
        return candidates.stream()
                .min(Comparator.comparingLong(TechnicianCandidate::activeIncidents)
                        .thenComparing(c -> c.technician().getId()))
                .map(TechnicianCandidate::technician);
    }
}
