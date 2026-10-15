package com.itsm.model;

/**
 * Incident priority levels from the project brief (P1 = most urgent).
 * The default SLA targets here are only used to seed the database;
 * the real targets are configurable by an administrator through {@link SlaPolicy}.
 */
public enum Priority {
    P1("Critical", 5, 30),
    P2("High", 15, 120),
    P3("Medium", 60, 480),
    P4("Low", 240, 1440);

    private final String label;
    private final int defaultResponseMinutes;
    private final int defaultResolutionMinutes;

    Priority(String label, int defaultResponseMinutes, int defaultResolutionMinutes) {
        this.label = label;
        this.defaultResponseMinutes = defaultResponseMinutes;
        this.defaultResolutionMinutes = defaultResolutionMinutes;
    }

    public String getLabel() { return label; }
    public int getDefaultResponseMinutes() { return defaultResponseMinutes; }
    public int getDefaultResolutionMinutes() { return defaultResolutionMinutes; }

    /** P1 and P2 incidents are treated as "important": they trigger e-mails and escalation. */
    public boolean isHighPriority() {
        return this == P1 || this == P2;
    }
}
