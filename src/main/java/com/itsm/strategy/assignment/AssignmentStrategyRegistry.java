package com.itsm.strategy.assignment;

import com.itsm.strategy.StrategyRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/** Holds every AssignmentStrategy bean; the admin API switches the active one. */
@Component
public class AssignmentStrategyRegistry extends StrategyRegistry<AssignmentStrategy> {

    public AssignmentStrategyRegistry(List<AssignmentStrategy> strategies,
                                      @Value("${itsm.assignment.default-strategy:SMART}") String defaultName) {
        super(strategies, defaultName);
    }
}
