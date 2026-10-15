package com.itsm.model;

/** How badly the business is affected. The weight feeds the priority calculation. */
public enum Impact {
    LOW(1), MEDIUM(2), HIGH(3), CRITICAL(4);

    private final int weight;

    Impact(int weight) { this.weight = weight; }

    public int getWeight() { return weight; }
}
