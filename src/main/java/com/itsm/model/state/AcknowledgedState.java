package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** The technician has accepted the incident (the SLA response target is now met). */
public class AcknowledgedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.ACKNOWLEDGED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.IN_PROGRESS, IncidentStatus.ASSIGNED);
    }
}
