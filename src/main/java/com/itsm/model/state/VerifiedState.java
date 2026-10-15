package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** The reporter or an administrator confirmed the fix. Only closing remains. */
public class VerifiedState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.VERIFIED;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.CLOSED);
    }
}
