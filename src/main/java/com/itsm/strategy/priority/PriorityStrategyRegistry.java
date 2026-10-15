package com.itsm.strategy.priority;

import com.itsm.strategy.StrategyRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/** Holds every PriorityStrategy bean; Spring finds them automatically. */
@Component
public class PriorityStrategyRegistry extends StrategyRegistry<PriorityStrategy> {

    public PriorityStrategyRegistry(List<PriorityStrategy> strategies,
                                    @Value("${itsm.priority.default-strategy:WEIGHTED}") String defaultName) {
        super(strategies, defaultName);
    }
}
