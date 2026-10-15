package com.itsm.exception;

import com.itsm.model.IncidentStatus;
import org.springframework.http.HttpStatus;

/** Thrown when an incident is asked to move to a status that is not allowed from its current status (e.g. NEW → CLOSED). */
public class InvalidStateTransitionException extends ItsmException {

    private final IncidentStatus from;
    private final IncidentStatus to;

    public InvalidStateTransitionException(IncidentStatus from, IncidentStatus to) {
        super("Cannot move an incident from " + from + " to " + to);
        this.from = from;
        this.to = to;
    }

    public IncidentStatus getFrom() { return from; }
    public IncidentStatus getTo() { return to; }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
