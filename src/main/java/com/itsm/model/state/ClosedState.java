package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** Final state: nothing can change any more. */
public class ClosedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.CLOSED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.noneOf(IncidentStatus.class);
    }

    @Override
    public boolean acceptsNotes() {
        return false;
    }
}
