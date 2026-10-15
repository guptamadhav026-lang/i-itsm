package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** Investigation is under way. */
public class InProgressState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.IN_PROGRESS;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.RESOLVED, IncidentStatus.ASSIGNED);
    }
}
