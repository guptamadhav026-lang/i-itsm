package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** A technician has been assigned but has not responded yet. Re-assignment (ASSIGNED -> ASSIGNED) is allowed, e.g. on escalation. */
public class AssignedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ASSIGNED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED);
    }

    /** Nobody has started on it yet, so the reporter may still correct the report. */
    @Override
    public boolean isEditable() {
        return true;
    }
}
