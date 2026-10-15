package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumSet;
import java.util.Set;

/** Just reported. The only way forward is classification (category + priority + SLA). */
public class NewState implements IncidentState {

    @Override
    public IncidentStatus status() {
        return IncidentStatus.NEW;
    }

    @Override
    public Set<IncidentStatus> allowedTransitions() {
        return EnumSet.of(IncidentStatus.CLASSIFIED);
    }

    @Override
    public boolean isEditable() {
        return true;
    }
}
