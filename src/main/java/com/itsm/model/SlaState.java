package com.itsm.model;

/** Where an incident stands against its SLA. */
public enum SlaState {
    ON_TRACK,   // still within the safe part of the time window
    AT_RISK,    // close to the deadline (warning threshold passed)
    BREACHED,   // a response or resolution deadline was missed
    MET         // resolved within the deadline
}
