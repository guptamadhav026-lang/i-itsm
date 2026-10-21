package com.itsm.strategy;

import com.itsm.exception.ResourceNotFoundException;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Generics: one registry class works for any kind of strategy (assignment, priority, ...).
 * It keeps every available implementation and remembers which one is active, so an
 * administrator can switch algorithms at runtime without changing or restarting the code.
 *
 * @param <T> the strategy interface, e.g. AssignmentStrategy
 */
public class StrategyRegistry<T extends NamedStrategy> {

    private final Map<String, T> strategies = new LinkedHashMap<>();
    private volatile String activeName;

    public StrategyRegistry(List<T> available, String defaultName) {
        for (T strategy : available) {
            strategies.put(strategy.name(), strategy);
        }
        setActive(defaultName);
    }

    public T getActive() {
        return strategies.get(activeName);
    }

    public String getActiveName() {
        return activeName;
    }

    public T get(String name) {
        T strategy = strategies.get(name == null ? null : name.toUpperCase(Locale.ROOT));
        if (strategy == null) {
            throw new ResourceNotFoundException("Unknown strategy '" + name + "'. Available: " + strategies.keySet());
        }
        return strategy;
    }

    public void setActive(String name) {
        this.activeName = get(name).name();
    }

    public Collection<T> getAll() {
        return Collections.unmodifiableCollection(strategies.values());
    }
}
