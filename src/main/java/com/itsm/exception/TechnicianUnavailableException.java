package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when an incident is assigned to a technician who is marked unavailable. */
public class TechnicianUnavailableException extends ItsmException {

    public TechnicianUnavailableException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
