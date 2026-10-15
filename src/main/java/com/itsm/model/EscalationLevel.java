package com.itsm.model;

/** Escalation chain from the brief: Technician → Team Lead → System Administrator → IT Manager. */
public enum EscalationLevel {
    NONE, TEAM_LEAD, SYSTEM_ADMINISTRATOR, IT_MANAGER;

    /** The next level up, or the same level if we are already at the top. */
    public EscalationLevel next() {
        return this == IT_MANAGER ? IT_MANAGER : values()[ordinal() + 1];
    }
}
