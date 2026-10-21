package com.itsm.model;

/** Escalation chain: technician, then team lead, then system administrator, then IT manager. */
public enum EscalationLevel {
    NONE, TEAM_LEAD, SYSTEM_ADMINISTRATOR, IT_MANAGER;

    /** The next level up, or the same level if we are already at the top. */
    public EscalationLevel next() {
        return this == IT_MANAGER ? IT_MANAGER : values()[ordinal() + 1];
    }
}
