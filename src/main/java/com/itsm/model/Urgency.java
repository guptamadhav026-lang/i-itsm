package com.itsm.model;

/** How quickly the problem must be fixed. The weight feeds the priority calculation. */
public enum Urgency {
    LOW(1), MEDIUM(2), HIGH(3), CRITICAL(4);

    private final int weight;

    Urgency(int weight) { this.weight = weight; }

    public int getWeight() { return weight; }
}
