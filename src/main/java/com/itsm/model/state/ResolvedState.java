package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** A fix has been provided. The reporter can confirm it (VERIFIED) or reopen it (back to IN_PROGRESS). */
public class ResolvedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.RESOLVED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.VERIFIED, IncidentStatus.IN_PROGRESS);
    }
}
