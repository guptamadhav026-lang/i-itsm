package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** Category, priority and SLA are known; waiting for a technician. */
public class ClassifiedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.CLASSIFIED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.ASSIGNED);
    }

    @Override
    public boolean isEditable() {
        return true;
    }
}
