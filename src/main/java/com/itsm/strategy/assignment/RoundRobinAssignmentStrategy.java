package com.itsm.strategy.assignment;

import com.itsm.model.Incident;
import com.itsm.model.Technician;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

/** Takes turns: each new incident goes to the next technician in the list. */
@Component
public class RoundRobinAssignmentStrategy implements AssignmentStrategy {

    private final AtomicInteger turn = new AtomicInteger();

    @Override
    public String name() {
        return "ROUND_ROBIN";
    }

    @Override
    public String description() {
        return "Technicians take turns in a fixed order";
    }

    @Override
    public Optional<Technician> selectTechnician(Incident incident, List<TechnicianCandidate> candidates) {
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        List<Technician> ordered = candidates.stream()
                .map(TechnicianCandidate::technician)
                .sorted(Comparator.comparing(Technician::getId))
                .toList();
        int index = Math.floorMod(turn.getAndIncrement(), ordered.size());
        return Optional.of(ordered.get(index));
    }
}
