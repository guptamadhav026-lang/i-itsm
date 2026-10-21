package com.itsm.model.state;

import com.itsm.model.IncidentStatus;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Factory: returns the state object for a status.
 * The database stores only the status enum; this factory turns it back into behaviour.
 * State objects hold no data, so one shared instance per status is enough.
 */
public final class IncidentStateFactory {

    private static final Map<IncidentStatus, IncidentState> STATES = new EnumMap<>(IncidentStatus.class);

    static {
        List<IncidentState> all = List.of(
                new NewState(), new ClassifiedState(), new AssignedState(), new AcknowledgedState(),
                new InProgressState(), new ResolvedState(), new VerifiedState(), new ClosedState());
        for (IncidentState state : all) {
            STATES.put(state.status(), state);
        }
    }

    private IncidentStateFactory() {
    }

    public static IncidentState forStatus(IncidentStatus status) {
        IncidentState state = STATES.get(status);
        if (state == null) {
            throw new IllegalStateException("No state class registered for " + status);
        }
        return state;
    }
}
