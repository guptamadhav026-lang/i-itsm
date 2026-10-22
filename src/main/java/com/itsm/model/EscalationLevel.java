package com.itsm.model;

/** Escalation chain: technician, then team lead, then system administrator, then IT manager. */
public enum EscalationLevel {
    NONE("nobody"), TEAM_LEAD("the team lead"), SYSTEM_ADMINISTRATOR("the system administrator"),
    IT_MANAGER("the IT manager");

    private final String label;

    EscalationLevel(String label) { this.label = label; }

    /** Used in messages: "escalated to the team lead". */
    public String getLabel() { return label; }

    /** The next level up, or the same level if we are already at the top. */
    public EscalationLevel next() {
        return this == IT_MANAGER ? IT_MANAGER : values()[ordinal() + 1];
    }
}
