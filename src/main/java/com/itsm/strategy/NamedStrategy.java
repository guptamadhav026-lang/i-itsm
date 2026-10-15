package com.itsm.strategy;

/** Common contract for every interchangeable algorithm, so they can be listed and chosen by name. */
public interface NamedStrategy {

    /** Short unique key such as "SKILL_BASED". */
    String name();

    /** One sentence shown to administrators when choosing a strategy. */
    String description();
}
