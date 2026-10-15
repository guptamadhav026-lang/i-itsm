package com.itsm.model.state;

import com.itsm.exception.InvalidStateTransitionException;
import com.itsm.model.IncidentStatus;

import java.util.Set;

/**
 * STATE PATTERN.
 * Each lifecycle stage of an incident is its own class implementing this interface.
 * The state object - not a big switch statement inside Incident - decides which
 * moves are legal and what is allowed while the incident is in that stage.
 * Adding a new stage means adding one class, without touching the others.
 */
public interface IncidentState {

    /** The status this state object represents. */
    IncidentStatus status();

    /** The statuses an incident may move to from here. */
    Set<IncidentStatus> allowedTransitions();

    /** Throws if moving to {@code target} is not allowed from this state. */
    default void validateTransition(IncidentStatus target) {
        if (!allowedTransitions().contains(target)) {
            throw new InvalidStateTransitionException(status(), target);
        }
    }

    /** Can technicians/reporters still add notes and information? */
    default boolean acceptsNotes() {
        return true;
    }

    /** Can the reporter still change the description, impact, urgency...? */
    default boolean isEditable() {
        return false;
    }
}
